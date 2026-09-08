import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {notificationState,changeNotificationSettings} from '@/lib/notification-management';
import {limitTenant,readJson} from '@/lib/http';
export async function GET(request:Request){
  try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant('notifications-read:'+actor.id,120);const q=new URL(request.url).searchParams;return adminJson(await notificationState(actor,q.get('tenantId')??'',Number(q.get('page')??0)));}catch(error){return adminError(error,request);}
}
export async function POST(request:Request){
  try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('notifications-write:'+actor.id,30);return adminJson(await changeNotificationSettings(actor,await readJson(request)));}catch(error){return adminError(error,request);}
}
