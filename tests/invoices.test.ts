import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {randomUUID,createHash} from 'node:crypto';
import {DateTime} from 'luxon';
import pg from 'pg';
import {createSubscription} from '../src/lib/subscriptions';
import {billingIssuerState,saveBillingIssuer,type BillingSettings} from '../src/lib/billing-config';
import {saveBillingRecipient,previewInvoice,issueInvoice,readInvoice,readInvoices} from '../src/lib/invoices';
import {withTenant} from '../src/lib/db';
import type {Actor} from '../src/lib/access';
import {invoiceDocument} from '../src/lib/invoice-document';
import {creditInvoice} from '../src/lib/invoice-corrections';
import {recordPayment} from '../src/lib/payments';
import {beginInvoiceCheckout,readCheckouts,readPublicInvoicePayment,beginPublicInvoiceCheckout} from '../src/lib/payment-checkout';
import {receivePaymentEvent,processTenantPaymentEvents} from '../src/lib/payment-events';
import {makeCommerceConfig} from '../src/lib/makecommerce';
import {runTenantAutopay} from '../src/lib/payment-autopay';
import {monthlyPeriod} from '../src/lib/billing-rules';
import {readInvoicePaymentLink} from '../src/lib/invoice-links';
import {runTenantBilling} from '../src/lib/billing-worker';
import {deliverInvoiceMail,queueInvoiceReminders} from '../src/lib/invoice-mail';
import {insertInvoiceInClient} from '../src/lib/invoices';
import {retryInvoiceMail} from '../src/lib/invoice-mail-admin';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL}),tenantId=randomUUID(),otherId=randomUUID();
const admin:Actor={id:randomUUID(),name:'Invoice platform',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:true};
const owner:Actor={...admin,id:randomUUID(),email:randomUUID()+'@example.invalid',isPlatformAdmin:false};
const staff:Actor={...owner,id:randomUUID(),email:randomUUID()+'@example.invalid'};
const settings:BillingSettings={issuer:{name:'Test issuer',registrationCode:'TEST123',address:'Test street 1',country:'EE',vatNumber:'EE123456789',email:'issuer@example.invalid'},iban:'GB82WEST12345698765432',numberPrefix:'TEST',vatRegistered:true,taxRateBasisPoints:2400,taxNote:'Test only: explicitly configured tax treatment.'};
const recipient={name:'Test buyer',registrationCode:'BUYER123',address:'Buyer street 1',country:'EE',vatNumber:'',email:'buyer@example.invalid'};
let version=0,subscriptionVersion=1,invoiceId='',fingerprint='';
beforeAll(async()=>{
 await db.connect();for(const id of [tenantId,otherId])await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Invoice test','Test street')",[id,'invoice-'+id]);
 for(const user of [admin,owner,staff])await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin) VALUES($1,$2,$3,true,true,$4)',[user.id,user.name,user.email,user.isPlatformAdmin]);
 await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'receptionist')",[tenantId,owner.id,staff.id]);
 version=(await billingIssuerState(admin)).issuer?.version??0;
 await createSubscription(admin,{tenantId,requestKey:randomUUID(),start:DateTime.now().setZone('Europe/Tallinn').toISODate(),billingName:recipient.name,billingEmail:recipient.email,confirmed:true});
});
afterAll(async()=>{
 for(const table of ['payment_refunds','payment_provider_events','payment_records'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[[tenantId,otherId]]);
 await db.query("DELETE FROM payment_attempts WHERE tenant_id=ANY($1::uuid[]) AND method='autopay'",[[tenantId,otherId]]);
 for(const table of ['billing_commands','payment_mandates','payment_attempts','invoice_payment_links','invoices','subscriptions','memberships'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[[tenantId,otherId]]);
 await db.query('DELETE FROM access_audit_log WHERE actor_user_id=ANY($1::text[]) OR tenant_id=ANY($2::uuid[])',[[admin.id,owner.id,staff.id],[tenantId,otherId]]);
 await db.query('DELETE FROM billing_issuer_versions WHERE approved_by=$1',[admin.id]);
 await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[[tenantId,otherId]]);
 await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[admin.id,owner.id,staff.id]]);await db.end();
});

