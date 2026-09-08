import {beforeEach,it,expect,vi} from 'vitest';
import {GET,POST} from '../src/app/api/admin/customers/route';
import {getIdentity} from '../src/lib/auth';
import {customerState,correctCustomer} from '../src/lib/customer-management';
import {authBaseUrl,authHost} from '../src/lib/auth-host';
vi.mock('../src/lib/request-limits',()=>({limitTenant:vi.fn(async()=>{})}));
vi.mock('../src/lib/auth',()=>({getIdentity:vi.fn()}));
vi.mock('../src/lib/customer-management',()=>({customerState:vi.fn(),correctCustomer:vi.fn()}));
const actor={id:'http-customer-actor',name:'Test',email:'test@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
const tenantId='11111111-1111-4111-8111-111111111111';
function request(body?:unknown,extra:Record<string,string>={}){return new Request(authBaseUrl+'/api/admin/customers?tenantId='+tenantId,{method:body===undefined?'GET':'POST',headers:{host:authHost,origin:authBaseUrl,'content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getIdentity).mockResolvedValue(actor);});
it('protects customer reads and writes with exact host, session and same-origin gates',async()=>{
  expect((await GET(request(undefined,{host:'foreign.invalid'}))).status).toBe(404);
  expect((await POST(request({tenantId},{origin:'https://foreign.invalid'}))).status).toBe(403);
  expect(getIdentity).not.toHaveBeenCalled();
  vi.mocked(getIdentity).mockResolvedValue(null);expect((await GET(request())).status).toBe(401);
  expect(customerState).not.toHaveBeenCalled();expect(correctCustomer).not.toHaveBeenCalled();
});
it('delivers customer CSV as a non-cacheable attachment',async()=>{
  vi.mocked(customerState).mockResolvedValue({csv:'\uFEFF"Nimi"\r\n"Test"'});
  const response=await GET(request());expect(response.status).toBe(200);
  expect(response.headers.get('content-disposition')).toContain('attachment');
  expect(response.headers.get('content-type')).toContain('text/csv');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('vary')).toContain('Cookie');
  expect(response.headers.get('x-robots-tag')).toContain('noindex');
  expect(await response.text()).toContain('"Test"');expect(correctCustomer).not.toHaveBeenCalled();
});
