import { DateTime } from 'luxon';
import type { PoolClient } from 'pg';
import type { Offer, Catalog } from './contracts';
import type { Tenant } from './tenants';
import {assertBookingAccess} from './booking-access';
import type {Actor} from './access';
import { withTenant } from './db';
import { AppError } from './errors';
import {mergeAdjacent} from './schedule-contracts';
import {z} from 'zod';

type Interval = [number, number];
type Hours = { staff_id: string | null; start_minute: number; end_minute: number };
type Exception = { staff_id: string | null; closed: boolean; intervals: Interval[] };
type Eligible = { staff_id: string; staff_name: string; price: number; duration: number; buffer_before: number; buffer_after: number };

// Fail closed for both nonexistent spring times and ambiguous autumn times.
export function localInstant(day: string, minute: number, zone: string): DateTime | null {
  const base = DateTime.fromISO(day, { zone });
  const expected = minute === 1440 ? base.plus({ days: 1 }).toISODate() : day;
  const m = minute === 1440 ? 0 : minute;
  const value = DateTime.fromISO(`${expected}T${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`, { zone });
  if (!value.isValid || value.toISODate() !== expected || value.hour * 60 + value.minute !== m || value.getPossibleOffsets().length !== 1) return null;
  return value;
}

export function intervalsFor(staffId: string | null, hours: Hours[], exceptions: Exception[]): Interval[] {
  const override = exceptions.find(e => e.staff_id === staffId);
  const source = override ? (override.closed ? [] : override.intervals) : hours.filter(h => h.staff_id === staffId).map(h => [h.start_minute,h.end_minute] as Interval);
  // Invalid DB configuration must never accidentally open a whole day.
  return mergeAdjacent(source.filter(i => Array.isArray(i) && i.length === 2 && i.every(Number.isInteger) && i[0] >= 0 && i[1] <= 1440 && i[1] > i[0]));
}

export async function catalogFor(tenant: Tenant, selectedStaffId?: string,previewActor?:Actor): Promise<Catalog> {
  if(selectedStaffId !== undefined && !z.uuid().safeParse(selectedStaffId).success) throw new AppError(404,'STAFF_UNAVAILABLE','Selle töötaja link ei ole enam kasutatav.');
  return withTenant(tenant.id, async client => {
    const current=await client.query<Tenant>('SELECT * FROM tenants WHERE id=$1 AND active FOR SHARE',[tenant.id]);
    if(!current.rowCount)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
    tenant=current.rows[0];
    await assertBookingAccess(client,tenant,previewActor);
    const services = await client.query(`SELECT s.id,s.source_language AS "sourceLanguage",s.name,s.description,COALESCE(g.path,s.category) AS category,min(COALESCE(ss.price,s.default_price))::int AS "priceFrom",min(COALESCE(ss.duration,s.default_duration))::int AS "durationFrom"
      FROM services s LEFT JOIN service_group_tree g ON g.tenant_id=s.tenant_id AND g.id=s.group_id JOIN staff_services ss ON ss.tenant_id=s.tenant_id AND ss.service_id=s.id
      JOIN staff st ON st.tenant_id=ss.tenant_id AND st.id=ss.staff_id
      WHERE s.tenant_id=$1 AND ($2::uuid IS NULL OR st.id=$2) AND s.active AND s.online AND st.active AND st.online AND ss.active AND (s.group_id IS NULL OR g.effective_active) GROUP BY s.id,g.path ORDER BY category,s.name`,[tenant.id,selectedStaffId??null]);
    const translated=await client.query('SELECT tr.service_id,tr.language,tr.published_name AS name,tr.published_description AS description FROM service_translations tr JOIN services s ON s.tenant_id=tr.tenant_id AND s.id=tr.service_id WHERE tr.tenant_id=$1 AND tr.published_source_version=s.content_version AND tr.language<>s.source_language',[tenant.id]);
    for(const service of services.rows)service.translations=Object.fromEntries(translated.rows.filter(r=>r.service_id===service.id).map(r=>[r.language,{name:r.name,description:r.description}]));
    const staff = await client.query(`SELECT st.id,st.name,st.title,st.bio,st.photo_url AS "photoUrl",array_agg(ss.service_id) AS "serviceIds"
      FROM staff st JOIN staff_services ss ON ss.staff_id=st.id AND ss.tenant_id=st.tenant_id
      JOIN services s ON s.id=ss.service_id AND s.tenant_id=ss.tenant_id
      WHERE st.tenant_id=$1 AND ($2::uuid IS NULL OR st.id=$2) AND st.active AND st.online AND s.active AND s.online AND ss.active AND (s.group_id IS NULL OR EXISTS (SELECT 1 FROM service_group_tree g WHERE g.tenant_id=s.tenant_id AND g.id=s.group_id AND g.effective_active)) GROUP BY st.id ORDER BY st.name,st.id`,[tenant.id,selectedStaffId??null]);
    if(selectedStaffId && !staff.rowCount) throw new AppError(404,'STAFF_UNAVAILABLE','Selle töötaja link ei ole enam kasutatav.');
    const now = DateTime.now().setZone(tenant.timezone);
    return { tenant: { bookingTerms:tenant.booking_terms,defaultLanguage:tenant.default_language,name: tenant.name, slug: tenant.slug, address: tenant.address, description: tenant.description, timezone: tenant.timezone, cancellationHours: tenant.cancellation_hours, rulesVersion:tenant.rules_version, demo: tenant.demo }, services: services.rows, staff: staff.rows, today: now.toISODate()!, maxDate: now.plus({days:tenant.window_days}).toISODate()!, ...(selectedStaffId?{selectedStaffId}:{}) };
  });
}

