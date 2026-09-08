import {createHash} from 'node:crypto';
import {z} from 'zod';
import {withTenant} from './db';
import {type Actor, requireOwnerInTransaction, audit} from './access';
import {AppError} from './errors';
import {createPrivateFile} from './private-files';
import {parseImportCsv} from './import-csv';
import {normalizeImportRow,validateImportMapping,importFields,type ImportKind} from './import-fields';
import {DateTime} from 'luxon';

const uploadSchema=z.object({tenantId:z.uuid(),requestKey:z.uuid(),kind:z.enum(['services','staff','customers','bookings']),delimiter:z.enum([',',';'])}).strict();
function digest(value:string){return createHash('sha256').update(value).digest('hex');}
export async function uploadImport(actor:Actor,raw:unknown,text:string){
  const parsed=uploadSchema.safeParse(raw);
  if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli impordi andmeid.');
  const d=parsed.data;
  // Check ownership before parsing a potentially large file or touching private storage.
  return withTenant(d.tenantId,async client=>{
    await requireOwnerInTransaction(actor,d.tenantId,client);
    const hash=digest(text);
    const previous=(await client.query(`SELECT b.id,b.kind,b.delimiter,m.sha256 FROM import_batches b JOIN media m ON m.tenant_id=b.tenant_id AND m.id=b.source_media_id WHERE b.tenant_id=$1 AND b.request_key=$2`,[d.tenantId,d.requestKey])).rows[0];
    if(previous){
      if(previous.kind!==d.kind||previous.delimiter!==d.delimiter||previous.sha256!==hash)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');
      return {id:previous.id};
    }
    const pending=(await client.query("SELECT count(*)::int AS n FROM import_batches WHERE tenant_id=$1 AND status IN ('uploaded','preview','approved','running')",[d.tenantId])).rows[0].n;
    if(pending>=5)throw new AppError(409,'IMPORT_PENDING','Ettevõttel on juba ootel import.');
    const csv=parseImportCsv(text,d.delimiter);
    const file=await createPrivateFile(d.tenantId,'csv');
    try {await file.handle.writeFile(text,'utf8');await file.handle.sync();}finally{await file.handle.close();}
    // Retain files on uncertain COMMIT; the orphan sweep safely removes unreferenced files later.
    const media=(await client.query("INSERT INTO media(tenant_id,storage_key,purpose,content_type,byte_size,sha256,status,created_by) VALUES($1,$2,'import','text/csv',$3,$4,'ready',$5) RETURNING id",[d.tenantId,file.key,Buffer.byteLength(text),hash,actor.id])).rows[0];
    const batch=(await client.query(`INSERT INTO import_batches(tenant_id,request_key,source_media_id,requested_by,kind,delimiter,headers,total_rows) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[d.tenantId,d.requestKey,media.id,actor.id,d.kind,d.delimiter,JSON.stringify(csv.headers),csv.rows.length])).rows[0];
    // Bounded JSON batches avoid a query per CSV row and oversized parameter arrays.
    for(let offset=0;offset<csv.rows.length;offset+=500){
      const rows=csv.rows.slice(offset,offset+500).map(row=>({number:row.rowNumber,values:row.values,error:row.error,hash:digest(JSON.stringify(row.values))}));
      await client.query(`INSERT INTO import_rows(tenant_id,batch_id,row_number,fingerprint,status,error_code,source_values)
        SELECT $1,$2,(r->>'number')::int,r->>'hash','preview',r->>'error',r->'values' FROM jsonb_array_elements($3::jsonb) r`,[d.tenantId,batch.id,JSON.stringify(rows)]);
    }
    await audit(client,d.tenantId,actor.id,'import.uploaded',undefined,batch.id,{kind:d.kind,rows:csv.rows.length});
    return {id:batch.id};
  });
}

export async function importState(actor:Actor,tenantId:string,batchId?:string,after=0){
  if(!z.uuid().safeParse(tenantId).success||(batchId&&!z.uuid().safeParse(batchId).success)||!Number.isSafeInteger(after)||after<0)throw new AppError(400,'INVALID_INPUT','Vigane impordi tunnus.');
  return withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    const batches=(await client.query(`SELECT id,kind,status,headers,mapping,total_rows,imported_rows,rejected_rows,created_at,version,cutover_at,timezone,reminders_enabled,error_report,source_purged_at FROM import_batches WHERE tenant_id=$1 AND ($2::uuid IS NULL OR id=$2) ORDER BY created_at DESC,id DESC LIMIT 30`,[tenantId,batchId??null])).rows;
    if(batchId&&!batches.length)throw new AppError(404,'IMPORT_NOT_FOUND','Importi ei leitud.');
    const rows=batchId?(await client.query(`SELECT row_number,source_values,normalized,status,error_code,warning_codes FROM import_rows WHERE tenant_id=$1 AND batch_id=$2 AND row_number>$3 ORDER BY row_number LIMIT 100`,[tenantId,batchId,after])).rows:[];
    return {batches,rows,nextAfter:rows.length===100?rows[rows.length-1].row_number:null};
  });
}
export async function importSetup(actor:Actor,tenantId:string){
  if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_INPUT','Vigane ettevõtte tunnus.');
  return withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    const tenant=(await client.query('SELECT timezone FROM tenants WHERE id=$1',[tenantId])).rows[0];
    const groups=(await client.query('SELECT id,name FROM service_groups WHERE tenant_id=$1 AND active ORDER BY name,id',[tenantId])).rows;
    const services=(await client.query('SELECT id,name FROM services WHERE tenant_id=$1 AND active ORDER BY name,id',[tenantId])).rows;
    const staff=(await client.query('SELECT id,name FROM staff WHERE tenant_id=$1 AND active ORDER BY name,id',[tenantId])).rows;
    return {timezone:tenant.timezone,groups,services,staff,fields:importFields};
  });
}

const previewSchema=z.object({tenantId:z.uuid(),id:z.uuid(),version:z.number().int().positive(),mapping:z.record(z.string().max(40),z.number().int().min(0).max(63)),timezone:z.string().min(1).max(100),cutoverAt:z.iso.datetime({offset:true})}).strict();
export async function previewImport(actor:Actor,raw:unknown){
  const parsed=previewSchema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli impordi vastendust ja üleminekuaega.');const d=parsed.data;
  return withTenant(d.tenantId,async client=>{
    await requireOwnerInTransaction(actor,d.tenantId,client);
    const b=(await client.query('SELECT * FROM import_batches WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[d.tenantId,d.id])).rows[0];
    if(!b)throw new AppError(404,'IMPORT_NOT_FOUND','Importi ei leitud.');
    if(b.version!==d.version||!['uploaded','preview'].includes(b.status))throw new AppError(409,'VERSION_CONFLICT','Andmed on vahepeal muutunud. Värskenda vaadet.');
    const tenant=(await client.query('SELECT timezone FROM tenants WHERE id=$1',[d.tenantId])).rows[0];
    if(d.timezone!==tenant.timezone||!DateTime.now().setZone(d.timezone).isValid)throw new AppError(400,'BOOKING_TIMEZONE','Impordi ajavöönd peab vastama ettevõtte ajavööndile.');
    const kind=b.kind as ImportKind;validateImportMapping(kind,b.headers,d.mapping);
    const source=(await client.query('SELECT row_number,source_values FROM import_rows WHERE tenant_id=$1 AND batch_id=$2 ORDER BY row_number',[d.tenantId,d.id])).rows;
    const groups=new Set((await client.query('SELECT id FROM service_groups WHERE tenant_id=$1 AND active',[d.tenantId])).rows.map(r=>r.id));
    const assignments=new Set((await client.query(`SELECT ss.service_id,ss.staff_id FROM staff_services ss JOIN services s ON s.tenant_id=ss.tenant_id AND s.id=ss.service_id JOIN staff st ON st.tenant_id=ss.tenant_id AND st.id=ss.staff_id WHERE ss.tenant_id=$1 AND ss.active AND s.active AND st.active`,[d.tenantId])).rows.map(r=>r.service_id+':'+r.staff_id));
    const hashes=new Set<string>(),externalIds=new Set<string>();
    const normalized=source.map(row=>{
      const result=normalizeImportRow(kind,row.source_values,d.mapping,d.timezone,d.cutoverAt);
      if(row.source_values.length!==b.headers.length)result.errors.unshift('CSV_ROW_WIDTH');
      if(kind==='services'&&!groups.has(result.data.groupId))result.errors.push('GROUP_NOT_FOUND');
      if(kind==='bookings'&&!assignments.has(result.data.serviceId+':'+result.data.staffId))result.errors.push('ASSIGNMENT_NOT_FOUND');
      const hash=digest(kind+JSON.stringify(result.data)),external=String(result.data.externalId??'');
      const warnings:string[]=[];
      if(hashes.has(hash))warnings.push('DUPLICATE_ROW');
      if(external&&externalIds.has(external))result.errors.push('DUPLICATE_EXTERNAL_ID');
      hashes.add(hash);if(external)externalIds.add(external);
      return {number:row.row_number,data:result.data,hash,error:result.errors.join(',')||null,warnings};
    });
    // Compare only prior successful imports of the same entity kind, never merge contacts by email.
    const prior=(await client.query(`SELECT r.fingerprint,coalesce(r.external_id_hash,encode(sha256(convert_to(r.normalized->>'externalId','UTF8')),'hex')) AS external_id FROM import_rows r JOIN import_batches b ON b.tenant_id=r.tenant_id AND b.id=r.batch_id WHERE r.tenant_id=$1 AND r.status='imported' AND b.kind=$2 AND (r.fingerprint=ANY($3::text[]) OR coalesce(r.external_id_hash,encode(sha256(convert_to(r.normalized->>'externalId','UTF8')),'hex'))=ANY($4::text[]))`,[d.tenantId,kind,[...hashes],[...externalIds].map(digest)])).rows;
    const oldHashes=new Set(prior.map(r=>r.fingerprint)),oldIds=new Set(prior.map(r=>r.external_id));
    for(const row of normalized){
      if(oldHashes.has(row.hash))row.warnings.push('ALREADY_IMPORTED');
      if(row.data.externalId&&oldIds.has(digest(String(row.data.externalId))))row.error=[row.error,'EXTERNAL_ID_IMPORTED'].filter(Boolean).join(',');
    }
    if(kind==='bookings'){
      const intervals=normalized.filter(r=>!r.error).map(r=>({number:r.number,staff:r.data.staffId,start:new Date(Date.parse(String(r.data.startAt))-Number(r.data.bufferBefore)*60000).toISOString(),end:new Date(Date.parse(String(r.data.startAt))+(Number(r.data.duration)+Number(r.data.bufferAfter))*60000).toISOString()}));
      const overlaps=new Set<number>();
      const byStaff=new Map<string,typeof intervals>();
      for(const interval of intervals){const key=String(interval.staff),list=byStaff.get(key)??[];list.push(interval);byStaff.set(key,list);}
      for(const list of byStaff.values()){
        list.sort((a,b)=>a.start.localeCompare(b.start)||a.number-b.number);
        let lastEnd='';
        for(const interval of list){if(interval.start<lastEnd)overlaps.add(interval.number);else lastEnd=interval.end;}
      }
      for(let offset=0;offset<intervals.length;offset+=500){
        const conflicts=(await client.query(`SELECT DISTINCT (v->>'number')::int AS n FROM jsonb_array_elements($2::jsonb) v JOIN bookings b ON b.tenant_id=$1 AND b.staff_id=(v->>'staff')::uuid AND b.status<>'cancelled' AND b.occupied && tstzrange((v->>'start')::timestamptz,(v->>'end')::timestamptz,'[)')`,[d.tenantId,JSON.stringify(intervals.slice(offset,offset+500))])).rows;
        for(const row of conflicts)overlaps.add(row.n);
      }
      for(const row of normalized)if(overlaps.has(row.number))row.error=[row.error,'BOOKING_OVERLAP'].filter(Boolean).join(',');
    }
    for(let offset=0;offset<normalized.length;offset+=500)await client.query(`UPDATE import_rows r SET normalized=v->'data',fingerprint=v->>'hash',error_code=v->>'error',warning_codes=v->'warnings',status='preview' FROM jsonb_array_elements($3::jsonb) v WHERE r.tenant_id=$1 AND r.batch_id=$2 AND r.row_number=(v->>'number')::int`,[d.tenantId,d.id,JSON.stringify(normalized.slice(offset,offset+500))]);
    const errors=normalized.filter(r=>r.error).length,warnings=normalized.filter(r=>r.warnings.length).length;
    await client.query("UPDATE import_batches SET status='preview',mapping=$3,timezone=$4,cutover_at=$5,error_report=$6,version=version+1 WHERE tenant_id=$1 AND id=$2",[d.tenantId,d.id,d.mapping,d.timezone,d.cutoverAt,JSON.stringify([{errors,warnings}])]);
    await audit(client,d.tenantId,actor.id,'import.previewed',undefined,d.id,{kind,rows:source.length,errors,warnings});
    return {id:d.id,version:d.version+1,errors,warnings};
  });
}
