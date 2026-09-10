import { tenantForHost } from '@/lib/tenants';
import { createBooking } from '@/lib/bookings';
import { json,errorResponse,readJson,assertSameOrigin,limitTenant } from '@/lib/http';
import {verifyBookingChallenge} from '@/lib/booking-challenge';
export const dynamic='force-dynamic';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const tenant=await tenantForHost(request.headers.get('host')??'');
    const requestKey=request.headers.get('idempotency-key')??'';
    const input=await readJson(request);
    await verifyBookingChallenge(request,requestKey);
    await limitTenant(`write:${tenant.id}`,120);
    return json(await createBooking(tenant,input,requestKey),201);
  } catch(error) { return errorResponse(error,request); }
}
