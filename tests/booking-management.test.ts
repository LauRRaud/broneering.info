import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {DateTime} from 'luxon';
import {availableOffers} from '../src/lib/availability';
import {createBooking} from '../src/lib/bookings';
import {changeAdminBooking as admin,changePublicBooking as change,publicBookingState as publicState,publicChangeOffers,adminBookingsState as state,adminBookingOffers,adminBookingHistory,saveBookingPolicy} from '../src/lib/booking-management';
import {saveSchedule,scheduleState} from '../src/lib/schedule-management';
import {saveServiceManagement,serviceManagementState} from '../src/lib/service-management';
import {withTenant,pool} from '../src/lib/db';
import {tokenHash} from '../src/lib/booking-secrets';
import {bookingCalendar} from '../src/lib/booking-calendar';
import {customerState,correctCustomer,csvCell} from '../src/lib/customer-management';
import {languageSettings} from '../src/lib/language-settings';
import type {Actor} from '../src/lib/access';
import type {Tenant} from '../src/lib/tenants';
import type {Offer,BookingResult} from '../src/lib/contracts';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
const day=DateTime.now().setZone('Europe/Tallinn').plus({days:7}).toISODate()!;
let tenant:Tenant,foreign:Tenant,owner:Actor,clerk:Actor,worker:Actor,staffId:string,otherStaffId:string,serviceId:string;
beforeAll(()=>db.connect());afterAll(()=>db.end());
beforeEach(async()=>{
  const id=randomUUID(),other=randomUUID();
  tenant=(await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Management test','Test') RETURNING *",[id,'bm-'+id])).rows[0];
  foreign=(await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Foreign','Test') RETURNING *",[other,'bm-'+other])).rows[0];
  staffId=randomUUID();otherStaffId=randomUUID();serviceId=randomUUID();
  await db.query("INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,'Mari'),($3,$2,'Karl')",[staffId,id,otherStaffId]);
  await db.query("INSERT INTO services(id,tenant_id,name,category,default_price,default_duration,buffer_before,buffer_after) VALUES($1,$2,'Lõikus','Test',2500,30,5,10)",[serviceId,id]);
  for(const st of [staffId,otherStaffId])await db.query('INSERT INTO staff_services(tenant_id,staff_id,service_id,buffer_before,buffer_after) VALUES($1,$2,$3,NULL,NULL)',[id,st,serviceId]);
  for(const st of [null,staffId,otherStaffId])await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,d,540,1080 FROM generate_series(1,7) d',[id,st]);
  const actors:Actor[]=[];
  for(const role of ['owner','receptionist','staff']){
    const userId=randomUUID(),actor={id:userId,name:role,email:userId+'@example.invalid',emailVerified:true,twoFactorEnabled:role==='owner',isPlatformAdmin:false};actors.push(actor);
    await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,$2,$3,true,$4)',[userId,role,actor.email,actor.twoFactorEnabled]);
    await db.query('INSERT INTO memberships(tenant_id,user_id,role,staff_id,permissions) VALUES($1,$2,$3,$4,$5)',[id,userId,role,role==='staff'?staffId:null,role==='receptionist'?'["schedules.manage"]':role==='staff'?'["schedules.own"]':'[]']);
  }
  [owner,clerk,worker]=actors;
});
afterEach(async()=>{
  vi.useRealTimers();
  const ids=[tenant.id,foreign.id];
  for(const table of ['booking_requests','outbox','bookings','access_audit_log','memberships','schedule_versions','schedule_exceptions','weekly_hours','staff_services','staff','services','tenant_domains'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[ids]);
  await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[ids]);
  await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[owner.id,clerk.id,worker.id]]);
});
const offerInput=(o:Offer)=>({serviceId:o.serviceId,staffId:o.staffId,start:o.start,expectedPrice:o.price,expectedDuration:o.duration,expectedRulesVersion:1});
const input=(o:Offer)=>({...offerInput(o),name:'Test Klient',email:'client@example.invalid'});
async function first(st=staffId){return (await availableOffers(tenant,serviceId,day,st))[0];}
async function policy(hours:number|null=24){const p=(await state(owner,tenant.id,day)).policy;await saveBookingPolicy(owner,{tenantId:tenant.id,version:p.version,contactEmail:'salon@example.invalid',contactPhone:'',linkHours:hours});}

