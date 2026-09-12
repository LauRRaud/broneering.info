import {randomUUID} from 'node:crypto';
import {pool,withTenant} from './db';
import {sendNotificationMail,type NotificationMail} from './notification-mail';
import {bookingMailConfigured,bookingMailMode} from './notification-config';
import {notificationMessage} from './notification-templates';
import {openBookingReply,tokenHash} from './booking-secrets';
import type {BookingRow} from './booking-records';
import type {PoolClient} from 'pg';
import type {Locale} from './locales';

type Claim={id:string;tenant_id:string;booking_id:string;booking_version:number;kind:string;recipient_kind:'customer'|'company';language:Locale;attempts:number;retry_budget:number;claim_token:string};
type Sender=(mail:NotificationMail)=>Promise<'sent'|'capture'>;

export async function claimNotification(tenantId:string):Promise<Claim|null>{
  return withTenant(tenantId,async client=>{
    await client.query('SELECT id FROM tenants WHERE id=$1 FOR SHARE',[tenantId]);
    const candidate=(await client.query<Claim&{status:string}>(`SELECT * FROM outbox WHERE tenant_id=$1 AND
      ((status IN ('pending','failed') AND attempts<retry_budget AND next_attempt_at<=clock_timestamp()) OR (status='sending' AND locked_until<=clock_timestamp()))
      ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`,[tenantId])).rows[0];
    if(!candidate)return null;
    if(candidate.status==='sending'){
      await client.query("UPDATE notification_attempts SET outcome='failed',error_code='LEASE_EXPIRED',finished_at=clock_timestamp() WHERE tenant_id=$1 AND outbox_id=$2 AND outcome='sending'",[tenantId,candidate.id]);
      if(candidate.attempts>=candidate.retry_budget){
        await client.query("UPDATE outbox SET status='failed',last_error_code='RETRY_EXHAUSTED',claim_token=NULL,locked_until=NULL,version=version+1 WHERE tenant_id=$1 AND id=$2",[tenantId,candidate.id]);return null;
      }
    }
    const claim=(await client.query<Claim>(`UPDATE outbox SET status='sending',claim_token=$3,locked_until=clock_timestamp()+interval '90 seconds',attempts=attempts+1,last_attempt_at=clock_timestamp(),version=version+1 WHERE tenant_id=$1 AND id=$2 RETURNING *`,[tenantId,candidate.id,randomUUID()])).rows[0];
    await client.query('INSERT INTO notification_attempts(tenant_id,outbox_id,attempt) VALUES($1,$2,$3)',[tenantId,claim.id,claim.attempts]);
    return claim;
  });
}
async function finish(client:PoolClient,claim:Claim,outcome:'sent'|'capture'|'failed'|'skipped'|'superseded',code:string|null=null,permanent=false){
  const status=outcome==='capture'?'skipped':outcome;
  const delay=Math.min(3600,60*2**Math.min(claim.attempts-1,6));
  await client.query(`UPDATE outbox SET status=$4,last_error_code=$5,claim_token=NULL,locked_until=NULL,
    sent_at=CASE WHEN $4='sent' THEN clock_timestamp() ELSE sent_at END,
    captured_at=CASE WHEN $6='capture' THEN clock_timestamp() ELSE captured_at END,
    transport_id=CASE WHEN $6 IN ('sent','capture') THEN $7 ELSE transport_id END,
    retry_budget=CASE WHEN $8 THEN attempts ELSE retry_budget END,
    next_attempt_at=CASE WHEN $4='failed' THEN clock_timestamp()+$9*interval '1 second' ELSE next_attempt_at END,version=version+1
    WHERE tenant_id=$1 AND id=$2 AND claim_token=$3`,[claim.tenant_id,claim.id,claim.claim_token,status,code,outcome,`<booking-${claim.id}@broneering.info>`,permanent,delay]);
  await client.query('UPDATE notification_attempts SET outcome=$4,error_code=$5,finished_at=clock_timestamp() WHERE tenant_id=$1 AND outbox_id=$2 AND attempt=$3',[claim.tenant_id,claim.id,claim.attempts,outcome,code]);
}

/** No automatic transaction retries around SMTP. The stable Message-ID mitigates
 * duplicates; SMTP acceptance and COMMIT cannot provide exactly-once delivery.
 */
