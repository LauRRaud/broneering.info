import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {limitTenant,readJson} from '@/lib/http';
import {themeState,changeTheme} from '@/lib/themes';
export async function GET(request:Request){try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant('theme-read:'+actor.id,120);return adminJson(await themeState(actor,new URL(request.url).searchParams.get('tenantId')??''));}catch(e){return adminError(e,request);}}
export async function POST(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('theme-write:'+actor.id,30);return adminJson(await changeTheme(actor,await readJson(request)));}catch(e){return adminError(e,request);}}
