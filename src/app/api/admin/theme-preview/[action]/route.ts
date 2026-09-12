import {z} from 'zod';
import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {themePreviewTenant,themeState} from '@/lib/themes';
import {catalogFor,availableOffers,nextAvailableDay,monthAvailability} from '@/lib/availability';
import {limitTenant} from '@/lib/http';
import {AppError} from '@/lib/errors';
// Deliberately GET-only: this preview can never create a test or real booking.
export async function GET(request:Request,context:{params:Promise<{action:string}>}){try{
  assertAdminHost(request);const actor=await adminActor(request);await limitTenant('theme-preview:'+actor.id,120);
  const q=new URL(request.url).searchParams,tenant=await themePreviewTenant(actor,q.get('tenantId')??''),{action}=await context.params;
  if(action==='catalog'){const catalog=await catalogFor(tenant,undefined,actor,true),state=await themeState(actor,tenant.id);catalog.theme=state.draft??state.published??catalog.theme;return adminJson(catalog);}
  if(action!=='availability')throw new AppError(404,'NOT_FOUND','Lehte ei leitud.');
  const input=z.object({serviceId:z.uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),staffId:z.uuid().optional(),next:z.literal('1').optional(),month:z.literal('1').optional()}).refine(d=>!(d.next&&d.month)).safeParse(Object.fromEntries(q));
  if(!input.success)throw new AppError(400,'INVALID_INPUT','Vali teenus ja kuupäev.');
  const d=input.data;
  if(d.month){await limitTenant('theme-preview-month:'+actor.id,30);return adminJson(await monthAvailability(tenant,d.serviceId,d.date,d.staffId,actor,true));}
  if(d.next){await limitTenant('theme-preview-next:'+actor.id,30);return adminJson(await nextAvailableDay(tenant,d.serviceId,d.date,d.staffId,actor,true));}
  return adminJson({offers:await availableOffers(tenant,d.serviceId,d.date,d.staffId,actor,true)});
}catch(e){return adminError(e,request);}}
