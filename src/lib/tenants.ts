import { pool,withTenant } from './db';
import { AppError } from './errors';
import {billingAccess} from './billing-access';

export type Tenant = {
  booking_stops_at?:Date|null;
  service_ends_at?:Date|null;
  data_access_until?:Date|null;
  booking_terms?:string;
  public_state?:'draft'|'published'|'paused'|'closed';
  id: string; slug: string; name: string; address: string; description: string; timezone: string;
  lead_minutes: number; window_days: number; step_minutes: number; cancellation_hours: number; rules_version:number; active: boolean; demo: boolean;
  default_language:'et'|'en'|'ru';contact_email:string;contact_phone:string;management_link_hours:number|null;management_policy_version:number;
};

export function assertPublicBooking(tenant:Tenant){
  if(tenant.public_state!=='published'||(tenant.booking_stops_at&&tenant.booking_stops_at.getTime()<=Date.now()))throw new AppError(404,'TENANT_NOT_FOUND','Ettevõte ei võta praegu broneeringuid vastu.');
}

export function hostnameFromHost(host: string) {
  // Host is an exact routing input, never a client-supplied tenant ID or X-Forwarded-Host.
  const match = /^([a-zA-Z0-9.-]+)(?::([0-9]{1,5}))?$/.exec(host);
  if (!match || (match[2] && Number(match[2]) > 65535)) throw new AppError(400,'INVALID_HOST','Vigane veebiaadress.');
  return match[1].toLowerCase().replace(/\.$/, '');
}

export async function tenantForHost(host: string,purpose:'booking'|'existing'='booking'): Promise<Tenant> {
  const hostname = hostnameFromHost(host);
  const result = await pool().query<Tenant>("SELECT t.* FROM tenants t JOIN tenant_domains d ON d.tenant_id=t.id WHERE d.hostname=$1 AND d.ready=true AND t.active=true AND (t.public_state='published' OR ($2='existing' AND t.public_state IN('paused','closed')))",[hostname,purpose]);
  if (!result.rowCount) throw new AppError(404,'TENANT_NOT_FOUND','Sellel aadressil broneerimislehte ei ole.');
  const tenant=result.rows[0];
  if(tenant.booking_stops_at&&tenant.booking_stops_at.getTime()<=Date.now()){
    if(purpose==='booking')throw new AppError(404,'TENANT_NOT_FOUND','Ettevõte ei võta praegu broneeringuid vastu.');
    tenant.public_state='closed';
  }
  if(!tenant.demo&&!(await withTenant(tenant.id,client=>billingAccess(client,tenant))).allowed){
    if(purpose==='booking')throw new AppError(404,'TENANT_NOT_FOUND','Ettevõte ei võta praegu broneeringuid vastu.');
    if(tenant.public_state==='published')tenant.public_state='paused';
  }
  return tenant;
}