it('requires explicit valid accounting settings, checks current platform rights, and versions concurrent retries once',async()=>{
 const d={requestKey:randomUUID(),expectedVersion:version,settings,approvalNote:'Confirmed test accounting setup',confirmed:true};
 await expect(saveBillingIssuer(owner,d)).rejects.toMatchObject({status:403});
 await expect(saveBillingIssuer(admin,{...d,settings:{...settings,iban:'EE000000000000000000'}})).rejects.toMatchObject({status:400});
 await expect(saveBillingIssuer(admin,{...d,settings:{...settings,vatRegistered:false}})).rejects.toMatchObject({status:400});
 await expect(saveBillingIssuer(admin,{...d,confirmed:false})).rejects.toMatchObject({status:400});
 const [a,b]=await Promise.all([saveBillingIssuer(admin,d),saveBillingIssuer(admin,d)]);expect(a).toEqual(b);expect(a.issuer.version).toBe(version+1);version=a.issuer.version;
 await expect(saveBillingIssuer(admin,{...d,approvalNote:'Changed test accounting setup'})).rejects.toMatchObject({code:'IDEMPOTENCY_MISMATCH'});
 await expect(saveBillingIssuer(admin,{...d,requestKey:randomUUID()})).rejects.toMatchObject({code:'VERSION_CONFLICT'});
});
it('allows only the owner or platform to save recipient details and keeps preview read-only',async()=>{
 await expect(previewInvoice(admin,tenantId)).rejects.toMatchObject({code:'BILLING_RECIPIENT_REQUIRED'});
 const d={tenantId,requestKey:randomUUID(),version:subscriptionVersion,recipient};
 await expect(saveBillingRecipient(staff,d)).rejects.toMatchObject({status:403});
 const saved=await saveBillingRecipient(owner,d);subscriptionVersion=saved.version;expect(await saveBillingRecipient(owner,d)).toEqual(saved);
 await expect(previewInvoice(owner,tenantId)).rejects.toMatchObject({status:403});
 const p=await previewInvoice(admin,tenantId);fingerprint=p.fingerprint;
 expect(p).toMatchObject({total:3500,subtotal:2823,tax:677,currency:'EUR',recipient,issuer:settings});
 expect(p.dueDate).toBe(DateTime.fromISO(p.issuedOn).plus({days:7}).toISODate());
 expect((await db.query('SELECT count(*)::int n FROM invoices WHERE tenant_id=$1',[tenantId])).rows[0].n).toBe(0);
});
it('issues one immutable invoice under concurrent replay, keeps the gross price, and enforces tenant access',async()=>{
 const d={tenantId,requestKey:randomUUID(),fingerprint,confirmed:true};const [a,b]=await Promise.all([issueInvoice(admin,d),issueInvoice(admin,d)]);expect(a).toEqual(b);invoiceId=a.id;
 expect(a.number).toMatch(/^TEST-\d{4}-\d{6,}$/);expect(a).toMatchObject({status:'issued',total:3500,paidAmount:0,recipient});
 expect(await readInvoice(owner,tenantId,a.id)).toEqual(a);
 await expect(readInvoice(staff,tenantId,a.id)).rejects.toMatchObject({status:403});
 await expect(readInvoice(owner,otherId,a.id)).rejects.toMatchObject({status:403});
 await expect(readInvoice(admin,otherId,a.id,true)).rejects.toMatchObject({status:404});
 expect((await withTenant(otherId,c=>c.query('SELECT id FROM invoices WHERE id=$1',[a.id]))).rows).toEqual([]);
 await expect(issueInvoice(admin,{...d,requestKey:randomUUID()})).rejects.toMatchObject({code:'INVOICE_EXISTS'});
 await expect(db.query('UPDATE invoices SET total=3600,subtotal=2923 WHERE tenant_id=$1 AND id=$2',[tenantId,a.id])).rejects.toMatchObject({code:'23514'});
 expect((await readInvoices(owner,tenantId)).invoices).toHaveLength(1);
 await db.query('UPDATE auth_user SET is_platform_admin=false WHERE id=$1',[admin.id]);await expect(issueInvoice(admin,d)).rejects.toMatchObject({status:403});await db.query('UPDATE auth_user SET is_platform_admin=true WHERE id=$1',[admin.id]);
});
it('requires a new preview after configuration changes and never rewrites an issued snapshot',async()=>{
 await saveBillingIssuer(admin,{requestKey:randomUUID(),expectedVersion:version,settings:{...settings,taxRateBasisPoints:2000},approvalNote:'Second test accounting approval',confirmed:true});
 await expect(issueInvoice(admin,{tenantId,requestKey:randomUUID(),fingerprint,confirmed:true})).rejects.toMatchObject({code:'INVOICE_PREVIEW_CHANGED'});
 const old=await readInvoice(owner,tenantId,invoiceId);expect(old).toMatchObject({subtotal:2823,tax:677,total:3500,issuer:{taxRateBasisPoints:2400}});
 expect((await db.query("SELECT count(*)::int n FROM access_audit_log WHERE tenant_id=$1 AND action='invoice.issued'",[tenantId])).rows[0].n).toBe(1);
 const document=invoiceDocument({...old,recipient:{...old.recipient,name:'<script>alert(1)</script>'}},'et');
 expect(document).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');expect(document).not.toContain('<script>');expect(document).toContain(old.number!);expect(document).toContain(old.dueDate);
});

