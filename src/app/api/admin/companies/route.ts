import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {provisionCompany,ownerInvitationState,renewOwnerInvitation} from '@/lib/company-provisioning';
import {limitTenant,readJson} from '@/lib/http';
export async function GET(request:Request){try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant('owner-invitation-read:'+actor.id,60);return adminJson(await ownerInvitationState(actor,new URL(request.url).searchParams.get('tenantId')??''));}catch(error){return adminError(error,request);}}
export async function PATCH(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('owner-invitation-renew:'+actor.id,10);return adminJson(await renewOwnerInvitation(actor,await readJson(request)));}catch(error){return adminError(error,request);}}
export async function POST(request:Request){
  try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('company-create:'+actor.id,10);return adminJson(await provisionCompany(actor,await readJson(request)));}
  catch(error){return adminError(error,request);}
}
