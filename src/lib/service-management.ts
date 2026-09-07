import type {PoolClient} from 'pg';
import {withTenant} from './db';
import {requireMembershipInClient,type Actor} from './access';
import {AppError} from './errors';
import {serviceManagementSchemas,type ServiceManagementAction,type ServiceManagementState} from './service-management-contracts';

function conflict():never {throw new AppError(409,'VERSION_CONFLICT','Andmed on vahepeal muutunud. Laadi haldus uuesti ja kontrolli muudatusi.');}
async function context(client:PoolClient,actor:Actor,tenantId:string,structure=false){
  // Same tenant lock as booking confirmation and membership changes prevents stale writes.
  const tenant=await client.query('SELECT id FROM tenants WHERE id=$1 AND active FOR UPDATE',[tenantId]);
  if(!tenant.rowCount)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
  const membership=await requireMembershipInClient(actor,tenantId,'services.manage',client);
  if(structure&&membership.role!=='owner')throw new AppError(403,'FORBIDDEN','Teenuste struktuuri ja töötajaid saab muuta ainult omanik.');
  return membership;
}
export async function serviceManagementState(actor:Actor,tenantId:string):Promise<ServiceManagementState>{
  return withTenant(tenantId,async client=>{
    const membership=await context(client,actor,tenantId);
    const groups=await client.query('SELECT g.id,g.parent_id AS "parentId",g.name,COALESCE(t.path,g.name) AS path,g.active,g.version FROM service_groups g LEFT JOIN service_group_tree t ON t.tenant_id=g.tenant_id AND t.id=g.id WHERE g.tenant_id=$1 ORDER BY path,g.id',[tenantId]);
    const services=await client.query('SELECT id,group_id AS "groupId",name,description,default_price AS "defaultPrice",default_duration AS "defaultDuration",buffer_before AS "bufferBefore",buffer_after AS "bufferAfter",active,online,version FROM services WHERE tenant_id=$1 ORDER BY name,id',[tenantId]);
    const staff=await client.query('SELECT id,name,title,bio,photo_url AS "photoUrl",active,online,version FROM staff WHERE tenant_id=$1 ORDER BY name,id',[tenantId]);
    const assignments=await client.query('SELECT staff_id AS "staffId",service_id AS "serviceId",price,duration,buffer_before AS "bufferBefore",buffer_after AS "bufferAfter",active,version FROM staff_services WHERE tenant_id=$1 ORDER BY service_id,staff_id',[tenantId]);
    return {groups:groups.rows,services:services.rows,staff:staff.rows,assignments:assignments.rows,canEditStructure:membership.role==='owner'};
  });
}
export async function saveServiceManagement(actor:Actor,action:ServiceManagementAction,raw:unknown){
  const result=serviceManagementSchemas[action].safeParse(raw);
  if(!result.success)throw new AppError(400,'INVALID_INPUT','Kontrolli vormi andmeid.');
  const tenantId=result.data.tenantId;
  try{return await withTenant(tenantId,async client=>{
    await context(client,actor,tenantId,action!=='save-pricing');
    let targetId:string;
    if(action==='save-group'){
      const d=serviceManagementSchemas[action].parse(raw);
      if(d.parentId){
        const parent=await client.query('SELECT id FROM service_groups WHERE tenant_id=$1 AND id=$2',[tenantId,d.parentId]);
        if(!parent.rowCount)throw new AppError(400,'GROUP_NOT_FOUND','Ülemgruppi ei leitud.');
        const cycle=await client.query('WITH RECURSIVE ancestors AS (SELECT id,parent_id FROM service_groups WHERE tenant_id=$1 AND id=$2 UNION SELECT g.id,g.parent_id FROM service_groups g JOIN ancestors a ON g.id=a.parent_id WHERE g.tenant_id=$1) SELECT id FROM ancestors WHERE id=$3',[tenantId,d.parentId,d.id??null]);
        if(cycle.rowCount)throw new AppError(400,'GROUP_CYCLE','Gruppi ei saa paigutada iseenda ega oma alamgrupi alla.');
      }
      const saved=d.id?await client.query('UPDATE service_groups SET name=$3,active=$4,parent_id=$6,version=version+1 WHERE tenant_id=$1 AND id=$2 AND version=$5 RETURNING id',[tenantId,d.id,d.name,d.active,d.version,d.parentId]):await client.query('INSERT INTO service_groups(tenant_id,name,active,parent_id) VALUES($1,$2,$3,$4) RETURNING id',[tenantId,d.name,d.active,d.parentId]);
      if(!saved.rowCount)conflict();targetId=saved.rows[0].id;
    }else if(action==='save-service'){
      const d=serviceManagementSchemas[action].parse(raw);
      const group=await client.query('SELECT name FROM service_groups WHERE tenant_id=$1 AND id=$2',[tenantId,d.groupId]);
      if(!group.rowCount)throw new AppError(400,'GROUP_NOT_FOUND','Teenusegruppi ei leitud.');
      const values=[tenantId,d.groupId,group.rows[0].name,d.name,d.description,d.defaultPrice,d.defaultDuration,d.bufferBefore,d.bufferAfter,d.active,d.online];
      const saved=d.id?await client.query('UPDATE services SET group_id=$2,category=$3,name=$4,description=$5,default_price=$6,default_duration=$7,buffer_before=$8,buffer_after=$9,active=$10,online=$11,version=version+1 WHERE tenant_id=$1 AND id=$12 AND version=$13 RETURNING id',[...values,d.id,d.version]):await client.query('INSERT INTO services(tenant_id,group_id,category,name,description,default_price,default_duration,buffer_before,buffer_after,active,online) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',values);
      if(!saved.rowCount)conflict();targetId=saved.rows[0].id;
    }else if(action==='save-staff'){
      const d=serviceManagementSchemas[action].parse(raw),values=[tenantId,d.name,d.title,d.bio,d.photoUrl,d.active,d.online];
      const saved=d.id?await client.query('UPDATE staff SET name=$2,title=$3,bio=$4,photo_url=$5,active=$6,online=$7,version=version+1 WHERE tenant_id=$1 AND id=$8 AND version=$9 RETURNING id',[...values,d.id,d.version]):await client.query('INSERT INTO staff(tenant_id,name,title,bio,photo_url,active,online) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',values);
      if(!saved.rowCount)conflict();targetId=saved.rows[0].id;
    }else if(action==='save-assignment'){
      const d=serviceManagementSchemas[action].parse(raw);
      const parents=await client.query('SELECT s.id FROM services s JOIN staff st ON st.tenant_id=s.tenant_id WHERE s.tenant_id=$1 AND s.id=$2 AND st.id=$3',[tenantId,d.serviceId,d.staffId]);
      if(!parents.rowCount)throw new AppError(400,'ASSIGNMENT_INVALID','Teenus ja töötaja peavad kuuluma samasse ettevõttesse.');
      const values=[tenantId,d.serviceId,d.staffId,d.price,d.duration,d.bufferBefore,d.bufferAfter,d.active];
      const saved=d.version===0?await client.query('INSERT INTO staff_services(tenant_id,service_id,staff_id,price,duration,buffer_before,buffer_after,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING service_id',values):await client.query('UPDATE staff_services SET price=$4,duration=$5,buffer_before=$6,buffer_after=$7,active=$8,version=version+1 WHERE tenant_id=$1 AND service_id=$2 AND staff_id=$3 AND version=$9 RETURNING service_id',[...values,d.version]);
      if(!saved.rowCount)conflict();targetId=d.serviceId+':'+d.staffId;
    }else{
      const d=serviceManagementSchemas['save-pricing'].parse(raw);
      if(!d.staffId&&(d.price===null||d.duration===null))throw new AppError(400,'INVALID_INPUT','Teenuse vaikehind ja kestus on kohustuslikud.');
      const saved=d.staffId?await client.query('UPDATE staff_services SET price=$4,duration=$5,version=version+1 WHERE tenant_id=$1 AND service_id=$2 AND staff_id=$3 AND version=$6 RETURNING service_id',[tenantId,d.serviceId,d.staffId,d.price,d.duration,d.version]):await client.query('UPDATE services SET default_price=$3,default_duration=$4,version=version+1 WHERE tenant_id=$1 AND id=$2 AND version=$5 RETURNING id',[tenantId,d.serviceId,d.price,d.duration,d.version]);
      if(!saved.rowCount)conflict();targetId=d.staffId?d.serviceId+':'+d.staffId:d.serviceId;
    }
    await client.query('INSERT INTO access_audit_log(tenant_id,actor_user_id,action,target_id) VALUES($1,$2,$3,$4)',[tenantId,actor.id,'catalog.'+action,targetId]);
    return {id:targetId};
  });}catch(error){
    if((error as {code?:string}).code==='23505')throw new AppError(409,'DUPLICATE_GROUP','Selle nimega teenusegrupp on juba olemas.');
    throw error;
  }
}
