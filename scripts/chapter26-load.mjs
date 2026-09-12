import assert from 'node:assert/strict';
import https from 'node:https';
import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';

assert.equal(process.env.CHAPTER26_ISOLATED,'1');
const directory='output/chapter26',fixture=JSON.parse(await readFile(`${directory}/fixture.json`,'utf8'));
assert.equal(fixture.tenants.length,100);
const agents=fixture.tenants.map(()=>new https.Agent({keepAlive:true,maxSockets:4}));
const dayAt=offset=>new Date(Date.parse(fixture.day+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
const quantile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]??null;};
const formatDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Tallinn'});
let stopped='',healthFailures=0;
const health=[];
async function productionHealth(){
 const began=performance.now();
 const result=await new Promise(resolve=>{
  const req=https.get('https://broneering.info/api/ready',{timeout:3000},res=>{
   let body='';res.on('data',data=>body+=data);res.on('end',()=>resolve({status:res.statusCode,ready:res.statusCode===200&&body.includes('"ready"')}));
  });req.on('timeout',()=>req.destroy(Error('timeout')));req.on('error',()=>resolve({status:0,ready:false}));
 });
 health.push({at:new Date().toISOString(),...result,ms:performance.now()-began});
 healthFailures=result.ready?0:healthFailures+1;
 if(healthFailures>=2)stopped='Two consecutive production readiness failures';
 await writeFile(`${directory}/production-health-during-load.json`,JSON.stringify(health,null,2));
}
async function sample(sequence,scheduledAt){
 const index=sequence%100,t=fixture.tenants[index],round=Math.floor(sequence/100);
 const serviceIndex=round%2,day=dayAt(Math.floor(round/2)%3),staffIndex=sequence%4===0?sequence%(serviceIndex?2:5):null;
 const params=new URLSearchParams({serviceId:t.services[serviceIndex],date:day});
 if(staffIndex!==null)params.set('staffId',t.staff[staffIndex]);
 const begin=performance.now();
 const reply=await new Promise(resolve=>{
  const req=https.request({host:'127.0.0.1',port:3443,servername:`${t.slug}.localhost`,rejectUnauthorized:false,
   localAddress:`127.0.1.${index+1}`,agent:agents[index],path:`/api/availability?${params}`,headers:{Host:`${t.slug}.localhost:3443`},timeout:15000},res=>{
   let body='';res.on('data',data=>body+=data);res.on('end',()=>resolve({status:res.statusCode,body}));
  });req.on('timeout',()=>req.destroy(Error('timeout')));req.on('error',error=>resolve({status:0,body:'',failure:error.code||error.message}));req.end();
 });
 const ended=performance.now();let valid=false,offerCount=0,error=reply.failure||'';
 try{
  const value=JSON.parse(reply.body);
  const eligible=staffIndex!==null?[t.staff[staffIndex]]:t.staff.slice(0,serviceIndex?2:5);
  valid=reply.status===200&&Array.isArray(value.offers)&&value.offers.length>0&&value.offers.every(offer=>
   Object.keys(offer).sort().join(',')==='duration,end,price,serviceId,staffId,staffName,start'&&
   offer.serviceId===t.services[serviceIndex]&&eligible.includes(offer.staffId)&&offer.staffName.startsWith(`P26 ${index} töötaja `)&&
   offer.price===(serviceIndex?3500:2500)&&offer.duration===(serviceIndex?45:30)&&formatDay.format(new Date(offer.start))===day);
  offerCount=value.offers?.length??0;
  if(!valid)error=reply.status===200?'DTO or tenant/offer invariant failed':(value.code||'HTTP failure');
 }catch{error||='Response is not valid JSON';}
 return {sequence,tenant:index,service:serviceIndex,day,specificStaff:staffIndex,status:reply.status,valid,offers:offerCount,ms:ended-begin,scheduledMs:ended-scheduledAt,schedulerLagMs:begin-scheduledAt,error};
}
async function phase(name,seconds,startSequence){
 const results=[],pending=new Set(),rate=20,total=seconds*rate,begin=performance.now();
 let nextProgress=begin+10000;
 console.log(JSON.stringify({phase:name,state:'started',seconds,rate,at:new Date().toISOString()}));
 for(let i=0;i<total;i++){
  if(stopped)break;
  const scheduled=begin+i*1000/rate,remaining=scheduled-performance.now();
  if(remaining>0)await delay(remaining);
  if(pending.size>=200){stopped='Load queue exceeded 200 in-flight requests';break;}
  const promise=sample(startSequence+i,scheduled).then(result=>{results.push(result);pending.delete(promise);});pending.add(promise);
  if(performance.now()>=nextProgress){
   const progress={phase:name,elapsedSeconds:Math.round((performance.now()-begin)/1000),dispatched:i+1,finished:results.length,inFlight:pending.size,p95Ms:quantile(results.map(r=>r.ms),.95),failures:results.filter(r=>!r.valid).length};
   console.log(JSON.stringify(progress));await writeFile(`${directory}/load-progress.json`,JSON.stringify(progress));nextProgress+=10000;
  }
 }
 await Promise.all(pending);
 results.sort((a,b)=>a.sequence-b.sequence);
 await writeFile(`${directory}/load-${name}-requests.json`,JSON.stringify(results));
 const summary={name,requestedSeconds:seconds,requestedRate:rate,expectedRequests:total,completed:results.length,elapsedSeconds:(performance.now()-begin)/1000,
  p50Ms:quantile(results.map(r=>r.ms),.5),p95Ms:quantile(results.map(r=>r.ms),.95),p99Ms:quantile(results.map(r=>r.ms),.99),maxMs:Math.max(...results.map(r=>r.ms)),
  scheduledP95Ms:quantile(results.map(r=>r.scheduledMs),.95),schedulerLagP95Ms:quantile(results.map(r=>r.schedulerLagMs),.95),
  statuses:Object.fromEntries([...new Set(results.map(r=>r.status))].map(status=>[status,results.filter(r=>r.status===status).length])),
  tenantIsolationAndOfferChecks:results.filter(r=>r.valid).length,failures:results.filter(r=>!r.valid).slice(0,20),stopped:stopped||null};
 summary.pass=results.length===total&&results.every(r=>r.valid)&&summary.p95Ms<1000&&summary.scheduledP95Ms<1000;
 console.log(JSON.stringify(summary));return summary;
}
const summaries=[];let timer;
try{
 await productionHealth();assert.equal(health.at(-1).ready,true,'Production must be ready before generating load');
 timer=setInterval(()=>void productionHealth(),5000);
 const requested=process.argv[2]||'all';
 assert.ok(['all','cold','warmup','measure','smoke','under-load'].includes(requested));
 const definitions=requested==='all'?[['cold',5],['warmup',60],['measure',600]]
  :requested==='smoke'?[['smoke',5]]
  :requested==='under-load'?[['under-load',120]]
  :[[requested,requested==='cold'?5:requested==='warmup'?60:600]];
 let sequence=0;
 for(const [name,seconds] of definitions){
  const result=await phase(name,seconds,sequence);summaries.push(result);sequence+=seconds*20;
  if(stopped||result.failures.length)break;
 }
 await productionHealth();
 const report={at:new Date().toISOString(),runId:fixture.runId,endpoint:'Isolated Nginx TLS on same production VPS, loopback clients',
  cache:'cold means newly started app without availability requests; DB was seeded/ANALYZEd, OS/database caches were not purged on the shared server',
  clients:'100 real loopback source IPs (127.0.1.1–100), one per tenant; production-equivalent Nginx 5 r/s per-IP rule retained',
  distribution:'100 tenants round-robin; alternating services; 3 future days; 25% specific employee, 75% any eligible employee',
  requested,summaries,productionHealthChecks:health.length,productionHealthFailures:health.filter(h=>!h.ready).length,
  pass:summaries.length===definitions.length&&summaries.every(s=>s.pass)&&health.every(h=>h.ready)};
 await writeFile(`${directory}/load-${requested}-results.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({completed:requested,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{if(timer)clearInterval(timer);for(const agent of agents)agent.destroy();}
