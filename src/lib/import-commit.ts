import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {withTenant} from './db';
import {type Actor,requireOwnerInTransaction,audit} from './access';
import {AppError} from './errors';
import {normalizeImportRow,type ImportKind} from './import-fields';
import {bookingEvent,type BookingRow} from './booking-records';
import {assertBillingForBooking} from './billing-access';
const schema=z.object({tenantId:z.uuid(),id:z.uuid(),version:z.number().int().positive(),skipInvalid:z.boolean(),skipDuplicates:z.boolean()}).strict();
const changed=()=>new AppError(409,'IMPORT_CHANGED','Impordi andmed või seotud kirjed on muutunud. Koosta uus eelvaade.');
export async function commitImport(actor:Actor,raw:unknown){
  const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli impordi kinnitust.');const d=parsed.data;
  try{return await withTenant(d.tenantId,async client=>{
    await requireOwnerInTransaction(actor,d.tenantId,client);
    const b=(await client.query('SELECT * FROM import_batches WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[d.tenantId,d.id])).rows[0];
    if(!b)throw new AppError(404,'IMPORT_NOT_FOUND','Importi ei leitud.');
    const options={skipInvalid:d.skipInvalid,skipDuplicates:d.skipDuplicates,version:d.version};
    if(b.status==='completed'){
      if(JSON.stringify(b.commit_options)!==JSON.stringify(options)&&!(b.commit_options?.skipInvalid===d.skipInvalid&&b.commit_options?.skipDuplicates===d.skipDuplicates&&b.commit_options?.version===d.version))throw changed();
      return {id:d.id,imported:b.imported_rows,rejected:b.rejected_rows};
    }
    if(b.status!=='preview'||b.version!==d.version)throw changed();
    const tenant=(await client.query('SELECT * FROM tenants WHERE id=$1',[d.tenantId])).rows[0];
    if(tenant.timezone!==b.timezone||tenant.public_state==='closed'||(b.kind==='bookings'&&tenant.booking_stops_at&&tenant.booking_stops_at.getTime()<=Date.now()))throw changed();
    if(b.kind==='bookings')await assertBillingForBooking(client,tenant);
    const rows=(await client.query('SELECT * FROM import_rows WHERE tenant_id=$1 AND batch_id=$2 ORDER BY row_number',[d.tenantId,d.id])).rows;
    let imported=0,rejected=0;
    for(const row of rows){
      if(row.error_code||row.warning_codes.length){
        if((row.error_code&&!d.skipInvalid)||(row.warning_codes.length&&!d.skipDuplicates))throw new AppError(409,'IMPORT_REVIEW_REQUIRED','Lahenda vigased ja duplikaadikahtlusega read või kinnita nende vahelejätmine.');
        await client.query("UPDATE import_rows SET status='skipped' WHERE tenant_id=$1 AND batch_id=$2 AND row_number=$3",[d.tenantId,d.id,row.row_number]);rejected++;continue;
      }
      const kind=b.kind as ImportKind;
      const normalized=normalizeImportRow(kind,row.source_values,b.mapping,b.timezone,b.cutover_at.toISOString());
      if(normalized.errors.length)throw changed();
      const v=normalized.data;
      const prior=(await client.query(`SELECT 1 FROM import_rows r JOIN import_batches b ON b.tenant_id=r.tenant_id AND b.id=r.batch_id WHERE r.tenant_id=$1 AND r.status='imported' AND b.kind=$2 AND (r.fingerprint=$3 OR ($4<>'' AND coalesce(r.external_id_hash,encode(sha256(convert_to(r.normalized->>'externalId','UTF8')),'hex'))=encode(sha256(convert_to($4,'UTF8')),'hex'))) LIMIT 1`,[d.tenantId,kind,row.fingerprint,v.externalId])).rowCount;
      if(prior)throw changed();
      let id:string;
      if(kind==='customers'){
        id=(await client.query('INSERT INTO customers(tenant_id,source_key,name,email,phone) VALUES($1,$2,$3,$4,$5) RETURNING id',[d.tenantId,`import:${d.id}:${row.row_number}`,v.name,v.email||null,v.phone||null])).rows[0].id;
      }else if(kind==='staff'){
        id=(await client.query('INSERT INTO staff(tenant_id,name,title,bio,online) VALUES($1,$2,$3,$4,false) RETURNING id',[d.tenantId,v.name,v.title,v.bio])).rows[0].id;
      }else if(kind==='services'){
        const group=(await client.query('SELECT name FROM service_groups WHERE tenant_id=$1 AND id=$2 AND active',[d.tenantId,v.groupId])).rows[0];if(!group)throw changed();
        id=(await client.query(`INSERT INTO services(tenant_id,group_id,category,name,description,default_price,default_duration,buffer_before,buffer_after,online,source_language) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10) RETURNING id`,[d.tenantId,v.groupId,group.name,v.name,v.description,v.priceCents,v.duration,v.bufferBefore,v.bufferAfter,tenant.default_language])).rows[0].id;
      }else{
        const assignment=(await client.query(`SELECT s.name AS service_name,st.name AS staff_name FROM staff_services ss JOIN services s ON s.tenant_id=ss.tenant_id AND s.id=ss.service_id JOIN staff st ON st.tenant_id=ss.tenant_id AND st.id=ss.staff_id WHERE ss.tenant_id=$1 AND ss.service_id=$2 AND ss.staff_id=$3 AND ss.active AND s.active AND st.active`,[d.tenantId,v.serviceId,v.staffId])).rows[0];if(!assignment)throw changed();
        id=randomUUID();const start=new Date(String(v.startAt)),end=new Date(start.getTime()+Number(v.duration)*60000);
        const occupiedStart=new Date(start.getTime()-Number(v.bufferBefore)*60000),occupiedEnd=new Date(end.getTime()+Number(v.bufferAfter)*60000);
        const booking=(await client.query<BookingRow>(`INSERT INTO bookings(id,tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,customer_phone,start_at,end_at,occupied,price,duration,buffer_before,buffer_after,cancellation_hours,source,customer_language,customer_notifications,is_test)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,tstzrange($13,$14,'[)'),$15,$16,$17,$18,$19,'import',$20,false,false) RETURNING *`,[id,d.tenantId,'BR-'+id.replaceAll('-','').slice(0,12).toUpperCase(),v.serviceId,v.staffId,assignment.service_name,assignment.staff_name,v.name,v.email||null,v.phone||null,start,end,occupiedStart,occupiedEnd,v.priceCents,v.duration,v.bufferBefore,v.bufferAfter,tenant.cancellation_hours,tenant.default_language])).rows[0];
        // Import is intentionally silent for both customer and company recipients.
        await bookingEvent(client,booking,'booking.imported',actor.id);
      }
      const column={services:'service_id',staff:'staff_id',customers:'customer_id',bookings:'booking_id'}[kind];
      await client.query(`UPDATE import_rows SET status='imported',${column}=$4 WHERE tenant_id=$1 AND batch_id=$2 AND row_number=$3`,[d.tenantId,d.id,row.row_number,id]);imported++;
    }
    await client.query("UPDATE import_batches SET status='completed',approved_by=$3,approved_at=clock_timestamp(),imported_rows=$4,rejected_rows=$5,commit_options=$6,version=version+1 WHERE tenant_id=$1 AND id=$2",[d.tenantId,d.id,actor.id,imported,rejected,options]);
    await audit(client,d.tenantId,actor.id,'import.completed',undefined,d.id,{kind:b.kind,imported,rejected});
    return {id:d.id,imported,rejected};
  });}catch(error){if((error as {code?:string}).code==='23P01')throw new AppError(409,'IMPORT_OVERLAP','Impordi broneering kattub teise broneeringuga. Koosta uus eelvaade.');throw error;}
}
