import { createHash, randomBytes } from 'node:crypto';
import { pool, withTenant } from './db';
import { AppError } from './errors';
import { type Actor, type Membership, type Permission, type Role, audit, normalizeEmail, requireOwnerInTransaction } from './access';

export type InvitationInput = {
  tenantId: string;
  email: string;
  role: Exclude<Role,'owner'>;
  staffId?: string | null;
  permissions?: Permission[];
};
export type InvitationResult = { token: string; id: string; email: string; expiresAt: string };
export type ListedInvitation = {
  id: string; tenantId: string; email: string; role: Exclude<Role,'owner'>; staffId: string | null;
  permissions: Permission[]; expiresAt: string; acceptedAt: string | null; cancelledAt: string | null; createdAt: string;
};

function fail(code: string, message: string, status = 403): never { throw new AppError(status,code,message); }
function hashToken(token: string) { return createHash('sha256').update(token,'utf8').digest('hex'); }
function dateString(value: Date | string | null): string | null { return value == null ? null : new Date(value).toISOString(); }
function invitationPermissions(role: Exclude<Role,'owner'>, permissions: Permission[] = []) {
  const allowed: Record<Exclude<Role,'owner'>, Permission[]> = { receptionist:['services.manage','schedules.manage','theme.publish'], staff:['schedules.own'] };
  const unique=[...new Set(permissions)];
  if (unique.some(p => !allowed[role].includes(p))) fail('INVALID_PERMISSION','Selle rolli jaoks ei saa seda õigust anda.',400);
  return unique;
}

export async function inviteMember(actor: Actor, input: InvitationInput): Promise<InvitationResult> {
  const email=normalizeEmail(input.email);
  if (input.role !== 'receptionist' && input.role !== 'staff') fail('INVALID_ROLE','Seda rolli ei saa kutsuda.',400);
  const permissions=invitationPermissions(input.role,input.permissions);
  const token=randomBytes(32).toString('base64url'); const tokenHash=hashToken(token);
  return withTenant(input.tenantId,async client=>{
    await requireOwnerInTransaction(actor,input.tenantId,client);
    const expired=await client.query(`UPDATE invitations SET cancelled_at=now() WHERE tenant_id=$1
      AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at<=now() RETURNING id`,[input.tenantId]);
    for (const row of expired.rows) await audit(client,input.tenantId,actor.id,'member.invitation.expired',undefined,row.id);
    if (input.staffId) {
      const staff=await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2 AND active FOR SHARE',[input.tenantId,input.staffId]);
      if (!staff.rowCount) fail('STAFF_NOT_FOUND','Töötajat ei leitud.',404);
    }
    const existing=await client.query(`SELECT m.active FROM memberships m JOIN auth_user u ON u.id=m.user_id WHERE m.tenant_id=$1 AND lower(u.email)=$2`,[input.tenantId,email]);
    if (existing.rowCount && existing.rows.some(r=>r.active)) fail('ALREADY_MEMBER','See e-post on juba liige.',409);
    try {
      const result=await client.query(`INSERT INTO invitations(tenant_id,invited_by,email,role,staff_id,permissions,token_hash,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '48 hours') RETURNING id,email,expires_at`,[input.tenantId,actor.id,email,input.role,input.staffId??null,JSON.stringify(permissions),tokenHash]);
      await audit(client,input.tenantId,actor.id,'member.invited',undefined,result.rows[0].id,{role:input.role,staffLinked:Boolean(input.staffId)});
      return {token,id:result.rows[0].id,email:result.rows[0].email,expiresAt:new Date(result.rows[0].expires_at).toISOString()};
    } catch(error:any) {
      if (error?.code === '23505') fail('INVITATION_PENDING','Sellele e-postile on juba aktiivne kutse.',409);
      throw error;
    }
  });
}

export async function listInvitations(actor: Actor, tenantId: string): Promise<ListedInvitation[]> {
  return withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    const result=await client.query(`SELECT id,tenant_id,email,role,staff_id,permissions,expires_at,accepted_at,cancelled_at,created_at
      FROM invitations WHERE tenant_id=$1 ORDER BY created_at DESC,id`,[tenantId]);
    return result.rows.map(row=>({id:row.id,tenantId:row.tenant_id,email:row.email,role:row.role,staffId:row.staff_id??null,
      permissions:Array.isArray(row.permissions)?row.permissions:[],expiresAt:dateString(row.expires_at)!,acceptedAt:dateString(row.accepted_at),cancelledAt:dateString(row.cancelled_at),createdAt:dateString(row.created_at)!}));
  });
}

export async function cancelInvitation(actor: Actor, tenantId: string, invitationId: string): Promise<void> {
  await withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    const result=await client.query(`UPDATE invitations SET cancelled_at=now() WHERE tenant_id=$1 AND id=$2 AND accepted_at IS NULL AND cancelled_at IS NULL RETURNING id`,[tenantId,invitationId]);
    if (!result.rowCount) fail('INVITATION_NOT_FOUND','Aktiivset kutset ei leitud.',404); await audit(client,tenantId,actor.id,'member.invitation.cancelled',undefined,invitationId); });
}

