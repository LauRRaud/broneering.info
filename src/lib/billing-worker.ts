import {randomUUID} from 'node:crypto';
import {DateTime} from 'luxon';
import {withTenant} from './db';
import {audit} from './access';
import {monthlyPeriod,STANDARD_PLAN} from './billing-rules';
import {previewInvoiceInClient,insertInvoiceInClient} from './invoices';

/** One due period per transaction: bounded catch-up and serialization with manual issuance. */
export async function runTenantBilling(tenantId:string){
 return withTenant(tenantId,async client=>{
  const tenant=(await client.query('SELECT timezone,service_ends_at,demo FROM tenants WHERE id=$1 FOR UPDATE',[tenantId])).rows[0];
  if(!tenant||tenant.demo)return {issued:false};
  const s=(await client.query('SELECT id,status,plan_id,period_start::text,period_end::text,anchor_day,ends_at FROM subscriptions WHERE tenant_id=$1',[tenantId])).rows[0];
  if(!s||s.status==='ended'||s.plan_id!==STANDARD_PLAN.id)return {issued:false};
  const today=DateTime.now().setZone(tenant.timezone).toISODate()!;
  let start=s.period_start,end=s.period_end;
  const existing=(await client.query("SELECT id FROM invoices WHERE tenant_id=$1 AND subscription_id=$2 AND period_start=$3 AND period_end=$4 AND kind='invoice' LIMIT 1",[tenantId,s.id,start,end])).rowCount;
  // A credited period requires an explicit replacement, never an automatic new demand.
  if(existing){const next=monthlyPeriod(end,s.anchor_day);start=next.start;end=next.end;}
  if(start>today)return {issued:false};
  const endInstant=DateTime.fromISO(end,{zone:tenant.timezone}).toMillis();
  if([s.ends_at,tenant.service_ends_at].some(value=>value&&endInstant>new Date(value).getTime()))return {issued:false};
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('billing-issuer-versions',0))");
  if(start!==s.period_start)await client.query('UPDATE subscriptions SET period_start=$2,period_end=$3,version=version+1 WHERE tenant_id=$1',[tenantId,start,end]);
  const p=await previewInvoiceInClient(client,tenantId,tenant.timezone);
  const invoice=await insertInvoiceInClient(client,tenantId,randomUUID(),p);
  await audit(client,tenantId,null,'invoice.issued.automatic',undefined,invoice.id,{periodStart:start,periodEnd:end,total:p.total});
  return {issued:true};
 });
}
