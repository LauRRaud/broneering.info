import assert from 'node:assert/strict';
import {createHash,randomUUID,createHmac,randomBytes} from 'node:crypto';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import pg from 'pg';
import {closePool} from '../src/lib/db';
import {createPrivateFile} from '../src/lib/private-files';
import {previewContactRemoval,removeCustomerContacts} from '../src/lib/customer-privacy';

assert.equal(process.env.CHAPTER26_ISOLATED,'1');
const command=process.argv[2],directory=process.env.P26_RECOVERY_DIR!;
assert.match(directory,/^\/app\/output\/chapter26\/recovery-[a-f0-9]{32}$/);
const source=new URL(process.env.MIGRATION_DATABASE_URL!);assert.match(source.pathname,/^\/chapter26_[a-f0-9]{12}$/);assert.equal(source.hostname,'127.0.0.1');
const targetCommand=['compare','verify','session'].includes(command);
const connection=targetCommand?process.env.RECOVERY_DATABASE_URL!:source.href;
if(targetCommand)assert.match(new URL(connection).pathname,/^\/recovery_[a-f0-9]{32}$/);
const db=new pg.Client({connectionString:connection});await db.connect();
const fixture=JSON.parse(await readFile('output/chapter26/fixture.json','utf8')),tenant=fixture.tenants[1],owner=fixture.users.owner;
const save=async(name:string,data:unknown)=>writeFile(`${directory}/${name}.json`,JSON.stringify(data,null,2));
async function fingerprints(){
 const tables=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
 const results:Record<string,{rows:number;digest:string}>={};
 for(const {tablename} of tables){assert.match(tablename,/^[a-z_]+$/);results[tablename]=(await db.query(`SELECT count(*)::int rows,md5(coalesce(string_agg(h,'' ORDER BY h),'')) digest FROM (SELECT md5(to_jsonb(r)::text) h FROM "${tablename}" r) entries`)).rows[0];}
 return results;
}
try{
 if(command==='prepare'){
  await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner') ON CONFLICT DO NOTHING",[tenant.id,owner.id]);
  const customer=(await db.query('SELECT customer_id FROM bookings WHERE tenant_id=$1 AND start_at<current_date AND customer_id IS NOT NULL LIMIT 1',[tenant.id])).rows[0].customer_id;
  const preview=await previewContactRemoval(owner,tenant.id,customer);assert.equal(preview.canRemove,true);assert.ok(preview.bookings>0);
  const content=Buffer.from(JSON.stringify({purpose:'Synthetic retained private file for recovery acceptance',tenantId:tenant.id,nonce:randomUUID()})+'\n');
  const file=await createPrivateFile(tenant.id,'jsonl');await file.handle.writeFile(content);await file.handle.sync();await file.handle.close();
  const sha256=createHash('sha256').update(content).digest('hex');
  await db.query("INSERT INTO media(tenant_id,storage_key,purpose,content_type,byte_size,sha256,status,created_by) VALUES($1,$2,'invoice','application/x-ndjson',$3,$4,'ready',$5)",[tenant.id,file.key,content.length,sha256,owner.id]);
  const expected={tenantId:tenant.id,customerId:customer,bookings:preview.bookings,file:{key:file.key,bytes:content.length,sha256}};
  await save('expected',expected);console.log(JSON.stringify({prepared:true,linkedBookings:preview.bookings,fileBytes:content.length}));
 }else if(command==='fingerprint'){
  const values=await fingerprints();await save('before',values);console.log(JSON.stringify({tables:Object.keys(values).length,bookings:values.bookings.rows,tenants:values.tenants.rows}));
 }else if(command==='remove'){
  const expected=JSON.parse(await readFile(`${directory}/expected.json`,'utf8'));
  const preview=await previewContactRemoval(owner,tenant.id,expected.customerId);assert.equal(preview.canRemove,true);
  const result=await removeCustomerContacts(owner,{tenantId:tenant.id,customerId:expected.customerId,fingerprint:preview.fingerprint,identityConfirmed:true,confirmed:true});
  assert.equal(result.removed,true);await save('removal-after-backup',{at:new Date().toISOString(),...result,bookings:preview.bookings});console.log(JSON.stringify({removed:true,bookings:preview.bookings}));
 }else if(command==='compare'){
  const before=JSON.parse(await readFile(`${directory}/before.json`,'utf8')),after=await fingerprints();assert.deepEqual(after,before);
  await save('database-restored',{at:new Date().toISOString(),tables:Object.keys(before).length,bookings:before.bookings.rows,tenants:before.tenants.rows,allRowFingerprintsEqual:true,pass:true});console.log(JSON.stringify({allRowFingerprintsEqual:true,tables:Object.keys(before).length}));
 }else if(command==='verify'){
  const expected=JSON.parse(await readFile(`${directory}/expected.json`,'utf8')),before=JSON.parse(await readFile(`${directory}/before.json`,'utf8'));
  const customer=(await db.query('SELECT name,email,phone,contact_redacted_at FROM customers WHERE tenant_id=$1 AND id=$2',[expected.tenantId,expected.customerId])).rows[0];
  assert.equal(customer.name,'[removed]');assert.equal(customer.email,null);assert.equal(customer.phone,null);assert.ok(customer.contact_redacted_at);
  const bookings=(await db.query('SELECT customer_name,customer_email,customer_phone,customer_notifications,contact_redacted_at FROM bookings WHERE tenant_id=$1 AND customer_id=$2',[expected.tenantId,expected.customerId])).rows;
  assert.equal(bookings.length,expected.bookings);assert.ok(bookings.every(b=>b.customer_name==='[removed]'&&b.customer_email===null&&b.customer_phone===null&&!b.customer_notifications&&b.contact_redacted_at));
  assert.equal((await db.query('SELECT count(*)::int n FROM bookings')).rows[0].n,before.bookings.rows);
  assert.equal((await db.query('SELECT count(*)::int n FROM auth_session')).rows[0].n,0);
  assert.equal((await db.query("SELECT count(*)::int n FROM export_jobs WHERE status IN ('pending','running','ready','failed')")).rows[0].n,0);
  assert.equal((await db.query("SELECT count(*)::int n FROM media WHERE purpose IN ('import','export') AND status<>'deleted'")).rows[0].n,0);
  assert.equal((await db.query("SELECT count(*)::int n FROM import_rows WHERE source_values<>'[]' OR normalized<>'{}'")).rows[0].n,0);
  const bytes=await readFile(`${directory}/private/${expected.file.key}`);assert.equal(bytes.length,expected.file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.file.sha256);
  assert.deepEqual(await readdir(`${directory}/private`),[expected.file.key]);
  const roles=(await db.query("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname='booking_app'")).rows[0];assert.equal(roles.rolsuper,false);assert.equal(roles.rolbypassrls,false);
  const report={at:new Date().toISOString(),pass:true,bookingsPreserved:before.bookings.rows,removedContactBookings:bookings.length,oldSessionsRevoked:true,oldExportsRevoked:true,importPayloadsCleared:true,retainedFiles:1,retainedFileHash:expected.file.sha256,appRoleUnprivileged:true};
  await save('recovery-verified',report);console.log(JSON.stringify(report));
 }else if(command==='session'){
  const token=randomBytes(32).toString('hex'),cookie=encodeURIComponent(token+'.'+createHmac('sha256',process.env.AUTH_SECRET!).update(token).digest('base64'));
  await db.query("INSERT INTO auth_session(id,token,user_id,expires_at,updated_at,mfa_verified_at) VALUES($1,$2,$3,now()+interval '1 hour',now(),now())",[randomUUID(),token,owner.id]);
  await writeFile(`${directory}/restored-session.json`,JSON.stringify({cookie,tenantId:tenant.id,slug:tenant.slug,serviceId:tenant.services[0],staffId:tenant.staff[0],day:fixture.day}),{mode:0o600});
  console.log(JSON.stringify({createdFreshIsolatedSession:true}));
 }else throw Error('Unknown recovery phase');
}finally{await db.end();await closePool();}
