import {describe,it,expect,vi} from 'vitest';
import {readinessResponse,probeDatabase} from '../src/lib/operations-health';
import {readdir} from 'node:fs/promises';
const fake=vi.hoisted(()=>({connect:vi.fn(),query:vi.fn(),end:vi.fn(),on:vi.fn()}));
vi.mock('pg',()=>({default:{Client:class{connect=fake.connect;query=fake.query;end=fake.end;on=fake.on;}}}));

describe('readiness',()=>{
  it('returns only generic unavailable on database failure',async()=>{
    const response=await readinessResponse(async()=>{throw new Error('secret database credential');});
    expect(response.status).toBe(503);expect(await response.json()).toEqual({status:'unavailable'});
  });
  it('reports a successful database probe',async()=>{
    const response=await readinessResponse(async()=>true);
    expect(response.status).toBe(200);expect(await response.json()).toEqual({status:'ready'});
  });
  it('rejects failed safety or migration checks',async()=>expect((await readinessResponse(async()=>false)).status).toBe(503));
  it('bounds a stalled probe',async()=>{
    vi.useFakeTimers();const pending=readinessResponse(()=>new Promise(()=>{}));
    await vi.advanceTimersByTimeAsync(5000);expect((await pending).status).toBe(503);vi.useRealTimers();
  });
  it('requires a safe runtime role and every shipped migration, permitting later migrations',async()=>{
    const names=(await readdir('db/migrations')).filter(name=>/^\d+_.+\.sql$/.test(name));
    fake.connect.mockResolvedValue(undefined);fake.end.mockResolvedValue(undefined);
    fake.query.mockResolvedValueOnce({rows:[{rolsuper:false,rolbypassrls:false}]}).mockResolvedValueOnce({rows:[...names,'999_future.sql'].map(name=>({name}))});
    expect(await probeDatabase()).toBe(true);
    fake.query.mockResolvedValueOnce({rows:[{rolsuper:true,rolbypassrls:false}]});expect(await probeDatabase()).toBe(false);
    fake.query.mockResolvedValueOnce({rows:[{rolsuper:false,rolbypassrls:true}]});expect(await probeDatabase()).toBe(false);
    fake.query.mockResolvedValueOnce({rows:[{rolsuper:false,rolbypassrls:false}]}).mockResolvedValueOnce({rows:names.slice(1).map(name=>({name}))});expect(await probeDatabase()).toBe(false);
    fake.connect.mockRejectedValueOnce(new Error('offline'));expect(await probeDatabase()).toBe(false);
  });
});
