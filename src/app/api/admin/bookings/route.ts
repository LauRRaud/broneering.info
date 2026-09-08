import {z} from 'zod';
import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {adminBookingsState,adminBookingOffers,adminBookingHistory,changeAdminBooking} from '@/lib/booking-management';
import {limitTenant,readJson} from '@/lib/http';
import {AppError} from '@/lib/errors';
export const dynamic='force-dynamic';
const queries=z.discriminatedUnion('view',[
  z.object({view:z.literal('list'),tenantId:z.uuid(),day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),attention:z.enum(['1','0']).optional(),page:z.coerce.number().int().min(0).max(10000).default(0)}).strict(),
  z.object({view:z.literal('offers'),tenantId:z.uuid(),day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),serviceId:z.uuid(),staffId:z.uuid(),bookingId:z.uuid().optional()}).strict(),
  z.object({view:z.literal('history'),tenantId:z.uuid(),bookingId:z.uuid()}).strict(),
]);
export async function GET(request:Request){
  try{
    assertAdminHost(request);const actor=await adminActor(request);limitTenant(`booking-admin-read:${actor.id}`,240);
    const parsed=queries.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli kuupäeva ja valitud broneeringut.');const q=parsed.data;
    if(q.view==='offers')return adminJson(await adminBookingOffers(actor,q.tenantId,q.serviceId,q.staffId,q.day,q.bookingId));
    if(q.view==='history')return adminJson({events:await adminBookingHistory(actor,q.tenantId,q.bookingId)});
    return adminJson(await adminBookingsState(actor,q.tenantId,q.day,q.attention==='1',q.page));
  }catch(error){return adminError(error);}
}
export async function POST(request:Request){
  try{
    assertAdminHost(request,true);const actor=await adminActor(request);limitTenant(`booking-admin-write:${actor.id}`,60);
    return adminJson(await changeAdminBooking(actor,await readJson(request),request.headers.get('idempotency-key')??''));
  }catch(error){return adminError(error);}
}
