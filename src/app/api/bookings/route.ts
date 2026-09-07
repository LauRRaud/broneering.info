import { tenantForHost } from '@/lib/tenants';
import { createBooking } from '@/lib/bookings';
import { json,errorResponse,readJson,assertSameOrigin,limitTenant } from '@/lib/http';
export const dynamic='force-dynamic';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const tenant=await tenantForHost(request.headers.get('host')??'');
    limitTenant(`write:${tenant.id}`,120);
    return json(await createBooking(tenant,await readJson(request),request.headers.get('idempotency-key')??''),201);
  } catch(error) { return errorResponse(error); }
}
