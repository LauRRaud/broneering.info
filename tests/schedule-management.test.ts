import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {DateTime} from 'luxon';
import {saveSchedule as save,scheduleState as state} from '../src/lib/schedule-management';
import {availableOffers,catalogFor} from '../src/lib/availability';
import {createBooking} from '../src/lib/bookings';
import {withTenant,pool} from '../src/lib/db';
import type {Actor} from '../src/lib/access';
import type {Tenant} from '../src/lib/tenants';
import type {Offer} from '../src/lib/contracts';
import type {TimeInterval} from '../src/lib/schedule-contracts';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
const day=DateTime.now().setZone('Europe/Tallinn').plus({days:7}).toISODate()!;
let tenant:Tenant,foreign:Tenant,owner:Actor,clerk:Actor,worker:Actor,staffId:string,otherStaffId:string,serviceId:string;
const week=(intervals:TimeInterval[]=[])=>Array.from({length:7},(_,i)=>({weekday:i+1,intervals}));
beforeAll(()=>db.connect());
afterAll(()=>db.end());
beforeEach(async()=>{
  const id=randomUUID(),other=randomUUID();
  tenant=(await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Schedule test','Test') RETURNING *",[id,'sch-'+id])).rows[0];
  foreign=(await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Other','Test') RETURNING *",[other,'sch-'+other])).rows[0];
  staffId=randomUUID();otherStaffId=randomUUID();serviceId=randomUUID();
  await db.query("INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,'Mari'),($3,$2,'Other staff')",[staffId,id,otherStaffId]);
  await db.query("INSERT INTO services(id,tenant_id,name,category) VALUES($1,$2,'Test service','Test')",[serviceId,id]);
  await db.query('INSERT INTO staff_services(tenant_id,staff_id,service_id,price,duration,buffer_before,buffer_after) VALUES($1,$2,$3,2500,30,5,10)',[id,staffId,serviceId]);
  const actors:Actor[]=[];
  for(const role of ['owner','receptionist','staff']){
    const userId=randomUUID(),actor={id:userId,name:role,email:userId+'@example.invalid',emailVerified:true,twoFactorEnabled:role==='owner',isPlatformAdmin:false};actors.push(actor);
    await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,$2,$3,true,$4)',[userId,role,actor.email,actor.twoFactorEnabled]);
    await db.query('INSERT INTO memberships(tenant_id,user_id,role,staff_id,permissions) VALUES($1,$2,$3,$4,$5)',[id,userId,role,role==='staff'?staffId:null,role==='receptionist'?'["schedules.manage"]':role==='staff'?'["schedules.own"]':'[]']);
  }
  [owner,clerk,worker]=actors;
  for(const st of [null,staffId,otherStaffId])await save(owner,'save-weekly',{tenantId:id,staffId:st,version:0,days:week([[540,720],[780,1080]])});
});
afterEach(async()=>{
  vi.useRealTimers();
  for(const table of ['booking_requests','outbox','bookings','access_audit_log','memberships','schedule_versions','schedule_exceptions','weekly_hours','staff_services','staff','services'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[[tenant.id,foreign.id]]);
  await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[[tenant.id,foreign.id]]);
  await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[owner.id,clerk.id,worker.id]]);
});
const input=(offer:Offer,version=1)=>({serviceId,staffId:offer.staffId,start:offer.start,expectedPrice:offer.price,expectedDuration:offer.duration,expectedRulesVersion:version,name:'Schedule Client',email:'schedule@example.invalid'});
const firstOffer=async()=>(await availableOffers(tenant,serviceId,day,staffId))[0];
const version=async(st:string|null)=>(await state(owner,tenant.id)).scopes.find(s=>s.staffId===st)!.version;
it('intersects location and staff hours and excludes pauses including buffers',async()=>{
  await save(owner,'save-weekly',{tenantId:tenant.id,staffId,version:1,days:week([[600,690],[810,990]])});
  const offers=await availableOffers(tenant,serviceId,day,staffId);
  expect(offers.length).toBeGreaterThan(0);
  for(const offer of offers){const t=DateTime.fromISO(offer.start).setZone(tenant.timezone),m=t.hour*60+t.minute;expect((m>=605&&m+40<=690)||(m>=815&&m+40<=990)).toBe(true);}
});
it('merges adjoining working intervals but rejects overlaps and invalid dates',async()=>{
  await save(owner,'save-weekly',{tenantId:tenant.id,staffId,version:1,days:week([[540,720],[720,1080]])});
  expect((await state(owner,tenant.id)).scopes.find(s=>s.staffId===staffId)?.days[0].intervals).toEqual([[540,1080]]);
  await expect(save(owner,'save-weekly',{tenantId:tenant.id,staffId,version:2,days:week([[540,800],[700,1080]])})).rejects.toMatchObject({code:'INVALID_INPUT'});
  await expect(save(owner,'save-exception',{tenantId:tenant.id,staffId,version:2,startDay:'2026-02-30',endDay:'2026-03-01',closed:true,intervals:[],kind:'other'})).rejects.toMatchObject({code:'INVALID_INPUT'});
  expect(await version(staffId)).toBe(2);
});
it('adds a vacation period without creating fake bookings and restores the weekly plan',async()=>{
  const endDay=DateTime.fromISO(day).plus({days:2}).toISODate()!;
  await save(worker,'save-exception',{tenantId:tenant.id,staffId,version:1,startDay:day,endDay,closed:true,intervals:[],kind:'vacation'});
  expect(await availableOffers(tenant,serviceId,day)).toEqual([]);
  expect((await state(worker,tenant.id)).scopes[0].exceptions).toHaveLength(3);
  expect((await db.query('SELECT count(*)::int n FROM bookings WHERE tenant_id=$1',[tenant.id])).rows[0].n).toBe(0);
  await save(worker,'reset-exception',{tenantId:tenant.id,staffId,version:2,startDay:day,endDay});
  expect((await availableOffers(tenant,serviceId,day)).length).toBeGreaterThan(0);
});
it('uses a changed-hours exception instead of the regular day and still respects a location closure',async()=>{
  await save(clerk,'save-exception',{tenantId:tenant.id,staffId,version:1,startDay:day,endDay:day,closed:false,intervals:[[780,900]],kind:'extra_work'});
  expect((await availableOffers(tenant,serviceId,day)).every(o=>DateTime.fromISO(o.start).setZone(tenant.timezone).hour>=13)).toBe(true);
  await save(clerk,'save-exception',{tenantId:tenant.id,staffId:null,version:1,startDay:day,endDay:day,closed:true,intervals:[],kind:'other'});
  expect(await availableOffers(tenant,serviceId,day)).toEqual([]);
});
it('limits staff to their own scope and checks fresh permissions on every write',async()=>{
  expect((await state(worker,tenant.id)).scopes.map(s=>s.staffId)).toEqual([staffId]);
  for(const st of [null,otherStaffId])await expect(save(worker,'save-weekly',{tenantId:tenant.id,staffId:st,version:1,days:week()})).rejects.toMatchObject({code:'FORBIDDEN'});
  await db.query("UPDATE memberships SET permissions='[]' WHERE tenant_id=$1 AND user_id=$2",[tenant.id,worker.id]);
  expect((await state(worker,tenant.id)).scopes[0].canEdit).toBe(false);
  await expect(save(worker,'save-weekly',{tenantId:tenant.id,staffId,version:1,days:week()})).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(save(clerk,'save-booking-rules',{tenantId:tenant.id,...(await state(owner,tenant.id)).rules})).rejects.toMatchObject({code:'FORBIDDEN'});
});
it('rejects foreign scopes and leaves unscoped schedule revisions invisible under RLS',async()=>{
  await expect(state(owner,foreign.id)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
  const foreignStaff=(await db.query("INSERT INTO staff(tenant_id,name) VALUES($1,'Foreign') RETURNING id",[foreign.id])).rows[0].id;
  await expect(save(owner,'save-weekly',{tenantId:tenant.id,staffId:foreignStaff,version:0,days:week()})).rejects.toMatchObject({code:'STAFF_NOT_FOUND'});
  expect((await pool().query('SELECT * FROM schedule_versions WHERE tenant_id=$1',[tenant.id])).rowCount).toBe(0);
  await withTenant(foreign.id,async c=>expect((await c.query('SELECT * FROM schedule_versions WHERE tenant_id=$1',[tenant.id])).rowCount).toBe(0));
});
it('rolls back a closure, its revision and audit when a confirmed booking would be affected',async()=>{
  const booking=await createBooking(tenant,input(await firstOffer()),randomUUID());
  const before=await version(staffId);
  await expect(save(owner,'save-exception',{tenantId:tenant.id,staffId,version:before,startDay:day,endDay:day,closed:true,intervals:[],kind:'illness'})).rejects.toMatchObject({code:'SCHEDULE_CONFLICT',conflicts:[{reference:booking.reference,staffName:'Mari'}],total:1});
  expect(await version(staffId)).toBe(before);
  expect((await state(owner,tenant.id)).scopes.find(s=>s.staffId===staffId)?.exceptions).toEqual([]);
  expect((await db.query("SELECT count(*)::int n FROM access_audit_log WHERE tenant_id=$1 AND action='schedule.save-exception'",[tenant.id])).rows[0].n).toBe(0);
});
it('detects buffer-only conflicts and rejects restoring a closed weekly day beneath an existing exception booking',async()=>{
  const offer=await firstOffer();await createBooking(tenant,input(offer),randomUUID());
  const start=DateTime.fromISO(offer.start).setZone(tenant.timezone),m=start.hour*60+start.minute;
  await expect(save(owner,'save-weekly',{tenantId:tenant.id,staffId,version:1,days:week([[m,1080]])})).rejects.toMatchObject({code:'SCHEDULE_CONFLICT'});
  const otherDay=DateTime.fromISO(day).plus({days:1}).toISODate()!;
  await save(owner,'save-exception',{tenantId:tenant.id,staffId,version:1,startDay:otherDay,endDay:otherDay,closed:false,intervals:[[540,1080]],kind:'extra_work'});
  const next=(await availableOffers(tenant,serviceId,otherDay,staffId))[0];await createBooking(tenant,input(next),randomUUID());
  const days=week([[540,720],[780,1080]]);days[DateTime.fromISO(otherDay).weekday-1].intervals=[];
  await save(owner,'save-weekly',{tenantId:tenant.id,staffId,version:2,days});
  await expect(save(owner,'reset-exception',{tenantId:tenant.id,staffId,version:3,startDay:otherDay,endDay:otherDay})).rejects.toMatchObject({code:'SCHEDULE_CONFLICT'});
});
it('allows only one writer of the same schedule version',async()=>{
  const results=await Promise.allSettled([[[540,720]],[[780,1080]]].map(intervals=>save(owner,'save-weekly',{tenantId:tenant.id,staffId,version:1,days:week(intervals as TimeInterval[])})));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'VERSION_CONFLICT'}});
});
it('serializes simultaneous closing and booking without creating a booking outside working hours',async()=>{
  const offer=await firstOffer();
  const results=await Promise.allSettled([save(owner,'save-weekly',{tenantId:tenant.id,staffId,version:1,days:week()}),createBooking(tenant,input(offer),randomUUID())]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  if(results[0].status==='fulfilled')expect(results[1]).toMatchObject({reason:{code:'SLOT_UNAVAILABLE'}});
  else expect(results[0].reason.code).toBe('SCHEDULE_CONFLICT');
});
it('refreshes catalogue rules and stores the confirmed cancellation deadline without changing existing bookings',async()=>{
  const offer=await firstOffer(),key=randomUUID();
  const existing=await createBooking(tenant,input(offer),key);
  const oldRules=(await state(owner,tenant.id)).rules;
  await save(owner,'save-booking-rules',{tenantId:tenant.id,...oldRules,cancellationHours:48,windowDays:10,stepMinutes:20});
  expect((await catalogFor(tenant)).tenant).toMatchObject({rulesVersion:2,cancellationHours:48});
  await expect(createBooking(tenant,input((await availableOffers(tenant,serviceId,day))[0]),randomUUID())).rejects.toMatchObject({code:'RULES_CHANGED'});
  const next=await createBooking(tenant,input((await availableOffers(tenant,serviceId,day))[0],2),randomUUID());
  expect(next.cancellationHours).toBe(48);
  expect((await createBooking(tenant,input(offer),key)).cancellationHours).toBe(24);
  expect(existing.cancellationHours).toBe(24);
});
it('validates timezone changes and refuses ones that move a booking outside local working hours',async()=>{
  await createBooking(tenant,input(await firstOffer()),randomUUID());
  const rules=(await state(owner,tenant.id)).rules;
  await expect(save(owner,'save-booking-rules',{tenantId:tenant.id,...rules,timezone:'Mars/Olympus'})).rejects.toMatchObject({code:'INVALID_INPUT'});
  await expect(save(owner,'save-booking-rules',{tenantId:tenant.id,...rules,timezone:'America/New_York'})).rejects.toMatchObject({code:'SCHEDULE_CONFLICT'});
  expect((await state(owner,tenant.id)).rules.timezone).toBe('Europe/Tallinn');
});
it('AT-07/08 rechecks the two-hour lead time after the user spends time in the form',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(DateTime.fromISO(day+'T13:00',{zone:'Europe/Tallinn'}).toJSDate());
  const offer=await firstOffer();expect(DateTime.fromISO(offer.start).setZone(tenant.timezone).hour).toBe(15);
  vi.setSystemTime(DateTime.fromISO(day+'T14:00',{zone:'Europe/Tallinn'}).toJSDate());
  await expect(createBooking(tenant,input(offer),randomUUID())).rejects.toMatchObject({code:'SLOT_UNAVAILABLE'});
});
