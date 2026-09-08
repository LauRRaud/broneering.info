import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {readJson,limitTenant} from '@/lib/http';
import {retentionState,changeRetention} from '@/lib/retention';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant('retention-read:'+actor.id,60);return adminJson(await retentionState(actor,new URL(request.url).searchParams.get('tenantId')??''));}catch(error){return adminError(error,request);}}
export async function POST(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('retention-write:'+actor.id,10);return adminJson(await changeRetention(actor,await readJson(request)));}catch(error){return adminError(error,request);}}
