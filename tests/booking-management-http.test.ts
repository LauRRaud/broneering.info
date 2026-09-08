import {beforeEach,it,expect,vi} from 'vitest';
import {GET as publicGet,POST as publicPost} from '../src/app/api/booking/manage/route';
import {GET as adminGet,POST as adminPost} from '../src/app/api/admin/bookings/route';
import {POST as policyPost} from '../src/app/api/admin/booking-policy/route';
import {tenantForHost} from '../src/lib/tenants';
import {getIdentity} from '../src/lib/auth';
import {publicBookingState,publicChangeOffers,changePublicBooking,adminBookingsState,changeAdminBooking,saveBookingPolicy} from '../src/lib/booking-management';
import {authBaseUrl,authHost} from '../src/lib/auth-host';
import {AppError} from '../src/lib/errors';
vi.mock('../src/lib/request-limits',()=>({limitTenant:vi.fn(async()=>{})}));
vi.mock('../src/lib/auth',()=>({getIdentity:vi.fn()}));
vi.mock('../src/lib/tenants',()=>({tenantForHost:vi.fn()}));
vi.mock('../src/lib/booking-management',()=>({publicBookingState:vi.fn(),publicChangeOffers:vi.fn(),changePublicBooking:vi.fn(),adminBookingsState:vi.fn(),adminBookingOffers:vi.fn(),adminBookingHistory:vi.fn(),changeAdminBooking:vi.fn(),saveBookingPolicy:vi.fn()}));
const tenantId='11111111-1111-4111-8111-111111111111',secret='A'.repeat(43),key='22222222-2222-4222-8222-222222222222',host='demo.broneering.info';
const actor={id:'http-booking-actor',name:'Test',email:'test@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
function publicRequest(query='',body?:unknown,extra:Record<string,string>={}){return new Request('https://'+host+'/api/booking/manage'+query,{method:body===undefined?'GET':'POST',headers:{host,origin:'https://'+host,authorization:'Bearer '+secret,'content-type':'application/json','idempotency-key':key,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function adminRequest(path='/api/admin/bookings',body?:unknown,extra:Record<string,string>={}){return new Request(authBaseUrl+path,{method:body===undefined?'GET':'POST',headers:{host:authHost,origin:authBaseUrl,'content-type':'application/json','idempotency-key':key,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getIdentity).mockResolvedValue(actor);vi.mocked(tenantForHost).mockResolvedValue({id:tenantId} as Awaited<ReturnType<typeof tenantForHost>>);});
it('GET reads a bearer-scoped booking without invoking any mutation and marks every response private',async()=>{
  vi.mocked(publicBookingState).mockResolvedValue({booking:{id:key}} as Awaited<ReturnType<typeof publicBookingState>>);
  const response=await publicGet(publicRequest());expect(response.status).toBe(200);
  expect(publicBookingState).toHaveBeenCalledWith(tenantId,secret);expect(changePublicBooking).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('vary')).toContain('Authorization');expect(response.headers.get('x-robots-tag')).toContain('noindex');
  for(const query of ['?action=cancel','?token='+secret,'?bookingId='+key])expect((await publicGet(publicRequest(query))).status).toBe(400);
  expect(publicBookingState).toHaveBeenCalledTimes(1);expect(changePublicBooking).not.toHaveBeenCalled();
});
it('returns a clear 410 contact instruction for expired links and never uses a token from the URL',async()=>{
  vi.mocked(publicBookingState).mockRejectedValue(new AppError(410,'LINK_UNAVAILABLE','Link on aegunud. Võta ettevõttega ühendust.'));
  const response=await publicGet(publicRequest('',undefined,{authorization:''}));expect(response.status).toBe(410);
  expect(await response.json()).toMatchObject({code:'LINK_UNAVAILABLE',error:expect.stringContaining('ettevõttega')});expect(publicBookingState).toHaveBeenCalledWith(tenantId,'');
});
it('requires a same-origin explicit write and passes its idempotency key unchanged',async()=>{
  const command={action:'cancel',version:1};
  for(const origin of ['', 'https://other.example.invalid'])expect((await publicPost(publicRequest('',command,{origin}))).status).toBe(403);
  expect(changePublicBooking).not.toHaveBeenCalled();
  vi.mocked(changePublicBooking).mockResolvedValue({id:key,reference:'BR-TEST',version:2,status:'cancelled'} as Awaited<ReturnType<typeof changePublicBooking>>);
  expect((await publicPost(publicRequest('',command))).status).toBe(200);expect(changePublicBooking).toHaveBeenCalledWith(tenantId,secret,command,key);
});
it('rejects invalid content types and oversized writes before calling the engine',async()=>{
  expect((await publicPost(publicRequest('',{action:'cancel'},{'content-type':'text/plain'}))).status).toBe(415);
  expect((await publicPost(publicRequest('',{reason:'x'.repeat(9000)}))).status).toBe(413);
  expect(changePublicBooking).not.toHaveBeenCalled();
});
it('keeps admin routes on the exact admin host and origin, before identity lookup',async()=>{
  expect((await adminGet(adminRequest('/api/admin/bookings',undefined,{host}))).status).toBe(404);
  expect((await adminPost(adminRequest('/api/admin/bookings',{tenantId},{origin:'https://'+host}))).status).toBe(403);
  expect((await policyPost(adminRequest('/api/admin/booking-policy',{tenantId},{origin:'https://'+host}))).status).toBe(403);
  expect(getIdentity).not.toHaveBeenCalled();expect(changeAdminBooking).not.toHaveBeenCalled();expect(saveBookingPolicy).not.toHaveBeenCalled();
});
it('requires a session and validates strict read filters and pagination',async()=>{
  vi.mocked(getIdentity).mockResolvedValue(null);expect((await adminGet(adminRequest())).status).toBe(401);
  vi.mocked(getIdentity).mockResolvedValue(actor);
  for(const query of ['?view=list&tenantId='+tenantId+'&day=2026-09-09&role=owner','?view=list&tenantId='+tenantId+'&day=2026-09-09&page=-1'])expect((await adminGet(adminRequest('/api/admin/bookings'+query))).status).toBe(400);
  vi.mocked(adminBookingsState).mockResolvedValue({bookings:[]} as unknown as Awaited<ReturnType<typeof adminBookingsState>>);
  const response=await adminGet(adminRequest('/api/admin/bookings?view=list&tenantId='+tenantId+'&day=2026-09-09&attention=1&page=2'));
  expect(response.status).toBe(200);expect(adminBookingsState).toHaveBeenCalledWith(actor,tenantId,'2026-09-09',true,2,'list',undefined);expect(response.headers.get('vary')).toContain('Cookie');
});
