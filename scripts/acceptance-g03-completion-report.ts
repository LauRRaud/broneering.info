import assert from 'node:assert/strict';
import pg from 'pg';
import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const directory='output/playwright/acceptance-g03',target='docs/audits/acceptance-g03-completion-20260909';
if(process.env.AUTH_BASE_URL!=='http://haldus.localhost:3108'||new URL(process.env.MIGRATION_DATABASE_URL!).hostname!=='127.0.0.1')throw Error('Local G03 environment required');
const fixture=JSON.parse(await readFile(`${directory}/fixture.json`,'utf8'));
const database=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await database.connect();
try{
 await mkdir(target,{recursive:true});
 const browserResults=[];
 for(const engine of ['chrome','firefox','webkit'])for(const phase of ['embed','recovery','concurrency','layout',...(engine==='webkit'?[]:['cookie'])]){
  const filename=`${engine}-${phase}.log`,raw=await readFile(`${directory}/${filename}`,'utf8');
  const line=raw.split(/\r?\n/).find(value=>value.startsWith('{"engine"'));
  assert.ok(line,`${filename}: missing result`);const result=JSON.parse(line);
  assert.equal(result.pass,true,filename);assert.ok(result.results.length>0);assert.ok(result.results.every((row:any)=>row.pass===true));
  browserResults.push({phase,...result,evidence:filename});
  let sanitized=raw;
  for(const link of Object.values(fixture.links??{}) as Array<{token:string}>)sanitized=sanitized.replaceAll(link.token,'[REDACTED_SYNTHETIC_TOKEN]');
  await writeFile(`${target}/${filename}`,sanitized);
 }
 const http=JSON.parse(await readFile(`${directory}/extended-http-results.json`,'utf8'));
 assert.ok(http.total>=500);assert.equal(http.total,http.passed);assert.ok(http.results.every((row:any)=>row.pass===true));
 await copyFile(`${directory}/extended-http-results.json`,`${target}/extended-http-results.json`);
 const databaseProof=[];
 for(const result of browserResults.filter(row=>['recovery','concurrency'].includes(row.phase))){
  const booking=(await database.query('SELECT id,status,version,customer_notifications,customer_email FROM bookings WHERE tenant_id=$1 AND id=$2',[fixture.tenants[0].id,result.createdBookingId])).rows;
  assert.equal(booking.length,1);
  const events=(await database.query('SELECT action,count(*)::int count FROM booking_events WHERE tenant_id=$1 AND booking_id=$2 GROUP BY action ORDER BY action',[fixture.tenants[0].id,result.createdBookingId])).rows;
  const outbox=(await database.query('SELECT count(*)::int count FROM outbox WHERE tenant_id=$1 AND booking_id=$2',[fixture.tenants[0].id,result.createdBookingId])).rows[0].count;
  const skipped=(await database.query("SELECT count(*)::int count FROM outbox WHERE tenant_id=$1 AND booking_id=$2 AND status='skipped'",[fixture.tenants[0].id,result.createdBookingId])).rows[0].count;
  const commands=(await database.query('SELECT count(*)::int count FROM booking_commands WHERE tenant_id=$1 AND booking_id=$2',[fixture.tenants[0].id,result.createdBookingId])).rows[0].count;
  if(result.phase==='recovery'){
   assert.equal(booking[0].status,'confirmed');assert.equal(booking[0].version,1);assert.equal(events.length,1);assert.equal(events[0].count,1);assert.equal(outbox,1);
  }else{
   assert.equal(booking[0].status,'cancelled');assert.equal(booking[0].version,3);assert.equal(commands,3);assert.equal(outbox,3);assert.equal(skipped,3);assert.equal(booking[0].customer_notifications,false);assert.equal(events.reduce((sum,row)=>sum+row.count,0),3);
  }
  databaseProof.push({engine:result.engine,phase:result.phase,bookingId:result.createdBookingId,status:booking[0].status,version:booking[0].version,events,outbox,skipped,commands,pass:true});
 }
 for(const filename of await readdir(directory))if(/^(chrome|firefox|webkit)-(embed-confirmation|embed-csp-denied|recovered-creation|expired-link|admin-conflict|cookie-restricted|(?:owner|receptionist|staff|platform)-russian-320)\.png$/.test(filename))await copyFile(`${directory}/${filename}`,`${target}/${filename}`);
 await copyFile(`${directory}/modal-before-fix.log`,`${target}/modal-before-fix.log`);
 const summary={at:new Date().toISOString(),http:{total:http.total,passed:http.passed},browserPhases:browserResults.length,browserChecks:browserResults.reduce((sum,row)=>sum+row.results.length,0),databaseProof,browserResults};
 await writeFile(`${target}/results.json`,JSON.stringify(summary,null,2));
 const sources=['public/widget/v1.js','src/lib/payment-checkout.ts','tests/payment-checkout-freshness.test.ts',...(await readdir('scripts')).filter(filename=>filename.startsWith('acceptance-g03-')&&!filename.includes('variants')).map(filename=>'scripts/'+filename)];
 await writeFile(`${target}/source-manifest.json`,JSON.stringify(await Promise.all(sources.map(async path=>({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')}))),null,2));
 console.log(JSON.stringify({http:summary.http,browserPhases:summary.browserPhases,browserChecks:summary.browserChecks,databaseProof:databaseProof.length},null,2));
}finally{await database.end();}
