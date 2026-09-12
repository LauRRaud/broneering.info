import pg from 'pg';
import {createHash} from 'node:crypto';
import {iluteguDemoServices,iluteguDemoNotice} from './data/ilutegu-demo';

function id(tenant:string,key:string){const hex=createHash('sha256').update(`ilutegu-demo-v1:${tenant}:${key}`).digest('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;}
async function main(){
 const apply=process.argv.includes('--apply'),check=process.argv.includes('--check');
 if(!apply&&!check){console.log(JSON.stringify({mode:'preview',services:iluteguDemoServices.length,categories:[...new Set(iluteguDemoServices.map(s=>s.path[0]))],sampleDurations:iluteguDemoServices.filter(s=>s.durationSource==='demo').length,notice:iluteguDemoNotice},null,2));return;}
 if(process.env.ALLOW_DEMO_SEED!=='true'||!process.env.MIGRATION_DATABASE_URL)throw new Error('Requires ALLOW_DEMO_SEED=true and MIGRATION_DATABASE_URL');
 const client=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await client.connect();
 try{
  await client.query('BEGIN');
  const tenant=(await client.query("SELECT id FROM tenants WHERE slug='ilutegu' AND demo=true AND active=true FOR UPDATE")).rows[0]?.id;
  if(!tenant)throw new Error('An active Ilutegu demo must already exist; real tenants are never modified');
  await client.query("SELECT set_config('app.tenant_id',$1,true)",[tenant]);
  const staff=(await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND active AND online ORDER BY name,id',[tenant])).rows;
  if(!staff.length)throw new Error('The demo needs existing fictional staff and schedules');
  const groups=new Map<string,string>();const ids:string[]=[];
  for(const service of iluteguDemoServices){
   let parent:string|null=null;
   for(let depth=1;depth<=service.path.length;depth++){
    const path=service.path.slice(0,depth),key=JSON.stringify(path);
    if(!groups.has(key)){
     const row=await client.query('INSERT INTO service_groups(tenant_id,name,parent_id) VALUES($1,$2,$3) ON CONFLICT(tenant_id,parent_id,name) DO UPDATE SET active=true,version=service_groups.version+1 RETURNING id',[tenant,path.at(-1),parent]);
     groups.set(key,row.rows[0].id);
    }
    parent=groups.get(key)!;
   }
   const serviceId=id(tenant,service.key);ids.push(serviceId);
   const description=service.durationSource==='demo'?`Näidiskestus ${service.duration} min. Ilutegu peab tegeliku kestuse enne päriskasutust kinnitama.`:'Kestus ja hind pärinevad omaniku esitatud hinnakirja kuvatõmmiselt.';
   await client.query(`INSERT INTO services(id,tenant_id,group_id,category,name,description,default_price,default_duration,buffer_after,source_language) VALUES($1,$2,$3,$4,$5,$6,$7,$8,10,'et')
    ON CONFLICT(id) DO UPDATE SET group_id=EXCLUDED.group_id,category=EXCLUDED.category,name=EXCLUDED.name,description=EXCLUDED.description,default_price=EXCLUDED.default_price,default_duration=EXCLUDED.default_duration,buffer_after=10,active=true,online=true,version=services.version+1
    WHERE services.tenant_id=EXCLUDED.tenant_id`,[serviceId,tenant,parent,service.path.at(-1),service.name,description,service.price,service.duration]);
   const selected=service.path[0]==='Juuksur'?staff:[staff[staff.length-1]];
   for(const worker of selected)await client.query(`INSERT INTO staff_services(tenant_id,staff_id,service_id,price,duration,buffer_before,buffer_after) VALUES($1,$2,$3,NULL,NULL,NULL,NULL)
    ON CONFLICT(tenant_id,staff_id,service_id) DO UPDATE SET price=NULL,duration=NULL,buffer_before=NULL,buffer_after=NULL,active=true,version=staff_services.version+1`,[tenant,worker.id,serviceId]);
  }
  const nails=groups.get(JSON.stringify(['Küünehooldus']));
  if(!nails)throw new Error('Missing nail-care parent');
  const manicure=await client.query("INSERT INTO service_groups(tenant_id,name,parent_id) VALUES($1,'Maniküür',$2) ON CONFLICT(tenant_id,parent_id,name) DO UPDATE SET active=true,version=service_groups.version+1 RETURNING id",[tenant,nails]);
  groups.set(JSON.stringify(['Küünehooldus','Maniküür']),manicure.rows[0].id);
  await client.query('UPDATE service_groups SET active=false,version=version+1 WHERE tenant_id=$1 AND active AND NOT(id=ANY($2::uuid[]))',[tenant,[...groups.values()]]);
  // Keep historic services and their booking references; replace only the visible demo catalogue.
  const hidden=await client.query('UPDATE services SET online=false,version=version+1 WHERE tenant_id=$1 AND online AND NOT(id=ANY($2::uuid[]))',[tenant,ids]);
  await client.query('UPDATE tenants SET description=$2,booking_terms=$2 WHERE id=$1',[tenant,iluteguDemoNotice]);
  const count=(await client.query('SELECT count(*)::int n FROM services WHERE tenant_id=$1 AND online AND active',[tenant])).rows[0].n;
  if(count!==iluteguDemoServices.length)throw new Error('Unexpected demo catalogue count');
  await client.query(apply?'COMMIT':'ROLLBACK');
  console.log(JSON.stringify({mode:apply?'applied':'checked-and-rolled-back',tenant,services:count,groups:groups.size,previouslyVisibleServicesHidden:hidden.rowCount,sampleDurations:26}));
 }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Demo update failed');process.exitCode=1;});
