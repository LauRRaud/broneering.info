import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {companyExitState,changeCompanyExit} from '../src/lib/company-exit';
import {tenantForHost,type Tenant} from '../src/lib/tenants';
import {requireMembership,listMemberships,type Actor} from '../src/lib/access';
import {requestExport} from '../src/lib/export-management';
import {insertBooking} from '../src/lib/bookings';
import {withTenant} from '../src/lib/db';
import {claimNotification,deliverNotification} from '../src/lib/notification-worker';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
let tenantId:string,owner:Actor,staffId:string,serviceId:string;
beforeAll(()=>db.connect());afterAll(()=>db.end());
beforeEach(async()=>{
 tenantId=randomUUID();staffId=randomUUID();serviceId=randomUUID();owner={id:randomUUID(),name:'Owner',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
 await db.query("INSERT INTO tenants(id,slug,name,address,public_state,demo,contact_email) VALUES($1,$2,'Exit company','Test','published',false,'contact@example.invalid')",[tenantId,'exit-'+tenantId]);
 await db.query('INSERT INTO tenant_domains(hostname,tenant_id,ready) VALUES($1,$2,true)',['exit-'+tenantId+'.localhost',tenantId]);
 await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,$2,$3,true,true)',[owner.id,owner.name,owner.email]);
 await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner')",[tenantId,owner.id]);
 await db.query("INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,'Staff')",[staffId,tenantId]);
 await db.query("INSERT INTO services(id,tenant_id,name,category) VALUES($1,$2,'Service','Test')",[serviceId,tenantId]);
 await db.query("INSERT INTO bookings(tenant_id,reference,staff_id,service_id,staff_name,service_name,customer_name,customer_email,start_at,end_at,occupied,price,duration,buffer_before,buffer_after) VALUES($1,$2,$3,$4,'Staff','Service','Customer','customer@example.invalid',now()+interval '7 days',now()+interval '7 days 30 minutes',tstzrange(now()+interval '7 days',now()+interval '7 days 30 minutes','[)'),1000,30,0,0)",[tenantId,randomUUID(),staffId,serviceId]);
});
afterEach(async()=>{
 for(const table of ['export_jobs','outbox','bookings','memberships','access_audit_log','staff','services','tenant_domains'])await db.query('DELETE FROM '+table+' WHERE tenant_id=$1',[tenantId]);
 await db.query('DELETE FROM tenants WHERE id=$1',[tenantId]);await db.query('DELETE FROM auth_user WHERE id=$1',[owner.id]);
});
const at=(days:number)=>new Date(Date.now()+days*86400000).toISOString();
const schedule=()=>({tenantId,version:1,action:'schedule',bookingStopsAt:at(-1),serviceEndsAt:at(2),dataAccessUntil:at(7),deletionNotBefore:at(30),agreement:'Contract termination agreed with owner',confirmed:true});
it('stops new booking immediately without deleting appointments, domains or temporary export access',async()=>{
 const state=await changeCompanyExit(owner,schedule());expect(state).toMatchObject({scheduled:true,bookingsStopped:true,serviceEnded:false,accessExpired:false,futureBookings:1});
 await expect(tenantForHost('exit-'+tenantId+'.localhost')).rejects.toMatchObject({status:404});
 const tenant=await tenantForHost('exit-'+tenantId+'.localhost','existing');expect(tenant.public_state).toBe('closed');expect(tenant.contact_email).toBe('contact@example.invalid');
 await expect(withTenant(tenantId,c=>insertBooking(c,tenant,{serviceId,staffId,name:'New customer',email:null},{} as never,'manual',owner.id))).rejects.toMatchObject({code:'BOOKINGS_PAUSED'});
 expect((await requestExport(owner,{tenantId,requestKey:randomUUID()})).id).toBeTruthy();
 expect((await db.query('SELECT status FROM bookings WHERE tenant_id=$1',[tenantId])).rows[0].status).toBe('confirmed');
 expect((await db.query('SELECT count(*)::int n FROM tenant_domains WHERE tenant_id=$1',[tenantId])).rows[0].n).toBe(1);
 await expect(changeCompanyExit(owner,schedule())).rejects.toMatchObject({code:'VERSION_CONFLICT'});
});
it('enforces expired data access without a worker and keeps only owner exit metadata readable',async()=>{
 await changeCompanyExit(owner,schedule());
 await db.query("UPDATE tenants SET booking_stops_at=now()-interval '3 days',service_ends_at=now()-interval '2 days',data_access_until=now()-interval '1 day' WHERE id=$1",[tenantId]);
 await expect(requireMembership(owner,tenantId,'customers.read')).rejects.toMatchObject({code:'DATA_ACCESS_ENDED'});
 await expect(requestExport(owner,{tenantId,requestKey:randomUUID()})).rejects.toMatchObject({code:'DATA_ACCESS_ENDED'});
 expect((await companyExitState(owner,tenantId))).toMatchObject({accessExpired:true,futureBookings:0});
 expect((await listMemberships(owner))[0].dataAccessExpired).toBe(true);
 await expect(changeCompanyExit(owner,{...schedule(),version:2})).rejects.toMatchObject({code:'DATA_ACCESS_ENDED'});
 await db.query("UPDATE memberships SET role='receptionist' WHERE tenant_id=$1",[tenantId]);
 await expect(companyExitState(owner,tenantId)).rejects.toMatchObject({code:'FORBIDDEN'});
});
it('requires ordered dates and preserves paused publication on cancellation',async()=>{
 await expect(changeCompanyExit(owner,{...schedule(),dataAccessUntil:at(1)})).rejects.toMatchObject({code:'INVALID_EXIT_DATES'});
 await changeCompanyExit(owner,schedule());
 expect(await changeCompanyExit(owner,{tenantId,version:2,action:'cancel'})).toMatchObject({scheduled:false,bookingsStopped:false});
 expect((await db.query('SELECT public_state FROM tenants WHERE id=$1',[tenantId])).rows[0].public_state).toBe('paused');
});
it('suppresses queued notifications after the contracted service end',async()=>{
 await changeCompanyExit(owner,schedule());
 await db.query("UPDATE tenants SET service_ends_at=now()-interval '1 hour' WHERE id=$1",[tenantId]);
 await db.query("INSERT INTO outbox(tenant_id,booking_id,booking_version,kind) SELECT tenant_id,id,version,'booking.confirmed' FROM bookings WHERE tenant_id=$1",[tenantId]);
 let sends=0;expect(await deliverNotification((await claimNotification(tenantId))!,async()=>{sends++;return 'capture';})).toBe('skipped');expect(sends).toBe(0);
 expect((await db.query('SELECT last_error_code FROM outbox WHERE tenant_id=$1',[tenantId])).rows[0].last_error_code).toBe('SERVICE_ENDED');
});
