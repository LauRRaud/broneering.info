import {z} from 'zod';
import {withTenant} from './db';
import type {Actor} from './access';
import {assertBookingAccess} from './booking-access';
import type {Tenant} from './tenants';
import {AppError} from './errors';
export async function previewTenant(actor:Actor,tenantId:string){
  if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
  return withTenant(tenantId,async client=>{
    const tenant=(await client.query<Tenant>('SELECT * FROM tenants WHERE id=$1 AND active FOR SHARE',[tenantId])).rows[0];
    if(!tenant)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
    await assertBookingAccess(client,tenant,actor);return tenant;
  });
}
