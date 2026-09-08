import {afterEach,afterAll,expect,it,vi} from 'vitest';
import type {PoolClient} from 'pg';
import {pool,withTenantRetry} from '../src/lib/db';
afterEach(()=>vi.restoreAllMocks());
afterAll(()=>pool().end());
it('does not replay an unknown commit outcome and discards a connection whose rollback fails',async()=>{
  const failure=Object.assign(new Error('connection lost'),{code:'08006'});
  const query=vi.fn(async(sql:string)=>{
    if(sql==='COMMIT')throw failure;
    if(sql==='ROLLBACK')throw new Error('connection closed');
    return {rows:[{rolsuper:false,rolbypassrls:false}]};
  });
  const release=vi.fn(),connect=vi.spyOn(pool(),'connect').mockImplementation(async()=>({query,release} as unknown as PoolClient));
  const operation=vi.fn(async()=>({id:'saved-but-unknown'}));
  await expect(withTenantRetry('00000000-0000-4000-8000-000000000001',operation)).rejects.toBe(failure);
  expect(operation).toHaveBeenCalledTimes(1);expect(connect).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledWith(true);
});
