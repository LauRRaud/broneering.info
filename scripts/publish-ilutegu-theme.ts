import pg from 'pg';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {contrastIssues,themeSchema} from '../src/lib/theme-contracts';
import {iluteguDemoTheme} from './data/ilutegu-demo-theme';

const apply=process.argv.includes('--apply'),check=process.argv.includes('--check');
if(apply===check||process.env.ALLOW_DEMO_SEED!=='true'||!process.env.MIGRATION_DATABASE_URL)throw new Error('Requires exactly one of --check / --apply, ALLOW_DEMO_SEED=true and MIGRATION_DATABASE_URL.');
themeSchema.parse(iluteguDemoTheme);
if(contrastIssues(iluteguDemoTheme).length)throw new Error('The demo palette failed contrast validation.');
const logo=readFileSync(new URL('./data/ilutegu-demo-logo.webp',import.meta.url));
if(logo.length>524288||logo.toString('ascii',0,4)!=='RIFF'||logo.toString('ascii',8,12)!=='WEBP')throw new Error('Expected the normalized demo WebP logo.');
const client=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
await client.connect();
try{
  await client.query('BEGIN');
  const tenant=(await client.query("SELECT id FROM tenants WHERE slug='ilutegu' AND demo=true AND active=true FOR UPDATE")).rows[0];
  if(!tenant)throw new Error('An active Ilutegu demo is required; real tenants are never modified.');
  await client.query("SELECT set_config('app.tenant_id',$1,true)",[tenant.id]);
  const published=(await client.query("SELECT version,config,created_by,logo_light,logo_dark FROM theme_configs WHERE tenant_id=$1 AND status='published' FOR UPDATE",[tenant.id])).rows[0];
  const unchanged=published&&isDeepStrictEqual(published.config,iluteguDemoTheme)&&published.logo_light?.equals(logo)&&published.logo_dark?.equals(logo);
  let version=published?.version;
  if(!unchanged){
    version=(await client.query('SELECT COALESCE(max(version),0)+1 AS next FROM theme_configs WHERE tenant_id=$1',[tenant.id])).rows[0].next;
    await client.query("UPDATE theme_configs SET status='archived' WHERE tenant_id=$1 AND status='published'",[tenant.id]);
    await client.query("INSERT INTO theme_configs(tenant_id,version,status,config,created_by,logo_light,logo_dark,published_at) VALUES($1,$2,'published',$3,$4,$5,$5,now())",[tenant.id,version,JSON.stringify(iluteguDemoTheme),published?.created_by??null,logo]);
  }
  await client.query(apply?'COMMIT':'ROLLBACK');
  console.log(JSON.stringify({mode:apply?'applied':'checked-and-rolled-back',changed:!unchanged,previousVersion:published?.version??null,version,logoBytes:logo.length}));
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
