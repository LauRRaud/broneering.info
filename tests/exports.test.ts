import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,rm,utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import pg from 'pg';
import {requestExport,exportState,downloadExport} from '../src/lib/export-management';
import {claimExport,produceExport,expireExports} from '../src/lib/export-worker';
import * as files from '../src/lib/private-files';
import {withTenant} from '../src/lib/db';
import {previewContactRemoval,removeCustomerContacts} from '../src/lib/customer-privacy';
import type {Actor} from '../src/lib/access';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
let tenantId:string,foreignId:string,owner:Actor,storage:string;
beforeAll(()=>db.connect());afterAll(()=>db.end());
beforeEach(async()=>{
  storage=await mkdtemp(path.join(tmpdir(),'booking-export-test-'));vi.stubEnv('PRIVATE_STORAGE_DIR',storage);
  tenantId=randomUUID();foreignId=randomUUID();owner={id:randomUUID(),name:'Owner',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
  for(const id of [tenantId,foreignId])await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Export company','Test address')",[id,'export-'+id]);
  await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,$2,$3,true,true)',[owner.id,owner.name,owner.email]);
  await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner')",[tenantId,owner.id]);
  await db.query("INSERT INTO customers(tenant_id,source_key,name,email) VALUES($1,'foreign','Foreign sentinel','foreign@example.invalid')",[foreignId]);
});
afterEach(async()=>{
  vi.restoreAllMocks();vi.unstubAllEnvs();
  for(const table of ['contact_removals','export_jobs','media','access_audit_log','memberships'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[[tenantId,foreignId]]);
  await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[[tenantId,foreignId]]);await db.query('DELETE FROM auth_user WHERE id=$1',[owner.id]);
  if(path.dirname(storage)!==tmpdir()||!path.basename(storage).startsWith('booking-export-test-'))throw Error('Unsafe cleanup');await rm(storage,{recursive:true,force:true});
});
async function create(){return requestExport(owner,{tenantId,requestKey:randomUUID(),expiresHours:24});}
async function read(id:string){const result=await downloadExport(owner,tenantId,id);try{return await result.file.readFile('utf8');}finally{await result.file.close();}}
it('cannot publish a snapshot taken before contact removal and physically removes ready exports',async()=>{
 const customerId=(await db.query("INSERT INTO customers(tenant_id,source_key,name,email) VALUES($1,'privacy-test','Private Person','private@example.invalid') RETURNING id",[tenantId])).rows[0].id;
 const ready=await create();await produceExport((await claimExport(tenantId))!);
 expect(await read(ready.id)).toContain('Private Person');
 const oldFile=(await db.query("SELECT storage_key FROM media WHERE tenant_id=$1",[tenantId])).rows[0].storage_key;
 const running=await create(),claim=(await claimExport(tenantId))!;
 const original=files.createPrivateFile;
 vi.spyOn(files,'createPrivateFile').mockImplementationOnce(async(...args)=>{
  const file=await original(...args);
  const preview=await previewContactRemoval(owner,tenantId,customerId);
  await removeCustomerContacts(owner,{tenantId,customerId,fingerprint:preview.fingerprint,identityConfirmed:true,confirmed:true});
  return file;
 });
 expect(await produceExport(claim)).toBe('failed');
 await expect(downloadExport(owner,tenantId,running.id)).rejects.toMatchObject({code:'EXPORT_UNAVAILABLE'});
 await expect(downloadExport(owner,tenantId,ready.id)).rejects.toMatchObject({code:'EXPORT_UNAVAILABLE'});
 await expect(files.readPrivateFile(oldFile)).rejects.toBeTruthy();
 expect((await db.query('SELECT status FROM export_jobs WHERE tenant_id=$1',[tenantId])).rows.every(r=>r.status==='cancelled')).toBe(true);
});
it('streams multiple cursor batches from one snapshot and excludes other tenants and credentials',async()=>{
  await db.query("INSERT INTO customers(tenant_id,source_key,name,email) SELECT $1,n::text,'Original '||n,'shared@example.invalid' FROM generate_series(1,1501) n",[tenantId]);
  const job=await create(),claim=(await claimExport(tenantId))!;
  const original=files.createPrivateFile;
  vi.spyOn(files,'createPrivateFile').mockImplementationOnce(async(...args)=>{const result=await original(...args);await db.query("UPDATE customers SET name='Changed after snapshot' WHERE tenant_id=$1",[tenantId]);return result;});
  expect(await produceExport(claim)).toBe('ready');
  const text=await read(job.id),rows=text.trim().split('\n').map(line=>JSON.parse(line));
  expect(rows[0]).toMatchObject({type:'manifest',tenantId,format:'broneering.info/jsonl-v1'});
  const customers=rows.filter(row=>row.type==='customers');expect(customers).toHaveLength(1501);expect(customers.every(row=>row.data.name.startsWith('Original'))).toBe(true);
  expect(text).not.toContain('Foreign sentinel');expect(text).not.toContain('foreign@example.invalid');expect(text).not.toContain('source_key');expect(text).not.toContain('auth_user');expect(text).not.toContain('token_hash');
  const state=await exportState(owner,tenantId);expect(state.jobs[0]).toMatchObject({id:job.id,status:'ready',recordCount:1502,bytes:Buffer.byteLength(text)});
});
it('deduplicates requests and claims, while checking live owner rights at download',async()=>{
  const input={tenantId,requestKey:randomUUID(),expiresHours:24};const jobs=await Promise.all([requestExport(owner,input),requestExport(owner,input)]);expect(jobs[0].id).toBe(jobs[1].id);
  await expect(requestExport(owner,{...input,expiresHours:48})).rejects.toMatchObject({code:'IDEMPOTENCY_MISMATCH'});
  const claims=await Promise.all([claimExport(tenantId),claimExport(tenantId)]);expect(claims.filter(Boolean)).toHaveLength(1);expect(await produceExport(claims.find(Boolean)!)).toBe('ready');
  await withTenant(foreignId,async c=>expect((await c.query('SELECT * FROM export_jobs WHERE id=$1',[jobs[0].id])).rowCount).toBe(0));
  await expect(downloadExport(owner,foreignId,jobs[0].id)).rejects.toMatchObject({status:403});
  await db.query("UPDATE memberships SET role='receptionist' WHERE tenant_id=$1",[tenantId]);
  await expect(downloadExport(owner,tenantId,jobs[0].id)).rejects.toMatchObject({status:403});await expect(create()).rejects.toMatchObject({status:403});
});
it('expires files and rejects download before the cleanup worker runs',async()=>{
  const job=await create();expect(await produceExport((await claimExport(tenantId))!)).toBe('ready');expect(await readdir(storage)).toHaveLength(1);
  await db.query("UPDATE export_jobs SET expires_at=created_at+interval '1 millisecond' WHERE id=$1",[job.id]);
  await db.query("UPDATE media SET expires_at=created_at+interval '1 millisecond' WHERE tenant_id=$1",[tenantId]);
  await expect(read(job.id)).rejects.toMatchObject({status:410});expect((await exportState(owner,tenantId)).jobs[0].status).toBe('expired');
  await expireExports(tenantId);expect(await readdir(storage)).toHaveLength(0);
  expect((await db.query('SELECT status FROM media WHERE tenant_id=$1',[tenantId])).rows[0].status).toBe('deleted');
});
it('reclaims expired leases and refuses obsolete or unauthorized workers',async()=>{
  await create();const first=(await claimExport(tenantId))!;await db.query("UPDATE export_jobs SET locked_until=clock_timestamp()-interval '1 second' WHERE id=$1",[first.id]);
  const second=(await claimExport(tenantId))!;expect(second.claim_token).not.toBe(first.claim_token);
  expect(await produceExport(first)).toBe('failed');expect(await readdir(storage)).toHaveLength(0);
  await db.query('UPDATE memberships SET active=false WHERE tenant_id=$1',[tenantId]);
  expect(await produceExport(second)).toBe('failed');expect(await readdir(storage)).toHaveLength(0);
  expect((await db.query('SELECT status FROM export_jobs WHERE id=$1',[first.id])).rows[0].status).toBe('cancelled');
});
it('rejects public storage paths and filename traversal',async()=>{
  await expect(files.readPrivateFile('../secret')).rejects.toThrow('Invalid private file key');
  vi.stubEnv('PRIVATE_STORAGE_DIR',path.resolve('public','exports'));
  await expect(files.createPrivateFile(tenantId,'jsonl')).rejects.toThrow('Private storage must not be public');
});
it('removes only old unreferenced private files',async()=>{
  const orphan=await files.createPrivateFile(tenantId,'jsonl');await orphan.handle.writeFile('old orphan');await orphan.handle.close();
  const recent=await files.createPrivateFile(tenantId,'jsonl');await recent.handle.close();
  const old=new Date(Date.now()-9*86400000);await utimes(path.join(storage,orphan.key),old,old);
  expect(await files.pruneOrphanFiles(async()=>true)).toBe(0);
  expect(await files.pruneOrphanFiles(async()=>false)).toBe(1);expect(await readdir(storage)).toEqual([recent.key]);
});