it('credits the full invoice exactly once, preserves received money, and allows a newly reviewed replacement',async()=>{
 const old=await readInvoice(owner,tenantId,invoiceId);
 const paid=await recordPayment(admin,{tenantId,requestKey:randomUUID(),invoiceId,invoiceVersion:old.version,amount:3500,receivedOn:DateTime.now().setZone('Europe/Tallinn').toISODate(),bankEntryId:'CREDIT-TEST',reference:'Actual test receipt',allowOverpayment:false,confirmed:true});
 const data={tenantId,requestKey:randomUUID(),invoiceId,version:paid.invoice.version,reason:'Incorrect recipient information',confirmed:true};
 await expect(creditInvoice(owner,data)).rejects.toMatchObject({status:403});
 await expect(creditInvoice(admin,{...data,tenantId:otherId})).rejects.toMatchObject({status:404});
 await expect(creditInvoice(admin,{...data,version:old.version})).rejects.toMatchObject({code:'VERSION_CONFLICT'});
 const [a,b]=await Promise.all([creditInvoice(admin,data),creditInvoice(admin,data)]);expect(a).toEqual(b);
 expect(a.invoice).toMatchObject({status:'void',paidAmount:3500,total:3500,creditId:a.credit.id});
 expect(a.credit).toMatchObject({kind:'credit',originalInvoiceId:invoiceId,originalNumber:old.number,total:-3500,subtotal:-old.subtotal,tax:-old.tax,paidAmount:0,issuer:old.issuer,recipient:old.recipient});
 expect(a.access.allowed).toBe(false);expect(a.access.paidThrough).toBeNull();
 await expect(creditInvoice(admin,{...data,reason:'Changed correction reason'})).rejects.toMatchObject({code:'IDEMPOTENCY_MISMATCH'});
 await expect(creditInvoice(admin,{...data,requestKey:randomUUID(),invoiceId:a.credit.id,version:1})).rejects.toMatchObject({code:'INVOICE_NOT_CREDITABLE'});
 await expect(recordPayment(admin,{tenantId,requestKey:randomUUID(),invoiceId:a.credit.id,invoiceVersion:1,amount:1,receivedOn:a.credit.issuedOn,bankEntryId:'INVALID',reference:'',allowOverpayment:true,confirmed:true})).rejects.toMatchObject({code:'INVOICE_NOT_PAYABLE'});
 await expect(db.query('UPDATE invoices SET correction_reason=$2 WHERE id=$1',[a.credit.id,'Changed snapshot reason'])).rejects.toMatchObject({code:'23514'});
 const html=invoiceDocument(a.credit,'et');expect(html).toContain('Kreeditarve');expect(html).toContain(old.number!);expect(html).not.toContain('Makse selgitus');
 const p=await previewInvoice(admin,tenantId),replacement=await issueInvoice(admin,{tenantId,requestKey:randomUUID(),fingerprint:p.fingerprint,confirmed:true});
 expect(replacement.id).not.toBe(invoiceId);expect(replacement.paidAmount).toBe(0);expect(replacement.total).toBe(3500);
 expect((await readInvoices(owner,tenantId)).invoices).toHaveLength(3);
 await db.query('UPDATE auth_user SET is_platform_admin=false WHERE id=$1',[admin.id]);await expect(creditInvoice(admin,data)).rejects.toMatchObject({status:403});await db.query('UPDATE auth_user SET is_platform_admin=true WHERE id=$1',[admin.id]);
});
import {reversePayment} from '../src/lib/payments';
it('reserves one checkout, accepts signed callbacks once, and preserves actual provider receipts',async()=>{
 for(const [key,value] of Object.entries({MAKECOMMERCE_MODE:'live',MAKECOMMERCE_SHOP_ID:randomUUID(),MAKECOMMERCE_SECRET_KEY:'fake-local-only-never-sent',MAKECOMMERCE_PUBLISHABLE_KEY:'fake-public-key',MAKECOMMERCE_BASE_URL:'https://billing.example.invalid'}))vi.stubEnv(key,value);
 const remote=randomUUID(),c=makeCommerceConfig();
 const fetcher=vi.fn().mockImplementation(async(_url,options)=>{const b=JSON.parse(options.body);return Response.json({id:remote,status:'CREATED',amount:b.transaction.amount,currency:'EUR',reference:b.transaction.reference,merchant_data:b.transaction.merchant_data,payment_methods:{other:[{name:'redirect',url:'https://payment.maksekeskus.ee/pay.html?trx='+remote}]}},{status:201});});vi.stubGlobal('fetch',fetcher);
 try{
  const invoice=(await readInvoices(owner,tenantId)).invoices.find(row=>row.kind==='invoice'&&row.status==='issued')!;
  const d={tenantId,invoiceId:invoice.id,invoiceVersion:invoice.version,requestKey:randomUUID(),method:'link'},ctx={ip:'192.0.2.1',locale:'et' as const};
  await expect(beginInvoiceCheckout(staff,d,ctx)).rejects.toMatchObject({status:403});
  const [first,second]=await Promise.all([beginInvoiceCheckout(owner,d,ctx),beginInvoiceCheckout(owner,d,ctx)]);expect(first.id).toBe(second.id);expect(fetcher).toHaveBeenCalledTimes(1);expect([first.state,second.state]).toContain('ready');
  expect((await beginInvoiceCheckout(owner,d,ctx)).id).toBe(first.id);expect(fetcher).toHaveBeenCalledTimes(1);
  expect((await readCheckouts(owner,tenantId,invoice.id)).attempts).toHaveLength(1);
  const message={message_type:'payment_return',message_time:new Date().toISOString(),shop:c.shopId,transaction:remote,status:'COMPLETED',amount:'35.00',currency:'EUR',reference:invoice.number,merchant_data:first.id};
  const send=async(value:unknown)=>{const json=JSON.stringify(value),mac=createHash('sha512').update(json).update(c.secret).digest('hex');return receivePaymentEvent(tenantId,first.id,json,mac);};
  await expect(send({...message,amount:'34.99'})).rejects.toMatchObject({status:403});
  await Promise.all([send(message),send(message)]);await Promise.all([processTenantPaymentEvents(tenantId),processTenantPaymentEvents(tenantId)]);
  expect((await readInvoice(owner,tenantId,invoice.id)).paidAmount).toBe(3500);
  expect((await db.query('SELECT count(*)::int n FROM payment_provider_events WHERE tenant_id=$1',[tenantId])).rows[0].n).toBe(1);
  await send({...message,message_time:new Date(Date.now()+1000).toISOString()});await processTenantPaymentEvents(tenantId);expect((await readInvoice(owner,tenantId,invoice.id)).paidAmount).toBe(3500);
  await send({...message,status:'PENDING'});await processTenantPaymentEvents(tenantId);expect((await readCheckouts(owner,tenantId,invoice.id)).attempts[0].state).toBe('completed');
  const receipt=(await db.query("SELECT id,version FROM payment_records WHERE tenant_id=$1 AND source='makecommerce'",[tenantId])).rows[0];
  await expect(reversePayment(admin,{tenantId,requestKey:randomUUID(),paymentId:receipt.id,version:receipt.version,reason:'Cannot erase actual provider money',confirmed:true})).rejects.toMatchObject({code:'PROVIDER_PAYMENT_IMMUTABLE'});
  const fresh=await readInvoice(owner,tenantId,invoice.id);await creditInvoice(admin,{tenantId,requestKey:randomUUID(),invoiceId:invoice.id,version:fresh.version,reason:'Corrected after actual card receipt',confirmed:true});expect((await readInvoice(owner,tenantId,invoice.id)).paidAmount).toBe(3500);
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();}
});
import {readPaymentMandate,revokePaymentMandate} from '../src/lib/payment-mandates';
it('activates only a confirmed multiuse token and never reactivates revoked consent',async()=>{
 for(const [key,value] of Object.entries({MAKECOMMERCE_MODE:'live',MAKECOMMERCE_SHOP_ID:randomUUID(),MAKECOMMERCE_SECRET_KEY:'fake-local-only-never-sent',MAKECOMMERCE_PUBLISHABLE_KEY:'fake-public-key',MAKECOMMERCE_BASE_URL:'https://billing.example.invalid'}))vi.stubEnv(key,value);
 const c=makeCommerceConfig(),remote=randomUUID(),cardToken=randomUUID();vi.stubGlobal('fetch',vi.fn().mockImplementation(async(_url,options)=>{const b=JSON.parse(options.body);expect(b.transaction.recurring_required).toBe(true);return Response.json({id:remote,status:'CREATED',amount:b.transaction.amount,currency:'EUR',reference:b.transaction.reference,merchant_data:b.transaction.merchant_data},{status:201});}));
 try{
  const p=await previewInvoice(admin,tenantId),invoice=await issueInvoice(admin,{tenantId,requestKey:randomUUID(),fingerprint:p.fingerprint,confirmed:true});
  const d={tenantId,invoiceId:invoice.id,invoiceVersion:invoice.version,requestKey:randomUUID(),method:'enroll',consentVersion:'monthly-v1',confirmed:true},ctx={ip:'192.0.2.1',locale:'et' as const};
  await expect(beginInvoiceCheckout(owner,{...d,confirmed:false},ctx)).rejects.toMatchObject({status:400});
  const attempt=await beginInvoiceCheckout(owner,d,ctx);expect(attempt.state).toBe('ready');expect(attempt.redirectUrl).toBeNull();expect((await readPaymentMandate(owner,tenantId)).mandate?.status).toBe('pending');
  const send=async(value:unknown)=>{const json=JSON.stringify(value);return receivePaymentEvent(tenantId,attempt.id,json,createHash('sha512').update(json).update(c.secret).digest('hex'));};
  const tokenMessage={message_type:'token_return',message_time:new Date().toISOString(),transaction:{id:remote,status:'COMPLETED',reference:invoice.number},token:{id:cardToken,multiuse:true,valid_until:'2030-12-31'}};
  await send(tokenMessage);await processTenantPaymentEvents(tenantId);expect((await readPaymentMandate(owner,tenantId)).mandate?.status).toBe('pending');
  await send({message_type:'payment_return',message_time:new Date().toISOString(),shop:c.shopId,transaction:remote,status:'COMPLETED',amount:'35.00',currency:'EUR',reference:invoice.number,merchant_data:attempt.id});
  await db.query('UPDATE payment_provider_events SET available_at=now() WHERE tenant_id=$1',[tenantId]);await processTenantPaymentEvents(tenantId);
  const mandate=(await readPaymentMandate(owner,tenantId)).mandate!;expect(mandate.status).toBe('active');
  const stored=(await db.query('SELECT m.encrypted_token,s.payment_mode FROM payment_mandates m JOIN subscriptions s USING(tenant_id) WHERE m.id=$1',[mandate.id])).rows[0];expect(stored.payment_mode).toBe('autopay');expect(stored.encrypted_token).not.toContain(cardToken);
  const revoke={tenantId,mandateId:mandate.id,version:mandate.version,requestKey:randomUUID(),confirmed:true};
  await expect(revokePaymentMandate(staff,revoke)).rejects.toMatchObject({status:403});await Promise.all([revokePaymentMandate(owner,revoke),revokePaymentMandate(owner,revoke)]);
  await send({...tokenMessage,message_time:new Date(Date.now()+1000).toISOString()});await processTenantPaymentEvents(tenantId);
  expect((await readPaymentMandate(owner,tenantId)).mandate?.status).toBe('revoked');expect((await db.query('SELECT encrypted_token FROM payment_mandates WHERE id=$1',[mandate.id])).rows[0].encrypted_token).toBeNull();expect((await db.query('SELECT payment_mode FROM subscriptions WHERE tenant_id=$1',[tenantId])).rows[0].payment_mode).toBe('invoice');
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();}
});
it('links an already-paid account with zero charge and charges the next invoice once under concurrent workers',async()=>{
 for(const [key,value] of Object.entries({MAKECOMMERCE_MODE:'live',MAKECOMMERCE_SHOP_ID:randomUUID(),MAKECOMMERCE_SECRET_KEY:'fake-local-only-never-sent',MAKECOMMERCE_PUBLISHABLE_KEY:'fake-public-key',MAKECOMMERCE_BASE_URL:'https://billing.example.invalid',MAKECOMMERCE_SERVER_IP:'192.0.2.2'}))vi.stubEnv(key,value);
 const c=makeCommerceConfig(),cardToken=randomUUID(),transactions=new Map<string,any>();let nowSpy:ReturnType<typeof vi.spyOn>|undefined;
 const fetcher=vi.fn().mockImplementation(async(url:string,options:any)=>{
  if(options.method==='POST'&&url.endsWith('/v1/transactions')){const b=JSON.parse(options.body),id=randomUUID(),row={id,status:'CREATED',amount:b.transaction.amount,currency:'EUR',reference:b.transaction.reference,merchant_data:b.transaction.merchant_data};transactions.set(id,row);return Response.json(row,{status:201});}
  if(options.method==='POST'&&url.endsWith('/payments')){expect(JSON.parse(options.body).token).toBe(cardToken);const id=url.split('/').at(-2)!;transactions.get(id).status='COMPLETED';transactions.get(id).completed_at=DateTime.now().toISO();return Response.json({transaction:{id,status:'COMPLETED'}},{status:201});}
  return Response.json(transactions.get(url.split('/').at(-1)!));
 });vi.stubGlobal('fetch',fetcher);
 try{
  const old=(await readInvoices(owner,tenantId)).invoices.find(row=>row.kind==='invoice'&&row.status==='issued')!;expect(old.paidAmount).toBe(3500);
  const setup=await beginInvoiceCheckout(owner,{tenantId,invoiceId:old.id,invoiceVersion:old.version,requestKey:randomUUID(),method:'enroll',consentVersion:'monthly-v1',confirmed:true},{ip:'192.0.2.1',locale:'et'});expect(setup.amount).toBe(0);
  for(const message of [{message_type:'payment_return',message_time:new Date().toISOString(),shop:c.shopId,transaction:setup.transactionId,status:'COMPLETED',amount:'0.00',currency:'EUR',reference:old.number,merchant_data:setup.id},{message_type:'token_return',message_time:new Date().toISOString(),transaction:{id:setup.transactionId,status:'COMPLETED',reference:old.number},token:{id:cardToken,multiuse:true,valid_until:'2030-12-31'}}]){const json=JSON.stringify(message);await receivePaymentEvent(tenantId,setup.id,json,createHash('sha512').update(json).update(c.secret).digest('hex'));}
  await processTenantPaymentEvents(tenantId);expect((await readPaymentMandate(owner,tenantId)).mandate?.status).toBe('active');expect((await readInvoice(owner,tenantId,old.id)).paidAmount).toBe(3500);
  const next=monthlyPeriod(old.periodEnd),future=DateTime.fromISO(next.start,{zone:'Europe/Tallinn'}).set({hour:12});nowSpy=vi.spyOn(Date,'now').mockReturnValue(future.toMillis());
  const invoiceId=(await db.query(`INSERT INTO invoices(tenant_id,subscription_id,request_key,number,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total,currency,status,issued_at,issued_on,snapshot_hash,issuer_version)
   SELECT tenant_id,subscription_id,$3,$4,$5,$6,$7,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total,currency,'issued',$8,$5,snapshot_hash,issuer_version FROM invoices WHERE tenant_id=$1 AND id=$2 RETURNING id`,[tenantId,old.id,randomUUID(),'AUTO-'+randomUUID(),next.start,next.end,future.plus({days:7}).toISODate(),future.toISO()])).rows[0].id;
  await Promise.all([runTenantAutopay(tenantId),runTenantAutopay(tenantId)]);await processTenantPaymentEvents(tenantId);await runTenantAutopay(tenantId);
  expect(fetcher.mock.calls.filter(call=>String(call[0]).endsWith('/payments'))).toHaveLength(1);expect((await readInvoice(owner,tenantId,invoiceId)).paidAmount).toBe(3500);
  const attempts=(await readCheckouts(owner,tenantId,invoiceId)).attempts;expect(attempts).toHaveLength(1);expect(attempts[0]).toMatchObject({method:'autopay',state:'completed'});
 }finally{nowSpy?.mockRestore();vi.unstubAllGlobals();vi.unstubAllEnvs();}
});
it('limits an invoice bearer link to its own payment and revokes access before replay',async()=>{
 for(const [key,value] of Object.entries({MAKECOMMERCE_MODE:'live',MAKECOMMERCE_SHOP_ID:randomUUID(),MAKECOMMERCE_SECRET_KEY:'fake-local-only-never-sent',MAKECOMMERCE_PUBLISHABLE_KEY:'fake-public-key',MAKECOMMERCE_BASE_URL:'https://billing.example.invalid'}))vi.stubEnv(key,value);
 const remote=randomUUID();vi.stubGlobal('fetch',vi.fn().mockImplementation(async(_url,options)=>{const b=JSON.parse(options.body);return Response.json({id:remote,status:'CREATED',amount:b.transaction.amount,currency:'EUR',reference:b.transaction.reference,merchant_data:b.transaction.merchant_data,payment_methods:{other:[{name:'redirect',url:'https://payment.maksekeskus.ee/pay.html?trx='+remote}]}},{status:201});}));
 try{
  const current=(await readInvoices(owner,tenantId)).invoices.find(row=>row.kind==='invoice'&&row.status==='issued'&&row.periodStart===DateTime.now().setZone('Europe/Tallinn').toISODate())!;
  await creditInvoice(admin,{tenantId,requestKey:randomUUID(),invoiceId:current.id,version:current.version,reason:'Correct public payment fixture',confirmed:true});
  const p=await previewInvoice(admin,tenantId),invoice=await issueInvoice(admin,{tenantId,requestKey:randomUUID(),fingerprint:p.fingerprint,confirmed:true});
  const url=await withTenant(tenantId,client=>readInvoicePaymentLink(client,tenantId,invoice.id));expect(url).toBeTruthy();expect(new URL(url!).search).toBe('');expect(new URL(url!).pathname).toBe('/pay');const token=new URL(url!).hash.slice(1).split('.')[1];
  const summary=await readPublicInvoicePayment({tenantId,token});expect(summary.invoice).toMatchObject({id:invoice.id,outstanding:3500});expect(summary.invoice).not.toHaveProperty('recipient_snapshot');
  await expect(readPublicInvoicePayment({tenantId:otherId,token})).rejects.toMatchObject({status:404});await expect(readPublicInvoicePayment({tenantId,token:'A'.repeat(43)})).rejects.toMatchObject({status:404});
  const d={tenantId,token,requestKey:randomUUID(),invoiceVersion:invoice.version};
  await expect(beginPublicInvoiceCheckout({...d,method:'enroll'},{ip:'192.0.2.1',locale:'et'})).rejects.toMatchObject({status:400});
  const attempt=await beginPublicInvoiceCheckout(d,{ip:'192.0.2.1',locale:'et'});expect(attempt.state).toBe('ready');expect((await db.query('SELECT created_by,method FROM payment_attempts WHERE id=$1',[attempt.id])).rows[0]).toEqual({created_by:null,method:'link'});
  await db.query('UPDATE invoice_payment_links SET revoked_at=now() WHERE tenant_id=$1 AND invoice_id=$2',[tenantId,invoice.id]);await expect(beginPublicInvoiceCheckout(d,{ip:'192.0.2.1',locale:'et'})).rejects.toMatchObject({status:404});expect(await withTenant(tenantId,client=>readInvoicePaymentLink(client,tenantId,invoice.id))).toBeNull();
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();}
});

