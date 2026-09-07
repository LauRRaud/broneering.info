import { beforeEach, afterEach, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { DateTime } from 'luxon';
import { availableOffers, catalogFor, localInstant, offersInTransaction } from '../src/lib/availability';
import { createBooking } from '../src/lib/bookings';
import { pool, withTenant } from '../src/lib/db';
import { tenantForHost, type Tenant } from '../src/lib/tenants';
import type { BookingInput, Offer } from '../src/lib/contracts';

const admin = new pg.Pool({connectionString:process.env.MIGRATION_DATABASE_URL,max:2});
type Fixture = {tenant:Tenant;staffId:string;serviceId:string;host:string};
let first:Fixture,second:Fixture;
const day=DateTime.now().setZone('Europe/Tallinn').plus({days:7}).toISODate()!;

async function fixture():Promise<Fixture>{
  const id=randomUUID(),staffId=randomUUID(),serviceId=randomUUID(),slug=`test-${id.slice(0,12)}`,host=`${slug}.localhost`;
  const tenant=(await admin.query<Tenant>('INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,$3,$4) RETURNING *',[id,slug,'Test salon','Test address'])).rows[0];
  await admin.query('INSERT INTO tenant_domains(hostname,tenant_id) VALUES($1,$2)',[host,id]);
  await admin.query('INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,$3)',[staffId,id,'Test staff']);
  await admin.query('INSERT INTO services(id,tenant_id,name,category) VALUES($1,$2,$3,$4)',[serviceId,id,'Test haircut','Hair']);
  await admin.query('INSERT INTO staff_services(tenant_id,staff_id,service_id,price,duration,buffer_before,buffer_after) VALUES($1,$2,$3,2500,30,5,10)',[id,staffId,serviceId]);
  for(let weekday=1;weekday<=7;weekday++) for(const st of [null,staffId]) for(const [a,b] of [[540,720],[780,1080]]) {
    await admin.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) VALUES($1,$2,$3,$4,$5)',[id,st,weekday,a,b]);
  }
  return {tenant,staffId,serviceId,host};
}
function input(offer:Offer):BookingInput{return {serviceId:offer.serviceId,staffId:offer.staffId,start:offer.start,expectedPrice:offer.price,expectedDuration:offer.duration,name:'Test Client',email:'test@example.invalid'};}
async function firstOffer(f=first){return (await availableOffers(f.tenant,f.serviceId,day,f.staffId))[0];}

beforeEach(async()=>{first=await fixture();second=await fixture();});
afterEach(async()=>{
  for(const f of [first,second].filter(Boolean)) {
    for(const table of ['booking_requests','outbox','bookings','schedule_exceptions','weekly_hours','staff_services','staff','services','tenant_domains']) await admin.query(`DELETE FROM ${table} WHERE tenant_id=$1`,[f.tenant.id]);
    await admin.query('DELETE FROM tenants WHERE id=$1',[f.tenant.id]);
  }
});
afterAll(async()=>{await admin.end();await pool().end();});

