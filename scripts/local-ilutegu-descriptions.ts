import pg from 'pg';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
const target=new URL(process.env.MIGRATION_DATABASE_URL!);
if(!['localhost','127.0.0.1'].includes(target.hostname)||target.port!=='55433')throw new Error('This script is for the local Ilutegu preview database only.');
const descriptions:Record<string,string>=JSON.parse(readFileSync(new URL('../src/content/ilutegu-demo-descriptions.json',import.meta.url),'utf8'));
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
await db.connect();
try {
  await db.query('BEGIN');
  const rows=(await db.query("SELECT s.id,s.tenant_id,s.name,s.description,s.version FROM services s JOIN tenants t ON t.id=s.tenant_id WHERE t.slug='ilutegu' AND t.demo=true AND s.active AND (s.description LIKE 'Näidiskestus %' OR s.description LIKE 'Kestus ja hind pärinevad %') FOR UPDATE OF s")).rows;
  const updates=rows.map(row=>({...row,next:descriptions[row.name]??descriptions[row.name.replace(/,\s*\d+(?:[.,]\d+)?\s*(h|min)$/, '')]}));
  if(updates.some(row=>!row.next))throw new Error('Missing service description; no data changed.');
  mkdirSync(new URL('../output/',import.meta.url),{recursive:true});
  const backup=new URL('../output/ilutegu-service-descriptions-before-design.json',import.meta.url);
  if(rows.length&&!existsSync(backup))writeFileSync(backup,JSON.stringify(rows,null,2)+'\n');
  for(const row of updates)await db.query('UPDATE services SET description=$3,version=version+1 WHERE tenant_id=$1 AND id=$2 AND version=$4',[row.tenant_id,row.id,row.next,row.version]);
  await db.query('COMMIT');console.log('Updated '+rows.length+' local demo descriptions. Existing custom descriptions, prices and durations are preserved.');
} catch(error) {await db.query('ROLLBACK');throw error;}
finally{await db.end();}
