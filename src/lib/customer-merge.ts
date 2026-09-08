import {createHash} from 'node:crypto';
import {z} from 'zod';
import {withTenant} from './db';
import {type Actor,requireMembershipInClient,audit} from './access';
import {AppError} from './errors';
const schema=z.object({tenantId:z.uuid(),requestKey:z.uuid(),sourceId:z.uuid(),targetId:z.uuid(),sourceVersion:z.number().int().positive(),targetVersion:z.number().int().positive(),reason:z.string().trim().min(10).max(500),confirmed:z.literal(true)}).strict();
export async function mergeCustomers(actor:Actor,raw:unknown){
 const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_MERGE','Kontrolli ühendatavaid kliendikaarte, põhjust ja kinnitust.');const d=parsed.data;
 if(d.sourceId===d.targetId)throw new AppError(400,'INVALID_MERGE','Vali kaks erinevat kliendikaarti.');
 const hash=createHash('sha256').update(JSON.stringify(d)).digest('hex');
 return withTenant(d.tenantId,async client=>{
  await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[d.tenantId]);
  await requireMembershipInClient(actor,d.tenantId,'customers.manage',client);
  const previous=(await client.query('SELECT payload_hash,target_id,booking_count FROM customer_merges WHERE tenant_id=$1 AND request_key=$2',[d.tenantId,d.requestKey])).rows[0];
  if(previous){if(previous.payload_hash!==hash)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');return {id:previous.target_id,bookingsMoved:previous.booking_count};}
  const rows=(await client.query('SELECT id,name,email,phone,version,merged_into_id,contact_redacted_at FROM customers WHERE tenant_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR UPDATE',[d.tenantId,[d.sourceId,d.targetId]])).rows;
  const source=rows.find(r=>r.id===d.sourceId),target=rows.find(r=>r.id===d.targetId);
  if(!source||!target)throw new AppError(404,'CUSTOMER_NOT_FOUND','Klienti ei leitud.');
  if(source.contact_redacted_at||target.contact_redacted_at)throw new AppError(409,'CONTACTS_REMOVED','Kliendi kontaktid on eemaldatud.');
  if(source.version!==d.sourceVersion||target.version!==d.targetVersion||source.merged_into_id||target.merged_into_id)throw new AppError(409,'VERSION_CONFLICT','Klienti on vahepeal muudetud. Laadi uus versioon.');
  const moved=await client.query('UPDATE bookings SET customer_id=$3 WHERE tenant_id=$1 AND customer_id=$2',[d.tenantId,d.sourceId,d.targetId]);
  await client.query('UPDATE customers SET merged_into_id=$3,version=version+1,updated_at=clock_timestamp() WHERE tenant_id=$1 AND (id=$2 OR merged_into_id=$2)',[d.tenantId,d.sourceId,d.targetId]);
  await client.query('UPDATE customers SET version=version+1,updated_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2',[d.tenantId,d.targetId]);
  await client.query('INSERT INTO customer_merges(tenant_id,request_key,source_id,target_id,payload_hash,booking_count) VALUES($1,$2,$3,$4,$5,$6)',[d.tenantId,d.requestKey,d.sourceId,d.targetId,hash,moved.rowCount]);
  await audit(client,d.tenantId,actor.id,'customer.merge',undefined,d.targetId,{source,target,bookingsMoved:moved.rowCount,reason:d.reason});
  return {id:d.targetId,bookingsMoved:moved.rowCount??0};
 });
}
