import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { rolePermissions, requireStaffPermission, requireMembership, revokeMember, transferOwnership, createSupportGrant, authorizeSupportGrant, revokeSupportGrant, updateMemberPermissions, type Actor } from '../src/lib/access';
import { acceptInvitation, cancelInvitation, inviteMember, validateInvitationForSignup } from '../src/lib/invitations';
import { pool } from '../src/lib/db';

const integration = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);

describe('access permission matrix', () => {
  it('gives owners the complete matrix', () => {
    expect(rolePermissions('owner')).toEqual(expect.arrayContaining([
      'company.manage','members.manage','billing.read','export','services.manage','schedules.manage',
    ]));
  });
  it('keeps receptionist elevated access explicit', () => {
    const permissions=rolePermissions('receptionist');
    expect(permissions).toContain('bookings.manage');
    expect(permissions).not.toContain('company.manage');
    expect(rolePermissions('receptionist',['services.manage'])).toContain('services.manage');
  });
  it('keeps staff permissions scoped to explicit schedule access', () => {
    expect(rolePermissions('staff')).toEqual(expect.arrayContaining(['bookings.read','bookings.manage']));
    expect(rolePermissions('staff')).not.toContain('schedules.own');
    expect(rolePermissions('staff',['schedules.own'])).toContain('schedules.own');
    expect(rolePermissions('staff',['company.manage'] as never)).not.toContain('company.manage');
  });
});

