import {randomUUID} from 'node:crypto';
import {DateTime} from 'luxon';
import {z} from 'zod';
import {withTenant} from './db';
import {audit} from './access';
import {tokenHash,sealBookingReply,openBookingReply} from './booking-secrets';
import {makeCommerceConfig,verifyProviderMessage,getProviderTransaction,type ProviderMessage,type MakeCommerceConfig,type ProviderTransaction} from './makecommerce';
import {refreshSubscriptionBilling} from './billing-access';
import {AppError} from './errors';

type StoredMessage=ProviderMessage & {refundTotal?:number;refundedAt?:string;completedAt?:string;sourceEventId?:string};
const rejected=()=>new AppError(403,'PAYMENT_MESSAGE_INVALID','Makse teadet ei saanud kinnitada.');
/** Persist authenticated minimal data before acknowledging the gateway. Never store raw card/customer data. */
export async function receivePaymentEvent(tenantId:string,attemptId:string,json:string,mac:string){
 if(!z.uuid().safeParse(tenantId).success||!z.uuid().safeParse(attemptId).success)throw rejected();
 const c=makeCommerceConfig(),message=verifyProviderMessage(json,mac,c);
 return persistVerifiedMessage(tenantId,attemptId,message,tokenHash(attemptId+':'+json),c);
}
async function persistVerifiedMessage(tenantId:string,attemptId:string,message:StoredMessage,digest:string,c:MakeCommerceConfig){
 const transactionId=message.message_type==='payment_return'?message.transaction:message.transaction.id;
 return withTenant(tenantId,async client=>{
  const attempt=(await client.query('SELECT * FROM payment_attempts WHERE tenant_id=$1 AND id=$2',[tenantId,attemptId])).rows[0];
  if(!attempt||attempt.environment!==c.mode||attempt.shop_id!==c.shopId||(attempt.transaction_id&&attempt.transaction_id!==transactionId))throw rejected();
  if(message.message_type==='payment_return'&&(message.merchant_data!==attemptId||message.reference!==attempt.reference||message.amount!==attempt.amount))throw rejected();
  if(message.message_type==='token_return'&&message.transaction.reference!==attempt.reference)throw rejected();
  const id=randomUUID();
  await client.query('INSERT INTO payment_provider_events(id,tenant_id,attempt_id,digest,message_type,encrypted_message) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,digest) DO NOTHING',[id,tenantId,attemptId,digest,message.message_type,sealBookingReply(message,'provider-event:'+tenantId+':'+id)]);
  return {accepted:true};
 });
}
/** Recover missed callbacks by reading the known transaction; never create or charge again. */
export async function reconcileTenantCheckouts(tenantId:string){
 const c=makeCommerceConfig(),attempts=await withTenant(tenantId,async client=>(await client.query("SELECT id,transaction_id FROM payment_attempts WHERE tenant_id=$1 AND environment=$2 AND shop_id=$3 AND transaction_id IS NOT NULL AND (state IN ('creating','ready','pending','unknown') OR EXISTS(SELECT 1 FROM payment_provider_events e WHERE e.tenant_id=payment_attempts.tenant_id AND e.attempt_id=payment_attempts.id AND e.processed_at IS NULL AND e.error_code='REFUND_REQUIRES_RECONCILIATION')) AND (checked_at IS NULL OR checked_at<now()-interval '30 seconds') ORDER BY created_at LIMIT 10",[tenantId,c.mode,c.shopId])).rows);
 for(const attempt of attempts){
  try{
   const sources=await withTenant(tenantId,async client=>(await client.query("SELECT id FROM payment_provider_events WHERE tenant_id=$1 AND attempt_id=$2 AND processed_at IS NULL AND error_code='REFUND_REQUIRES_RECONCILIATION' ORDER BY received_at LIMIT 20",[tenantId,attempt.id])).rows);
   // A snapshot acknowledges only callbacks selected before the next fetch, never later notifications.
   const result=await getProviderTransaction(attempt.transaction_id,c);
   if(sources.length){
    for(const source of sources)await queueProviderSnapshot(tenantId,attempt.id,result,c,source.id);
   }else await queueProviderSnapshot(tenantId,attempt.id,result,c);
   await withTenant(tenantId,client=>client.query('UPDATE payment_attempts SET checked_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2',[tenantId,attempt.id]));
  }catch{
   await withTenant(tenantId,client=>client.query("UPDATE payment_attempts SET checked_at=clock_timestamp(),error_code='PAYMENT_RECONCILIATION_FAILED' WHERE tenant_id=$1 AND id=$2",[tenantId,attempt.id]));
  }
 }
}
export async function queueProviderSnapshot(tenantId:string,attemptId:string,result:ProviderTransaction,c=makeCommerceConfig(),sourceEventId?:string){
 const refund=['REFUNDED','PART_REFUNDED'].includes(result.status);
 if(refund&&(!result.completedAt||!result.refundedAt||!Number.isSafeInteger(result.refundedAmount)||result.refundedAmount!<=0||result.refundedAmount!>result.amount||(result.status==='REFUNDED'&&result.refundedAmount!==result.amount)))throw new AppError(502,'PAYMENT_REFUND_DETAILS_MISSING','Tagasimakse vajab kontrollimist.');
 if(result.status==='COMPLETED'&&!result.completedAt)throw new AppError(502,'PAYMENT_COMPLETION_DATE_MISSING','Maksepakkuja vastus vajab kontrollimist.');
 return persistVerifiedMessage(tenantId,attemptId,{message_type:'payment_return',message_time:result.completedAt??new Date().toISOString(),shop:c.shopId,transaction:result.id,status:result.status,amount:result.amount,currency:result.currency,reference:result.reference,merchant_data:result.merchantData,...(refund?{refundTotal:result.refundedAmount!,refundedAt:result.refundedAt!,completedAt:result.completedAt!,sourceEventId}: {})},tokenHash('api:'+attemptId+':'+result.status+':'+(result.refundedAmount??'')+':'+(sourceEventId??'')),c);
}
/** Money and event acknowledgement share the tenant transaction; retries cannot double-credit an invoice. */
export async function processPaymentEvent(tenantId:string,eventId:string){
 return withTenant(tenantId,async client=>{
  const tenant=(await client.query('SELECT id,timezone,service_ends_at FROM tenants WHERE id=$1 FOR UPDATE',[tenantId])).rows[0];if(!tenant)throw rejected();
  const event=(await client.query('SELECT * FROM payment_provider_events WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,eventId])).rows[0];
  if(!event||event.processed_at)return {processed:false};
  const attempt=(await client.query('SELECT * FROM payment_attempts WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,event.attempt_id])).rows[0];
  const message=openBookingReply<StoredMessage>(event.encrypted_message,'provider-event:'+tenantId+':'+eventId);
  if(message.message_type==='token_return'){
   const mandate=(await client.query('SELECT id,status FROM payment_mandates WHERE tenant_id=$1 AND setup_attempt_id=$2 FOR UPDATE',[tenantId,attempt.id])).rows[0];
   if(mandate?.status==='pending'&&message.transaction.status==='COMPLETED'){
    if(!attempt.transaction_id||attempt.state!=='completed'){
     await client.query("UPDATE payment_provider_events SET available_at=now()+interval '30 seconds',error_code='TOKEN_AWAITING_PAYMENT' WHERE tenant_id=$1 AND id=$2",[tenantId,eventId]);return {processed:false};
    }
    if(attempt.transaction_id!==message.transaction.id)throw rejected();
    const valid=message.token?.multiuse===true&&message.token.valid_until>=DateTime.now().setZone(tenant.timezone).toISODate()!;
    if(!valid)await client.query("UPDATE payment_mandates SET status='failed',version=version+1 WHERE tenant_id=$1 AND id=$2",[tenantId,mandate.id]);
    else if(attempt.environment==='test')await client.query("UPDATE payment_mandates SET status='test_complete',version=version+1 WHERE tenant_id=$1 AND id=$2",[tenantId,mandate.id]);
    else{
     await client.query("UPDATE payment_mandates SET status='active',encrypted_token=$3,valid_until=$4,activated_at=clock_timestamp(),version=version+1 WHERE tenant_id=$1 AND id=$2",[tenantId,mandate.id,sealBookingReply(message.token!.id,'payment-mandate:'+tenantId+':'+mandate.id),message.token!.valid_until]);
     await client.query("UPDATE subscriptions SET payment_mode='autopay',version=version+1 WHERE tenant_id=$1",[tenantId]);
     await audit(client,tenantId,null,'payment.mandate.activated',undefined,mandate.id,{attemptId:attempt.id,validUntil:message.token!.valid_until});
    }
   }
   await client.query('UPDATE payment_provider_events SET processed_at=clock_timestamp(),tries=tries+1,error_code=NULL WHERE tenant_id=$1 AND id=$2',[tenantId,eventId]);return {processed:true};
  }
  const isRefund=['REFUNDED','PART_REFUNDED'].includes(message.status);
  if(isRefund&&message.refundTotal===undefined){
   await client.query("UPDATE payment_provider_events SET tries=tries+1,error_code='REFUND_REQUIRES_RECONCILIATION',available_at=now()+interval '10 minutes' WHERE tenant_id=$1 AND id=$2",[tenantId,eventId]);return {processed:false};
  }
  if(attempt.transaction_id&&attempt.transaction_id!==message.transaction)throw rejected();
  if(message.status==='COMPLETED'||isRefund){
   const receivedOn=DateTime.fromJSDate(new Date(message.completedAt??message.message_time)).setZone(tenant.timezone).toISODate();
   const result=attempt.environment==='test'||attempt.amount===0?{rowCount:0,rows:[]}:await client.query(`INSERT INTO payment_records(tenant_id,invoice_id,request_key,amount,received_on,recorded_by,reference,source,provider_attempt_id)
    VALUES($1,$2,$3,$4,$5,NULL,$6,'makecommerce',$3) ON CONFLICT(tenant_id,provider_attempt_id) WHERE provider_attempt_id IS NOT NULL DO NOTHING RETURNING id`,[tenantId,attempt.invoice_id,attempt.id,attempt.amount,receivedOn,'Maksekeskus '+message.transaction]);
   if(result.rowCount){await client.query('UPDATE invoices SET version=version+1 WHERE tenant_id=$1 AND id=$2',[tenantId,attempt.invoice_id]);await audit(client,tenantId,null,'payment.provider.completed',undefined,result.rows[0].id,{attemptId:attempt.id,invoiceId:attempt.invoice_id,amount:attempt.amount,environment:attempt.environment});}
   if(isRefund&&attempt.environment==='live'&&attempt.amount>0){
    const receipt=(await client.query('SELECT id FROM payment_records WHERE tenant_id=$1 AND provider_attempt_id=$2',[tenantId,attempt.id])).rows[0];
    const previous=Number((await client.query('SELECT COALESCE(max(total_refunded),0) total FROM payment_refunds WHERE tenant_id=$1 AND provider_attempt_id=$2',[tenantId,attempt.id])).rows[0].total);
    if(message.refundTotal!>previous){
     const amount=message.refundTotal!-previous;
     await client.query('INSERT INTO payment_refunds(tenant_id,payment_id,provider_attempt_id,event_id,amount,total_refunded,refunded_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[tenantId,receipt.id,attempt.id,eventId,amount,message.refundTotal,message.refundedAt]);
     await client.query('UPDATE invoices SET version=version+1 WHERE tenant_id=$1 AND id=$2',[tenantId,attempt.invoice_id]);
     await audit(client,tenantId,null,'payment.provider.refunded',undefined,receipt.id,{attemptId:attempt.id,invoiceId:attempt.invoice_id,amount,totalRefunded:message.refundTotal});
    }
   }
   if(isRefund&&message.sourceEventId)await client.query('UPDATE payment_provider_events SET processed_at=clock_timestamp(),error_code=NULL WHERE tenant_id=$1 AND id=$2 AND attempt_id=$3 AND processed_at IS NULL',[tenantId,message.sourceEventId,attempt.id]);
   await client.query("UPDATE payment_attempts SET transaction_id=$3,state='completed',provider_status=CASE WHEN provider_status='REFUNDED' THEN provider_status WHEN $4 THEN $5 WHEN provider_status IN ('REFUNDED','PART_REFUNDED') THEN provider_status ELSE 'COMPLETED' END,checked_at=clock_timestamp(),error_code=NULL WHERE tenant_id=$1 AND id=$2",[tenantId,attempt.id,message.transaction,isRefund,isRefund&&message.refundTotal===attempt.amount?'REFUNDED':'PART_REFUNDED']);
   await refreshSubscriptionBilling(client,tenant);
  }else if(['creating','ready','pending','unknown'].includes(attempt.state)){
   const state=message.status==='CANCELLED'?'cancelled':message.status==='EXPIRED'?'expired':message.status==='CREATED'&&attempt.redirect_url?'ready':'pending';
   await client.query('UPDATE payment_attempts SET transaction_id=$3,state=$4,provider_status=$5,checked_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2',[tenantId,attempt.id,message.transaction,state,message.status]);
   if(['cancelled','expired'].includes(state))await client.query("UPDATE payment_mandates SET status='failed',version=version+1 WHERE tenant_id=$1 AND setup_attempt_id=$2 AND status='pending'",[tenantId,attempt.id]);
  }
  await client.query('UPDATE payment_provider_events SET processed_at=clock_timestamp(),tries=tries+1,error_code=NULL WHERE tenant_id=$1 AND id=$2',[tenantId,eventId]);return {processed:true};
 });
}
export async function processTenantPaymentEvents(tenantId:string){
 const ids=await withTenant(tenantId,async client=>(await client.query("SELECT id FROM payment_provider_events WHERE tenant_id=$1 AND processed_at IS NULL AND tries<8 AND available_at<=now() ORDER BY (message_type='token_return'),received_at,id LIMIT 20",[tenantId])).rows);
 let processed=0;for(const row of ids){if((await processPaymentEvent(tenantId,row.id)).processed)processed++;}return {processed};
}
