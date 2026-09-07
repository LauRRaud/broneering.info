import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {DateTime} from 'luxon';
import pg from 'pg';
import {saveServiceManagement as save,serviceManagementState as state} from '../src/lib/service-management';
import {catalogFor,availableOffers} from '../src/lib/availability';
import {createBooking} from '../src/lib/bookings';
import {pool,withTenant} from '../src/lib/db';
import type {Actor} from '../src/lib/access';
import type {Tenant} from '../src/lib/tenants';
import type {Offer} from '../src/lib/contracts';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
let tenant:Tenant,foreign:Tenant,owner:Actor,clerk:Actor,worker:Actor;
let groupId:string,serviceId:string,staffId:string,foreignStaffId:string;
const day=DateTime.now().setZone('Europe/Tallinn').plus({days:7}).toISODate()!;
beforeAll(()=>db.connect());
afterAll(()=>db.end());
beforeEach(async()=>{
  const id=randomUUID(),other=randomUUID();
  tenant=(await db.query('INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,$3,$4) RETURNING *',[id,'svc-'+id,'Service test','Test'])).rows[0];
  foreign=(await db.query('INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,$3,$4) RETURNING *',[other,'svc-'+other,'Foreign test','Test'])).rows[0];
  const actors=[];
  for(const role of ['owner','receptionist','staff']){
    const userId=randomUUID(),actor={id:userId,name:role,email:userId+'@example.invalid',emailVerified:true,twoFactorEnabled:role==='owner',isPlatformAdmin:false};
    actors.push(actor);
    await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,$2,$3,true,$4)',[userId,role,actor.email,actor.twoFactorEnabled]);
    await db.query('INSERT INTO memberships(tenant_id,user_id,role,permissions) VALUES($1,$2,$3,$4)',[id,userId,role,role==='receptionist'?'["services.manage"]':'[]']);
  }
  [owner,clerk,worker]=actors;
  groupId=(await save(owner,'save-group',{tenantId:id,name:'Juuksed',active:true})).id;
  serviceId=(await save(owner,'save-service',{tenantId:id,groupId,name:'Lõikus',description:'Kirjeldus',defaultPrice:2500,defaultDuration:30,bufferBefore:5,bufferAfter:10,active:true,online:true})).id;
  staffId=(await save(owner,'save-staff',{tenantId:id,name:'Mari',title:'Juuksur',bio:'Avalik tutvustus',photoUrl:'https://example.invalid/photo.jpg',active:true,online:true})).id;
  foreignStaffId=(await db.query("INSERT INTO staff(tenant_id,name) VALUES($1,'Foreign') RETURNING id",[other])).rows[0].id;
  await save(owner,'save-assignment',{tenantId:id,serviceId,staffId,version:0,price:null,duration:null,bufferBefore:null,bufferAfter:null,active:true});
  for(const st of [null,staffId])await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) VALUES($1,$2,$3,540,1080)',[id,st,DateTime.fromISO(day).weekday]);
});
afterEach(async()=>{
  const ids=[tenant.id,foreign.id];
  for(const table of ['booking_requests','outbox','bookings','access_audit_log','memberships','weekly_hours','staff_services','staff','services','service_groups'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[ids]);
  await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[ids]);
  await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[owner.id,clerk.id,worker.id]]);
});
const input=(o:Offer)=>({serviceId:o.serviceId,staffId:o.staffId,start:o.start,expectedPrice:o.price,expectedDuration:o.duration,expectedRulesVersion:1,name:'Test Client',email:'test@example.invalid'});
async function service(){return (await state(owner,tenant.id)).services[0];}
async function assignment(){return (await state(owner,tenant.id)).assignments[0];}
it('inherits defaults independently and preserves explicit employee overrides',async()=>{
  expect((await availableOffers(tenant,serviceId,day))[0]).toMatchObject({price:2500,duration:30});
  await save(owner,'save-assignment',{tenantId:tenant.id,...await assignment(),price:3100,duration:null});
  const s=await service();
  await save(owner,'save-service',{tenantId:tenant.id,...s,defaultPrice:4000,defaultDuration:45});
  expect((await availableOffers(tenant,serviceId,day))[0]).toMatchObject({price:3100,duration:45});
  await save(owner,'save-assignment',{tenantId:tenant.id,...await assignment(),price:null});
  expect((await catalogFor(tenant)).services[0]).toMatchObject({priceFrom:4000,durationFrom:45});
});
it('allows delegated pricing but rejects structural changes, forged roles and revoked access',async()=>{
  expect((await state(clerk,tenant.id)).canEditStructure).toBe(false);
  await save(clerk,'save-pricing',{tenantId:tenant.id,serviceId,version:1,price:2800,duration:40});
  await expect(save(clerk,'save-service',{tenantId:tenant.id,...await service(),name:'Forbidden'})).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(save(worker,'save-pricing',{tenantId:tenant.id,serviceId,version:2,price:1,duration:5})).rejects.toMatchObject({code:'FORBIDDEN'});
  await db.query("UPDATE memberships SET permissions='[]' WHERE tenant_id=$1 AND user_id=$2",[tenant.id,clerk.id]);
  await expect(state(clerk,tenant.id)).rejects.toMatchObject({code:'FORBIDDEN'});
  await db.query('UPDATE auth_user SET two_factor_enabled=false WHERE id=$1',[owner.id]);
  await expect(state(owner,tenant.id)).rejects.toMatchObject({code:'MFA_REQUIRED'});
});
it('keeps tenant boundaries on reads, groups, staff assignments and raw RLS queries',async()=>{
  await expect(state(owner,foreign.id)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
  await expect(save(owner,'save-assignment',{tenantId:tenant.id,...await assignment(),staffId:foreignStaffId,version:0})).rejects.toMatchObject({code:'ASSIGNMENT_INVALID'});
  const foreignGroup=(await db.query("INSERT INTO service_groups(tenant_id,name) VALUES($1,'Foreign') RETURNING id",[foreign.id])).rows[0].id;
  await expect(save(owner,'save-service',{tenantId:tenant.id,...await service(),groupId:foreignGroup})).rejects.toMatchObject({code:'GROUP_NOT_FOUND'});
  expect((await pool().query('SELECT * FROM service_groups WHERE tenant_id=$1',[tenant.id])).rowCount).toBe(0);
  await withTenant(tenant.id,async c=>expect((await c.query('SELECT * FROM service_groups WHERE tenant_id=$1',[foreign.id])).rowCount).toBe(0));
});
it('rejects invalid values and unknown fields before changing the catalogue',async()=>{
  for(const patch of [{defaultPrice:-1},{defaultPrice:1.1},{defaultDuration:4},{bufferBefore:241},{extra:'not allowed'}])await expect(save(owner,'save-service',{tenantId:tenant.id,...await service(),...patch})).rejects.toMatchObject({code:'INVALID_INPUT'});
  const st=(await state(owner,tenant.id)).staff[0];
  await expect(save(owner,'save-staff',{tenantId:tenant.id,...st,photoUrl:'javascript:alert(1)'})).rejects.toMatchObject({code:'INVALID_INPUT'});
  expect((await service()).defaultPrice).toBe(2500);
});
it('accepts only one concurrent update of the same version and audits the successful write',async()=>{
  const s=await service();
  const results=await Promise.allSettled([2700,2900].map(defaultPrice=>save(owner,'save-service',{tenantId:tenant.id,...s,defaultPrice})));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'VERSION_CONFLICT'}});
  expect((await db.query("SELECT count(*)::int n FROM access_audit_log WHERE tenant_id=$1 AND action='catalog.save-service'",[tenant.id])).rows[0].n).toBe(2);
});
it('retains historical price, names, duration and inherited buffers after editing and archiving',async()=>{
  const offer=(await availableOffers(tenant,serviceId,day))[0];
  const booking=await createBooking(tenant,input(offer),randomUUID());
  await save(owner,'save-service',{tenantId:tenant.id,...await service(),name:'New name',defaultPrice:9900,defaultDuration:60,bufferBefore:0,bufferAfter:0,active:false});
  const st=(await state(owner,tenant.id)).staff[0];
  await save(owner,'save-staff',{tenantId:tenant.id,...st,name:'New employee name',active:false});
  expect((await catalogFor(tenant)).services).toEqual([]);
  const row=(await db.query('SELECT service_name,staff_name,price,duration,buffer_before,buffer_after,status FROM bookings WHERE id=$1',[booking.id])).rows[0];
  expect(row).toEqual({service_name:'Lõikus',staff_name:'Mari',price:2500,duration:30,buffer_before:5,buffer_after:10,status:'confirmed'});
});
it('rejects a stale public price and excludes archived associations at confirmation',async()=>{
  const offer=(await availableOffers(tenant,serviceId,day))[0];
  await save(owner,'save-pricing',{tenantId:tenant.id,serviceId,version:1,price:3500,duration:30});
  await expect(createBooking(tenant,input(offer),randomUUID())).rejects.toMatchObject({code:'OFFER_CHANGED'});
  await save(owner,'save-assignment',{tenantId:tenant.id,...await assignment(),active:false});
  expect((await availableOffers(tenant,serviceId,day))).toEqual([]);
  await expect(createBooking(tenant,{...input(offer),expectedPrice:3500},randomUUID())).rejects.toMatchObject({code:'SLOT_UNAVAILABLE'});
});
it('hides archived groups and online-hidden services without deleting their records',async()=>{
  await save(owner,'save-group',{tenantId:tenant.id,id:groupId,version:1,name:'Renamed group',active:true});
  expect((await catalogFor(tenant)).services[0].category).toBe('Renamed group');
  await save(owner,'save-group',{tenantId:tenant.id,id:groupId,version:2,name:'Renamed group',active:false});
  expect((await catalogFor(tenant)).services).toEqual([]);
  expect((await availableOffers(tenant,serviceId,day))).toEqual([]);
  await save(owner,'save-group',{tenantId:tenant.id,id:groupId,version:3,name:'Renamed group',active:true});
  await save(owner,'save-service',{tenantId:tenant.id,...await service(),online:false});
  expect((await catalogFor(tenant)).services).toEqual([]);
  expect((await service()).active).toBe(true);
});
it('publishes only the selected public staff profile fields',async()=>{
  const st=(await catalogFor(tenant)).staff[0];
  expect(st.bio).toBe('Avalik tutvustus');
  expect(st.photoUrl).toBe('https://example.invalid/photo.jpg');
  expect(Object.keys(st).sort()).toEqual(['bio','id','name','photoUrl','serviceIds','title']);
});
it('serializes a concurrent price change and booking confirmation without mixed snapshots',async()=>{
  const offer=(await availableOffers(tenant,serviceId,day))[0];
  const results=await Promise.allSettled([
    save(owner,'save-pricing',{tenantId:tenant.id,serviceId,version:1,price:3600,duration:45}),
    createBooking(tenant,input(offer),randomUUID()),
  ]);
  expect(results[0].status).toBe('fulfilled');
  if(results[1].status==='fulfilled')expect(results[1].value).toMatchObject({price:2500,duration:30});
  else expect(results[1].reason.code).toBe('OFFER_CHANGED');
  expect((await service()).defaultPrice).toBe(3600);
});