export async function validateInvitationForSignup(token: string, email: string): Promise<boolean> {
  if (!token || token.length < 30) return false;
  let normalized: string;
  try { normalized=normalizeEmail(email); } catch { return false; }
  const client=await pool().connect();
  try { await client.query('BEGIN'); const tokenHash=hashToken(token);
    await client.query("SELECT set_config('app.invitation_hash',$1,true)",[tokenHash]);
    const result=await client.query(`SELECT 1 FROM invitations WHERE token_hash=$1 AND email=$2
      AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at>now()`,[tokenHash,normalized]);
    await client.query('COMMIT'); return Boolean(result.rowCount);
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}

export async function acceptInvitation(actor: Actor, token: string): Promise<Membership> {
  if (!token || token.length < 30) fail('INVALID_INVITATION','Kutse ei kehti.',400);
  const client=await pool().connect();
  try { await client.query('BEGIN');
    const user=await client.query<{id:string;email:string;email_verified:boolean;disabled:boolean;two_factor_enabled:boolean;is_platform_admin:boolean}>('SELECT id,email,email_verified,disabled,two_factor_enabled,is_platform_admin FROM auth_user WHERE id=$1',[actor.id]);
    if (!user.rowCount) fail('UNAUTHENTICATED','Kasutajat ei leitud.',401);
    if (user.rows[0].disabled) fail('ACCOUNT_DISABLED','Kasutajakonto on keelatud.',403);
    if (!user.rows[0].email_verified) fail('EMAIL_UNVERIFIED','Kinnita enne kutse vastuvõtmist oma e-post.');
    if (user.rows[0].is_platform_admin && !user.rows[0].two_factor_enabled) fail('MFA_REQUIRED','Platvormihalduri kontol peab olema MFA.',403);
    await client.query("SELECT set_config('app.user_id',$1,true)",[actor.id]);
    await client.query("SELECT set_config('app.invitation_hash',$1,true)",[hashToken(token)]);
    const invitationLookup=await client.query(`SELECT id,tenant_id FROM invitations WHERE token_hash=$1
      AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at>now()`,[hashToken(token)]);
    if (!invitationLookup.rowCount) fail('INVALID_INVITATION','Kutse on aegunud, tühistatud või juba kasutatud.',400);
    const tenant=await client.query('SELECT id FROM tenants WHERE id=$1 AND active FOR UPDATE',[invitationLookup.rows[0].tenant_id]);
    if (!tenant.rowCount) fail('TENANT_NOT_FOUND','Ettevõte ei ole aktiivne.',404);
    await client.query("SELECT set_config('app.tenant_id',$1,true)",[invitationLookup.rows[0].tenant_id]);
    const invitationResult=await client.query(`SELECT id,tenant_id,email,role,staff_id,permissions,expires_at FROM invitations WHERE id=$1
      AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at>now() FOR UPDATE`,[invitationLookup.rows[0].id]);
    if (!invitationResult.rowCount) fail('INVALID_INVITATION','Kutse on aegunud, tühistatud või juba kasutatud.',400);
    const invitation=invitationResult.rows[0];
    if (normalizeEmail(user.rows[0].email) !== invitation.email) fail('INVITATION_EMAIL_MISMATCH','Kutse on seotud teise e-posti aadressiga.',403);
    if (invitation.staff_id) {
      const staff=await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2 AND active FOR SHARE',[invitation.tenant_id,invitation.staff_id]);
      if (!staff.rowCount) fail('STAFF_NOT_FOUND','Töötajat ei leitud.',404);
    }
    if (invitation.role === 'owner') {
      const owners=await client.query("SELECT 1 FROM memberships WHERE tenant_id=$1 AND role='owner' AND active LIMIT 1",[invitation.tenant_id]);
      if (owners.rowCount) fail('OWNER_ALREADY_EXISTS','Ettevõttel on juba aktiivne omanik.',409);
    }
    const existing=await client.query('SELECT active FROM memberships WHERE tenant_id=$1 AND user_id=$2 FOR UPDATE',[invitation.tenant_id,actor.id]);
    if (existing.rowCount && existing.rows[0].active) fail('ALREADY_MEMBER','Oled selles ettevõttes juba liige.',409);
    const result=await client.query(`INSERT INTO memberships(tenant_id,user_id,role,staff_id,permissions,active,updated_at) VALUES($1,$2,$3,$4,$5,true,now())
      ON CONFLICT(tenant_id,user_id) DO UPDATE SET role=EXCLUDED.role,staff_id=EXCLUDED.staff_id,permissions=EXCLUDED.permissions,active=true,updated_at=now()
      RETURNING tenant_id,user_id,role,staff_id,permissions,active`,[invitation.tenant_id,actor.id,invitation.role,invitation.staff_id,JSON.stringify(invitation.permissions)]);
    await client.query('UPDATE invitations SET accepted_at=now() WHERE id=$1 AND accepted_at IS NULL AND cancelled_at IS NULL',[invitation.id]);
    await audit(client,invitation.tenant_id,actor.id,'member.invitation.accepted',actor.id,invitation.id,{role:invitation.role}); await client.query('COMMIT');
    const row=result.rows[0]; return {tenantId:row.tenant_id,userId:row.user_id,role:row.role,staffId:row.staff_id??null,permissions:Array.isArray(row.permissions)?row.permissions:[],active:Boolean(row.active)};
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}

export { hashToken };
