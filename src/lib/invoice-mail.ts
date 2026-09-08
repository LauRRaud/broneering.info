import path from 'node:path';
import {withTenant} from './db';
import {smtpConfigured} from './auth-mail';
import {sendConfiguredMail,type NotificationMail} from './notification-mail';
import {invoiceInClient} from './invoices';
import {readInvoicePaymentLink} from './invoice-links';
import {DateTime} from 'luxon';
import {resolveLocale} from './locales';
import {translator,formatMoney} from './i18n';
import {invoiceDocument} from './invoice-document';

export function billingMailMode():'disabled'|'smtp'|'capture'{
 const mode=process.env.BILLING_MAIL_MODE??'disabled';
 if(mode!=='disabled'&&mode!=='smtp'&&mode!=='capture')throw new Error('Invalid BILLING_MAIL_MODE');
 return mode;
}
type Sender=(mail:NotificationMail)=>Promise<'sent'|'capture'>;
export async function queueInvoiceReminders(tenantId:string){
 return withTenant(tenantId,async client=>{
  const tenant=(await client.query('SELECT demo,timezone FROM tenants WHERE id=$1 FOR SHARE',[tenantId])).rows[0];
  if(!tenant||tenant.demo)return 0;
  const today=DateTime.now().setZone(tenant.timezone).toISODate()!;
  const result=await client.query(`INSERT INTO invoice_mail_outbox(tenant_id,invoice_id,kind)
   SELECT i.tenant_id,i.id,'overdue' FROM invoices i WHERE i.tenant_id=$1 AND i.kind='invoice' AND i.status='issued' AND i.due_date<$2
   AND invoice_paid_amount(i.tenant_id,i.id)<i.total
   AND NOT EXISTS(SELECT 1 FROM invoice_mail_outbox m WHERE m.tenant_id=i.tenant_id AND m.invoice_id=i.id AND m.kind='overdue')
   ORDER BY i.due_date,i.id LIMIT 50 ON CONFLICT(tenant_id,invoice_id,kind) DO NOTHING`,[tenantId,today]);
  return result.rowCount??0;
 });
}
async function sendBillingMail(mail:NotificationMail){
 const mode=billingMailMode();if(mode==='disabled')throw new Error('Billing mail disabled');
 return sendConfiguredMail(mail,mode,process.env.BILLING_MAIL_CAPTURE_DIR||path.join(process.cwd(),'output','billing-mail'));
}
/** Row locks serialize senders and tenant SHARE prevents crediting during send.
 * SMTP and COMMIT are not atomic: a lost commit may repeat the same Message-ID.
 * Never place this operation inside an automatic transaction retry.
 */
export async function deliverInvoiceMail(tenantId:string,send:Sender=sendBillingMail){
 const mode=billingMailMode();
 if(mode==='disabled'||(mode==='capture'&&process.env.NODE_ENV==='production')||(mode==='smtp'&&!smtpConfigured()))return 'disabled';
 return withTenant(tenantId,async client=>{
  const tenant=(await client.query('SELECT demo,default_language,timezone FROM tenants WHERE id=$1 FOR SHARE',[tenantId])).rows[0];
  if(!tenant)return 'idle';
  const job=(await client.query(`SELECT * FROM invoice_mail_outbox WHERE tenant_id=$1 AND status IN ('pending','failed') AND attempts<8 AND next_attempt_at<=clock_timestamp() ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`,[tenantId])).rows[0];
  if(!job)return 'idle';
  const invoice=await invoiceInClient(client,tenantId,job.invoice_id);
  if(job.kind==='overdue'&&(invoice.kind!=='invoice'||invoice.paidAmount>=invoice.total||invoice.dueDate>=DateTime.now().setZone(tenant.timezone).toISODate()!)){
   await client.query("UPDATE invoice_mail_outbox SET status='skipped',last_error_code='NO_OVERDUE_BALANCE' WHERE tenant_id=$1 AND id=$2",[tenantId,job.id]);return 'skipped';
  }
  if(invoice.status!=='issued'||(tenant.demo&&mode!=='capture')){
   await client.query("UPDATE invoice_mail_outbox SET status='skipped',last_error_code=$3 WHERE tenant_id=$1 AND id=$2",[tenantId,job.id,invoice.status!=='issued'?'INVOICE_VOID':'DEMO']);return 'skipped';
  }
  try{
   const locale=resolveLocale(tenant.default_language),t=translator(locale),money=(amount:number)=>formatMoney(amount,locale);
   const credit=invoice.kind==='credit',label=t(job.kind==='overdue'?'Arve meeldetuletus':credit?'Kreeditarve':'Arve');
   const link=credit?null:await readInvoicePaymentLink(client,tenantId,invoice.id);
   if(!credit&&!link)throw new Error('Invoice link unavailable');
   const lastDay=DateTime.fromISO(invoice.periodEnd,{zone:'UTC'}).minus({days:1}).toISODate();
   const text=[`${label} ${invoice.number}`,`${t('Arve väljastaja')}: ${invoice.issuer.issuer.name}`,`${t('Arve saaja')}: ${invoice.recipient.name}`,
    `${t('Teenuse periood')}: ${invoice.periodStart} – ${lastDay}`,`${t('Kokku')}: ${money(invoice.total)}`,
    credit?`${t('Algarve')}: ${invoice.originalNumber}\n${t('Paranduse põhjus')}: ${invoice.correctionReason}`:`${t('Maksetähtaeg')}: ${invoice.dueDate}\n${t('Arve ja tasumine')}: ${link}`,
    job.kind==='overdue'?`${t('Tasumata jääk')}: ${money(Math.max(0,invoice.total-invoice.paidAmount))}`:null,
    t(credit?'Kreeditarve ei kinnita raha tagastamist.':'Kui oled juba tasunud, kontrolli makselingilt arve hetkeolukorda.')].filter(Boolean).join('\n\n');
   const result=await send({to:invoice.recipient.email,replyTo:invoice.issuer.issuer.email,subject:`broneering.info — ${label.toLowerCase()} ${invoice.number}`,text,messageId:`<invoice-${job.id}@broneering.info>`,
    attachments:[{filename:`invoice-${invoice.id}.html`,content:invoiceDocument(invoice,locale,link),contentType:'text/html; charset=utf-8'}]});
   await client.query('UPDATE invoice_mail_outbox SET status=$3,attempts=attempts+1,sent_at=CASE WHEN $3=\'sent\' THEN clock_timestamp() ELSE NULL END,last_error_code=NULL WHERE tenant_id=$1 AND id=$2',[tenantId,job.id,result]);return result;
  }catch{
   // Store no provider messages: they may contain addresses or payment secrets.
   await client.query("UPDATE invoice_mail_outbox SET status='failed',attempts=attempts+1,last_error_code='DELIVERY_FAILED',next_attempt_at=clock_timestamp()+LEAST(3600,60*power(2,attempts))*interval '1 second' WHERE tenant_id=$1 AND id=$2",[tenantId,job.id]);return 'failed';
  }
 });
}
