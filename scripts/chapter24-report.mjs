import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const directory='output/playwright/chapter24',target='docs/audits/chapter24-20260910';
const baseCommit='abfe82d9ee4c5b7698cf5ad2688ede721001dfa9';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const requirements=await json(`${target}/requirements.json`);
assert.equal(requirements.cases.length,18);
const suite=await json(`${directory}/vitest.json`);
assert.equal(suite.success,true);assert.equal(suite.numFailedTests,0);assert.equal(suite.numPendingTests,0);
const checkedTests=(file,pattern)=>{
 const files=suite.testResults.filter(result=>result.name.replaceAll('\\','/').endsWith('/tests/'+file));assert.equal(files.length,1,file);
 const assertions=files[0].assertionResults.filter(result=>pattern.endsWith('*')?result.title.startsWith(pattern.slice(0,-1)):result.title===pattern);
 assert.ok(assertions.length>0,`${file}: ${pattern}`);assert.ok(assertions.every(result=>result.status==='passed'));
 return assertions.map(result=>({file:'tests/'+file,name:result.fullName,status:result.status,durationMs:result.duration}));
};
await mkdir(target,{recursive:true});
const browser=[];
for(const engine of ['chrome','firefox','webkit'])for(const phase of ['public','concurrency','admin']){
 const file=`${engine}-${phase}.log`,raw=await readFile(`${directory}/${file}`,'utf8');
 const line=raw.split(/\r?\n/).find(value=>value.startsWith('{"engine"'));assert.ok(line,file);
 const result=JSON.parse(line);assert.equal(result.pass,true,file);assert.ok(result.results.length>0);assert.ok(result.results.every(check=>check.pass));
 browser.push({phase,...result,evidence:file});await copyFile(`${directory}/${file}`,`${target}/${file}`);
}
const databaseProof=[];
for(const engine of ['chrome','firefox','webkit']){
 const proof=await json(`${directory}/${engine}-database-proof.json`),cleanup=await json(`${directory}/${engine}-cleanup.json`);
 assert.equal(proof.pass,true);assert.equal(proof.oldBookingUnchanged,true);assert.equal(proof.oldEvents,0);assert.equal(proof.oldNotices,0);
 assert.deepEqual(cleanup.remaining,{tenants:0,users:0});databaseProof.push(proof);
 for(const suffix of ['database-proof','cleanup'])await copyFile(`${directory}/${engine}-${suffix}.json`,`${target}/${engine}-${suffix}.json`);
}
const variantsPath='docs/audits/acceptance-g03-variants-20260909/results.json';
const recoveryPath='docs/audits/acceptance-g03-completion-20260909/results.json';
const variants=await json(variantsPath),recovery=await json(recoveryPath);
assert.equal(variants.passed,15);assert.equal(variants.total,15);assert.ok(variants.results.every(result=>result.pass));
assert.ok(recovery.browserResults.filter(result=>result.phase==='recovery').length===3);
assert.ok(recovery.browserResults.filter(result=>result.phase==='recovery').every(result=>result.pass&&result.results.every(check=>check.pass)));
// Public booking behavior has not changed since these real-clock/transport acceptance runs.
const publicSources=['src/components/booking-flow.tsx','src/lib/bookings.ts','src/lib/availability.ts','src/lib/booking-mutation-outcome.ts'];
for(const path of publicSources){
 const previous=execFileSync('git',['show',`${baseCommit}:${path}`],{encoding:'utf8'});
 assert.equal((await readFile(path,'utf8')).replaceAll('\r\n','\n'),previous.replaceAll('\r\n','\n'),`Re-run historical public acceptance after changing ${path}`);
}
const b='booking.test.ts',m='booking-management.test.ts',s='schedule-management.test.ts',c='service-management.test.ts';
const mapping={
 'AT-01':{tests:[[b,'09/AT-01: service eligibility remains distinct from a worker having no free hours']],browser:['admin'],previous:['variants:prepare']},
 'AT-02':{tests:[[b,'AT-02/19: forged cross-tenant service or staff fails']],previous:['g03-http']},
 'AT-03':{browser:['admin'],previous:['variants:prepare']},
 'AT-04':{tests:[[b,'08/D-09: personal catalog uses only linked staff services and their concrete price and duration']],browser:['admin'],previous:['variants:prepare']},
 'AT-05':{tests:[[b,'09/AT-05: any-worker offers are the exact union of concrete workers, including equal and different prices']],browser:['public']},
 'AT-06':{tests:[[b,'09/AT-06: changed price or duration cannot select a cheaper or shorter colleague instead']],previous:['variants:prepare','variants:reject','variants:confirm']},
 'AT-07':{tests:[[s,'AT-07/08 rechecks the two-hour lead time after the user spends time in the form'],[b,'AT-07/08: server lead time applies at availability and confirmation']]},
 'AT-08':{tests:[[s,'AT-07/08 rechecks the two-hour lead time after the user spends time in the form']],previous:['variants:deadline-prepare','variants:deadline-reject']},
 'AT-09':{tests:[[b,'AT-09/10: buffers and lunch break are included in availability'],[s,'detects buffer-only conflicts and rejects restoring a closed weekly day beneath an existing exception booking']]},
 'AT-10':{tests:[[b,'AT-10: closed and replacement day schedules override weekly intervals'],[s,'adds a vacation period without creating fake bookings and restores the weekly plan'],[s,'uses a changed-hours exception instead of the regular day and still respects a location closure']],browser:['public']},
 'AT-11':{tests:[[b,'AT-11: 50 competing requests create exactly one booking and one outbox event']]},
 'AT-12':{tests:[[b,'AT-12/13: concurrent retries share one result; changed body conflicts']],browser:['concurrency'],previous:['recovery']},
 'AT-13':{tests:[[b,'AT-12/13: concurrent retries share one result; changed body conflicts']]},
 'AT-14':{tests:[[s,'serializes simultaneous closing and booking without creating a booking outside working hours']]},
 'AT-15':{tests:[[m,'leaves the old booking and notices intact when the new price, rules or availability are stale']],browser:['admin']},
 'AT-16':{tests:[[m,'accepts exactly one of two administrators editing the same version']],browser:['concurrency']},
 'AT-17':{tests:[[b,'AT-17: real schedule offers across *'],[b,'skips nonexistent spring and ambiguous autumn wall times']]},
 'AT-18':{tests:[[c,'retains historical price, names, duration and inherited buffers after editing and archiving'],[m,'archives departing staff, revokes company access and sessions, keeps history and queues future bookings']],browser:['admin']},
};
const priorHttpPath='docs/audits/acceptance-g03-20260909/http-results.json',priorHttp=await json(priorHttpPath);
assert.equal(priorHttp.total,priorHttp.passed);assert.ok(priorHttp.results.every(result=>result.pass));
const previousEvidence=async reference=>{
 if(reference.startsWith('variants:')){
  const phase=reference.slice(9),matches=variants.results.filter(result=>result.phase===phase);assert.equal(matches.length,3,reference);
  return {path:variantsPath,phase,at:variants.at,engines:matches.map(result=>result.engine),reused:true};
 }
 if(reference==='recovery')return {path:recoveryPath,phase:'recovery',at:recovery.at,engines:['chrome','firefox','webkit'],reused:true};
 assert.equal(reference,'g03-http');return {path:priorHttpPath,at:priorHttp.at,reused:true};
};
const cases=[];
for(const requirement of requirements.cases){
 const config=mapping[requirement.id];assert.ok(config,requirement.id);
 const tests=(config.tests??[]).flatMap(([file,title])=>checkedTests(file,title));
 const freshBrowser=(config.browser??[]).flatMap(phase=>browser.filter(result=>result.phase===phase).map(result=>({path:`${target}/${result.evidence}`,engine:result.engine,phase,reused:false})));
 const previous=await Promise.all((config.previous??[]).map(previousEvidence));
 assert.ok(tests.length+freshBrowser.length+previous.length>0);
 cases.push({...requirement,status:'passed',tests,browser:[...freshBrowser,...previous]});
}
const supplementary=[
 {test:'Service changes clear the old offer and preserve contacts',browser:['public']},
 {test:'Changed prices require a new explicit confirmation',previous:['variants:reject','variants:confirm']},
 {test:'An empty day offers a later day without choosing a time',browser:['public'],tests:checkedTests(b,'08: next free day skips closed dates without creating or choosing a booking')},
 {test:'Interrupted connections check the original operation',browser:['concurrency'],previous:['recovery']},
 {test:'Manual bookings apply the same eligibility, overlap and buffer rules',tests:[...checkedTests(m,'15: manual and public creation compete for the same allocation'),...checkedTests(m,'24: manual creation rejects ineligible staff and buffer-only overlaps without side effects')]},
].map(item=>({...item,status:'passed'}));
for(const name of ['full-tests.log','vitest.json','build.log','typecheck.log'])await copyFile(`${directory}/${name}`,`${target}/${name}`);
let screenshots=0;
for(const name of await readdir(directory))if(/^(chrome|firefox|webkit)-(public-controls|failed-move|archived-staff|archived-service|admin-conflict)\.png$/.test(name)){await copyFile(`${directory}/${name}`,`${target}/${name}`);screenshots++;}
assert.equal(screenshots,15);
const report={at:new Date().toISOString(),chapter:24,source:requirements.source,sourceSha256:requirements.sha256,baseCommit,technicalAcceptance:'passed',ownerAcceptance:null,total:cases.length,passed:cases.filter(item=>item.status==='passed').length,suite:{files:suite.testResults.length,tests:suite.numTotalTests,passed:suite.numPassedTests,failed:suite.numFailedTests,skipped:suite.numPendingTests},browserPhases:browser.length,browserChecks:browser.reduce((sum,result)=>sum+result.results.length,0),screenshots,publicSourcesUnchangedSincePreviousEvidence:publicSources,cases,supplementary,browser,databaseProof};
await writeFile(`${target}/results.json`,JSON.stringify(report,null,2));
const sources=['src/components/booking-management.tsx',...publicSources,'src/lib/booking-management.ts','src/lib/service-management.ts','src/lib/schedule-management.ts',...new Set(Object.values(mapping).flatMap(config=>(config.tests??[]).map(([file])=>'tests/'+file))),...(await readdir('scripts')).filter(name=>name.startsWith('chapter24-')).map(name=>'scripts/'+name),'scripts/acceptance-g03-fixture.ts','scripts/acceptance-g03-admin-concurrency.js'];
const manifest=await Promise.all(sources.map(async path=>({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')})));
await writeFile(`${target}/source-manifest.json`,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({chapter:24,total:report.total,passed:report.passed,supplementary:supplementary.length,suite:report.suite,browserPhases:report.browserPhases,browserChecks:report.browserChecks,screenshots,sourceFiles:manifest.length},null,2));
