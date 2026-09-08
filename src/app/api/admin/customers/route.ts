import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {customerState,correctCustomer} from '@/lib/customer-management';
import {mergeCustomers} from '@/lib/customer-merge';
import {readJson,limitTenant} from '@/lib/http';
export const dynamic='force-dynamic';
export async function PUT(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant(`customers-merge:${actor.id}`,10);return adminJson(await mergeCustomers(actor,await readJson(request)));}catch(error){return adminError(error,request);}}
export async function GET(request:Request){try{
  assertAdminHost(request);const actor=await adminActor(request);await limitTenant(`customers-read:${actor.id}`,120);
  const result=await customerState(actor,Object.fromEntries(new URL(request.url).searchParams));
  if('csv' in result)return new Response(result.csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="kliendid.csv"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow',Vary:'Host, Cookie'}});
  return adminJson(result);
}catch(error){return adminError(error,request);}}
export async function POST(request:Request){try{
  assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant(`customers-write:${actor.id}`,30);
  return adminJson(await correctCustomer(actor,await readJson(request)));
}catch(error){return adminError(error,request);}}
