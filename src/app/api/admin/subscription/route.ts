import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {limitTenant,readJson} from '@/lib/http';
import {createSubscription,subscriptionState} from '@/lib/subscriptions';
export const runtime='nodejs';
export async function GET(request:Request){try{
 assertAdminHost(request);const actor=await adminActor(request);await limitTenant('subscription-read:'+actor.id,120);
 const params=new URL(request.url).searchParams;
 return adminJson(await subscriptionState(actor,params.get('tenantId')??'',params.get('platform')==='true'));
}catch(error){return adminError(error,request);}}
export async function POST(request:Request){try{
 assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('subscription-create:'+actor.id,10);
 return adminJson(await createSubscription(actor,await readJson(request)));
}catch(error){return adminError(error,request);}}
