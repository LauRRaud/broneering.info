import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
let tenant:string,foreign:string,user:string,plan:string,subscription:string,media:string,foreignMedia:string,staff:string,service:string,booking:string;
beforeAll(()=>db.connect());afterAll(()=>db.end());
beforeEach(async()=>{
  await db.query('BEGIN');tenant=randomUUID();foreign=randomUUID();user=randomUUID();plan=randomUUID();
  for(const id of [tenant,foreign])await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Model test','Test')",[id,'model-'+id]);
  await db.query("INSERT INTO auth_user(id,name,email,email_verified) VALUES($1,'Model tester',$2,true)",[user,user+'@example.invalid']);
  await db.query("INSERT INTO plan_versions(id,version,code,name,monthly_price) VALUES($1,1,$2,'Test-only plan',1234)",[plan,'test-'+plan]);
  subscription=(await db.query("INSERT INTO subscriptions(tenant_id,plan_id,plan_version,period_start,period_end) VALUES($1,$2,1,'2026-09-01','2026-10-01') RETURNING id",[tenant,plan])).rows[0].id;
  for(const id of [tenant,foreign]){const result=await db.query("INSERT INTO media(tenant_id,storage_key,purpose,content_type,byte_size,sha256) VALUES($1,$2,'import','text/csv',42,$3) RETURNING id",[id,randomUUID(),'a'.repeat(64)]);if(id===tenant)media=result.rows[0].id;else foreignMedia=result.rows[0].id;}
  staff=(await db.query("INSERT INTO staff(tenant_id,name) VALUES($1,'Staff') RETURNING id",[tenant])).rows[0].id;
  service=(await db.query("INSERT INTO services(tenant_id,name,category) VALUES($1,'Service','Test') RETURNING id",[tenant])).rows[0].id;
  booking=(await db.query(`INSERT INTO bookings(tenant_id,reference,service_id,staff_id,service_name,staff_name,customer_name,customer_email,start_at,end_at,occupied,price,duration,buffer_before,buffer_after)
    VALUES($1,$2,$3,$4,'Service','Staff','Child','parent@example.invalid','2026-10-01 10:00Z','2026-10-01 10:30Z','[2026-10-01 09:55Z,2026-10-01 10:40Z)',2500,30,5,10) RETURNING id`,[tenant,randomUUID(),service,staff])).rows[0].id;
});
afterEach(()=>db.query('ROLLBACK'));
async function reject(sql:string,values:unknown[],code:string){
  await db.query('SAVEPOINT expected_failure');
  try{await expect(db.query(sql,values)).rejects.toMatchObject({code});}finally{await db.query('ROLLBACK TO SAVEPOINT expected_failure');await db.query('RELEASE SAVEPOINT expected_failure');}
}
async function invoice(){return (await db.query(`INSERT INTO invoices(tenant_id,subscription_id,request_key,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total)
  VALUES($1,$2,$3,'2026-09-01','2026-10-01','2026-09-15','{"name":"Platform"}','{"name":"Company"}','[{"name":"Monthly fee","amount":1234}]',1234,0,1234) RETURNING id`,[tenant,subscription,randomUUID()])).rows[0].id as string;}
