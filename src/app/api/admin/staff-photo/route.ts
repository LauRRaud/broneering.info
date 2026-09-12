import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {limitTenant} from '@/lib/http';
import {authorizeStaffPhoto,changeStaffPhoto,photoResponse,readPhotoUpload,staffPhoto} from '@/lib/staff-photos';
export const runtime='nodejs';
function input(request:Request){const q=new URL(request.url).searchParams;return {tenantId:q.get('tenantId'),staffId:q.get('staffId'),version:Number(q.get('version'))};}
export async function GET(request:Request){try{
  assertAdminHost(request);const actor=await adminActor(request),d=input(request);
  await limitTenant('staff-photo-read:'+actor.id,120);
  return photoResponse(await staffPhoto(d.tenantId??'',d.staffId??'',actor));
}catch(e){return adminError(e,request);}}
export async function PUT(request:Request){try{
  assertAdminHost(request,true);const actor=await adminActor(request),d=input(request);
  await limitTenant('staff-photo-write:'+actor.id,10);
  await authorizeStaffPhoto(actor,d);
  return adminJson(await changeStaffPhoto(actor,d,await readPhotoUpload(request)));
}catch(e){return adminError(e,request);}}
export async function DELETE(request:Request){try{
  assertAdminHost(request,true);const actor=await adminActor(request);
  await limitTenant('staff-photo-write:'+actor.id,10);
  return adminJson(await changeStaffPhoto(actor,input(request),null));
}catch(e){return adminError(e,request);}}
