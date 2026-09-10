import { z } from 'zod';
import { tenantForHost } from '@/lib/tenants';
import { availableOffers, nextAvailableDay } from '@/lib/availability';
import { json,errorResponse,limitTenant,trustedClientIp } from '@/lib/http';
import { AppError } from '@/lib/errors';
export const dynamic='force-dynamic';
export async function GET(request: Request) {
  try {
    const tenant=await tenantForHost(request.headers.get('host')??'');
    await limitTenant(`read:${tenant.id}`,600);
    const parsed=z.object({serviceId:z.uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),staffId:z.uuid().optional(),next:z.literal('1').optional()}).safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if(!parsed.success) throw new AppError(400,'INVALID_INPUT','Vali teenus ja kuupäev.');
    if(parsed.data.next){
      const clientIp=trustedClientIp(request);
      await limitTenant(`next-day-client:${tenant.id}:${clientIp}`,30);
      await limitTenant(`next-day-tenant:${tenant.id}`,300);
      return json(await nextAvailableDay(tenant,parsed.data.serviceId,parsed.data.date,parsed.data.staffId));
    }
    return json({offers:await availableOffers(tenant,parsed.data.serviceId,parsed.data.date,parsed.data.staffId)});
  } catch(error) { return errorResponse(error,request); }
}
