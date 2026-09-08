import {beforeEach,it,expect,vi} from 'vitest';
import {GET,POST,DELETE} from '../src/app/api/admin/customers/privacy/route';
import {getIdentity} from '../src/lib/auth';
import {exportCustomerData,previewContactRemoval,removeCustomerContacts} from '../src/lib/customer-privacy';
import {authBaseUrl,authHost} from '../src/lib/auth-host';
vi.mock('../src/lib/request-limits',()=>({limitTenant:vi.fn(async()=>{})}));
vi.mock('../src/lib/auth',()=>({getIdentity:vi.fn()}));
vi.mock('../src/lib/customer-privacy',()=>({exportCustomerData:vi.fn(),previewContactRemoval:vi.fn(),removeCustomerContacts:vi.fn()}));
const actor={id:'privacy-http-owner',name:'Owner',email:'owner@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
const tenantId='11111111-1111-4111-8111-111111111111',customerId='22222222-2222-4222-8222-222222222222';
function request(method:string,headers:Record<string,string>={}){return new Request(authBaseUrl+'/api/admin/customers/privacy?'+new URLSearchParams({tenantId,customerId}),{method,headers:{host:authHost,origin:authBaseUrl,'content-type':'application/json',...headers},...(method==='GET'?{}:{body:JSON.stringify({tenantId,customerId,identityConfirmed:true})})});}
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getIdentity).mockResolvedValue(actor);});
it('gates contact disclosure and removal by host, session and exact origin',async()=>{
 expect((await GET(request('GET',{host:'foreign.invalid'}))).status).toBe(404);
 expect((await POST(request('POST',{origin:'https://foreign.invalid'}))).status).toBe(403);
 expect((await DELETE(request('DELETE',{origin:'https://foreign.invalid'}))).status).toBe(403);
 vi.mocked(getIdentity).mockResolvedValue(null);expect((await DELETE(request('DELETE'))).status).toBe(401);
 expect(removeCustomerContacts).not.toHaveBeenCalled();expect(exportCustomerData).not.toHaveBeenCalled();expect(previewContactRemoval).not.toHaveBeenCalled();
});
it('returns a non-cacheable attachment and keeps preview read-only',async()=>{
 vi.mocked(exportCustomerData).mockResolvedValue({schemaVersion:1,generatedAt:'2026-09-08T00:00:00Z',tenantId,customerId,scope:'test',profiles:[],bookings:[]});
 const response=await POST(request('POST'));
 expect(response.status).toBe(200);expect(response.headers.get('content-disposition')).toContain('attachment');expect(response.headers.get('cache-control')).toBe('no-store');
 await GET(request('GET'));expect(previewContactRemoval).toHaveBeenCalledWith(actor,tenantId,customerId);expect(removeCustomerContacts).not.toHaveBeenCalled();
});
