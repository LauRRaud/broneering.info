import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
assert.equal(process.env.CHAPTER26_ISOLATED,'1');
const dir=process.env.P26_RECOVERY_DIR;assert.match(dir,/^\/app\/output\/chapter26\/recovery-[a-f0-9]{32}$/);
const f=JSON.parse(await readFile(`${dir}/restored-session.json`,'utf8')),checks=[];
async function request(path,status,{authenticated=true,publicHost=false,body}={}){
 const hostname=publicHost?`${f.slug}.localhost:3443`:'haldus.localhost:3443',encoded=body?JSON.stringify(body):undefined;
 const result=await new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:3111,path,method:body?'POST':'GET',timeout:15000,headers:{Host:hostname,Origin:`https://${hostname}`,...(authenticated?{Cookie:`__Secure-better-auth.session_token=${f.cookie}`} :{}),...(encoded?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(encoded),'Idempotency-Key':randomUUID()}:{})}},res=>{
   let text='';res.on('data',part=>text+=part);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));
  });req.on('error',reject);req.on('timeout',()=>req.destroy(Error('timeout')));req.end(encoded);
 });assert.equal(result.status,status,`${path}: ${result.body?.code}`);checks.push({path:path.split('?')[0],status});return result.body;
}
await request('/api/ready',200,{authenticated:false});
await request(`/api/admin/bookings?view=list&tenantId=${f.tenantId}&day=${f.day}`,401,{authenticated:false});
await request(`/api/admin/bookings?view=list&tenantId=${f.tenantId}&day=${f.day}`,200);
const available=await request(`/api/availability?serviceId=${f.serviceId}&staffId=${f.staffId}&date=${f.day}`,200,{authenticated:false,publicHost:true});
assert.ok(available.offers.length);
const admin=await request(`/api/admin/bookings?view=offers&tenantId=${f.tenantId}&serviceId=${f.serviceId}&staffId=${f.staffId}&day=${f.day}`,200),offer=admin.offers[2];assert.ok(offer);
const booking=await request('/api/admin/bookings',200,{body:{tenantId:f.tenantId,action:'manual-create',serviceId:offer.serviceId,staffId:offer.staffId,start:offer.start,expectedPrice:offer.price,expectedDuration:offer.duration,expectedRulesVersion:admin.rulesVersion,name:'P26 restored application booking',email:null,sendEmail:false}});
const list=await request(`/api/admin/bookings?view=list&tenantId=${f.tenantId}&day=${f.day}`,200);assert.ok(list.bookings.some(b=>b.id===booking.id));
const report={at:new Date().toISOString(),checks,newBookingVisible:true,publicOffers:available.offers.length,pass:true,transport:'Actual isolated app HTTP on server loopback port 3111'};
await writeFile(`${dir}/http-verified.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