import {queueProviderSnapshot,reconcileTenantCheckouts} from '../src/lib/payment-events';
it('reconciles refund callbacks into monotone refund history without erasing original receipts',async()=>{
 for(const [key,value] of Object.entries({MAKECOMMERCE_MODE:'live',MAKECOMMERCE_SHOP_ID:randomUUID(),MAKECOMMERCE_SECRET_KEY:'fake-local-only-never-sent',MAKECOMMERCE_PUBLISHABLE_KEY:'fake-public-key',MAKECOMMERCE_BASE_URL:'https://billing.example.invalid'}))vi.stubEnv(key,value);
 try{
  const invoice=(await readInvoices(owner,tenantId)).invoices.find(row=>row.kind==='invoice'&&row.status==='issued'&&row.paidAmount===0)!,remote=randomUUID(),c=makeCommerceConfig();
  await db.query("UPDATE payment_attempts SET state='cancelled' WHERE tenant_id=$1 AND invoice_id=$2",[tenantId,invoice.id]);
  vi.stubGlobal('fetch',vi.fn().mockImplementation(async(_url,options)=>{const b=JSON.parse(options.body);return Response.json({id:remote,status:'CREATED',amount:b.transaction.amount,currency:'EUR',reference:b.transaction.reference,merchant_data:b.transaction.merchant_data,payment_methods:{other:[{name:'redirect',url:c.paymentOrigin+'/pay.html?trx='+remote}]}},{status:201});}));
  const attempt=await beginInvoiceCheckout(owner,{tenantId,invoiceId:invoice.id,invoiceVersion:invoice.version,requestKey:randomUUID(),method:'link'},{ip:'192.0.2.1',locale:'et'});
  const now=new Date().toISOString(),snapshot={id:remote,status:'PART_REFUNDED' as const,amount:3500,currency:'EUR' as const,reference:invoice.number!,merchantData:attempt.id,redirectUrl:null,completedAt:now,refundedAt:now,refundedAmount:1000};
  const message={message_type:'payment_return',message_time:now,shop:c.shopId,transaction:remote,status:'PART_REFUNDED',amount:'35.00',currency:'EUR',reference:invoice.number,merchant_data:attempt.id,refundTotal:3500};
  const json=JSON.stringify(message);await receivePaymentEvent(tenantId,attempt.id,json,createHash('sha512').update(json).update(c.secret).digest('hex'));await processTenantPaymentEvents(tenantId);
  expect((await readInvoice(owner,tenantId,invoice.id)).paidAmount).toBe(0);
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({id:remote,status:'PART_REFUNDED',amount:'35.00',currency:'EUR',reference:invoice.number,merchant_data:attempt.id,completed_at:now,refunded_at:now,refunded_original_amount:'10.00'})));
  await db.query('UPDATE payment_attempts SET checked_at=NULL WHERE tenant_id=$1 AND id=$2',[tenantId,attempt.id]);await reconcileTenantCheckouts(tenantId);await processTenantPaymentEvents(tenantId);
  expect((await readInvoice(owner,tenantId,invoice.id)).paidAmount).toBe(2500);
  await queueProviderSnapshot(tenantId,attempt.id,{...snapshot,status:'REFUNDED',refundedAmount:3500},c);await processTenantPaymentEvents(tenantId);
  await queueProviderSnapshot(tenantId,attempt.id,snapshot,c);await queueProviderSnapshot(tenantId,attempt.id,{...snapshot,status:'COMPLETED',refundedAmount:null,refundedAt:null},c);await processTenantPaymentEvents(tenantId);
  expect((await readInvoice(owner,tenantId,invoice.id)).paidAmount).toBe(0);
  expect((await db.query('SELECT amount,total_refunded FROM payment_refunds WHERE tenant_id=$1 AND provider_attempt_id=$2 ORDER BY total_refunded',[tenantId,attempt.id])).rows).toEqual([{amount:1000,total_refunded:1000},{amount:2500,total_refunded:3500}]);
  expect((await db.query('SELECT amount FROM payment_records WHERE tenant_id=$1 AND provider_attempt_id=$2',[tenantId,attempt.id])).rows).toEqual([{amount:3500}]);
  expect((await db.query('SELECT provider_status FROM payment_attempts WHERE id=$1',[attempt.id])).rows[0].provider_status).toBe('REFUNDED');
  expect((await db.query('SELECT count(*)::int n FROM payment_provider_events WHERE tenant_id=$1 AND attempt_id=$2 AND processed_at IS NULL',[tenantId,attempt.id])).rows[0].n).toBe(0);
  await expect(queueProviderSnapshot(tenantId,attempt.id,{...snapshot,refundedAmount:null},c)).rejects.toMatchObject({code:'PAYMENT_REFUND_DETAILS_MISSING'});
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();}
});


