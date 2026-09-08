import {z} from 'zod';
import {DateTime} from 'luxon';
import {withTenant} from './db';
import {requirePlatformInClient,audit,type Actor} from './access';
import {AppError} from './errors';
import {tokenHash} from './booking-secrets';
import {billingCommandReply,saveBillingCommand,invoiceInClient,type InvoiceView} from './invoices';
import {refreshSubscriptionBilling,type BillingAccess} from './billing-access';
const schema=z.object({tenantId:z.uuid(),requestKey:z.uuid(),invoiceId:z.uuid(),version:z.number().int().positive(),reason:z.string().trim().min(10).max(500),confirmed:z.literal(true)}).strict();
type Reply={invoice:InvoiceView;credit:InvoiceView;access:BillingAccess};
/** A full credit preserves both the original snapshot and real bank receipts. */
export async function creditInvoice(actor:Actor,raw:unknown):Promise<Reply>{
 const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INVOICE_CREDIT','Kontrolli kreeditarve põhjust ja kinnitust.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  await requirePlatformInClient(actor,client);
  const tenant=(await client.query('SELECT id,timezone,service_ends_at FROM tenants WHERE id=$1 FOR UPDATE',[d.tenantId])).rows[0];if(!tenant)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
  const hash=tokenHash(JSON.stringify({action:'invoice.credit',...d})),previous=await billingCommandReply<Reply>(client,d.tenantId,d.requestKey,hash);if(previous)return previous;
  const original=await invoiceInClient(client,d.tenantId,d.invoiceId);
  if(original.version!==d.version)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  if(original.status!=='issued'||original.kind!=='invoice')throw new AppError(409,'INVOICE_NOT_CREDITABLE','Krediteerida saab ainult kehtivat väljastatud arvet.');
  if(!original.issuedOn||!original.issuer.numberPrefix)throw new AppError(409,'INVOICE_METADATA_REQUIRED','Ajaloolise arve parandamiseks puuduvad väljastamise andmed.');
  const issuedOn=DateTime.now().setZone(tenant.timezone).toISODate()!;
  const serial=(await client.query("SELECT nextval('invoice_number_counter')::text n")).rows[0].n,number=`${original.issuer.numberPrefix}-${issuedOn.slice(0,4)}-${serial.padStart(6,'0')}`;
  const lines=original.lines.map(line=>({...line,quantity:-line.quantity,subtotal:-line.subtotal,tax:-line.tax,total:-line.total}));
  const snapshotHash=tokenHash(JSON.stringify({originalInvoiceId:original.id,number,issuedOn,lines,reason:d.reason}));
  const credit=(await client.query(`INSERT INTO invoices(tenant_id,subscription_id,request_key,number,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total,currency,status,issued_at,issued_on,snapshot_hash,issuer_version,kind,original_invoice_id,correction_reason)
   SELECT tenant_id,subscription_id,$3,$4,period_start,period_end,$5,issuer_snapshot,recipient_snapshot,$6,-subtotal,-tax,-total,currency,'issued',clock_timestamp(),$5,$7,issuer_version,'credit',id,$8 FROM invoices WHERE tenant_id=$1 AND id=$2 RETURNING id`,
   [d.tenantId,d.invoiceId,d.requestKey,number,issuedOn,JSON.stringify(lines),snapshotHash,d.reason])).rows[0];
  await client.query("UPDATE invoices SET status='void',void_reason=$3,version=version+1 WHERE tenant_id=$1 AND id=$2",[d.tenantId,d.invoiceId,d.reason]);
  await client.query('INSERT INTO invoice_mail_outbox(tenant_id,invoice_id) VALUES($1,$2)',[d.tenantId,credit.id]);
  const access=await refreshSubscriptionBilling(client,tenant),reply={invoice:await invoiceInClient(client,d.tenantId,d.invoiceId),credit:await invoiceInClient(client,d.tenantId,credit.id),access};
  await saveBillingCommand(client,actor,d.tenantId,d.requestKey,'invoice.credit',hash,reply);
  await audit(client,d.tenantId,actor.id,'invoice.credited',undefined,d.invoiceId,{creditId:credit.id,number,total:-original.total,reason:d.reason,retainedPaymentAmount:original.paidAmount});return reply;
 });
}
