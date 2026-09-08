import {z} from 'zod';
import {DateTime} from 'luxon';
import type {PoolClient} from 'pg';
import {type Actor,requireOwnerInTransaction,audit} from './access';
import {withTenant} from './db';
import {AppError} from './errors';
import type {Tenant} from './tenants';
import {offersInTransaction} from './availability';
import {bookingEvent,type BookingRow} from './booking-records';
import {billingAccess} from './billing-access';

type SetupTenant=Tenant&{booking_terms:string;reviewed_rules_version:number|null;lifecycle_version:number;published_at:Date|null};
export type OnboardingState={version:number;rulesVersion:number;state:string;demo:boolean;name:string;address:string;description:string;terms:string;rulesReviewed:boolean;hostname:string|null;checks:Array<{key:string;label:string;ready:boolean}>;canPublish:boolean};
const base={tenantId:z.uuid(),version:z.number().int().positive()};
const command=z.discriminatedUnion('action',[
  z.object({...base,action:z.literal('profile'),rulesVersion:z.number().int().positive(),name:z.string().trim().min(2).max(200),address:z.string().trim().min(2).max(500),description:z.string().trim().max(3000),terms:z.string().trim().max(5000),reviewed:z.boolean()}).strict(),
  z.object({...base,action:z.literal('publish')}).strict(),
  z.object({...base,action:z.literal('pause'),reason:z.string().trim().min(10).max(500)}).strict(),
]);
async function stateInClient(client:PoolClient,tenant:SetupTenant):Promise<OnboardingState>{
  const id=tenant.id;
  const domain=(await client.query('SELECT hostname,ready FROM tenant_domains WHERE tenant_id=$1 ORDER BY ready DESC,hostname LIMIT 1',[id])).rows[0];
  const eligible=(await client.query(`SELECT ss.staff_id,ss.service_id FROM staff_services ss JOIN staff st ON st.tenant_id=ss.tenant_id AND st.id=ss.staff_id JOIN services s ON s.tenant_id=ss.tenant_id AND s.id=ss.service_id WHERE ss.tenant_id=$1 AND ss.active AND st.active AND st.online AND s.active AND s.online AND (s.group_id IS NULL OR EXISTS(SELECT 1 FROM service_group_tree g WHERE g.tenant_id=s.tenant_id AND g.id=s.group_id AND g.effective_active))`,[id])).rows;
  const hours=(await client.query('SELECT staff_id FROM weekly_hours WHERE tenant_id=$1',[id])).rows;
  const testRows=(await client.query<BookingRow>("SELECT * FROM bookings WHERE tenant_id=$1 AND is_test AND source='online' AND status='confirmed' AND attention_reason IS NULL AND start_at>clock_timestamp() ORDER BY created_at DESC LIMIT 10",[id])).rows;
  let tested=false;
  for(const row of testRows){
    const day=DateTime.fromJSDate(row.start_at).setZone(tenant.timezone).toISODate()!;
    const offers=await offersInTransaction(client,tenant,row.service_id,day,row.staff_id,DateTime.now(),{excludeBookingId:row.id});
    if(offers.some(o=>DateTime.fromISO(o.start).toMillis()===row.start_at.getTime()&&o.duration===row.duration&&o.price===row.price)){tested=true;break;}
  }
  const subscription=await billingAccess(client,tenant);
  const staffCount=(await client.query('SELECT count(*)::int AS n FROM staff WHERE tenant_id=$1 AND active',[id])).rows[0].n;
  const checks=[
    {key:'company',label:'Ettevõtte andmed ja avalik kontakt',ready:!!(tenant.name.trim()&&tenant.address.trim()&&(tenant.contact_email||tenant.contact_phone))},
    {key:'services',label:'Broneeritav teenus ja sobiv töötaja',ready:eligible.length>0},
    {key:'schedule',label:'Ettevõtte ja töötaja graafik',ready:hours.some(h=>h.staff_id===null)&&eligible.some(e=>hours.some(h=>h.staff_id===e.staff_id))},
    {key:'terms',label:'Broneerimistingimused ja halduslingi poliitika',ready:tenant.booking_terms.length>=10&&tenant.management_link_hours!==null&&tenant.reviewed_rules_version===tenant.rules_version},
    {key:'test',label:'Kehtiv proovibroneering avalikus broneerimisvoos',ready:tested||tenant.published_at!==null},
    {key:'subscription',label:'Kehtiv pakett ja kasutusõigus',ready:subscription.allowed&&(subscription.staffLimit===null||staffCount<=subscription.staffLimit)},
    {key:'domain',label:'Seadistatud veebiaadress',ready:!!domain?.ready},
  ];
  return {version:tenant.lifecycle_version,rulesVersion:tenant.rules_version,state:tenant.public_state??'draft',demo:tenant.demo,name:tenant.name,address:tenant.address,description:tenant.description,terms:tenant.booking_terms,rulesReviewed:tenant.reviewed_rules_version===tenant.rules_version,hostname:domain?.hostname??null,checks,canPublish:checks.every(c=>c.ready)&&['draft','paused'].includes(tenant.public_state??'')};
}
export async function onboardingState(actor:Actor,tenantId:string){
  if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
  return withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    return stateInClient(client,(await client.query<SetupTenant>('SELECT * FROM tenants WHERE id=$1',[tenantId])).rows[0]);
  });
}
export async function changeOnboarding(actor:Actor,raw:unknown){
  const parsed=command.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli sisestatud andmeid.');
  const input=parsed.data;
  return withTenant(input.tenantId,async client=>{
    await requireOwnerInTransaction(actor,input.tenantId,client);
    const tenant=(await client.query<SetupTenant>('SELECT * FROM tenants WHERE id=$1',[input.tenantId])).rows[0];
    if(input.version!==tenant.lifecycle_version)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
    if(input.action==='profile'){
      if(input.rulesVersion!==tenant.rules_version)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
      await client.query('UPDATE tenants SET name=$2,address=$3,description=$4,booking_terms=$5,rules_version=rules_version+1,reviewed_rules_version=$6,lifecycle_version=lifecycle_version+1 WHERE id=$1',[tenant.id,input.name,input.address,input.description,input.terms,input.reviewed?tenant.rules_version+1:null]);
      await audit(client,tenant.id,actor.id,'company.profile.updated',undefined,tenant.id,{rulesReviewed:input.reviewed});
    }else if(input.action==='publish'){
      if(tenant.service_ends_at)throw new AppError(409,'EXIT_SCHEDULED','Ettevõttel on kinnitatud lahkumiskava. Avaldamiseks tuleb see esmalt tühistada.');
      const state=await stateInClient(client,tenant);
      if(!state.canPublish)throw new AppError(409,'PUBLICATION_NOT_READY','Avaldamise eeltingimused ei ole veel täidetud.');
      const tests=(await client.query<BookingRow>("SELECT * FROM bookings WHERE tenant_id=$1 AND is_test AND status<>'cancelled' FOR UPDATE",[tenant.id])).rows;
      for(const before of tests){
        const after=(await client.query<BookingRow>("UPDATE bookings SET status='cancelled',version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *",[tenant.id,before.id])).rows[0];
        await bookingEvent(client,after,'test.finished',actor.id,before,'Ettevõtte avaldamine');
      }
      await client.query("UPDATE outbox SET status='superseded',version=version+1 WHERE tenant_id=$1 AND booking_id IN(SELECT id FROM bookings WHERE tenant_id=$1 AND is_test) AND status IN('pending','failed','sending')",[tenant.id]);
      await client.query('UPDATE booking_management_tokens SET revoked_at=now() WHERE tenant_id=$1 AND booking_id IN(SELECT id FROM bookings WHERE tenant_id=$1 AND is_test) AND revoked_at IS NULL',[tenant.id]);
      await client.query("UPDATE tenants SET public_state='published',demo=false,published_at=COALESCE(published_at,now()),lifecycle_version=lifecycle_version+1 WHERE id=$1",[tenant.id]);
      await audit(client,tenant.id,actor.id,'company.published',undefined,tenant.id,{testsClosed:tests.length});
    }else{
      if(tenant.public_state!=='published')throw new AppError(409,'INVALID_TRANSITION','Ettevõte ei ole avaldatud.');
      await client.query("UPDATE tenants SET public_state='paused',lifecycle_version=lifecycle_version+1 WHERE id=$1",[tenant.id]);
      await audit(client,tenant.id,actor.id,'company.paused',undefined,tenant.id,{reason:input.reason});
    }
    return stateInClient(client,(await client.query<SetupTenant>('SELECT * FROM tenants WHERE id=$1',[tenant.id])).rows[0]);
  });
}
