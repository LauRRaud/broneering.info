import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='output/playwright/acceptance-g03-variants',results=[];
for(const engine of ['chrome','firefox','webkit'])for(const phase of ['prepare','reject','confirm','deadline-prepare','deadline-reject']){
 const filename=`${engine}-${phase}.log`,raw=await readFile(`${dir}/${filename}`,'utf8');
 const line=raw.split(/\r?\n/).find(x=>x.startsWith('{"engine"'));
 assert.ok(line,`${filename} must contain a result`);const result=JSON.parse(line);assert.equal(result.pass,true,filename);results.push({...result,evidence:filename});
}
const config=JSON.parse((await readFile(`${dir}/deadline-config.log`,'utf8')).trim());
for(const row of results){if(row.phase==='deadline-prepare')assert.ok(Date.parse(row.at)<Date.parse(config.expiresAt));if(row.phase==='deadline-reject')assert.ok(Date.parse(row.at)>Date.parse(config.expiresAt));}
const rejected=JSON.parse(await readFile(`${dir}/rejections-database-proof.json`,'utf8'));
assert.equal(rejected.bookings.reduce((n,r)=>n+r.count,0),4);assert.equal(rejected.outbox.length,0);assert.equal(rejected.events.length,0);
const confirmed=JSON.parse(await readFile(`${dir}/confirmed-database-proof.json`,'utf8')),final=JSON.parse(await readFile(`${dir}/final-database-proof.json`,'utf8'));
assert.deepEqual(final.bookings,confirmed.bookings);assert.deepEqual(final.outbox,confirmed.outbox);assert.deepEqual(final.events,confirmed.events);
assert.equal(final.bookings.find(r=>r.is_test).count,3);
await writeFile(`${dir}/results.json`,JSON.stringify({at:new Date().toISOString(),total:results.length,passed:results.length,deadline:config,negativeRequestsCreatedNoBookings:true,results},null,2));
console.log(`${results.length}/${results.length} browser phases passed; actual deadline chronology and no negative-write side effects verified`);
