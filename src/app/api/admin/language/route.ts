import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {languageSettings} from '@/lib/language-settings';
import {limitTenant,readJson} from '@/lib/http';
export async function GET(request:Request){
  try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant('language-read:'+actor.id,120);return adminJson(await languageSettings(actor,{tenantId:new URL(request.url).searchParams.get('tenantId')}));}catch(error){return adminError(error,request);}
}
export async function POST(request:Request){
  try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('language-write:'+actor.id,30);return adminJson(await languageSettings(actor,await readJson(request),true));}catch(error){return adminError(error,request);}
}
