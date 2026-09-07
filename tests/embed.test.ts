import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {NextRequest} from 'next/server';
import {canonicalEmbedOrigin,installationCode,validEmbedMessage} from '../src/lib/embed-contracts';
import {embeddingSettings,embedOrigins,saveEmbedOrigins} from '../src/lib/embed';
import {tenantForHost} from '../src/lib/tenants';
import {pool} from '../src/lib/db';
import {proxy} from '../src/proxy';
import type {Actor} from '../src/lib/access';

describe('Embedding origin and v1 protocol',()=>{
  it('normalizes exact origins and rejects wildcards, paths and credentials',()=>{
    expect(canonicalEmbedOrigin('https://SALONG.ee:443/')).toBe('https://salong.ee');
    for(const value of ['http://salong.ee','https://*.salong.ee','https://salong.ee/page','https://u:p@salong.ee','null','javascript:alert(1)','https://salong.ee/?x=1','https://salong.ee/#x'])expect(()=>canonicalEmbedOrigin(value)).toThrow();
    expect(()=>canonicalEmbedOrigin('http://salong.localhost:3110')).toThrow();
    expect(canonicalEmbedOrigin('http://salong.localhost:3110',true)).toBe('http://salong.localhost:3110');
  });
  it('accepts only exact layout message schemas and bounded integer heights',()=>{
    const init={type:'broneering:init',version:1,channel:'a'.repeat(32)};
    expect(validEmbedMessage(init,'broneering:init')).toBe(true);
    expect(validEmbedMessage({...init,email:'private@example.invalid'},'broneering:init')).toBe(false);
    for(const height of [-1,99,20001,NaN,700.5,'700'])expect(validEmbedMessage({...init,type:'broneering:resize',height},'broneering:resize')).toBe(false);
    expect(validEmbedMessage({...init,type:'broneering:resize',height:700},'broneering:resize')).toBe(true);
    expect(validEmbedMessage({...init,channel:'x',type:'broneering:resize',height:700},'broneering:resize')).toBe(false);
  });
  it('keeps original links and safely encodes the parent origin in generated snippets',()=>{
    const code=installationCode('https://salong.broneering.info/','https://broneering.info/widget/v1.js','https://salong.ee');
    expect(code.modal).toContain('href="https://salong.broneering.info/" data-booking-modal');
    expect(code.inline).toContain('parent=https%3A%2F%2Fsalong.ee');
    expect(code.inline).toContain('Ava broneerimisleht');
    expect(code.inline).not.toContain('customer');
  });
});

describe('Domain and embedding database boundaries',()=>{
  const tenantId=randomUUID(),otherId=randomUUID(),ownerId=randomUUID(),staffId=randomUUID();
  const host=`embed-${tenantId}.localhost`;
  const owner:Actor={id:ownerId,email:`${ownerId}@example.invalid`,name:'Owner',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false};
  const staff:Actor={...owner,id:staffId,email:`${staffId}@example.invalid`,twoFactorEnabled:false};
  const admin=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
  beforeAll(async()=>{
    await admin.connect();
    await admin.query('INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,$3,$4),($5,$6,$3,$4)',[tenantId,`embed-${tenantId}`,'Embed test','Test',otherId,`embed-${otherId}`]);
    await admin.query('INSERT INTO tenant_domains(hostname,tenant_id,ready) VALUES($1,$2,false)',[host,tenantId]);
    await admin.query("INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,'Owner',$2,true,true),($3,'Staff',$4,true,false)",[ownerId,owner.email,staffId,staff.email]);
    await admin.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'receptionist')",[tenantId,ownerId,staffId]);
  });
  afterAll(async()=>{
    for(const table of ['tenant_embed_origins','access_audit_log','memberships','tenant_domains'])await admin.query(`DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`,[[tenantId,otherId]]);
    await admin.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[[tenantId,otherId]]);
    await admin.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[ownerId,staffId]]);
    await admin.query('DELETE FROM domain_reservations WHERE hostname=$1',[host]);
    await admin.end();
  });
  it('keeps a pending domain closed until HTTPS provisioning succeeds',async()=>{
    await expect(tenantForHost(host)).rejects.toMatchObject({code:'TENANT_NOT_FOUND'});
    await admin.query('UPDATE tenant_domains SET ready=true WHERE hostname=$1',[host]);
    await expect(tenantForHost(host)).resolves.toMatchObject({id:tenantId});
  });
  it('permits only the MFA owner to edit exact website origins',async()=>{
    await expect(saveEmbedOrigins(staff,tenantId,['https://salong.ee'])).rejects.toMatchObject({code:'FORBIDDEN'});
    await expect(saveEmbedOrigins(owner,otherId,['https://salong.ee'])).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
    await saveEmbedOrigins(owner,tenantId,['https://salong.ee','https://www.salong.ee','https://salong.ee/']);
    expect(await embedOrigins(tenantId)).toEqual(['https://salong.ee','https://www.salong.ee']);
    expect((await embeddingSettings(owner,tenantId)).domains).toEqual([{hostname:host,ready:true}]);
    expect((await pool().query('SELECT * FROM tenant_embed_origins WHERE tenant_id=$1',[tenantId])).rowCount).toBe(0);
  });
  it('does not erase saved settings when an invalid origin is submitted',async()=>{
    await expect(saveEmbedOrigins(owner,tenantId,['https://*.salong.ee'])).rejects.toMatchObject({code:'INVALID_EMBED_ORIGIN'});
    expect(await embedOrigins(tenantId)).toHaveLength(2);
  });
  it('sets a host-specific frame policy and closes it after removal',async()=>{
    const request=new NextRequest(`http://${host}/embed`,{headers:{host}});
    expect((await proxy(request)).headers.get('content-security-policy')).toContain('frame-ancestors https://salong.ee https://www.salong.ee;');
    await saveEmbedOrigins(owner,tenantId,[]);
    expect((await proxy(request)).headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect((await proxy(new NextRequest('http://unknown.localhost/embed',{headers:{host:'unknown.localhost'}}))).headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });
  it('does not reassign an old address after deleting its current domain row',async()=>{
    await expect(admin.query('UPDATE tenant_domains SET tenant_id=$2 WHERE hostname=$1',[host,otherId])).rejects.toMatchObject({code:'23505'});
    await admin.query('DELETE FROM tenant_domains WHERE hostname=$1',[host]);
    await expect(admin.query('INSERT INTO tenant_domains(hostname,tenant_id) VALUES($1,$2)',[host,otherId])).rejects.toMatchObject({code:'23505'});
    await admin.query('INSERT INTO tenant_domains(hostname,tenant_id) VALUES($1,$2)',[host,tenantId]);
  });
});
