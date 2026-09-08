import {randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {DateTime} from 'luxon';
import {withTenant} from './db';
import {audit} from './access';
import {invoiceInClient} from './invoices';
import {tokenHash,openBookingReply} from './booking-secrets';
import {makeCommerceConfig,createProviderTransaction,chargeProviderToken,getProviderTransaction,PaymentProviderError} from './makecommerce';
import {queueProviderSnapshot} from './payment-events';
import {recurringTerms} from './payment-mandates';

/** One automatic charge per invoice. Uncertain external effects are reconciled, never repeated. */
export async function runTenantAutopay(tenantId:string){
 const c=makeCommerceConfig(),ip=process.env.MAKECOMMERCE_SERVER_IP??'';if(!isIP(ip))return {started:false};
 const reserved=await withTenant(tenantId,async client=>{
  const tenant=(await client.query('SELECT id,timezone,service_ends_at FROM tenants WHERE id=$1 FOR UPDATE',[tenantId])).rows[0];if(!tenant)return null;
  const today=DateTime.now().setZone(tenant.timezone).toISODate()!;
  const expired=await client.query("UPDATE payment_mandates SET status='expired',encrypted_token=NULL,version=version+1 WHERE tenant_id=$1 AND status='active' AND valid_until<$2 RETURNING id",[tenantId,today]);
  if(expired.rowCount){await client.query("UPDATE subscriptions SET payment_mode='invoice',version=version+1 WHERE tenant_id=$1",[tenantId]);await audit(client,tenantId,null,'payment.mandate.expired',undefined,expired.rows[0].id);}
  const mandate=(await client.query("SELECT m.id,m.terms FROM payment_mandates m JOIN subscriptions s ON (s.tenant_id,s.id)=(m.tenant_id,m.subscription_id) JOIN payment_attempts setup ON (setup.tenant_id,setup.id)=(m.tenant_id,m.setup_attempt_id) WHERE m.tenant_id=$1 AND m.status='active' AND s.payment_mode='autopay' AND s.status<>'ended' AND (s.ends_at IS NULL OR s.ends_at>now()) AND setup.environment=$2 AND setup.shop_id=$3",[tenantId,c.mode,c.shopId])).rows[0];
  if(!mandate||mandate.terms.version!==recurringTerms.version||mandate.terms.amount!==recurringTerms.amount||(tenant.service_ends_at&&new Date(tenant.service_ends_at)<=new Date()))return null;
  const invoice=(await client.query(`SELECT i.id FROM invoices i WHERE i.tenant_id=$1 AND i.kind='invoice' AND i.status='issued' AND i.period_start<=$2 AND i.due_date>=$2
   AND NOT EXISTS(SELECT 1 FROM payment_attempts a WHERE a.tenant_id=i.tenant_id AND a.invoice_id=i.id AND (a.method='autopay' OR a.state IN ('creating','ready','pending','unknown','review')))
   AND i.total-invoice_paid_amount(i.tenant_id,i.id)=$3
   ORDER BY i.period_start,i.id LIMIT 1`,[tenantId,today,recurringTerms.amount])).rows[0];if(!invoice)return null;
  const document=await invoiceInClient(client,tenantId,invoice.id);if(!document.number)return null;
  const id=randomUUID();
  await client.query("INSERT INTO payment_attempts(id,tenant_id,invoice_id,request_key,payload_hash,method,environment,shop_id,amount,reference,mandate_id) VALUES($1,$2,$3,$1,$4,'autopay',$5,$6,$7,$8,$9)",[id,tenantId,invoice.id,tokenHash('autopay:'+invoice.id+':'+mandate.id),c.mode,c.shopId,recurringTerms.amount,document.number,mandate.id]);
  await audit(client,tenantId,null,'payment.autopay.reserved',undefined,id,{invoiceId:invoice.id,mandateId:mandate.id,amount:recurringTerms.amount});
  return {id,invoiceId:invoice.id,mandateId:mandate.id,reference:document.number,email:document.recipient.email};
 });
 if(!reserved)return {started:false};
 let transactionId:string|null=null;
 try{
  const transaction=await createProviderTransaction({tenantId,attemptId:reserved.id,amount:recurringTerms.amount,reference:reserved.reference,email:reserved.email,ip,locale:'et',recurring:false},c);transactionId=transaction.id;
  if(transaction.status!=='CREATED'){
   await withTenant(tenantId,client=>client.query("UPDATE payment_attempts SET transaction_id=$3,state='pending',provider_status=$4,checked_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2 AND state='creating'",[tenantId,reserved.id,transaction.id,transaction.status]));
   await queueProviderSnapshot(tenantId,reserved.id,transaction,c);return {started:false};
  }
  const token=await withTenant(tenantId,async client=>{
   const tenant=(await client.query('SELECT timezone,service_ends_at FROM tenants WHERE id=$1 FOR UPDATE',[tenantId])).rows[0];
   const attempt=(await client.query('SELECT state,charge_started_at FROM payment_attempts WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,reserved.id])).rows[0];
   if(attempt.charge_started_at||!['creating','pending','ready'].includes(attempt.state))return null;
   const mandate=(await client.query("SELECT m.encrypted_token,m.valid_until::text,s.payment_mode,s.ends_at FROM payment_mandates m JOIN subscriptions s ON (s.tenant_id,s.id)=(m.tenant_id,m.subscription_id) WHERE m.tenant_id=$1 AND m.id=$2 AND m.status='active'",[tenantId,reserved.mandateId])).rows[0];
   const invoice=await invoiceInClient(client,tenantId,reserved.invoiceId);
   const allowed=mandate&&mandate.valid_until>=DateTime.now().setZone(tenant.timezone).toISODate()!&&mandate.payment_mode==='autopay'&&invoice.status==='issued'&&invoice.total-invoice.paidAmount===recurringTerms.amount&&![tenant.service_ends_at,mandate.ends_at].some(value=>value&&new Date(value)<=new Date());
   await client.query('UPDATE payment_attempts SET transaction_id=$3,state=$4,provider_status=$5,checked_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2',[tenantId,reserved.id,transaction.id,allowed?'pending':'cancelled',transaction.status]);
   if(!allowed)return null;
   const value=openBookingReply<string>(mandate.encrypted_token,'payment-mandate:'+tenantId+':'+reserved.mandateId);
   await client.query('UPDATE payment_attempts SET charge_started_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2',[tenantId,reserved.id]);return value;
  });
  if(!token)return {started:false};
  await chargeProviderToken(transaction.id,token,c);
  await queueProviderSnapshot(tenantId,reserved.id,await getProviderTransaction(transaction.id,c),c);
  return {started:true};
 }catch(error){
  const state=error instanceof PaymentProviderError&&error.outcome==='rejected'?'failed':'unknown';
  await withTenant(tenantId,async client=>{
   await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenantId]);
   await client.query("UPDATE payment_attempts SET state=$3,transaction_id=COALESCE(transaction_id,$4),error_code=$5,checked_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2 AND state IN ('creating','pending')",[tenantId,reserved.id,state,transactionId,state==='failed'?'AUTOPAY_FAILED':'PAYMENT_OUTCOME_UNKNOWN']);
   await audit(client,tenantId,null,state==='failed'?'payment.autopay.failed':'payment.autopay.unknown',undefined,reserved.id,{invoiceId:reserved.invoiceId});
  });return {started:true};
 }
}
