import {tenantForHost} from '@/lib/tenants';
import {errorResponse} from '@/lib/http';
import {photoResponse,staffPhoto} from '@/lib/staff-photos';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{staffId:string}>}){try{
  const tenant=await tenantForHost(request.headers.get('host')??'');
  return photoResponse(await staffPhoto(tenant.id,(await context.params).staffId));
}catch(e){return errorResponse(e,request);}}
