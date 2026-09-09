import pg from 'pg';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {DateTime} from 'luxon';

// This fixture is deliberately unavailable against a remote database or app.
const base=new URL(process.env.AUTH_BASE_URL!);
if(new URL(process.env.MIGRATION_DATABASE_URL!).hostname!=='127.0.0.1'||base.origin!=='http://haldus.localhost:3108')throw Error('Requires local database and http://haldus.localhost:3108');
const dir='output/playwright/acceptance-g03';await mkdir(dir,{recursive:true});
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await db.connect();
try{
 if(process.argv[2]==='proof'){
  const f=JSON.parse(await readFile(`${dir}/fixture.json`,'utf8')),ids=f.tenants.map((t:any)=>t.id);
  const bookings=(await db.query("SELECT is_test,source,count(*)::int count,bool_and(customer_email LIKE '%@example.invalid') synthetic_contacts FROM bookings WHERE tenant_id=ANY($1::uuid[]) GROUP BY is_test,source ORDER BY is_test,source",[ids])).rows;
  const outbox=(await db.query('SELECT status,recipient_kind,count(*)::int count FROM outbox WHERE tenant_id=ANY($1::uuid[]) GROUP BY status,recipient_kind ORDER BY status,recipient_kind',[ids])).rows;
  const events=(await db.query('SELECT action,count(*)::int count FROM booking_events WHERE tenant_id=ANY($1::uuid[]) GROUP BY action ORDER BY action',[ids])).rows;
  const proof={at:new Date().toISOString(),bookings,outbox,events};await writeFile(`${dir}/database-proof.json`,JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
 }else if(process.argv[2]==='cleanup'){
  const f=JSON.parse(await readFile(`${dir}/fixture.json`,'utf8'));
  await db.query('BEGIN');
  for(const table of ['booking_requests','booking_commands','outbox','booking_events','booking_management_tokens','access_audit_log','bookings','customers','support_grants','memberships','schedule_versions','schedule_exceptions','weekly_hours','staff_services','staff','services','tenant_domains','domain_reservations'])await db.query(`DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`,[f.tenants.map((t:any)=>t.id)]);
  await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[f.tenants.map((t:any)=>t.id)]);
  await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[Object.values(f.users).map((u:any)=>u.id)]);
  await db.query('COMMIT');
  const remaining=(await db.query('SELECT (SELECT count(*) FROM tenants WHERE id=ANY($1::uuid[]))::int tenants,(SELECT count(*) FROM auth_user WHERE id=ANY($2::text[]))::int users',[f.tenants.map((t:any)=>t.id),Object.values(f.users).map((u:any)=>u.id)])).rows[0];
  await writeFile(`${dir}/cleanup.json`,JSON.stringify({at:new Date().toISOString(),remaining},null,2));
  for(const filename of ['fixture.json','owner-state.json','receptionist-state.json','staff-state.json','platform-state.json'])await unlink(`${dir}/${filename}`);
  console.log('G03 synthetic fixtures and signed session files removed');
 }else{
  try{await readFile(`${dir}/fixture.json`);throw Error('Fixture already exists: clean up and remove its manifest before reseeding');}catch(e:any){if(e.code!=='ENOENT')throw e;}
  const day=DateTime.now().setZone('Europe/Tallinn').plus({days:7}).toISODate()!;
  const tenants:any[]=[],users:Record<string,any>={};
  await db.query('BEGIN');
  for(const label of ['A','B']){
   const t={id:randomUUID(),staff:[randomUUID(),randomUUID()],service:randomUUID(),bookings:[] as string[],customers:[] as string[],slug:`g03-${randomUUID()}`};
   await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,$3,'Synthetic test address')",[t.id,t.slug,`G03 ettevõte ${label}`]);
   await db.query("INSERT INTO tenant_domains(tenant_id,hostname) VALUES($1,$2)",[t.id,`${t.slug}.localhost`]);
   await db.query("INSERT INTO services(id,tenant_id,name,category,default_price,default_duration) VALUES($1,$2,'G03 lõikus','Test',2500,30)",[t.service,t.id]);
   for(const [i,st] of t.staff.entries()){
    await db.query('INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,$3)',[st,t.id,`G03 ${label} töötaja ${i+1}`]);
    await db.query('INSERT INTO staff_services(tenant_id,staff_id,service_id) VALUES($1,$2,$3)',[t.id,st,t.service]);
    await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,d,540,1080 FROM generate_series(1,7) d',[t.id,st]);
    const id=randomUUID();t.bookings.push(id);
    const b=(await db.query(`INSERT INTO bookings(id,tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,start_at,end_at,occupied,price,duration,buffer_before,buffer_after)
     VALUES($1,$2,$3,$4,$5,'G03 lõikus',$6,$7,$8,($9::date+time '10:00') AT TIME ZONE 'Europe/Tallinn',($9::date+time '10:30') AT TIME ZONE 'Europe/Tallinn',tstzrange(($9::date+time '10:00') AT TIME ZONE 'Europe/Tallinn',($9::date+time '10:30') AT TIME ZONE 'Europe/Tallinn','[)'),2500,30,0,0) RETURNING customer_id`,[id,t.id,`G03-${randomUUID()}`,t.service,st,`G03 ${label} töötaja ${i+1}`,`G03 ${label} klient ${i+1}`,`g03-${label}-${i}@example.invalid`,day])).rows[0];t.customers.push(b.customer_id);
   }
   await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) SELECT $1,NULL,d,540,1080 FROM generate_series(1,7) d',[t.id]);tenants.push(t);
  }
  for(const role of ['owner','receptionist','staff','platform']){
   const id=randomUUID(),token=randomBytes(32).toString('hex');
   await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin) VALUES($1,$2,$3,true,true,$4)',[id,`G03 ${role}`,`g03-${id}@example.invalid`,role==='platform']);
   if(role!=='platform')await db.query("INSERT INTO memberships(tenant_id,user_id,role,staff_id,permissions) VALUES($1,$2,$3,$4,'[]')",[tenants[0].id,id,role,role==='staff'?tenants[0].staff[0]:null]);
   await db.query("INSERT INTO auth_session(id,token,user_id,expires_at,updated_at,mfa_verified_at) VALUES($1,$2,$3,now()+interval '4 hours',now(),now())",[randomUUID(),token,id]);
   const cookie=encodeURIComponent(token+'.'+createHmac('sha256',process.env.AUTH_SECRET!).update(token).digest('base64'));
   users[role]={id,cookie};
   await writeFile(`${dir}/${role}-state.json`,JSON.stringify({cookies:[{name:'better-auth.session_token',value:cookie,domain:base.hostname,path:'/',expires:Math.floor(Date.now()/1000)+14400,httpOnly:true,secure:false,sameSite:'Lax'}],origins:[]}));
  }
  await db.query('COMMIT');await writeFile(`${dir}/fixture.json`,JSON.stringify({day,tenants,users}));console.log('Two synthetic tenants, four MFA sessions, four bookings ready');
 }
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
