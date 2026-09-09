import type { PoolClient } from 'pg';
import { pool, withTenant } from './db';
import { AppError } from './errors';

export type Actor = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  isPlatformAdmin: boolean;
};

export type Role = 'owner' | 'receptionist' | 'staff';
export type Permission =
  | 'bookings.read' | 'bookings.manage' | 'customers.read' | 'customers.manage'
  | 'occupancy.read' | 'services.manage' | 'schedules.manage' | 'schedules.own'
  | 'theme.publish' | 'company.manage' | 'members.manage' | 'billing.read' | 'export';

export type Membership = {
  tenantId: string;
  userId: string;
  role: Role;
  staffId: string | null;
  permissions: Permission[];
  active: boolean;
};

export type ListedMembership = Membership & { tenantName: string; dataAccessExpired:boolean };
export type ListedMember = Membership & {
  email: string;
  name: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
};

const ALL_PERMISSIONS: Permission[] = [
  'bookings.read','bookings.manage','customers.read','customers.manage','occupancy.read',
  'services.manage','schedules.manage','schedules.own','theme.publish','company.manage',
  'members.manage','billing.read','export',
];
const BASE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  receptionist: ['bookings.read','bookings.manage','customers.read','customers.manage','occupancy.read'],
  staff: ['bookings.read','bookings.manage'],
};
const EXPLICIT_BY_ROLE: Record<Exclude<Role,'owner'>, Permission[]> = {
  receptionist: ['services.manage','schedules.manage','theme.publish'],
  staff: ['schedules.own'],
};

export function rolePermissions(role: Role, explicit: Permission[] = []): Permission[] {
  const base = BASE_PERMISSIONS[role];
  if (!base) fail('INVALID_ROLE','Tundmatu roll.',400);
  const allowed = role === 'owner' ? [] : EXPLICIT_BY_ROLE[role];
  return [...new Set([...base, ...explicit.filter(p => allowed.includes(p))])];
}

function fail(code: string, message: string, status = 403): never { throw new AppError(status, code, message); }
function normalizeEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(value) || value.length > 320) fail('INVALID_EMAIL','E-posti aadress ei ole korrektne.',400);
  return value;
}
function assertAuthEnabled() {
  if (process.env.AUTH_DISABLED === 'true') fail('AUTH_DISABLED','Autentimine on ajutiselt keelatud.',503);
}
function mapMembership(row: any): Membership {
  const permissions = Array.isArray(row.permissions) ? row.permissions.filter((p: unknown): p is Permission => typeof p === 'string' && (ALL_PERMISSIONS as string[]).includes(p)) : [];
  return { tenantId: String(row.tenant_id), userId: String(row.user_id), role: row.role as Role, staffId: row.staff_id ?? null, permissions, active: Boolean(row.active) };
}
function assertPermission(permission?: Permission) {
  if (permission && !(ALL_PERMISSIONS as string[]).includes(permission)) fail('INVALID_PERMISSION','Tundmatu õigus.',400);
}
function assertTenantId(tenantId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) fail('INVALID_TENANT','Vigane ettevõtte tunnus.',400);
}
async function freshUser(client: PoolClient, actorId: string) {
  const result = await client.query<{ id:string; email:string; email_verified:boolean; two_factor_enabled:boolean; is_platform_admin:boolean; disabled:boolean }>(
    'SELECT id,email,email_verified,two_factor_enabled,is_platform_admin,disabled FROM auth_user WHERE id=$1', [actorId]);
  if (!result.rowCount) fail('UNAUTHENTICATED','Kasutajat ei leitud.',401);
  const user = result.rows[0];
  if (user.disabled) fail('ACCOUNT_DISABLED','Kasutajakonto on keelatud.',403);
  if (!user.email_verified) fail('EMAIL_UNVERIFIED','Kinnita enne jätkamist oma e-posti aadress.',403);
  return user;
}
async function lockTenant(client: PoolClient, tenantId: string) {
  const result = await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[tenantId]);
  if (!result.rowCount) fail('TENANT_NOT_FOUND','Ettevõtet ei leitud.',404);
}
async function audit(client: PoolClient, tenantId: string | null, actorId: string | null, action: string, targetUserId?: string, targetId?: string, metadata: Record<string, unknown> = {}) {
  await client.query('INSERT INTO access_audit_log(tenant_id,actor_user_id,action,target_user_id,target_id,metadata) VALUES($1,$2,$3,$4,$5,$6)', [tenantId,actorId,action,targetUserId ?? null,targetId ?? null,metadata]);
}
async function ownerContext(actor: Actor, tenantId: string, client: PoolClient) {
  const membership = await requireOwnerInTransaction(actor, tenantId, client);
  return membership;
}
export async function requireOwnerInTransaction(actor: Actor, tenantId: string, client: PoolClient, exitStatusOnly=false) {
  assertTenantId(tenantId);
  await lockTenant(client, tenantId);
  const membership = await requireMembershipInClient(actor, tenantId, undefined, client, exitStatusOnly);
  if (membership.role !== 'owner') fail('FORBIDDEN','Selle toimingu saab teha ainult omanik.');
  return membership;
}
export async function requireMembershipInClient(actor: Actor, tenantId: string, permission: Permission | undefined, client: PoolClient, exitStatusOnly=false): Promise<Membership> {
  assertAuthEnabled();
  assertPermission(permission);
  await client.query("SELECT set_config('app.user_id',$1,true)",[actor.id]);
  if (permission === 'bookings.read' || permission === 'bookings.manage') {
    const role = await client.query('SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2 AND active=true',[tenantId,actor.id]);
    if (role.rows[0]?.role === 'staff') fail('STAFF_SCOPE_REQUIRED','Töötaja ligipääs vajab töötaja konteksti.');
  }
  const user = await freshUser(client, actor.id);
  const result = await client.query(`SELECT tenant_id,user_id,role,staff_id,permissions,active FROM memberships WHERE tenant_id=$1 AND user_id=$2 AND active=true`,[tenantId,actor.id]);
  if (!result.rowCount) fail('MEMBERSHIP_REQUIRED','Sul ei ole selles ettevõttes aktiivset liikmesust.');
  const membership = mapMembership(result.rows[0]);
  if (membership.role !== 'owner' && membership.staffId) {
    const staff=await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2 AND active',[tenantId,membership.staffId]);
    if (!staff.rowCount) fail('STAFF_SCOPE_DENIED','Aktiivne töötajaprofiil puudub.');
  }
  if ((membership.role === 'owner' || user.is_platform_admin) && (!user.two_factor_enabled)) fail('MFA_REQUIRED','Selle konto privileegide kasutamiseks peab olema MFA.',403);
  if (permission && !rolePermissions(membership.role,membership.permissions).includes(permission)) fail('FORBIDDEN','Sul puudub selleks toiminguks õigus.');
  if(!exitStatusOnly){
    const access=await client.query('SELECT data_access_until IS NULL OR data_access_until>clock_timestamp() AS allowed FROM tenants WHERE id=$1',[tenantId]);
    if(!access.rows[0]?.allowed)fail('DATA_ACCESS_ENDED','Ettevõtte ajutine andmeligipääs on lõppenud. Võta ühendust platvormi haldajaga.',403);
  }
  return membership;
}

