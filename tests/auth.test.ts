import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { GET, POST } from '../src/app/api/auth/[...all]/route';
import { authBaseUrl, authHost } from '../src/lib/auth-host';
import { getIdentity } from '../src/lib/auth';

const admin = new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL, max: 2 });
const rows: string[] = [];

beforeAll(async () => {
  const tables = await admin.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'auth_%' ORDER BY table_name`);
  expect(tables.rows.map((row) => row.table_name)).toEqual([
    'auth_account', 'auth_rate_limit', 'auth_session', 'auth_two_factor', 'auth_user', 'auth_verification',
  ]);
});

afterAll(async () => {
  for (const id of rows) await admin.query('DELETE FROM auth_user WHERE id=$1', [id]);
  await admin.end();
});

describe('authentication route boundary', () => {
  it('rejects a request whose Host is not the exact configured admin host', async () => {
    const response = await GET(new Request(`${authBaseUrl}/api/auth/ok`, { headers: { host: 'evil.example.test' } }));
    expect(response.status).toBe(404);
  });

  it('uses only the configured origin for CSRF', async () => {
    const response = await POST(new Request(`${authBaseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { host: authHost, origin: 'https://evil.example.test', cookie: 'better-auth.session_token=bogus', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.invalid', password: 'not-a-password' }),
    }));
    expect(response.status).toBe(403);
  });
});

describe('authoritative session identity', () => {
  it('reads the live session and stops accepting it after disabling the user', async () => {
    const userId = randomUUID();
    const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    rows.push(userId);
    await admin.query(`INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin,disabled)
      VALUES($1,'Auth Test',$2,true,false,false,false)`, [userId, `${userId}@example.invalid`]);
    const context = await (await import('../src/lib/auth')).auth().$context;
    const secret = (context as unknown as { secret: string }).secret;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))).toString('base64');
    const cookie = encodeURIComponent(`${token}.${signature}`);
    await admin.query(`INSERT INTO auth_session(id,expires_at,token,created_at,updated_at,user_id)
      VALUES($1,now()+interval '1 hour',$2,now(),now(),$3)`, [randomUUID(), token, userId]);
    const headers = new Headers({ cookie: `better-auth.session_token=${cookie}` });
    expect(await getIdentity(headers)).toMatchObject({ id: userId, emailVerified: true, twoFactorEnabled: false, isPlatformAdmin: false });
    await admin.query('UPDATE auth_user SET disabled=true WHERE id=$1', [userId]);
    expect(await getIdentity(headers)).toBeNull();
    const blocked = await POST(new Request(`${authBaseUrl}/api/auth/sign-out`, { method: 'POST', headers: { host: authHost, origin: authBaseUrl, 'content-type':'application/json', cookie: `better-auth.session_token=${cookie}` }, body:'{}' }));
    expect(blocked.status).toBe(401);
  });

  it('does not treat an old session as MFA-authenticated after enrollment', async () => {
    const userId = randomUUID();
    const token = randomUUID().replaceAll('-', '');
    rows.push(userId);
    await admin.query(`INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin,disabled)
      VALUES($1,'MFA Test',$2,true,true,false,false)`, [userId, `${userId}@example.invalid`]);
    const context = await (await import('../src/lib/auth')).auth().$context;
    const secret = (context as unknown as { secret: string }).secret;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))).toString('base64');
    const cookie = encodeURIComponent(`${token}.${signature}`);
    await admin.query(`INSERT INTO auth_session(id,expires_at,token,created_at,updated_at,user_id,mfa_verified_at)
      VALUES($1,now()+interval '1 hour',$2,now(),now(),$3,NULL)`, [randomUUID(), token, userId]);
    expect(await getIdentity(new Headers({ cookie: `better-auth.session_token=${cookie}` }))).toBeNull();
  });
});