export async function offersInTransaction(client: PoolClient, tenant: Tenant, serviceId: string, day: string, staffId?: string, now: DateTime = DateTime.now(), options:{excludeBookingId?:string;includeHidden?:boolean}={}): Promise<Offer[]> {
  const date = DateTime.fromISO(day, {zone: tenant.timezone});
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !date.isValid || date.toISODate() !== day) throw new AppError(400,'INVALID_DATE','Vali korrektne kuupäev.');
  const today = now.setZone(tenant.timezone).startOf('day');
  if (date < today || date > today.plus({days:tenant.window_days})) return [];
  const eligible = await client.query<Eligible>(`SELECT st.id AS staff_id,st.name AS staff_name,COALESCE(ss.price,s.default_price) AS price,COALESCE(ss.duration,s.default_duration) AS duration,COALESCE(ss.buffer_before,s.buffer_before) AS buffer_before,COALESCE(ss.buffer_after,s.buffer_after) AS buffer_after
    FROM staff_services ss JOIN staff st ON st.tenant_id=ss.tenant_id AND st.id=ss.staff_id
    JOIN services s ON s.tenant_id=ss.tenant_id AND s.id=ss.service_id
    WHERE ss.tenant_id=$1 AND ss.service_id=$2 AND ($3::uuid IS NULL OR st.id=$3) AND st.active AND ($4::boolean OR st.online) AND s.active AND ($4::boolean OR s.online) AND ss.active AND (s.group_id IS NULL OR EXISTS (SELECT 1 FROM service_group_tree g WHERE g.tenant_id=s.tenant_id AND g.id=s.group_id AND g.effective_active)) ORDER BY st.name,st.id`,[tenant.id,serviceId,staffId ?? null,options.includeHidden??false]);
  if (!eligible.rowCount) return [];
  const hours = await client.query<Hours>('SELECT staff_id,start_minute,end_minute FROM weekly_hours WHERE tenant_id=$1 AND weekday=$2',[tenant.id,date.weekday]);
  const exceptions = await client.query<Exception>('SELECT staff_id,closed,intervals FROM schedule_exceptions WHERE tenant_id=$1 AND day=$2::date',[tenant.id,day]);
  const busy = await client.query<{staff_id:string; start:Date; end:Date}>(`SELECT staff_id,lower(occupied) AS start,upper(occupied) AS "end" FROM bookings WHERE tenant_id=$1 AND status<>'cancelled' AND ($4::uuid IS NULL OR id<>$4) AND occupied && tstzrange($2::timestamptz,$3::timestamptz,'[)')`,[tenant.id,date.startOf('day').toISO(),date.plus({days:1}).startOf('day').toISO(),options.excludeBookingId??null]);
  const locationHours = intervalsFor(null,hours.rows,exceptions.rows);
  const result: Offer[] = [];
  for (const staff of eligible.rows) {
    const intervals: Interval[] = [];
    for (const [a,b] of locationHours) for (const [c,d] of intervalsFor(staff.staff_id,hours.rows,exceptions.rows)) {
      if (Math.max(a,c) < Math.min(b,d)) intervals.push([Math.max(a,c),Math.min(b,d)]);
    }
    const seen = new Set<number>();
    for (const [open,close] of intervals) {
      const windowStart = localInstant(day,open,tenant.timezone), windowEnd = localInstant(day,close,tenant.timezone);
      if (!windowStart || !windowEnd) continue;
      for (let minute = Math.ceil((open+staff.buffer_before)/tenant.step_minutes)*tenant.step_minutes; minute < close; minute += tenant.step_minutes) {
        const start = localInstant(day,minute,tenant.timezone);
        if (!start || seen.has(start.toMillis()) || start < now.plus({minutes:tenant.lead_minutes})) continue;
        const end = start.plus({minutes:staff.duration});
        const occupiedStart = start.minus({minutes:staff.buffer_before});
        const occupiedEnd = end.plus({minutes:staff.buffer_after});
        if (occupiedStart < windowStart || occupiedEnd > windowEnd) continue;
        if (busy.rows.some(b=>b.staff_id===staff.staff_id && b.start.getTime() < occupiedEnd.toMillis() && b.end.getTime() > occupiedStart.toMillis())) continue;
        seen.add(start.toMillis());
        result.push({staffId:staff.staff_id,staffName:staff.staff_name,serviceId,start:start.toUTC().toISO()!,end:end.toUTC().toISO()!,price:staff.price,duration:staff.duration});
      }
    }
  }
  // Preserve concrete staff offers, including price/duration differences. Never assign a time here.
  return result.sort((a,b)=>a.start.localeCompare(b.start) || a.staffName.localeCompare(b.staffName) || a.staffId.localeCompare(b.staffId));
}

