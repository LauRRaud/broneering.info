import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import https from 'node:https';
import pg from 'pg';
assert.equal(process.env.CHAPTER26_ISOLATED,'1');
assert.match(new URL(process.env.MIGRATION_DATABASE_URL).pathname,/^\/chapter26_[a-f0-9]{12}$/);
const directory='output/chapter26',f=JSON.parse(await readFile(`${directory}/fixture.json`,'utf8')),t=f.tenants[0];
const state=JSON.parse(await readFile(`${directory}/owner-state.json`,'utf8'));
const session=state.cookies.find(cookie=>cookie.name==='__Secure-better-auth.session_token');
assert.ok(session?.value,'Owner session is required');
const cookie=`${session.name}=${session.value}`;
const day=new Date(Date.parse(f.day+'T12:00:00Z')+2*86400000).toISOString().slice(0,10),hostname='haldus.localhost:3443';
function request(path,index,body,key){return new Promise((resolve,reject)=>{
 const encoded=body?JSON.stringify(body):undefined;
 const req=https.request({host:'127.0.0.1',port:3443,servername:`${t.slug}.localhost`,rejectUnauthorized:false,localAddress:`127.0.2.${index+1}`,path,method:body?'POST':'GET',timeout:20000,
  headers:{Host:hostname,Origin:`https://${hostname}`,Cookie:cookie,...(encoded?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(encoded),'Idempotency-Key':key}:{})}},res=>{
  let data='';res.on('data',part=>data+=part);res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(data)});}catch{reject(Error('Non-JSON test response'));}});
 });req.on('error',reject);req.on('timeout',()=>req.destroy(Error('timeout')));req.end(encoded);
});}
const available=await request(`/api/admin/bookings?view=offers&tenantId=${t.id}&serviceId=${t.services[0]}&staffId=${t.staff[0]}&day=${day}`,0);
assert.equal(available.status,200);const offer=available.body.offers[4];assert.ok(offer);
const marker=`P26 race ${randomUUID()}`,input={action:'manual-create',tenantId:t.id,serviceId:offer.serviceId,staffId:offer.staffId,start:offer.start,expectedPrice:offer.price,expectedDuration:offer.duration,expectedRulesVersion:available.body.rulesVersion,name:marker,email:'p26-race@example.invalid'};
const keys=Array.from({length:50},()=>randomUUID()),start=Date.now();
const responses=await Promise.all(keys.map((key,index)=>request('/api/admin/bookings',index,input,key)));
const winners=responses.flatMap((response,index)=>response.status===200?[index]:[]);
assert.equal(winners.length,1,'Exactly one successful HTTP confirmation');
assert.equal(responses.filter(r=>r.status===409&&r.body.code==='SLOT_UNAVAILABLE').length,49);
const winner=responses[winners[0]].body;
const replay=await request('/api/admin/bookings',winners[0],input,keys[winners[0]]);
assert.equal(replay.status,200);assert.equal(replay.body.id,winner.id);
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await db.connect();
try{
 const counts=(await db.query(`SELECT (SELECT count(*)::int FROM bookings WHERE tenant_id=$1 AND customer_name=$3) bookings,
  (SELECT count(*)::int FROM booking_commands WHERE tenant_id=$1 AND booking_id=$2) commands,
  (SELECT count(*)::int FROM booking_events WHERE tenant_id=$1 AND booking_id=$2) events,
  (SELECT count(*)::int FROM outbox WHERE tenant_id=$1 AND booking_id=$2) outbox,
  (SELECT count(*)::int FROM outbox WHERE tenant_id=$1 AND booking_id=$2 AND status='sent') sent`,[t.id,winner.id,marker])).rows[0];
 assert.deepEqual(counts,{bookings:1,commands:1,events:1,outbox:1,sent:0});
 const report={at:new Date().toISOString(),runId:f.runId,phase:process.argv[2]||'unspecified',transport:'Authenticated owner HTTP through production-equivalent TLS proxy',requests:50,winners:1,conflicts:49,replaySameBooking:true,bookingId:winner.id,elapsedMs:Date.now()-start,counts,pass:true};
 await writeFile(`${directory}/concurrency-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await db.end();}
