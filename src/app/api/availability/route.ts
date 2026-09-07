import { z } from 'zod';
import { tenantForHost } from '@/lib/tenants';
import { availableOffers } from '@/lib/availability';
import { json,errorResponse,limitTenant } from '@/lib/http';
import { AppError } from '@/lib/errors';
export const dynamic='force-dynamic';
export async function GET(request: Request) {
  try {
    const tenant=await tenantForHost(request.headers.get('host')??'');
    limitTenant(`read:${tenant.id}`,600);
    const parsed=z.object({serviceId:z.uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),staffId:z.uuid().optional()}).safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if(!parsed.success) throw new AppError(400,'INVALID_INPUT','Vali teenus ja kuupäev.');
    return json({offers:await availableOffers(tenant,parsed.data.serviceId,parsed.data.date,parsed.data.staffId)});
  } catch(error) { return errorResponse(error); }
}
