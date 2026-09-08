import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {serviceTranslationState,changeServiceTranslation} from '@/lib/service-translations';
import {limitTenant,readJson} from '@/lib/http';
export async function GET(request:Request){
  try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant('translations-read:'+actor.id,120);const q=new URL(request.url).searchParams;return adminJson(await serviceTranslationState(actor,q.get('tenantId')??'',q.get('serviceId')??undefined));}catch(error){return adminError(error,request);}
}
export async function POST(request:Request){
  try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('translations:'+actor.id,15);return adminJson(await changeServiceTranslation(actor,await readJson(request)));}catch(error){return adminError(error,request);}
}
