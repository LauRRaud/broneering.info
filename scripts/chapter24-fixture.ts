import assert from 'node:assert/strict';
import pg from 'pg';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {DateTime} from 'luxon';

const directory='output/playwright/chapter24',fixturePath='output/playwright/acceptance-g03/fixture.json';
if(process.env.AUTH_BASE_URL!=='http://haldus.localhost:3108'||new URL(process.env.MIGRATION_DATABASE_URL!).hostname!=='127.0.0.1')throw Error('Local chapter 24 environment required');
const fixture=JSON.parse(await readFile(fixturePath,'utf8'));
const own=fixture.tenants[0];assert.ok(own.singleService,'Create the variants fixture first');
assert.ok(fixture.tenants.every((tenant:{slug:string})=>tenant.slug.startsWith('g03-')));
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await db.connect();
await mkdir(directory,{recursive:true});
try{
 if(process.argv[2]==='prepare'){
  assert.ok(!fixture.chapter24,'Chapter 24 fixture already prepared');
  await db.query('BEGIN');
  await db.query('UPDATE bookings SET cancellation_hours=24 WHERE tenant_id=$1',[own.id]);
  const group=(await db.query("INSERT INTO service_groups(tenant_id,name) VALUES($1,'P24 testteenused') RETURNING id",[own.id])).rows[0].id;
  await db.query('UPDATE services SET group_id=$2 WHERE tenant_id=$1',[own.id,group]);
  const closedDay=DateTime.fromISO(fixture.day).plus({days:1}).toISODate();
  await db.query("INSERT INTO schedule_exceptions(tenant_id,staff_id,day,closed,intervals) VALUES($1,NULL,$2,true,'[]')",[own.id,closedDay]);
  const before=(await db.query('SELECT id,to_jsonb(b) snapshot FROM bookings b WHERE tenant_id=$1 ORDER BY id',[own.id])).rows;
  const oldCounts=(await db.query('SELECT (SELECT count(*) FROM booking_events WHERE tenant_id=$1)::int events,(SELECT count(*) FROM outbox WHERE tenant_id=$1)::int notices',[own.id])).rows[0];
  fixture.chapter24={group,closedDay,before,oldCounts};
  await db.query('COMMIT');
  await writeFile(fixturePath,JSON.stringify(fixture));console.log('Chapter 24 closed day and catalogue forms prepared');
 }else if(process.argv[2]==='proof'){
  const engine=process.argv[3];assert.ok(['chrome','firefox','webkit'].includes(engine));
  const raw=await readFile(`${directory}/${engine}-admin.log`,'utf8');
  const line=raw.split(/\r?\n/).find(value=>value.startsWith('{"engine"'));assert.ok(line,'Missing browser result');
  const result=JSON.parse(line);assert.equal(result.pass,true);assert.ok(result.results.every((row:{pass:boolean})=>row.pass));
  const oldBefore=fixture.chapter24.before.find((row:{id:string})=>row.id===result.oldBookingId).snapshot;
  const oldAfter=(await db.query('SELECT to_jsonb(b) snapshot FROM bookings b WHERE tenant_id=$1 AND id=$2',[own.id,result.oldBookingId])).rows[0].snapshot;
  assert.deepEqual(oldAfter,oldBefore,'Rejected reschedule and service archival preserve the original full booking row');
  const oldEvents=(await db.query('SELECT count(*)::int count FROM booking_events WHERE tenant_id=$1 AND booking_id=$2',[own.id,result.oldBookingId])).rows[0].count;
  const oldNotices=(await db.query('SELECT count(*)::int count FROM outbox WHERE tenant_id=$1 AND booking_id=$2',[own.id,result.oldBookingId])).rows[0].count;
  assert.equal(oldEvents,0);assert.equal(oldNotices,0);
  const affected=(await db.query("SELECT id,status,version,service_name,staff_name,start_at,end_at,price,duration,attention_reason FROM bookings WHERE tenant_id=$1 AND staff_id=$2 AND status='confirmed'",[own.id,own.staff[0]])).rows;
  assert.equal(affected.length,1);assert.equal(affected[0].status,'confirmed');assert.equal(affected[0].version,2);assert.equal(affected[0].attention_reason,'Töötaja on arhiveeritud');
  const original=fixture.chapter24.before.find((row:{id:string})=>row.id===affected[0].id).snapshot;
  for(const field of ['service_name','staff_name','price','duration'])assert.equal(affected[0][field],original[field]);
  for(const field of ['start_at','end_at'])assert.equal(affected[0][field].toISOString(),new Date(original[field]).toISOString());
  const attentionEvents=(await db.query("SELECT count(*)::int count FROM booking_events WHERE tenant_id=$1 AND booking_id=$2 AND action='attention.required'",[own.id,affected[0].id])).rows[0].count;assert.equal(attentionEvents,1);
  const membership=(await db.query('SELECT active FROM memberships WHERE tenant_id=$1 AND user_id=$2',[own.id,fixture.users.staff.id])).rows[0];assert.equal(membership.active,false);
  const sessions=(await db.query('SELECT count(*)::int count FROM auth_session WHERE user_id=$1',[fixture.users.staff.id])).rows[0].count;assert.equal(sessions,0);
  const blocker=(await db.query('SELECT id,status,source,is_test,customer_email FROM bookings WHERE tenant_id=$1 AND id=$2',[own.id,result.blockerId])).rows;assert.equal(blocker.length,1);assert.equal(blocker[0].status,'confirmed');assert.equal(blocker[0].is_test,true);assert.match(blocker[0].customer_email,/@example\.invalid$/);
  const concurrencyLog=await readFile(`${directory}/${engine}-concurrency.log`,'utf8');
  const concurrencyLine=concurrencyLog.split(/\r?\n/).find(value=>value.startsWith('{"engine"'));assert.ok(concurrencyLine);const concurrency=JSON.parse(concurrencyLine);assert.equal(concurrency.pass,true);
  const concurrentBooking=(await db.query('SELECT id,status,version FROM bookings WHERE tenant_id=$1 AND id=$2',[own.id,concurrency.createdBookingId])).rows[0];assert.equal(concurrentBooking.status,'cancelled');assert.equal(concurrentBooking.version,3);
  const concurrentCounts=(await db.query("SELECT (SELECT count(*) FROM booking_commands WHERE tenant_id=$1 AND booking_id=$2)::int commands,(SELECT count(*) FROM booking_events WHERE tenant_id=$1 AND booking_id=$2)::int events,(SELECT count(*) FROM outbox WHERE tenant_id=$1 AND booking_id=$2 AND status='skipped')::int skippedNotices",[own.id,concurrency.createdBookingId])).rows[0];assert.deepEqual(concurrentCounts,{commands:3,events:3,skippednotices:3});
  const totals=(await db.query('SELECT (SELECT count(*) FROM bookings WHERE tenant_id=$1)::int bookings,(SELECT count(*) FROM outbox WHERE tenant_id=$1)::int notices',[own.id])).rows[0];assert.deepEqual(totals,{bookings:4,notices:4});
  const proof={at:new Date().toISOString(),engine,oldBookingUnchanged:true,oldEvents,oldNotices,archivedStaffBooking:affected[0],attentionEvents,membershipActive:false,remainingStaffSessions:0,blocker:blocker[0],concurrentBooking,concurrentCounts,totals,pass:true};
  await writeFile(`${directory}/${engine}-database-proof.json`,JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
 }else if(process.argv[2]==='before-cleanup'){
  // The shared G03 cleanup removes all other synthetic rows after this group is detached.
  await db.query('BEGIN');
  await db.query('UPDATE services SET group_id=NULL WHERE tenant_id=$1 AND group_id=$2',[own.id,fixture.chapter24.group]);
  await db.query('DELETE FROM service_groups WHERE tenant_id=$1 AND id=$2',[own.id,fixture.chapter24.group]);
  await db.query('COMMIT');console.log('Chapter 24 catalogue group detached for shared fixture cleanup');
 }else throw Error('Use prepare, proof <engine>, or before-cleanup');
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}