it('automatically invoices unpaid months once, preserves the anchor, and stops before an agreed end',async()=>{
 const start=DateTime.now().setZone('Europe/Tallinn').startOf('month').minus({months:2}).toISODate()!;
 const first=monthlyPeriod(start);
 await db.query("INSERT INTO subscriptions(tenant_id,plan_id,plan_version,status,period_start,period_end,anchor_day,billing_contact_name,billing_email,billing_recipient) VALUES($1,$2,1,'limited',$3,$4,1,$5,$6,$7)",[otherId,'e3a9a986-fc1f-4d22-b548-99e18f6a7929',start,first.end,recipient.name,recipient.email,JSON.stringify(recipient)]);
 expect(await runTenantBilling(otherId)).toEqual({issued:false});
 await db.query("UPDATE tenants SET demo=false,booking_stops_at=$2,service_ends_at=$2,data_access_until=$2,deletion_not_before=$2,exit_agreement='Confirmed test agreement',exit_approved_by=$3,exit_approved_at=now() WHERE id=$1",[otherId,DateTime.fromISO(start,{zone:'Europe/Tallinn'}).plus({days:10}).toISO(),admin.id]);
 expect(await runTenantBilling(otherId)).toEqual({issued:false});
 expect((await db.query('SELECT count(*)::int n FROM invoices WHERE tenant_id=$1',[otherId])).rows[0].n).toBe(0);
 await db.query('UPDATE tenants SET booking_stops_at=NULL,service_ends_at=NULL,data_access_until=NULL,deletion_not_before=NULL,exit_agreement=NULL,exit_approved_by=NULL,exit_approved_at=NULL WHERE id=$1',[otherId]);
 const concurrent=await Promise.all([runTenantBilling(otherId),runTenantBilling(otherId)]);
 expect(concurrent.filter(r=>r.issued)).toHaveLength(2);
 expect(await runTenantBilling(otherId)).toEqual({issued:true});
 expect(await runTenantBilling(otherId)).toEqual({issued:false});
 const rows=(await db.query("SELECT period_start::text,total FROM invoices WHERE tenant_id=$1 ORDER BY period_start",[otherId])).rows;
 expect(rows).toHaveLength(3);expect(rows.every(r=>r.total===3500)).toBe(true);
 expect(new Set(rows.map(r=>r.period_start)).size).toBe(3);
 const end=monthlyPeriod(monthlyPeriod(first.end).end).end;
 await db.query('UPDATE subscriptions SET ends_at=$2 WHERE tenant_id=$1',[otherId,DateTime.fromISO(end,{zone:'Europe/Tallinn'}).toISO()]);
 expect(await runTenantBilling(otherId)).toEqual({issued:false});
});

