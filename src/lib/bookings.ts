import { createHash, randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { z } from 'zod';
import type { BookingInput, BookingResult } from './contracts';
import type { Tenant } from './tenants';
import { withTenant } from './db';
import { offersInTransaction } from './availability';
import { AppError } from './errors';

export const bookingSchema = z.object({
  serviceId: z.uuid(), staffId: z.uuid(), start: z.iso.datetime({ offset:true }),
  expectedPrice: z.number().int().min(0), expectedDuration: z.number().int().min(5).max(720),
  expectedRulesVersion:z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(120), email: z.email().trim().max(254),
  phone: z.string().trim().max(30).regex(/^[+\d ()-]*$/).optional(),
}).strict();

type BookingRow = { id:string; reference:string; service_name:string; staff_name:string; start_at:Date; end_at:Date; price:number; duration:number; cancellation_hours:number|null; status:string };
function publicResult(row: BookingRow): BookingResult {
  return { id:row.id,reference:row.reference,serviceName:row.service_name,staffName:row.staff_name,start:row.start_at.toISOString(),end:row.end_at.toISOString(),price:row.price,duration:row.duration,cancellationHours:row.cancellation_hours,status:row.status };
}

export async function createBooking(tenant: Tenant, raw: BookingInput, requestKey: string): Promise<BookingResult> {
  if (!z.uuid().safeParse(requestKey).success) throw new AppError(400,'INVALID_REQUEST_KEY','Broneeringu päringutunnus puudub või on vigane.');
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(400,'INVALID_INPUT','Kontrolli nime, e-posti ja valitud aega.');
  const input = parsed.data;
  const payloadHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  try {
    return await withTenant(tenant.id, async client=>{
      // Global order: request key -> tenant shared lock -> staff lock. Schedule writers must use tenant+staff locks too.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${tenant.id}:booking:${requestKey}`]);
      const existing = await client.query(`SELECT r.payload_hash,b.* FROM booking_requests r JOIN bookings b ON b.tenant_id=r.tenant_id AND b.id=r.booking_id WHERE r.tenant_id=$1 AND r.request_key=$2`,[tenant.id,requestKey]);
      if (existing.rowCount) {
        if (existing.rows[0].payload_hash !== payloadHash) throw new AppError(409,'IDEMPOTENCY_CONFLICT','Sama päringutunnust kasutati teistsuguste andmetega.');
        return publicResult(existing.rows[0]);
      }
      const current = await client.query<Tenant>('SELECT * FROM tenants WHERE id=$1 AND active=true FOR SHARE',[tenant.id]);
      if (!current.rowCount) throw new AppError(404,'TENANT_NOT_FOUND','Ettevõte ei võta praegu broneeringuid vastu.');
      const freshTenant = current.rows[0];
      if(input.expectedRulesVersion!==freshTenant.rules_version)throw new AppError(409,'RULES_CHANGED','Broneerimisreeglid on muutunud. Laadi värsked tingimused ja vali aeg uuesti; kontaktandmed jäävad alles.');
      const staff = await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2 AND active AND online FOR UPDATE',[tenant.id,input.staffId]);
      if (!staff.rowCount) throw new AppError(409,'STAFF_UNAVAILABLE','See töötaja pole enam broneeritav.');
      const start = DateTime.fromISO(input.start,{setZone:true});
      const day = start.setZone(freshTenant.timezone).toISODate()!;
      const offers = await offersInTransaction(client,freshTenant,input.serviceId,day,input.staffId);
      const offer = offers.find(o=>DateTime.fromISO(o.start).toMillis()===start.toMillis());
      if (!offer) throw new AppError(409,'SLOT_UNAVAILABLE','See aeg pole enam vaba. Vali uus aeg; kontaktandmed jäävad alles.');
      if (offer.price!==input.expectedPrice || offer.duration!==input.expectedDuration) throw new AppError(409,'OFFER_CHANGED','Teenuse hind või kestus muutus. Palun vali pakkumine uuesti.');
      const details = await client.query(`SELECT s.name,COALESCE(ss.buffer_before,s.buffer_before) AS buffer_before,COALESCE(ss.buffer_after,s.buffer_after) AS buffer_after FROM services s JOIN staff_services ss ON ss.tenant_id=s.tenant_id AND ss.service_id=s.id WHERE s.tenant_id=$1 AND s.id=$2 AND ss.staff_id=$3`,[tenant.id,input.serviceId,input.staffId]);
      const detail = details.rows[0];
      const id = randomUUID();
      const reference = `BR-${id.replaceAll('-','').slice(0,12).toUpperCase()}`;
      const inserted = await client.query<BookingRow>(`INSERT INTO bookings(id,tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,customer_phone,start_at,end_at,occupied,price,duration,buffer_before,buffer_after,cancellation_hours)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,tstzrange($13::timestamptz,$14::timestamptz,'[)'),$15,$16,$17,$18,$19) RETURNING *`,
        [id,tenant.id,reference,input.serviceId,input.staffId,detail.name,offer.staffName,input.name,input.email,input.phone||null,offer.start,offer.end,start.minus({minutes:detail.buffer_before}).toISO(),DateTime.fromISO(offer.end).plus({minutes:detail.buffer_after}).toISO(),offer.price,offer.duration,detail.buffer_before,detail.buffer_after,freshTenant.cancellation_hours]);
      await client.query('INSERT INTO booking_requests(tenant_id,request_key,payload_hash,booking_id) VALUES($1,$2,$3,$4)',[tenant.id,requestKey,payloadHash,id]);
      await client.query("INSERT INTO outbox(tenant_id,booking_id,booking_version,kind) VALUES($1,$2,1,'booking.confirmed')",[tenant.id,id]);
      return publicResult(inserted.rows[0]);
    });
  } catch (error) {
    const code = (error as {code?:string}).code;
    if (code==='23P01') throw new AppError(409,'SLOT_UNAVAILABLE','See aeg broneeriti äsja. Vali uus aeg.');
    if (code==='55P03' || code==='57014' || code==='40P01') throw new AppError(503,'RETRY_SAME_REQUEST','Kinnitus vajab uut kontrolli. Proovi samade andmetega uuesti.');
    throw error;
  }
}
