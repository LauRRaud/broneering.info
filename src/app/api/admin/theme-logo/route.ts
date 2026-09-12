import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {limitTenant} from '@/lib/http';
import {readPhotoUpload} from '@/lib/staff-photos';
import {themeState,themeLogo,changeThemeLogo} from '@/lib/themes';
export const runtime='nodejs';
function input(request:Request){const q=new URL(request.url).searchParams;const number=(key:string)=>q.has(key)&&q.get(key)!=='null'?Number(q.get(key)):null;return {tenantId:q.get('tenantId')??'',version:number('version'),revision:number('revision'),publishedVersion:number('publishedVersion'),slot:q.get('slot')??''};}
export async function GET(request:Request){try{assertAdminHost(request);const actor=await adminActor(request),d=input(request);await limitTenant('theme-logo-read:'+actor.id,120);return await themeLogo(d.tenantId,d.version??0,d.slot,actor);}catch(e){return adminError(e,request);}}
export async function PUT(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request),d=input(request);await limitTenant('theme-logo-write:'+actor.id,15);await themeState(actor,d.tenantId);return adminJson(await changeThemeLogo(actor,d,await readPhotoUpload(request)));}catch(e){return adminError(e,request);}}
export async function DELETE(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('theme-logo-write:'+actor.id,15);return adminJson(await changeThemeLogo(actor,input(request),null));}catch(e){return adminError(e,request);}}