it('queues invoice mail atomically, isolates tenants, retries failures and sends each invoice once',async()=>{
 const queued=(await db.query('SELECT invoice_id FROM invoice_mail_outbox WHERE tenant_id=$1',[otherId])).rows;
 expect(queued).toHaveLength(3);
 expect(await withTenant(tenantId,async client=>(await client.query('SELECT id FROM invoice_mail_outbox WHERE tenant_id=$1',[otherId])).rowCount)).toBe(0);
 const sent:import('../src/lib/notification-mail').NotificationMail[]=[];
 const send=async(mail:import('../src/lib/notification-mail').NotificationMail)=>{sent.push(mail);return 'capture' as const;};
 try{
  vi.stubEnv('BILLING_MAIL_MODE','disabled');expect(await deliverInvoiceMail(otherId,send)).toBe('disabled');expect(sent).toHaveLength(0);
  vi.stubEnv('BILLING_MAIL_MODE','capture');
  expect(await deliverInvoiceMail(otherId,async()=>{throw new Error('private provider detail');})).toBe('failed');
  const failed=(await db.query("SELECT * FROM invoice_mail_outbox WHERE tenant_id=$1 AND status='failed'",[otherId])).rows[0];
  expect(failed.attempts).toBe(1);expect(failed.last_error_code).toBe('DELIVERY_FAILED');expect(failed.next_attempt_at.getTime()).toBeGreaterThan(Date.now());
  const retry={tenantId:otherId,invoiceId:failed.invoice_id,requestKey:randomUUID()};
  await expect(retryInvoiceMail(owner,retry)).rejects.toMatchObject({status:403});
  const retried=await retryInvoiceMail(admin,retry);expect(retried.mail?.status).toBe('pending');expect(retried.mail?.attempts).toBe(0);
  expect(await retryInvoiceMail(admin,retry)).toEqual(retried);
  expect(await Promise.all([deliverInvoiceMail(otherId,send),deliverInvoiceMail(otherId,send)])).toEqual(['capture','capture']);
  expect(await deliverInvoiceMail(otherId,send)).toBe('capture');expect(await deliverInvoiceMail(otherId,send)).toBe('idle');
  expect(new Set(sent.map(mail=>mail.messageId)).size).toBe(3);
  await expect(retryInvoiceMail(admin,{...retry,requestKey:randomUUID()})).rejects.toMatchObject({code:'INVOICE_MAIL_NOT_RETRYABLE'});
  expect(sent.every(mail=>mail.to===recipient.email&&mail.text.includes('/pay#'+otherId+'.'))).toBe(true);
  const inv=(await db.query("SELECT id FROM invoices WHERE tenant_id=$1 AND kind='invoice' LIMIT 1",[otherId])).rows[0];
  await db.query("UPDATE invoice_mail_outbox SET status='pending' WHERE tenant_id=$1 AND invoice_id=$2",[otherId,inv.id]);
  await creditInvoice(admin,{tenantId:otherId,requestKey:randomUUID(),invoiceId:inv.id,version:1,reason:'Invoice mail cancellation test',confirmed:true});
  expect(await deliverInvoiceMail(otherId,send)).toBe('skipped');
  expect(await deliverInvoiceMail(otherId,send)).toBe('capture');expect(sent.at(-1)!.subject).toContain('kreeditarve');expect(sent.at(-1)!.text).not.toContain('/pay#');
 }finally{vi.unstubAllEnvs();}
});

