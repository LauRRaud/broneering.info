import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import https from 'node:https';
import {setTimeout as delay} from 'node:timers/promises';
import pg from 'pg';
import {DateTime} from 'luxon';
import {closePool,withTenant} from '../src/lib/db';
import {claimExport,produceExport} from '../src/lib/export-worker';
import {runTenantBilling} from '../src/lib/billing-worker';
import {billingAccess} from '../src/lib/billing-access';
import {recordPayment} from '../src/lib/payments';
import {monthlyPeriod,STANDARD_PLAN} from '../src/lib/billing-rules';
import {importLifecycle} from '../src/lib/import-lifecycle';

assert.equal(process.env.CHAPTER26_ISOLATED,'1');
const connection=new URL(process.env.MIGRATION_DATABASE_URL!);
assert.equal(connection.hostname,'127.0.0.1');assert.match(connection.pathname,/^\/chapter26_[a-f0-9]{12}$/);
const dir='output/chapter26',f=JSON.parse(await readFile(`${dir}/fixture.json`,'utf8')),t=f.tenants[0];
const db=new pg.Client({connectionString:connection.href});await db.connect();
const checks:any[]=[];let serial=0;
async function request(path:string,method='GET',body?:unknown,status=200,role='owner',publicHost?:string){
 const host=publicHost??'haldus.localhost:3443',csv=typeof body==='string',encoded=body===undefined?undefined:csv?body:JSON.stringify(body);
 const result=await new Promise<{status:number;body:any;text:string;headers:any}>((resolve,reject)=>{
  const req=https.request({host:'127.0.0.1',port:3443,servername:host.split(':')[0],rejectUnauthorized:false,localAddress:`127.0.3.${1+(serial++%200)}`,path,method,timeout:20000,
   headers:{Host:host,Origin:`https://${host}`,...(publicHost?{}:{Cookie:`__Secure-better-auth.session_token=${f.users[role].cookie}`}),...(encoded===undefined?{}:{'Content-Type':csv?'text/csv':'application/json','Content-Length':Buffer.byteLength(encoded),'Idempotency-Key':randomUUID()})}},res=>{
    let text='';res.on('data',part=>text+=part);res.on('end',()=>{let parsed;try{parsed=JSON.parse(text);}catch{}resolve({status:res.statusCode!,body:parsed,text,headers:res.headers});});
   });req.on('error',reject);req.on('timeout',()=>req.destroy(Error('timeout')));req.end(encoded);
 });
 assert.equal(result.status,status,`${method} ${path}: ${result.body?.code??result.text.slice(0,80)}`);
 checks.push({path:path.split('?')[0],method,status});return result;
}
async function prepared(kind:string,csv:string){
 const batch=(await request(`/api/admin/imports?tenantId=${t.id}&kind=${kind}`,'POST',csv,201)).body;
 const mapping=Object.fromEntries(csv.split('\n')[0].split(',').map((name,index)=>[name,index]));
 const preview=(await request('/api/admin/imports','PATCH',{tenantId:t.id,id:batch.id,version:1,mapping,timezone:'Europe/Tallinn',cutoverAt:new Date().toISOString()})).body;
 return {command:{tenantId:t.id,id:batch.id,version:2,skipInvalid:false,skipDuplicates:false},preview};
}
const count=async(table:string,tenant=t.id)=>(await db.query(`SELECT count(*)::int n FROM ${table} WHERE tenant_id=$1`,[tenant])).rows[0].n;
try{
 const phase=process.argv[2];assert.ok(['import-export','billing','exit'].includes(phase));
 if(phase==='import-export'){
  // Cancel only unfinished synthetic batches left by a stopped acceptance attempt.
  for(const batch of (await db.query("SELECT id,version FROM import_batches WHERE tenant_id=$1 AND status IN ('uploaded','preview')",[t.id])).rows){
   await importLifecycle(f.users.owner,{tenantId:t.id,id:batch.id,version:batch.version,action:'cancel'});
  }
  const marker=`P26 import ${randomUUID()}`,before={customers:await count('customers'),bookings:await count('bookings'),outbox:await count('outbox')};
  const csv=`externalId,name,email\n${marker},${marker},p26-import@example.invalid\nbad-row,X,invalid`;
  const batch=await prepared('customers',csv);assert.equal(batch.preview.errors,1);
  assert.equal((await request('/api/admin/imports','PUT',batch.command,409)).body.code,'IMPORT_REVIEW_REQUIRED');
  assert.equal(await count('customers'),before.customers);
  const command={...batch.command,skipInvalid:true};
  const a=(await request('/api/admin/imports','PUT',command)).body,b=(await request('/api/admin/imports','PUT',command)).body;
  assert.deepEqual(a,b);assert.equal(a.imported,1);assert.equal(a.rejected,1);
  const duplicate=await prepared('customers',csv.split('\n').slice(0,2).join('\n'));
  await request('/api/admin/imports','PUT',duplicate.command,409);
  assert.equal(await count('customers'),before.customers+1);
  await request(`/api/admin/imports?tenantId=${t.id}&kind=customers`,'POST','name,name\nBad,Bad',400);
  const publicOffers=(await request(`/api/admin/bookings?view=offers&tenantId=${t.id}&serviceId=${t.services[0]}&staffId=${t.staff[1]}&day=${f.day}`)).body;
  const offer=publicOffers.offers[5];assert.ok(offer);
  const localStart=DateTime.fromISO(offer.start).setZone('Europe/Tallinn').toISO();
  const bookingCsv=`externalId,serviceId,staffId,name,email,startAt,priceCents,duration\n${marker}-booking,${offer.serviceId},${offer.staffId},${marker},p26-import@example.invalid,${localStart},${offer.price},${offer.duration}`;
  const booking=await prepared('bookings',bookingCsv);
  const committed=(await request('/api/admin/imports','PUT',booking.command)).body;assert.equal(committed.imported,1);
  assert.deepEqual((await request('/api/admin/imports','PUT',booking.command)).body,committed);
  assert.equal(await count('bookings'),before.bookings+1);assert.equal(await count('outbox'),before.outbox);
  const row=(await db.query("SELECT id,source,customer_notifications,is_test FROM bookings WHERE tenant_id=$1 AND customer_name=$2",[t.id,marker])).rows[0];
  assert.equal(row.source,'import');assert.equal(row.customer_notifications,false);assert.equal(row.is_test,false);
  for(let prior=await claimExport(t.id);prior;prior=await claimExport(t.id))assert.equal(await produceExport(prior),'ready');
  const job=(await request('/api/admin/exports','POST',{tenantId:t.id,requestKey:randomUUID()},202)).body;
  const claim=await claimExport(t.id);assert.equal(claim?.id,job.id);assert.equal(await produceExport(claim!),'ready');
  const downloaded=await request(`/api/admin/exports?tenantId=${t.id}&download=${job.id}`);
  assert.match(downloaded.headers['content-type'],/application\/x-ndjson/);
  const records=downloaded.text.trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(records[0].tenantId,t.id);assert.equal(records[0].type,'manifest');
  const exported=records.filter(r=>r.type==='bookings');assert.equal(exported.length,before.bookings+1);assert.ok(exported.some(r=>r.data.id===row.id));
  const ids=new Set(records.filter(r=>r.type==='customers').map(r=>r.data.id));assert.ok(exported.every(r=>!r.data.customer_id||ids.has(r.data.customer_id)));
  assert.ok(!records.some(r=>/auth|session|token/.test(r.type)));
  await request(`/api/admin/exports?tenantId=${t.id}&download=${job.id}`,'GET',undefined,403,'receptionist');
  const report={at:new Date().toISOString(),phase,runId:f.runId,checks,before,after:{customers:await count('customers'),bookings:await count('bookings'),outbox:await count('outbox')},export:{id:job.id,records:records.length,bookings:exported.length,bytes:Buffer.byteLength(downloaded.text),sha256:createHash('sha256').update(downloaded.text).digest('hex'),customerRelations:true},pass:true};
  await writeFile(`${dir}/operations-import-export.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }else if(phase==='billing'){
  // An additional synthetic historical subscription; never rewrite the measured 100-company dataset.
  const id=randomUUID(),today=DateTime.now().setZone('Europe/Tallinn'),start=today.startOf('month').minus({months:2}).toISODate()!,period=monthlyPeriod(start);
  const recipient={name:'P26 billing buyer',registrationCode:'P26',address:'Synthetic address',country:'EE',vatNumber:'',email:'p26-billing@example.invalid'};
  await db.query("INSERT INTO tenants(id,slug,name,address,demo,public_state) VALUES($1,$2,'P26 billing lifecycle','Synthetic address',false,'published')",[id,'p26-billing-'+id]);
  await db.query("INSERT INTO subscriptions(tenant_id,plan_id,plan_version,status,period_start,period_end,anchor_day,billing_contact_name,billing_email,billing_recipient) VALUES($1,$2,1,'limited',$3,$4,1,$5,$6,$7)",[id,STANDARD_PLAN.id,start,period.end,recipient.name,recipient.email,JSON.stringify(recipient)]);
  const first=await Promise.all([runTenantBilling(id),runTenantBilling(id)]);assert.equal(first.filter(r=>r.issued).length,2);
  assert.equal((await runTenantBilling(id)).issued,true);assert.equal((await runTenantBilling(id)).issued,false);
  const invoices=(await db.query('SELECT id,version,period_start::text,total FROM invoices WHERE tenant_id=$1 ORDER BY period_start',[id])).rows;
  assert.equal(invoices.length,3);assert.equal(new Set(invoices.map(r=>r.period_start)).size,3);assert.ok(invoices.every(r=>r.total===3500));
  const evaluationDate=today.plus({days:8});assert.ok(evaluationDate.isValid);
  const access=()=>withTenant(id,c=>billingAccess(c,{id,timezone:'Europe/Tallinn'},evaluationDate));
  assert.equal((await access()).reason,'overdue');
  for(const invoice of invoices){
   const payment={tenantId:id,requestKey:randomUUID(),invoiceId:invoice.id,invoiceVersion:invoice.version,amount:3500,receivedOn:today.toISODate(),bankEntryId:'P26-SYNTHETIC-'+invoice.id,reference:'Synthetic accounting test; no transfer',allowOverpayment:false,confirmed:true};
   await recordPayment(f.users.platform,payment);await recordPayment(f.users.platform,payment);
  }
  assert.equal(await count('payment_records',id),3);assert.equal((await access()).allowed,true);assert.equal((await access()).reason,'paid');
  const report={at:new Date().toISOString(),phase,tenantId:id,periods:invoices.map(r=>r.period_start),invoiceCount:3,paymentCount:3,repeatIdempotent:true,overdueCheckedAt:today.plus({days:8}).toISO(),paidAccess:true,provider:'No external payment provider; real internal ledger functions',pass:true};
  await writeFile(`${dir}/operations-billing.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }else{
  const before=await count('bookings'),state=(await request(`/api/admin/exit?tenantId=${t.id}`)).body;
  const now=Date.now(),at=(ms:number)=>new Date(now+ms).toISOString();
  const schedule={tenantId:t.id,version:state.version,action:'schedule',bookingStopsAt:at(-1000),serviceEndsAt:at(8000),dataAccessUntil:at(16000),deletionNotBefore:at(86400000),agreement:'Synthetic acceptance deadlines only, no real company termination',confirmed:true};
  const scheduled=(await request('/api/admin/exit','POST',schedule)).body;assert.equal(scheduled.bookingsStopped,true);
  await request('/api/catalog','GET',undefined,404,'owner',`${t.slug}.localhost:3443`);
  const job=(await request('/api/admin/exports','POST',{tenantId:t.id,requestKey:randomUUID()},202)).body;
  const claim=await claimExport(t.id);assert.equal(claim?.id,job.id);assert.equal(await produceExport(claim!),'ready');
  await request(`/api/admin/exports?tenantId=${t.id}&download=${job.id}`);
  const remaining=now+17000-Date.now();if(remaining>0)await delay(remaining);
  await request(`/api/admin/exports?tenantId=${t.id}&download=${job.id}`,'GET',undefined,403);
  await request('/api/admin/exports','POST',{tenantId:t.id,requestKey:randomUUID()},403);
  await request(`/api/admin/bookings?view=list&tenantId=${t.id}&day=${f.day}`,'GET',undefined,403);
  const ended=(await request(`/api/admin/exit?tenantId=${t.id}`)).body;assert.equal(ended.accessExpired,true);
  assert.equal(await count('bookings'),before);
  assert.equal((await db.query('SELECT 1 FROM domain_reservations WHERE tenant_id=$1 AND hostname=$2',[t.id,`${t.slug}.localhost`])).rowCount,1);
  assert.equal((await db.query('SELECT 1 FROM tenant_domains WHERE tenant_id=$1',[t.id])).rowCount,1);
  const report={at:new Date().toISOString(),phase,checks,schedule,ended,bookingsPreserved:before,domainStillReserved:true,clock:'Real elapsed clock, no mocked timers or deadline DB edits',pass:true};
  await writeFile(`${dir}/operations-exit.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }
}finally{await db.end();await closePool();}
