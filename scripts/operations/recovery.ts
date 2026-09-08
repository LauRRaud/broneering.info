import pg from 'pg';
import {readFile,mkdtemp,rm,lstat,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRecoveryArtifact,readRecoveryManifest,restoreRecoveryArtifact} from './recovery-artifact';
import {reconcileRemovedContacts} from './reconcile';
function required(name:string){const value=process.env[name];if(!value)throw Error('Missing '+name);return value;}
async function main(){
 const command=process.argv[2];
 if(!['backup','ledger','recover'].includes(command))throw Error('Use backup, ledger or recover');
 const key=Buffer.from((await readFile(required('RECOVERY_KEY_FILE'),'utf8')).trim(),'hex');
 const common={key,environmentId:required('RECOVERY_ENVIRONMENT_ID'),artifactDirectory:required('RECOVERY_ARTIFACT_DIR')};
 const client=new pg.Client({connectionString:required(command==='recover'?'RECOVERY_DATABASE_URL':'MIGRATION_DATABASE_URL'),connectionTimeoutMillis:5000,statement_timeout:30000});await client.connect();
 try{
  const role=(await client.query('SELECT rolsuper OR rolbypassrls AS privileged FROM pg_roles WHERE rolname=current_user')).rows[0];
  if(!role?.privileged)throw Error('Privileged operator connection required for complete cross-tenant recovery data');
  if(command==='recover'){
   if(process.env.RECOVERY_ISOLATED!=='1')throw Error('Isolation required');
   const target=required('RECOVERY_PRIVATE_DIR');if(!path.isAbsolute(target)||target===path.parse(target).root)throw Error('Absolute private recovery directory required');
   const files=await readRecoveryManifest(common);
   const latest=await readRecoveryManifest({...common,artifactDirectory:required('RECOVERY_LATEST_LEDGER_DIR')});
   const minimum=Date.parse(required('RECOVERY_LEDGER_NOT_BEFORE'));
   if(!Number.isFinite(minimum)||Date.parse(latest.createdAt)<minimum||latest.files.length!==0||Date.parse(latest.createdAt)<Date.parse(files.createdAt))throw Error('A sufficiently recent independent removal ledger is required');
   if(Date.parse(latest.createdAt)>Date.now()+60000||files.removals.some(r=>!latest.removals.some(l=>l.id===r.id&&JSON.stringify(l)===JSON.stringify(r))))throw Error('Removal ledger is inconsistent');
   const identity=(await client.query('SELECT current_database() name')).rows[0];
   if(!/^recovery_[a-f0-9]{32}$/.test(identity.name))throw Error('Recovery database name required');
   // Validate every required file against the restored DB before any database mutation.
   const media=(await client.query("SELECT storage_key,byte_size,sha256 FROM media WHERE status='ready' AND (expires_at IS NULL OR expires_at>clock_timestamp())")).rows;
   for(const m of media){const f=files.files.find(f=>f.name===m.storage_key);if(!f||f.bytes!==Number(m.byte_size)||f.sha256!==m.sha256)throw Error('Referenced file missing or mismatched');}
   await restoreRecoveryArtifact({...common,targetDirectory:target});
   await reconcileRemovedContacts(client,latest.removals,true);
   // Only known files in the newly-created recovery directory are removed. All
   // snapshots/import sources are invalidated, including orphan files with PII.
   const retained=new Set((await client.query("SELECT storage_key FROM media WHERE status='ready' AND purpose NOT IN ('import','export') AND (expires_at IS NULL OR expires_at>clock_timestamp())")).rows.map(r=>r.storage_key));
   for(const f of files.files)if(!retained.has(f.name))await unlink(path.join(target,f.name));
   await client.query("UPDATE media SET status='deleted',version=version+1 WHERE purpose IN ('import','export') AND status<>'deleted'");
   await client.query('UPDATE import_batches SET source_purged_at=coalesce(source_purged_at,clock_timestamp())');
   console.log(JSON.stringify({ok:true,reconciled:latest.removals.length,retainedFiles:retained.size,promotion:'manual isolated acceptance still required'}));
  }else{
   if(command==='backup'&&process.env.BACKUP_WRITES_STOPPED!=='1')throw Error('Stop application writes and workers before file snapshot');
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const removals=(await client.query('SELECT id,tenant_id AS "tenantId",customer_ids AS "customerIds",booking_ids AS "bookingIds",removed_at AS "removedAt" FROM contact_removals ORDER BY removed_at,id')).rows.map(r=>({...r,removedAt:r.removedAt.toISOString()}));
   let empty:string|undefined;
   try{
    const source=command==='ledger'?(empty=await mkdtemp(path.join(tmpdir(),'booking-ledger-'))):required('PRIVATE_STORAGE_DIR');
    if(!(await lstat(source)).isDirectory())throw Error('Private directory required');
    const result=await createRecoveryArtifact({...common,sourceDirectory:source,removals});
    if(command==='backup'){
     const manifest=await readRecoveryManifest(common);
     for(const m of (await client.query("SELECT storage_key,byte_size,sha256 FROM media WHERE status='ready' AND (expires_at IS NULL OR expires_at>clock_timestamp())")).rows){
      const f=manifest.files.find(f=>f.name===m.storage_key);if(!f||f.bytes!==Number(m.byte_size)||f.sha256!==m.sha256)throw Error('Backup does not cover referenced media; discard artifact and retry');
     }
    }
    await client.query('COMMIT');console.log(JSON.stringify({ok:true,...result}));
   }finally{if(empty)await rm(empty,{recursive:true,force:true});}
  }
 }finally{await client.end();}
}
main().catch(()=>{console.error(JSON.stringify({ok:false,error:'RECOVERY_OPERATION_FAILED',hint:'Check command, isolated target, manifest freshness, credentials and file coverage using the runbook.'}));process.exitCode=1;});
