import {z} from 'zod';
import {withTenant} from './db';
import {type Actor,requireOwnerInTransaction,audit} from './access';
import {AppError} from './errors';
import {readPrivateFile} from './private-files';
import type {FileHandle} from 'node:fs/promises';

const schema=z.object({tenantId:z.uuid(),requestKey:z.uuid(),expiresHours:z.number().int().min(1).max(168).default(24)}).strict();
export type ExportJob={id:string;status:string;createdAt:string;expiresAt:string;recordCount:number;bytes:number|null;errorCode:string|null};
export async function requestExport(actor:Actor,raw:unknown){
  const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli ekspordi aegumisaega.');const d=parsed.data;
  return withTenant(d.tenantId,async client=>{
    await requireOwnerInTransaction(actor,d.tenantId,client);
    const previous=(await client.query('SELECT id,scope FROM export_jobs WHERE tenant_id=$1 AND request_key=$2',[d.tenantId,d.requestKey])).rows[0];
    const scope={format:'jsonl-v1',expiresHours:d.expiresHours};
    if(previous){if(previous.scope.expiresHours!==d.expiresHours)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');return {id:previous.id};}
    const pending=(await client.query("SELECT count(*)::int AS n FROM export_jobs WHERE tenant_id=$1 AND (status IN('pending','running') OR (status='failed' AND attempts<5)) AND expires_at>clock_timestamp()",[d.tenantId])).rows[0].n;
    if(pending>=2)throw new AppError(409,'EXPORT_PENDING','Ettevõttel on juba ootel eksport.');
    const row=(await client.query("INSERT INTO export_jobs(tenant_id,request_key,requested_by,scope,expires_at) VALUES($1,$2,$3,$4,clock_timestamp()+$5*interval '1 hour') RETURNING id",[d.tenantId,d.requestKey,actor.id,scope,d.expiresHours])).rows[0];
    await audit(client,d.tenantId,actor.id,'export.requested',undefined,row.id,{format:'jsonl-v1',expiresHours:d.expiresHours});return {id:row.id};
  });
}
export async function exportState(actor:Actor,tenantId:string):Promise<{jobs:ExportJob[]}>{
  if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
  return withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    const rows=(await client.query(`SELECT e.id,CASE WHEN e.expires_at<=clock_timestamp() THEN 'expired' ELSE e.status END AS status,e.created_at,e.expires_at,e.record_count,e.last_error_code,m.byte_size FROM export_jobs e LEFT JOIN media m ON m.tenant_id=e.tenant_id AND m.id=e.result_media_id WHERE e.tenant_id=$1 ORDER BY e.created_at DESC,e.id DESC LIMIT 30`,[tenantId])).rows;
    return {jobs:rows.map(r=>({id:r.id,status:r.status,createdAt:r.created_at.toISOString(),expiresAt:r.expires_at.toISOString(),recordCount:Number(r.record_count),bytes:r.byte_size==null?null:Number(r.byte_size),errorCode:r.last_error_code}))};
  });
}
export async function downloadExport(actor:Actor,tenantId:string,jobId:string){
  if(!z.uuid().safeParse(tenantId).success||!z.uuid().safeParse(jobId).success)throw new AppError(400,'INVALID_INPUT','Vigane ekspordi tunnus.');
  let opened:FileHandle|undefined;
  try{return await withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    const row=(await client.query(`SELECT m.storage_key,m.byte_size FROM export_jobs e JOIN media m ON m.tenant_id=e.tenant_id AND m.id=e.result_media_id WHERE e.tenant_id=$1 AND e.id=$2 AND e.status='ready' AND e.expires_at>clock_timestamp() AND m.status='ready' AND m.expires_at>clock_timestamp()`,[tenantId,jobId])).rows[0];
    if(!row)throw new AppError(410,'EXPORT_UNAVAILABLE','Eksport ei ole valmis või on aegunud.');
    const file=await readPrivateFile(row.storage_key);opened=file;
    try{
      const stat=await file.stat();if(!stat.isFile()||stat.size!==Number(row.byte_size))throw new Error('Private file size mismatch');
      await audit(client,tenantId,actor.id,'export.downloaded',undefined,jobId);
      return {file,bytes:stat.size};
    }catch(e){await file.close();throw e;}
  });}catch(e){await opened?.close().catch(()=>{});throw e;}
}
