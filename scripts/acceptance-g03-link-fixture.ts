import pg from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
const directory='output/playwright/acceptance-g03';
if(process.env.AUTH_BASE_URL!=='http://haldus.localhost:3108'||new URL(process.env.MIGRATION_DATABASE_URL!).hostname!=='127.0.0.1')throw Error('Local G03 environment required');
const fixture=JSON.parse(await readFile(`${directory}/fixture.json`,'utf8'));
const database=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await database.connect();
try{
 const [own,foreign]=fixture.tenants;
 fixture.links={};
 for(const [kind,tenant,index] of [['valid',own,0],['expired',own,1],['revoked',foreign,0],['foreign',foreign,1]] as const){
  const token=randomBytes(32).toString('base64url');
  await database.query('INSERT INTO booking_management_tokens(tenant_id,booking_id,token_hash,expires_at,after_end_hours,revoked_at) VALUES($1,$2,$3,now()+$4*interval \'1 hour\',24,CASE WHEN $5 THEN now() ELSE NULL END)',[tenant.id,tenant.bookings[index],createHash('sha256').update(token).digest('hex'),kind==='expired'?-1:24,kind==='revoked']);
  fixture.links[kind]={token,tenantId:tenant.id,bookingId:tenant.bookings[index],slug:tenant.slug};
 }
 await database.query("UPDATE tenants SET contact_email='g03-contact@example.invalid',contact_phone='+372 5555 0100' WHERE id=ANY($1::uuid[])",[fixture.tenants.map((tenant:any)=>tenant.id)]);
 await writeFile(`${directory}/fixture.json`,JSON.stringify(fixture));
 console.log('Four synthetic management-link cases ready');
}finally{await database.end();}
