import {beforeEach,expect,it,vi} from 'vitest';
import {GET} from '../src/app/api/availability/route';
import {tenantForHost} from '../src/lib/tenants';
import {nextAvailableDay} from '../src/lib/availability';
import {limitTenant} from '../src/lib/request-limits';

vi.mock('../src/lib/request-limits',async importOriginal=>({...await importOriginal<typeof import('../src/lib/request-limits')>(),limitTenant:vi.fn(async()=>{})}));
vi.mock('../src/lib/tenants',()=>({tenantForHost:vi.fn()}));
vi.mock('../src/lib/availability',()=>({availableOffers:vi.fn(),nextAvailableDay:vi.fn()}));

const tenantId='11111111-1111-4111-8111-111111111111';
const serviceId='22222222-2222-4222-8222-222222222222';
function request(ip:string){return new Request(`https://demo.broneering.info/api/availability?serviceId=${serviceId}&date=2026-09-10&next=1`,{headers:{host:'demo.broneering.info','x-real-ip':ip}});}

beforeEach(()=>{
  vi.resetAllMocks();
  vi.mocked(tenantForHost).mockResolvedValue({id:tenantId} as Awaited<ReturnType<typeof tenantForHost>>);
  vi.mocked(nextAvailableDay).mockResolvedValue({date:null,searchedThrough:'2026-09-10',hasMore:false});
});

it('isolates next-day quotas by trusted client IP and retains a higher tenant backstop',async()=>{
  expect((await GET(request('198.51.100.10'))).status).toBe(200);
  expect((await GET(request('203.0.113.77'))).status).toBe(200);
  expect(vi.mocked(limitTenant).mock.calls).toEqual([
    [`read:${tenantId}`,600],
    [`next-day-client:${tenantId}:198.51.100.10`,30],
    [`next-day-tenant:${tenantId}`,300],
    [`read:${tenantId}`,600],
    [`next-day-client:${tenantId}:203.0.113.77`,30],
    [`next-day-tenant:${tenantId}`,300],
  ]);
});
