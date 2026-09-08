import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import pg from 'pg';
import {DateTime} from 'luxon';
import {availableOffers} from '../src/lib/availability';
import {createBooking} from '../src/lib/bookings';
import {changeAdminBooking} from '../src/lib/booking-management';
import {claimNotification,deliverNotification,runNotificationBatch} from '../src/lib/notification-worker';
import {changeNotificationSettings,notificationState} from '../src/lib/notification-management';
import {sendNotificationMail,type NotificationMail} from '../src/lib/notification-mail';
import {withTenant,pool} from '../src/lib/db';
import type {Tenant} from '../src/lib/tenants';
import type {Actor} from '../src/lib/access';
import {STANDARD_PLAN,monthlyPeriod} from '../src/lib/billing-rules';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
let tenant:Tenant,foreign:Tenant,owner:Actor,staffId:string,serviceId:string,capture:string;
const day=DateTime.now().setZone('Europe/Tallinn').plus({days:7}).toISODate()!;
beforeAll(()=>db.connect());afterAll(()=>db.end());
beforeEach(async()=>{
  vi.stubEnv('BOOKING_MAIL_MODE','capture');capture=await mkdtemp(path.join(tmpdir(),'booking-mail-test-'));vi.stubEnv('BOOKING_MAIL_CAPTURE_DIR',capture);
  const id=randomUUID();
  tenant=(await db.query("INSERT INTO tenants(id,slug,name,address,demo,contact_email,management_link_hours) VALUES($1,$2,'Mail test','Test address',false,'salon@example.invalid',24) RETURNING *",[id,'mail-'+id])).rows[0];
  const other=randomUUID();foreign=(await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Foreign','Other') RETURNING *",[other,'mail-'+other])).rows[0];
  await db.query('INSERT INTO tenant_domains(hostname,tenant_id) VALUES($1,$2)',[tenant.slug+'.localhost',id]);
  staffId=randomUUID();serviceId=randomUUID();
  await db.query("INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,'Mari')",[staffId,id]);
  await db.query("INSERT INTO services(id,tenant_id,name,category,default_price,default_duration) VALUES($1,$2,'Service','Test',2500,30)",[serviceId,id]);
  await db.query('INSERT INTO staff_services(tenant_id,staff_id,service_id) VALUES($1,$2,$3)',[id,staffId,serviceId]);
  for(const st of [null,staffId])await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,d,540,1080 FROM generate_series(1,7) d',[id,st]);
  owner={id:randomUUID(),name:'Owner',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
  await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,$2,$3,true,true)',[owner.id,owner.name,owner.email]);
  await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner')",[id,owner.id]);
  // Real (non-demo) notifications now require a legitimately paid subscription fixture.
  const period=monthlyPeriod(DateTime.now().setZone(tenant.timezone).toISODate()!);
  const sub=(await db.query('INSERT INTO subscriptions(tenant_id,plan_id,plan_version,period_start,period_end) VALUES($1,$2,1,$3,$4) RETURNING id',[id,STANDARD_PLAN.id,period.start,period.end])).rows[0].id;
  const invoice=(await db.query(`INSERT INTO invoices(tenant_id,subscription_id,request_key,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total,status,number,issued_at)
   VALUES($1,$2,$3,$4,$5,$4,'{}','{}','[{"description":"Fixture"}]',3500,0,3500,'issued',$6,now()) RETURNING id`,[id,sub,randomUUID(),period.start,period.end,'MAILTEST-'+randomUUID()])).rows[0].id;
  await db.query('INSERT INTO payment_records(tenant_id,invoice_id,request_key,amount,received_on,recorded_by) VALUES($1,$2,$3,3500,$4,$5)',[id,invoice,randomUUID(),period.start,owner.id]);
});
afterEach(async()=>{
  vi.restoreAllMocks();vi.unstubAllEnvs();
  const ids=[tenant.id,foreign.id];
  for(const table of ['payment_records','invoices','subscriptions','booking_requests','outbox','bookings','access_audit_log','memberships','weekly_hours','staff_services','staff','services','tenant_domains'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[ids]);
  await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[ids]);await db.query('DELETE FROM auth_user WHERE id=$1',[owner.id]);
  if(!path.basename(capture).startsWith('booking-mail-test-')||path.dirname(capture)!==tmpdir())throw Error('Unsafe test cleanup path');
  await rm(capture,{recursive:true,force:true});
});
async function booking(){const o=(await availableOffers(tenant,serviceId,day,staffId))[0];return createBooking(tenant,{language:'en',serviceId,staffId,start:o.start,expectedPrice:o.price,expectedDuration:o.duration,expectedRulesVersion:1,name:'Test client',email:'client@example.invalid'},randomUUID());}
async function rawJob(id:string){return (await db.query('SELECT * FROM outbox WHERE id=$1',[id])).rows[0];}
async function settings(reminderMinutes:number|null,notificationEmail=''){const state=await notificationState(owner,tenant.id);return changeNotificationSettings(owner,{action:'settings',tenantId:tenant.id,version:state.settings.version,notificationEmail,reminderMinutes});}
it('captures a localized confirmation and the existing secure link without marking it delivered',async()=>{
  const b=await booking(),claim=(await claimNotification(tenant.id))!;expect(claim).toBeTruthy();
  expect(await deliverNotification(claim)).toBe('capture');
  const files=await readdir(capture);expect(files).toHaveLength(1);const mail=JSON.parse(await readFile(path.join(capture,files[0]),'utf8')) as NotificationMail;
  expect(mail.to).toBe('client@example.invalid');expect(mail.text).toContain(b.managementUrl!);expect(mail.text).toContain('Europe/Tallinn');expect(mail.subject).toContain('confirmed');
  expect(await rawJob(claim.id)).toMatchObject({status:'skipped',delivery_status:'unknown',sent_at:null});
  expect((await rawJob(claim.id)).captured_at).not.toBeNull();
  await sendNotificationMail(mail);expect(await readdir(capture)).toHaveLength(1);
  await expect(notificationState(owner,foreign.id)).rejects.toMatchObject({status:403});
  await withTenant(foreign.id,async c=>expect((await c.query('SELECT * FROM notification_attempts WHERE tenant_id=$1',[tenant.id])).rowCount).toBe(0));
});
it('serializes duplicate workers and sends a claimed job once',async()=>{
  await booking();const claims=await Promise.all([claimNotification(tenant.id),claimNotification(tenant.id)]);expect(claims.filter(Boolean)).toHaveLength(1);
  const claim=claims.find(Boolean)!,send=vi.fn(async()=> 'sent' as const);
  await Promise.all([deliverNotification(claim,send),deliverNotification(claim,send)]);
  expect(send).toHaveBeenCalledTimes(1);expect(await rawJob(claim.id)).toMatchObject({status:'sent',delivery_status:'unknown',attempts:1});
});
it('retries temporary SMTP failures with the same Message-ID and no private error text',async()=>{
  await booking();const first=(await claimNotification(tenant.id))!;
  const fail=vi.fn(async(_mail:NotificationMail)=>{throw Object.assign(new Error('private client@example.invalid detail'),{responseCode:421});});
  expect(await deliverNotification(first,fail)).toBe('failed');
  const failed=await rawJob(first.id);expect(failed.next_attempt_at.getTime()).toBeGreaterThan(Date.now());expect(JSON.stringify(failed)).not.toContain('private');expect(failed.last_error_code).toBe('SMTP_TEMPORARY');
  expect(await claimNotification(tenant.id)).toBeNull();
  await db.query("UPDATE outbox SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE id=$1",[first.id]);
  const retry=(await claimNotification(tenant.id))!,send=vi.fn(async(_mail:NotificationMail)=> 'sent' as const);await deliverNotification(retry,send);
  expect(send.mock.calls[0]?.[0]?.messageId).toBe(fail.mock.calls[0]?.[0]?.messageId);
  expect(await rawJob(first.id)).toMatchObject({status:'sent',attempts:2});
  expect((await db.query('SELECT outcome FROM notification_attempts WHERE outbox_id=$1 ORDER BY attempt',[first.id])).rows).toEqual([{outcome:'failed'},{outcome:'sent'}]);
});
it('requires an owner and a fresh version for retry and observed delivery feedback',async()=>{
  await booking();const claim=(await claimNotification(tenant.id))!;
  await deliverNotification(claim,async()=>{throw Object.assign(new Error('reject'),{responseCode:550});});
  expect(await claimNotification(tenant.id)).toBeNull();const failed=await rawJob(claim.id);
  const command={action:'retry',tenantId:tenant.id,id:claim.id,version:failed.version,reason:'Address corrected by operator'};
  await expect(changeNotificationSettings({...owner,id:randomUUID()},command)).rejects.toMatchObject({status:401});
  await changeNotificationSettings(owner,command);
  await expect(changeNotificationSettings(owner,command)).rejects.toMatchObject({code:'VERSION_CONFLICT'});
  await deliverNotification((await claimNotification(tenant.id))!,async()=> 'sent');
  const sent=await rawJob(claim.id);await changeNotificationSettings(owner,{action:'feedback',tenantId:tenant.id,id:claim.id,version:sent.version,deliveryStatus:'bounced',reason:'Observed SMTP delivery report'});
  expect(await rawJob(claim.id)).toMatchObject({delivery_status:'bounced'});
  expect((await db.query("SELECT count(*)::int n FROM access_audit_log WHERE tenant_id=$1 AND action IN ('notifications.retry','notifications.feedback')",[tenant.id])).rows[0].n).toBe(2);
});
it('reclaims an expired worker lease while rejecting its obsolete claim',async()=>{
  await booking();const old=(await claimNotification(tenant.id))!;await db.query("UPDATE outbox SET locked_until=clock_timestamp()-interval '1 second' WHERE id=$1",[old.id]);
  const current=(await claimNotification(tenant.id))!;expect(current.claim_token).not.toBe(old.claim_token);const send=vi.fn(async()=> 'sent' as const);
  expect(await deliverNotification(old,send)).toBe('superseded');expect(send).not.toHaveBeenCalled();await deliverNotification(current,send);expect(send).toHaveBeenCalledTimes(1);
});
it('invalidates a claimed confirmation and reminder when cancellation commits first',async()=>{
  await settings(60);const b=await booking(),claim=(await claimNotification(tenant.id))!;
  await changeAdminBooking(owner,{action:'cancel',tenantId:tenant.id,bookingId:b.id,version:b.version,reason:'Client request'},randomUUID());
  const send=vi.fn(async()=> 'sent' as const);expect(await deliverNotification(claim,send)).toBe('superseded');expect(send).not.toHaveBeenCalled();
  const jobs=(await db.query('SELECT kind,status FROM outbox WHERE booking_id=$1 ORDER BY kind',[b.id])).rows;
  expect(jobs).toContainEqual({kind:'booking.reminder',status:'superseded'});expect(jobs).toContainEqual({kind:'booking.cancelled',status:'pending'});
});
it('keeps SMTP out of demo mode, and leaves jobs untouched while transport is disabled',async()=>{
  await booking();vi.stubEnv('BOOKING_MAIL_MODE','disabled');expect(await runNotificationBatch()).toEqual({processed:0,failed:0,configured:false});
  await db.query('UPDATE tenants SET demo=true WHERE id=$1',[tenant.id]);vi.stubEnv('BOOKING_MAIL_MODE','smtp');
  const claim=(await claimNotification(tenant.id))!,send=vi.fn(async()=> 'sent' as const);expect(await deliverNotification(claim,send)).toBe('skipped');expect(send).not.toHaveBeenCalled();
  expect(await rawJob(claim.id)).toMatchObject({last_error_code:'TEST_MODE'});
});
it('applies reminder settings to future pending jobs without issuing a past-due reminder flood',async()=>{
  const b=await booking();await settings(60,'operator@example.invalid');
  const reminder=(await db.query("SELECT * FROM outbox WHERE booking_id=$1 AND kind='booking.reminder'",[b.id])).rows[0];expect(reminder.next_attempt_at.toISOString()).toBe(new Date(Date.parse(b.start)-3600000).toISOString());
  await settings(null);expect((await rawJob(reminder.id)).status).toBe('superseded');
  await settings(120);expect((await rawJob(reminder.id)).status).toBe('pending');
  const next=await booking();expect((await db.query("SELECT count(*)::int n FROM outbox WHERE booking_id=$1 AND recipient_kind='company'",[next.id])).rows[0].n).toBe(0);
});
it('queues company copies separately and honours manual customer email suppression',async()=>{
  await settings(60,'operator@example.invalid');
  const o=(await availableOffers(tenant,serviceId,day,staffId))[0];
  const b=await changeAdminBooking(owner,{action:'manual-create',tenantId:tenant.id,serviceId,staffId,start:o.start,expectedPrice:o.price,expectedDuration:o.duration,expectedRulesVersion:1,name:'Manual customer',email:'client@example.invalid',sendEmail:false},randomUUID());
  const jobs=(await db.query('SELECT kind,status FROM outbox WHERE booking_id=$1 ORDER BY kind',[b.id])).rows;
  expect(jobs).toEqual([{kind:'booking.confirmed',status:'skipped'},{kind:'company.booking.confirmed',status:'pending'}]);
  const send=vi.fn(async(_mail:NotificationMail)=> 'sent' as const);await deliverNotification((await claimNotification(tenant.id))!,send);
  expect(send.mock.calls[0][0].to).toBe('operator@example.invalid');expect(send.mock.calls[0][0].text).not.toContain('/broneering#');
});
it('prevents production capture and does not auto-enable unconfigured reminders',async()=>{
  vi.stubEnv('NODE_ENV','production');
  expect(await runNotificationBatch()).toEqual({processed:0,failed:0,configured:false});
  await booking();expect((await db.query("SELECT count(*)::int n FROM outbox WHERE tenant_id=$1 AND kind='booking.reminder'",[tenant.id])).rows[0].n).toBe(0);
});
