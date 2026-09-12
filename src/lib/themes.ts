import {z} from 'zod';
import type {PoolClient} from 'pg';
import sharp from 'sharp';
import {withTenant} from './db';
import {requireMembershipInClient,audit,type Actor} from './access';
import {AppError} from './errors';
import type {Tenant} from './tenants';
import {contrastIssues,defaultTheme,themeSchema,type PublicTheme,type ThemeState,type ThemeDraft} from './theme-contracts';

const tenantIdSchema=z.uuid();
const expectedSchema=z.object({tenantId:z.uuid(),version:z.number().int().positive().nullable(),revision:z.number().int().positive().nullable(),publishedVersion:z.number().int().positive().nullable()});
const changeSchema=expectedSchema.extend({action:z.enum(['save','publish','restore']),config:themeSchema.optional(),restoreVersion:z.number().int().positive().optional()}).strict();
const logoSchema=expectedSchema.extend({slot:z.enum(['light','dark'])}).strict();
function parse<T>(schema:z.ZodType<T>,raw:unknown):T{const result=schema.safeParse(raw);if(!result.success)throw new AppError(400,'INVALID_THEME','Kujunduse andmed ei ole korrektsed.');return result.data;}
async function context(c:PoolClient,actor:Actor,tenantId:string){
  if(!(await c.query('SELECT id FROM tenants WHERE id=$1 AND active FOR UPDATE',[tenantId])).rowCount)throw new AppError(404,'NOT_FOUND','Ettevõtet ei leitud.');
  await requireMembershipInClient(actor,tenantId,'theme.publish',c);
}
function publicView(row:any,tenantId:string,admin=false):ThemeDraft{
  const logo=(slot:string)=>admin?`/api/admin/theme-logo?tenantId=${tenantId}&version=${row.version}&revision=${row.revision}&slot=${slot}`:`/api/theme-logo?version=${row.version}&slot=${slot}`;
  return {version:row.version,revision:row.revision,config:themeSchema.safeParse(row.config).success?row.config:defaultTheme,...(row.has_light?{lightLogo:logo('light')}:{}),...(row.has_dark?{darkLogo:logo('dark')}:{})};
}
const columns='version,revision,status,config,published_at,logo_light IS NOT NULL AS has_light,logo_dark IS NOT NULL AS has_dark';
async function stateIn(c:PoolClient,tenantId:string):Promise<ThemeState>{
  const rows=(await c.query(`SELECT ${columns} FROM theme_configs WHERE tenant_id=$1 ORDER BY version DESC`,[tenantId])).rows;
  const draft=rows.find(r=>r.status==='draft'),published=rows.find(r=>r.status==='published');
  return {draft:draft?publicView(draft,tenantId,true):null,published:published?publicView(published,tenantId,true):null,history:rows.filter(r=>r.status==='archived'&&r.published_at).map(r=>({version:r.version,publishedAt:r.published_at.toISOString()}))};
}
export async function themeState(actor:Actor,id:string){const tenantId=parse(tenantIdSchema,id);return withTenant(tenantId,async c=>{await context(c,actor,tenantId);return stateIn(c,tenantId);});}
export async function themePreviewTenant(actor:Actor,id:string):Promise<Tenant>{const tenantId=parse(tenantIdSchema,id);return withTenant(tenantId,async c=>{await context(c,actor,tenantId);return (await c.query<Tenant>('SELECT * FROM tenants WHERE id=$1',[tenantId])).rows[0];});}
export async function publishedTheme(c:PoolClient,tenantId:string):Promise<PublicTheme>{
  const row=(await c.query(`SELECT ${columns} FROM theme_configs WHERE tenant_id=$1 AND status='published'`,[tenantId])).rows[0];
  if(!row)return {config:defaultTheme};return publicView(row,tenantId);
}
async function checkExpected(c:PoolClient,d:z.infer<typeof expectedSchema>){
  const state=await stateIn(c,d.tenantId);
  if((state.draft?.version??null)!==d.version||(state.draft?.revision??null)!==d.revision||(state.published?.version??null)!==d.publishedVersion)throw new AppError(409,'VERSION_CONFLICT','Kujundust on teises aknas muudetud. Laadi kujundus uuesti.');
  return state;
}
async function createDraft(c:PoolClient,actor:Actor,tenantId:string,sourceVersion:number|null,config:unknown){
  const version=(await c.query('SELECT COALESCE(max(version),0)+1 AS next FROM theme_configs WHERE tenant_id=$1',[tenantId])).rows[0].next;
  await c.query(`INSERT INTO theme_configs(tenant_id,version,config,created_by,logo_light,logo_dark) VALUES($1,$2,$3,$4,(SELECT logo_light FROM theme_configs WHERE tenant_id=$1 AND version=$5),(SELECT logo_dark FROM theme_configs WHERE tenant_id=$1 AND version=$5))`,[tenantId,version,config,actor.id,sourceVersion]);
}
export async function changeTheme(actor:Actor,raw:unknown):Promise<ThemeState>{
  const d=parse(changeSchema,raw);
  return withTenant(d.tenantId,async c=>{
    await context(c,actor,d.tenantId);const state=await checkExpected(c,d);
    if(d.action==='save'){
      const config=parse(themeSchema,d.config);
      if(state.draft)await c.query("UPDATE theme_configs SET config=$3,revision=revision+1 WHERE tenant_id=$1 AND version=$2 AND status='draft'",[d.tenantId,state.draft.version,config]);
      else await createDraft(c,actor,d.tenantId,state.published?.version??null,config);
    }else if(d.action==='publish'){
      if(!state.draft)throw new AppError(409,'NO_DRAFT','Salvesta kõigepealt mustand.');
      if(contrastIssues(state.draft.config).length)throw new AppError(400,'THEME_CONTRAST','Paranda enne avaldamist esiletõstetud värvikontrastid.');
      await c.query("UPDATE theme_configs SET status='archived' WHERE tenant_id=$1 AND status='published'",[d.tenantId]);
      await c.query("UPDATE theme_configs SET status='published',published_at=now() WHERE tenant_id=$1 AND version=$2 AND status='draft'",[d.tenantId,state.draft.version]);
    }else{
      const source=(await c.query("SELECT config,logo_light,logo_dark FROM theme_configs WHERE tenant_id=$1 AND version=$2 AND published_at IS NOT NULL",[d.tenantId,d.restoreVersion??0])).rows[0];
      if(!source)throw new AppError(404,'NOT_FOUND','Varasemat kujundust ei leitud.');
      if(state.draft)await c.query("UPDATE theme_configs SET config=$3,logo_light=$4,logo_dark=$5,revision=revision+1 WHERE tenant_id=$1 AND version=$2 AND status='draft'",[d.tenantId,state.draft.version,source.config,source.logo_light,source.logo_dark]);
      else await createDraft(c,actor,d.tenantId,d.restoreVersion!,source.config);
    }
    await audit(c,d.tenantId,actor.id,'theme.'+d.action,undefined,undefined,{draftVersion:d.version,sourceVersion:d.restoreVersion??null});
    return stateIn(c,d.tenantId);
  });
}
export async function normalizeLogo(bytes:Buffer){
  try{
    if(!bytes.length||bytes.length>10*1024*1024)throw new Error();
    const image=sharp(bytes,{limitInputPixels:40_000_000,failOn:'warning'}),meta=await image.metadata();
    if(!['png','webp','jpeg'].includes(meta.format??'')||(meta.pages??1)!==1)throw new Error();
    const output=await image.rotate().resize(800,400,{fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();
    if(output.length>524288)throw new Error();return output;
  }catch{throw new AppError(400,'INVALID_LOGO','Vali PNG-, WebP- või JPG-logo kuni 10 MB ja 40 megapikslit.');}
}
export async function changeThemeLogo(actor:Actor,raw:unknown,bytes:Buffer|null){
  const d=parse(logoSchema,raw);await themeState(actor,d.tenantId);
  const logo=bytes===null?null:await normalizeLogo(bytes);
  return withTenant(d.tenantId,async c=>{
    await context(c,actor,d.tenantId);const state=await checkExpected(c,d);
    if(!state.draft)throw new AppError(409,'NO_DRAFT','Salvesta kõigepealt mustand.');
    const column=d.slot==='light'?'logo_light':'logo_dark';
    await c.query(`UPDATE theme_configs SET ${column}=$3,revision=revision+1 WHERE tenant_id=$1 AND version=$2 AND status='draft'`,[d.tenantId,state.draft.version,logo]);
    await audit(c,d.tenantId,actor.id,'theme.logo',undefined,undefined,{slot:d.slot,bytes:logo?.length??0});return stateIn(c,d.tenantId);
  });
}
export async function themeLogo(id:string,version:number,slot:string,actor?:Actor){
  const d=parse(z.object({id:z.uuid(),version:z.number().int().positive(),slot:z.enum(['light','dark'])}),{id,version,slot});
  return withTenant(d.id,async c=>{
    if(actor)await context(c,actor,d.id);
    const column=d.slot==='light'?'logo_light':'logo_dark';
    const row=(await c.query(`SELECT tc.${column} AS image FROM theme_configs tc JOIN tenants t ON t.id=tc.tenant_id WHERE tc.tenant_id=$1 AND tc.version=$2 AND tc.${column} IS NOT NULL AND ($3::boolean OR (tc.status='published' AND t.active AND t.public_state='published' AND (t.booking_stops_at IS NULL OR t.booking_stops_at>now())))`,[d.id,d.version,!!actor])).rows[0];
    if(!row)throw new AppError(404,'NOT_FOUND','Logo ei ole avaldatud.');
    return new Response(new Uint8Array(row.image),{headers:{'Content-Type':'image/webp','Cache-Control':'no-store','Vary':'Host, Cookie','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  });
}