it('rejects forged booking duration, buffers, currency and non-positive versions',async()=>{
  for(const assignment of ["end_at=end_at+interval '1 minute'","duration=31","buffer_before=-1","occupied=tstzrange(start_at,end_at,'[)')","version=0","currency='USD'"])
    await reject('UPDATE bookings SET '+assignment+' WHERE id=$1',[booking],'23514');
  const allocation=(await db.query('SELECT * FROM booking_allocations WHERE booking_id=$1',[booking])).rows[0];expect(allocation.active).toBe(true);expect(allocation.buffer_before).toBe(5);
  await db.query("UPDATE bookings SET status='cancelled',version=version+1 WHERE id=$1",[booking]);expect((await db.query('SELECT active FROM booking_allocations WHERE booking_id=$1',[booking])).rows[0].active).toBe(false);
});
it('rejects invalid timezones and overlapping local hours but permits adjacent intervals',async()=>{
  await reject("UPDATE tenants SET timezone='Unknown/Zone' WHERE id=$1",[tenant],'23514');
  await db.query('INSERT INTO weekly_hours(tenant_id,weekday,start_minute,end_minute) VALUES($1,1,540,600),($1,1,600,660)',[tenant]);
  await reject('INSERT INTO weekly_hours(tenant_id,weekday,start_minute,end_minute) VALUES($1,1,590,610)',[tenant],'23P01');
  for(const intervals of ['[[30,20]]','[[1.5,30]]','[[0,100],[50,120]]','[[0,1441]]','[[null,120]]'])await reject("INSERT INTO schedule_exceptions(tenant_id,day,closed,intervals) VALUES($1,'2026-10-02',false,$2)",[tenant,intervals],'23514');
  await reject("INSERT INTO schedule_exceptions(tenant_id,day,closed,intervals) VALUES($1,'2026-10-02',true,'[[0,60]]')",[tenant],'23514');
});
it('isolates all new tenant tables and read projections using the application database role',async()=>{
  const batch=(await db.query('INSERT INTO import_batches(tenant_id,request_key,source_media_id,requested_by) VALUES($1,$2,$3,$4) RETURNING id',[tenant,randomUUID(),media,user])).rows[0].id;
  const bill=await invoice();
  await db.query("INSERT INTO payment_records(tenant_id,invoice_id,request_key,amount,received_on,recorded_by) VALUES($1,$2,$3,1234,'2026-09-10',$4)",[tenant,bill,randomUUID(),user]);
  await db.query('INSERT INTO theme_configs(tenant_id,version,logo_media_id) VALUES($1,1,$2)',[tenant,media]);
  await db.query("INSERT INTO import_rows(tenant_id,batch_id,row_number,fingerprint,status) VALUES($1,$2,1,$3,'preview')",[tenant,batch,'b'.repeat(64)]);
  await db.query("INSERT INTO export_jobs(tenant_id,request_key,requested_by,scope,expires_at) VALUES($1,$2,$3,'{}',now()+interval '1 hour')",[tenant,randomUUID(),user]);
  await db.query("INSERT INTO retention_policies(tenant_id,data_class) VALUES($1,'booking_contacts')",[tenant]);
  await db.query('SET LOCAL ROLE booking_app');await db.query("SELECT set_config('app.tenant_id',$1,true)",[foreign]);
  for(const table of ['subscriptions','invoices','payment_records','theme_configs','import_batches','import_rows','export_jobs','retention_policies','booking_allocations'])expect((await db.query('SELECT * FROM '+table)).rowCount,table).toBe(0);
  expect((await db.query('SELECT tenant_id FROM media')).rows).toEqual([{tenant_id:foreign}]);expect((await db.query('SELECT tenant_id FROM locations')).rows).toEqual([{tenant_id:foreign}]);
  await db.query("SELECT set_config('app.tenant_id','',true)");expect((await db.query('SELECT * FROM locations')).rowCount).toBe(0);expect((await db.query('SELECT * FROM invoices')).rowCount).toBe(0);
  await db.query("SELECT set_config('app.tenant_id',$1,true)",[tenant]);expect((await db.query('SELECT * FROM invoices')).rowCount).toBe(1);
  await reject('DELETE FROM invoices WHERE id=$1',[bill],'42501');await reject('UPDATE media SET byte_size=43 WHERE id=$1',[media],'42501');
});
it('uses composite foreign keys for files, imports, subscriptions and payments',async()=>{
  await reject('INSERT INTO theme_configs(tenant_id,version,logo_media_id) VALUES($1,1,$2)',[tenant,foreignMedia],'23503');
  await reject('INSERT INTO import_batches(tenant_id,request_key,source_media_id,requested_by) VALUES($1,$2,$3,$4)',[tenant,randomUUID(),foreignMedia,user],'23503');
  await reject("INSERT INTO export_jobs(tenant_id,request_key,requested_by,scope,expires_at,result_media_id) VALUES($1,$2,$3,'{}',now()+interval '1 hour',$4)",[tenant,randomUUID(),user,foreignMedia],'23503');
  const bill=await invoice();
  await reject("INSERT INTO payment_records(tenant_id,invoice_id,request_key,amount,received_on,recorded_by) VALUES($1,$2,$3,100,'2026-09-10',$4)",[foreign,bill,randomUUID(),user],'23503');
  await reject("UPDATE invoices SET tenant_id=$2 WHERE id=$1",[bill,foreign],'23503');
  const batch=(await db.query('INSERT INTO import_batches(tenant_id,request_key,source_media_id,requested_by) VALUES($1,$2,$3,$4) RETURNING id',[tenant,randomUUID(),media,user])).rows[0].id;
  const otherService=(await db.query("INSERT INTO services(tenant_id,name,category) VALUES($1,'Foreign service','Test') RETURNING id",[foreign])).rows[0].id;
  await reject("INSERT INTO import_rows(tenant_id,batch_id,row_number,fingerprint,status,service_id) VALUES($1,$2,1,$3,'imported',$4)",[tenant,batch,'c'.repeat(64),otherService],'23503');
});
it('keeps published theme snapshots separate from drafts and rejects file path traversal',async()=>{
  await db.query("INSERT INTO theme_configs(tenant_id,version,status,published_at,config) VALUES($1,1,'published',now(),'{\"example\":true}')",[tenant]);
  await db.query('INSERT INTO theme_configs(tenant_id,version) VALUES($1,2)',[tenant]);
  await reject("UPDATE theme_configs SET config='{}' WHERE tenant_id=$1 AND version=1",[tenant],'23514');
  await reject('INSERT INTO theme_configs(tenant_id,version) VALUES($1,3)',[tenant],'23505');
  for(const key of ['../secret','a/../secret','a\\secret','https://example.invalid/file'])await reject('UPDATE media SET storage_key=$2 WHERE id=$1',[media,key],'23514');
});
it('keeps plan versions and issued invoice snapshots immutable and prevents duplicate periods',async()=>{
  const bill=await invoice();
  await reject('UPDATE plan_versions SET monthly_price=9999 WHERE id=$1',[plan],'23514');
  await reject(`INSERT INTO invoices(tenant_id,subscription_id,request_key,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total)
    SELECT tenant_id,subscription_id,$2,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total FROM invoices WHERE id=$1`,[bill,randomUUID()],'23505');
  await reject("UPDATE invoices SET status='issued' WHERE id=$1",[bill],'23514');
  await db.query("UPDATE invoices SET status='issued',number=$2,issued_at=now(),version=2 WHERE id=$1",[bill,randomUUID()]);
  for(const assignment of ["subtotal=1400,total=1400","recipient_snapshot='{}'","period_end='2026-11-01'","issued_at=NULL,status='draft'"])await reject('UPDATE invoices SET '+assignment+' WHERE id=$1',[bill],'23514');
  await reject("UPDATE invoices SET status='void' WHERE id=$1",[bill],'23514');
  await db.query("UPDATE invoices SET status='void',void_reason='Correction',version=3 WHERE id=$1",[bill]);
});
it('records corrections by reversing payments and requires export expiry and import approval',async()=>{
  const bill=await invoice(),payment=(await db.query("INSERT INTO payment_records(tenant_id,invoice_id,request_key,amount,received_on,recorded_by) VALUES($1,$2,$3,1234,'2026-09-10',$4) RETURNING id",[tenant,bill,randomUUID(),user])).rows[0].id;
  await reject('UPDATE payment_records SET amount=1 WHERE id=$1',[payment],'23514');
  await reject('UPDATE payment_records SET reversed_at=now(),reversed_by=$2 WHERE id=$1',[payment,user],'23514');
  await db.query("UPDATE payment_records SET reversed_at=now(),reversed_by=$2,reversal_reason='Wrong transfer',version=2 WHERE id=$1",[payment,user]);
  await reject('UPDATE payment_records SET reversed_at=NULL,reversed_by=NULL,reversal_reason=NULL WHERE id=$1',[payment],'23514');
  await reject("INSERT INTO export_jobs(tenant_id,request_key,requested_by,scope,expires_at) VALUES($1,$2,$3,'{}',now()-interval '1 hour')",[tenant,randomUUID(),user],'23514');
  await reject("INSERT INTO import_batches(tenant_id,request_key,source_media_id,requested_by,reminders_enabled) VALUES($1,$2,$3,$4,true)",[tenant,randomUUID(),media,user],'23514');
  await reject("INSERT INTO import_batches(tenant_id,request_key,source_media_id,requested_by,status) VALUES($1,$2,$3,$4,'running')",[tenant,randomUUID(),media,user],'23514');
  await reject("INSERT INTO retention_policies(tenant_id,data_class,retain_days) VALUES($1,'billing',30)",[tenant],'23514');
});
