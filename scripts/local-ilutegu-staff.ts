import pg from 'pg';
import {iluteguDemoStaffBios} from './data/ilutegu-demo-staff';

const target=new URL(process.env.MIGRATION_DATABASE_URL!);
if(!['localhost','127.0.0.1'].includes(target.hostname)||target.port!=='55433')throw new Error('This script only updates the local Ilutegu demo database.');
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
await db.connect();
try{
  await db.query('BEGIN');
  const tenant=(await db.query("SELECT id FROM tenants WHERE slug='ilutegu' AND demo=true AND active=true FOR UPDATE")).rows[0];
  if(!tenant)throw new Error('Local Ilutegu demo not found.');
  let count=0;
  for(const [name,bio] of Object.entries(iluteguDemoStaffBios)){
    const result=await db.query("UPDATE staff SET bio=$3,version=version+1 WHERE tenant_id=$1 AND name=$2 AND active AND btrim(bio)=''",[tenant.id,name,bio]);
    count+=result.rowCount??0;
  }
  await db.query('COMMIT');console.log(`Added ${count} local demo biographies. Existing profiles were preserved.`);
}catch(error){await db.query('ROLLBACK');throw error;}
finally{await db.end();}
