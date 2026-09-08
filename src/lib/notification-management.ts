import {z} from 'zod';
import {withTenant} from './db';
import {requireOwnerInTransaction,audit,type Actor} from './access';
import {notificationCommand,type NotificationState} from './notification-contracts';
import {bookingMailMode,bookingMailConfigured} from './notification-config';
import {AppError} from './errors';
const fail=(code:string,message:string):never=>{throw new AppError(409,code,message);};
export async function notificationState(actor:Actor,tenantId:string,page=0):Promise<NotificationState>{
  if(!z.uuid().safeParse(tenantId).success||!Number.isInteger(page)||page<0||page>10000)throw new AppError(400,'INVALID_INPUT','Kontrolli päringu andmeid.');
  return withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    const tenant=(await client.query('SELECT notification_email,reminder_minutes,notification_settings_version,demo FROM tenants WHERE id=$1',[tenantId])).rows[0];
    const jobs=(await client.query(`SELECT o.id,b.reference,o.kind,o.recipient_kind AS "recipientKind",o.status,o.version,o.attempts,o.retry_budget AS "retryBudget",o.next_attempt_at AS "nextAttemptAt",o.last_error_code AS "lastErrorCode",o.sent_at AS "sentAt",o.delivery_status AS "deliveryStatus",o.captured_at AS "capturedAt" FROM outbox o JOIN bookings b ON b.tenant_id=o.tenant_id AND b.id=o.booking_id WHERE o.tenant_id=$1 ORDER BY o.created_at DESC,o.id DESC LIMIT 51 OFFSET $2`,[tenantId,page*50])).rows;
    return {settings:{version:tenant.notification_settings_version,notificationEmail:tenant.notification_email??'',reminderMinutes:tenant.reminder_minutes},mode:bookingMailMode(),configured:bookingMailConfigured(),demo:tenant.demo,jobs:jobs.slice(0,50).map(r=>({...r,nextAttemptAt:r.nextAttemptAt.toISOString(),sentAt:r.sentAt?.toISOString()??null,capturedAt:r.capturedAt?.toISOString()??null})),hasMore:jobs.length>50};
  });
}
export async function changeNotificationSettings(actor:Actor,raw:unknown){
  const parsed=notificationCommand.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli teavituste seadeid ja põhjendust.');
  const input=parsed.data;
  return withTenant(input.tenantId,async client=>{
    await requireOwnerInTransaction(actor,input.tenantId,client);
    if(input.action==='settings'){
      const before=(await client.query('SELECT notification_email,reminder_minutes,notification_settings_version FROM tenants WHERE id=$1',[input.tenantId])).rows[0];
      if(before.notification_settings_version!==input.version)fail('VERSION_CONFLICT','Seadeid on vahepeal muudetud. Laadi värske seis.');
      await client.query('UPDATE tenants SET notification_email=$2,reminder_minutes=$3,notification_settings_version=notification_settings_version+1 WHERE id=$1',[input.tenantId,input.notificationEmail||null,input.reminderMinutes]);
      if(before.reminder_minutes!==input.reminderMinutes){
        await client.query("UPDATE outbox SET status='superseded',version=version+1 WHERE tenant_id=$1 AND kind='booking.reminder' AND status IN ('pending','failed','sending')",[input.tenantId]);
        if(input.reminderMinutes!=null)await client.query(`INSERT INTO outbox(tenant_id,booking_id,booking_version,kind,language,next_attempt_at)
          SELECT tenant_id,id,version,'booking.reminder',customer_language,start_at-$2*interval '1 minute' FROM bookings
          WHERE tenant_id=$1 AND status='confirmed' AND attention_reason IS NULL AND customer_email IS NOT NULL AND customer_notifications AND start_at-$2*interval '1 minute'>clock_timestamp()
          ON CONFLICT(tenant_id,booking_id,booking_version,kind) DO UPDATE SET status='pending',next_attempt_at=EXCLUDED.next_attempt_at,claim_token=NULL,locked_until=NULL,last_error_code=NULL,version=outbox.version+1
          WHERE outbox.status='superseded' AND outbox.captured_at IS NULL AND outbox.attempts<outbox.retry_budget`,[input.tenantId,input.reminderMinutes]);
      }
      await audit(client,input.tenantId,actor.id,'notifications.settings',undefined,undefined,{before,after:{notificationEmail:input.notificationEmail,reminderMinutes:input.reminderMinutes}});
    }else{
      const job=(await client.query('SELECT o.*,b.version current_version FROM outbox o JOIN bookings b ON b.tenant_id=o.tenant_id AND b.id=o.booking_id WHERE o.tenant_id=$1 AND o.id=$2 FOR UPDATE OF o',[input.tenantId,input.id])).rows[0];
      if(!job)throw new AppError(404,'NOTICE_NOT_FOUND','Teavitust ei leitud.');
      if(job.version!==input.version)fail('VERSION_CONFLICT','Teavituse seisund on muutunud. Laadi värske seis.');
      if(input.action==='retry'){
        if(job.status!=='failed'||job.booking_version!==job.current_version)fail('NOTICE_NOT_RETRYABLE','Seda teavitust ei saa uuesti saata.');
        if(job.attempts>=80)fail('NOTICE_RETRY_LIMIT','Korduskatsete ülempiir on täis. Kontrolli saatmislahendust.');
        await client.query("UPDATE outbox SET status='pending',retry_budget=LEAST(80,GREATEST(retry_budget,attempts+8)),next_attempt_at=clock_timestamp(),last_error_code=NULL,version=version+1 WHERE tenant_id=$1 AND id=$2",[input.tenantId,input.id]);
      }else{
        if(job.status!=='sent')fail('NOTICE_NOT_SENT','Tagasisidet saab lisada ainult SMTP-le edastatud kirjale.');
        await client.query('UPDATE outbox SET delivery_status=$3,version=version+1 WHERE tenant_id=$1 AND id=$2',[input.tenantId,input.id,input.deliveryStatus]);
      }
      await audit(client,input.tenantId,actor.id,'notifications.'+input.action,undefined,input.id,{reason:input.reason,...(input.action==='feedback'?{deliveryStatus:input.deliveryStatus}:{}),beforeStatus:job.status});
    }
    return {ok:true};
  });
}
