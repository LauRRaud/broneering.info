import {afterAll,afterEach,expect,it,vi} from 'vitest';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import {limitTenant} from '../src/lib/request-limits';
import {assertSameOrigin,errorResponse} from '../src/lib/http';
import {pool} from '../src/lib/db';
import {recordSecurityRejection} from '../src/lib/security-log';
const admin=new pg.Pool({connectionString:process.env.MIGRATION_DATABASE_URL});
const other=new pg.Pool({connectionString:process.env.DATABASE_URL,max:4});
const keys:string[]=[];
const key=()=>{const value='test:'+randomUUID();keys.push(createHash('sha256').update(value).digest('hex'));return value;};
afterEach(async()=>{vi.restoreAllMocks();vi.unstubAllEnvs();if(keys.length)await admin.query('DELETE FROM request_limits WHERE key_hash=ANY($1)',[keys.splice(0)]);});
afterAll(async()=>{await other.end();await admin.end();await pool().end();});
it('shares an atomic limit across independent connection pools and retains no raw scope',async()=>{
  const scope=key(),hash=keys[0];
  const results=await Promise.all(Array.from({length:40},(_,i)=>(i%2?pool():other).query('SELECT consume_request_limit($1,10) allowed',[hash])));
  expect(results.filter(r=>r.rows[0].allowed)).toHaveLength(10);
  expect((await admin.query('SELECT * FROM request_limits WHERE key_hash=$1',[hash])).rows[0]).toMatchObject({key_hash:hash,requests:10,rejected:30});
  await expect(limitTenant(scope,10)).rejects.toMatchObject({code:'RATE_LIMIT',status:429});
  await expect(limitTenant(key(),10)).resolves.toBeUndefined();
  await expect(other.query('SELECT * FROM request_limits')).rejects.toMatchObject({code:'42501'});
});
it('resets expired windows and reports a retry delay',async()=>{
  const scope=key();await limitTenant(scope,1);
  let failure:unknown;try{await limitTenant(scope,1);}catch(error){failure=error;}
  const response=errorResponse(failure);expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('60');
  await admin.query("UPDATE request_limits SET window_started_at=clock_timestamp()-interval '61 seconds' WHERE key_hash=$1",[keys[0]]);
  await expect(limitTenant(scope,1)).resolves.toBeUndefined();
});
it('fails closed during admission storage outage without exposing database errors',async()=>{
  vi.spyOn(pool(),'query').mockImplementation(async()=>{throw new Error('private database detail');});
  await expect(limitTenant(key(),10)).rejects.toMatchObject({code:'BUSY',status:503});
});
it('rejects malformed, credential-bearing and cross-scheme Origins with a controlled 403',()=>{
  vi.stubEnv('NODE_ENV','production');
  for(const origin of ['null','not a url','http://salon.example','https://user@salon.example','https://salon.example/','https://evil.example']){
    expect(()=>assertSameOrigin(new Request('https://salon.example/api/bookings',{headers:{host:'salon.example',origin}}))).toThrowError(expect.objectContaining({code:'ORIGIN_REJECTED',status:403}));
  }
  expect(()=>assertSameOrigin(new Request('https://salon.example/api/bookings',{headers:{host:'salon.example',origin:'https://salon.example'}}))).not.toThrow();
});
it('logs bounded aggregate rejection signals without accepting raw request data',()=>{
  const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  for(let i=0;i<100;i++)recordSecurityRejection('password=private@example.invalid/token',403);
  expect(log.mock.calls.length).toBeLessThanOrEqual(7);
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/private|password|token/);
  expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({event:'security.rejected',code:'REJECTED',status:403});
});