it('queues one overdue reminder and suppresses it when the invoice is paid before delivery',async()=>{
 const p=await previewInvoice(admin,otherId),now=DateTime.now().setZone('Europe/Tallinn');
 const period=monthlyPeriod(now.minus({months:5}).startOf('month').toISODate()!);
 const created=await withTenant(otherId,async client=>{
  await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[otherId]);
  return insertInvoiceInClient(client,otherId,randomUUID(),{...p,periodStart:period.start,periodEnd:period.end,issuedOn:now.minus({days:8}).toISODate()!,dueDate:now.minus({days:1}).toISODate()!});
 });
 await db.query("UPDATE invoice_mail_outbox SET status='capture' WHERE tenant_id=$1 AND invoice_id=$2",[otherId,created.id]);
 expect((await Promise.all([queueInvoiceReminders(otherId),queueInvoiceReminders(otherId)])).reduce((a,b)=>a+b,0)).toBe(1);
 const invoice=await readInvoice(admin,otherId,created.id,true);expect(invoice.reminder?.status).toBe('pending');
 await recordPayment(admin,{tenantId:otherId,requestKey:randomUUID(),invoiceId:created.id,invoiceVersion:invoice.version,amount:3500,receivedOn:now.toISODate(),bankEntryId:randomUUID(),reference:'Reminder payment test',allowOverpayment:false,confirmed:true});
 try{
  vi.stubEnv('BILLING_MAIL_MODE','capture');const send=vi.fn().mockResolvedValue('capture');
  expect(await deliverInvoiceMail(otherId,send)).toBe('skipped');expect(send).not.toHaveBeenCalled();
  expect(await queueInvoiceReminders(otherId)).toBe(0);
 }finally{vi.unstubAllEnvs();}
});

