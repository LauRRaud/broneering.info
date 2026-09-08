import {z} from 'zod';
import {withTenant} from './db';
import {requirePlatformInClient,audit,type Actor} from './access';
import {AppError} from './errors';
import {tokenHash} from './booking-secrets';
import {billingCommandReply,saveBillingCommand,invoiceInClient,type InvoiceView} from './invoices';
const schema=z.object({tenantId:z.uuid(),invoiceId:z.uuid(),requestKey:z.uuid(),kind:z.enum(['issued','overdue']).default('issued')}).strict();
export async function retryInvoiceMail(actor:Actor,raw:unknown){
 const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli vormi andmeid.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  await requirePlatformInClient(actor,client);
  await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[d.tenantId]);
  const hash=tokenHash(JSON.stringify({action:'invoice.mail.retry',...d})),previous=await billingCommandReply<InvoiceView>(client,d.tenantId,d.requestKey,hash);if(previous)return previous;
  const invoice=await invoiceInClient(client,d.tenantId,d.invoiceId);
  const mail=d.kind==='issued'?invoice.mail:invoice.reminder;
  if(invoice.status!=='issued'||mail?.status!=='failed')throw new AppError(409,'INVOICE_MAIL_NOT_RETRYABLE','Uuesti saab proovida ainult ebaõnnestunud kehtiva arve kirja.');
  await client.query("UPDATE invoice_mail_outbox SET status='pending',attempts=0,next_attempt_at=clock_timestamp(),last_error_code=NULL WHERE tenant_id=$1 AND invoice_id=$2 AND kind=$3",[d.tenantId,d.invoiceId,d.kind]);
  const reply=await invoiceInClient(client,d.tenantId,d.invoiceId);
  await saveBillingCommand(client,actor,d.tenantId,d.requestKey,'invoice.mail.retry',hash,reply);
  await audit(client,d.tenantId,actor.id,'invoice.mail.retried',undefined,d.invoiceId,{kind:d.kind,previousAttempts:mail.attempts});return reply;
 });
}
