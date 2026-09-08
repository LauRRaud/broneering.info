import pg, { type PoolClient } from 'pg';

const globalDb = globalThis as unknown as { bookingPool?: pg.Pool };
export async function closePool(){await globalDb.bookingPool?.end();}
export function pool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  return globalDb.bookingPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL, max: 12,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
    statement_timeout: 15000,
  });
}

export async function withTenant<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>, isolation?: 'repeatable read'): Promise<T> {
  const client = await pool().connect();
  let discard = false;
  try {
    await client.query(isolation === 'repeatable read' ? 'BEGIN ISOLATION LEVEL REPEATABLE READ' : 'BEGIN');
    // Fail closed if a deployment accidentally uses the migration/superuser credential.
    const role = await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user');
    if (role.rows[0]?.rolsuper || role.rows[0]?.rolbypassrls) throw new Error('Unsafe database role: application must not bypass RLS');
    await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenantId]);
    await client.query("SET LOCAL lock_timeout = '10s'");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); }
    catch { discard = true; }
    throw error;
  } finally { client.release(discard); }
}

/** Only for database-only commands: every failed attempt is rolled back in full.
 * Never wrap SMTP, provider calls, filesystem writes or other external effects.
 * An unknown COMMIT/connection outcome is deliberately not retried here.
 */
export async function withTenantRetry<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await withTenant(tenantId, fn); }
    catch (error) {
      const code = (error as {code?: string})?.code;
      if (attempt >= 2 || (code !== '40001' && code !== '40P01')) throw error;
      await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1) + Math.floor(Math.random() * 20)));
    }
  }
}
