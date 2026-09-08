import { pool } from './db';
import { AppError } from './errors';

export type Tenant = {
  id: string; slug: string; name: string; address: string; description: string; timezone: string;
  lead_minutes: number; window_days: number; step_minutes: number; cancellation_hours: number; rules_version:number; active: boolean; demo: boolean;
  contact_email:string;contact_phone:string;management_link_hours:number|null;management_policy_version:number;
};

export function hostnameFromHost(host: string) {
  // Host is an exact routing input, never a client-supplied tenant ID or X-Forwarded-Host.
  const match = /^([a-zA-Z0-9.-]+)(?::([0-9]{1,5}))?$/.exec(host);
  if (!match || (match[2] && Number(match[2]) > 65535)) throw new AppError(400,'INVALID_HOST','Vigane veebiaadress.');
  return match[1].toLowerCase().replace(/\.$/, '');
}

export async function tenantForHost(host: string): Promise<Tenant> {
  const hostname = hostnameFromHost(host);
  const result = await pool().query<Tenant>('SELECT t.* FROM tenants t JOIN tenant_domains d ON d.tenant_id=t.id WHERE d.hostname=$1 AND d.ready=true AND t.active=true',[hostname]);
  if (!result.rowCount) throw new AppError(404,'TENANT_NOT_FOUND','Sellel aadressil broneerimislehte ei ole.');
  return result.rows[0];
}
