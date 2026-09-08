import {it,expect} from 'vitest';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {readFile,readdir,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import {createRecoveryArtifact} from '../scripts/operations/recovery-artifact';
import {reconcileRemovedContacts} from '../scripts/operations/reconcile';

it('replays a later removal on an isolated older database without erasing unrelated contacts',async()=>{
 const owner=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await owner.connect();
 const name='recovery_'+randomUUID().replaceAll('-',''),url=new URL(process.env.MIGRATION_DATABASE_URL!);url.pathname='/'+name;
 await owner.query(`CREATE DATABASE "${name}"`);
 const target=new pg.Client({connectionString:url.toString()});await target.connect();
 try{
  await target.query('CREATE TABLE schema_migrations(name text primary key,applied_at timestamptz default now())');
  for(const file of (await readdir('db/migrations')).filter(n=>n.endsWith('.sql')).sort()){await target.query(await readFile('db/migrations/'+file,'utf8'));await target.query('INSERT INTO schema_migrations(name) VALUES($1)',[file]);}
  const tenantId=randomUUID(),customerId=randomUUID(),otherId=randomUUID();
  await target.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Restore test','Test')",[tenantId,'restore-'+tenantId]);
  await target.query("INSERT INTO customers(id,tenant_id,source_key,name,email) VALUES($1,$2,'first','Removed Person','removed@example.invalid'),($3,$2,'second','Retained Person','retained@example.invalid')",[customerId,tenantId,otherId]);
  for(const action of ['customer.correct','customer.merge'])await target.query('INSERT INTO access_audit_log(tenant_id,action,target_id,metadata) VALUES($1,$2,$3,$4)',[tenantId,action,customerId,JSON.stringify({before:{name:'Removed Person',email:'removed@example.invalid'},after:{name:'Corrected Person'},source:{name:'Removed Person'},target:{name:'Corrected Person'},reason:'Private reason',bookingsMoved:2})]);
  const record={id:randomUUID(),tenantId,customerIds:[customerId],bookingIds:[],removedAt:'2026-09-08T00:00:00.000Z'};
  await expect(reconcileRemovedContacts(target,[record],false)).rejects.toThrow();
  const directory=await mkdtemp(path.join(tmpdir(),'recovery-cli-'));
  try{
   const source=path.join(directory,'source'),artifact=path.join(directory,'files'),ledger=path.join(directory,'ledger'),key=randomBytes(32),environmentId=randomUUID(),keyFile=path.join(directory,'key');
   await mkdir(source);await writeFile(keyFile,key.toString('hex'));
   await writeFile(path.join(source,tenantId+'_'+randomUUID()+'_csv'),'old private contact');
   await createRecoveryArtifact({sourceDirectory:source,artifactDirectory:artifact,key,environmentId,removals:[]});
   const empty=path.join(directory,'empty');await mkdir(empty);
   await createRecoveryArtifact({sourceDirectory:empty,artifactDirectory:ledger,key,environmentId,removals:[record]});
   const env={...process.env,RECOVERY_KEY_FILE:keyFile,RECOVERY_ENVIRONMENT_ID:environmentId,RECOVERY_ARTIFACT_DIR:artifact,RECOVERY_LATEST_LEDGER_DIR:ledger,RECOVERY_LEDGER_NOT_BEFORE:'2026-01-01T00:00:00Z',RECOVERY_PRIVATE_DIR:path.join(directory,'restored'),RECOVERY_DATABASE_URL:url.toString(),RECOVERY_ISOLATED:'1'};
   await expect(promisify(execFile)(process.execPath,['--import','tsx','scripts/operations/recovery.ts','recover'],{env:{...env,RECOVERY_ENVIRONMENT_ID:randomUUID()}})).rejects.toThrow();
   expect((await target.query('SELECT email FROM customers WHERE id=$1',[customerId])).rows[0].email).toBe('removed@example.invalid');
   const result=await promisify(execFile)(process.execPath,['--import','tsx','scripts/operations/recovery.ts','recover'],{env});
   expect(JSON.parse(result.stdout).ok).toBe(true);expect(await readdir(env.RECOVERY_PRIVATE_DIR)).toEqual([]);
  }finally{await rm(directory,{recursive:true,force:true});}
  await reconcileRemovedContacts(target,[record],true);
  const rows=(await target.query('SELECT id,name,email FROM customers ORDER BY id')).rows;
  expect(rows.find(r=>r.id===customerId)).toMatchObject({name:'[removed]',email:null});
  expect(rows.find(r=>r.id===otherId)).toMatchObject({name:'Retained Person',email:'retained@example.invalid'});
  expect((await target.query('SELECT count(*)::int n FROM contact_removals')).rows[0].n).toBe(1);
  const events=(await target.query('SELECT action,metadata FROM access_audit_log WHERE tenant_id=$1',[tenantId])).rows;
  const redacted={name:'[removed]',email:null,phone:null};
  expect(events.find(e=>e.action==='customer.correct').metadata).toMatchObject({before:redacted,after:redacted,reason:''});
  expect(events.find(e=>e.action==='customer.merge').metadata).toMatchObject({source:redacted,target:redacted,reason:'',bookingsMoved:2});
  expect(JSON.stringify(events)).not.toContain('Removed Person');expect(JSON.stringify(events)).not.toContain('Private reason');
 }finally{await target.end();await owner.query(`DROP DATABASE "${name}" WITH (FORCE)`);await owner.end();}
},30000);
