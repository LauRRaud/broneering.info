import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {readJson,limitTenant} from '@/lib/http';
import {exportCustomerData,previewContactRemoval,removeCustomerContacts} from '@/lib/customer-privacy';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{assertAdminHost(request);const actor=await adminActor(request);await limitTenant(`customer-privacy-preview:${actor.id}`,60);const q=new URL(request.url).searchParams;return adminJson(await previewContactRemoval(actor,q.get('tenantId')??'',q.get('customerId')??''));}catch(error){return adminError(error,request);}}
export async function DELETE(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant(`customer-privacy-remove:${actor.id}`,10);return adminJson(await removeCustomerContacts(actor,await readJson(request)));}catch(error){return adminError(error,request);}}
export async function POST(request:Request){try{
 assertAdminHost(request,true);
 const actor=await adminActor(request);
 await limitTenant(`customer-privacy:${actor.id}`,10);
 const result=await exportCustomerData(actor,await readJson(request));
 return new Response(JSON.stringify(result,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="customer-data.json"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow',Vary:'Host, Cookie'}});
}catch(error){return adminError(error,request);}}
