import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {provisionCompany,ownerInvitationState,renewOwnerInvitation} from '../src/lib/company-provisioning';
import {tenantForHost} from '../src/lib/tenants';
import {acceptInvitation} from '../src/lib/invitations';
import {withTenant} from '../src/lib/db';
import type {Actor} from '../src/lib/access';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
const actor:Actor={id:randomUUID(),name:'Platform test',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:true};
const owner:Actor={...actor,id:randomUUID(),email:randomUUID()+'@example.invalid',isPlatformAdmin:false};
const prefix='provision-'+randomUUID().slice(0,8);
function input(){return {requestKey:randomUUID(),name:'New salon',address:'Test address',slug:prefix+'-'+randomUUID().slice(0,8),ownerEmail:owner.email};}
beforeAll(async()=>{await db.connect();for(const user of [actor,owner])await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin) VALUES($1,$2,$3,true,true,$4)',[user.id,user.name,user.email,user.isPlatformAdmin]);});
afterAll(async()=>{
  const ids=(await db.query('SELECT id FROM tenants WHERE slug LIKE $1',[prefix+'%'])).rows.map(r=>r.id);
  for(const table of ['company_provision_requests','access_audit_log','memberships','invitations','tenant_domains'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[ids]);
  await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[ids]);
  await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[actor.id,owner.id]]);await db.end();
});
it('creates a private draft and one initial owner invitation, with atomic replay',async()=>{
  const payload=input();const replies=await Promise.all(Array.from({length:5},()=>provisionCompany(actor,payload)));
  expect(new Set(replies.map(r=>r.tenantId)).size).toBe(1);
  expect(replies.every(r=>r.activationUrl===replies[0].activationUrl)).toBe(true);
  const reply=replies[0],token=new URL(reply.activationUrl).searchParams.get('invitation')!;
  expect((await db.query('SELECT demo,public_state FROM tenants WHERE id=$1',[reply.tenantId])).rows[0]).toEqual({demo:true,public_state:'draft'});
  expect((await db.query('SELECT ready FROM tenant_domains WHERE tenant_id=$1',[reply.tenantId])).rows[0].ready).toBe(false);
  await db.query('UPDATE tenant_domains SET ready=true WHERE tenant_id=$1',[reply.tenantId]);
  await expect(tenantForHost(reply.hostname)).rejects.toMatchObject({status:404});
  expect(JSON.stringify((await db.query('SELECT * FROM company_provision_requests WHERE tenant_id=$1',[reply.tenantId])).rows)).not.toContain(token);
  await expect(provisionCompany(actor,{...payload,name:'Changed'})).rejects.toMatchObject({code:'IDEMPOTENCY_MISMATCH'});
  const membership=await acceptInvitation(owner,token);expect(membership).toMatchObject({role:'owner',tenantId:reply.tenantId});
  expect((await db.query('SELECT count(*)::int AS n FROM memberships WHERE tenant_id=$1',[reply.tenantId])).rows[0].n).toBe(1);
});
it('checks live platform privileges, MFA, and disabled state even on replay',async()=>{
  await expect(provisionCompany(owner,input())).rejects.toMatchObject({status:403});
  const payload=input();await provisionCompany(actor,payload);
  for(const field of ['two_factor_enabled','is_platform_admin']){
    await db.query('UPDATE auth_user SET '+field+'=false WHERE id=$1',[actor.id]);
    try{await expect(provisionCompany(actor,payload)).rejects.toMatchObject({status:403});}
    finally{await db.query('UPDATE auth_user SET '+field+'=true WHERE id=$1',[actor.id]);}
  }
  await db.query('UPDATE auth_user SET disabled=true WHERE id=$1',[actor.id]);
  try{await expect(provisionCompany(actor,payload)).rejects.toMatchObject({code:'ACCOUNT_DISABLED'});}
  finally{await db.query('UPDATE auth_user SET disabled=false WHERE id=$1',[actor.id]);}
});
it('retains domain reservations and rolls back rejected provisioning',async()=>{
  const payload=input(),reply=await provisionCompany(actor,payload);
  await db.query('DELETE FROM tenant_domains WHERE tenant_id=$1',[reply.tenantId]);
  await db.query('UPDATE tenants SET slug=$2 WHERE id=$1',[reply.tenantId,payload.slug+'old']);
  await expect(provisionCompany(actor,{...payload,requestKey:randomUUID()})).rejects.toMatchObject({code:'DOMAIN_RESERVED'});
  expect((await db.query('SELECT 1 FROM tenants WHERE slug=$1',[payload.slug])).rowCount).toBe(0);
  await withTenant(reply.tenantId,async client=>{
    await client.query("SELECT set_config('app.user_id',$1,true)",[owner.id]);
    expect((await client.query('SELECT * FROM company_provision_requests')).rowCount).toBe(0);
  });
  await expect(withTenant(reply.tenantId,c=>c.query('SELECT * FROM domain_reservations'))).rejects.toMatchObject({code:'42501'});
});
it('renews an expired bootstrap invitation for the same email and invalidates previous links',async()=>{
  const created=await provisionCompany(actor,input());
  await db.query("UPDATE invitations SET expires_at=created_at+interval '1 millisecond' WHERE id=$1",[created.invitationId]);
  const state=await ownerInvitationState(actor,created.tenantId);expect(state.eligible).toBe(true);expect(state.invitation?.email).toBe(owner.email);
  const d={tenantId:created.tenantId,invitationId:created.invitationId,requestKey:randomUUID(),reason:'Owner requested a fresh activation link',confirmed:true};
  const [first,second]=await Promise.all([renewOwnerInvitation(actor,d),renewOwnerInvitation(actor,d)]);expect(first).toEqual(second);expect(first.activationUrl).not.toBe(created.activationUrl);
  await expect(acceptInvitation(owner,new URL(created.activationUrl).searchParams.get('invitation')!)).rejects.toMatchObject({code:'INVALID_INVITATION'});
  expect((await db.query('SELECT count(*)::int n FROM invitations WHERE tenant_id=$1 AND cancelled_at IS NULL',[created.tenantId])).rows[0].n).toBe(1);
  const token=new URL(first.activationUrl).searchParams.get('invitation')!;
  expect(JSON.stringify((await db.query('SELECT * FROM company_provision_requests WHERE tenant_id=$1',[created.tenantId])).rows)).not.toContain(token);
  await expect(renewOwnerInvitation(actor,{...d,reason:'Different retry payload'})).rejects.toMatchObject({code:'IDEMPOTENCY_MISMATCH'});
  await acceptInvitation(owner,token);
  expect((await ownerInvitationState(actor,created.tenantId)).eligible).toBe(false);
  await expect(renewOwnerInvitation(actor,d)).rejects.toMatchObject({code:'OWNER_ALREADY_ESTABLISHED'});
});
it('rejects renewal without platform authority and refuses stale invitation selection',async()=>{
  const created=await provisionCompany(actor,input());
  const d={tenantId:created.tenantId,invitationId:created.invitationId,requestKey:randomUUID(),reason:'Owner requested another activation link',confirmed:true};
  await expect(ownerInvitationState(owner,created.tenantId)).rejects.toMatchObject({status:403});
  await expect(renewOwnerInvitation(owner,d)).rejects.toMatchObject({status:403});
  await renewOwnerInvitation(actor,d);
  await expect(renewOwnerInvitation(actor,{...d,requestKey:randomUUID()})).rejects.toMatchObject({code:'VERSION_CONFLICT'});
});
