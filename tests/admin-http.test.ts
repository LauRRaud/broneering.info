import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../src/app/api/admin/state/route';
import { POST } from '../src/app/api/admin/[action]/route';
import { getIdentity } from '../src/lib/auth';
import { listMemberships, listMembers, revokeMember } from '../src/lib/access';
import { authBaseUrl } from '../src/lib/auth-host';
import {saveSchedule,scheduleState,ScheduleConflictError} from '../src/lib/schedule-management';
vi.mock('../src/lib/request-limits',()=>({limitTenant:vi.fn(async()=>{})}));

vi.mock('../src/lib/auth', () => ({ getIdentity: vi.fn() }));
vi.mock('../src/lib/auth-mail', () => ({ isAccountMailConfigured: () => false, sendAccountMail: vi.fn() }));
vi.mock('../src/lib/access', () => ({listMemberships:vi.fn(),listMembers:vi.fn(),listPlatformTenants:vi.fn(),listSupportGrants:vi.fn(async()=>[]),requireMembership:vi.fn(),requireOwnerInTransaction:vi.fn(),changeMemberRole:vi.fn(),createSupportGrant:vi.fn(),revokeMember:vi.fn(),revokeSupportGrant:vi.fn(),transferOwnership:vi.fn(),updateMemberPermissions:vi.fn()}));
vi.mock('../src/lib/invitations', () => ({listInvitations:vi.fn(),acceptInvitation:vi.fn(),cancelInvitation:vi.fn(),inviteMember:vi.fn()}));
vi.mock('../src/lib/schedule-management',async(importOriginal)=>({...await importOriginal<typeof import('../src/lib/schedule-management')>(),saveSchedule:vi.fn(),scheduleState:vi.fn()}));
const tenantId='11111111-1111-4111-8111-111111111111';
const actor={id:'actor',name:'Test',email:'test@example.invalid',emailVerified:true,twoFactorEnabled:false,isPlatformAdmin:false};
function request(path:string, body?:unknown, origin=authBaseUrl) {
  return new Request(`${authBaseUrl}${path}`, {method:body===undefined?'GET':'POST',headers:{host:new URL(authBaseUrl).host,origin,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getIdentity).mockResolvedValue(actor);vi.mocked(listMemberships).mockResolvedValue([]);});
describe('Administration API boundaries',()=>{
  it('does not expose a session on another tenant host',async()=>{
    const response=await GET(new Request('https://demo.broneering.info/api/admin/state',{headers:{host:'demo.broneering.info'}}));
    expect(response.status).toBe(404);expect(getIdentity).not.toHaveBeenCalled();
  });
  it('rejects writes from another origin before resolving identity',async()=>{
    const response=await POST(request('/api/admin/revoke-member',{tenantId,userId:'target'},'https://demo.broneering.info'),{params:Promise.resolve({action:'revoke-member'})});
    expect(response.status).toBe(403);expect(revokeMember).not.toHaveBeenCalled();expect(getIdentity).not.toHaveBeenCalled();
  });
  it('returns an uncached anonymous state',async()=>{
    vi.mocked(getIdentity).mockResolvedValue(null);
    const response=await GET(request('/api/admin/state'));
    expect(await response.json()).toEqual({user:null,memberships:[],mailAvailable:false});
    expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('x-robots-tag')).toContain('noindex');
  });
  it('does not fetch owner data until MFA is enrolled',async()=>{
    vi.mocked(listMemberships).mockResolvedValue([{tenantId,userId:actor.id,tenantName:'Test',role:'owner',staffId:null,permissions:[],active:true,dataAccessExpired:false}]);
    const response=await GET(request('/api/admin/state'));
    expect(response.status).toBe(200);expect((await response.json()).selected.role).toBe('owner');expect(listMembers).not.toHaveBeenCalled();
  });
  it('rejects selecting a company without membership',async()=>{
    const response=await GET(request(`/api/admin/state?tenantId=${tenantId}`));
    expect(response.status).toBe(403);expect(listMembers).not.toHaveBeenCalled();
  });
  it('keeps the account context visible after company data access expires without loading company data',async()=>{
    vi.mocked(getIdentity).mockResolvedValue({...actor,twoFactorEnabled:true});
    vi.mocked(listMemberships).mockResolvedValue([{tenantId,userId:actor.id,tenantName:'Test',role:'owner',staffId:null,permissions:[],active:true,dataAccessExpired:true}]);
    const response=await GET(request('/api/admin/state'));
    expect(response.status).toBe(200);expect((await response.json()).selected.dataAccessExpired).toBe(true);
    expect(listMembers).not.toHaveBeenCalled();expect(scheduleState).not.toHaveBeenCalled();
  });
  it('requires identity and strict payloads for member changes',async()=>{
    const call=()=>POST(request('/api/admin/revoke-member',{tenantId,userId:'target',role:'owner'}),{params:Promise.resolve({action:'revoke-member'})});
    expect((await call()).status).toBe(400);expect(revokeMember).not.toHaveBeenCalled();
    vi.mocked(getIdentity).mockResolvedValue(null);expect((await call()).status).toBe(401);
  });
  it('keeps the identity available for MFA setup without fetching privileged schedules',async()=>{
    vi.mocked(getIdentity).mockResolvedValue({...actor,isPlatformAdmin:true});
    vi.mocked(listMemberships).mockResolvedValue([{tenantId,userId:actor.id,tenantName:'Test',role:'receptionist',staffId:null,permissions:[],active:true,dataAccessExpired:false}]);
    const response=await GET(request('/api/admin/state'));
    expect(response.status).toBe(200);expect((await response.json()).user.isPlatformAdmin).toBe(true);expect(scheduleState).not.toHaveBeenCalled();
  });
  it('returns a bounded schedule conflict envelope without customer contacts',async()=>{
    const conflict={reference:'BR-TEST',staffName:'Test Staff',start:'2026-09-08T07:00:00.000Z',end:'2026-09-08T07:30:00.000Z'};
    vi.mocked(saveSchedule).mockRejectedValue(new ScheduleConflictError([conflict],1));
    const response=await POST(request('/api/admin/save-exception',{tenantId,staffId:null,version:0,startDay:'2026-09-08',endDay:'2026-09-08',closed:true,kind:'other',intervals:[]}),{params:Promise.resolve({action:'save-exception'})});
    expect(response.status).toBe(409);expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({code:'SCHEDULE_CONFLICT',total:1,conflicts:[conflict]});
  });
});
