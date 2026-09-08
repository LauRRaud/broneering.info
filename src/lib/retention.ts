import {z} from 'zod';
import {withTenant} from './db';
import {audit,requireOwnerInTransaction,type Actor} from './access';
import {AppError} from './errors';
import type {PoolClient} from 'pg';

const schema=z.object({tenantId:z.uuid(),version:z.number().int().min(0),retainDays:z.number().int().min(1).max(36500).nullable(),legalHold:z.boolean(),confirmed:z.literal(true)}).strict();
export type RetentionState={version:number;retainDays:number|null;legalHold:boolean;approvedAt:string|null;automationEnabled:boolean};
async function state(client:PoolClient,tenantId:string):Promise<RetentionState>{
 const row=(await client.query("SELECT version,retain_days,legal_hold,approved_at FROM retention_policies WHERE tenant_id=$1 AND data_class='booking_contacts'",[tenantId])).rows[0];
 return {version:row?.version??0,retainDays:row?.retain_days??null,legalHold:row?.legal_hold??false,approvedAt:row?.approved_at?.toISOString()??null,automationEnabled:false};
}
export async function retentionState(actor:Actor,tenantId:string){
 if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
 return withTenant(tenantId,async client=>{await requireOwnerInTransaction(actor,tenantId,client);return state(client,tenantId);});
}
export async function changeRetention(actor:Actor,raw:unknown){
 const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli säilitamise tähtaega ja kinnitust.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  await requireOwnerInTransaction(actor,d.tenantId,client);
  const before=await state(client,d.tenantId);
  if(before.version!==d.version)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  await client.query(`INSERT INTO retention_policies(tenant_id,data_class,retain_days,action,approved_by,approved_at,legal_hold)
   VALUES($1,'booking_contacts',$2,CASE WHEN $2::int IS NULL THEN NULL ELSE 'redact' END,CASE WHEN $2::int IS NULL THEN NULL ELSE $3 END,CASE WHEN $2::int IS NULL THEN NULL ELSE clock_timestamp() END,$4)
   ON CONFLICT(tenant_id,data_class) DO UPDATE SET retain_days=excluded.retain_days,action=excluded.action,approved_by=excluded.approved_by,approved_at=excluded.approved_at,legal_hold=excluded.legal_hold,version=retention_policies.version+1`,[d.tenantId,d.retainDays,actor.id,d.legalHold]);
  const after=await state(client,d.tenantId);
  await audit(client,d.tenantId,actor.id,'retention.booking_contacts.changed',undefined,d.tenantId,{before,after});
  return after;
 });
}
