import {createHash,randomUUID} from 'node:crypto';
import {pool,withTenant} from './db';
import {type Actor,requireMembershipInClient,audit} from './access';
import {AppError} from './errors';
import {createPrivateFile,removePrivateFile,pruneOrphanFiles} from './private-files';

type Claim={id:string;tenant_id:string;requested_by:string;claim_token:string;attempts:number;expires_at:Date};
const actorFor=(id:string):Actor=>({id,email:'',name:'',emailVerified:false,twoFactorEnabled:false,isPlatformAdmin:false});
async function owner(client:Parameters<typeof requireMembershipInClient>[3],tenantId:string,userId:string){
  const membership=await requireMembershipInClient(actorFor(userId),tenantId,undefined,client);
  if(membership.role!=='owner')throw new AppError(403,'FORBIDDEN','Ekspordi õigus puudub.');
}
// Static, explicit export surface: no auth tables, bearer tokens, source code or cross-company data.
const datasets=[
  ['company','SELECT id,slug,name,address,description,timezone,lead_minutes,window_days,step_minutes,cancellation_hours,contact_email,contact_phone,default_language,booking_terms,public_state,demo,booking_stops_at,service_ends_at,data_access_until,deletion_not_before,exit_agreement FROM tenants WHERE id=$1'],
  ['service_groups','SELECT id,parent_id,name,active,version FROM service_groups WHERE tenant_id=$1 ORDER BY id'],
  ['services','SELECT id,group_id,name,description,category,active,online,default_price,default_duration,buffer_before,buffer_after,source_language,version FROM services WHERE tenant_id=$1 ORDER BY id'],
  ['service_translations','SELECT service_id,language,published_name,published_description,published_source_version FROM service_translations WHERE tenant_id=$1 ORDER BY service_id,language'],
  ['staff',"SELECT id,name,title,bio,photo_url,public_phone,encode(photo_image,'base64') AS photo_jpeg_base64,active,online,version FROM staff WHERE tenant_id=$1 ORDER BY id"],
  ['theme_configs',"SELECT version,revision,status,config,encode(logo_light,'base64') AS logo_light_webp_base64,encode(logo_dark,'base64') AS logo_dark_webp_base64,published_at FROM theme_configs WHERE tenant_id=$1 ORDER BY version"],
  ['staff_services','SELECT staff_id,service_id,price,duration,buffer_before,buffer_after,active,version FROM staff_services WHERE tenant_id=$1 ORDER BY staff_id,service_id'],
  ['weekly_hours','SELECT id,staff_id,weekday,start_minute,end_minute FROM weekly_hours WHERE tenant_id=$1 ORDER BY id'],
  ['schedule_exceptions','SELECT id,staff_id,day,closed,intervals,kind FROM schedule_exceptions WHERE tenant_id=$1 ORDER BY id'],
  ['customers','SELECT id,name,email,phone,version,updated_at,merged_into_id FROM customers WHERE tenant_id=$1 ORDER BY id'],
  ['customer_merges','SELECT source_id,target_id,booking_count,created_at FROM customer_merges WHERE tenant_id=$1 ORDER BY created_at,request_key'],
  ['bookings','SELECT id,reference,service_id,staff_id,customer_id,service_name,staff_name,customer_name,customer_email,customer_phone,start_at,end_at,price,duration,buffer_before,buffer_after,cancellation_hours,status,source,customer_language,is_test,customer_notifications,customer_reminders,customer_sms_reminders,attention_reason,version,created_at,updated_at FROM bookings WHERE tenant_id=$1 ORDER BY id'],
  ['booking_events','SELECT id,booking_id,action,reason,before_data,after_data,created_at FROM booking_events WHERE tenant_id=$1 ORDER BY id'],
  ['subscription','SELECT id,plan_id,plan_version,status,contract_start,period_start,period_end,anchor_day,paid_through,trial_ends_at,ends_at,billing_contact_name,billing_email,billing_recipient,payment_mode FROM subscriptions WHERE tenant_id=$1'],
  ['plan','SELECT p.id,p.version,p.code,p.name,p.monthly_price,p.currency,p.staff_limit,p.entitlements FROM plan_versions p JOIN subscriptions s ON s.plan_id=p.id AND s.plan_version=p.version WHERE s.tenant_id=$1'],
  ['invoices','SELECT id,subscription_id,number,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total,currency,status,issued_at,issued_on,issuer_version,void_reason,kind,original_invoice_id,replaced_invoice_id,correction_reason,version FROM invoices WHERE tenant_id=$1 ORDER BY id'],
  ['payment_refunds','SELECT id,payment_id,provider_attempt_id,amount,total_refunded,refunded_at,recorded_at FROM payment_refunds WHERE tenant_id=$1 ORDER BY id'],
  ['payments','SELECT id,invoice_id,amount,currency,received_on,reference,bank_entry_id,recorded_by,recorded_at,source,provider_attempt_id,reversed_at,reversed_by,reversal_reason,version FROM payment_records WHERE tenant_id=$1 ORDER BY id'],
  ['payment_attempts','SELECT id,invoice_id,method,environment,amount,currency,reference,state,transaction_id,provider_status,created_at,checked_at,error_code FROM payment_attempts WHERE tenant_id=$1 ORDER BY id'],
  ['payment_mandates','SELECT id,subscription_id,setup_attempt_id,status,consent_by,consent_at,terms,valid_until,activated_at,revoked_at,revoked_by FROM payment_mandates WHERE tenant_id=$1 ORDER BY id'],
] as const;

