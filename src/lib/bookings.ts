import { createHash, randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { z } from 'zod';
import type { BookingInput, BookingResult } from './contracts';
import type { Tenant } from './tenants';
import { withTenant } from './db';
import { offersInTransaction } from './availability';
import { AppError } from './errors';
import type {PoolClient} from 'pg';
import type {Offer} from './contracts';
import {bookingResult,bookingEvent,issueBookingLink,queueBookingNotice,type BookingRow} from './booking-records';
import {sealBookingReply,openBookingReply} from './booking-secrets';

export const bookingSchema = z.object({
  serviceId: z.uuid(), staffId: z.uuid(), start: z.iso.datetime({ offset:true }),
  expectedPrice: z.number().int().min(0), expectedDuration: z.number().int().min(5).max(720),
  expectedRulesVersion:z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(120), email: z.email().trim().max(254),
  phone: z.string().trim().max(30).regex(/^[+\d ()-]*$/).optional(),
}).strict();

export async function insertBooking(client:PoolClient,tenant:Tenant,input:{serviceId:string;staffId:string;name:string;email:string|null;phone?:string},offer:Offer,source:'online'|'manual',actorId:string|null){
  const details=await client.query(`SELECT s.name,COALESCE(ss.buffer_before,s.buffer_before) AS buffer_before,COALESCE(ss.buffer_after,s.buffer_after) AS buffer_after FROM services s JOIN staff_services ss ON ss.tenant_id=s.tenant_id AND ss.service_id=s.id WHERE s.tenant_id=$1 AND s.id=$2 AND ss.staff_id=$3`,[tenant.id,input.serviceId,input.staffId]);
  const detail=details.rows[0],id=randomUUID(),reference=`BR-${id.replaceAll('-','').slice(0,12).toUpperCase()}`;
  const start=DateTime.fromISO(offer.start),end=DateTime.fromISO(offer.end);
  const row=(await client.query<BookingRow>(`INSERT INTO bookings(id,tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,customer_phone,start_at,end_at,occupied,price,duration,buffer_before,buffer_after,cancellation_hours,source)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,tstzrange($13::timestamptz,$14::timestamptz,'[)'),$15,$16,$17,$18,$19,$20) RETURNING *`,[id,tenant.id,reference,input.serviceId,input.staffId,detail.name,offer.staffName,input.name,input.email,input.phone||null,offer.start,offer.end,start.minus({minutes:detail.buffer_before}).toISO(),end.plus({minutes:detail.buffer_after}).toISO(),offer.price,offer.duration,detail.buffer_before,detail.buffer_after,tenant.cancellation_hours,source])).rows[0];
  await bookingEvent(client,row,'booking.created',actorId);
  await queueBookingNotice(client,row,'booking.confirmed');
  const link=tenant.management_link_hours!=null?await issueBookingLink(client,tenant,row):{};
  return {...bookingResult(row),...link};
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
      const existing = await client.query(`SELECT r.payload_hash,r.response_data,r.encrypted_link,b.* FROM booking_requests r JOIN bookings b ON b.tenant_id=r.tenant_id AND b.id=r.booking_id WHERE r.tenant_id=$1 AND r.request_key=$2`,[tenant.id,requestKey]);
      if (existing.rowCount) {
        if (existing.rows[0].payload_hash !== payloadHash) throw new AppError(409,'IDEMPOTENCY_CONFLICT','Sama päringutunnust kasutati teistsuguste andmetega.');
        const row=existing.rows[0],saved=(row.response_data??bookingResult(row)) as BookingResult;
        const link=row.encrypted_link?openBookingReply<Pick<BookingResult,'managementUrl'|'managementExpiresAt'>>(row.encrypted_link,`create:${tenant.id}:${requestKey}`):{};
        return {...saved,...link,...(saved.version!==row.version?{currentVersion:row.version,currentStatus:row.status}:{})};
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
      const result=await insertBooking(client,freshTenant,input,offer,'online',null);
      const {managementUrl,managementExpiresAt,...responseData}=result;
      const encryptedLink=managementUrl?sealBookingReply({managementUrl,managementExpiresAt},`create:${tenant.id}:${requestKey}`):null;
      await client.query('INSERT INTO booking_requests(tenant_id,request_key,payload_hash,booking_id,response_data,encrypted_link) VALUES($1,$2,$3,$4,$5,$6)',[tenant.id,requestKey,payloadHash,result.id,responseData,encryptedLink]);
      return result;
    });
  } catch (error) {
    const code = (error as {code?:string}).code;
    if (code==='23P01') throw new AppError(409,'SLOT_UNAVAILABLE','See aeg broneeriti äsja. Vali uus aeg.');
    if (code==='55P03' || code==='57014' || code==='40P01') throw new AppError(503,'RETRY_SAME_REQUEST','Kinnitus vajab uut kontrolli. Proovi samade andmetega uuesti.');
    throw error;
  }
}
