import {z} from 'zod';
import {tenantForHost} from '@/lib/tenants';
import {publicBookingState,publicChangeOffers,changePublicBooking} from '@/lib/booking-management';
import {assertSameOrigin,errorResponse,json,limitTenant,readJson} from '@/lib/http';
import {AppError} from '@/lib/errors';
export const dynamic='force-dynamic';
const bearer=(request:Request)=>request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
function protect(response:Response){response.headers.set('Vary','Host, Authorization');response.headers.set('X-Robots-Tag','noindex, nofollow');return response;}
export async function GET(request:Request){
  try{
    const tenant=await tenantForHost(request.headers.get('host')??'','existing');await limitTenant(`management-read:${tenant.id}`,180);
    const query=z.object({day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if(!query.success)throw new AppError(400,'INVALID_INPUT','Vigane päring.');
    return protect(json(query.data.day?await publicChangeOffers(tenant.id,bearer(request),query.data.day):await publicBookingState(tenant.id,bearer(request))));
  }catch(error){return protect(errorResponse(error,request));}
}
export async function POST(request:Request){
  try{
    assertSameOrigin(request);const tenant=await tenantForHost(request.headers.get('host')??'','existing');await limitTenant(`management-write:${tenant.id}`,60);
    return protect(json(await changePublicBooking(tenant.id,bearer(request),await readJson(request),request.headers.get('idempotency-key')??'')));
  }catch(error){return protect(errorResponse(error,request));}
}