it('separates saved language preferences and rejects cross-tenant and non-owner company changes',async()=>{
  await languageSettings(owner,{tenantId:tenant.id,adminLanguage:'en',defaultLanguage:'ru'},true);
  expect(await languageSettings(owner,{tenantId:tenant.id})).toEqual({adminLanguage:'en',defaultLanguage:'ru'});
  await languageSettings(clerk,{tenantId:tenant.id,adminLanguage:'ru'},true);
  expect((await languageSettings(owner,{tenantId:tenant.id})).adminLanguage).toBe('en');
  await expect(languageSettings(clerk,{tenantId:tenant.id,defaultLanguage:'et'},true)).rejects.toMatchObject({status:403});
  await expect(languageSettings(owner,{tenantId:foreign.id,defaultLanguage:'et'},true)).rejects.toMatchObject({status:403});
  await expect(languageSettings(owner,{tenantId:tenant.id,adminLanguage:'de'},true)).rejects.toMatchObject({status:400});
});
it('retains the booking language in notices after administrator changes and supports legacy retries',async()=>{
  const o=await first(),key=randomUUID(),data={...input(o),language:'ru' as const};
  const b=await createBooking(tenant,data,key);
  expect(b.language).toBe('ru');expect((await createBooking(tenant,data,key)).id).toBe(b.id);
  await admin(owner,{tenantId:tenant.id,bookingId:b.id,action:'cancel',version:1,reason:'Customer request'},randomUUID());
  const notices=await db.query('SELECT language FROM outbox WHERE tenant_id=$1 AND booking_id=$2',[tenant.id,b.id]);
  expect(notices.rows.length).toBeGreaterThan(0);expect(notices.rows.every(r=>r.language==='ru')).toBe(true);
  const legacy=input(await first()),legacyKey=randomUUID();const old=await createBooking(tenant,legacy,legacyKey);
  expect(old.language).toBe('et');expect((await createBooking(tenant,legacy,legacyKey)).id).toBe(old.id);
});
const token=(b:BookingResult)=>b.managementUrl!.split('#')[1];
const cancel=(b:BookingResult)=>({action:'cancel',version:b.version,reason:'Kliendi soov'});
const identity=(b:BookingResult)=>({tenantId:tenant.id,bookingId:b.id,version:b.version});
it('15: manual and public creation compete for the same allocation',async()=>{
  const offer=await first();
  const results=await Promise.allSettled([
    createBooking(tenant,input(offer),randomUUID()),
    admin(owner,{tenantId:tenant.id,action:'manual-create',...input(offer)},randomUUID()),
  ]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'SLOT_UNAVAILABLE'}});
  expect((await db.query('SELECT count(*)::int n FROM bookings WHERE tenant_id=$1',[tenant.id])).rows[0].n).toBe(1);
  expect((await db.query('SELECT count(*)::int n FROM outbox WHERE tenant_id=$1',[tenant.id])).rows[0].n).toBe(1);
});
it('15: two bookings racing for one new slot move only one and preserve the losing allocation',async()=>{
  const a=await createBooking(tenant,input(await first()),randomUUID());
  const b=await createBooking(tenant,input(await first()),randomUUID());
  const target=await first(otherStaffId);
  const results=await Promise.allSettled([a,b].map(booking=>admin(owner,{...identity(booking),action:'reschedule',...offerInput(target),reason:'Kliendi soov'},randomUUID())));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'SLOT_UNAVAILABLE'}});
  for(const [i,booking] of [a,b].entries()){
    const row=await rawBooking(booking.id);
    if(results[i].status==='rejected'){
      expect(row.start_at.toISOString()).toBe(booking.start);expect(row.staff_id).toBe(staffId);expect(row.version).toBe(1);
      expect(await counts(booking.id)).toEqual({events:1,notices:1});
    }else{expect(row.start_at.toISOString()).toBe(new Date(target.start).toISOString());expect(row.version).toBe(2);}
  }
});
it('15: rejects a management link that expires while its command waits for the tenant lock',async()=>{
  await policy();const b=await createBooking(tenant,input(await first()),randomUUID());
  const blocker=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await blocker.connect();
  let pending:Promise<unknown>|undefined;
  try{
    const blockerPid=(await blocker.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    await db.query("UPDATE booking_management_tokens SET expires_at=clock_timestamp()+interval '2 seconds' WHERE booking_id=$1",[b.id]);
    await blocker.query('BEGIN');await blocker.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenant.id]);
    pending=change(tenant.id,token(b),cancel(b),randomUUID()).then(value=>({value}),error=>({error}));
    // Observe an actual blocked app transaction, not a scheduling assumption.
    let waiting=false;
    for(let n=0;n<100&&!waiting;n++){
      waiting=(await db.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid)) AND usename='booking_app' AND wait_event_type='Lock') AS waiting",[blockerPid])).rows[0].waiting;
      if(!waiting)await new Promise(r=>setTimeout(r,10));
    }
    expect(waiting).toBe(true);
    await blocker.query('SELECT pg_sleep(2.1)');await blocker.query('COMMIT');
    expect(await pending).toMatchObject({error:{code:'LINK_UNAVAILABLE'}});
    expect((await rawBooking(b.id)).status).toBe('confirmed');expect(await counts(b.id)).toEqual({events:1,notices:1});
  }finally{await blocker.query('ROLLBACK');await blocker.end();if(pending)await pending;}
});
async function rawBooking(id:string){return (await db.query('SELECT * FROM bookings WHERE id=$1',[id])).rows[0];}
async function counts(id:string){return (await db.query('SELECT (SELECT count(*)::int FROM booking_events WHERE booking_id=$1) events,(SELECT count(*)::int FROM outbox WHERE booking_id=$1) notices',[id])).rows[0];}

