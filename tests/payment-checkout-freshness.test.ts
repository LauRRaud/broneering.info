import {beforeAll,afterAll,afterEach,it,expect,vi} from 'vitest';
import pg from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {DateTime} from 'luxon';
import type {Actor} from '../src/lib/access';
import {createSubscription} from '../src/lib/subscriptions';
import {billingIssuerState,saveBillingIssuer} from '../src/lib/billing-config';
import {saveBillingRecipient,previewInvoice,issueInvoice,readInvoice} from '../src/lib/invoices';
import {beginInvoiceCheckout,beginPublicInvoiceCheckout,readCheckouts,readPublicInvoicePayment} from '../src/lib/payment-checkout';
import {recordPayment} from '../src/lib/payments';
import {creditInvoice} from '../src/lib/invoice-corrections';
import {readInvoicePaymentLink} from '../src/lib/invoice-links';
import {withTenant} from '../src/lib/db';
import {receivePaymentEvent,processTenantPaymentEvents,reconcileTenantCheckouts} from '../src/lib/payment-events';

const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
const actor=(platform=false):Actor=>({id:randomUUID(),name:'Checkout test',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:platform});
const admin=actor(true),owner=actor(),tenants:string[]=[],today=DateTime.now().setZone('Europe/Tallinn').toISODate()!;
beforeAll(async()=>{
 await db.connect();
 for(const u of [admin,owner])await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin) VALUES($1,$2,$3,true,true,$4)',[u.id,u.name,u.email,u.isPlatformAdmin]);
 await saveBillingIssuer(admin,{requestKey:randomUUID(),expectedVersion:(await billingIssuerState(admin)).issuer?.version??0,settings:{issuer:{name:'Test issuer',registrationCode:'TEST123',address:'Test street',country:'EE',vatNumber:'',email:'issuer@example.invalid'},iban:'GB82WEST12345698765432',numberPrefix:'FRESH',vatRegistered:false,taxRateBasisPoints:0,taxNote:'Synthetic test'},approvalNote:'Synthetic checkout regression test',confirmed:true});
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
afterAll(async()=>{
 for(const table of ['payment_provider_events','payment_records','billing_commands','payment_mandates','payment_attempts','invoice_payment_links','invoices','subscriptions','memberships','access_audit_log'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[tenants]);
 await db.query('DELETE FROM access_audit_log WHERE actor_user_id=ANY($1::text[])',[[admin.id,owner.id]]);
 await db.query('DELETE FROM billing_issuer_versions WHERE approved_by=$1',[admin.id]);
 await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[tenants]);
 await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[admin.id,owner.id]]);await db.end();
});
async function fixture(){
 const tenantId=randomUUID();tenants.push(tenantId);
 await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Checkout test','Test')",[tenantId,'fresh-'+tenantId]);
 await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner')",[tenantId,owner.id]);
 await createSubscription(admin,{tenantId,requestKey:randomUUID(),start:today,billingName:'Test buyer',billingEmail:'buyer@example.invalid',confirmed:true});
 await saveBillingRecipient(owner,{tenantId,requestKey:randomUUID(),version:1,recipient:{name:'Test buyer',registrationCode:'BUYER123',address:'Test street',country:'EE',vatNumber:'',email:'buyer@example.invalid'}});
 const invoice=await issueInvoice(admin,{tenantId,requestKey:randomUUID(),fingerprint:(await previewInvoice(admin,tenantId)).fingerprint,confirmed:true});
 for(const [k,v] of Object.entries({MAKECOMMERCE_MODE:'test',MAKECOMMERCE_SHOP_ID:randomUUID(),MAKECOMMERCE_SECRET_KEY:'test-only-secret',MAKECOMMERCE_PUBLISHABLE_KEY:'test-only-public',MAKECOMMERCE_BASE_URL:'https://billing.example.invalid'}))vi.stubEnv(k,v);
 const request={tenantId,invoiceId:invoice.id,invoiceVersion:invoice.version,requestKey:randomUUID(),method:'link'},context={ip:'192.0.2.1',locale:'et' as const};
 const partial=()=>recordPayment(admin,{tenantId,requestKey:randomUUID(),invoiceId:invoice.id,invoiceVersion:invoice.version,amount:1000,receivedOn:today,bankEntryId:randomUUID(),reference:'Test partial receipt',allowOverpayment:false,confirmed:true});
 return {tenantId,invoice,request,context,partial};
}
function providerReply(options:RequestInit){const body=JSON.parse(String(options.body)),id=randomUUID();return {id,status:'CREATED',amount:body.transaction.amount,currency:'EUR',reference:body.transaction.reference,merchant_data:body.transaction.merchant_data,payment_methods:{other:[{name:'redirect',url:'https://payment.test.maksekeskus.ee/pay.html?trx='+id}]}};}
it('withholds stale checkout capabilities on all replay/read paths without losing provider receipts',async()=>{
 const f=await fixture();vi.stubEnv('MAKECOMMERCE_MODE','live');
 // Exercise live receipt semantics with a fully stubbed transport and synthetic keys.
 const fetcher=vi.fn(async(_url:unknown,options:RequestInit)=>Response.json(JSON.parse(JSON.stringify(providerReply(options)).replaceAll('payment.test.maksekeskus.ee','payment.maksekeskus.ee')),{status:201}));vi.stubGlobal('fetch',fetcher);
 const first=await beginInvoiceCheckout(owner,f.request,f.context);expect(first).toMatchObject({state:'ready',amount:3500});expect(first.redirectUrl).toBeTruthy();
 expect(await beginInvoiceCheckout(owner,f.request,f.context)).toEqual(first);
 const link=await withTenant(f.tenantId,c=>readInvoicePaymentLink(c,f.tenantId,f.invoice.id)),token=link!.split('#')[1].split('.')[1];
 const paid=await f.partial(),blocked={id:first.id,state:'review',redirectUrl:null,errorCode:'INVOICE_CHANGED'};
 expect(await beginInvoiceCheckout(owner,f.request,f.context)).toMatchObject(blocked);
 expect(await beginInvoiceCheckout(owner,{...f.request,requestKey:randomUUID(),invoiceVersion:paid.invoice.version},f.context)).toMatchObject(blocked);
 expect((await readCheckouts(owner,f.tenantId,f.invoice.id)).attempts[0]).toMatchObject(blocked);
 expect((await readCheckouts(admin,f.tenantId,f.invoice.id,true)).attempts[0]).toMatchObject(blocked);
 expect((await readPublicInvoicePayment({tenantId:f.tenantId,token})).attempt).toMatchObject(blocked);
 expect(await beginPublicInvoiceCheckout({tenantId:f.tenantId,token,requestKey:randomUUID(),invoiceVersion:paid.invoice.version},f.context)).toMatchObject(blocked);
 await creditInvoice(admin,{tenantId:f.tenantId,requestKey:randomUUID(),invoiceId:f.invoice.id,version:paid.invoice.version,reason:'Test credited invoice replay',confirmed:true});
 expect(await beginInvoiceCheckout(owner,f.request,f.context)).toMatchObject(blocked);expect(fetcher).toHaveBeenCalledTimes(1);
 // A previously delivered provider link can still settle: retain its identity and record real money once.
 const message=JSON.stringify({message_type:'payment_return',message_time:new Date().toISOString(),shop:process.env.MAKECOMMERCE_SHOP_ID,transaction:first.transactionId,status:'COMPLETED',amount:'35.00',currency:'EUR',reference:f.invoice.number,merchant_data:first.id});
 const mac=createHash('sha512').update(message).update(process.env.MAKECOMMERCE_SECRET_KEY!).digest('hex');
 await receivePaymentEvent(f.tenantId,first.id,message,mac);await processTenantPaymentEvents(f.tenantId);await processTenantPaymentEvents(f.tenantId);
 expect((await readInvoice(owner,f.tenantId,f.invoice.id)).paidAmount).toBe(4500);
 expect((await readCheckouts(owner,f.tenantId,f.invoice.id)).attempts[0].state).toBe('completed');
});
it.each(['link','enroll'])('rechecks the invoice after the %s provider call and keeps the stale attempt reconcilable',async(method)=>{
 const f=await fixture();let provider:ReturnType<typeof providerReply>;
 const fetcher=vi.fn(async(_url:unknown,options:RequestInit)=>{provider=providerReply(options);await f.partial();return Response.json(provider,{status:201});});vi.stubGlobal('fetch',fetcher);
 const request={...f.request,method,...(method==='enroll'?{consentVersion:'monthly-v1',confirmed:true}:{})};
 const result=await beginInvoiceCheckout(owner,request,f.context);
 expect(result).toMatchObject({state:'review',redirectUrl:null,errorCode:'INVOICE_CHANGED'});
 expect(result.transactionId).toBe(provider!.id);
 await db.query("UPDATE payment_attempts SET checked_at=now()-interval '1 minute' WHERE id=$1",[result.id]);
 fetcher.mockImplementation(async()=>Response.json({...provider!,status:'CANCELLED'}));
 await reconcileTenantCheckouts(f.tenantId);await processTenantPaymentEvents(f.tenantId);
 expect(fetcher).toHaveBeenCalledTimes(2);
 expect((await readCheckouts(owner,f.tenantId,f.invoice.id)).attempts[0].state).toBe('cancelled');
});
it.each([3500,4500])('withholds an existing checkout after a %i-cent receipt settles the invoice',async(amount)=>{
 const f=await fixture();const fetcher=vi.fn(async(_url:unknown,options:RequestInit)=>Response.json(providerReply(options),{status:201}));vi.stubGlobal('fetch',fetcher);
 const first=await beginInvoiceCheckout(owner,f.request,f.context);
 const paid=await recordPayment(admin,{tenantId:f.tenantId,requestKey:randomUUID(),invoiceId:f.invoice.id,invoiceVersion:f.invoice.version,amount,receivedOn:today,bankEntryId:randomUUID(),reference:'Test full receipt',allowOverpayment:amount>3500,confirmed:true});
 expect(await beginInvoiceCheckout(owner,f.request,f.context)).toMatchObject({id:first.id,state:'review',redirectUrl:null,errorCode:'INVOICE_CHANGED'});
 expect((await readCheckouts(owner,f.tenantId,f.invoice.id)).attempts[0].redirectUrl).toBeNull();
 await expect(beginInvoiceCheckout(owner,{...f.request,requestKey:randomUUID(),invoiceVersion:paid.invoice.version},f.context)).rejects.toMatchObject({code:'INVOICE_NOT_PAYABLE'});
 expect(fetcher).toHaveBeenCalledTimes(1);
});
