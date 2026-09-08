import {z} from 'zod';
import {withTenant} from './db';
import {requireMembershipInClient,rolePermissions,audit,type Actor} from './access';
import {AppError} from './errors';
export const customerQuery=z.object({tenantId:z.uuid(),search:z.string().trim().max(120).default(''),page:z.coerce.number().int().min(0).max(10000).default(0),customerId:z.uuid().optional(),format:z.enum(['json','csv']).default('json')}).strict();
export const customerCommand=z.object({tenantId:z.uuid(),customerId:z.uuid(),version:z.number().int().positive(),name:z.string().trim().min(2).max(120),email:z.union([z.literal(''),z.email().max(254)]),phone:z.string().trim().max(30).regex(/^[+\d ()-]*$/),reason:z.string().trim().min(3).max(500)}).strict();
export async function customerState(actor:Actor,raw:unknown){
  const parsed=customerQuery.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli otsingut ja lehekülge.');const q=parsed.data;
  return withTenant(q.tenantId,async client=>{
    if(!(await client.query('SELECT id FROM tenants WHERE id=$1 AND active FOR SHARE',[q.tenantId])).rowCount)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
    const membership=await requireMembershipInClient(actor,q.tenantId,'customers.read',client);
    const permissions=rolePermissions(membership.role,membership.permissions);
    if(q.format==='csv'&&!permissions.includes('export'))throw new AppError(403,'FORBIDDEN','Ekspordi õigus puudub.');
    const limit=q.format==='csv'?10001:51;
    const rows=await client.query(`SELECT id,name,email,phone,version,merged_into_id,contact_redacted_at FROM customers WHERE tenant_id=$1 AND ($2::uuid IS NOT NULL OR merged_into_id IS NULL) AND ($2::uuid IS NULL OR id=$2) AND ($3='' OR strpos(lower(name),lower($3))>0 OR strpos(lower(coalesce(email,'')),lower($3))>0 OR strpos(lower(coalesce(phone,'')),lower($3))>0 OR EXISTS(SELECT 1 FROM customers alias WHERE alias.tenant_id=$1 AND alias.merged_into_id=customers.id AND (strpos(lower(alias.name),lower($3))>0 OR strpos(lower(coalesce(alias.email,'')),lower($3))>0 OR strpos(lower(coalesce(alias.phone,'')),lower($3))>0))) ORDER BY name,id LIMIT $4 OFFSET $5`,[q.tenantId,q.customerId??null,q.search,limit,q.format==='csv'||q.customerId?0:q.page*50]);
    if(q.format==='csv'){
      if(rows.rows.length>10000)throw new AppError(400,'EXPORT_TOO_LARGE','Täpsusta otsingut; korraga saab eksportida kuni 10 000 klienti.');
      await audit(client,q.tenantId,actor.id,'customers.export',undefined,undefined,{count:rows.rows.length});
      return {csv:'\uFEFF'+[['Nimi','E-post','Telefon'],...rows.rows.map(r=>[r.name,r.email??'',r.phone??''])].map(row=>row.map(csvCell).join(',')).join('\r\n')};
    }
    const history=q.customerId?(await client.query(`SELECT reference,service_name AS "serviceName",staff_name AS "staffName",start_at AS start,status,price FROM bookings WHERE tenant_id=$1 AND customer_id=$2 ORDER BY start_at DESC,id DESC LIMIT 51 OFFSET $3`,[q.tenantId,q.customerId,q.page*50])).rows:[];
    const events=q.customerId?(await client.query(`SELECT a.created_at AS at,u.name AS actor,a.metadata FROM access_audit_log a LEFT JOIN auth_user u ON u.id=a.actor_user_id WHERE a.tenant_id=$1 AND a.target_id=$2 AND a.action='customer.correct' ORDER BY a.created_at DESC LIMIT 50`,[q.tenantId,q.customerId])).rows:[];
    const timezone=(await client.query('SELECT timezone FROM tenants WHERE id=$1',[q.tenantId])).rows[0]?.timezone??'Europe/Tallinn';
    const merges=q.customerId?(await client.query(`SELECT a.created_at AS at,u.name AS actor,a.metadata FROM access_audit_log a LEFT JOIN auth_user u ON u.id=a.actor_user_id WHERE a.tenant_id=$1 AND a.action='customer.merge' AND (a.target_id=$2 OR a.target_id IN(SELECT id::text FROM customers WHERE tenant_id=$1 AND merged_into_id=$2::uuid)) ORDER BY a.created_at DESC LIMIT 50`,[q.tenantId,q.customerId])).rows:[];
    return {customers:rows.rows.slice(0,50),hasMore:rows.rows.length>50,history:history.slice(0,50),historyHasMore:history.length>50,events,merges,timezone,canPrivacy:membership.role==='owner',canEdit:permissions.includes('customers.manage'),canExport:permissions.includes('export')};
  });
}
export function csvCell(value:string){return '"'+(/^[\s]*[=+\-@\t\r\n]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';}
export async function correctCustomer(actor:Actor,raw:unknown){
  const parsed=customerCommand.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli kliendikaardi andmeid ja põhjust.');const d=parsed.data;
  return withTenant(d.tenantId,async client=>{
    if(!(await client.query('SELECT id FROM tenants WHERE id=$1 AND active FOR SHARE',[d.tenantId])).rowCount)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
    await requireMembershipInClient(actor,d.tenantId,'customers.manage',client);
    const before=(await client.query('SELECT id,name,email,phone,version,merged_into_id,contact_redacted_at FROM customers WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[d.tenantId,d.customerId])).rows[0];
    if(!before)throw new AppError(404,'CUSTOMER_NOT_FOUND','Klienti ei leitud.');
    if(before.contact_redacted_at)throw new AppError(409,'CONTACTS_REMOVED','Kliendi kontaktid on eemaldatud.');
    if(before.version!==d.version||before.merged_into_id)throw new AppError(409,'VERSION_CONFLICT','Klienti on vahepeal muudetud. Laadi uus versioon.');
    const after=(await client.query('UPDATE customers SET name=$3,email=$4,phone=$5,version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING id,name,email,phone,version',[d.tenantId,d.customerId,d.name,d.email||null,d.phone||null])).rows[0];
    await audit(client,d.tenantId,actor.id,'customer.correct',undefined,d.customerId,{before,after,reason:d.reason});
    return {customer:after};
  });
}
