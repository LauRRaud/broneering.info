import {z} from 'zod';
import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {previewTenant} from '@/lib/preview';
import {catalogFor,availableOffers,nextAvailableDay} from '@/lib/availability';
import {createBooking} from '@/lib/bookings';
import {limitTenant,readJson} from '@/lib/http';
import {AppError} from '@/lib/errors';
type Context={params:Promise<{action:string}>};
export async function GET(request:Request,context:Context){try{
  assertAdminHost(request);const actor=await adminActor(request);await limitTenant('preview-read:'+actor.id,120);
  const q=new URL(request.url).searchParams,tenant=await previewTenant(actor,q.get('tenantId')??''),{action}=await context.params;
  if(action==='catalog')return adminJson(await catalogFor(tenant,undefined,actor));
  if(action!=='availability')throw new AppError(404,'NOT_FOUND','Lehte ei leitud.');
  const input=z.object({serviceId:z.uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),staffId:z.uuid().optional(),next:z.literal('1').optional()}).safeParse(Object.fromEntries(q));
  if(!input.success)throw new AppError(400,'INVALID_INPUT','Vali teenus ja kuupäev.');
  const d=input.data;
  if(d.next){await limitTenant('preview-next:'+actor.id,30);return adminJson(await nextAvailableDay(tenant,d.serviceId,d.date,d.staffId,actor));}
  return adminJson({offers:await availableOffers(tenant,d.serviceId,d.date,d.staffId,actor)});
}catch(e){return adminError(e,request);}}
export async function POST(request:Request,context:Context){try{
  assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('preview-write:'+actor.id,30);
  if((await context.params).action!=='bookings')throw new AppError(404,'NOT_FOUND','Lehte ei leitud.');
  const tenant=await previewTenant(actor,new URL(request.url).searchParams.get('tenantId')??'');
  const result=await createBooking(tenant,await readJson(request),request.headers.get('idempotency-key')??'',actor);
  // Private preview stays on the admin host. Test bookings are managed in its calendar.
  const {managementUrl,managementExpiresAt,...reply}=result;
  return adminJson(reply,201);
}catch(e){return adminError(e,request);}}
