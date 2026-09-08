import {DateTime} from 'luxon';
import {z} from 'zod';
import type {PoolClient} from 'pg';
import {withTenant} from './db';
import {AppError} from './errors';
import {requireMembershipInClient,rolePermissions,audit,type Actor,type Membership} from './access';
import type {Tenant} from './tenants';
import {offersInTransaction} from './availability';
import {insertBooking} from './bookings';
import {bookingResult,bookingEvent,issueBookingLink,queueBookingNotice,type BookingRow} from './booking-records';
import {tokenHash,sealBookingReply,openBookingReply} from './booking-secrets';
import {adminBookingCommandSchema,publicBookingCommandSchema,bookingPolicySchema,type AdminBookingCommand,type PublicBookingCommand,type BookingDetail,type AdminBookingsState,type ManagedBookingState,type BookingHistoryItem} from './booking-management-contracts';
import type {BookingResult,Offer} from './contracts';

function fail(status:number,code:string,message:string):never{throw new AppError(status,code,message);}
const uuid=(value:string)=>{if(!z.uuid().safeParse(value).success)fail(400,'INVALID_INPUT','Vigane tunnus.');};
function dayValue(value:string,zone:string){const date=DateTime.fromISO(value,{zone});if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||date.toISODate()!==value)fail(400,'INVALID_DATE','Vali korrektne kuupäev.');return date;}
async function tenantContext(client:PoolClient,tenantId:string,write=false){
  const result=await client.query<Tenant>(`SELECT * FROM tenants WHERE id=$1 AND active FOR ${write?'UPDATE':'SHARE'}`,[tenantId]);
  if(!result.rowCount)fail(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');return result.rows[0];
}
async function adminContext(client:PoolClient,actor:Actor,tenantId:string){
  const membership=await requireMembershipInClient(actor,tenantId,undefined,client);
  if(!rolePermissions(membership.role,membership.permissions).includes('bookings.manage'))fail(403,'FORBIDDEN','Sul puudub broneeringute haldamise õigus.');
  if(membership.role==='staff'){
    const staff=await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2 AND active',[tenantId,membership.staffId]);
    if(!staff.rowCount)fail(403,'STAFF_SCOPE_DENIED','Aktiivne töötajaprofiil puudub.');
  }
  return membership;
}
function staffScope(m:Membership,staffId:string){if(m.role==='staff'&&m.staffId!==staffId)fail(403,'STAFF_SCOPE_DENIED','Töötaja pääseb ligi ainult enda broneeringutele.');}
function detail(row:BookingRow):BookingDetail{
  const deadline=row.cancellation_hours==null?null:new Date(row.start_at.getTime()-row.cancellation_hours*3600000).toISOString();
  return {...bookingResult(row),version:row.version,serviceId:row.service_id,staffId:row.staff_id,name:row.customer_name,email:row.customer_email,phone:row.customer_phone,attentionReason:row.attention_reason,source:row.source,deadline,canChange:row.status==='confirmed'&&deadline!==null&&Date.now()<Date.parse(deadline),notice:row.customer_email?'Muudatuse teavitus salvestatakse saatmise järjekorda.':'E-posti aadress puudub: e-kirja ei saadeta. Võta kliendiga ise ühendust.'};
}
async function bookingRow(client:PoolClient,tenantId:string,id:string,write=false){
  const result=await client.query<BookingRow>(`SELECT * FROM bookings WHERE tenant_id=$1 AND id=$2${write?' FOR UPDATE':''}`,[tenantId,id]);
  if(!result.rowCount)fail(404,'BOOKING_NOT_FOUND','Broneeringut ei leitud.');return result.rows[0];
}
async function tokenContext(client:PoolClient,tenantId:string,token:string){
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))fail(410,'LINK_UNAVAILABLE','Link on vigane, aegunud või tühistatud. Võta ettevõttega ühendust.');
  const result=await client.query<{id:string;booking_id:string;expires_at:Date}>(`SELECT id,booking_id,expires_at FROM booking_management_tokens WHERE tenant_id=$1 AND token_hash=$2 AND revoked_at IS NULL AND expires_at>now()`,[tenantId,tokenHash(token)]);
  if(!result.rowCount)fail(410,'LINK_UNAVAILABLE','Link on vigane, aegunud või tühistatud. Võta ettevõttega ühendust.');return result.rows[0];
}
function dateLimits(tenant:Tenant){const today=DateTime.now().setZone(tenant.timezone);return {today:today.toISODate()!,maxDate:today.plus({days:tenant.window_days}).toISODate()!,rulesVersion:tenant.rules_version,cancellationHours:tenant.cancellation_hours};}
export async function publicBookingState(tenantId:string,token:string):Promise<ManagedBookingState>{
  return withTenant(tenantId,async client=>{
    const tenant=await tenantContext(client,tenantId),grant=await tokenContext(client,tenantId,token);
    const row=await bookingRow(client,tenantId,grant.booking_id);
    return {booking:{...detail(row),notice:row.customer_email?'Muudatuse teavitus salvestatakse saatmise järjekorda.':'Sellel broneeringul ei ole e-posti aadressi. Kinnituskirja ei saadeta; hoia muudatuse kinnitus alles.'},linkId:grant.id,expiresAt:grant.expires_at.toISOString(),tenant:{name:tenant.name,address:tenant.address,timezone:tenant.timezone,contactEmail:tenant.contact_email,contactPhone:tenant.contact_phone,demo:tenant.demo},...dateLimits(tenant)};
  });
}
export async function publicChangeOffers(tenantId:string,token:string,day:string){
  return withTenant(tenantId,async client=>{
    const tenant=await tenantContext(client,tenantId),grant=await tokenContext(client,tenantId,token),row=await bookingRow(client,tenantId,grant.booking_id);
    enforceDeadline(row);
    const offers=await offersInTransaction(client,tenant,row.service_id,day,undefined,DateTime.now(),{excludeBookingId:row.id});
    const service=await client.query<{name:string}>('SELECT name FROM services WHERE tenant_id=$1 AND id=$2',[tenantId,row.service_id]);
    return {offers,serviceName:service.rows[0]?.name??row.service_name,rulesVersion:tenant.rules_version,cancellationHours:tenant.cancellation_hours};
  });
}
function enforceDeadline(row:BookingRow,override=false,reason='',membership?:Membership){
  if(row.status!=='confirmed')fail(409,'BOOKING_NOT_ACTIVE','See broneering ei ole enam kinnitatud seisundis. Laadi värske seis.');
  if(detail(row).canChange)return;
  if(override&&membership&&membership.role!=='staff'&&reason.trim().length>=3)return;
  fail(403,'CUTOFF_PASSED','Muutmise või tühistamise tähtaeg on möödas või varasemad tingimused pole teada. Võta ettevõttega ühendust.');
}
async function checkedOffer(client:PoolClient,tenant:Tenant,input:{serviceId:string;staffId:string;start:string;expectedPrice:number;expectedDuration:number;expectedRulesVersion:number},excludeBookingId?:string,manual=false):Promise<Offer>{
  if(input.expectedRulesVersion!==tenant.rules_version)fail(409,'RULES_CHANGED','Broneerimisreeglid muutusid. Laadi uued pakkumised ja kinnita tingimused uuesti.');
  const start=DateTime.fromISO(input.start),day=start.setZone(tenant.timezone).toISODate()!;
  const offers=await offersInTransaction(client,tenant,input.serviceId,day,input.staffId,DateTime.now(),{excludeBookingId,includeHidden:manual});
  const chosen=offers.find(o=>DateTime.fromISO(o.start).toMillis()===start.toMillis());
  if(!chosen)fail(409,'SLOT_UNAVAILABLE','Valitud uus aeg ei ole enam vaba. Vana broneering jäi alles.');
  if(chosen.price!==input.expectedPrice||chosen.duration!==input.expectedDuration)fail(409,'OFFER_CHANGED','Hind või kestus muutus. Vali uus pakkumine ja kinnita see uuesti. Vana aeg jäi alles.');
  return chosen;
}
async function applyChange(client:PoolClient,tenant:Tenant,row:BookingRow,input:PublicBookingCommand|AdminBookingCommand,actorId:string|null,membership?:Membership){
  if(input.action==='cancel'&&row.status==='cancelled')return bookingResult(row);
  if(input.action==='manual-create')throw new Error('Unexpected manual command');
  if(input.version!==row.version)fail(409,'VERSION_CONFLICT','Broneeringut on vahepeal muudetud. Laadi värske seis enne jätkamist.');
  if(input.action==='issue-link'){
    const link=await issueBookingLink(client,tenant,row);await bookingEvent(client,row,'link.issued',actorId);return {...bookingResult(row),...link};
  }
  if(input.action==='revoke-link'){
    await client.query('UPDATE booking_management_tokens SET revoked_at=now() WHERE tenant_id=$1 AND booking_id=$2 AND revoked_at IS NULL',[tenant.id,row.id]);
    await bookingEvent(client,row,'link.revoked',actorId,undefined,input.reason);return bookingResult(row);
  }
  let after:BookingRow;
  const reason='reason' in input?input.reason:'';
  if(input.action==='status'){
    if(row.status==='cancelled')fail(409,'BOOKING_CANCELLED','Tühistatud broneeringut ei avata uuesti. Vajadusel loo uus broneering.');
    if(row.status===input.status)return bookingResult(row);
    if(input.status!=='confirmed'&&row.end_at.getTime()>Date.now())fail(409,'TOO_EARLY','Teenindatuks või mitteilmunuks märgi pärast broneeritud aja lõppu.');
    after=(await client.query<BookingRow>('UPDATE bookings SET status=$3,attention_reason=NULL,version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *',[tenant.id,row.id,input.status])).rows[0];
  }else{
    enforceDeadline(row,'overrideDeadline' in input&&input.overrideDeadline,reason,membership);
    if(input.action==='cancel'){
      after=(await client.query<BookingRow>("UPDATE bookings SET status='cancelled',attention_reason=NULL,version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *",[tenant.id,row.id])).rows[0];
    }else{
      if(!membership&&input.serviceId!==row.service_id)fail(400,'SERVICE_CHANGED','Selle lingiga saab muuta olemasoleva teenuse aega ja töötajat.');
      if(membership)staffScope(membership,input.staffId);
      const offer=await checkedOffer(client,tenant,input,row.id,!!membership);
      const values=(await client.query(`SELECT s.name,COALESCE(ss.buffer_before,s.buffer_before) AS before,COALESCE(ss.buffer_after,s.buffer_after) AS after FROM services s JOIN staff_services ss ON ss.tenant_id=s.tenant_id AND ss.service_id=s.id WHERE s.tenant_id=$1 AND s.id=$2 AND ss.staff_id=$3`,[tenant.id,input.serviceId,input.staffId])).rows[0];
      const occupiedStart=DateTime.fromISO(offer.start).minus({minutes:values.before}).toISO(),occupiedEnd=DateTime.fromISO(offer.end).plus({minutes:values.after}).toISO();
      after=(await client.query<BookingRow>(`UPDATE bookings SET service_id=$3,staff_id=$4,service_name=$5,staff_name=$6,start_at=$7,end_at=$8,occupied=tstzrange($9::timestamptz,$10::timestamptz,'[)'),price=$11,duration=$12,buffer_before=$13,buffer_after=$14,attention_reason=NULL,version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *`,[tenant.id,row.id,input.serviceId,input.staffId,values.name,offer.staffName,offer.start,offer.end,occupiedStart,occupiedEnd,offer.price,offer.duration,values.before,values.after])).rows[0];
      // Live tokens follow the changed end using their originally agreed expiry policy. Expired links stay expired.
      await client.query("UPDATE booking_management_tokens SET expires_at=$3::timestamptz+after_end_hours*interval '1 hour' WHERE tenant_id=$1 AND booking_id=$2 AND revoked_at IS NULL AND expires_at>now()",[tenant.id,row.id,offer.end]);
    }
  }
  await bookingEvent(client,after,'booking.'+input.action,actorId,row,reason);
  if(input.action==='cancel'||input.action==='reschedule')await queueBookingNotice(client,after,input.action==='cancel'?'booking.cancelled':'booking.changed');
  else await client.query("UPDATE outbox SET status='superseded' WHERE tenant_id=$1 AND booking_id=$2 AND status IN ('pending','failed')",[tenant.id,row.id]);
  return bookingResult(after);
}
async function command(tenantId:string,requestKey:string,raw:unknown,actor?:Actor,token?:string):Promise<BookingResult>{
  uuid(tenantId);uuid(requestKey);
  const parsed=actor?adminBookingCommandSchema.safeParse(raw):publicBookingCommandSchema.safeParse(raw);
  if(!parsed.success)fail(400,'INVALID_INPUT','Kontrolli broneeringu andmeid ja kinnita soovitud toiming.');
  const input=parsed.data,principal=actor?'user:'+actor.id:'token:'+tokenHash(token??''),hash=tokenHash(JSON.stringify(input));
  try{return await withTenant(tenantId,async client=>{
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${tenantId}:command:${requestKey}`]);
    const tenant=await tenantContext(client,tenantId,true);
    const membership=actor?await adminContext(client,actor,tenantId):undefined;
    const grant=actor?undefined:await tokenContext(client,tenantId,token??'');
    const id='bookingId' in input?input.bookingId:grant?.booking_id;
    const before=id?await bookingRow(client,tenantId,id,true):undefined;
    if(membership){if(before)staffScope(membership,before.staff_id);if(input.action==='manual-create')staffScope(membership,input.staffId);}
    const existing=await client.query<{booking_id:string;principal:string;payload_hash:string;encrypted_result:string}>('SELECT booking_id,principal,payload_hash,encrypted_result FROM booking_commands WHERE tenant_id=$1 AND request_key=$2',[tenantId,requestKey]);
    const context=`command:${tenantId}:${requestKey}:${principal}`;
    if(existing.rowCount){
      if(existing.rows[0].principal!==principal||existing.rows[0].payload_hash!==hash)fail(409,'IDEMPOTENCY_CONFLICT','Sama toimingu tunnust kasutati teistsuguste andmetega.');
      const saved=openBookingReply<BookingResult>(existing.rows[0].encrypted_result,context),current=before??await bookingRow(client,tenantId,existing.rows[0].booking_id);
      if(membership)staffScope(membership,current.staff_id);
      return {...saved,...(saved.version!==current.version?{currentVersion:current.version,currentStatus:current.status}:{})};
    }
    let result:BookingResult;
    if(input.action==='manual-create'){
      if(!actor)fail(403,'FORBIDDEN','Käsitsi broneerimine nõuab sisselogimist.');
      const offer=await checkedOffer(client,tenant,input,undefined,true);
      result=await insertBooking(client,tenant,input,offer,'manual',actor.id);
    }else{
      if(!before)fail(404,'BOOKING_NOT_FOUND','Broneeringut ei leitud.');
      result=await applyChange(client,tenant,before,input,actor?.id??null,membership);
    }
    await client.query('INSERT INTO booking_commands(tenant_id,request_key,booking_id,principal,payload_hash,encrypted_result) VALUES($1,$2,$3,$4,$5,$6)',[tenantId,requestKey,result.id,principal,hash,sealBookingReply(result,context)]);
    return result;
  });}catch(error){
    const code=(error as {code?:string}).code;
    if(code==='23P01')fail(409,'SLOT_UNAVAILABLE','Valitud uus aeg hõivati. Vana broneering jäi alles.');
    if(['55P03','57014','40P01'].includes(code??''))fail(503,'RETRY_SAME_REQUEST','Tulemus vajab uut kontrolli. Proovi sama toimingu tunnusega uuesti.');
    throw error;
  }
}
export const changePublicBooking=(tenantId:string,token:string,raw:unknown,key:string)=>command(tenantId,key,raw,undefined,token);
export async function changeAdminBooking(actor:Actor,raw:unknown,key:string){const parsed=adminBookingCommandSchema.safeParse(raw);if(!parsed.success)fail(400,'INVALID_INPUT','Kontrolli broneeringu andmeid.');return command(parsed.data.tenantId,key,parsed.data,actor);}

export async function adminBookingOffers(actor:Actor,tenantId:string,serviceId:string,staffId:string,day:string,bookingId?:string){
  [tenantId,serviceId,staffId,...(bookingId?[bookingId]:[])].forEach(uuid);
  return withTenant(tenantId,async client=>{
    const tenant=await tenantContext(client,tenantId),m=await adminContext(client,actor,tenantId);staffScope(m,staffId);
    if(bookingId)staffScope(m,(await bookingRow(client,tenantId,bookingId)).staff_id);
    return {offers:await offersInTransaction(client,tenant,serviceId,day,staffId,DateTime.now(),{excludeBookingId:bookingId,includeHidden:true}),rulesVersion:tenant.rules_version,cancellationHours:tenant.cancellation_hours};
  });
}
export async function adminBookingsState(actor:Actor,tenantId:string,day:string,attention=false,page=0):Promise<AdminBookingsState>{
  uuid(tenantId);
  if(!Number.isInteger(page)||page<0||page>10000)fail(400,'INVALID_INPUT','Vigane lehekülg.');
  return withTenant(tenantId,async client=>{
    const tenant=await tenantContext(client,tenantId),m=await adminContext(client,actor,tenantId),from=dayValue(day,tenant.timezone);
    const own=m.role==='staff'?m.staffId:null;
    const rows=await client.query<BookingRow>(`SELECT * FROM bookings WHERE tenant_id=$1 AND ($2::uuid IS NULL OR staff_id=$2) AND CASE WHEN $3::boolean THEN status='confirmed' AND attention_reason IS NOT NULL AND end_at>now() ELSE start_at>=$4::timestamptz AND start_at<$5::timestamptz END ORDER BY start_at,id LIMIT 101 OFFSET $6`,[tenantId,own,attention,from.toISO(),from.plus({days:1}).toISO(),page*100]);
    const staff=await client.query<{id:string;name:string}>('SELECT id,name FROM staff WHERE tenant_id=$1 AND active AND ($2::uuid IS NULL OR id=$2) ORDER BY name,id',[tenantId,own]);
    const services=await client.query<{id:string;name:string;online:boolean}>(`SELECT s.id,s.name,s.online FROM services s WHERE s.tenant_id=$1 AND s.active AND (s.group_id IS NULL OR EXISTS (SELECT 1 FROM service_group_tree g WHERE g.tenant_id=s.tenant_id AND g.id=s.group_id AND g.effective_active)) AND EXISTS (SELECT 1 FROM staff_services ss JOIN staff st ON st.tenant_id=ss.tenant_id AND st.id=ss.staff_id WHERE ss.tenant_id=s.tenant_id AND ss.service_id=s.id AND ss.active AND st.active AND ($2::uuid IS NULL OR st.id=$2)) ORDER BY s.name,s.id`,[tenantId,own]);
    const assignments=await client.query<{staffId:string;serviceId:string}>('SELECT staff_id AS "staffId",service_id AS "serviceId" FROM staff_services WHERE tenant_id=$1 AND active AND ($2::uuid IS NULL OR staff_id=$2)',[tenantId,own]);
    const domain=await client.query<{hostname:string}>("SELECT hostname FROM tenant_domains WHERE tenant_id=$1 AND ready AND ($2::boolean OR hostname NOT LIKE '%.localhost') ORDER BY hostname LIMIT 1",[tenantId,process.env.NODE_ENV!=='production']);
    return {bookings:rows.rows.slice(0,100).map(detail),hasMore:rows.rows.length>100,policy:{version:tenant.management_policy_version,contactEmail:tenant.contact_email,contactPhone:tenant.contact_phone,linkHours:tenant.management_link_hours,canEdit:m.role==='owner'},timezone:tenant.timezone,...dateLimits(tenant),canOverride:m.role!=='staff',publicHostname:domain.rows[0]?.hostname??null,staff:staff.rows,services:services.rows,assignments:assignments.rows};
  });
}
export async function adminBookingHistory(actor:Actor,tenantId:string,bookingId:string):Promise<BookingHistoryItem[]>{
  uuid(tenantId);uuid(bookingId);
  return withTenant(tenantId,async client=>{
    await tenantContext(client,tenantId);const m=await adminContext(client,actor,tenantId);staffScope(m,(await bookingRow(client,tenantId,bookingId)).staff_id);
    const events=await client.query(`SELECT e.action,e.reason,e.created_at AS at,u.name AS "actorName",e.before_data AS before,e.after_data AS after FROM booking_events e LEFT JOIN auth_user u ON u.id=e.actor_user_id WHERE e.tenant_id=$1 AND e.booking_id=$2 ORDER BY e.created_at DESC,e.id DESC LIMIT 100`,[tenantId,bookingId]);
    return events.rows.map(row=>({...row,at:row.at.toISOString()}));
  });
}
export async function saveBookingPolicy(actor:Actor,raw:unknown){
  const parsed=bookingPolicySchema.safeParse(raw);if(!parsed.success)fail(400,'INVALID_INPUT','Vali lingi kehtivus ja vähemalt üks avalik kontakt (e-post või telefon).');
  const d=parsed.data;
  return withTenant(d.tenantId,async client=>{
    await tenantContext(client,d.tenantId,true);const m=await adminContext(client,actor,d.tenantId);if(m.role!=='owner')fail(403,'FORBIDDEN','Halduslingi poliitika määrab ettevõtte omanik.');
    if(!d.contactEmail&&!d.contactPhone){
      const issued=await client.query('SELECT id FROM booking_management_tokens WHERE tenant_id=$1 LIMIT 1',[d.tenantId]);
      if(issued.rowCount)fail(400,'CONTACT_REQUIRED','Juba väljastatud ja aegunud linkide jaoks peab säilima vähemalt üks ettevõtte avalik kontakt.');
    }
    const updated=await client.query('UPDATE tenants SET contact_email=$3,contact_phone=$4,management_link_hours=$5,management_policy_version=management_policy_version+1 WHERE id=$1 AND management_policy_version=$2 RETURNING id',[d.tenantId,d.version,d.contactEmail,d.contactPhone,d.linkHours]);
    if(!updated.rowCount)fail(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
    await audit(client,d.tenantId,actor.id,'booking.policy.updated',undefined,d.tenantId,{linkHours:d.linkHours,version:d.version+1});
  });
}