it('requires an owner-selected link policy and preserves contacts for issued links',async()=>{
  expect((await state(owner,tenant.id,day)).policy.linkHours).toBeNull();
  const booking=await createBooking(tenant,input(await first()),randomUUID());expect(booking.managementUrl).toBeUndefined();
  await expect(admin(owner,{...identity(booking),action:'issue-link'},randomUUID())).rejects.toMatchObject({code:'LINK_POLICY_REQUIRED'});
  const p={tenantId:tenant.id,version:1,linkHours:0,contactEmail:'salon@example.invalid',contactPhone:''};
  await expect(saveBookingPolicy(clerk,p)).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(saveBookingPolicy(owner,{...p,contactEmail:''})).rejects.toMatchObject({code:'INVALID_INPUT'});
  await saveBookingPolicy(owner,p);
  await expect(saveBookingPolicy(owner,p)).rejects.toMatchObject({code:'VERSION_CONFLICT'});
  const linked=await admin(owner,{...identity(booking),action:'issue-link'},randomUUID());expect(linked.managementExpiresAt).toBe(booking.end);
  await expect(saveBookingPolicy(owner,{...p,version:2,linkHours:null,contactEmail:''})).rejects.toMatchObject({code:'CONTACT_REQUIRED'});
  await policy(null);expect((await publicState(tenant.id,token(linked))).booking.id).toBe(booking.id);
});
it('stores only a token hash and encrypted replay data; GET has no side effects and creation replays exactly',async()=>{
  await policy();const chosen=await first(),key=randomUUID(),booking=await createBooking(tenant,input(chosen),key),secret=token(booking);
  expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const saved=(await db.query('SELECT * FROM booking_management_tokens WHERE booking_id=$1',[booking.id])).rows[0];expect(saved.token_hash).toBe(tokenHash(secret));expect(JSON.stringify(saved)).not.toContain(secret);
  const request=(await db.query('SELECT * FROM booking_requests WHERE booking_id=$1',[booking.id])).rows[0];expect(request.encrypted_link).toBeTruthy();expect(JSON.stringify(request)).not.toContain(secret);
  const before=await counts(booking.id);await publicState(tenant.id,secret);await publicState(tenant.id,secret);await publicChangeOffers(tenant.id,secret,day);
  expect(await counts(booking.id)).toEqual(before);expect((await rawBooking(booking.id)).version).toBe(1);
  expect(await createBooking(tenant,input(chosen),key)).toEqual(booking);
  for(const table of ['booking_management_tokens','booking_commands','booking_events']){
    expect((await pool().query('SELECT * FROM '+table+' WHERE tenant_id=$1',[tenant.id])).rowCount).toBe(0);
    await withTenant(foreign.id,async c=>expect((await c.query('SELECT * FROM '+table+' WHERE tenant_id=$1',[tenant.id])).rowCount).toBe(0));
  }
});
it('rejects forged, foreign, expired and revoked links; reissuing grants only the new secret',async()=>{
  await policy();const b=await createBooking(tenant,input(await first()),randomUUID()),old=token(b);
  for(const value of ['',b.id,old.slice(1),'A'.repeat(43)])await expect(publicState(tenant.id,value)).rejects.toMatchObject({code:'LINK_UNAVAILABLE'});
  await expect(publicState(foreign.id,old)).rejects.toMatchObject({code:'LINK_UNAVAILABLE'});
  await db.query("UPDATE booking_management_tokens SET expires_at=now()-interval '1 second' WHERE booking_id=$1",[b.id]);
  await expect(publicState(tenant.id,old)).rejects.toMatchObject({code:'LINK_UNAVAILABLE'});
  const key=randomUUID(),next=await admin(clerk,{...identity(b),action:'issue-link'},key);expect(token(next)).not.toBe(old);
  expect(await admin(clerk,{...identity(b),action:'issue-link'},key)).toEqual(next);
  await expect(publicState(tenant.id,old)).rejects.toMatchObject({code:'LINK_UNAVAILABLE'});
  expect((await publicState(tenant.id,token(next))).booking.id).toBe(b.id);
  await admin(owner,{...identity(b),action:'revoke-link',reason:'Kliendi soov'},randomUUID());
  await expect(change(tenant.id,token(next),cancel(b),randomUUID())).rejects.toMatchObject({code:'LINK_UNAVAILABLE'});
  expect((await rawBooking(b.id)).status).toBe('confirmed');
});
it('atomically moves a booking into a slot overlapping its own old occupancy and keeps original cancellation terms',async()=>{
  await policy(12);const b=await createBooking(tenant,input(await first()),randomUUID());
  await db.query('UPDATE tenants SET cancellation_hours=48 WHERE id=$1',[tenant.id]);
  await db.query("UPDATE services SET name='Uus lõikus' WHERE id=$1",[serviceId]);
  const options=await publicChangeOffers(tenant.id,token(b),day);expect(options.serviceName).toBe('Uus lõikus');
  const chosen=options.offers.find(o=>o.staffId===staffId&&Date.parse(o.start)>Date.parse(b.start)&&Date.parse(o.start)<Date.parse(b.end))!;expect(chosen).toBeTruthy();
  const moved=await change(tenant.id,token(b),{action:'reschedule',version:b.version,...offerInput(chosen)},randomUUID());
  expect(moved).toMatchObject({id:b.id,start:new Date(chosen.start).toISOString(),version:2,cancellationHours:24,serviceName:'Uus lõikus'});
  const link=await publicState(tenant.id,token(b));expect(link.expiresAt).toBe(new Date(Date.parse(moved.end)+12*3600000).toISOString());
  expect((await db.query('SELECT count(*)::int n FROM bookings WHERE tenant_id=$1',[tenant.id])).rows[0].n).toBe(1);
  expect((await db.query('SELECT status,booking_version FROM outbox WHERE booking_id=$1 ORDER BY booking_version',[b.id])).rows).toEqual([{status:'superseded',booking_version:1},{status:'pending',booking_version:2}]);
  expect((await adminBookingHistory(owner,tenant.id,b.id))[0]).toMatchObject({action:'booking.reschedule',before:{start:b.start},after:{start:moved.start}});
});
it('leaves the old booking and notices intact when the new price, rules or availability are stale',async()=>{
  await policy();const b=await createBooking(tenant,input(await first()),randomUUID()),target=await first(otherStaffId),before=await rawBooking(b.id),beforeCounts=await counts(b.id);
  const command={action:'reschedule',version:b.version,...offerInput(target)};
  await expect(change(tenant.id,token(b),{...command,expectedPrice:1},randomUUID())).rejects.toMatchObject({code:'OFFER_CHANGED'});
  await expect(change(tenant.id,token(b),{...command,expectedRulesVersion:999},randomUUID())).rejects.toMatchObject({code:'RULES_CHANGED'});
  await createBooking(tenant,input(target),randomUUID());
  await expect(change(tenant.id,token(b),command,randomUUID())).rejects.toMatchObject({code:'SLOT_UNAVAILABLE'});
  expect(await rawBooking(b.id)).toEqual(before);expect(await counts(b.id)).toEqual(beforeCounts);
});
it('accepts exactly one of two administrators editing the same version',async()=>{
  const b=await createBooking(tenant,input(await first()),randomUUID()),offers=await adminBookingOffers(owner,tenant.id,serviceId,otherStaffId,day,b.id);
  const results=await Promise.allSettled([owner,clerk].map((actor,i)=>admin(actor,{...identity(b),action:'reschedule',...offerInput(offers.offers[i]),reason:'Kliendiga kokku lepitud'},randomUUID())));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'VERSION_CONFLICT'}});
  expect((await rawBooking(b.id)).version).toBe(2);expect(await counts(b.id)).toEqual({events:2,notices:2});
});
it('replays cancellation without duplicate effects and reports a changed creation snapshot',async()=>{
  await policy();const chosen=await first(),createKey=randomUUID(),b=await createBooking(tenant,input(chosen),createKey),key=randomUUID();
  const cancelled=await change(tenant.id,token(b),cancel(b),key);expect(cancelled.status).toBe('cancelled');const before=await counts(b.id);
  expect(await change(tenant.id,token(b),cancel(b),key)).toEqual(cancelled);
  expect(await change(tenant.id,token(b),cancel(b),randomUUID())).toEqual(cancelled);
  expect(await admin(clerk,{...identity(b),...cancel(b)},randomUUID())).toEqual(cancelled);expect(await counts(b.id)).toEqual(before);
  expect((await availableOffers(tenant,serviceId,day,staffId)).some(o=>Date.parse(o.start)===Date.parse(b.start))).toBe(true);
  expect(await createBooking(tenant,input(chosen),createKey)).toMatchObject({id:b.id,status:'confirmed',version:1,currentVersion:2,currentStatus:'cancelled'});
  await expect(change(tenant.id,token(b),{...cancel(b),reason:'Muu'},key)).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
});
it('enforces the booked deadline despite changed tenant settings; only a reasoned administrator exception succeeds',async()=>{
  await policy();const b=await createBooking(tenant,input(await first()),randomUUID());
  await db.query('UPDATE tenants SET cancellation_hours=0 WHERE id=$1',[tenant.id]);
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(Date.parse(b.start)-3600000));
  expect((await publicState(tenant.id,token(b))).booking.canChange).toBe(false);
  await expect(change(tenant.id,token(b),cancel(b),randomUUID())).rejects.toMatchObject({code:'CUTOFF_PASSED'});
  await expect(admin(owner,{...identity(b),...cancel(b)},randomUUID())).rejects.toMatchObject({code:'CUTOFF_PASSED'});
  await expect(admin(owner,{...identity(b),...cancel(b),overrideDeadline:true,reason:''},randomUUID())).rejects.toMatchObject({code:'CUTOFF_PASSED'});
  await expect(admin(worker,{...identity(b),...cancel(b),overrideDeadline:true},randomUUID())).rejects.toMatchObject({code:'CUTOFF_PASSED'});
  expect((await admin(clerk,{...identity(b),...cancel(b),overrideDeadline:true},randomUUID())).status).toBe('cancelled');
  expect((await adminBookingHistory(owner,tenant.id,b.id))[0]).toMatchObject({actorName:'receptionist',reason:'Kliendi soov'});
});
it('restricts staff reads and writes to their own bookings and rechecks revoked memberships',async()=>{
  const own=await createBooking(tenant,input(await first()),randomUUID()),other=await createBooking(tenant,input(await first(otherStaffId)),randomUUID());
  expect((await state(worker,tenant.id,day)).bookings.map(b=>b.id)).toEqual([own.id]);
  await expect(adminBookingHistory(worker,tenant.id,other.id)).rejects.toMatchObject({code:'STAFF_SCOPE_DENIED'});
  await expect(adminBookingOffers(worker,tenant.id,serviceId,otherStaffId,day,own.id)).rejects.toMatchObject({code:'STAFF_SCOPE_DENIED'});
  await expect(admin(worker,{...identity(other),...cancel(other)},randomUUID())).rejects.toMatchObject({code:'STAFF_SCOPE_DENIED'});
  await expect(state(owner,foreign.id,day)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
  const key=randomUUID();await admin(worker,{...identity(own),...cancel(own)},key);
  await db.query('UPDATE memberships SET active=false WHERE tenant_id=$1 AND user_id=$2',[tenant.id,worker.id]);
  await expect(admin(worker,{...identity(own),...cancel(own)},key)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
});
it('allows manual hidden-service bookings without invented email and replays lost replies',async()=>{
  await policy();await db.query('UPDATE services SET online=false WHERE id=$1',[serviceId]);
  expect(await availableOffers(tenant,serviceId,day)).toEqual([]);
  const chosen=(await adminBookingOffers(clerk,tenant.id,serviceId,staffId,day)).offers[0],key=randomUUID(),command={tenantId:tenant.id,action:'manual-create',...offerInput(chosen),name:'Telefoniklient',email:null,phone:'+372 5555 0000'};
  const b=await admin(clerk,command,key);expect(await admin(clerk,command,key)).toEqual(b);
  expect(await rawBooking(b.id)).toMatchObject({customer_email:null,source:'manual',status:'confirmed'});
  expect((await state(clerk,tenant.id,day)).bookings[0].notice).toContain('E-posti aadress puudub');
  expect((await db.query('SELECT status FROM outbox WHERE booking_id=$1',[b.id])).rows).toEqual([{status:'skipped'}]);
  expect((await db.query('SELECT count(*)::int n FROM bookings WHERE tenant_id=$1',[tenant.id])).rows[0].n).toBe(1);
});
it('logs completion and no-show corrections, rejects early status and cannot restore a cancellation',async()=>{
  const b=await createBooking(tenant,input(await first()),randomUUID());
  await expect(admin(owner,{...identity(b),action:'status',status:'completed',reason:'Teenindatud'},randomUUID())).rejects.toMatchObject({code:'TOO_EARLY'});
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(Date.parse(b.end)+1000));
  const done=await admin(owner,{...identity(b),action:'status',status:'completed',reason:'Teenindatud'},randomUUID());
  const noShow=await admin(clerk,{...identity(done),action:'status',status:'no_show',reason:'Parandus: klient ei ilmunud'},randomUUID());
  const restored=await admin(owner,{...identity(noShow),action:'status',status:'confirmed',reason:'Ekslik märge'},randomUUID());
  const cancelled=await admin(owner,{...identity(restored),...cancel(restored),overrideDeadline:true},randomUUID());
  await expect(admin(owner,{...identity(cancelled),action:'status',status:'confirmed',reason:'Uuesti'},randomUUID())).rejects.toMatchObject({code:'BOOKING_CANCELLED'});
  expect((await adminBookingHistory(owner,tenant.id,b.id)).map(e=>e.action)).toEqual(['booking.cancel','booking.status','booking.status','booking.status','booking.created']);
});
it('previews a conflicting closure then queues affected bookings without moving or cancelling them',async()=>{
  const b=await createBooking(tenant,input(await first()),randomUUID());const command={tenantId:tenant.id,staffId,version:0,startDay:day,endDay:day,closed:true,intervals:[],kind:'illness'};
  await expect(saveSchedule(worker,'save-exception',command)).rejects.toMatchObject({code:'SCHEDULE_CONFLICT',total:1});
  expect((await scheduleState(owner,tenant.id)).scopes.find(s=>s.staffId===staffId)?.version).toBe(0);
  await saveSchedule(worker,'save-exception',{...command,acknowledgeConflicts:true});
  const saved=await rawBooking(b.id);expect(saved).toMatchObject({start_at:new Date(b.start),price:b.price,status:'confirmed',version:2,attention_reason:'Töötaja puudumine / suletud tööpäev'});
  expect(await availableOffers(tenant,serviceId,day,staffId)).toEqual([]);
  expect((await state(owner,tenant.id,day,true)).bookings.map(b=>b.id)).toEqual([b.id]);
  expect((await db.query('SELECT status FROM outbox WHERE booking_id=$1',[b.id])).rows).toEqual([{status:'superseded'}]);
  const other=(await adminBookingOffers(clerk,tenant.id,serviceId,otherStaffId,day,b.id)).offers[0];
  await admin(clerk,{...identity({...b,version:2}),action:'reschedule',...offerInput(other),reason:'Kliendiga kokku lepitud'},randomUUID());
  expect((await state(owner,tenant.id,day,true)).bookings).toEqual([]);
});
it('keeps post-service buffers occupied after attendance is completed or corrected to no-show',async()=>{
  await db.query('UPDATE tenants SET lead_minutes=0,step_minutes=5 WHERE id=$1',[tenant.id]);
  await db.query('UPDATE services SET buffer_after=30 WHERE id=$1',[serviceId]);
  const b=await createBooking(tenant,input(await first()),randomUUID()),other=await createBooking(tenant,input(await first(otherStaffId)),randomUUID());
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(Date.parse(b.end)+60000));
  const done=await admin(owner,{...identity(b),action:'status',status:'completed',reason:'Teenindatud'},randomUUID());
  for(const status of ['completed','no_show']){
    if(status==='no_show')await admin(owner,{...identity(done),action:'status',status:'no_show',reason:'Parandatud kohalolek'},randomUUID());
    const offers=await availableOffers(tenant,serviceId,day,staffId);expect(offers.length).toBeGreaterThan(0);
    expect(offers.every(o=>Date.parse(o.start)>=Date.parse(b.end)+35*60000)).toBe(true);
    await expect(db.query('UPDATE bookings SET staff_id=$2 WHERE id=$1',[other.id,staffId])).rejects.toMatchObject({code:'23P01'});
  }
});
it('marks a replayed command as historical when another accepted command has since changed the booking',async()=>{
  const chosen=await first(),key=randomUUID(),command={tenantId:tenant.id,action:'manual-create',...offerInput(chosen),name:'Telefoniklient',email:null};
  const b=await admin(clerk,command,key);await admin(owner,{...identity(b),...cancel(b)},randomUUID());
  expect(await admin(clerk,command,key)).toMatchObject({id:b.id,version:1,status:'confirmed',currentVersion:2,currentStatus:'cancelled'});
  expect((await db.query('SELECT count(*)::int n FROM bookings WHERE tenant_id=$1',[tenant.id])).rows[0].n).toBe(1);
});
it('archives departing staff, revokes company access and sessions, keeps history and queues future bookings',async()=>{
  const b=await createBooking(tenant,input(await first()),randomUUID());
  await db.query("INSERT INTO auth_session(id,user_id,token,expires_at,updated_at) VALUES($1,$2,$3,now()+interval '1 day',now())",[randomUUID(),worker.id,randomUUID()]);
  const st=(await serviceManagementState(owner,tenant.id)).staff.find(s=>s.id===staffId)!;
  await saveServiceManagement(owner,'save-staff',{tenantId:tenant.id,...st,active:false});
  expect((await db.query('SELECT active FROM memberships WHERE tenant_id=$1 AND user_id=$2',[tenant.id,worker.id])).rows[0].active).toBe(false);
  expect((await db.query('SELECT id FROM auth_session WHERE user_id=$1',[worker.id])).rowCount).toBe(0);
  expect(await rawBooking(b.id)).toMatchObject({start_at:new Date(b.start),price:b.price,status:'confirmed',attention_reason:'Töötaja on arhiveeritud'});
  expect((await state(owner,tenant.id,day,true)).bookings.map(b=>b.id)).toEqual([b.id]);
  await expect(state(worker,tenant.id,day)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
  await saveServiceManagement(owner,'save-staff',{tenantId:tenant.id,...st,version:st.version+1,active:true});
  await expect(state(worker,tenant.id,day)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
});
it('protects an owner-linked staff account from accidental archival',async()=>{
  await db.query('UPDATE memberships SET staff_id=$3 WHERE tenant_id=$1 AND user_id=$2',[tenant.id,owner.id,staffId]);
  const st=(await serviceManagementState(owner,tenant.id)).staff.find(s=>s.id===staffId)!;
  await expect(saveServiceManagement(owner,'save-staff',{tenantId:tenant.id,...st,active:false})).rejects.toMatchObject({code:'OWNER_PROTECTED'});
  expect((await state(owner,tenant.id,day)).staff.some(s=>s.id===staffId)).toBe(true);
});
it('exports stable calendar identity, updated sequence, cancellation and valid UTF-8 folded text',()=>{
  const b:BookingResult={id:randomUUID(),reference:'BR-TEST',serviceName:'Õige; nimi,\\tekst\n'+('😀Õ'.repeat(60)),staffName:'Mari',start:'2026-10-01T07:00:00Z',end:'2026-10-01T07:30:00Z',price:2500,duration:30,status:'cancelled',version:3};
  const ics=bookingCalendar(b,{name:'Salong',address:'Tänav 1'},new Date('2026-09-08T10:00:00Z'));
  expect(ics).toContain('UID:'+b.id+'@broneering.info');expect(ics).toContain('SEQUENCE:3');expect(ics).toContain('STATUS:CANCELLED');expect(ics).toContain('DTSTART:20261001T070000Z');
  expect(ics.replace(/\r\n /g,'')).toContain('SUMMARY:Õige\\; nimi\\,\\\\tekst\\n');
  expect(ics.split('\r\n').every(line=>Buffer.byteLength(line,'utf8')<=75)).toBe(true);expect(ics).not.toContain('\uFFFD');
});

it('shows a scoped week and intersects location hours, employee hours and absences',async()=>{
  const calendar=await state(owner,tenant.id,day,false,0,'week',staffId);
  expect(calendar.columns).toHaveLength(7);expect(calendar.columns?.every(c=>c.staffId===staffId&&JSON.stringify(c.working)==='[[540,1080]]')).toBe(true);
  await db.query("INSERT INTO schedule_exceptions(tenant_id,staff_id,day,closed,intervals,kind) VALUES($1,$2,$3,true,'[]','vacation')",[tenant.id,staffId,day]);
  const updated=await state(owner,tenant.id,day,false,0,'week',staffId);
  expect(updated.columns?.find(c=>c.day===day)).toMatchObject({closed:true,working:[]});
  await expect(state(worker,tenant.id,day,false,0,'day',otherStaffId)).rejects.toMatchObject({code:'STAFF_SCOPE_DENIED'});
  expect((await state(worker,tenant.id,day,false,0,'day')).columns).toHaveLength(1);
  await expect(state(owner,tenant.id,'2026-02-30',false,0,'week')).rejects.toMatchObject({code:'INVALID_DATE'});
});
it('keeps local week boundaries through daylight saving and preserves archived bookings',async()=>{
  const calendar=await state(owner,tenant.id,'2026-10-25',false,0,'week',staffId);
  expect(calendar.columns?.map(c=>c.day)).toEqual(['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25']);
  const booking=await createBooking(tenant,input(await first()),randomUUID());
  await db.query('UPDATE staff SET active=false WHERE id=$1',[staffId]);
  expect((await state(owner,tenant.id,day,false,0,'day',staffId)).bookings[0].id).toBe(booking.id);
});
it('aggregates only the selected calendar scope with cancellation value excluded',async()=>{
  const a=await createBooking(tenant,input(await first()),randomUUID());
  await createBooking(tenant,input(await first(otherStaffId)),randomUUID());
  await admin(owner,{...identity(a),action:'cancel',reason:''},randomUUID());
  expect((await state(owner,tenant.id,day,false,0,'day')).metrics).toEqual({total:2,completed:0,cancelled:1,value:2500});
  expect((await state(worker,tenant.id,day,false,0,'day')).metrics).toEqual({total:1,completed:0,cancelled:1,value:0});
});
it('groups exact contact snapshots and isolates the customer register and export permissions',async()=>{
  await createBooking(tenant,input(await first()),randomUUID());
  await createBooking(tenant,input(await first(otherStaffId)),randomUUID());
  const list=await customerState(owner,{tenantId:tenant.id});
  expect(list.customers).toHaveLength(1);
  const customerId=list.customers![0].id;
  expect((await customerState(clerk,{tenantId:tenant.id,customerId})).history).toHaveLength(2);
  await expect(customerState(worker,{tenantId:tenant.id})).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(customerState(owner,{tenantId:foreign.id})).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
  await expect(customerState(clerk,{tenantId:tenant.id,format:'csv'})).rejects.toMatchObject({code:'FORBIDDEN'});
  expect((await customerState(owner,{tenantId:tenant.id,format:'csv'})).csv).toContain('Test Klient');
  expect(await withTenant(foreign.id,c=>c.query('SELECT id FROM customers WHERE id=$1',[customerId]).then(r=>r.rowCount))).toBe(0);
});
it('audits concurrent customer corrections without changing booking snapshots or notices',async()=>{
  const booking=await createBooking(tenant,input(await first()),randomUUID());
  const customer=(await customerState(owner,{tenantId:tenant.id})).customers![0];
  const command={tenantId:tenant.id,customerId:customer.id,version:1,name:'Parandatud nimi',email:'new@example.invalid',phone:'',reason:'Klient parandas nime'};
  const results=await Promise.allSettled([correctCustomer(owner,command),correctCustomer(clerk,{...command,name:'Teine nimi'})]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  const updated=await customerState(owner,{tenantId:tenant.id,customerId:customer.id});
  expect(updated.customers![0].version).toBe(2);expect(updated.events).toHaveLength(1);
  expect((await rawBooking(booking.id)).customer_name).toBe('Test Klient');expect((await counts(booking.id)).notices).toBe(1);
  await expect(correctCustomer(worker,command)).rejects.toMatchObject({code:'FORBIDDEN'});
});
it('does not merge contactless customers and searches literal wildcard characters',async()=>{
  for(const st of [staffId,otherStaffId])await admin(owner,{tenantId:tenant.id,action:'manual-create',...offerInput(await first(st)),name:'Sama nimi',email:null,phone:''},randomUUID());
  expect((await customerState(owner,{tenantId:tenant.id})).customers).toHaveLength(2);
  expect((await customerState(owner,{tenantId:tenant.id,search:'%'})).customers).toHaveLength(0);
  for(const value of ['=1+1','+123','-10','@SUM(A1)','  =2'])expect(csvCell(value)).toBe('"\''+value+'"');
  expect(csvCell('a"b')).toBe('"a""b"');
});

it('validates customer inputs and reports the actual notice queue state',async()=>{
  const booking=await createBooking(tenant,input(await first()),randomUUID());
  expect((await state(owner,tenant.id,day)).bookings[0].noticeStatus).toBe('pending');
  await db.query("UPDATE outbox SET status='failed' WHERE booking_id=$1",[booking.id]);
  expect((await state(owner,tenant.id,day)).bookings[0].noticeStatus).toBe('failed');
  await expect(customerState(owner,{tenantId:tenant.id,page:-1})).rejects.toMatchObject({code:'INVALID_INPUT'});
  await expect(customerState(owner,{tenantId:tenant.id,role:'owner'})).rejects.toMatchObject({code:'INVALID_INPUT'});
  await expect(correctCustomer(owner,{tenantId:tenant.id})).rejects.toMatchObject({code:'INVALID_INPUT'});
});
