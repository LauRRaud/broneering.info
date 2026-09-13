import pg from 'pg';
import {iluteguDemoCompany as company} from './data/ilutegu-demo-company';
const target=new URL(process.env.MIGRATION_DATABASE_URL!);
if(!['localhost','127.0.0.1'].includes(target.hostname)||target.port!=='55433')throw new Error('This script only updates the local Ilutegu demo database.');
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
await db.connect();
try{
  const result=await db.query("UPDATE tenants SET address=$1,description=$2,contact_phone=$3,contact_email=$4 WHERE slug='ilutegu' AND demo=true AND active=true RETURNING name",[company.address,company.description,company.phone,company.email]);
  if(result.rowCount!==1)throw new Error('Local Ilutegu demo not found.');
  console.log('Updated the local Ilutegu address and public contact information.');
}finally{await db.end();}
