import {z} from 'zod';
import {withTenant} from './db';
import {type Actor,requireOwnerInTransaction,audit} from './access';
import {AppError} from './errors';
import {removePrivateFile} from './private-files';
import {issueBookingLink,bookingEvent,type BookingRow} from './booking-records';
import type {Tenant} from './tenants';
const schema=z.object({tenantId:z.uuid(),id:z.uuid(),version:z.number().int().positive(),action:z.enum(['cancel','enable-reminders','discard-source']),confirmed:z.literal(true).optional()}).strict();
export async function importLifecycle(actor:Actor,raw:unknown){
  const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli impordi toimingut.');const d=parsed.data;
  const result=await withTenant(d.tenantId,async client=>{
    await requireOwnerInTransaction(actor,d.tenantId,client);
    const b=(await client.query('SELECT * FROM import_batches WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[d.tenantId,d.id])).rows[0];
    if(!b)throw new AppError(404,'IMPORT_NOT_FOUND','Importi ei leitud.');
    if(d.action==='discard-source'){
      if(!d.confirmed)throw new AppError(400,'INVALID_INPUT','Kinnita impordi algandmete eemaldamine.');
      if((await client.query("SELECT 1 FROM retention_policies WHERE tenant_id=$1 AND data_class IN ('booking_contacts','audit') AND legal_hold",[d.tenantId])).rowCount)throw new AppError(409,'LEGAL_HOLD','Andmetele kehtib säilitamiskohustus.');
      if(!['completed','cancelled'].includes(b.status))throw new AppError(409,'IMPORT_NOT_COMPLETED','Algandmeid saab eemaldada lõpetatud või tühistatud impordist.');
      if(b.source_purged_at)return {id:d.id,scheduled:0};
      if(b.version!==d.version)throw new AppError(409,'VERSION_CONFLICT','Andmed on vahepeal muutunud. Värskenda vaadet.');
      await client.query("UPDATE import_rows SET external_id_hash=coalesce(external_id_hash,encode(sha256(convert_to(nullif(normalized->>'externalId',''),'UTF8')),'hex')),source_values='[]',normalized='{}',error_code=NULL,warning_codes='[]' WHERE tenant_id=$1 AND batch_id=$2",[d.tenantId,d.id]);
      await client.query("UPDATE import_batches SET headers='[]',mapping='{}',error_report='[]',version=version+1 WHERE tenant_id=$1 AND id=$2",[d.tenantId,d.id]);
      await audit(client,d.tenantId,actor.id,'import.source_removed',undefined,d.id);
      const file=(await client.query('SELECT id,storage_key FROM media WHERE tenant_id=$1 AND id=$2',[d.tenantId,b.source_media_id])).rows[0];
      return {id:d.id,scheduled:0,file};
    }
    if(d.action==='cancel'){
      if(b.status!=='cancelled'){
        if(b.version!==d.version||!['uploaded','preview','failed'].includes(b.status))throw new AppError(409,'VERSION_CONFLICT','Andmed on vahepeal muutunud. Värskenda vaadet.');
        await client.query("UPDATE import_rows SET status='skipped',source_values='[]',normalized='{}',error_code=NULL,warning_codes='[]' WHERE tenant_id=$1 AND batch_id=$2",[d.tenantId,d.id]);
        await client.query("UPDATE import_batches SET status='cancelled',rejected_rows=total_rows,version=version+1 WHERE tenant_id=$1 AND id=$2",[d.tenantId,d.id]);
        await audit(client,d.tenantId,actor.id,'import.cancelled',undefined,d.id);
      }
      const file=(await client.query('SELECT id,storage_key FROM media WHERE tenant_id=$1 AND id=$2',[d.tenantId,b.source_media_id])).rows[0];
      return {id:d.id,scheduled:0,file};
    }
    if(b.status!=='completed'||b.kind!=='bookings')throw new AppError(409,'IMPORT_NOT_COMPLETED','Meeldetuletusi saab lubada lõpetatud broneeringuimpordile.');
    if(b.reminders_enabled)return {id:d.id,scheduled:0};
    if(b.version!==d.version)throw new AppError(409,'VERSION_CONFLICT','Andmed on vahepeal muutunud. Värskenda vaadet.');
    const tenant=(await client.query<Tenant&{reminder_minutes:number|null}>('SELECT * FROM tenants WHERE id=$1',[d.tenantId])).rows[0];
    if(tenant.reminder_minutes==null||tenant.management_link_hours==null)throw new AppError(409,'REMINDER_POLICY_REQUIRED','Määra enne meeldetuletuse aeg ja halduslingi kehtivus.');
    const bookings=(await client.query<BookingRow>(`SELECT b.* FROM bookings b JOIN import_rows r ON r.tenant_id=b.tenant_id AND r.booking_id=b.id WHERE r.tenant_id=$1 AND r.batch_id=$2 AND r.status='imported' AND b.status='confirmed' AND b.start_at>clock_timestamp() AND b.customer_email IS NOT NULL AND b.customer_email<>'' ORDER BY b.id FOR UPDATE OF b`,[d.tenantId,d.id])).rows;
    let scheduled=0;
    for(const before of bookings){
      const after=(await client.query<BookingRow>('UPDATE bookings SET customer_notifications=true,version=version+1,updated_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2 RETURNING *',[d.tenantId,before.id])).rows[0];
      await issueBookingLink(client,tenant,after);
      await client.query("UPDATE outbox SET status='superseded',version=version+1 WHERE tenant_id=$1 AND booking_id=$2 AND status IN ('pending','failed','sending')",[d.tenantId,after.id]);
      const due=new Date(after.start_at.getTime()-tenant.reminder_minutes*60000);
      if(after.customer_reminders!==false&&due.getTime()>Date.now()){
        await client.query("INSERT INTO outbox(tenant_id,booking_id,booking_version,kind,language,next_attempt_at) VALUES($1,$2,$3,'booking.reminder',$4,$5)",[d.tenantId,after.id,after.version,after.customer_language,due]);scheduled++;
      }
      await bookingEvent(client,after,'import.notifications.enabled',actor.id,before);
    }
    await client.query('UPDATE import_batches SET reminders_enabled=true,reminders_approved_by=$3,reminders_approved_at=clock_timestamp(),version=version+1 WHERE tenant_id=$1 AND id=$2',[d.tenantId,d.id,actor.id]);
    await audit(client,d.tenantId,actor.id,'import.reminders.enabled',undefined,d.id,{scheduled});
    return {id:d.id,scheduled};
  });
  if(result.file){
    // Commit cancellation before removing the file; retries safely finish interrupted cleanup.
    await removePrivateFile(result.file.storage_key);
    await withTenant(d.tenantId,async client=>{
      await client.query("UPDATE media SET status='deleted',version=version+1 WHERE tenant_id=$1 AND id=$2 AND status<>'deleted'",[d.tenantId,result.file.id]);
      await client.query('UPDATE import_batches SET source_purged_at=coalesce(source_purged_at,clock_timestamp()) WHERE tenant_id=$1 AND id=$2',[d.tenantId,d.id]);
    });
  }
  return {id:result.id,scheduled:result.scheduled};
}
