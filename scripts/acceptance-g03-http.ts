import pg from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
const base='http://haldus.localhost:3108',dir='output/playwright/acceptance-g03';
if(process.env.AUTH_BASE_URL!==base||new URL(process.env.MIGRATION_DATABASE_URL!).hostname!=='127.0.0.1')throw Error('Local G03 environment required');
const f=JSON.parse(await readFile(`${dir}/fixture.json`,'utf8')),[a,b]=f.tenants;
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await db.connect();
const results:any[]=[];
function publicRequest(host:string,path:string,method:string,origin:string,body:unknown):Promise<Response>{
 return new Promise((resolve,reject)=>{
  const req=httpRequest({hostname:'127.0.0.1',port:3108,path,method,headers:{host,origin,'content-type':'application/json','idempotency-key':randomUUID()}},res=>{
   const chunks:Buffer[]=[];res.on('data',chunk=>chunks.push(chunk));res.on('error',reject);res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers as Record<string,string>})));
  });req.on('error',reject);req.setTimeout(30000,()=>req.destroy(Error('Public request timed out')));req.end(body===undefined?undefined:JSON.stringify(body));
 });
}
async function check(label:string,role:string,path:string,expected:number,body?:unknown,options:{method?:string;origin?:string;host?:string;verify?:(v:any)=>void}={}){
 const method=options.method??(body===undefined?'GET':'POST');
 try{
  const response=options.host?await publicRequest(options.host,path,method,options.origin??`http://${options.host}`,body):await fetch(base+path,{method,redirect:'manual',headers:{...(f.users[role]?{cookie:`better-auth.session_token=${f.users[role].cookie}`}:{ }),origin:options.origin??base,'content-type':'application/json','idempotency-key':randomUUID(),'x-booking-language':'et'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await response.text();let value:any;try{value=JSON.parse(raw);}catch{value=raw;}
  const row:any={label,role,method,path,host:options.host??'haldus.localhost:3108',status:response.status,expected,code:value?.code??null,pass:false};results.push(row);
  try{assert.equal(response.status,expected);assert.match(response.headers.get('cache-control')??'',/no-store/);options.verify?.(value);row.pass=true;}catch(e){row.failure=String(e);}
  return value;
 }catch(e){results.push({label,role,method,path,expected,pass:false,failure:String(e)});}
}
async function fingerprint(){
 const data:any={};
 for(const table of ['tenants','memberships','services','staff','staff_services','weekly_hours','customers','bookings','outbox','booking_events','booking_commands','retention_policies','tenant_embed_origins'])data[table]=(await db.query(`SELECT to_jsonb(t) row FROM ${table} t WHERE ${table==='tenants'?'id':'tenant_id'}=ANY($1::uuid[]) ORDER BY to_jsonb(t)::text`,[[a.id,b.id]])).rows;
 return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
try{
 const before=await fingerprint();
 const reads=[
  {path:'state',allow:['owner','receptionist','staff']},
  {path:`bookings&view=list&day=${f.day}`,allow:['owner','receptionist','staff']},
  {path:'customers',allow:['owner','receptionist']},
  {path:'customers&format=csv',allow:['owner']},
  ...['exports','imports','imports&setup=1','imports&template=customers','notifications','retention','exit','billing','subscription'].map(path=>({path,allow:['owner']})),
  {path:'language',allow:['owner','receptionist','staff']},
 ];
 for(const read of reads){
  const [route,...query]=read.path.split('&');
  for(const role of ['owner','receptionist','staff','platform','anonymous']){
   for(const t of [a,b]){
    if(role==='anonymous'&&route==='state')continue; // Public identity bootstrap is intentionally 200.
    const expected=role==='anonymous'?401:t===a&&read.allow.includes(role)?200:403;
    await check(`read ${t===a?'own':'foreign'} ${read.path}`,role,`/api/admin/${route}?tenantId=${t.id}${query.length?'&'+query.join('&'):''}`,expected,undefined,{verify:value=>{
     if(expected!==200)assert.ok(!JSON.stringify(value).includes('g03-A-')&&!JSON.stringify(value).includes('g03-B-'));
     if(expected===200&&route==='bookings'){assert.equal(value.bookings.length,role==='staff'?1:2);assert.ok(value.bookings.every((x:any)=>x.staffId===a.staff[0]||role!=='staff'));}
     if(expected===200&&route==='state'){assert.equal(!!value.members,role==='owner');assert.equal(!!value.catalog,role==='owner');}
    }});
   }
  }
 }
 const writes=(t:any)=>[
  ['save-group',{tenantId:t.id,name:'Forbidden group',active:true}],
  ['save-pricing',{tenantId:t.id,serviceId:t.service,version:1,price:9999,duration:60}],
  ['embedding-settings',{tenantId:t.id,origins:['https://g03.example.invalid']}],
  ['save-exception',{tenantId:t.id,staffId:null,version:0,startDay:f.day,endDay:f.day,closed:true,intervals:[],kind:'other'}],
  ['booking-policy',{tenantId:t.id,version:1,contactEmail:'g03@example.invalid',contactPhone:'',linkHours:24}],
  ['retention',{tenantId:t.id,version:0,retainDays:365,legalHold:false,confirmed:true}],
  ['notifications',{action:'settings',tenantId:t.id,version:1,notificationEmail:'g03@example.invalid',reminderMinutes:null}],
  ['language',{tenantId:t.id,defaultLanguage:'ru'}],
  ['exports',{tenantId:t.id,requestKey:randomUUID()}],
  ['update-permissions',{tenantId:t.id,userId:f.users.staff.id,permissions:['schedules.own']}],
  ['revoke-member',{tenantId:t.id,userId:f.users.staff.id}],
 ] as const;
 for(const t of [a,b])for(const role of ['owner','receptionist','staff','platform']){
  if(t===a&&role==='owner')continue;
  for(const [path,body] of writes(t))await check(`denied write ${t===a?'own':'foreign'}`,role,`/api/admin/${path}`,403,body);
 }
 const edit=(t:any,customerId=t.customers[0])=>({tenantId:t.id,customerId,version:1,name:'Forbidden correction',email:'g03@example.invalid',phone:'',reason:'G03 access test'});
 for(const role of ['owner','receptionist','staff','platform']){
  await check('foreign customer correction',role,'/api/admin/customers',403,edit(b));
  await check('foreign cancellation',role,'/api/admin/bookings',403,{action:'cancel',tenantId:b.id,bookingId:b.bookings[0],version:1});
 }
 for(const role of ['staff','platform'])await check('own tenant customer correction denied',role,'/api/admin/customers',403,edit(a));
 await check('foreign customer ID with own tenant','owner','/api/admin/customers',404,edit(a,b.customers[0]));
 await check('foreign booking ID with own tenant','owner','/api/admin/bookings',404,{action:'cancel',tenantId:a.id,bookingId:b.bookings[0],version:1});
 await check('another employee cancellation','staff','/api/admin/bookings',403,{action:'cancel',tenantId:a.id,bookingId:a.bookings[1],version:1});
 await check('another employee history','staff',`/api/admin/bookings?view=history&tenantId=${a.id}&bookingId=${a.bookings[1]}`,403);
 await check('another employee calendar','staff',`/api/admin/bookings?view=list&tenantId=${a.id}&staffId=${a.staff[1]}&day=${f.day}`,403);
 await check('CSRF origin','owner','/api/admin/customers',403,edit(a),{origin:'https://foreign.example.invalid'});
 await check('anonymous mutation','anonymous','/api/admin/customers',401,edit(a));
 const host=`${a.slug}.localhost:3108`;
 const availability=await check('public availability excludes customer fields','anonymous',`/api/availability?serviceId=${a.service}&date=${f.day}`,200,undefined,{host,verify:v=>{
  assert.ok(v.offers.length>0);assert.ok(v.offers.every((o:any)=>o.serviceId===a.service&&a.staff.includes(o.staffId)));
  assert.ok(!/customer|email|phone|reference/i.test(JSON.stringify(v)));
 }});
 if(availability?.offers?.length){
  const o=availability.offers[0],input={serviceId:o.serviceId,staffId:o.staffId,start:o.start,expectedPrice:o.price,expectedDuration:o.duration,expectedRulesVersion:1,name:'G03 API Test',email:'g03-api@example.invalid'};
  await check('foreign employee on valid public booking form','anonymous','/api/bookings',409,{...input,staffId:b.staff[0]},{host,verify:v=>assert.equal(v.code,'STAFF_UNAVAILABLE')});
  await check('injected tenant ID on public booking form','anonymous','/api/bookings',400,{...input,tenantId:b.id},{host,verify:v=>assert.equal(v.code,'INVALID_INPUT')});
  await check('cross-origin public booking','anonymous','/api/bookings',403,input,{host,origin:'https://foreign.example.invalid',verify:v=>assert.equal(v.code,'ORIGIN_REJECTED')});
 }
 const after=await fingerprint();results.push({label:'all negative writes leave business rows unchanged',before,after,pass:before===after});
 // Prove valid forms can reach a successful write, then restore synthetic data.
 const original=(await db.query('SELECT * FROM customers WHERE id=$1',[a.customers[0]])).rows[0];
 for(const role of ['owner','receptionist']){
  await check('allowed customer correction',role,'/api/admin/customers',200,{...edit(a),name:`G03 ${role} corrected`},{verify:v=>assert.equal(v.customer.version,2)});
  await db.query('UPDATE customers SET name=$2,email=$3,phone=$4,version=$5,updated_at=$6 WHERE id=$1',[original.id,original.name,original.email,original.phone,original.version,original.updated_at]);
 }
 // Session is unchanged throughout revocation and reactivation.
 try{
  await db.query('UPDATE memberships SET active=false WHERE tenant_id=$1 AND user_id=$2',[a.id,f.users.staff.id]);
  await check('live membership revoked, same session','staff',`/api/admin/bookings?view=list&tenantId=${a.id}&day=${f.day}`,403);
 }finally{await db.query('UPDATE memberships SET active=true WHERE tenant_id=$1 AND user_id=$2',[a.id,f.users.staff.id]);}
 try{
  await db.query('UPDATE auth_user SET disabled=true WHERE id=$1',[f.users.receptionist.id]);
  await check('account disabled, same session','receptionist',`/api/admin/customers?tenantId=${a.id}`,401);
 }finally{await db.query('UPDATE auth_user SET disabled=false WHERE id=$1',[f.users.receptionist.id]);}
}finally{
 await db.end();await writeFile(`${dir}/http-results.json`,JSON.stringify({at:new Date().toISOString(),base,realHttp:true,authMocked:false,total:results.length,passed:results.filter(r=>r.pass).length,results},null,2));
 console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.pass).length,failures:results.filter(r=>!r.pass)},null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
}
