import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { GET, POST } from '../src/app/api/auth/[...all]/route';
import { authBaseUrl, authHost } from '../src/lib/auth-host';
import { getIdentity } from '../src/lib/auth';
import { acceptInvitation } from '../src/lib/invitations';
import { requireMembership } from '../src/lib/access';

const tenantId=randomUUID();
const email=`flow-${randomUUID()}@example.invalid`;
const token=randomBytes(32).toString('base64url');
const password=randomBytes(20).toString('base64url');
const admin=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
const jar=new Map<string,string>();
const mailFiles:string[]=[];
const testIp=`192.0.2.${1+Math.floor(Math.random()*253)}`;
const captureDir=path.resolve(process.env.AUTH_MAIL_CAPTURE_DIR?.trim()||'output/auth-mail');
function headers() {return new Headers({host:authHost,origin:authBaseUrl,'x-forwarded-for':testIp,'content-type':'application/json',cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')});}
async function call(route:string,body?:unknown,extra:Record<string,string>={}) {
  const h=headers();for(const [k,v]of Object.entries(extra))h.set(k,v);
  const request=new Request(route.startsWith('http')?route:`${authBaseUrl}/api/auth/${route}`,{method:body===undefined?'GET':'POST',headers:h,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const response=await(body===undefined?GET(request):POST(request));
  for(const cookie of response.headers.getSetCookie()) {
    expect(cookie).not.toMatch(/;\s*Domain=/i);
    const part=cookie.split(';')[0],at=part.indexOf('=');jar.set(part.slice(0,at),part.slice(at+1));
  }
  return response;
}
async function latestMail() {
  const files=(await readdir(captureDir)).filter(f=>f.endsWith('.json')).sort().reverse();
  for(const file of files) {
    const full=path.join(captureDir,file);const mail=JSON.parse(await readFile(full,'utf8'));
    if(mail.to===email&&!mailFiles.includes(full)){mailFiles.push(full);return mail as {text:string};}
  }
  throw new Error('Expected local captured account email');
}
function totp(secret:string) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits=[...secret.toUpperCase().replace(/=+$/,'')].map(c=>alphabet.indexOf(c).toString(2).padStart(5,'0')).join('');
  const key=Buffer.from((bits.match(/.{8}/g)||[]).map(b=>parseInt(b,2)));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const digest=createHmac('sha1',key).update(counter).digest(),offset=digest[19]&15;
  return ((digest.readUInt32BE(offset)&0x7fffffff)%1_000_000).toString().padStart(6,'0');
}
beforeAll(async()=>{
  expect(process.env.AUTH_MAIL_MODE).toBe('capture');
  await admin.connect();
  await admin.query('INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,$3,$4)',[tenantId,`flow-${tenantId}`,'Auth flow test','Test']);
  await admin.query("INSERT INTO invitations(tenant_id,email,role,bootstrap,token_hash,expires_at) VALUES($1,$2,'owner',true,$3,now()+interval '1 hour')",[tenantId,email,createHash('sha256').update(token).digest('hex')]);
});
afterAll(async()=>{
  for(const table of ['access_audit_log','support_grants','invitations','memberships'])await admin.query(`DELETE FROM ${table} WHERE tenant_id=$1`,[tenantId]);
  await admin.query('DELETE FROM tenants WHERE id=$1',[tenantId]);
  await admin.query('DELETE FROM auth_user WHERE email=$1',[email]);
  await admin.end();
  for(const file of mailFiles)await unlink(file);
});
describe('Invited account lifecycle through real handlers',()=>{
  it('verifies email, enrolls MFA, consumes backup codes and revokes sessions on password reset',async()=>{
    const signup={name:'Account Flow Test',email,password,callbackURL:`${authBaseUrl}/?invitation=${token}`};
    expect((await call('sign-up/email',signup)).status).toBe(403);
    const created=await call('sign-up/email',signup,{'x-invitation-token':token});
    expect(created.status,await created.clone().text()).toBe(200);
    expect((await call('sign-in/email',{email,password})).status).toBe(403);
    const mail=await latestMail();const verificationUrl=mail.text.match(/https?:\/\/\S+/)![0];
    expect((await call(verificationUrl)).status).toBe(302);
    expect((await call('sign-in/email',{email,password})).status).toBe(200);
    const actor=await getIdentity(headers());expect(actor).not.toBeNull();
    await acceptInvitation(actor!,token);
    await expect(requireMembership(actor!,tenantId,'members.manage')).rejects.toMatchObject({code:'MFA_REQUIRED'});
    const oldHeaders=headers();
    const enable=await call('two-factor/enable',{password,method:'totp'});
    expect(enable.status,await enable.clone().text()).toBe(200);
    const enrollment=await enable.json() as {totpURI:string;backupCodes:string[]};
    const secret=new URL(enrollment.totpURI).searchParams.get('secret')!;
    const verify=await call('two-factor/verify-totp',{code:totp(secret)});
    expect(verify.status,await verify.clone().text()).toBe(200);
    expect(await getIdentity(oldHeaders)).toBeNull();
    const mfaActor=await getIdentity(headers());expect(mfaActor?.twoFactorEnabled).toBe(true);
    await expect(requireMembership(mfaActor!,tenantId,'members.manage')).resolves.toMatchObject({role:'owner'});
    await call('sign-out',{});jar.clear();
    expect(await(await call('sign-in/email',{email,password})).json()).toMatchObject({twoFactorRedirect:true});
    expect(await getIdentity(headers())).toBeNull();
    const backup=await call('two-factor/verify-backup-code',{code:enrollment.backupCodes[0]});
    expect(backup.status,await backup.clone().text()).toBe(200);
    expect((await getIdentity(headers()))?.twoFactorEnabled).toBe(true);
    const resetOldHeaders=headers();
    await call('sign-out',{});jar.clear();
    // The real sign-in limiter permits three attempts per ten seconds.
    await new Promise(resolve=>setTimeout(resolve,10_100));
    const relogin=await call('sign-in/email',{email,password});
    expect(relogin.status,await relogin.clone().text()).toBe(200);
    expect((await call('two-factor/verify-backup-code',{code:enrollment.backupCodes[0]})).status).toBe(401);
    const retryLogin=await call('sign-in/email',{email,password});
    expect(retryLogin.status,await retryLogin.clone().text()).toBe(200);
    const nextBackup=await call('two-factor/verify-backup-code',{code:enrollment.backupCodes[1]});
    expect(nextBackup.status,await nextBackup.clone().text()).toBe(200);
    const activeBeforeReset=headers();
    const reset=await call('request-password-reset',{email,redirectTo:`${authBaseUrl}/?reset=1`});
    expect(reset.status,await reset.clone().text()).toBe(200);
    const resetMail=await latestMail();const resetUrl=resetMail.text.match(/https?:\/\/\S+/)![0];
    const redirect=await call(resetUrl);expect(redirect.status).toBe(302);
    const resetToken=new URL(redirect.headers.get('location')!,authBaseUrl).searchParams.get('token');
    expect(resetToken).toBeTruthy();
    const changed=await call('reset-password',{token:resetToken,newPassword:randomBytes(20).toString('base64url')});
    expect(changed.status,await changed.clone().text()).toBe(200);
    expect(await getIdentity(activeBeforeReset)).toBeNull();expect(await getIdentity(resetOldHeaders)).toBeNull();
  });
});
