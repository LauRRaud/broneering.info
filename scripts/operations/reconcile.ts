import type pg from 'pg';
import {z} from 'zod';
import type {RemovalRecord} from './recovery-artifact';
const recordsSchema=z.array(z.object({id:z.uuid(),tenantId:z.uuid(),customerIds:z.array(z.uuid()).max(100000),bookingIds:z.array(z.uuid()).max(100000),removedAt:z.iso.datetime()}).strict()).max(100000);

/** Offline operator only. Never call from the application or against its live database. */
export async function reconcileRemovedContacts(target:pg.Client,records:RemovalRecord[],isolated:boolean){
 recordsSchema.parse(records);
 const identity=(await target.query('SELECT current_database() AS name,rolsuper OR rolbypassrls AS privileged FROM pg_roles WHERE rolname=current_user')).rows[0];
 if(!isolated||!/^recovery_[a-f0-9]{32}$/.test(identity.name)||!identity.privileged)throw Error('An isolated recovery database and privileged recovery role are required');
 await target.query('BEGIN');
 try{
  // Exclusive locks stop a mistakenly connected writer while the offline replay runs.
  await target.query('LOCK TABLE customers,bookings,contact_removals IN ACCESS EXCLUSIVE MODE');
  for(const r of records){
   if(!(await target.query('SELECT 1 FROM tenants WHERE id=$1',[r.tenantId])).rowCount)continue;
   const params=[r.tenantId,r.customerIds,r.bookingIds,r.removedAt];
   await target.query(`UPDATE customers SET name='[removed]',email=NULL,phone=NULL,source_key='redacted:'||id::text,contact_redacted_at=$4::timestamptz,version=version+1,updated_at=clock_timestamp() WHERE tenant_id=$1 AND id=ANY($2::uuid[]) AND contact_redacted_at IS NULL AND $3::uuid[] IS NOT NULL`,params);
   const bids=(await target.query('SELECT id FROM bookings WHERE tenant_id=$1 AND (customer_id=ANY($2::uuid[]) OR id=ANY($3::uuid[]))',[r.tenantId,r.customerIds,r.bookingIds])).rows.map(row=>row.id);
   await target.query(`UPDATE bookings SET customer_name='[removed]',customer_email=NULL,customer_phone=NULL,attention_reason=NULL,customer_notifications=false,contact_redacted_at=$3::timestamptz,version=version+1,updated_at=clock_timestamp() WHERE tenant_id=$1 AND id=ANY($2::uuid[]) AND contact_redacted_at IS NULL`,[r.tenantId,bids,r.removedAt]);
   await target.query(`UPDATE booking_events SET reason='',before_data=before_data-'attentionReason',after_data=after_data-'attentionReason' WHERE tenant_id=$1 AND booking_id=ANY($2::uuid[])`,[r.tenantId,bids]);
   // Match live removal's history contract so restored cards remain readable.
   await target.query(`UPDATE access_audit_log SET metadata=CASE
    WHEN action='customer.correct' THEN jsonb_build_object('before',coalesce(metadata->'before','{}')||$4::jsonb,'after',coalesce(metadata->'after','{}')||$4::jsonb,'reason','')
    WHEN action='customer.merge' THEN jsonb_build_object('source',coalesce(metadata->'source','{}')||$4::jsonb,'target',coalesce(metadata->'target','{}')||$4::jsonb,'reason','','bookingsMoved',metadata->'bookingsMoved')
    ELSE '{}'::jsonb END WHERE tenant_id=$1 AND (target_id=ANY($2::text[]) OR target_id=ANY($3::text[]))`,[r.tenantId,r.customerIds,bids,JSON.stringify({name:'[removed]',email:null,phone:null})]);
   await target.query(`UPDATE booking_management_tokens SET revoked_at=coalesce(revoked_at,clock_timestamp()),encrypted_token=NULL WHERE tenant_id=$1 AND booking_id=ANY($2::uuid[])`,[r.tenantId,bids]);
   await target.query(`UPDATE booking_requests SET encrypted_link=NULL WHERE tenant_id=$1 AND booking_id=ANY($2::uuid[])`,[r.tenantId,bids]);
   await target.query(`UPDATE outbox SET status='superseded',claim_token=NULL,locked_until=NULL,version=version+1 WHERE tenant_id=$1 AND booking_id=ANY($2::uuid[]) AND status IN ('pending','failed','sending')`,[r.tenantId,bids]);
   await target.query(`INSERT INTO contact_removals(id,tenant_id,customer_ids,booking_ids,removed_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`,[r.id,r.tenantId,r.customerIds,r.bookingIds,r.removedAt]);
  }
  await target.query(`UPDATE import_rows SET external_id_hash=coalesce(external_id_hash,encode(sha256(convert_to(nullif(normalized->>'externalId',''),'UTF8')),'hex')),source_values='[]',normalized='{}',error_code=NULL,warning_codes='[]'`);
  await target.query(`UPDATE import_batches SET headers='[]',mapping='{}',error_report='[]',version=version+1`);
  // Restored snapshots and bearer sessions are never reused. Import source payloads
  // are quarantined for an operator; they cannot be run or served after recovery.
  await target.query(`UPDATE export_jobs SET status='cancelled',claim_token=NULL,locked_until=NULL,last_error_code='RECOVERY_INVALIDATED',version=version+1 WHERE status IN ('pending','running','ready','failed')`);
  await target.query(`UPDATE media SET status='quarantined',version=version+1 WHERE purpose IN ('import','export') AND status<>'deleted'`);
  await target.query(`UPDATE import_batches SET status='cancelled',version=version+1 WHERE status IN ('uploaded','preview','approved','running')`);
  await target.query('DELETE FROM auth_session');
  await target.query('COMMIT');return {replayed:records.length};
 }catch(e){await target.query('ROLLBACK');throw e;}
}
