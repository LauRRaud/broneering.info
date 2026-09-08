import {z} from 'zod';
import {withTenant} from './db';
import {audit,requireOwnerInTransaction,type Actor} from './access';
import {AppError} from './errors';
import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import {expireExports} from './export-worker';

const exportSchema=z.object({tenantId:z.uuid(),customerId:z.uuid(),identityConfirmed:z.literal(true)}).strict();
const removalSchema=exportSchema.extend({fingerprint:z.string().regex(/^[0-9a-f]{64}$/),confirmed:z.literal(true)}).strict();

async function removalPreview(client:PoolClient,tenantId:string,selectedId:string){
 const selected=(await client.query('SELECT id,merged_into_id FROM customers WHERE tenant_id=$1 AND id=$2',[tenantId,selectedId])).rows[0];
 if(!selected)throw new AppError(404,'CUSTOMER_NOT_FOUND','Klienti ei leitud.');
 const customerId=selected.merged_into_id??selected.id;
 const profiles=(await client.query('SELECT id,name,email,phone,version,contact_redacted_at FROM customers WHERE tenant_id=$1 AND (id=$2 OR merged_into_id=$2) ORDER BY id',[tenantId,customerId])).rows;
 const bookings=(await client.query("SELECT id,version,end_at,status FROM bookings WHERE tenant_id=$1 AND customer_id=$2 ORDER BY id",[tenantId,customerId])).rows;
 const policies=(await client.query("SELECT data_class,version,legal_hold FROM retention_policies WHERE tenant_id=$1 AND data_class IN ('booking_contacts','audit') ORDER BY data_class",[tenantId])).rows;
 const imports=(await client.query("SELECT id,version FROM import_batches WHERE tenant_id=$1 AND kind IN ('customers','bookings') AND source_purged_at IS NULL ORDER BY id",[tenantId])).rows;
 const exports=(await client.query("SELECT id,version FROM export_jobs WHERE tenant_id=$1 AND status IN ('pending','running','ready','failed') ORDER BY id",[tenantId])).rows;
 const futureBookings=bookings.filter(b=>b.status==='confirmed'&&b.end_at.getTime()>Date.now()).length;
 const legalHold=policies.some(p=>p.legal_hold);
 const alreadyRemoved=profiles.every(p=>p.contact_redacted_at!==null);
 const fingerprint=createHash('sha256').update(JSON.stringify({customerId,profiles,bookings,policies,imports,exports})).digest('hex');
 return {customerId,profiles:profiles.map(p=>({id:p.id,name:p.name,email:p.email,phone:p.phone})),bookings:bookings.length,futureBookings,legalHold,importSources:imports.length,exports:exports.length,alreadyRemoved,fingerprint,canRemove:!alreadyRemoved&&!futureBookings&&!legalHold&&!imports.length};
}
export async function previewContactRemoval(actor:Actor,tenantId:string,customerId:string){
 if(!z.uuid().safeParse(tenantId).success||!z.uuid().safeParse(customerId).success)throw new AppError(400,'INVALID_INPUT','Vigane kliendi tunnus.');
 return withTenant(tenantId,async client=>{await requireOwnerInTransaction(actor,tenantId,client);return removalPreview(client,tenantId,customerId);});
}
export async function removeCustomerContacts(actor:Actor,raw:unknown){
 const parsed=removalSchema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli kliendi valikut ja eemaldamise kinnitust.');const d=parsed.data;
 const result=await withTenant(d.tenantId,async client=>{
  await requireOwnerInTransaction(actor,d.tenantId,client);
  const preview=await removalPreview(client,d.tenantId,d.customerId);
  if(preview.alreadyRemoved)return {removed:true,alreadyRemoved:true};
  if(preview.fingerprint!==d.fingerprint)throw new AppError(409,'VERSION_CONFLICT','Andmed on vahepeal muutunud. Värskenda vaadet.');
  if(preview.legalHold)throw new AppError(409,'LEGAL_HOLD','Andmetele kehtib säilitamiskohustus.');
  if(preview.futureBookings)throw new AppError(409,'FUTURE_BOOKINGS','Kliendil on tulevasi aktiivseid broneeringuid.');
  if(preview.importSources)throw new AppError(409,'IMPORT_SOURCES_REMAIN','Eemalda esmalt kliendi- ja broneeringuimportide algandmed.');
  const removal=(await client.query('SELECT remove_customer_contacts($1,$2) AS id',[d.tenantId,preview.customerId])).rows[0];
  await audit(client,d.tenantId,actor.id,'customer.contacts_removed',undefined,preview.customerId,{removalId:removal.id,profiles:preview.profiles.length,bookings:preview.bookings,exportsInvalidated:preview.exports});
  return {removed:true,alreadyRemoved:false};
 });
 // DB access is revoked before physical cleanup. The export worker retries cleanup.
 let filesPending=false;
 try{
  await expireExports(d.tenantId);
  filesPending=await withTenant(d.tenantId,async client=>(await client.query("SELECT 1 FROM media WHERE tenant_id=$1 AND purpose='export' AND status<>'deleted' AND expires_at<=clock_timestamp() LIMIT 1",[d.tenantId])).rowCount!==0);
 }catch{filesPending=true;}
 return {...result,filesPending};
}

/** An owner-reviewed booking/contact package, not an automatic response to a requester. */
export async function exportCustomerData(actor:Actor,raw:unknown){
 const parsed=exportSchema.safeParse(raw);
 if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli kliendi valikut ja isikusamasuse kinnitust.');
 const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  // A single snapshot keeps merge operations and all package sections consistent.
  await requireOwnerInTransaction(actor,d.tenantId,client);
  const selected=(await client.query('SELECT id,merged_into_id FROM customers WHERE tenant_id=$1 AND id=$2',[d.tenantId,d.customerId])).rows[0];
  if(!selected)throw new AppError(404,'CUSTOMER_NOT_FOUND','Klienti ei leitud.');
  const customerId=selected.merged_into_id??selected.id;
  const profiles=(await client.query('SELECT id,name,email,phone,updated_at,merged_into_id FROM customers WHERE tenant_id=$1 AND (id=$2 OR merged_into_id=$2) ORDER BY id LIMIT 1001',[d.tenantId,customerId])).rows;
  const bookings=(await client.query(`SELECT id,reference,customer_name,customer_email,customer_phone,service_name,staff_name,start_at,end_at,status,price,duration,created_at FROM bookings WHERE tenant_id=$1 AND customer_id=$2 ORDER BY start_at,id LIMIT 10001`,[d.tenantId,customerId])).rows;
  if(profiles.length>1000||bookings.length>10000)throw new AppError(400,'EXPORT_TOO_LARGE','Andmepakett on liiga suur; vajalik on käitaja abi.');
  await audit(client,d.tenantId,actor.id,'customer.privacy_export',undefined,customerId,{profiles:profiles.length,bookings:bookings.length,identityConfirmed:true});
  return {schemaVersion:1,generatedAt:new Date().toISOString(),tenantId:d.tenantId,customerId,scope:'Customer contact profiles and booking snapshots. Owner must review before disclosure; audit history, imports and external processors require a separate review.',profiles,bookings};
 },'repeatable read');
}
