import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {GET,POST,PUT,PATCH,DELETE} from '../src/app/api/admin/support/route';
import {GET as adminState} from '../src/app/api/admin/state/route';
import {POST as correctCustomer} from '../src/app/api/admin/customers/route';
import {POST as changeBooking} from '../src/app/api/admin/bookings/route';
import {getIdentity} from '../src/lib/auth';
import {authBaseUrl} from '../src/lib/auth-host';
import {ALL_PERMISSIONS,createSupportGrant,listSupportGrants,revokeSupportGrant,requireMembership,type Actor} from '../src/lib/access';
vi.mock('../src/lib/auth',()=>({getIdentity:vi.fn()}));
vi.mock('../src/lib/request-limits',()=>({limitTenant:vi.fn(async()=>{})}));
const actor:Actor={id:randomUUID(),email:'support-test@example.invalid',name:'Support test',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:true};
const other:Actor={...actor,id:randomUUID(),email:'other-support@example.invalid'};
const tenantId=randomUUID(),foreignId=randomUUID(),staffId=randomUUID(),serviceId=randomUUID(),bookingId=randomUUID();
const reason='Kontrollin kalendris puuduvat aega';
let grantId:string,customerId:string,db:pg.Client;
const request=(params:Record<string,string>={})=>{const {search='',...rest}=params;return new Request(`${authBaseUrl}/api/admin/support?`+new URLSearchParams({tenantId,grantId,view:'calendar',day:'2026-09-09',...rest}),{headers:{host:new URL(authBaseUrl).host,'x-support-search':encodeURIComponent(search)}});};
const write=(path:string,body:unknown)=>new Request(`${authBaseUrl}/api/admin/${path}`,{method:'POST',headers:{host:new URL(authBaseUrl).host,origin:authBaseUrl,'content-type':'application/json','idempotency-key':randomUUID()},body:JSON.stringify(body)});
beforeEach(()=>{vi.mocked(getIdentity).mockResolvedValue(actor);});
describe('support HTTP boundary',()=>{
  it('requires the exact administration host before identity lookup',async()=>{
    vi.mocked(getIdentity).mockClear();
    const response=await GET(new Request('https://demo.broneering.info/api/admin/support',{headers:{host:'demo.broneering.info'}}));
    expect(response.status).toBe(404);expect(getIdentity).not.toHaveBeenCalled();
  });
  it('requires a session',async()=>{vi.mocked(getIdentity).mockResolvedValue(null);expect((await GET(request())).status).toBe(401);});
  it('rejects search text in URLs and malformed search headers',async()=>{
    const normal=request();
    expect((await GET(new Request(normal.url+'&search=private',{headers:normal.headers}))).status).toBe(400);
    normal.headers.set('x-support-search','%ZZ');expect((await GET(normal)).status).toBe(400);
  });
  it.each([POST,PUT,PATCH,DELETE])('rejects every write method',async handler=>{
    const response=handler();expect(response.status).toBe(405);expect(response.headers.get('Allow')).toBe('GET');expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it.each<Record<string,string>>([{grantId:'bad'},{view:'billing'},{view:'customers',format:'csv'},{page:'-1'},{day:'2026-02-30'},{scope:'write'}])('rejects unsupported input %j',async params=>{
    expect((await GET(request({tenantId:'11111111-1111-4111-8111-111111111111',grantId:'11111111-1111-4111-8111-111111111111',...params}))).status).toBe(400);
  });
});
describe.skipIf(!process.env.DATABASE_URL||!process.env.MIGRATION_DATABASE_URL)('support real API/database boundaries',()=>{
  beforeAll(async()=>{
    db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await db.connect();
    await db.query("INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin) VALUES($1,'Support',$2,true,true,true),($3,'Other',$4,true,true,true)",[actor.id,actor.email,other.id,other.email]);
    await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Support tenant','Test'),($3,$4,'Foreign tenant','Test')",[tenantId,`support-${tenantId}`,foreignId,`support-${foreignId}`]);
    await db.query("INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,'Support staff')",[staffId,tenantId]);
    await db.query("INSERT INTO services(id,tenant_id,name,category,default_duration,default_price) VALUES($1,$2,'Support service','Test',30,1000)",[serviceId,tenantId]);
    await db.query(`INSERT INTO bookings(id,tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,start_at,end_at,occupied,price,duration,buffer_before,buffer_after)
      VALUES($1,$2,$3,$4,$5,'Support service','Support staff','Visible customer','visible@example.invalid','2026-09-09T09:00Z','2026-09-09T09:30Z',tstzrange('2026-09-09T09:00Z','2026-09-09T09:30Z','[)'),1000,30,0,0)`,[bookingId,tenantId,`BR-${bookingId}`,serviceId,staffId]);
    customerId=(await db.query('SELECT customer_id FROM bookings WHERE id=$1',[bookingId])).rows[0].customer_id;
    await db.query("INSERT INTO customers(tenant_id,source_key,name,email) VALUES($1,'foreign','Foreign secret','foreign@example.invalid')",[foreignId]);
    grantId=(await createSupportGrant(actor,tenantId,reason)).id;
  });
  it('opens real calendar and contacts without membership and audits only metadata',async()=>{
    const response=await GET(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
    const calendar=await response.json();expect(calendar.tenant.name).toBe('Support tenant');expect(calendar.grant.reason).toBe(reason);
    expect(calendar.bookings).toEqual([expect.objectContaining({id:bookingId,customerName:'Visible customer'})]);
    expect(Object.keys(calendar.bookings[0]).sort()).toEqual(['id','reference','serviceName','staffName','customerName','start','end','status'].sort());
    const contacts=await (await GET(request({view:'customers',search:'visible@example.invalid'}))).json();
    expect(contacts.customers).toEqual([{id:customerId,name:'Visible customer',email:'visible@example.invalid',phone:null}]);
    const audits=(await db.query("SELECT metadata FROM access_audit_log WHERE tenant_id=$1 AND action='support.view.read'",[tenantId])).rows;
    expect(audits).toHaveLength(2);expect(audits.map(r=>r.metadata.view).sort()).toEqual(['calendar','customers']);
    expect(JSON.stringify(audits)).not.toMatch(/Visible|visible@|Foreign|Kontrollin/);
    expect((await db.query('SELECT * FROM memberships WHERE user_id=$1',[actor.id])).rowCount).toBe(0);
    const refreshed=await (await adminState(new Request(`${authBaseUrl}/api/admin/state`,{headers:{host:new URL(authBaseUrl).host}}))).json();
    expect(refreshed.memberships).toEqual([]);expect(refreshed.supportGrants).toContainEqual(expect.objectContaining({id:grantId}));
  });
  it('binds the grant to its company and issuing platform user',async()=>{
    expect((await listSupportGrants(actor)).map(g=>g.id)).toContain(grantId);
    expect(await listSupportGrants(other)).toEqual([]);
    expect((await GET(request({tenantId:foreignId}))).status).toBe(404);
    vi.mocked(getIdentity).mockResolvedValue(other);expect((await GET(request())).status).toBe(404);
  });
  it.each(['disabled','email_verified','two_factor_enabled','is_platform_admin'])('rechecks fresh account flag %s despite a stale identity',async flag=>{
    await db.query(`UPDATE auth_user SET ${flag}=$2 WHERE id=$1`,[actor.id,flag==='disabled']);
    try{expect((await GET(request())).status).toBe(403);}finally{await db.query(`UPDATE auth_user SET ${flag}=$2 WHERE id=$1`,[actor.id,flag!=='disabled']);}
  });
  it('blocks ended company data access',async()=>{
    await db.query("UPDATE tenants SET booking_stops_at=now()-interval '3 days',service_ends_at=now()-interval '2 days',data_access_until=now()-interval '1 day',deletion_not_before=now(),exit_agreement='Test exit agreement',exit_approved_by=$2,exit_approved_at=now() WHERE id=$1",[tenantId,actor.id]);
    try{expect((await GET(request())).status).toBe(403);}finally{await db.query('UPDATE tenants SET booking_stops_at=NULL,service_ends_at=NULL,data_access_until=NULL,deletion_not_before=NULL,exit_agreement=NULL,exit_approved_by=NULL,exit_approved_at=NULL WHERE id=$1',[tenantId]);}
  });
  it('does not turn a support grant into any member permission or write access',async()=>{
    for(const permission of ALL_PERMISSIONS)await expect(requireMembership(actor,tenantId,permission)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
    const customerResponse=await correctCustomer(write('customers',{tenantId,customerId,version:1,name:'Changed customer',email:'changed@example.invalid',phone:'',reason:'Unauthorized support write'}));
    expect(customerResponse.status).toBe(403);
    const bookingResponse=await changeBooking(write('bookings',{tenantId,bookingId,action:'cancel',version:1,reason:'Unauthorized support write'}));
    expect(bookingResponse.status).toBe(403);
    expect((await db.query('SELECT status FROM bookings WHERE id=$1',[bookingId])).rows[0].status).toBe('confirmed');
    expect((await db.query('SELECT name FROM customers WHERE id=$1',[customerId])).rows[0].name).toBe('Visible customer');
    expect((await db.query('SELECT id FROM outbox WHERE tenant_id=$1',[tenantId])).rowCount).toBe(0);
  });
  it('bounds and paginates contacts with tenant isolation',async()=>{
    await db.query("INSERT INTO customers(tenant_id,source_key,name) SELECT $1,'page-'||n,'Page customer '||lpad(n::text,3,'0') FROM generate_series(1,51)n",[tenantId]);
    const a=await (await GET(request({view:'customers',search:'Page customer'}))).json();
    const b=await (await GET(request({view:'customers',search:'Page customer',page:'1'}))).json();
    expect(a.customers).toHaveLength(50);expect(a.hasMore).toBe(true);expect(b.customers).toHaveLength(1);expect(b.hasMore).toBe(false);
    expect(new Set([...a.customers,...b.customers].map(c=>c.id)).size).toBe(51);
  });
  it('revokes the grant for all subsequent reads, including stale tabs',async()=>{
    await revokeSupportGrant(actor,grantId);
    expect(await listSupportGrants(actor)).toEqual([]);
    for(const view of ['calendar','customers'])expect((await GET(request({view}))).status).toBe(404);
  });
  it('rejects an expired grant',async()=>{
    const expired=await createSupportGrant(actor,tenantId,reason);
    await db.query("UPDATE support_grants SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.id]);
    expect((await GET(request({grantId:expired.id}))).status).toBe(404);
    expect(await listSupportGrants(actor)).toEqual([]);
  });
  it('discards data when a grant expires while the read waits for a database lock',async()=>{
    const short=await createSupportGrant(actor,tenantId,reason);
    const blocker=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await blocker.connect();
    let pending:Promise<Response>|undefined;
    try{
      await blocker.query('BEGIN');await blocker.query('LOCK TABLE bookings IN ACCESS EXCLUSIVE MODE');
      await db.query("UPDATE support_grants SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[short.id]);
      pending=GET(request({grantId:short.id}));
      let waiting=false;
      for(let attempt=0;attempt<100;attempt++){
        const state=await db.query("SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE 'SELECT id,reference,service_name%'");
        if(state.rowCount){waiting=true;break;}
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      expect(waiting).toBe(true);
      await db.query('SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM (expires_at-clock_timestamp())))+0.05) FROM support_grants WHERE id=$1',[short.id]);
      await blocker.query('ROLLBACK');
      const response=await pending;expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({code:'GRANT_NOT_FOUND'});
      expect((await db.query("SELECT id FROM access_audit_log WHERE target_id=$1 AND action='support.view.read'",[short.id])).rowCount).toBe(0);
    }finally{await blocker.query('ROLLBACK');await blocker.end();await pending;}
  });
  afterAll(async()=>{
    if(!db)return;
    for(const table of ['access_audit_log','support_grants','bookings','customers','services','staff','tenants'])await db.query(`DELETE FROM ${table} WHERE ${table==='tenants'?'id':'tenant_id'}=ANY($1::uuid[])`,[[tenantId,foreignId]]);
    await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[actor.id,other.id]]);await db.end();
  });
});
