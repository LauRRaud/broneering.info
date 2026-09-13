import pg from 'pg';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {iluteguDemoServices,iluteguDemoNotice} from './data/ilutegu-demo';
import {iluteguDemoTranslations} from './data/ilutegu-demo-translations';
import {iluteguDemoStaffBios} from './data/ilutegu-demo-staff';
import {iluteguDemoCompany as company} from './data/ilutegu-demo-company';
import {iluteguDemoPhones} from './data/ilutegu-demo-phones';

const descriptions:Record<string,string>=JSON.parse(readFileSync(new URL('../src/content/ilutegu-demo-descriptions.json',import.meta.url),'utf8'));
const demoStaff=[
 {key:'doris',name:'Doris',title:'Juuksur'},
 {key:'ene',name:'Ene',title:'Juuksur'},
 {key:'terje',name:'Terje',title:'Juuksur'},
 {key:'keili',name:'Keili',title:'Massöör'},
 {key:'anette',name:'Anette',title:'Ripsme- ja küünetehnik'},
] as const;
const staffByCategory:Record<string,readonly string[]>={
 Juuksur:['doris','ene','terje'],
 Massaaž:['keili'],
 Ripsmed:['anette'],
 Küünehooldus:['anette'],
};

function id(tenant:string,key:string){const hex=createHash('sha256').update(`ilutegu-demo-v1:${tenant}:${key}`).digest('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;}
async function main(){
 const apply=process.argv.includes('--apply'),check=process.argv.includes('--check');
 if(!apply&&!check){console.log(JSON.stringify({mode:'preview',services:iluteguDemoServices.length,categories:[...new Set(iluteguDemoServices.map(s=>s.path[0]))],staff:demoStaff.map(worker=>worker.name),sampleDurations:iluteguDemoServices.filter(s=>s.durationSource==='demo').length,notice:iluteguDemoNotice},null,2));return;}
 if(process.env.ALLOW_DEMO_SEED!=='true'||!process.env.MIGRATION_DATABASE_URL)throw new Error('Requires ALLOW_DEMO_SEED=true and MIGRATION_DATABASE_URL');
 const client=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});await client.connect();
 try{
  await client.query('BEGIN');
  const tenant=(await client.query("SELECT id FROM tenants WHERE slug='ilutegu' AND demo=true AND active=true FOR UPDATE")).rows[0]?.id;
  if(!tenant)throw new Error('An active Ilutegu demo must already exist; real tenants are never modified');
  await client.query("SELECT set_config('app.tenant_id',$1,true)",[tenant]);
  const staff=new Map<string,string>();
  for(const worker of demoStaff){
   const staffId=id(tenant,`staff:${worker.key}`);
   const saved=await client.query(`INSERT INTO staff(id,tenant_id,name,title,bio,public_phone) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,title=EXCLUDED.title,public_phone=CASE WHEN EXCLUDED.public_phone<>'' THEN EXCLUDED.public_phone ELSE staff.public_phone END,bio=CASE WHEN btrim(staff.bio)='' THEN EXCLUDED.bio ELSE staff.bio END,active=true,online=true,version=staff.version+1
    WHERE staff.tenant_id=EXCLUDED.tenant_id RETURNING id`,[staffId,tenant,worker.name,worker.title,iluteguDemoStaffBios[worker.name],iluteguDemoPhones[worker.name]??'']);
   if(!saved.rowCount)throw new Error(`Could not configure demo worker ${worker.name}`);
   staff.set(worker.key,staffId);
   await client.query('DELETE FROM weekly_hours WHERE tenant_id=$1 AND staff_id=$2',[tenant,staffId]);
   for(let day=1;day<=6;day++)for(const [start,end] of [[540,720],[780,1080]])await client.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) VALUES($1,$2,$3,$4,$5)',[tenant,staffId,day,start,end]);
  }
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
   const description=descriptions[service.name]??descriptions[service.name.replace(/,\s*\d+(?:[.,]\d+)?\s*(h|min)$/,'')];
   const translations=iluteguDemoTranslations[service.name];
   if(!description||!translations)throw new Error(`Missing Ilutegu demo content for ${service.name}`);
   const saved=await client.query(`INSERT INTO services(id,tenant_id,group_id,category,name,description,default_price,default_duration,buffer_after,source_language) VALUES($1,$2,$3,$4,$5,$6,$7,$8,10,'et')
    ON CONFLICT(id) DO UPDATE SET group_id=EXCLUDED.group_id,category=EXCLUDED.category,name=EXCLUDED.name,description=EXCLUDED.description,default_price=EXCLUDED.default_price,default_duration=EXCLUDED.default_duration,buffer_after=10,source_language=EXCLUDED.source_language,active=true,online=true,version=services.version+1
    WHERE services.tenant_id=EXCLUDED.tenant_id RETURNING content_version`,[serviceId,tenant,parent,service.path.at(-1),service.name,description,service.price,service.duration]);
   const contentVersion=saved.rows[0].content_version;
   for(const language of ['en','ru'] as const){
    const text=translations[language];
    await client.query(`INSERT INTO service_translations(tenant_id,service_id,language,name,description,source_version,status,origin,published_name,published_description,published_source_version)
      VALUES($1,$2,$3,$4,$5,$6,'published','manual',$4,$5,$6)
      ON CONFLICT(tenant_id,service_id,language) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,source_version=EXCLUDED.source_version,status='published',origin='manual',published_name=EXCLUDED.published_name,published_description=EXCLUDED.published_description,published_source_version=EXCLUDED.published_source_version,version=service_translations.version+1,updated_at=now()`,[tenant,serviceId,language,text.name,text.description,contentVersion]);
   }
   const selected=(staffByCategory[service.path[0]]??[]).map(key=>staff.get(key)).filter((value):value is string=>!!value);
   if(!selected.length)throw new Error(`No demo workers configured for ${service.path[0]}`);
   await client.query('UPDATE staff_services SET active=false,version=version+1 WHERE tenant_id=$1 AND service_id=$2 AND active AND NOT(staff_id=ANY($3::uuid[]))',[tenant,serviceId,selected]);
   for(const staffId of selected)await client.query(`INSERT INTO staff_services(tenant_id,staff_id,service_id,price,duration,buffer_before,buffer_after) VALUES($1,$2,$3,NULL,NULL,NULL,NULL)
    ON CONFLICT(tenant_id,staff_id,service_id) DO UPDATE SET price=NULL,duration=NULL,buffer_before=NULL,buffer_after=NULL,active=true,version=staff_services.version+1`,[tenant,staffId,serviceId]);
  }
  await client.query('UPDATE service_groups SET active=false,version=version+1 WHERE tenant_id=$1 AND active AND NOT(id=ANY($2::uuid[]))',[tenant,[...groups.values()]]);
  // Keep historic services and their booking references; replace only the visible demo catalogue.
  const hidden=await client.query('UPDATE services SET online=false,version=version+1 WHERE tenant_id=$1 AND online AND NOT(id=ANY($2::uuid[]))',[tenant,ids]);
  await client.query('UPDATE tenants SET address=$2,description=$3,contact_phone=$4,contact_email=$5,booking_terms=$6 WHERE id=$1',[tenant,company.address,company.description,company.phone,company.email,iluteguDemoNotice]);
  const count=(await client.query('SELECT count(*)::int n FROM services WHERE tenant_id=$1 AND online AND active',[tenant])).rows[0].n;
  if(count!==iluteguDemoServices.length)throw new Error('Unexpected demo catalogue count');
  const translationCount=(await client.query("SELECT count(*)::int n FROM service_translations tr JOIN services s ON s.tenant_id=tr.tenant_id AND s.id=tr.service_id WHERE tr.tenant_id=$1 AND s.online AND s.active AND tr.status='published' AND tr.published_source_version=s.content_version AND tr.language IN ('en','ru')",[tenant])).rows[0].n;
  if(translationCount!==iluteguDemoServices.length*2)throw new Error('Unexpected demo translation count');
  await client.query(apply?'COMMIT':'ROLLBACK');
  console.log(JSON.stringify({mode:apply?'applied':'checked-and-rolled-back',tenant,services:count,translations:translationCount,groups:groups.size,staff:demoStaff.length,previouslyVisibleServicesHidden:hidden.rowCount,sampleDurations:26}));
 }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Demo update failed');process.exitCode=1;});
