import pg from 'pg';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {claimExport,produceExport} from '../src/lib/export-worker';
import {removePrivateFile} from '../src/lib/private-files';
import {pool} from '../src/lib/db';

const base='http://haldus.localhost:3108',directory='output/playwright/acceptance-g03';
if(process.env.AUTH_BASE_URL!==base||new URL(process.env.MIGRATION_DATABASE_URL!).hostname!=='127.0.0.1')throw Error('Local G03 environment required');
const fixture=JSON.parse(await readFile(`${directory}/fixture.json`,'utf8'));
const [own,foreign]=fixture.tenants;
const database=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
await database.connect();
const results:any[]=[];
async function check(label:string,role:string,path:string,expected:number,body?:unknown,method=body===undefined?'GET':'POST',verify?:(value:any,response:Response)=>void){
 const row:any={label,role,method,path,expected,pass:false};results.push(row);
 try{
  const response=await fetch(base+path,{method,redirect:'manual',headers:{origin:base,'content-type':typeof body==='string'?'text/csv':'application/json','idempotency-key':randomUUID(),...(fixture.users[role]?{cookie:`better-auth.session_token=${fixture.users[role].cookie}`}:{})},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
  const raw=await response.text();let value:any;try{value=JSON.parse(raw);}catch{value=raw;}
  row.status=response.status;row.code=value?.code??null;
  assert.equal(response.status,expected,`${label}: ${raw.slice(0,300)}`);
  assert.match(response.headers.get('cache-control')??'',/no-store/);
  verify?.(value,response);row.pass=true;return value;
 }catch(error){row.failure=String(error);return undefined;}
}
async function fingerprint(){
 const data:any={};
 for(const table of ['tenants','memberships','services','service_translations','staff','staff_services','weekly_hours','customers','bookings','outbox','booking_events','booking_commands','retention_policies','tenant_embed_origins','export_jobs','import_batches','media','subscriptions','invoices','payment_records','billing_commands','company_provision_requests']){
  data[table]=(await database.query(`SELECT to_jsonb(record) row FROM ${table} record WHERE ${table==='tenants'?'id':'tenant_id'}=ANY($1::uuid[]) ORDER BY to_jsonb(record)::text`,[[own.id,foreign.id]])).rows;
 }
 data.issuer=(await database.query('SELECT to_jsonb(record) row FROM billing_issuer_versions record ORDER BY version')).rows;
 return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
const party={name:'G03 Synthetic',registrationCode:'12345678',address:'Synthetic address',country:'EE',vatNumber:'',email:'g03@example.invalid'};
const identity=(tenant:any)=>({tenantId:tenant.id,requestKey:randomUUID()});
try{
 const before=await fingerprint();
 for(const tenant of [own,foreign]){
  for(const role of ['owner','receptionist','staff','platform','anonymous']){
   const isOwner=tenant===own&&role==='owner',denied=role==='anonymous'?401:403;
   for(const route of ['onboarding','translations'])await check(`${route} ${tenant===own?'own':'foreign'}`,role,`/api/admin/${route}?tenantId=${tenant.id}`,isOwner?200:denied);
   await check('Customer privacy preview',role,`/api/admin/customers/privacy?tenantId=${tenant.id}&customerId=${tenant.customers[0]}`,isOwner?200:denied);
   await check('Company invitation state is platform only',role,`/api/admin/companies?tenantId=${tenant.id}`,role==='platform'?200:denied);
   for(const view of ['invoice','payment-link','payments','checkout','print'])await check(`Billing ${view} object access`,role,`/api/admin/billing?tenantId=${tenant.id}&view=${view}&id=${randomUUID()}`,isOwner?(view==='payments'?200:404):denied);
   await check('Billing issuer is platform only',role,`/api/admin/billing?tenantId=${tenant.id}&view=issuer`,role==='platform'?200:denied);
   await check('Preview catalog access',role,`/api/admin/preview/catalog?tenantId=${tenant.id}`,isOwner?409:denied);
   await check('Preview availability access',role,`/api/admin/preview/availability?tenantId=${tenant.id}&serviceId=${tenant.service}&date=${fixture.day}`,isOwner?409:denied);
   await check('Export download access',role,`/api/admin/exports?tenantId=${tenant.id}&download=${randomUUID()}`,isOwner?410:denied);
   if(!isOwner){
    const scoped={tenantId:tenant.id};
    const remainingActions=[
     ['save-service',{...scoped,groupId:randomUUID(),name:'G03 denied',description:'',defaultPrice:2500,defaultDuration:30,bufferBefore:0,bufferAfter:0,active:true,online:true}],
     ['save-staff',{...scoped,id:tenant.staff[0],version:1,name:'G03 denied',title:'',bio:'',photoUrl:'',active:false,online:false}],
     ['save-assignment',{...scoped,staffId:tenant.staff[0],serviceId:tenant.service,version:1,price:null,duration:null,bufferBefore:null,bufferAfter:null,active:false}],
     ['save-weekly',{...scoped,staffId:null,version:0,days:Array.from({length:7},(_,index)=>({weekday:index+1,intervals:[[540,1080]]}))}],
     ['reset-exception',{...scoped,staffId:null,version:0,startDay:fixture.day,endDay:fixture.day}],
     ['save-booking-rules',{...scoped,version:1,leadMinutes:120,windowDays:30,stepMinutes:15,cancellationHours:24,timezone:'Europe/Tallinn'}],
     ['cancel-invitation',{...scoped,invitationId:randomUUID()}],
     ['change-role',{...scoped,userId:fixture.users.staff.id,role:'receptionist',staffId:null}],
     ['transfer-owner',{...scoped,newOwnerUserId:fixture.users.staff.id}],
    ] as const;
    for(const [action,input] of remainingActions)await check(`Remaining ${action} denied`,role,`/api/admin/${action}`,denied,input);
    await check('Exit cancel denied',role,'/api/admin/exit',denied,{...scoped,action:'cancel',version:1});
    const future=(days:number)=>new Date(Date.now()+days*86400000).toISOString();
    await check('Exit schedule denied',role,'/api/admin/exit',denied,{...scoped,action:'schedule',version:1,bookingStopsAt:future(30),serviceEndsAt:future(31),dataAccessUntil:future(60),deletionNotBefore:future(90),agreement:'G03 synthetic agreement',confirmed:true});
    for(const action of ['retry','feedback'])await check(`Notification ${action} denied`,role,'/api/admin/notifications',denied,{...scoped,action,id:randomUUID(),version:1,reason:'G03 synthetic reason',...(action==='feedback'?{deliveryStatus:'delivered'}:{})});
    const privacy={tenantId:tenant.id,customerId:tenant.customers[0],identityConfirmed:true};
    await check('Privacy export denied',role,'/api/admin/customers/privacy',denied,privacy);
    await check('Privacy erasure denied',role,'/api/admin/customers/privacy',denied,{...privacy,fingerprint:'a'.repeat(64),confirmed:true},'DELETE');
    for(const action of ['publish','pause','profile']){
     const extra=action==='pause'?{reason:'G03 forbidden pause'}:action==='profile'?{rulesVersion:1,name:'G03 forbidden',address:'Synthetic address',description:'',terms:'Synthetic terms only',reviewed:true}:{};
     await check(`Onboarding ${action} denied`,role,'/api/admin/onboarding',denied,{tenantId:tenant.id,version:1,action,...extra});
    }
    for(const action of ['save','publish','generate']){
     const extra=action==='generate'?{targets:[{language:'en',version:0}]}:{language:'en',version:0,...(action==='save'?{name:'G03 forbidden translation',description:''}:{})};
     await check(`Translation ${action} denied`,role,'/api/admin/translations',denied,{tenantId:tenant.id,serviceId:tenant.service,sourceVersion:1,action,...extra});
    }
    const importIdentity={tenantId:tenant.id,id:randomUUID(),version:1};
    await check('Import upload denied',role,`/api/admin/imports?tenantId=${tenant.id}&kind=customers`,denied,'name,email\r\nG03 Synthetic,g03@example.invalid\r\n');
    await check('Import preview denied',role,'/api/admin/imports',denied,{...importIdentity,mapping:{name:0,email:1},timezone:'Europe/Tallinn',cutoverAt:new Date().toISOString()},'PATCH');
    await check('Import commit denied',role,'/api/admin/imports',denied,{...importIdentity,skipInvalid:false,skipDuplicates:false},'PUT');
    for(const action of ['cancel','enable-reminders','discard-source'])await check(`Import ${action} denied`,role,'/api/admin/imports',denied,{...importIdentity,action,confirmed:true},'PATCH');
    await check('Preview booking denied',role,`/api/admin/preview/bookings?tenantId=${tenant.id}`,denied,{serviceId:tenant.service,staffId:tenant.staff[0],start:`${fixture.day}T09:00:00+03:00`,expectedPrice:2500,expectedDuration:30,expectedRulesVersion:1,name:'G03 Synthetic',email:'g03@example.invalid'});
    await check('Billing recipient denied',role,'/api/admin/billing',denied,{action:'recipient',...identity(tenant),version:1,recipient:party});
    await check('Billing checkout denied',role,'/api/admin/billing',denied,{action:'checkout',...identity(tenant),invoiceId:randomUUID(),invoiceVersion:1,method:'link'});
    await check('Billing mandate revocation denied',role,'/api/admin/billing',denied,{action:'revoke-mandate',...identity(tenant),mandateId:randomUUID(),version:1,confirmed:true});
   }
   if(role!=='platform'){
    await check('Subscription creation denied',role,'/api/admin/subscription',denied,{...identity(tenant),start:fixture.day,billingName:'G03 synthetic',billingEmail:'g03@example.invalid',confirmed:true});
    await check('Platform billing override denied',role,`/api/admin/billing?tenantId=${tenant.id}&platform=true`,denied);
    await check('Platform subscription override denied',role,`/api/admin/subscription?tenantId=${tenant.id}&platform=true`,denied);
    await check('Invoice issue denied',role,'/api/admin/billing',denied,{action:'issue',...identity(tenant),fingerprint:'a'.repeat(64),confirmed:true});
    await check('Invoice credit denied',role,'/api/admin/billing',denied,{action:'credit',...identity(tenant),invoiceId:randomUUID(),version:1,reason:'G03 forbidden credit',confirmed:true});
    await check('Invoice mail retry denied',role,'/api/admin/billing',denied,{action:'retry-mail',...identity(tenant),invoiceId:randomUUID()});
    await check('Payment record denied',role,'/api/admin/billing',denied,{action:'payment',...identity(tenant),invoiceId:randomUUID(),invoiceVersion:1,amount:100,receivedOn:fixture.day,bankEntryId:'G03 synthetic',reference:'',allowOverpayment:false,confirmed:true});
    await check('Payment reversal denied',role,'/api/admin/billing',denied,{action:'reverse-payment',...identity(tenant),paymentId:randomUUID(),version:1,reason:'G03 forbidden reversal',confirmed:true});
    await check('Owner invitation renewal denied',role,'/api/admin/companies',denied,{...identity(tenant),invitationId:randomUUID(),reason:'G03 forbidden renewal',confirmed:true},'PATCH');
   }
  }
 }
 for(const role of ['owner','receptionist','staff','anonymous']){
  await check('Company provisioning denied',role,'/api/admin/companies',role==='anonymous'?401:403,{requestKey:randomUUID(),name:'G03 forbidden company',address:'Synthetic address',slug:`g03-${randomUUID()}`,ownerEmail:'g03@example.invalid'});
  await check('Billing issuer write denied',role,'/api/admin/billing',role==='anonymous'?401:403,{action:'issuer',requestKey:randomUUID(),expectedVersion:0,settings:{issuer:party,iban:'EE382200221020145685',numberPrefix:'G03',vatRegistered:false,taxRateBasisPoints:0,taxNote:'Synthetic tax explanation'},approvalNote:'G03 forbidden issuer change',confirmed:true});
 }
 const after=await fingerprint();results.push({label:'Negative writes preserve all scoped business data and global issuer',before,after,pass:before===after});
 await check('Customer export successful control','owner','/api/admin/customers/privacy',200,{tenantId:own.id,customerId:own.customers[0],identityConfirmed:true},'POST',(value,response)=>{assert.equal(value.tenantId,own.id);assert.match(response.headers.get('content-disposition')??'',/attachment/);assert.ok(!JSON.stringify(value).includes(foreign.id));});
 await check('Foreign customer export ID','owner','/api/admin/customers/privacy',404,{tenantId:own.id,customerId:foreign.customers[0],identityConfirmed:true});
 await check('Grant receptionist catalog permission','owner','/api/admin/update-permissions',200,{tenantId:own.id,userId:fixture.users.receptionist.id,permissions:['services.manage']});
 const pricing=(await database.query('SELECT version FROM services WHERE tenant_id=$1 AND id=$2',[own.id,own.service])).rows[0];
 await check('Granted pricing write same session','receptionist','/api/admin/save-pricing',200,{tenantId:own.id,serviceId:own.service,version:pricing.version,price:2500,duration:30});
 await check('Translation remains owner only despite services permission','receptionist',`/api/admin/translations?tenantId=${own.id}`,403);
 await check('Remove receptionist catalog permission','owner','/api/admin/update-permissions',200,{tenantId:own.id,userId:fixture.users.receptionist.id,permissions:[]});
 await check('Revoked pricing write same session','receptionist','/api/admin/save-pricing',403,{tenantId:own.id,serviceId:own.service,version:pricing.version+1,price:2500,duration:30});
 try{
  await database.query('UPDATE auth_session SET mfa_verified_at=NULL WHERE user_id=$1',[fixture.users.owner.id]);
  await check('MFA-unverified session rejected','owner',`/api/admin/customers?tenantId=${own.id}`,401);
 }finally{await database.query('UPDATE auth_session SET mfa_verified_at=now() WHERE user_id=$1',[fixture.users.owner.id]);}
 const job=await check('Export request successful control','owner','/api/admin/exports',202,{...identity(own)});
 if(job?.id){
  const claim=await claimExport(own.id);assert.ok(claim);await produceExport(claim);
  await check('Ready export download','owner',`/api/admin/exports?tenantId=${own.id}&download=${job.id}`,200,undefined,'GET',(value,response)=>{assert.match(response.headers.get('content-disposition')??'',/attachment/);assert.ok(String(value).includes(own.id));assert.ok(!String(value).includes(foreign.id));assert.ok(!String(value).includes('session_token'));});
  await check('Ready file with foreign tenant context','owner',`/api/admin/exports?tenantId=${foreign.id}&download=${job.id}`,403);
  for(const role of ['staff','receptionist','platform'])await check('Ready file denied role',role,`/api/admin/exports?tenantId=${own.id}&download=${job.id}`,403);
  await database.query("UPDATE export_jobs SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 second' WHERE tenant_id=$1 AND id=$2",[own.id,job.id]);
  await check('Expired file denied','owner',`/api/admin/exports?tenantId=${own.id}&download=${job.id}`,410);
 }
 const originalSession=(await database.query('SELECT * FROM auth_session WHERE user_id=$1',[fixture.users.staff.id])).rows[0];
 assert.ok(originalSession,'Staff session must exist before expiry test');
 try{
  await database.query("UPDATE auth_session SET expires_at=now()-interval '1 second' WHERE user_id=$1",[fixture.users.staff.id]);
  await check('Expired session rejected','staff',`/api/admin/bookings?tenantId=${own.id}&view=list&day=${fixture.day}`,401);
 }finally{
  await database.query('DELETE FROM auth_session WHERE id=$1',[originalSession.id]);
  await database.query('INSERT INTO auth_session SELECT * FROM jsonb_populate_record(NULL::auth_session,$1::jsonb)',[JSON.stringify(originalSession)]);
 }
}finally{
 const files=(await database.query('SELECT storage_key FROM media WHERE tenant_id=ANY($1::uuid[])',[[own.id,foreign.id]])).rows;
 for(const file of files)await removePrivateFile(file.storage_key);
 for(const table of ['export_jobs','media','service_groups'])await database.query(`DELETE FROM ${table} WHERE tenant_id=ANY($1::uuid[])`,[[own.id,foreign.id]]);
 await database.end();await pool().end();
 await writeFile(`${directory}/extended-http-results.json`,JSON.stringify({at:new Date().toISOString(),realHttp:true,authMocked:false,total:results.length,passed:results.filter(row=>row.pass).length,results},null,2));
 console.log(JSON.stringify({total:results.length,passed:results.filter(row=>row.pass).length,failures:results.filter(row=>!row.pass)},null,2));
 if(results.some(row=>!row.pass))process.exitCode=1;
}
