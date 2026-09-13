import pg from 'pg';
import {iluteguDemoPhones} from './data/ilutegu-demo-phones';
const target=new URL(process.env.MIGRATION_DATABASE_URL!);
if(!['localhost','127.0.0.1'].includes(target.hostname)||target.port!=='55433')throw new Error('This script only updates the local Ilutegu demo database.');
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
await db.connect();
try{
  await db.query('BEGIN');
  const tenant=(await db.query("SELECT id FROM tenants WHERE slug='ilutegu' AND demo=true AND active=true FOR UPDATE")).rows[0];
  if(!tenant)throw new Error('Local Ilutegu demo not found.');
  for(const [name,phone] of Object.entries(iluteguDemoPhones)){
    await db.query('UPDATE staff SET public_phone=$3,version=version+1 WHERE tenant_id=$1 AND name=$2 AND active=true AND public_phone IS DISTINCT FROM $3',[tenant.id,name,phone]);
  }
  await db.query('COMMIT');
  console.log('Saved the four supplied employee phone numbers in the local Ilutegu demo.');
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}