export function availableOffers(tenant: Tenant, serviceId: string, day: string, staffId?: string,previewActor?:Actor) {
  return withTenant(tenant.id, async client=>{
    const current=await client.query<Tenant>('SELECT * FROM tenants WHERE id=$1 AND active FOR SHARE',[tenant.id]);
    if(!current.rowCount)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
    await assertBookingAccess(client,current.rows[0],previewActor);
    return offersInTransaction(client,current.rows[0],serviceId,day,staffId);
  });
}

// Search at most 31 days per request; callers can explicitly continue the next block.
export function nextAvailableDay(tenant: Tenant, serviceId: string, after: string, staffId?: string,previewActor?:Actor) {
  return withTenant(tenant.id,async client=>{
    const current=await client.query<Tenant>('SELECT * FROM tenants WHERE id=$1 AND active FOR SHARE',[tenant.id]);
    if(!current.rowCount)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
    const fresh=current.rows[0], now=DateTime.now();
    await assertBookingAccess(client,fresh,previewActor);
    const base=DateTime.fromISO(after,{zone:fresh.timezone});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(after)||!base.isValid||base.toISODate()!==after)throw new AppError(400,'INVALID_DATE','Vali korrektne kuupäev.');
    const today=now.setZone(fresh.timezone).startOf('day');
    const last=today.plus({days:fresh.window_days});
    if(base<today||base>last)throw new AppError(400,'INVALID_DATE','Kuupäev jääb broneerimisaknast välja.');
    let searchedThrough=after;
    for(let offset=1;offset<=31;offset++){
      const candidate=base.plus({days:offset});
      if(candidate>last)break;
      searchedThrough=candidate.toISODate()!;
      if((await offersInTransaction(client,fresh,serviceId,searchedThrough,staffId,now)).length) return {date:searchedThrough,searchedThrough,hasMore:searchedThrough<last.toISODate()!};
    }
    return {date:null,searchedThrough,hasMore:searchedThrough<last.toISODate()!};
  });
}
