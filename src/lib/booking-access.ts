import type {PoolClient} from 'pg';
import {type Actor,requireMembershipInClient} from './access';
import {type Tenant,assertPublicBooking} from './tenants';
import {AppError} from './errors';
import {assertBillingForBooking} from './billing-access';
export async function assertBookingAccess(client:PoolClient,tenant:Tenant,previewActor?:Actor){
  if(!previewActor){assertPublicBooking(tenant);await assertBillingForBooking(client,tenant);return;}
  const membership=await requireMembershipInClient(previewActor,tenant.id,undefined,client);
  if(membership.role!=='owner')throw new AppError(403,'FORBIDDEN','Selle toimingu saab teha ainult omanik.');
  if(!tenant.demo || tenant.public_state!=='draft')throw new AppError(409,'PREVIEW_CLOSED','Proovibroneerimine on lubatud ainult avaldamata testrežiimis.');
}
