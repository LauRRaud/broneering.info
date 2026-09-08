import {z} from 'zod';
import {DateTime} from 'luxon';
import type {PoolClient} from 'pg';
import {withTenant} from './db';
import {requirePlatformInClient,requireOwnerInTransaction,audit,type Actor} from './access';
import {AppError} from './errors';
import {tokenHash} from './booking-secrets';
import {billingCommandReply,saveBillingCommand,invoiceInClient,type InvoiceView} from './invoices';
import {refreshSubscriptionBilling,type BillingAccess} from './billing-access';
export type PaymentView={id:string;invoiceId:string;amount:number;refundedAmount:number;receivedOn:string;bankEntryId:string|null;reference:string;source:'manual'|'makecommerce';recordedBy:string|null;recordedByName:string|null;recordedAt:string;reversedAt:string|null;reversedBy:string|null;reversedByName:string|null;reversalReason:string|null;version:number};
type PaymentReply={invoice:InvoiceView;access:BillingAccess;paymentId:string};
const base={tenantId:z.uuid(),requestKey:z.uuid(),confirmed:z.literal(true)};
const recordSchema=z.object({...base,invoiceId:z.uuid(),invoiceVersion:z.number().int().positive(),amount:z.number().int().min(1).max(100000000),receivedOn:z.iso.date(),bankEntryId:z.string().trim().min(1).max(200),reference:z.string().trim().max(200),allowOverpayment:z.boolean()}).strict();
const reverseSchema=z.object({...base,paymentId:z.uuid(),version:z.number().int().positive(),reason:z.string().trim().min(10).max(500)}).strict();
async function context(client:PoolClient,actor:Actor,tenantId:string){await requirePlatformInClient(actor,client);const row=(await client.query('SELECT id,timezone,service_ends_at FROM tenants WHERE id=$1 FOR UPDATE',[tenantId])).rows[0];if(!row)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');return row;}
export async function recordPayment(actor:Actor,raw:unknown):Promise<PaymentReply>{
 const parsed=recordSchema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_PAYMENT','Kontrolli laekumise summat, kuupäeva, pangakande tunnust ja kinnitust.');const d=parsed.data;
 try{return await withTenant(d.tenantId,async client=>{
  const tenant=await context(client,actor,d.tenantId),hash=tokenHash(JSON.stringify({action:'payment.record',...d})),previous=await billingCommandReply<PaymentReply>(client,d.tenantId,d.requestKey,hash);if(previous)return previous;
  const row=(await client.query('SELECT version,status,kind FROM invoices WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[d.tenantId,d.invoiceId])).rows[0];if(!row)throw new AppError(404,'INVOICE_NOT_FOUND','Arvet ei leitud.');
  if(row.status!=='issued'||row.kind!=='invoice')throw new AppError(409,'INVOICE_NOT_PAYABLE','Laekumise saab märkida ainult väljastatud arvele.');
  if(row.version!==d.invoiceVersion)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  if(d.receivedOn>DateTime.now().setZone(tenant.timezone).toISODate()!)throw new AppError(400,'PAYMENT_IN_FUTURE','Laekumise kuupäev ei saa olla tulevikus.');
  const before=await invoiceInClient(client,d.tenantId,d.invoiceId);
  if(d.amount>Math.max(0,before.total-before.paidAmount)&&!d.allowOverpayment)throw new AppError(409,'OVERPAYMENT_CONFIRMATION_REQUIRED','Summa ületab arve tasumata jääki. Kontrolli ja kinnita enammakse.');
  const payment=(await client.query('INSERT INTO payment_records(tenant_id,invoice_id,request_key,amount,received_on,recorded_by,reference,bank_entry_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[d.tenantId,d.invoiceId,d.requestKey,d.amount,d.receivedOn,actor.id,d.reference,d.bankEntryId])).rows[0];
  await client.query('UPDATE invoices SET version=version+1 WHERE tenant_id=$1 AND id=$2',[d.tenantId,d.invoiceId]);
  const access=await refreshSubscriptionBilling(client,tenant),reply={invoice:await invoiceInClient(client,d.tenantId,d.invoiceId),access,paymentId:payment.id};
  await saveBillingCommand(client,actor,d.tenantId,d.requestKey,'payment.record',hash,reply);
  await audit(client,d.tenantId,actor.id,'payment.recorded',undefined,payment.id,{invoiceId:d.invoiceId,amount:d.amount,receivedOn:d.receivedOn,overpayment:d.amount>Math.max(0,before.total-before.paidAmount)});return reply;
 });}catch(error){if((error as {code?:string;constraint?:string}).code==='23505'&&(error as {constraint?:string}).constraint==='payment_bank_entry_once')throw new AppError(409,'PAYMENT_ALREADY_RECORDED','See pangakanne on sellele arvele juba märgitud.');throw error;}
}
export async function reversePayment(actor:Actor,raw:unknown):Promise<PaymentReply>{
 const parsed=reverseSchema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_PAYMENT_REVERSAL','Kontrolli laekumise paranduse põhjust ja kinnitust.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  const tenant=await context(client,actor,d.tenantId),hash=tokenHash(JSON.stringify({action:'payment.reverse',...d})),previous=await billingCommandReply<PaymentReply>(client,d.tenantId,d.requestKey,hash);if(previous)return previous;
  const payment=(await client.query('SELECT id,invoice_id,amount,version,reversed_at,source FROM payment_records WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[d.tenantId,d.paymentId])).rows[0];if(!payment)throw new AppError(404,'PAYMENT_NOT_FOUND','Laekumist ei leitud.');
  if(payment.source!=='manual')throw new AppError(409,'PROVIDER_PAYMENT_IMMUTABLE','Veebimakse parandamine peab lähtuma maksepakkuja tehingust.');
  if(payment.version!==d.version)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  if(payment.reversed_at)throw new AppError(409,'PAYMENT_ALREADY_REVERSED','See laekumiskirje on juba parandatud.');
  await client.query('UPDATE payment_records SET reversed_at=clock_timestamp(),reversed_by=$3,reversal_reason=$4,version=version+1 WHERE tenant_id=$1 AND id=$2',[d.tenantId,d.paymentId,actor.id,d.reason]);
  await client.query('UPDATE invoices SET version=version+1 WHERE tenant_id=$1 AND id=$2',[d.tenantId,payment.invoice_id]);
  const access=await refreshSubscriptionBilling(client,tenant),reply={invoice:await invoiceInClient(client,d.tenantId,payment.invoice_id),access,paymentId:payment.id};
  await saveBillingCommand(client,actor,d.tenantId,d.requestKey,'payment.reverse',hash,reply);
  await audit(client,d.tenantId,actor.id,'payment.reversed',undefined,payment.id,{invoiceId:payment.invoice_id,amount:payment.amount,reason:d.reason});return reply;
 });
}
export async function readPayments(actor:Actor,tenantId:string,invoiceId:string,platform=false,offset=0){
 if(!z.uuid().safeParse(tenantId).success||!z.uuid().safeParse(invoiceId).success||!Number.isSafeInteger(offset)||offset<0||offset>100000)throw new AppError(400,'INVALID_BILLING_QUERY','Vigane arvelduse päring.');
 return withTenant(tenantId,async client=>{
  if(platform)await requirePlatformInClient(actor,client);else await requireOwnerInTransaction(actor,tenantId,client);
  const rows=(await client.query('SELECT p.id,p.invoice_id,p.source,p.amount,(SELECT COALESCE(sum(f.amount),0)::int FROM payment_refunds f WHERE f.tenant_id=p.tenant_id AND f.payment_id=p.id) AS refunded_amount,p.received_on::text,p.bank_entry_id,p.reference,p.recorded_by,p.recorded_at,p.reversed_at,p.reversed_by,p.reversal_reason,p.version,r.name AS recorded_by_name,v.name AS reversed_by_name FROM payment_records p LEFT JOIN auth_user r ON r.id=p.recorded_by LEFT JOIN auth_user v ON v.id=p.reversed_by WHERE p.tenant_id=$1 AND p.invoice_id=$2 ORDER BY p.recorded_at DESC,p.id DESC LIMIT 51 OFFSET $3',[tenantId,invoiceId,offset])).rows;
  return {payments:rows.slice(0,50).map(row=>({id:row.id,invoiceId:row.invoice_id,amount:row.amount,refundedAmount:row.refunded_amount,receivedOn:row.received_on,bankEntryId:row.bank_entry_id,reference:row.reference,source:row.source,recordedBy:row.recorded_by,recordedByName:row.recorded_by_name,recordedAt:row.recorded_at.toISOString(),reversedAt:row.reversed_at?.toISOString()??null,reversedBy:row.reversed_by,reversedByName:row.reversed_by_name,reversalReason:row.reversal_reason,version:row.version} satisfies PaymentView)),hasMore:rows.length>50};
 });
}