export async function deliverNotification(claim:Claim,send:Sender=sendNotificationMail){
  return withTenant(claim.tenant_id,async client=>{
    // Same tenant lock as booking commands: no version change during bounded send.
    const tenant=(await client.query('SELECT * FROM tenants WHERE id=$1 FOR SHARE',[claim.tenant_id])).rows[0];
    const job=(await client.query('SELECT * FROM outbox WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[claim.tenant_id,claim.id])).rows[0];
    if(!job||job.status!=='sending'||job.claim_token!==claim.claim_token){
      await client.query("UPDATE notification_attempts SET outcome='superseded',finished_at=clock_timestamp() WHERE tenant_id=$1 AND outbox_id=$2 AND attempt=$3 AND outcome='sending'",[claim.tenant_id,claim.id,claim.attempts]);return 'superseded';
    }
    const booking=(await client.query<BookingRow & {is_test:boolean}>('SELECT * FROM bookings WHERE tenant_id=$1 AND id=$2 FOR SHARE',[claim.tenant_id,claim.booking_id])).rows[0];
    const kind=claim.kind.replace(/^company\./,'');
    if(tenant.service_ends_at&&tenant.service_ends_at.getTime()<=Date.now()){
      await finish(client,claim,'skipped','SERVICE_ENDED');return 'skipped';
    }
    if(!booking||booking.version!==claim.booking_version||booking.attention_reason||(kind==='booking.cancelled'?booking.status!=='cancelled':booking.status!=='confirmed')){
      await finish(client,claim,'superseded','BOOKING_CHANGED');return 'superseded';
    }
    if(!['booking.confirmed','booking.changed','booking.cancelled','booking.reminder'].includes(kind)){
      await finish(client,claim,'failed','UNKNOWN_NOTICE_KIND',true);return 'failed';
    }
    if((tenant.demo||booking.is_test)&&bookingMailMode()!=='capture'){
      await finish(client,claim,'skipped','TEST_MODE');return 'skipped';
    }
    const company=claim.recipient_kind==='company';
    const to=company?tenant.notification_email:booking.customer_notifications!==false?booking.customer_email:null;
    if(!to){await finish(client,claim,'skipped','RECIPIENT_DISABLED');return 'skipped';}
    if(kind==='booking.reminder'&&(booking.customer_reminders===false||tenant.reminder_minutes==null||booking.start_at.getTime()<=Date.now())){
      await finish(client,claim,'skipped','REMINDER_NOT_APPLICABLE');return 'skipped';
    }
    let managementUrl:string|undefined;
    if(!company){
      const token=(await client.query('SELECT token_hash,encrypted_token FROM booking_management_tokens WHERE tenant_id=$1 AND booking_id=$2 AND revoked_at IS NULL AND expires_at>clock_timestamp() AND encrypted_token IS NOT NULL ORDER BY created_at DESC LIMIT 1',[claim.tenant_id,booking.id])).rows[0];
      if(token){
        const host=(await client.query('SELECT hostname FROM tenant_domains WHERE tenant_id=$1 AND ready ORDER BY hostname LIMIT 1',[claim.tenant_id])).rows[0]?.hostname as string|undefined;
        if(!host){await finish(client,claim,'failed','DOMAIN_NOT_READY');return 'failed';}
        const secret=openBookingReply<{token:string}>(token.encrypted_token,`mail-link:${claim.tenant_id}:${booking.id}:${token.token_hash}`);
        if(tokenHash(secret.token)!==token.token_hash)throw new Error('Invalid notification link');
        const local=process.env.NODE_ENV!=='production'&&host.endsWith('.localhost');
        managementUrl=`${local?'http':'https'}://${host}${local?':'+(process.env.PUBLIC_LOCAL_PORT||'3107'):''}/broneering#${secret.token}`;
      }
    }
    const mail=notificationMessage({id:claim.id,kind:claim.kind,language:claim.language,to,company,booking,tenant,managementUrl});
    try{
      const outcome=await send(mail);await finish(client,claim,outcome);return outcome;
    }catch(error){
      const e=error as {responseCode?:number;code?:string};
      const permanent=(e.responseCode??0)>=500||['EAUTH','INVALID_MAIL','RECIPIENT_REJECTED'].includes(e.code??'');
      // Never persist remote SMTP text: it often contains recipient addresses.
      await finish(client,claim,'failed',permanent?'SMTP_PERMANENT':'SMTP_TEMPORARY',permanent);return 'failed';
    }
  });
}

let cursor:string|null=null;
export async function runNotificationBatch(limit=25){
  if(!bookingMailConfigured())return {processed:0,failed:0,configured:false};
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Invalid notification batch size');
  const tenants=(await pool().query<{id:string}>('SELECT id FROM tenants WHERE ($1::uuid IS NULL OR id>$1) ORDER BY id LIMIT $2',[cursor,limit])).rows;
  let processed=0,failed=0;
  for(const tenant of tenants){cursor=tenant.id;const claim=await claimNotification(tenant.id);if(claim){if(await deliverNotification(claim)==='failed')failed++;processed++;}}
  if(tenants.length<limit)cursor=null;
  return {processed,failed,configured:true};
}
