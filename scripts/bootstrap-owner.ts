import { createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
const slug = process.env.BOOTSTRAP_TENANT_SLUG?.trim().toLowerCase();
const output = process.env.BOOTSTRAP_OUTPUT ?? path.resolve('output/bootstrap-owner.json');
const confirmed = process.env.BOOTSTRAP_CONFIRM === 'CREATE_OWNER_INVITATION';
if (!email || !slug) throw new Error('BOOTSTRAP_EMAIL and BOOTSTRAP_TENANT_SLUG are required');
if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) throw new Error('BOOTSTRAP_EMAIL is invalid');

type BootstrapOutput = { email:string; tenantSlug:string; created:boolean; invitationId?:string; expiresAt?:string; activationUrl?:string; token?:string; note:string };
const result: BootstrapOutput = { email, tenantSlug:slug, created:false, note:'Dry run. Set BOOTSTRAP_CONFIRM=CREATE_OWNER_INVITATION for the explicit root action.' };

if (confirmed) {
  if (!process.env.MIGRATION_DATABASE_URL) throw new Error('MIGRATION_DATABASE_URL is required for the explicit root action');
  const client = new pg.Client({ connectionString: process.env.MIGRATION_DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const tenant=await client.query<{id:string}>('SELECT id FROM tenants WHERE slug=$1 FOR UPDATE',[slug]);
    if (!tenant.rowCount) throw new Error('Tenant not found');
    const owners=await client.query("SELECT 1 FROM memberships WHERE tenant_id=$1 AND role='owner' AND active LIMIT 1",[tenant.rows[0].id]);
    if (owners.rowCount) throw new Error('Tenant already has an active owner');
    const token=randomBytes(32).toString('base64url');
    const tokenHash=createHash('sha256').update(token,'utf8').digest('hex');
    const cancelled=await client.query<{id:string}>(`UPDATE invitations SET cancelled_at=now() WHERE tenant_id=$1 AND bootstrap AND accepted_at IS NULL AND cancelled_at IS NULL RETURNING id`,[tenant.rows[0].id]);
    for (const old of cancelled.rows) await client.query(`INSERT INTO access_audit_log(tenant_id,actor_user_id,action,target_id,metadata) VALUES($1,NULL,'owner.bootstrap_invitation_cancelled',$2,'{}'::jsonb)`,[tenant.rows[0].id,old.id]);
    const invitation=await client.query<{id:string;expires_at:Date}>(`INSERT INTO invitations(tenant_id,invited_by,email,role,bootstrap,permissions,token_hash,expires_at)
      VALUES($1,NULL,$2,'owner',true,'[]'::jsonb,$3,now()+interval '48 hours') RETURNING id,expires_at`,[tenant.rows[0].id,email,tokenHash]);
    await client.query(`INSERT INTO access_audit_log(tenant_id,actor_user_id,action,target_id,metadata) VALUES($1,NULL,'owner.bootstrap_invited',$2,'{}'::jsonb)`,[tenant.rows[0].id,invitation.rows[0].id]);
    await client.query('COMMIT');
    const base=(process.env.AUTH_BASE_URL?.trim() || 'http://haldus.localhost:3107').replace(/\/$/,'');
    result.created=true; result.invitationId=invitation.rows[0].id; result.expiresAt=new Date(invitation.rows[0].expires_at).toISOString();
    result.activationUrl=`${base}/?invitation=${encodeURIComponent(token)}`; result.token=token; result.note='Owner invitation created. The invited user must sign up with this exact email, accept the invitation, and enroll MFA.';
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}

await mkdir(path.dirname(output),{recursive:true});
const handle=await open(output,'w',0o600);
try { await handle.writeFile(JSON.stringify(result,null,2)+'\n','utf8'); }
finally { await handle.close(); }
await chmod(output,0o600);
// Never print the invitation token, email, or database credentials.
console.log(JSON.stringify({output,created:result.created}));
