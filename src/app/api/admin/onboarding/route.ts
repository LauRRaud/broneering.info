import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {onboardingState,changeOnboarding} from '@/lib/onboarding';
import {limitTenant,readJson} from '@/lib/http';
export async function GET(request:Request){try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant('setup-read:'+actor.id,60);return adminJson(await onboardingState(actor,new URL(request.url).searchParams.get('tenantId')??''));}catch(e){return adminError(e,request);}}
export async function POST(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('setup-write:'+actor.id,30);return adminJson(await changeOnboarding(actor,await readJson(request)));}catch(e){return adminError(e,request);}}