export async function requireMembership(actor: Actor, tenantId: string, permission?: Permission): Promise<Membership> {
  assertTenantId(tenantId);
  return withTenant(tenantId, client => requireMembershipInClient(actor,tenantId,permission,client));
}

export async function listMemberships(actor: Actor): Promise<ListedMembership[]> {
  assertAuthEnabled();
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id',$1,true)",[actor.id]);
    const user = await freshUser(client, actor.id);
    const result = await client.query(`SELECT m.tenant_id,m.user_id,m.role,m.staff_id,m.permissions,m.active,t.name AS tenant_name,COALESCE(t.data_access_until<=clock_timestamp(),false) AS data_access_expired
      FROM memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.user_id=$1 ORDER BY t.name,t.id`,[user.id]);
    const mapped=result.rows.map(row => ({...mapMembership(row),tenantName:row.tenant_name,dataAccessExpired:row.data_access_expired}));
    await client.query('COMMIT'); return mapped;
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function listMembers(actor: Actor, tenantId: string): Promise<ListedMember[]> {
  return withTenant(tenantId, async client => {
    await ownerContext(actor,tenantId,client);
    const result = await client.query(`SELECT m.tenant_id,m.user_id,m.role,m.staff_id,m.permissions,m.active,
      u.email,u.name,u.email_verified,u.two_factor_enabled FROM memberships m JOIN auth_user u ON u.id=m.user_id
      WHERE m.tenant_id=$1 ORDER BY u.name,u.email,m.user_id`,[tenantId]);
    return result.rows.map(row => ({...mapMembership(row),email:row.email,name:row.name,emailVerified:Boolean(row.email_verified),twoFactorEnabled:Boolean(row.two_factor_enabled)}));
  });
}

export async function listStaffForMembership(actor: Actor, tenantId: string): Promise<Array<{id:string;name:string}>> {
  return withTenant(tenantId, async client => {
    await ownerContext(actor,tenantId,client);
    const result=await client.query('SELECT id,name FROM staff WHERE tenant_id=$1 AND active ORDER BY name,id',[tenantId]);
    return result.rows;
  });
}

function validateExplicit(role: Exclude<Role,'owner'>, permissions: Permission[]) {
  const allowed = EXPLICIT_BY_ROLE[role];
  if (permissions.some(p => !allowed.includes(p))) fail('INVALID_PERMISSION','Selle rolli jaoks ei saa seda õigust anda.',400);
  return [...new Set(permissions)];
}

export async function updateMemberPermissions(actor: Actor, input: { tenantId:string; userId:string; permissions:Permission[] }): Promise<Membership> {
  return withTenant(input.tenantId, async client => {
    await ownerContext(actor,input.tenantId,client);
    const existing = await client.query('SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2 FOR UPDATE',[input.tenantId,input.userId]);
    if (!existing.rowCount) fail('MEMBER_NOT_FOUND','Liiget ei leitud.',404);
    const role = existing.rows[0].role as Role;
    if (role === 'owner') fail('OWNER_PROTECTED','Omaniku õigusi muuda omandi üleandmisega.');
    const permissions = validateExplicit(role,input.permissions);
    const updated = await client.query(`UPDATE memberships SET permissions=$3,updated_at=now() WHERE tenant_id=$1 AND user_id=$2
      RETURNING tenant_id,user_id,role,staff_id,permissions,active`,[input.tenantId,input.userId,JSON.stringify(permissions)]);
    await audit(client,input.tenantId,actor.id,'member.permissions.updated',input.userId,undefined,{permissions});
    return mapMembership(updated.rows[0]);
  });
}

export async function changeMemberRole(actor: Actor, input: { tenantId:string; userId:string; role:Exclude<Role,'owner'>; staffId?:string|null }): Promise<Membership> {
  return withTenant(input.tenantId, async client => {
    await ownerContext(actor,input.tenantId,client);
    if (input.staffId) {
      const staff = await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2 AND active FOR SHARE',[input.tenantId,input.staffId]);
      if (!staff.rowCount) fail('STAFF_NOT_FOUND','Töötajat ei leitud.',404);
    }
    const existing = await client.query('SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2 FOR UPDATE',[input.tenantId,input.userId]);
    if (!existing.rowCount) fail('MEMBER_NOT_FOUND','Liiget ei leitud.',404);
    if (existing.rows[0].role === 'owner') fail('OWNER_PROTECTED','Omanikku saab vahetada ainult omandi üleandmisega.');
    const result = await client.query(`UPDATE memberships SET role=$3,staff_id=$4,permissions='[]'::jsonb,updated_at=now()
      WHERE tenant_id=$1 AND user_id=$2 RETURNING tenant_id,user_id,role,staff_id,permissions,active`,[input.tenantId,input.userId,input.role,input.staffId ?? null]);
    await audit(client,input.tenantId,actor.id,'member.role.updated',input.userId,undefined,{role:input.role,staffLinked:Boolean(input.staffId)});
    return mapMembership(result.rows[0]);
  });
}

/** Resource-scoped authorization for booking and schedule reads/writes. */
export async function requireStaffPermission(actor: Actor, tenantId: string, permission: Permission, targetStaffId: string): Promise<Membership> {
  assertTenantId(tenantId);
  return withTenant(tenantId,async client=>{
    await lockTenant(client,tenantId);
    const membership=await requireMembershipInClient(actor,tenantId,undefined,client);
    const staff=await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2 AND active',[tenantId,targetStaffId]);
    if (!staff.rowCount) fail('STAFF_NOT_FOUND','Töötajat ei leitud.',404);
    if (membership.role === 'staff' && (membership.staffId !== targetStaffId || !membership.staffId)) fail('STAFF_SCOPE_DENIED','Töötaja pääseb ligi ainult enda töödele.');
    if (!rolePermissions(membership.role,membership.permissions).includes(permission)) fail('FORBIDDEN','Sul puudub selleks toiminguks õigus.');
    return membership;
  });
}

export async function revokeMember(actor: Actor, tenantId: string, userId: string): Promise<void> {
  await withTenant(tenantId, async client => {
    await ownerContext(actor,tenantId,client);
    const target = await client.query('SELECT role,active FROM memberships WHERE tenant_id=$1 AND user_id=$2 FOR UPDATE',[tenantId,userId]);
    if (!target.rowCount) fail('MEMBER_NOT_FOUND','Liiget ei leitud.',404);
    if (target.rows[0].role === 'owner') {
      const owners = await client.query("SELECT count(*)::int AS count FROM memberships WHERE tenant_id=$1 AND role='owner' AND active",[tenantId]);
      if (owners.rows[0].count <= 1) fail('LAST_OWNER','Viimast omanikku ei saa eemaldada.');
    }
    await client.query('UPDATE memberships SET active=false,updated_at=now() WHERE tenant_id=$1 AND user_id=$2',[tenantId,userId]);
    await client.query('DELETE FROM auth_session WHERE user_id=$1',[userId]);
    await audit(client,tenantId,actor.id,'member.revoked',userId);
  });
}

export async function transferOwnership(actor: Actor, tenantId: string, newOwnerUserId: string): Promise<void> {
  await withTenant(tenantId, async client => {
    const current = await ownerContext(actor,tenantId,client);
    if (newOwnerUserId === actor.id) fail('INVALID_TRANSFER','Uus omanik peab olema teine aktiivne liige.',400);
    const target = await client.query(`SELECT m.role,m.active,u.email_verified,u.two_factor_enabled,u.disabled FROM memberships m JOIN auth_user u ON u.id=m.user_id
      WHERE m.tenant_id=$1 AND m.user_id=$2 FOR UPDATE`,[tenantId,newOwnerUserId]);
    if (!target.rowCount || !target.rows[0].active) fail('MEMBER_NOT_FOUND','Uut omanikku ei leitud.',404);
    if (target.rows[0].disabled || !target.rows[0].email_verified || !target.rows[0].two_factor_enabled) fail('OWNER_REQUIREMENTS','Uuel omanikul peab olema aktiivne konto, kinnitatud e-post ja MFA.',403);
    if (target.rows[0].role === 'owner') fail('INVALID_TRANSFER','Liige on juba omanik.',400);
    await client.query(`UPDATE memberships SET role='receptionist',permissions='[]'::jsonb,updated_at=now() WHERE tenant_id=$1 AND user_id=$2`,[tenantId,actor.id]);
    await client.query(`UPDATE memberships SET role='owner',permissions='[]'::jsonb,updated_at=now() WHERE tenant_id=$1 AND user_id=$2`,[tenantId,newOwnerUserId]);
    await client.query('DELETE FROM auth_session WHERE user_id = ANY($1::text[])',[[actor.id,newOwnerUserId]]);
    await audit(client,tenantId,actor.id,'ownership.transferred',newOwnerUserId,undefined,{fromRole:current.role});
  });
}

export async function requirePlatformInClient(actor:Actor,client:PoolClient) {
  assertAuthEnabled();
  await client.query("SELECT set_config('app.user_id',$1,true)",[actor.id]);
  const user=await freshUser(client,actor.id);
  if(!user.is_platform_admin || !user.two_factor_enabled) fail('PLATFORM_MFA_REQUIRED','Platvormihalduri kontol peab olema MFA.');
  return user;
}

export async function listPlatformTenants(actor: Actor): Promise<Array<{id:string;slug:string;name:string;active:boolean;demo:boolean}>> {
  assertAuthEnabled();
  const client = await pool().connect();
  try {
    const user = await freshUser(client,actor.id);
    if (!user.is_platform_admin || !user.two_factor_enabled) fail('PLATFORM_MFA_REQUIRED','Platvormihalduri kontol peab olema MFA.');
    const result = await client.query('SELECT id,slug,name,active,demo FROM tenants ORDER BY name,id');
    return result.rows;
  } finally { client.release(); }
}

export type SupportGrant = { id:string; tenantId:string; scope:'read_only'; reason:string; expiresAt:string; revokedAt:string|null };
export async function listSupportGrants(actor:Actor):Promise<SupportGrant[]>{
  const client=await pool().connect();
  try{
    await client.query('BEGIN');
    await requirePlatformInClient(actor,client);
    const rows=await client.query(`SELECT id,tenant_id,reason,expires_at FROM support_grants
      WHERE platform_user_id=$1 AND scope='read_only' AND revoked_at IS NULL AND expires_at>clock_timestamp()
      ORDER BY expires_at DESC,id`,[actor.id]);
    await client.query('COMMIT');
    return rows.rows.map(row=>({id:row.id,tenantId:row.tenant_id,scope:'read_only',reason:row.reason,expiresAt:new Date(row.expires_at).toISOString(),revokedAt:null}));
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
/** Caller holds the transaction through the read and audit. Revocation uses the same row lock. */
export async function requireSupportGrantInClient(actor: Actor, grantId: string, tenantId: string, client: PoolClient): Promise<SupportGrant> {
  await requirePlatformInClient(actor,client);
  const found=await client.query(`SELECT id,tenant_id,reason,expires_at FROM support_grants
    WHERE id=$1 AND tenant_id=$2 AND platform_user_id=$3 AND scope='read_only'
      AND revoked_at IS NULL AND expires_at>clock_timestamp() FOR UPDATE`,[grantId,tenantId,actor.id]);
  if(!found.rowCount) fail('GRANT_NOT_FOUND','Aktiivset tugijuurdepääsu ei leitud.',404);
  const row=found.rows[0];
  return {id:row.id,tenantId:row.tenant_id,scope:'read_only',reason:row.reason,expiresAt:new Date(row.expires_at).toISOString(),revokedAt:null};
}
export async function createSupportGrant(actor: Actor, tenantId: string, reason: string): Promise<SupportGrant> {
  assertAuthEnabled();
  const cleanReason = reason.trim(); if (!cleanReason || cleanReason.length > 500) fail('INVALID_REASON','Toe põhjendus on vajalik.',400);
  return withTenant(tenantId,async client=>{
    const user = await freshUser(client,actor.id);
    await client.query("SELECT set_config('app.user_id',$1,true)",[actor.id]);
    if (!user.is_platform_admin || !user.two_factor_enabled) fail('PLATFORM_MFA_REQUIRED','Platvormihalduri kontol peab olema MFA.');
    await lockTenant(client,tenantId);
    const result = await client.query(`INSERT INTO support_grants(tenant_id,platform_user_id,reason,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes')
      RETURNING id,tenant_id,scope,reason,expires_at,revoked_at`,[tenantId,actor.id,cleanReason]);
    await audit(client,tenantId,actor.id,'support.grant.created',undefined,result.rows[0].id,{scope:'read_only'});
    return {id:result.rows[0].id,tenantId:result.rows[0].tenant_id,scope:'read_only',reason:result.rows[0].reason,expiresAt:new Date(result.rows[0].expires_at).toISOString(),revokedAt:null};
  });
}

export async function revokeSupportGrant(actor: Actor, grantId: string): Promise<void> {
  assertAuthEnabled(); const client = await pool().connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.user_id',$1,true)",[actor.id]); const user=await freshUser(client,actor.id); if (!user.is_platform_admin || !user.two_factor_enabled) fail('PLATFORM_MFA_REQUIRED','Platvormihalduri kontol peab olema MFA.');
    const grant=await client.query('SELECT id,tenant_id,platform_user_id FROM support_grants WHERE id=$1',[grantId]);
    if (!grant.rowCount || grant.rows[0].platform_user_id !== actor.id) fail('GRANT_NOT_FOUND','Tugijuurdepääsu ei leitud.',404);
    await client.query("SELECT set_config('app.tenant_id',$1,true)",[grant.rows[0].tenant_id]);
    const result=await client.query('UPDATE support_grants SET revoked_at=now() WHERE id=$1 AND platform_user_id=$2 AND revoked_at IS NULL RETURNING tenant_id',[grantId,actor.id]);
    if (!result.rowCount) fail('GRANT_NOT_FOUND','Aktiivset tugijuurdepääsu ei leitud.',404); await audit(client,result.rows[0].tenant_id,actor.id,'support.grant.revoked',undefined,grantId); await client.query('COMMIT');
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}

/** Validate a live support grant before a narrowly scoped read and record its use. */
export async function authorizeSupportGrant(actor: Actor, grantId: string): Promise<SupportGrant> {
  assertAuthEnabled(); const client=await pool().connect();
  try { await client.query('BEGIN'); await client.query("SELECT set_config('app.user_id',$1,true)",[actor.id]);
    const user=await freshUser(client,actor.id);
    if (!user.is_platform_admin || !user.two_factor_enabled) fail('PLATFORM_MFA_REQUIRED','Platvormihalduri kontol peab olema MFA.');
    const found=await client.query(`SELECT id,tenant_id,platform_user_id,scope,reason,expires_at,revoked_at FROM support_grants
      WHERE id=$1 AND platform_user_id=$2 AND scope='read_only' AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`,[grantId,actor.id]);
    if (!found.rowCount) fail('GRANT_NOT_FOUND','Aktiivset tugijuurdepääsu ei leitud.',404);
    const row=found.rows[0]; await client.query("SELECT set_config('app.tenant_id',$1,true)",[row.tenant_id]);
    await audit(client,row.tenant_id,actor.id,'support.grant.used',undefined,grantId,{scope:'read_only'}); await client.query('COMMIT');
    return {id:row.id,tenantId:row.tenant_id,scope:'read_only',reason:row.reason,expiresAt:new Date(row.expires_at).toISOString(),revokedAt:null};
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}

export { ALL_PERMISSIONS, BASE_PERMISSIONS, normalizeEmail, audit };
