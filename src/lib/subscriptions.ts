import {z} from 'zod';
import {DateTime} from 'luxon';
import {withTenant} from './db';
import {audit,requireOwnerInTransaction,requirePlatformInClient,type Actor} from './access';
import {AppError} from './errors';
import {tokenHash} from './booking-secrets';
import {monthlyPeriod,STANDARD_PLAN} from './billing-rules';
import type {PoolClient} from 'pg';
import type {BillingParty} from './billing-config';
import {billingAccess,type BillingAccess} from './billing-access';

const contact={billingName:z.string().trim().min(2).max(200),billingEmail:z.email().trim().toLowerCase().max(254)};
const create=z.object({tenantId:z.uuid(),requestKey:z.uuid(),start:z.iso.date(),...contact,confirmed:z.literal(true)}).strict();
export type SubscriptionState={subscription:null|{
  id:string;version:number;status:string;periodStart:string;periodEnd:string;paidThrough:string|null;anchorDay:number;
  billingName:string;billingEmail:string;endsAt:string|null;recipient:Partial<BillingParty>;paymentMode:'invoice'|'autopay';
  access:BillingAccess;
  plan:{name:string;version:number;monthlyPrice:number;currency:string;staffLimit:number|null;terms:Record<string,unknown>};
}};
async function state(client:PoolClient,tenantId:string):Promise<SubscriptionState>{
  const row=(await client.query(`SELECT s.id,s.version,s.status,s.period_start::text,s.period_end::text,s.paid_through::text,
    s.anchor_day,s.billing_contact_name,s.billing_email,s.billing_recipient,s.payment_mode,s.ends_at,p.name,p.version AS plan_version,p.monthly_price,p.currency,p.staff_limit,p.entitlements,t.timezone,t.service_ends_at
    FROM subscriptions s JOIN plan_versions p ON (p.id,p.version)=(s.plan_id,s.plan_version) JOIN tenants t ON t.id=s.tenant_id WHERE s.tenant_id=$1`,[tenantId])).rows[0];
  if(!row)return {subscription:null};
  const access=await billingAccess(client,{id:tenantId,timezone:row.timezone,service_ends_at:row.service_ends_at});
  return {subscription:{id:row.id,version:row.version,status:access.status,access,periodStart:row.period_start,periodEnd:row.period_end,paidThrough:access.paidThrough,anchorDay:row.anchor_day,
    billingName:row.billing_contact_name,billingEmail:row.billing_email,recipient:row.billing_recipient,paymentMode:row.payment_mode,endsAt:row.ends_at?.toISOString()??null,
    plan:{name:row.name,version:row.plan_version,monthlyPrice:row.monthly_price,currency:row.currency,staffLimit:row.staff_limit,terms:row.entitlements}}};
}
export async function subscriptionState(actor:Actor,tenantId:string,platform=false){
  if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
  return withTenant(tenantId,async client=>{
    if(platform)await requirePlatformInClient(actor,client);else await requireOwnerInTransaction(actor,tenantId,client);
    return state(client,tenantId);
  });
}
export async function createSubscription(actor:Actor,raw:unknown):Promise<SubscriptionState>{
  const parsed=create.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_SUBSCRIPTION','Kontrolli tellimuse alguspäeva, arve saajat ja kinnitust.');const d=parsed.data;
  return withTenant(d.tenantId,async client=>{
    await requirePlatformInClient(actor,client);
    const tenant=(await client.query('SELECT timezone,service_ends_at FROM tenants WHERE id=$1 FOR UPDATE',[d.tenantId])).rows[0];
    if(!tenant)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
    const hash=tokenHash(JSON.stringify({action:'subscription.create',...d}));
    const previous=(await client.query('SELECT payload_hash,reply FROM billing_commands WHERE tenant_id=$1 AND request_key=$2',[d.tenantId,d.requestKey])).rows[0];
    if(previous){if(previous.payload_hash!==hash)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');return previous.reply;}
    if(tenant.service_ends_at)throw new AppError(409,'EXIT_SCHEDULED','Ettevõttele on kokku lepitud teenuse lõpetamine.');
    if((await state(client,d.tenantId)).subscription)throw new AppError(409,'SUBSCRIPTION_EXISTS','Ettevõttel on juba tellimus.');
    const today=DateTime.now().setZone(tenant.timezone).toISODate();
    if(!today||d.start<today)throw new AppError(400,'INVALID_PERIOD_START','Uus tellimus ei saa alata minevikus.');
    const period=monthlyPeriod(d.start);
    await client.query(`INSERT INTO subscriptions(tenant_id,plan_id,plan_version,status,period_start,period_end,anchor_day,billing_contact_name,billing_email)
      VALUES($1,$2,$3,'pending',$4,$5,$6,$7,$8)`,[d.tenantId,STANDARD_PLAN.id,STANDARD_PLAN.version,period.start,period.end,period.anchorDay,d.billingName,d.billingEmail]);
    const reply=await state(client,d.tenantId);
    await client.query('INSERT INTO billing_commands(tenant_id,request_key,action,payload_hash,reply,actor_user_id) VALUES($1,$2,$3,$4,$5,$6)',[d.tenantId,d.requestKey,'subscription.create',hash,JSON.stringify(reply),actor.id]);
    await audit(client,d.tenantId,actor.id,'subscription.created',undefined,reply.subscription!.id,{planId:STANDARD_PLAN.id,planVersion:STANDARD_PLAN.version,periodStart:period.start,periodEnd:period.end});
    return reply;
  });
}