describe('PostgreSQL booking core',()=>{
  it('AT-11: 50 competing requests create exactly one booking and one outbox event',async()=>{
    const offer=await firstOffer();
    const results=await Promise.allSettled(Array.from({length:50},()=>createBooking(first.tenant,input(offer),randomUUID())));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.filter(r=>r.status==='rejected').every(r=>r.status==='rejected' && r.reason.code==='SLOT_UNAVAILABLE')).toBe(true);
    const counts=await admin.query('SELECT (SELECT count(*) FROM bookings WHERE tenant_id=$1)::int AS bookings,(SELECT count(*) FROM outbox WHERE tenant_id=$1)::int AS events',[first.tenant.id]);
    expect(counts.rows[0]).toEqual({bookings:1,events:1});
  });
  it('AT-12/13: concurrent retries share one result; changed body conflicts',async()=>{
    const data=input(await firstOffer()),key=randomUUID();
    const results=await Promise.all(Array.from({length:12},()=>createBooking(first.tenant,data,key)));
    expect(new Set(results.map(r=>r.id)).size).toBe(1);
    await expect(createBooking(first.tenant,{...data,name:'Different Client'},key)).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
  });
  it('AT-19/21/22: tenant data and connection contexts stay separate',async()=>{
    const a=await catalogFor(first.tenant),b=await catalogFor(second.tenant);
    expect(a.staff.map(s=>s.id)).toEqual([first.staffId]);
    expect(b.staff.map(s=>s.id)).toEqual([second.staffId]);
    await createBooking(first.tenant,input(await firstOffer()),randomUUID());
    await withTenant(second.tenant.id,async c=>expect((await c.query('SELECT * FROM bookings')).rows).toEqual([]));
    const unscoped=await pool().query('SELECT * FROM bookings');
    expect(unscoped.rows).toEqual([]);
    const offers=await availableOffers(first.tenant,first.serviceId,day);
    expect(JSON.stringify(offers)).not.toContain('test@example.invalid');
    expect(Object.keys(offers[0]).sort()).toEqual(['duration','end','price','serviceId','staffId','staffName','start']);
  });
  it('AT-02/19: forged cross-tenant service or staff fails',async()=>{
    const offer=await firstOffer();
    await expect(createBooking(first.tenant,{...input(offer),staffId:second.staffId},randomUUID())).rejects.toMatchObject({code:'STAFF_UNAVAILABLE'});
    await expect(createBooking(first.tenant,{...input(offer),serviceId:second.serviceId},randomUUID())).rejects.toMatchObject({code:'SLOT_UNAVAILABLE'});
    expect(await availableOffers(first.tenant,second.serviceId,day)).toEqual([]);
  });
  it('AT-09/10: buffers and lunch break are included in availability',async()=>{
    const offers=await availableOffers(first.tenant,first.serviceId,day);
    const minutes=offers.map(o=>DateTime.fromISO(o.start).setZone('Europe/Tallinn').toFormat('HH:mm'));
    expect(minutes).not.toContain('09:00'); // five-minute preparation must fit inside opening hours
    expect(minutes).toContain('09:15');
    expect(minutes).not.toContain('11:30'); // 30 minute service + ten-minute cleanup crosses noon
    expect(minutes).not.toContain('12:30');
    const chosen=offers[0];
    await createBooking(first.tenant,input(chosen),randomUUID());
    const remaining=await availableOffers(first.tenant,first.serviceId,day);
    expect(remaining.some(o=>o.start===chosen.start)).toBe(false);
    expect(remaining.some(o=>DateTime.fromISO(o.start).setZone('Europe/Tallinn').toFormat('HH:mm')==='10:00')).toBe(true);
  });
  it('AT-10: closed and replacement day schedules override weekly intervals',async()=>{
    await admin.query('INSERT INTO schedule_exceptions(tenant_id,staff_id,day,closed) VALUES($1,$2,$3,true)',[first.tenant.id,first.staffId,day]);
    expect(await availableOffers(first.tenant,first.serviceId,day)).toEqual([]);
    await admin.query("UPDATE schedule_exceptions SET closed=false,intervals='[[900,960]]'::jsonb WHERE tenant_id=$1",[first.tenant.id]);
    const offers=await availableOffers(first.tenant,first.serviceId,day);
    expect(offers).toHaveLength(1);
    expect(DateTime.fromISO(offers[0].start).setZone('Europe/Tallinn').toFormat('HH:mm')).toBe('15:15');
  });
  it('AT-07/08: server lead time applies at availability and confirmation',async()=>{
    const now=DateTime.now().setZone('Europe/Tallinn').set({hour:13,minute:0,second:0,millisecond:0});
    const offers=await withTenant(first.tenant.id,c=>offersInTransaction(c,first.tenant,first.serviceId,now.toISODate()!,undefined,now));
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every(o=>DateTime.fromISO(o.start)>=now.plus({hours:2}))).toBe(true);
    const chosen=await firstOffer();
    await admin.query('UPDATE tenants SET lead_minutes=20000 WHERE id=$1',[first.tenant.id]);
    await expect(createBooking(first.tenant,input(chosen),randomUUID())).rejects.toMatchObject({code:'SLOT_UNAVAILABLE'});
  });
  it('price changes must be reviewed again',async()=>{
    const data=input(await firstOffer());
    await admin.query('UPDATE staff_services SET price=3000 WHERE tenant_id=$1',[first.tenant.id]);
    await expect(createBooking(first.tenant,data,randomUUID())).rejects.toMatchObject({code:'OFFER_CHANGED'});
    expect((await admin.query('SELECT * FROM bookings WHERE tenant_id=$1',[first.tenant.id])).rowCount).toBe(0);
  });
  it('AT-27: exact hostname lookup fails closed for unknown and reserved names',async()=>{
    expect((await tenantForHost(`${first.host}:3000`)).id).toBe(first.tenant.id);
    await expect(tenantForHost('unconfigured.localhost')).rejects.toMatchObject({code:'TENANT_NOT_FOUND'});
    await expect(admin.query("INSERT INTO tenants(slug,name,address) VALUES('haldus','Reserved','Test')")).rejects.toMatchObject({code:'23514'});
  });
  it('database constraint rejects overlapping allocations even outside application code',async()=>{
    await createBooking(first.tenant,input(await firstOffer()),randomUUID());
    await expect(admin.query(`INSERT INTO bookings(tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,start_at,end_at,occupied,price,duration,buffer_before,buffer_after)
      SELECT tenant_id,$2,service_id,staff_id,service_name,staff_name,customer_name,customer_email,start_at,end_at,occupied,price,duration,buffer_before,buffer_after FROM bookings WHERE tenant_id=$1`,[first.tenant.id,randomUUID()])).rejects.toMatchObject({code:'23P01'});
  });
  it('RLS rejects writes carrying another tenant context',async()=>{
    const booking=await createBooking(second.tenant,input(await firstOffer(second)),randomUUID());
    await expect(withTenant(first.tenant.id,c=>c.query("INSERT INTO outbox(tenant_id,booking_id,booking_version,kind) VALUES($1,$2,2,'test')",[second.tenant.id,booking.id]))).rejects.toMatchObject({code:'42501'});
  });
});

describe('AT-17: Europe/Tallinn daylight saving',()=>{
  it('skips nonexistent spring and ambiguous autumn wall times',()=>{
    expect(localInstant('2026-03-29',210,'Europe/Tallinn')).toBeNull();
    expect(localInstant('2026-10-25',210,'Europe/Tallinn')).toBeNull();
    expect(localInstant('2026-03-29',270,'Europe/Tallinn')?.toUTC().toFormat('HH:mm')).toBe('01:30');
    expect(localInstant('2026-10-25',270,'Europe/Tallinn')?.toUTC().toFormat('HH:mm')).toBe('02:30');
  });
});