describe.skipIf(!integration)('access database invariants', () => {
  const tenantId=randomUUID(), ownerId=randomUUID(), staffUserId=randomUUID(), inviteeId=randomUUID(), staffId=randomUUID(), otherStaffId=randomUUID();
  const owner:Actor={id:ownerId,email:'access-owner@example.invalid',name:'Owner',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
  const staff:Actor={id:staffUserId,email:'access-staff@example.invalid',name:'Staff',emailVerified:true,twoFactorEnabled:false,isPlatformAdmin:false};
  const invitee:Actor={id:inviteeId,email:'access-invitee@example.invalid',name:'Invitee',emailVerified:true,twoFactorEnabled:false,isPlatformAdmin:false};
  let admin:pg.Client;
  it('enforces own staff scope and rejects another staff profile', async () => {
    await expect(requireStaffPermission(staff,tenantId,'bookings.read',staffId)).resolves.toMatchObject({userId:staffUserId});
    await expect(requireStaffPermission(staff,tenantId,'bookings.read',otherStaffId)).rejects.toMatchObject({code:'STAFF_SCOPE_DENIED'});
  });
  it('consumes invitations once and preserves the last owner', async () => {
    const invitation=await inviteMember(owner,{tenantId,email:invitee.email,role:'staff',staffId:staffId});
    await expect(validateInvitationForSignup(invitation.token,invitee.email)).resolves.toBe(true);
    await expect(acceptInvitation(invitee,invitation.token)).resolves.toMatchObject({userId:inviteeId,role:'staff'});
    await expect(acceptInvitation(invitee,invitation.token)).rejects.toMatchObject({code:'INVALID_INVITATION'});
    await expect(revokeMember(owner,tenantId,ownerId)).rejects.toMatchObject({code:'LAST_OWNER'});
  });
  it('rejects a foreign tenant, a disabled account, and an elevated staff permission',async()=>{
    await expect(requireMembership(staff,randomUUID())).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
    await expect(updateMemberPermissions(owner,{tenantId,userId:staffUserId,permissions:['company.manage']})).rejects.toMatchObject({code:'INVALID_PERMISSION'});
    await admin.query('UPDATE auth_user SET disabled=true WHERE id=$1',[staffUserId]);
    await expect(requireMembership(staff,tenantId)).rejects.toMatchObject({code:'ACCOUNT_DISABLED'});
    await admin.query('UPDATE auth_user SET disabled=false WHERE id=$1',[staffUserId]);
  });
  it('isolates raw access rows without context and makes audit append-only',async()=>{
    expect((await pool().query('SELECT tenant_id FROM memberships WHERE tenant_id=$1',[tenantId])).rowCount).toBe(0);
    expect((await pool().query('SELECT id FROM invitations WHERE tenant_id=$1',[tenantId])).rowCount).toBe(0);
    await expect(pool().query('DELETE FROM access_audit_log WHERE tenant_id=$1',[tenantId])).rejects.toMatchObject({code:'42501'});
  });
  it('rejects expired/cancelled invitations and permits replacing an expired one',async()=>{
    const email=`expired-${tenantId}@example.invalid`;
    const original=await inviteMember(owner,{tenantId,email,role:'receptionist'});
    await expect(validateInvitationForSignup(original.token,'wrong@example.invalid')).resolves.toBe(false);
    await admin.query("UPDATE invitations SET expires_at=now()-interval '1 minute' WHERE id=$1",[original.id]);
    await expect(validateInvitationForSignup(original.token,email)).resolves.toBe(false);
    const replacement=await inviteMember(owner,{tenantId,email,role:'receptionist'});
    await cancelInvitation(owner,tenantId,replacement.id);
    await expect(validateInvitationForSignup(replacement.token,email)).resolves.toBe(false);
  });
  it('binds support to a platform actor and enforces expiry and revocation',async()=>{
    await expect(createSupportGrant(owner,tenantId,'Kontrollin kasutaja teavitatud tõrget')).rejects.toMatchObject({code:'PLATFORM_MFA_REQUIRED'});
    await admin.query('UPDATE auth_user SET is_platform_admin=true WHERE id=$1',[ownerId]);
    const grant=await createSupportGrant(owner,tenantId,'Kontrollin kasutaja teavitatud tõrget');
    expect(Date.parse(grant.expiresAt)-Date.now()).toBeLessThanOrEqual(30*60*1000);
    await expect(authorizeSupportGrant(staff,grant.id)).rejects.toMatchObject({code:'PLATFORM_MFA_REQUIRED'});
    await expect(authorizeSupportGrant(owner,grant.id)).resolves.toMatchObject({scope:'read_only'});
    await admin.query("UPDATE support_grants SET expires_at=now()-interval '1 minute' WHERE id=$1",[grant.id]);
    await expect(authorizeSupportGrant(owner,grant.id)).rejects.toMatchObject({code:'GRANT_NOT_FOUND'});
    const second=await createSupportGrant(owner,tenantId,'Kontrollin kasutaja teavitatud tõrget');
    await revokeSupportGrant(owner,second.id);
    await expect(authorizeSupportGrant(owner,second.id)).rejects.toMatchObject({code:'GRANT_NOT_FOUND'});
    await admin.query('UPDATE auth_user SET is_platform_admin=false WHERE id=$1',[ownerId]);
  });
  it('revokes membership and all sessions immediately',async()=>{
    await admin.query("INSERT INTO auth_session(id,token,user_id,expires_at,updated_at) VALUES($1,$2,$3,now()+interval '1 hour',now())",[randomUUID(),randomUUID(),staffUserId]);
    await revokeMember(owner,tenantId,staffUserId);
    await expect(requireMembership(staff,tenantId)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
    expect((await admin.query('SELECT id FROM auth_session WHERE user_id=$1',[staffUserId])).rowCount).toBe(0);
  });
  it('serializes concurrent owner transfers and never leaves the tenant ownerless',async()=>{
    await expect(transferOwnership(owner,tenantId,inviteeId)).rejects.toMatchObject({code:'OWNER_REQUIREMENTS'});
    await admin.query('UPDATE auth_user SET two_factor_enabled=true WHERE id=$1',[inviteeId]);
    const result=await Promise.allSettled([transferOwnership(owner,tenantId,inviteeId),transferOwnership(owner,tenantId,inviteeId)]);
    expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await admin.query("SELECT user_id FROM memberships WHERE tenant_id=$1 AND role='owner' AND active",[tenantId])).rows).toEqual([{user_id:inviteeId}]);
  });
  beforeAll(async () => {
    admin=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL}); await admin.connect();
    await admin.query('INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,$3,$4)',[tenantId,`access-${tenantId.slice(0,8)}`,'Access test','Test']);
    await admin.query("INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,'Owner',$2,true,true),($3,'Staff',$4,true,false),($5,'Invitee',$6,true,false)",[ownerId,owner.email,staffUserId,staff.email,inviteeId,invitee.email]);
    await admin.query('INSERT INTO staff(id,tenant_id,name) VALUES($1,$2,$3),($4,$2,$5)',[staffId,tenantId,'Staff',otherStaffId,'Other']);
    await admin.query("INSERT INTO memberships(tenant_id,user_id,role,staff_id) VALUES($1,$2,'owner',$3),($1,$4,'staff',$3)",[tenantId,ownerId,staffId,staffUserId]);
  });
  afterAll(async () => {
    for(const table of ['invitations','memberships','access_audit_log','support_grants']) await admin.query(`DELETE FROM ${table} WHERE tenant_id=$1`,[tenantId]);
    await admin.query('DELETE FROM staff WHERE tenant_id=$1',[tenantId]); await admin.query('DELETE FROM tenants WHERE id=$1',[tenantId]);
    await admin.query('DELETE FROM auth_user WHERE id = ANY($1::text[])',[[ownerId,staffUserId,inviteeId]]); await admin.end();
  });
});
