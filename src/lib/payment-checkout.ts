import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {withTenant} from './db';
import {requireOwnerInTransaction,requirePlatformInClient,audit,type Actor} from './access';
import {invoiceInClient,type InvoiceView} from './invoices';
import {tokenHash} from './booking-secrets';
import {AppError} from './errors';
import {makeCommerceConfig,createProviderTransaction,PaymentProviderError,makeCommerceAvailability} from './makecommerce';
import type {Locale} from './locales';
import {recurringTerms} from './payment-mandates';
import {STANDARD_PLAN} from './billing-rules';
import {invoiceForPaymentLink} from './invoice-links';

export type CheckoutView={id:string;invoiceId:string;state:string;method:string;amount:number;environment:string;transactionId:string|null;redirectUrl:string|null;createdAt:string;errorCode:string|null};
function view(row:Record<string,any>,invoice:InvoiceView):CheckoutView{
 // Withhold stale payment capabilities, but retain the provider's actual state in
 // storage: an already issued link can still settle and must remain reconcilable.
 const open=['creating','ready','pending','unknown','review'].includes(row.state);
 const current=invoice.kind==='invoice'&&invoice.status==='issued'&&invoice.number===row.reference&&row.amount===Math.max(0,invoice.total-invoice.paidAmount)&&(row.method==='enroll'||row.amount>0);
 const stale=open&&!current,state=stale?'review':row.state;
 return {id:row.id,invoiceId:row.invoice_id,state,method:row.method,amount:row.amount,environment:row.environment,transactionId:row.transaction_id,redirectUrl:state==='ready'&&row.method==='link'?row.redirect_url:null,createdAt:row.created_at.toISOString(),errorCode:stale?'INVOICE_CHANGED':row.error_code};
}
const schema=z.object({tenantId:z.uuid(),invoiceId:z.uuid(),requestKey:z.uuid(),invoiceVersion:z.number().int().positive(),method:z.enum(['link','enroll']),consentVersion:z.literal('monthly-v1').optional(),confirmed:z.literal(true).optional()}).strict().refine(d=>d.method==='link'||(d.confirmed===true&&d.consentVersion==='monthly-v1'));
/** Reserve locally before any provider call. An uncertain create is never silently retried. */
export async function beginInvoiceCheckout(actor:Actor,raw:unknown,context:{ip:string;locale:Locale}):Promise<CheckoutView>{
 return beginCheckout(actor,raw,context);
}
async function beginCheckout(actor:Actor|null,raw:unknown,context:{ip:string;locale:Locale},publicToken?:string):Promise<CheckoutView>{
 const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_PAYMENT_REQUEST','Kontrolli makse andmeid.');const d=parsed.data;
 const reserved=await withTenant(d.tenantId,async client=>{
  if(actor)await requireOwnerInTransaction(actor,d.tenantId,client);
  else{
   await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[d.tenantId]);
   if(d.method!=='link'||!publicToken||(await invoiceForPaymentLink(client,d.tenantId,publicToken))!==d.invoiceId)throw new AppError(404,'PAYMENT_LINK_NOT_FOUND','Arve makselinki ei leitud.');
  }
  const config=makeCommerceConfig();
  const hash=tokenHash(JSON.stringify(d)),old=(await client.query('SELECT * FROM payment_attempts WHERE tenant_id=$1 AND request_key=$2',[d.tenantId,d.requestKey])).rows[0];
  const invoice=await invoiceInClient(client,d.tenantId,d.invoiceId);
  if(old){if(old.payload_hash!==hash)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');return {existing:view(old,invoice)};}
  if(invoice.version!==d.invoiceVersion)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  if(invoice.kind!=='invoice'||invoice.status!=='issued'||!invoice.number||(d.method==='link'&&invoice.total<=invoice.paidAmount))throw new AppError(409,'INVOICE_NOT_PAYABLE','See arve ei vaja praegu tasumist.');
  const current=(await client.query("SELECT * FROM payment_attempts WHERE tenant_id=$1 AND invoice_id=$2 AND state IN ('creating','ready','pending','unknown','review')",[d.tenantId,d.invoiceId])).rows[0];
  if(current){if(current.method!==d.method)throw new AppError(409,'PAYMENT_ALREADY_IN_PROGRESS','Selle arve makse on juba pooleli. Oota makse tulemust.');return {existing:view(current,invoice)};}
  const id=randomUUID(),amount=Math.max(0,invoice.total-invoice.paidAmount);
  let subscriptionId:string|null=null;
  if(d.method==='enroll'){
   const subscription=(await client.query('SELECT s.id,s.plan_id,s.ends_at,p.monthly_price FROM subscriptions s JOIN plan_versions p ON (p.id,p.version)=(s.plan_id,s.plan_version) WHERE s.tenant_id=$1',[d.tenantId])).rows[0];
   if(!subscription||subscription.plan_id!==STANDARD_PLAN.id||subscription.monthly_price!==recurringTerms.amount||subscription.ends_at)throw new AppError(409,'RECURRING_TERMS_CHANGED','Püsimakse tingimused vajavad uut kinnitust.');
   if((await client.query("SELECT id FROM payment_mandates WHERE tenant_id=$1 AND status IN ('pending','active')",[d.tenantId])).rowCount)throw new AppError(409,'MANDATE_EXISTS','Püsimakse on juba seadistatud või kinnitamisel.');subscriptionId=subscription.id;
  }
  await client.query('INSERT INTO payment_attempts(id,tenant_id,invoice_id,request_key,payload_hash,method,environment,shop_id,amount,reference,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,d.tenantId,d.invoiceId,d.requestKey,hash,d.method,config.mode,config.shopId,amount,invoice.number,actor?.id??null]);
  if(subscriptionId)await client.query('INSERT INTO payment_mandates(tenant_id,subscription_id,setup_attempt_id,consent_by,terms) VALUES($1,$2,$3,$4,$5)',[d.tenantId,subscriptionId,id,actor!.id,JSON.stringify(recurringTerms)]);
  await audit(client,d.tenantId,actor?.id??null,'payment.checkout.started',undefined,id,{invoiceId:d.invoiceId,amount,environment:config.mode});
  if(subscriptionId)await audit(client,d.tenantId,actor!.id,'payment.mandate.consented',undefined,id,{terms:recurringTerms});
  return {created:{id,amount,reference:invoice.number,email:invoice.recipient.email,config}};
 });
 if(reserved.existing)return reserved.existing;
 const attempt=reserved.created!;
 try{
  const result=await createProviderTransaction({tenantId:d.tenantId,attemptId:attempt.id,amount:attempt.amount,reference:attempt.reference,email:attempt.email,ip:context.ip,locale:context.locale,recurring:d.method==='enroll'},attempt.config);
  return withTenant(d.tenantId,async client=>{
   await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[d.tenantId]);
   // A callback may already have completed this exact attempt while the HTTP request was returning.
   const row=(await client.query('SELECT * FROM payment_attempts WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[d.tenantId,attempt.id])).rows[0];
   if(row.transaction_id&&row.transaction_id!==result.id)throw new AppError(409,'PAYMENT_TRANSACTION_CONFLICT','Makse tehing vajab kontrollimist.');
   const invoice=await invoiceInClient(client,d.tenantId,d.invoiceId);
   const state=row.state!=='creating'?row.state:result.status==='CREATED'&&(d.method==='enroll'||result.redirectUrl)?'ready':result.status==='CANCELLED'?'cancelled':result.status==='EXPIRED'?'expired':'pending';
   const saved=(await client.query('UPDATE payment_attempts SET transaction_id=$3,state=$4,redirect_url=$5,provider_status=$6,checked_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2 RETURNING *',[d.tenantId,attempt.id,result.id,state,result.redirectUrl,row.state==='creating'?result.status:row.provider_status??result.status])).rows[0];return view(saved,invoice);
  });
 }catch(error){
  // A response can be lost after the provider created the transaction. Keep it open for reconciliation.
  const state=error instanceof PaymentProviderError&&error.outcome==='rejected'?'failed':'unknown';
  return withTenant(d.tenantId,async client=>{
   await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[d.tenantId]);
   const row=(await client.query("UPDATE payment_attempts SET state=$3,error_code=$4,checked_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2 AND state='creating' RETURNING *",[d.tenantId,attempt.id,state,error instanceof AppError?error.code:'PAYMENT_OUTCOME_UNKNOWN'])).rows[0]??(await client.query('SELECT * FROM payment_attempts WHERE tenant_id=$1 AND id=$2',[d.tenantId,attempt.id])).rows[0];
   if(row.state==='failed')await client.query("UPDATE payment_mandates SET status='failed',version=version+1 WHERE tenant_id=$1 AND setup_attempt_id=$2 AND status='pending'",[d.tenantId,attempt.id]);return view(row,await invoiceInClient(client,d.tenantId,d.invoiceId));
  });
 }
}
const publicIdentity={tenantId:z.uuid(),token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)};
export async function readPublicInvoicePayment(raw:unknown){
 const parsed=z.object(publicIdentity).strict().safeParse(raw);if(!parsed.success)throw new AppError(404,'PAYMENT_LINK_NOT_FOUND','Arve makselinki ei leitud.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  await client.query('SELECT id FROM tenants WHERE id=$1 FOR SHARE',[d.tenantId]);
  const id=await invoiceForPaymentLink(client,d.tenantId,d.token),invoice=await invoiceInClient(client,d.tenantId,id);
  const attempt=(await client.query("SELECT * FROM payment_attempts WHERE tenant_id=$1 AND invoice_id=$2 AND state IN ('creating','ready','pending','unknown','review') ORDER BY created_at DESC LIMIT 1",[d.tenantId,id])).rows[0];
  return {invoice:{id,number:invoice.number,version:invoice.version,status:invoice.status,total:invoice.total,paidAmount:invoice.paidAmount,outstanding:invoice.status==='void'?0:Math.max(0,invoice.total-invoice.paidAmount),dueDate:invoice.dueDate,issuer:invoice.issuer.issuer?.name,iban:invoice.issuer.iban,recipient:invoice.recipient.name},attempt:attempt?view(attempt,invoice):null,provider:makeCommerceAvailability()};
 });
}
export async function beginPublicInvoiceCheckout(raw:unknown,context:{ip:string;locale:Locale}){
 const parsed=z.object({...publicIdentity,requestKey:z.uuid(),invoiceVersion:z.number().int().positive()}).strict().safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_PAYMENT_REQUEST','Kontrolli makse andmeid.');const d=parsed.data;
 const invoiceId=await withTenant(d.tenantId,client=>invoiceForPaymentLink(client,d.tenantId,d.token));
 return beginCheckout(null,{tenantId:d.tenantId,invoiceId,requestKey:d.requestKey,invoiceVersion:d.invoiceVersion,method:'link'},context,d.token);
}
export async function readCheckouts(actor:Actor,tenantId:string,invoiceId:string,platform=false){
 if(!z.uuid().safeParse(tenantId).success||!z.uuid().safeParse(invoiceId).success)throw new AppError(400,'INVALID_PAYMENT_REQUEST','Kontrolli makse andmeid.');
 return withTenant(tenantId,async client=>{if(platform){await requirePlatformInClient(actor,client);await client.query('SELECT id FROM tenants WHERE id=$1 FOR SHARE',[tenantId]);}else await requireOwnerInTransaction(actor,tenantId,client);
  const invoice=await invoiceInClient(client,tenantId,invoiceId);
  return {attempts:(await client.query('SELECT * FROM payment_attempts WHERE tenant_id=$1 AND invoice_id=$2 ORDER BY created_at DESC,id DESC LIMIT 50',[tenantId,invoiceId])).rows.map(row=>view(row,invoice))};
 });
}