it('replaces a credited historical month without moving the subscription cursor or copying receipts',async()=>{
 const originalId=(await db.query("SELECT id FROM invoices WHERE tenant_id=$1 AND kind='invoice' AND status='issued' ORDER BY period_start LIMIT 1",[otherId])).rows[0].id;
 const original=await readInvoice(admin,otherId,originalId,true);
 expect(original.paidAmount).toBe(3500);
 await expect(previewInvoice(admin,otherId,originalId)).rejects.toMatchObject({code:'INVOICE_NOT_REPLACEABLE'});
 await expect(previewInvoice(admin,tenantId,originalId)).rejects.toMatchObject({code:'INVOICE_NOT_FOUND'});
 await creditInvoice(admin,{tenantId:otherId,requestKey:randomUUID(),invoiceId:originalId,version:original.version,reason:'Correct historical billing recipient',confirmed:true});
 const before=(await db.query('SELECT period_start::text,period_end::text,version FROM subscriptions WHERE tenant_id=$1',[otherId])).rows[0];
 await saveBillingRecipient(admin,{tenantId:otherId,requestKey:randomUUID(),version:before.version,recipient:{...recipient,name:'Corrected historical buyer'}},true);
 const p=await previewInvoice(admin,otherId,originalId);
 expect(p.periodStart).toBe(original.periodStart);expect(p.periodEnd).toBe(original.periodEnd);expect(p.total).toBe(original.total);expect(p.recipient.name).toBe('Corrected historical buyer');
 expect(p.replacementInvoiceId).toBe(originalId);expect(p.periodStart<before.period_start).toBe(true);
 const command={tenantId:otherId,requestKey:randomUUID(),fingerprint:p.fingerprint,replacementInvoiceId:originalId,confirmed:true};
 const [a,b]=await Promise.all([issueInvoice(admin,command),issueInvoice(admin,command)]);expect(a.id).toBe(b.id);
 expect(a.replacedInvoiceId).toBe(originalId);expect(a.replacedNumber).toBe(original.number);expect(a.paidAmount).toBe(0);
 expect((await readInvoice(admin,otherId,originalId,true)).paidAmount).toBe(3500);
 expect(invoiceDocument(a,'en')).toContain('Replaced invoice');expect(invoiceDocument(a,'en')).toContain(original.number!);
 const after=(await db.query('SELECT period_start::text,period_end::text FROM subscriptions WHERE tenant_id=$1',[otherId])).rows[0];expect(after).toEqual({period_start:before.period_start,period_end:before.period_end});
 await expect(issueInvoice(admin,{...command,requestKey:randomUUID()})).rejects.toMatchObject({code:'INVOICE_EXISTS'});
 await expect(withTenant(otherId,client=>insertInvoiceInClient(client,otherId,randomUUID(),{...p,total:p.total+1,subtotal:p.subtotal+1}))).rejects.toMatchObject({code:'23514'});
});