it('supports nested groups, repeated names under different parents and inherited archiving',async()=>{
  const child=(await save(owner,'save-group',{tenantId:tenant.id,name:'Klassikalised ripsmepikendused',parentId:groupId,active:true})).id;
  const otherRoot=(await save(owner,'save-group',{tenantId:tenant.id,name:'Teine kategooria',active:true})).id;
  await save(owner,'save-group',{tenantId:tenant.id,name:'Klassikalised ripsmepikendused',parentId:otherRoot,active:true});
  await save(owner,'save-service',{tenantId:tenant.id,...await service(),groupId:child,name:'Hooldus'});
  expect((await catalogFor(tenant)).services[0].category).toBe('Juuksed / Klassikalised ripsmepikendused');
  await save(owner,'save-group',{tenantId:tenant.id,id:groupId,version:1,name:'Ripsmed',active:false});
  expect((await catalogFor(tenant)).services).toEqual([]);
  expect((await availableOffers(tenant,serviceId,day))).toEqual([]);
  expect((await state(owner,tenant.id)).groups.find(g=>g.id===child)?.path).toBe('Ripsmed / Klassikalised ripsmepikendused');
  await withTenant(foreign.id,async c=>expect((await c.query('SELECT * FROM service_group_tree WHERE tenant_id=$1',[tenant.id])).rowCount).toBe(0));
});
it('rejects group cycles and foreign parents without disturbing existing branches',async()=>{
  const child=(await save(owner,'save-group',{tenantId:tenant.id,name:'Alamgrupp',parentId:groupId,active:true})).id;
  await expect(save(owner,'save-group',{tenantId:tenant.id,id:groupId,version:1,name:'Juuksed',parentId:child,active:true})).rejects.toMatchObject({code:'GROUP_CYCLE'});
  await expect(save(owner,'save-group',{tenantId:tenant.id,id:groupId,version:1,name:'Juuksed',parentId:groupId,active:true})).rejects.toMatchObject({code:'GROUP_CYCLE'});
  const foreignGroup=(await db.query("INSERT INTO service_groups(tenant_id,name) VALUES($1,'Foreign') RETURNING id",[foreign.id])).rows[0].id;
  await expect(save(owner,'save-group',{tenantId:tenant.id,name:'Forbidden',parentId:foreignGroup,active:true})).rejects.toMatchObject({code:'GROUP_NOT_FOUND'});
  expect((await catalogFor(tenant)).services).toHaveLength(1);
});
