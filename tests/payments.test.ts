import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import pg from 'pg';
import {DateTime} from 'luxon';
import {recordPayment,reversePayment,readPayments} from '../src/lib/payments';
import {billingAccess} from '../src/lib/billing-access';
import {STANDARD_PLAN,monthlyPeriod} from '../src/lib/billing-rules';
import {readInvoice} from '../src/lib/invoices';
import {withTenant} from '../src/lib/db';
import {tenantForHost,type Tenant} from '../src/lib/tenants';
import {availableOffers} from '../src/lib/availability';
import {createBooking} from '../src/lib/bookings';
import {changeAdminBooking,publicBookingState,changePublicBooking} from '../src/lib/booking-management';
import {requestExport} from '../src/lib/export-management';
import {uploadImport,previewImport} from '../src/lib/import-management';
import {commitImport} from '../src/lib/import-commit';
import {importLifecycle} from '../src/lib/import-lifecycle';
import type {Actor} from '../src/lib/access';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
const admin:Actor={id:randomUUID(),name:'Payments platform',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:true};
const owner:Actor={...admin,id:randomUUID(),email:randomUUID()+'@example.invalid',isPlatformAdmin:false};
const staff:Actor={...owner,id:randomUUID(),email:randomUUID()+'@example.invalid'};
const today=DateTime.now().setZone('Europe/Tallinn').toISODate()!,start=DateTime.fromISO(today).minus({days:10}).toISODate()!,period=monthlyPeriod(start);
let tenant:Tenant,subscriptionId:string,invoiceId:string,storage:string;
beforeAll(async()=>{await db.connect();for(const user of [admin,owner,staff])await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin) VALUES($1,$2,$3,true,true,$4)',[user.id,user.name,user.email,user.isPlatformAdmin]);});
afterAll(async()=>{await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[admin.id,owner.id,staff.id]]);await db.end();});
beforeEach(async()=>{
 const id=randomUUID();tenant=(await db.query("INSERT INTO tenants(id,slug,name,address,demo,management_link_hours,contact_email) VALUES($1,$2,'Payment test','Test',false,24,'salon@example.invalid') RETURNING *",[id,'pay-'+id])).rows[0];
 await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'receptionist')",[id,owner.id,staff.id]);
 subscriptionId=(await db.query('INSERT INTO subscriptions(tenant_id,plan_id,plan_version,period_start,period_end) VALUES($1,$2,1,$3,$4) RETURNING id',[id,STANDARD_PLAN.id,start,period.end])).rows[0].id;
 storage=await mkdtemp(path.join(tmpdir(),'booking-payment-test-'));vi.stubEnv('PRIVATE_STORAGE_DIR',storage);
});
afterEach(async()=>{
 for(const table of ['billing_commands','payment_records','invoices','subscriptions','import_rows','import_batches','export_jobs','media','booking_commands','booking_requests','outbox','booking_management_tokens','booking_events','bookings','memberships','access_audit_log','weekly_hours','staff_services','staff','services','tenant_domains'])await db.query('DELETE FROM '+table+' WHERE tenant_id=$1',[tenant.id]);
 await db.query('DELETE FROM tenants WHERE id=$1',[tenant.id]);vi.unstubAllEnvs();
 if(path.dirname(storage)!==tmpdir()||!path.basename(storage).startsWith('booking-payment-test-'))throw Error('Unsafe cleanup');await rm(storage,{recursive:true,force:true});
});
async function invoice(periodStart=start,periodEnd=period.end,due=DateTime.fromISO(today).minus({days:1}).toISODate()!){
 return (await db.query(`INSERT INTO invoices(tenant_id,subscription_id,request_key,number,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total,status,issued_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,'{}','{}','[{"description":"Test subscription"}]',3500,0,3500,'issued',now()) RETURNING id`,[tenant.id,subscriptionId,randomUUID(),'PAYTEST-'+randomUUID(),periodStart,periodEnd,due])).rows[0].id as string;
}
async function payment(id=invoiceId,amount=3500){const current=await readInvoice(admin,tenant.id,id,true);return {tenantId:tenant.id,invoiceId:id,invoiceVersion:current.version,requestKey:randomUUID(),amount,receivedOn:today,bankEntryId:randomUUID(),reference:'Test bank entry',confirmed:true,allowOverpayment:false};}
const access=(time?:DateTime)=>withTenant(tenant.id,c=>billingAccess(c,tenant,time));
it('honors the due day until local midnight, without trusting a cached paid status',async()=>{
 invoiceId=await invoice(start,period.end,today);
 expect(await access(DateTime.fromISO(today+'T23:59:59.999',{zone:tenant.timezone}))).toMatchObject({allowed:true,reason:'payment_due',paidThrough:null});
 const next=DateTime.fromISO(today,{zone:tenant.timezone}).plus({days:1});
 await db.query("UPDATE subscriptions SET status='active',paid_through=current_date+100 WHERE tenant_id=$1",[tenant.id]);
 expect(await access(next)).toMatchObject({allowed:false,status:'limited',reason:'overdue',paidThrough:null});
});
it('records partial payments once, rejects duplicate bank entries, and reaches paid-through only on settlement',async()=>{
 invoiceId=await invoice();const d=await payment(invoiceId,1500);
 await expect(recordPayment(owner,d)).rejects.toMatchObject({status:403});
 const [a,b]=await Promise.all([recordPayment(admin,d),recordPayment(admin,d)]);expect(a).toEqual(b);expect(a.invoice.paidAmount).toBe(1500);expect(a.access).toMatchObject({allowed:false,paidThrough:null});
 await expect(recordPayment(admin,{...await payment(invoiceId,1500),bankEntryId:d.bankEntryId})).rejects.toMatchObject({code:'PAYMENT_ALREADY_RECORDED'});
 await expect(recordPayment(admin,{...d,requestKey:randomUUID()})).rejects.toMatchObject({code:'VERSION_CONFLICT'});
 await expect(recordPayment(admin,{...d,amount:100})).rejects.toMatchObject({code:'IDEMPOTENCY_MISMATCH'});
 const paid=await recordPayment(admin,await payment(invoiceId,2000));expect(paid.access).toMatchObject({allowed:true,paidThrough:period.end,reason:'paid'});expect(paid.invoice.paidAmount).toBe(3500);
 expect((await readPayments(owner,tenant.id,invoiceId)).payments).toHaveLength(2);
 await expect(readPayments(staff,tenant.id,invoiceId)).rejects.toMatchObject({status:403});
 expect(await recordPayment(admin,d)).toEqual(a);
});
it('reverses a mistaken record without deleting history and can reuse its bank entry for the correction',async()=>{
 invoiceId=await invoice();const d=await payment();const paid=await recordPayment(admin,d);
 const reversal={tenantId:tenant.id,requestKey:randomUUID(),paymentId:paid.paymentId,version:1,reason:'Amount entered against the wrong invoice',confirmed:true};
 const [a,b]=await Promise.all([reversePayment(admin,reversal),reversePayment(admin,reversal)]);expect(a).toEqual(b);expect(a.invoice.paidAmount).toBe(0);expect(a.access).toMatchObject({allowed:false,paidThrough:null});
 const old=(await readPayments(owner,tenant.id,invoiceId)).payments[0];expect(old).toMatchObject({amount:3500,bankEntryId:d.bankEntryId,reversalReason:reversal.reason,recordedBy:admin.id,reversedBy:admin.id,version:2});expect(old.reversedAt).not.toBeNull();
 await expect(db.query('UPDATE payment_records SET amount=1 WHERE tenant_id=$1 AND id=$2',[tenant.id,paid.paymentId])).rejects.toMatchObject({code:'23514'});
 const corrected=await recordPayment(admin,{...await payment(invoiceId,3500),bankEntryId:d.bankEntryId});expect(corrected.access.allowed).toBe(true);
 await db.query('UPDATE auth_user SET is_platform_admin=false WHERE id=$1',[admin.id]);await expect(reversePayment(admin,reversal)).rejects.toMatchObject({status:403});await db.query('UPDATE auth_user SET is_platform_admin=true WHERE id=$1',[admin.id]);
});
it('requires explicit overpayment confirmation and rejects future bank dates',async()=>{
 invoiceId=await invoice();const d=await payment(invoiceId,3600);
 await expect(recordPayment(admin,d)).rejects.toMatchObject({code:'OVERPAYMENT_CONFIRMATION_REQUIRED'});
 await expect(recordPayment(admin,{...d,allowOverpayment:true,receivedOn:DateTime.fromISO(today).plus({days:1}).toISODate()})).rejects.toMatchObject({code:'PAYMENT_IN_FUTURE'});
 const result=await recordPayment(admin,{...d,allowOverpayment:true});expect(result.invoice.paidAmount).toBe(3600);expect(result.access.paidThrough).toBe(period.end);
});
it('does not jump a paid period past older debt and retracts coverage after reversal',async()=>{
 const first=await invoice(),next=monthlyPeriod(period.end,period.anchorDay),second=await invoice(next.start,next.end,next.start);
 await recordPayment(admin,await payment(second));expect(await access()).toMatchObject({allowed:false,paidThrough:null});
 const paid=await recordPayment(admin,await payment(first));expect(paid.access).toMatchObject({allowed:true,paidThrough:next.end});
 await reversePayment(admin,{tenantId:tenant.id,requestKey:randomUUID(),paymentId:paid.paymentId,version:1,reason:'Bank statement correction test',confirmed:true});expect(await access()).toMatchObject({allowed:false,paidThrough:null});
});
it('does not treat a missing earlier invoice as a paid or covered period',async()=>{
 invoiceId=await invoice(today,monthlyPeriod(today).end,today);await recordPayment(admin,await payment());
 expect(await access()).toMatchObject({allowed:false,paidThrough:null,reason:'uncovered'});
});
it('blocks new public, manual and imported bookings while preserving existing booking management and export',async()=>{
 invoiceId=await invoice();const serviceId=randomUUID(),staffId=randomUUID();
 await db.query('INSERT INTO tenant_domains(hostname,tenant_id,ready) VALUES($1,$2,true)',[tenant.slug+'.localhost',tenant.id]);
 await db.query("INSERT INTO services(id,tenant_id,name,category,default_price,default_duration) VALUES($1,$2,'Service','Test',2500,30)",[serviceId,tenant.id]);
 await db.query("INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,'Staff')",[staffId,tenant.id]);await db.query('INSERT INTO staff_services(tenant_id,staff_id,service_id) VALUES($1,$2,$3)',[tenant.id,staffId,serviceId]);
 for(const id of [null,staffId])await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,n,540,1080 FROM generate_series(1,7) n',[tenant.id,id]);
 await db.query('UPDATE tenants SET demo=true WHERE id=$1',[tenant.id]);tenant.demo=true;
 const day=DateTime.fromISO(today).plus({days:7}).toISODate()!,offers=await availableOffers(tenant,serviceId,day,staffId),o=offers[0],next=offers[2];
 const input={serviceId,staffId,start:o.start,expectedPrice:o.price,expectedDuration:o.duration,expectedRulesVersion:1,name:'Existing customer',email:'existing@example.invalid'};
 const existing=await createBooking(tenant,input,randomUUID());const token=existing.managementUrl!.split('#')[1];
 await db.query('UPDATE tenants SET demo=false WHERE id=$1',[tenant.id]);tenant.demo=false;
 await expect(availableOffers(tenant,serviceId,day,staffId)).rejects.toMatchObject({code:'BILLING_RESTRICTED'});
 await expect(createBooking(tenant,{...input,start:next.start},randomUUID())).rejects.toMatchObject({code:'BILLING_RESTRICTED'});
 await expect(changeAdminBooking(owner,{action:'manual-create',tenantId:tenant.id,...input,start:next.start},randomUUID())).rejects.toMatchObject({code:'BILLING_RESTRICTED'});
 await expect(tenantForHost(tenant.slug+'.localhost')).rejects.toMatchObject({code:'TENANT_NOT_FOUND'});expect((await tenantForHost(tenant.slug+'.localhost','existing')).public_state).toBe('paused');
 expect((await publicBookingState(tenant.id,token)).booking.id).toBe(existing.id);
 await changePublicBooking(tenant.id,token,{action:'reschedule',version:1,serviceId,staffId,start:next.start,expectedPrice:next.price,expectedDuration:next.duration,expectedRulesVersion:1},randomUUID());
 expect((await requestExport(owner,{tenantId:tenant.id,requestKey:randomUUID()})).id).toBeTruthy();
 const csv=`serviceId,staffId,name,email,startAt,priceCents,duration\n${serviceId},${staffId},Imported customer,import@example.invalid,${offers[5].start},2500,30`;
 const batch=await uploadImport(owner,{tenantId:tenant.id,requestKey:randomUUID(),kind:'bookings',delimiter:','},csv);
 await previewImport(owner,{tenantId:tenant.id,id:batch.id,version:1,mapping:Object.fromEntries(csv.split('\n')[0].split(',').map((h,i)=>[h,i])),timezone:tenant.timezone,cutoverAt:DateTime.now().toISO()});
 await expect(commitImport(owner,{tenantId:tenant.id,id:batch.id,version:2,skipInvalid:false,skipDuplicates:false})).rejects.toMatchObject({code:'BILLING_RESTRICTED'});
 await importLifecycle(owner,{tenantId:tenant.id,id:batch.id,version:2,action:'cancel'});
 expect((await db.query('SELECT count(*)::int n FROM bookings WHERE tenant_id=$1',[tenant.id])).rows[0].n).toBe(1);
 await recordPayment(admin,await payment());expect((await availableOffers(tenant,serviceId,day,staffId)).length).toBeGreaterThan(0);
});
