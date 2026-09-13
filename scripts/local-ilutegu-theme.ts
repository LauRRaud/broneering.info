import pg from 'pg';
import {isDeepStrictEqual} from 'node:util';
import {contrastIssues,themeSchema} from '../src/lib/theme-contracts';
import {iluteguDemoTheme} from './data/ilutegu-demo-theme';

const target=new URL(process.env.MIGRATION_DATABASE_URL!);
if(!['localhost','127.0.0.1'].includes(target.hostname)||target.port!=='55433')throw new Error('This script only updates the local Ilutegu demo database.');
themeSchema.parse(iluteguDemoTheme);
const issues=contrastIssues(iluteguDemoTheme);
if(issues.length)throw new Error(JSON.stringify(issues));
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
await db.connect();
try{
  await db.query('BEGIN');
  const tenant=(await db.query("SELECT id FROM tenants WHERE slug='ilutegu' AND demo=true AND active=true FOR UPDATE")).rows[0];
  if(!tenant)throw new Error('Local Ilutegu demo not found.');
  const published=(await db.query("SELECT version,config FROM theme_configs WHERE tenant_id=$1 AND status='published' FOR UPDATE",[tenant.id])).rows[0];
  if(!published)throw new Error('An existing theme is required to preserve its logo and history.');
  if(isDeepStrictEqual(published.config,iluteguDemoTheme)){
    await db.query('ROLLBACK');console.log('The local demo already has this palette.');
  }else{
    const version=(await db.query('SELECT COALESCE(max(version),0)+1 AS next FROM theme_configs WHERE tenant_id=$1',[tenant.id])).rows[0].next;
    await db.query("UPDATE theme_configs SET status='archived' WHERE tenant_id=$1 AND status='published'",[tenant.id]);
    await db.query("INSERT INTO theme_configs(tenant_id,version,status,config,created_by,logo_light,logo_dark,published_at) SELECT tenant_id,$2,'published',$3,created_by,logo_light,logo_dark,now() FROM theme_configs WHERE tenant_id=$1 AND version=$4",[tenant.id,version,JSON.stringify(iluteguDemoTheme),published.version]);
    await db.query('COMMIT');console.log(`Local Ilutegu theme ${version} published; theme ${published.version} remains in history.`);
  }
}catch(error){await db.query('ROLLBACK');throw error;}
finally{await db.end();}
