import { tenantForHost } from '@/lib/tenants';
import { catalogFor } from '@/lib/availability';
import { json,errorResponse,limitTenant } from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(request: Request) {
  try {
    const tenant=await tenantForHost(request.headers.get('host')??'');
    limitTenant(`read:${tenant.id}`,600);
    return json(await catalogFor(tenant));
  } catch(error) { return errorResponse(error); }
}
