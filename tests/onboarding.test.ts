import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {DateTime} from 'luxon';
import {onboardingState,changeOnboarding} from '../src/lib/onboarding';
import {previewTenant} from '../src/lib/preview';
import {catalogFor,availableOffers} from '../src/lib/availability';
import {createBooking} from '../src/lib/bookings';
import {tenantForHost,type Tenant} from '../src/lib/tenants';
import {publicBookingState,changeAdminBooking} from '../src/lib/booking-management';
import type {Actor} from '../src/lib/access';
import {claimNotification,deliverNotification} from '../src/lib/notification-worker';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
let tenant:Tenant,owner:Actor,serviceId:string,staffId:string,planId:string;
const day=DateTime.now().setZone('Europe/Tallinn').plus({days:7}).toISODate()!;
beforeAll(()=>db.connect());afterAll(()=>db.end());
beforeEach(async()=>{
  const id=randomUUID();tenant=(await db.query("INSERT INTO tenants(id,slug,name,address,demo,public_state,contact_email,management_link_hours,booking_terms,reviewed_rules_version) VALUES($1,$2,'Setup salon','Test address',true,'draft','salon@example.invalid',24,'Booking terms for testing.',1) RETURNING *",[id,'setup-'+id])).rows[0];
  await db.query('INSERT INTO tenant_domains(hostname,tenant_id,ready) VALUES($1,$2,true)',[tenant.slug+'.localhost',id]);
  owner={id:randomUUID(),name:'Owner',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
  await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,$2,$3,true,true)',[owner.id,owner.name,owner.email]);
  await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner')",[id,owner.id]);
  serviceId=randomUUID();staffId=randomUUID();planId=randomUUID();
  await db.query("INSERT INTO services(id,tenant_id,name,category,default_price,default_duration) VALUES($1,$2,'Test service','Test',2500,30)",[serviceId,id]);
  await db.query("INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,'Test staff')",[staffId,id]);
  await db.query('INSERT INTO staff_services(tenant_id,service_id,staff_id) VALUES($1,$2,$3)',[id,serviceId,staffId]);
  for(const s of [null,staffId])await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,d,540,1080 FROM generate_series(1,7) d',[id,s]);
  await db.query("INSERT INTO plan_versions(id,version,code,name,monthly_price,staff_limit) VALUES($1,1,$2,'Test plan',1000,1)",[planId,'test-'+planId]);
});
afterEach(async()=>{
  vi.unstubAllEnvs();
  for(const table of ['booking_requests','outbox','bookings','subscriptions','memberships','access_audit_log','staff_services','weekly_hours','staff','services','tenant_domains'])await db.query('DELETE FROM '+table+' WHERE tenant_id=$1',[tenant.id]);
  await db.query('DELETE FROM tenants WHERE id=$1',[tenant.id]);await db.query('DELETE FROM plan_versions WHERE id=$1',[planId]);await db.query('DELETE FROM auth_user WHERE id=$1',[owner.id]);
});
async function trial(){await db.query("INSERT INTO subscriptions(tenant_id,plan_id,plan_version,status,period_start,period_end,trial_ends_at) VALUES($1,$2,1,'trial',current_date,current_date+30,now()+interval '30 days')",[tenant.id,planId]);}
async function makeTest(){const offer=(await availableOffers(tenant,serviceId,day,staffId,owner))[0];const input={serviceId,staffId,start:offer.start,expectedPrice:offer.price,expectedDuration:offer.duration,expectedRulesVersion:1,name:'Test customer',email:'test@example.invalid'};return {result:await createBooking(tenant,input,randomUUID(),owner),input};}
it('requires a working preview booking and real entitlement before publication',async()=>{
  let state=await onboardingState(owner,tenant.id);expect(state.canPublish).toBe(false);
  expect(state.checks.filter(c=>!c.ready).map(c=>c.key)).toEqual(['test','subscription']);
  await expect(changeOnboarding(owner,{action:'publish',tenantId:tenant.id,version:1})).rejects.toMatchObject({code:'PUBLICATION_NOT_READY'});
  await expect(catalogFor(tenant)).rejects.toMatchObject({status:404});
  expect((await catalogFor(tenant,undefined,owner)).services).toHaveLength(1);
  const {result}=await makeTest();await trial();state=await onboardingState(owner,tenant.id);expect(state.canPublish).toBe(true);
  const published=await changeOnboarding(owner,{action:'publish',tenantId:tenant.id,version:1});expect(published).toMatchObject({state:'published',demo:false,version:2});
  expect((await db.query('SELECT status,is_test,version FROM bookings WHERE id=$1',[result.id])).rows[0]).toEqual({status:'cancelled',is_test:true,version:2});
  expect((await db.query('SELECT status FROM outbox WHERE booking_id=$1',[result.id])).rows.every(r=>r.status==='superseded')).toBe(true);
  expect((await tenantForHost(tenant.slug+'.localhost')).demo).toBe(false);
  await expect(publicBookingState(tenant.id,result.managementUrl!.split('#')[1])).rejects.toMatchObject({status:410});
  await expect(previewTenant(owner,tenant.id)).rejects.toMatchObject({code:'PREVIEW_CLOSED'});
});
it('keeps existing bookings and their management links while blocking new bookings on pause',async()=>{
  const {input}=await makeTest();await trial();await changeOnboarding(owner,{action:'publish',tenantId:tenant.id,version:1});
  const live=await tenantForHost(tenant.slug+'.localhost');const booking=await createBooking(live,input,randomUUID());
  await changeOnboarding(owner,{action:'pause',tenantId:tenant.id,version:2,reason:'Temporary operational pause'});
  await expect(tenantForHost(tenant.slug+'.localhost')).rejects.toMatchObject({status:404});
  expect((await tenantForHost(tenant.slug+'.localhost','existing')).public_state).toBe('paused');
  expect((await publicBookingState(tenant.id,booking.managementUrl!.split('#')[1])).booking.status).toBe('confirmed');
  await expect(createBooking(live,input,randomUUID())).rejects.toMatchObject({status:404});
  await expect(changeAdminBooking(owner,{action:'manual-create',tenantId:tenant.id,...input,start:DateTime.fromISO(input.start).plus({hours:1}).toISO(),sendEmail:false},randomUUID())).rejects.toMatchObject({code:'BOOKINGS_PAUSED'});
  expect((await db.query('SELECT status,is_test FROM bookings WHERE id=$1',[booking.id])).rows[0]).toEqual({status:'confirmed',is_test:false});
});
it('rechecks owner privileges and versions, and invalidates a reviewed rules version',async()=>{
  await db.query("UPDATE memberships SET role='receptionist' WHERE tenant_id=$1",[tenant.id]);
  await expect(previewTenant(owner,tenant.id)).rejects.toMatchObject({status:403});await expect(onboardingState(owner,tenant.id)).rejects.toMatchObject({status:403});
  await db.query("UPDATE memberships SET role='owner' WHERE tenant_id=$1",[tenant.id]);
  const saved=await changeOnboarding(owner,{action:'profile',tenantId:tenant.id,version:1,rulesVersion:1,name:'Renamed',address:'Address',description:'Details',terms:'Updated booking terms',reviewed:true});
  expect(saved).toMatchObject({version:2,rulesVersion:2,rulesReviewed:true});
  await expect(changeOnboarding(owner,{action:'publish',tenantId:tenant.id,version:1})).rejects.toMatchObject({code:'VERSION_CONFLICT'});
  await db.query('UPDATE tenants SET rules_version=rules_version+1 WHERE id=$1',[tenant.id]);
  expect((await onboardingState(owner,tenant.id)).checks.find(c=>c.key==='terms')?.ready).toBe(false);
});
it('suppresses test mail even if the tenant demo flag later changes',async()=>{
  await makeTest();await db.query('UPDATE tenants SET demo=false WHERE id=$1',[tenant.id]);vi.stubEnv('BOOKING_MAIL_MODE','smtp');
  const claim=(await claimNotification(tenant.id))!,send=vi.fn(async()=> 'sent' as const);
  expect(await deliverNotification(claim,send)).toBe('skipped');expect(send).not.toHaveBeenCalled();
});
