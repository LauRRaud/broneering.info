import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';
import {themeState,changeTheme,changeThemeLogo,themeLogo,publishedTheme,normalizeLogo,themePreviewTenant} from '../src/lib/themes';
import {catalogFor,availableOffers} from '../src/lib/availability';
import {defaultTheme,contrastIssues,contrastRatio,type ThemeState} from '../src/lib/theme-contracts';
import {withTenant} from '../src/lib/db';
import type {Actor} from '../src/lib/access';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
let id:string,other:string,owner:Actor,clerk:Actor;
const expected=(state:ThemeState)=>({tenantId:id,version:state.draft?.version??null,revision:state.draft?.revision??null,publishedVersion:state.published?.version??null});
beforeAll(()=>db.connect());afterAll(()=>db.end());
beforeEach(async()=>{
  id=randomUUID();other=randomUUID();
  for(const value of [id,other])await db.query("INSERT INTO tenants(id,slug,name,address,public_state) VALUES($1,$2,'Theme test','Test','published')",[value,'theme-'+value]);
  const actors:Actor[]=[];
  for(const role of ['owner','receptionist']){const userId=randomUUID();actors.push({id:userId,name:role,email:userId+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:false});await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled) VALUES($1,$2,$3,true,true)',[userId,role,userId+'@example.invalid']);await db.query('INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,$3)',[id,userId,role]);}
  [owner,clerk]=actors;
});
afterEach(async()=>{for(const table of ['theme_configs','access_audit_log','memberships'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[[id,other]]);await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[[id,other]]);await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[owner.id,clerk.id]]);});
async function draft(config=structuredClone(defaultTheme)){return changeTheme(owner,{...expected(await themeState(owner,id)),action:'save',config});}
async function publish(state:ThemeState){return changeTheme(owner,{...expected(state),action:'publish'});}
it('publishes the header identity choice without deleting the saved logo and restores the earlier choice',async()=>{
  const image=await sharp({create:{width:40,height:20,channels:4,background:'#ff000080'}}).png().toBuffer();
  let state=await draft({...defaultTheme,brandDisplay:'logo'});
  state=await changeThemeLogo(owner,{...expected(state),slot:'light'},image);
  const first=await publish(state);
  expect((await withTenant(id,c=>publishedTheme(c,id))).config.brandDisplay).toBe('logo');
  state=await draft({...defaultTheme,brandDisplay:'name'});
  expect(state.draft!.lightLogo).toBeDefined();
  expect((await withTenant(id,c=>publishedTheme(c,id))).config.brandDisplay).toBe('logo');
  state=await publish(state);
  expect((await withTenant(id,c=>publishedTheme(c,id))).config.brandDisplay).toBe('name');
  expect(state.published!.lightLogo).toBeDefined();
  state=await changeTheme(owner,{...expected(state),action:'restore',restoreVersion:first.published!.version});
  expect(state.draft!.config.brandDisplay).toBe('logo');
  await expect(draft({...defaultTheme,brandDisplay:'both' as any})).rejects.toMatchObject({code:'INVALID_THEME'});
});
it('checks known contrast ratios without rounding a failing value up, including dark and calendar pairs',()=>{
  expect(contrastRatio('#000000','#ffffff')).toBe(21);expect(contrastIssues(defaultTheme)).toEqual([]);
  const config=structuredClone(defaultTheme);config.dark.selectedText=config.dark.selected;config.light.text='#777777';config.light.background='#ffffff';
  const issues=contrastIssues(config);expect(issues).toContainEqual(expect.objectContaining({mode:'dark',foreground:'selectedText',ratio:1}));expect(issues).toContainEqual(expect.objectContaining({mode:'light',foreground:'text',background:'background',minimum:4.5}));
});
it('keeps draft private, rejects unsafe publication and enforces fresh permissions and tenant isolation',async()=>{
  const config=structuredClone(defaultTheme);config.light.buttonText=config.light.button;
  const state=await draft(config);expect(await withTenant(id,c=>publishedTheme(c,id))).toEqual({config:defaultTheme});
  await expect(publish(state)).rejects.toMatchObject({code:'THEME_CONTRAST'});
  await expect(themeState(owner,other)).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
  await expect(themeState(clerk,id)).rejects.toMatchObject({code:'FORBIDDEN'});
  await db.query("UPDATE memberships SET permissions='[\"theme.publish\"]' WHERE tenant_id=$1 AND user_id=$2",[id,clerk.id]);
  expect((await themeState(clerk,id)).draft?.version).toBe(state.draft?.version);
  await db.query('UPDATE memberships SET active=false WHERE tenant_id=$1 AND user_id=$2',[id,clerk.id]);
  await expect(changeTheme(clerk,{...expected(state),action:'save',config:defaultTheme})).rejects.toMatchObject({code:'MEMBERSHIP_REQUIRED'});
});
it('rejects stale edits and simultaneous draft creation and restores immutable published snapshots',async()=>{
  const empty=await themeState(owner,id),state=await draft();
  await expect(changeTheme(owner,{...expected(empty),action:'save',config:defaultTheme})).rejects.toMatchObject({code:'VERSION_CONFLICT'});
  const first=await publish(state),edited=structuredClone(defaultTheme);edited.font='serif';
  const secondDraft=await draft(edited);
  await expect(publish(state)).rejects.toMatchObject({code:'VERSION_CONFLICT'});
  const second=await publish(secondDraft);expect(second.history[0].version).toBe(first.published!.version);
  await expect(withTenant(id,c=>c.query('UPDATE theme_configs SET config=$3 WHERE tenant_id=$1 AND version=$2',[id,first.published!.version,edited]))).rejects.toBeDefined();
  const restored=await changeTheme(owner,{...expected(second),action:'restore',restoreVersion:first.published!.version});
  expect(restored.draft!.config.font).toBe('system');expect((await withTenant(id,c=>publishedTheme(c,id))).config.font).toBe('serif');
  await publish(restored);expect((await withTenant(id,c=>publishedTheme(c,id))).config.font).toBe('system');
});
it('preserves logo alpha, hides draft and archived images, restores both variants and rejects cross-tenant URLs',async()=>{
  const image=await sharp({create:{width:40,height:20,channels:4,background:'#ff000080'}}).png().toBuffer();
  let state=await draft();state=await changeThemeLogo(owner,{...expected(state),slot:'light'},image);state=await changeThemeLogo(owner,{...expected(state),slot:'dark'},image);
  await expect(themeLogo(id,state.draft!.version,'light')).rejects.toMatchObject({status:404});
  const preview=await themeLogo(id,state.draft!.version,'light',owner);expect((await sharp(Buffer.from(await preview.arrayBuffer())).metadata()).hasAlpha).toBe(true);
  const first=await publish(state);expect((await themeLogo(id,first.published!.version,'light')).headers.get('content-type')).toBe('image/webp');
  await expect(themeLogo(other,first.published!.version,'light')).rejects.toMatchObject({status:404});
  expect(await withTenant(other,c=>publishedTheme(c,id))).toEqual({config:defaultTheme});
  state=await draft();state=await changeThemeLogo(owner,{...expected(state),slot:'light'},null);state=await publish(state);
  expect(state.published!.lightLogo).toBeUndefined();expect(state.published!.darkLogo).toBeDefined();await expect(themeLogo(id,first.published!.version,'light')).rejects.toMatchObject({status:404});
  state=await changeTheme(owner,{...expected(state),action:'restore',restoreVersion:first.published!.version});state=await publish(state);expect(state.published!.lightLogo).toBeDefined();expect(state.published!.darkLogo).toBeDefined();
});
it('accepts only normalized raster logos and strict theme values',async()=>{
  await expect(normalizeLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).rejects.toMatchObject({code:'INVALID_LOGO'});
  await expect(draft({...defaultTheme,font:'url(https://example.invalid/font)' as any})).rejects.toMatchObject({code:'INVALID_THEME'});
  await expect(draft({...defaultTheme,light:{...defaultTheme.light,background:'red;display:none'}})).rejects.toMatchObject({code:'INVALID_THEME'});
});
it('also accepts opaque logos and keeps their background',async()=>{
  const input=await sharp({create:{width:10,height:10,channels:3,background:'#aa4400'}}).jpeg().toBuffer();
  const output=await normalizeLogo(input);expect((await sharp(output).metadata()).hasAlpha).toBe(false);
  const pixel=await sharp(output).raw().toBuffer();expect(pixel[0]).toBeGreaterThan(150);expect(pixel[1]).toBeGreaterThan(45);expect(pixel[2]).toBeLessThan(30);
});
it('allows read-only design preview on a published real tenant without relaxing the booking preview',async()=>{
  await db.query('UPDATE tenants SET demo=false WHERE id=$1',[id]);
  const tenant=await themePreviewTenant(owner,id);
  expect(tenant.demo).toBe(false);expect(tenant.public_state).toBe('published');
  await expect(catalogFor(tenant,undefined,owner)).rejects.toMatchObject({code:'PREVIEW_CLOSED'});
  expect((await catalogFor(tenant,undefined,owner,true)).tenant.name).toBe('Theme test');
  await expect(catalogFor(tenant,undefined,clerk,true)).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(availableOffers(tenant,randomUUID(),'2026-09-13',undefined,clerk,true)).rejects.toMatchObject({code:'FORBIDDEN'});
});
it('serializes two simultaneous attempts to create the first draft',async()=>{
  const input={...expected(await themeState(owner,id)),action:'save',config:defaultTheme};
  const results=await Promise.allSettled([changeTheme(owner,input),changeTheme(owner,input)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'VERSION_CONFLICT'}});
  expect((await db.query('SELECT count(*)::int AS n FROM theme_configs WHERE tenant_id=$1',[id])).rows[0].n).toBe(1);
});

it('publishes independent icon, navigation and typography settings while accepting earlier theme snapshots',async()=>{
 const original=structuredClone(defaultTheme),config={...original,font:'modern' as const,headingFont:'editorial' as const,light:{...original.light,icons:'#675021',navigation:'#57401B',cardBorder:'#EFEAE0',mutedText:'#676057'}};
 expect(contrastIssues(config)).toEqual([]);
 const state=await publish(await draft(config));
 expect(state.published!.config).toMatchObject(config);
 expect(contrastIssues({...config,light:{...config.light,icons:'#FFFFFE'}})).toContainEqual(expect.objectContaining({foreground:'icons'}));
});
