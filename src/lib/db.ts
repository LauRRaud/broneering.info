import pg, { type PoolClient } from 'pg';

const globalDb = globalThis as unknown as { bookingPool?: pg.Pool };
export function pool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  return globalDb.bookingPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL, max: 12,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
    statement_timeout: 15000,
  });
}

export async function withTenant<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    // Fail closed if a deployment accidentally uses the migration/superuser credential.
    const role = await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user');
    if (role.rows[0]?.rolsuper || role.rows[0]?.rolbypassrls) throw new Error('Unsafe database role: application must not bypass RLS');
    await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenantId]);
    await client.query("SET LOCAL lock_timeout = '10s'");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
