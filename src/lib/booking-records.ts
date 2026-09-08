import type {PoolClient} from 'pg';
import type {BookingResult} from './contracts';
import type {Tenant} from './tenants';
import {randomBookingToken,tokenHash} from './booking-secrets';
import {AppError} from './errors';

export type BookingRow={id:string;tenant_id:string;reference:string;service_id:string;staff_id:string;service_name:string;staff_name:string;customer_name:string;customer_email:string|null;customer_phone:string|null;start_at:Date;end_at:Date;price:number;duration:number;buffer_before:number;buffer_after:number;cancellation_hours:number|null;status:'confirmed'|'completed'|'cancelled'|'no_show';version:number;source:'online'|'manual';attention_reason:string|null};
export function bookingResult(row:BookingRow):BookingResult{
  return {id:row.id,reference:row.reference,serviceName:row.service_name,staffName:row.staff_name,start:row.start_at.toISOString(),end:row.end_at.toISOString(),price:row.price,duration:row.duration,cancellationHours:row.cancellation_hours,status:row.status,version:row.version};
}
export function bookingSnapshot(row:BookingRow){
  return {...bookingResult(row),serviceId:row.service_id,staffId:row.staff_id,bufferBefore:row.buffer_before,bufferAfter:row.buffer_after,source:row.source,attentionReason:row.attention_reason};
}
export async function bookingEvent(client:PoolClient,after:BookingRow,action:string,actorId:string|null,before?:BookingRow,reason=''){
  await client.query('INSERT INTO booking_events(tenant_id,booking_id,actor_user_id,action,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)',[after.tenant_id,after.id,actorId,action,reason,before?bookingSnapshot(before):null,bookingSnapshot(after)]);
}
export async function issueBookingLink(client:PoolClient,tenant:Tenant,row:BookingRow){
  if(tenant.management_link_hours==null)throw new AppError(409,'LINK_POLICY_REQUIRED','Ettevõtte omanik peab esmalt määrama halduslingi poliitika ja kontaktandmed.');
  const expires=new Date(row.end_at.getTime()+tenant.management_link_hours*3600000);
  if(expires.getTime()<=Date.now())throw new AppError(409,'LINK_WINDOW_CLOSED','Selle broneeringu halduslingi kehtivusaken on möödas. Võta ettevõttega ühendust.');
  const token=randomBookingToken();
  await client.query('UPDATE booking_management_tokens SET revoked_at=now() WHERE tenant_id=$1 AND booking_id=$2 AND revoked_at IS NULL',[tenant.id,row.id]);
  await client.query('INSERT INTO booking_management_tokens(tenant_id,booking_id,token_hash,expires_at,after_end_hours) VALUES($1,$2,$3,$4,$5)',[tenant.id,row.id,tokenHash(token),expires,tenant.management_link_hours]);
  // URL fragments never travel to application/proxy access logs or HTTP referrers.
  return {managementUrl:'/broneering#'+token,managementExpiresAt:expires.toISOString()};
}
export async function queueBookingNotice(client:PoolClient,row:BookingRow,kind:string){
  await client.query("UPDATE outbox SET status='superseded' WHERE tenant_id=$1 AND booking_id=$2 AND booking_version<$3 AND status IN ('pending','failed')",[row.tenant_id,row.id,row.version]);
  await client.query('INSERT INTO outbox(tenant_id,booking_id,booking_version,kind,status) VALUES($1,$2,$3,$4,$5)',[row.tenant_id,row.id,row.version,kind,row.customer_email?'pending':'skipped']);
}
export async function markBookingsForAttention(client:PoolClient,tenantId:string,ids:string[],actorId:string,reason:string){
  if(!ids.length)return;
  const existing=await client.query<BookingRow>("SELECT * FROM bookings WHERE tenant_id=$1 AND id=ANY($2::uuid[]) AND status='confirmed' AND attention_reason IS DISTINCT FROM $3 FOR UPDATE",[tenantId,ids,reason]);
  for(const before of existing.rows){
    const after=(await client.query<BookingRow>('UPDATE bookings SET attention_reason=$3,version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *',[tenantId,before.id,reason])).rows[0];
    await bookingEvent(client,after,'attention.required',actorId,before,reason);
    // Existing queued notices cannot describe this version as ready for service.
    await client.query("UPDATE outbox SET status='superseded' WHERE tenant_id=$1 AND booking_id=$2 AND status IN ('pending','failed')",[tenantId,before.id]);
  }
}