export async function claimExport(tenantId:string):Promise<Claim|null>{
  return withTenant(tenantId,async client=>{
    await client.query("UPDATE export_jobs SET status='failed',last_error_code='ATTEMPTS_EXHAUSTED',version=version+1 WHERE tenant_id=$1 AND status='running' AND locked_until<clock_timestamp() AND attempts>=5",[tenantId]);
    const row=(await client.query(`SELECT * FROM export_jobs WHERE tenant_id=$1 AND expires_at>clock_timestamp() AND attempts<5 AND ((status IN('pending','failed') AND next_attempt_at<=clock_timestamp()) OR (status='running' AND locked_until<clock_timestamp())) ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,[tenantId])).rows[0];
    if(!row)return null;
    const token=randomUUID();
    return (await client.query<Claim>("UPDATE export_jobs SET status='running',claim_token=$3,locked_until=clock_timestamp()+interval '15 minutes',attempts=attempts+1,version=version+1,last_error_code=NULL WHERE tenant_id=$1 AND id=$2 RETURNING id,tenant_id,requested_by,claim_token,attempts,expires_at",[tenantId,row.id,token])).rows[0];
  });
}
export async function produceExport(claim:Claim){
  const deadline=Math.min(Date.now()+10*60*1000,claim.expires_at.getTime());
  let file:Awaited<ReturnType<typeof createPrivateFile>>|undefined;
  let bytes=0,records=0;const hash=createHash('sha256');
  let stage='authorize';
  const check=()=>{if(Date.now()>=deadline)throw new AppError(410,'EXPORT_EXPIRED','Eksport on aegunud.');};
  try{
    const client=await pool().connect();
    try{
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const role=(await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
      if(role?.rolsuper||role?.rolbypassrls)throw new Error('Unsafe database role');
      await client.query("SELECT set_config('app.tenant_id',$1,true)",[claim.tenant_id]);
      await owner(client,claim.tenant_id,claim.requested_by);
      const valid=await client.query("SELECT id FROM export_jobs WHERE tenant_id=$1 AND id=$2 AND status='running' AND claim_token=$3 AND locked_until>clock_timestamp() AND expires_at>clock_timestamp()",[claim.tenant_id,claim.id,claim.claim_token]);
      if(!valid.rowCount)throw new AppError(409,'EXPORT_SUPERSEDED','Eksporditöö on asendatud.');
      file=await createPrivateFile(claim.tenant_id,'jsonl');
      const write=async(value:unknown)=>{
        check();const line=JSON.stringify(value)+'\n';bytes+=Buffer.byteLength(line);
        if(bytes>512*1024*1024)throw new AppError(413,'EXPORT_TOO_LARGE','Ekspordifail ületab lubatud mahu.');
        hash.update(line);await file!.handle.writeFile(line,'utf8');
      };
      const snapshot=(await client.query('SELECT current_timestamp AS at')).rows[0].at.toISOString();
      await write({type:'manifest',format:'broneering.info/jsonl-v1',tenantId:claim.tenant_id,snapshotAt:snapshot,datasets:datasets.map(d=>d[0]),note:'Amounts are integer euro cents; durations are minutes; identifiers preserve relationships; test bookings are marked is_test.'});
      for(const [dataset,sql] of datasets){
        stage=dataset;
        await client.query('DECLARE export_cursor NO SCROLL CURSOR FOR '+sql,[claim.tenant_id]);
        while(true){
          check();const rows=(await client.query('FETCH FORWARD 500 FROM export_cursor')).rows;
          if(!rows.length)break;
          for(const row of rows){await write({type:dataset,data:row});records++;}
        }
        await client.query('CLOSE export_cursor');
      }
      await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
    stage='finish';await file!.handle.sync();await file!.handle.close();check();
    const sha=hash.digest('hex');
    await withTenant(claim.tenant_id,async client=>{
      await client.query('SELECT id FROM tenants WHERE id=$1 FOR SHARE',[claim.tenant_id]);
      await owner(client,claim.tenant_id,claim.requested_by);
      const job=(await client.query("SELECT id FROM export_jobs WHERE tenant_id=$1 AND id=$2 AND status='running' AND claim_token=$3 AND locked_until>clock_timestamp() AND expires_at>clock_timestamp() FOR UPDATE",[claim.tenant_id,claim.id,claim.claim_token])).rows[0];
      if(!job)throw new AppError(409,'EXPORT_SUPERSEDED','Eksporditöö on asendatud.');
      const media=(await client.query("INSERT INTO media(tenant_id,storage_key,purpose,content_type,byte_size,sha256,status,created_by,expires_at) VALUES($1,$2,'export','application/x-ndjson',$3,$4,'ready',$5,$6) RETURNING id",[claim.tenant_id,file!.key,bytes,sha,claim.requested_by,claim.expires_at])).rows[0];
      await client.query("UPDATE export_jobs SET status='ready',result_media_id=$3,record_count=$4,locked_until=NULL,version=version+1 WHERE tenant_id=$1 AND id=$2",[claim.tenant_id,claim.id,media.id,records]);
      await audit(client,claim.tenant_id,claim.requested_by,'export.completed',undefined,claim.id,{records,bytes});
    });
    return 'ready';
  }catch(error){
    await file?.handle.close().catch(()=>{});
    const code=error instanceof AppError?error.code:'EXPORT_FAILED';
    if(!(error instanceof AppError))console.error(JSON.stringify({event:'export.failed',stage,code:/^[0-9A-Z]{5}$/.test(String((error as {code?:string})?.code))?(error as {code:string}).code:'IO_ERROR'}));
    await withTenant(claim.tenant_id,async client=>{
      await client.query("UPDATE export_jobs SET status=$4,last_error_code=$5,locked_until=NULL,next_attempt_at=clock_timestamp()+interval '1 minute',version=version+1 WHERE tenant_id=$1 AND id=$2 AND claim_token=$3 AND status='running'",[claim.tenant_id,claim.id,claim.claim_token,error instanceof AppError&&[401,403,410,413].includes(error.status)?'cancelled':'failed',code]);
    });
    if(file){
      // Confirmed privacy cancellation is final: this snapshot can no longer publish.
      // Still check for a committed media reference before unlinking after an uncertain COMMIT.
      const discarded=await withTenant(claim.tenant_id,async client=>(await client.query(`SELECT 1 FROM export_jobs e WHERE e.tenant_id=$1 AND e.id=$2 AND e.status='cancelled' AND e.last_error_code='CONTACTS_REMOVED' AND NOT EXISTS(SELECT 1 FROM media m WHERE m.tenant_id=$1 AND m.storage_key=$3)`,[claim.tenant_id,claim.id,file!.key])).rowCount!==0);
      if(discarded)await removePrivateFile(file.key).catch(()=>{});
    }
    // Other uncertain outcomes retain the file for the normal orphan sweep.
    return 'failed';
  }
}
export async function expireExports(tenantId:string){
  const files=await withTenant(tenantId,async client=>{
    await client.query("UPDATE export_jobs SET status='expired',version=version+1 WHERE tenant_id=$1 AND expires_at<=clock_timestamp() AND status<>'expired'",[tenantId]);
    return (await client.query("SELECT id,storage_key FROM media WHERE tenant_id=$1 AND purpose='export' AND expires_at<=clock_timestamp() AND status<>'deleted' LIMIT 25",[tenantId])).rows;
  });
  for(const file of files){
    await removePrivateFile(file.storage_key);
    await withTenant(tenantId,c=>c.query("UPDATE media SET status='deleted',version=version+1 WHERE tenant_id=$1 AND id=$2 AND expires_at<=clock_timestamp()",[tenantId,file.id]));
  }
}
let cursor='00000000-0000-0000-0000-000000000000';
let lastPrune=0;
export async function runExportBatch(){
  if(Date.now()-lastPrune>10*60*1000){
    await pruneOrphanFiles((tenantId,key)=>withTenant(tenantId,async c=>(await c.query('SELECT 1 FROM media WHERE tenant_id=$1 AND storage_key=$2',[tenantId,key])).rowCount!==0));lastPrune=Date.now();
  }
  let tenants=(await pool().query('SELECT id FROM tenants WHERE id>$1 ORDER BY id LIMIT 25',[cursor])).rows;
  if(!tenants.length){cursor='00000000-0000-0000-0000-000000000000';tenants=(await pool().query('SELECT id FROM tenants ORDER BY id LIMIT 25')).rows;}
  let processed=0,failed=0;
  for(const tenant of tenants){cursor=tenant.id;await expireExports(tenant.id);const claim=await claimExport(tenant.id);if(claim){if(await produceExport(claim)==='failed')failed++;processed++;}}
  return {processed,failed};
}
