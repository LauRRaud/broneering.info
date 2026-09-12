import assert from 'node:assert/strict';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {DateTime} from 'luxon';
import {closePool} from '../src/lib/db';
import {billingIssuerState,saveBillingIssuer} from '../src/lib/billing-config';
import {createSubscription} from '../src/lib/subscriptions';
import {saveBillingRecipient,previewInvoice,issueInvoice} from '../src/lib/invoices';
import {recordPayment} from '../src/lib/payments';

const connection=new URL(process.env.MIGRATION_DATABASE_URL!);
assert.equal(process.env.CHAPTER26_ISOLATED,'1');
assert.match(connection.pathname,/^\/chapter26_[a-f0-9]{12}$/);
assert.ok(['127.0.0.1','db'].includes(connection.hostname));
const directory='output/chapter26',base=new URL(process.env.AUTH_BASE_URL!);
assert.equal(base.origin,'https://haldus.localhost:3443');
await mkdir(directory,{recursive:true});
const db=new pg.Client({connectionString:connection.href});await db.connect();
try{
 assert.equal((await db.query('SELECT current_database() name')).rows[0].name,connection.pathname.slice(1));
 if(process.argv[2]==='renew-sessions'){
  const f=JSON.parse(await readFile(`${directory}/fixture.json`,'utf8'));
  for(const [role,actor] of Object.entries(f.users) as Array<[string,any]>){
   assert.ok(actor.email.endsWith('@example.invalid'));
   assert.equal((await db.query('SELECT id FROM auth_user WHERE id=$1 AND email=$2',[actor.id,actor.email])).rowCount,1);
   const token=randomBytes(32).toString('hex');
   const cookie=encodeURIComponent(token+'.'+createHmac('sha256',process.env.AUTH_SECRET!).update(token).digest('base64'));
   await db.query('DELETE FROM auth_session WHERE user_id=$1',[actor.id]);
   await db.query("INSERT INTO auth_session(id,token,user_id,expires_at,updated_at,mfa_verified_at) VALUES($1,$2,$3,now()+interval '12 hours',now(),now())",[randomUUID(),token,actor.id]);
   actor.cookie=cookie;
   await writeFile(`${directory}/${role}-state.json`,JSON.stringify({cookies:[{name:'__Secure-better-auth.session_token',value:cookie,domain:base.hostname,path:'/',expires:Math.floor(Date.now()/1000)+43200,httpOnly:true,secure:true,sameSite:'Lax'}],origins:[]}),{mode:0o600});
  }
  await writeFile(`${directory}/fixture.json`,JSON.stringify(f),{mode:0o600});
  console.log(JSON.stringify({renewed:Object.keys(f.users),at:new Date().toISOString()}));
 }else if(process.argv[2]==='proof'){
  const f=JSON.parse(await readFile(`${directory}/fixture.json`,'utf8'));
  const proof=(await db.query(`SELECT (SELECT count(*)::int FROM tenants) tenants,
   (SELECT count(*)::int FROM bookings WHERE start_at<current_date) historical_bookings,
   (SELECT count(*)::int FROM bookings WHERE start_at>=current_date) future_bookings,
   (SELECT count(*)::int FROM staff) staff,(SELECT count(*)::int FROM services) services,
   (SELECT count(*)::int FROM customers) customers,(SELECT count(*)::int FROM invoices) invoices,
   (SELECT count(*)::int FROM payment_records) payments,pg_database_size(current_database())::text database_bytes,
   (SELECT bool_and(NOT demo) FROM tenants) commercial_billing_enabled,
   (SELECT bool_and(customer_email LIKE '%@example.invalid') FROM bookings WHERE customer_email IS NOT NULL) synthetic_contacts`)).rows[0];
  assert.equal(proof.tenants,100);assert.equal(proof.historical_bookings,100000);
  const outbox=(await db.query('SELECT status,count(*)::int count FROM outbox GROUP BY status')).rows;
  const report={at:new Date().toISOString(),runId:f.runId,...proof,outbox};
  await writeFile(`${directory}/database-proof.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }else{
  assert.equal((await db.query('SELECT count(*)::int n FROM tenants')).rows[0].n,0,'Seed only an empty isolated database');
  const began=Date.now(),today=DateTime.now().setZone('Europe/Tallinn').toISODate()!,day=DateTime.fromISO(today).plus({days:7}).toISODate()!;
  const users:Record<string,any>={},tenants:any[]=[],runId=randomUUID();
  for(const role of ['owner','receptionist','staff','platform']){
   const actor={id:randomUUID(),name:`P26 ${role}`,email:`p26-${randomUUID()}@example.invalid`,emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:role==='platform'};
   const token=randomBytes(32).toString('hex'),cookie=encodeURIComponent(token+'.'+createHmac('sha256',process.env.AUTH_SECRET!).update(token).digest('base64'));
   await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin) VALUES($1,$2,$3,true,true,$4)',[actor.id,actor.name,actor.email,actor.isPlatformAdmin]);
   await db.query("INSERT INTO auth_session(id,token,user_id,expires_at,updated_at,mfa_verified_at) VALUES($1,$2,$3,now()+interval '12 hours',now(),now())",[randomUUID(),token,actor.id]);
   users[role]={...actor,cookie};
   await writeFile(`${directory}/${role}-state.json`,JSON.stringify({cookies:[{name:'__Secure-better-auth.session_token',value:cookie,domain:base.hostname,path:'/',expires:Math.floor(Date.now()/1000)+43200,httpOnly:true,secure:true,sameSite:'Lax'}],origins:[]}),{mode:0o600});
  }
  const issuerVersion=(await billingIssuerState(users.platform)).issuer?.version??0;
  await saveBillingIssuer(users.platform,{requestKey:randomUUID(),expectedVersion:issuerVersion,settings:{issuer:{name:'P26 synthetic issuer',registrationCode:'TEST26',address:'Test street 26',country:'EE',vatNumber:'',email:'issuer@example.invalid'},iban:'GB82WEST12345698765432',numberPrefix:'P26',vatRegistered:false,taxRateBasisPoints:0,taxNote:'Synthetic acceptance data only.'},approvalNote:'Synthetic isolated acceptance accounting configuration',confirmed:true});
  for(let index=0;index<100;index++){
   const t={id:randomUUID(),slug:`p26-${String(index).padStart(3,'0')}-${runId.slice(0,8)}`,name:`P26 ettevõte ${index}`,staff:Array.from({length:5},()=>randomUUID()),services:[randomUUID(),randomUUID()],bookings:[] as string[]};
   await db.query('BEGIN');
   try{
    await db.query("INSERT INTO tenants(id,slug,name,address,demo,public_state,contact_email) VALUES($1,$2,$3,'Synthetic test address',false,'published','contact@example.invalid')",[t.id,t.slug,t.name]);
    await db.query('INSERT INTO tenant_domains(tenant_id,hostname,ready) VALUES($1,$2,true)',[t.id,`${t.slug}.localhost`]);
    for(const [i,service] of t.services.entries())await db.query('INSERT INTO services(id,tenant_id,name,category,default_price,default_duration,buffer_before,buffer_after) VALUES($1,$2,$3,\'P26\',$4,$5,5,5)',[service,t.id,`P26 ${index} teenus ${i}`,i?3500:2500,i?45:30]);
    await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) SELECT $1,NULL,d,540,1080 FROM generate_series(1,7) d',[t.id]);
    for(const [i,staff] of t.staff.entries()){
     await db.query('INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,$3)',[staff,t.id,`P26 ${index} töötaja ${i}`]);
     await db.query('INSERT INTO staff_services(tenant_id,staff_id,service_id) VALUES($1,$2,$3)',[t.id,staff,t.services[0]]);
     if(i<2)await db.query('INSERT INTO staff_services(tenant_id,staff_id,service_id) VALUES($1,$2,$3)',[t.id,staff,t.services[1]]);
     await db.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,d,a,b FROM generate_series(1,7) d CROSS JOIN (VALUES(540,720),(780,1080)) h(a,b)',[t.id,staff]);
     if(i===4&&index%5===0)await db.query("INSERT INTO schedule_exceptions(tenant_id,staff_id,day,closed) VALUES($1,$2,$3::date+1,true)",[t.id,staff,day]);
    }
    // 1,000 history rows per tenant, 100 customers, 100 days, 5 employees.
    // No constraint/trigger/index is disabled. Contact profiles use the real insert trigger.
    await db.query(`WITH source AS (SELECT i,($4::date-1-(i/10)+time '10:00'+((i%10)/5)*interval '1 hour') AT TIME ZONE 'Europe/Tallinn' start FROM generate_series(0,999) i)
     INSERT INTO bookings(tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,start_at,end_at,occupied,price,duration,buffer_before,buffer_after,is_test)
     SELECT $1::uuid,'P26H-'||$1::uuid::text||'-'||i,$2::uuid,($3::uuid[])[(i%5)+1],$5,'P26 history staff '||(i%5),'P26 customer '||(i%100),'p26-'||$1::uuid::text||'-'||(i%100)||'@example.invalid',start,start+interval '30 minutes',tstzrange(start-interval '5 minutes',start+interval '35 minutes','[)'),2500,30,5,5,true FROM source`,[t.id,t.services[0],t.staff,today,`P26 ${index} teenus 0`]);
    const future=await db.query(`WITH source AS (SELECT i,($4::date+time '10:00'+(i/5)*interval '4 hours') AT TIME ZONE 'Europe/Tallinn' start FROM generate_series(0,9) i)
     INSERT INTO bookings(tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,start_at,end_at,occupied,price,duration,buffer_before,buffer_after,is_test)
     SELECT $1::uuid,'P26F-'||$1::uuid::text||'-'||i,$2::uuid,($3::uuid[])[(i%5)+1],$5,'P26 future staff '||(i%5),'P26 future customer '||i,'p26-future-'||$1::uuid::text||'-'||i||'@example.invalid',start,start+interval '30 minutes',tstzrange(start-interval '5 minutes',start+interval '35 minutes','[)'),2500,30,5,5,true FROM source RETURNING id`,[t.id,t.services[0],t.staff,day,`P26 ${index} teenus 0`]);
    t.bookings=future.rows.map(row=>row.id);
    if(index===0)for(const role of ['owner','receptionist','staff'])await db.query('INSERT INTO memberships(tenant_id,user_id,role,staff_id) VALUES($1,$2,$3,$4)',[t.id,users[role].id,role,role==='staff'?t.staff[0]:null]);
    await db.query('COMMIT');
   }catch(error){await db.query('ROLLBACK');throw error;}
   // Exercise the sold Standard plan's real invoice ledger, not demo/legacy shortcuts.
   const recipient={name:`P26 buyer ${index}`,registrationCode:`TEST${index}`,address:'Synthetic test street',country:'EE',vatNumber:'',email:`buyer-${index}@example.invalid`};
   const subscription=await createSubscription(users.platform,{tenantId:t.id,requestKey:randomUUID(),start:today,billingName:recipient.name,billingEmail:recipient.email,confirmed:true});
   await saveBillingRecipient(users.platform,{tenantId:t.id,requestKey:randomUUID(),version:subscription.subscription!.version,recipient},true);
   const preview=await previewInvoice(users.platform,t.id);
   const invoice=await issueInvoice(users.platform,{tenantId:t.id,requestKey:randomUUID(),fingerprint:preview.fingerprint,confirmed:true});
   await recordPayment(users.platform,{tenantId:t.id,requestKey:randomUUID(),invoiceId:invoice.id,invoiceVersion:invoice.version,amount:3500,receivedOn:today,bankEntryId:`P26-SYNTHETIC-${t.id}`,reference:'Synthetic acceptance entry, no bank transfer',allowOverpayment:false,confirmed:true});
   tenants.push(t);
   if((index+1)%10===0)console.log(JSON.stringify({seededTenants:index+1,historicalBookings:(index+1)*1000,seconds:Math.round((Date.now()-began)/1000)}));
  }
  await db.query('ANALYZE');
  await writeFile(`${directory}/fixture.json`,JSON.stringify({runId,today,day,tenants,users,seedSeconds:(Date.now()-began)/1000}),{mode:0o600});
  await writeFile(`${directory}/dataset.json`,JSON.stringify({at:new Date().toISOString(),runId,tenants:100,historicalBookings:100000,futureBookings:1000,staffPerTenant:5,servicesPerTenant:2,historicalDays:100,historyCustomersPerTenant:100,weeklyHours:'09–12 and 13–18 every day, location 09–18',exceptions:'Employee 4 is closed on day+1 in every fifth tenant',commercialBilling:'Standard 35 EUR plan, real issued invoice and synthetic recorded payment in isolated DB',seedSeconds:(Date.now()-began)/1000},null,2));
 }
}finally{await db.end();await closePool();}
