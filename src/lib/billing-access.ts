import {DateTime} from 'luxon';
import type {PoolClient} from 'pg';
import type {Tenant} from './tenants';
import {STANDARD_PLAN} from './billing-rules';
import {AppError} from './errors';
export type BillingAccess={allowed:boolean;status:'pending'|'active'|'limited'|'ended'|'trial';paidThrough:string|null;reason:'missing'|'not_started'|'overdue'|'uncovered'|'ended'|'paid'|'payment_due'|'legacy';dueDate:string|null;staffLimit:number|null};

/** Read ledger facts on every decision. Stored subscription status is only a display cache. */
export async function billingAccess(client:PoolClient,tenant:Pick<Tenant,'id'|'timezone'|'service_ends_at'>,now=DateTime.now()):Promise<BillingAccess>{
 const s=(await client.query(`SELECT s.id,s.status,s.plan_id,s.contract_start::text,s.paid_through::text,s.trial_ends_at,s.ends_at,p.staff_limit
 FROM subscriptions s JOIN plan_versions p ON (p.id,p.version)=(s.plan_id,s.plan_version) WHERE s.tenant_id=$1`,[tenant.id])).rows[0];
 const base:BillingAccess={allowed:false,status:'pending',paidThrough:null,reason:'missing',dueDate:null,staffLimit:s?.staff_limit??null};if(!s)return base;
 const today=now.setZone(tenant.timezone).toISODate();if(!today)throw new AppError(409,'INVALID_TIMEZONE','Ettevõtte ajavöönd on vigane.');
 const rows=(await client.query(`SELECT i.period_start::text,i.period_end::text,i.due_date::text,i.total,
 invoice_paid_amount(i.tenant_id,i.id) AS paid
 FROM invoices i WHERE i.tenant_id=$1 AND i.subscription_id=$2 AND i.status='issued' AND i.kind='invoice' ORDER BY i.period_start,i.period_end,i.id`,[tenant.id,s.id])).rows;
 let through:string=s.contract_start;
 for(const row of rows){if(row.period_start>through)break;if(row.period_end>through&&Number(row.paid)>=row.total)through=row.period_end;}
 base.paidThrough=through>s.contract_start?through:null;
 // Historical non-standard subscriptions predate the invoice ledger. Never applies to the sold Standard plan.
 if(s.plan_id!==STANDARD_PLAN.id&&rows.length===0)base.paidThrough=s.paid_through;
 if(s.status==='ended'||[s.ends_at,tenant.service_ends_at].some(value=>value&&new Date(value).getTime()<=now.toMillis()))return {...base,status:'ended',reason:'ended'};
 if(today<s.contract_start)return {...base,reason:'not_started'};
 if(s.plan_id!==STANDARD_PLAN.id&&rows.length===0){
  const active=s.status==='active'&&s.paid_through&&s.paid_through>today,trial=s.status==='trial'&&s.trial_ends_at&&new Date(s.trial_ends_at).getTime()>now.toMillis();
  if(active||trial)return {...base,allowed:true,status:trial?'trial':'active',reason:'legacy'};
 }
 const overdue=rows.filter(row=>row.due_date<today&&Number(row.paid)<row.total).sort((a,b)=>a.due_date.localeCompare(b.due_date))[0];
 if(overdue)return {...base,status:'limited',reason:'overdue',dueDate:overdue.due_date};
 const current=rows.find(row=>row.period_start<=today&&row.period_end>today);
 if(!current)return {...base,status:rows.length?'limited':'pending',reason:'uncovered'};
 let covered:string=s.contract_start;
 for(const row of rows){if(row.period_start>covered)break;if(row.period_end>covered&&(Number(row.paid)>=row.total||row.due_date>=today))covered=row.period_end;}
 if(covered<=today)return {...base,status:'limited',reason:'uncovered'};
 const paid=Number(current.paid)>=current.total;
 return {...base,allowed:paid||current.due_date>=today,status:'active',reason:paid?'paid':'payment_due',dueDate:paid?null:current.due_date};
}
export async function refreshSubscriptionBilling(client:PoolClient,tenant:Pick<Tenant,'id'|'timezone'|'service_ends_at'>){
 const access=await billingAccess(client,tenant);
 await client.query('UPDATE subscriptions SET status=$2,paid_through=$3,version=version+1 WHERE tenant_id=$1 AND (status IS DISTINCT FROM $2 OR paid_through IS DISTINCT FROM $3::date)',[tenant.id,access.status,access.paidThrough]);
 return access;
}
export async function assertBillingForBooking(client:PoolClient,tenant:Tenant){
 // Published sample tenants and the owner's unpublished setup preview remain explicit test environments.
 if(tenant.demo)return;
 if(!(await billingAccess(client,tenant)).allowed)throw new AppError(409,'BILLING_RESTRICTED','Ettevõte ei võta praegu uusi broneeringuid vastu. Võta ettevõttega ühendust.');
}
