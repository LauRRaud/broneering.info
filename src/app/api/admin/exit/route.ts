import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {limitTenant,readJson} from '@/lib/http';
import {companyExitState,changeCompanyExit} from '@/lib/company-exit';
export const runtime='nodejs';
export async function GET(request:Request){try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant('exit-read:'+actor.id,120);return adminJson(await companyExitState(actor,new URL(request.url).searchParams.get('tenantId')??''));}catch(e){return adminError(e,request);}}
export async function POST(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('exit-change:'+actor.id,10);return adminJson(await changeCompanyExit(actor,await readJson(request)));}catch(e){return adminError(e,request);}}
