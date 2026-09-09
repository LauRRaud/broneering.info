import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {supportViewState} from '@/lib/support-view';
import {limitTenant} from '@/lib/request-limits';
import {AppError} from '@/lib/errors';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    assertAdminHost(request);
    const actor=await adminActor(request);
    await limitTenant(`support-read:${actor.id}`,120);
    const params=Object.fromEntries(new URL(request.url).searchParams);
    // Contact searches must not appear in URLs recorded by proxy/application access logs.
    const header=request.headers.get('x-support-search')||'';
    if(Object.hasOwn(params,'search')||header.length>1440)throw new AppError(400,'INVALID_INPUT','Kontrolli tugivaate päringut.');
    let search:string;
    try{search=decodeURIComponent(header);}catch{throw new AppError(400,'INVALID_INPUT','Kontrolli tugivaate päringut.');}
    return adminJson(await supportViewState(actor,{...params,search}));
  }catch(error){return adminError(error,request);}
}
function readOnly(request?:Request){const response=adminError(new AppError(405,'READ_ONLY','Tugivaade on ainult lugemiseks.'),request);response.headers.set('Allow','GET');return response;}
export const POST=readOnly;
export const PUT=readOnly;
export const PATCH=readOnly;
export const DELETE=readOnly;
