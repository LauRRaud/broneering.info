import {DateTime} from 'luxon';
import type {PoolClient} from 'pg';
import {withTenant} from './db';
import {audit,requireMembershipInClient,rolePermissions,type Actor,type Membership} from './access';
import {AppError} from './errors';
import {localInstant,intervalsFor} from './availability';
import {scheduleSchemas,mergeAdjacent,type ScheduleAction,type ScheduleState,type ScheduleConflict,type TimeInterval} from './schedule-contracts';
import type {Tenant} from './tenants';
import {markBookingsForAttention} from './booking-records';

export class ScheduleConflictError extends AppError{
  constructor(public conflicts:ScheduleConflict[],public total:number){super(409,'SCHEDULE_CONFLICT','Muudatus jäi salvestamata: olemasolevad broneeringud koos puhvritega ei mahu uude graafikusse. Lahenda need enne graafiku muutmist.');}
}
async function context(client:PoolClient,actor:Actor,tenantId:string){
  const result=await client.query<Tenant>('SELECT * FROM tenants WHERE id=$1 AND active FOR UPDATE',[tenantId]);
  if(!result.rowCount)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
  const membership=await requireMembershipInClient(actor,tenantId,undefined,client);
  return {tenant:result.rows[0],membership};
}
function canEdit(m:Membership,staffId:string|null){
  const permissions=rolePermissions(m.role,m.permissions);
  return m.role==='owner'||(m.role==='receptionist'&&permissions.includes('schedules.manage'))||(m.role==='staff'&&staffId!==null&&m.staffId===staffId&&permissions.includes('schedules.own'));
}
async function checkScope(client:PoolClient,tenantId:string,m:Membership,staffId:string|null){
  if(!canEdit(m,staffId))throw new AppError(403,'FORBIDDEN','Sul puudub selle graafiku muutmise õigus.');
  if(staffId){
    const staff=await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2 AND active FOR UPDATE',[tenantId,staffId]);
    if(!staff.rowCount)throw new AppError(404,'STAFF_NOT_FOUND','Aktiivset töötajat ei leitud.');
  }
}
async function checkVersion(client:PoolClient,tenantId:string,staffId:string|null,version:number){
  await client.query('INSERT INTO schedule_versions(tenant_id,staff_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[tenantId,staffId]);
  const result=await client.query('UPDATE schedule_versions SET version=version+1 WHERE tenant_id=$1 AND staff_id IS NOT DISTINCT FROM $2::uuid AND version=$3 RETURNING version',[tenantId,staffId,version]);
  if(!result.rowCount)throw new AppError(409,'VERSION_CONFLICT','Graafik on vahepeal muutunud. Laadi haldus uuesti ja kontrolli oma muudatusi.');
}
async function scheduleData(client:PoolClient,tenantId:string){
  const hours=await client.query<{staff_id:string|null;weekday:number;start_minute:number;end_minute:number}>('SELECT staff_id,weekday,start_minute,end_minute FROM weekly_hours WHERE tenant_id=$1',[tenantId]);
  const exceptions=await client.query<{staff_id:string|null;day:string;closed:boolean;intervals:TimeInterval[];kind:'vacation'|'illness'|'extra_work'|'other'}>('SELECT staff_id,day::text,closed,intervals,kind FROM schedule_exceptions WHERE tenant_id=$1',[tenantId]);
  return {hours:hours.rows,exceptions:exceptions.rows};
}
async function ensureBookingsFit(client:PoolClient,tenant:Tenant,staffId?:string|null,startDay?:string,endDay?:string,acknowledge?:{actorId:string;reason:string}){
  const bookings=await client.query<{id:string;reference:string;staff_name:string;staff_id:string;start_at:Date;end_at:Date;occupied_start:Date;occupied_end:Date}>(`SELECT id,reference,staff_name,staff_id,start_at,end_at,lower(occupied) AS occupied_start,upper(occupied) AS occupied_end FROM bookings
    WHERE tenant_id=$1 AND status='confirmed' AND upper(occupied)>now() AND ($2::uuid IS NULL OR staff_id=$2)
    AND ($3::date IS NULL OR (start_at AT TIME ZONE $5)::date BETWEEN $3::date AND $4::date) ORDER BY start_at,id`,[tenant.id,staffId??null,startDay??null,endDay??null,tenant.timezone]);
  const data=await scheduleData(client,tenant.id),conflicts:ScheduleConflict[]=[],ids:string[]=[];
  for(const booking of bookings.rows){
    const date=DateTime.fromJSDate(booking.start_at).setZone(tenant.timezone),day=date.toISODate()!;
    const hours=data.hours.filter(h=>h.weekday===date.weekday),exceptions=data.exceptions.filter(e=>e.day===day);
    const location=intervalsFor(null,hours,exceptions),staff=intervalsFor(booking.staff_id,hours,exceptions);
    const fits=location.some(([a,b])=>staff.some(([c,d])=>{
      const start=localInstant(day,Math.max(a,c),tenant.timezone),end=localInstant(day,Math.min(b,d),tenant.timezone);
      return start&&end&&start.toMillis()<=booking.occupied_start.getTime()&&end.toMillis()>=booking.occupied_end.getTime();
    }));
    if(!fits){ids.push(booking.id);conflicts.push({reference:booking.reference,staffName:booking.staff_name,start:booking.start_at.toISOString(),end:booking.end_at.toISOString()});}
  }
  if(conflicts.length&&!acknowledge)throw new ScheduleConflictError(conflicts.slice(0,30),conflicts.length);
  if(acknowledge)await markBookingsForAttention(client,tenant.id,ids,acknowledge.actorId,acknowledge.reason);
}
export async function scheduleState(actor:Actor,tenantId:string):Promise<ScheduleState>{
  return withTenant(tenantId,async client=>{
    const {tenant,membership}=await context(client,actor,tenantId);
    const own=membership.role==='staff';
    const staff=await client.query<{id:string;name:string}>('SELECT id,name FROM staff WHERE tenant_id=$1 AND active AND ($2::boolean=false OR id=$3::uuid) ORDER BY name,id',[tenantId,own,membership.staffId]);
    const scopes:Array<{staffId:string|null;name:string}>=own?staff.rows.map(s=>({staffId:s.id,name:s.name})):[{staffId:null,name:'Asukoha lahtiolekuajad'},...staff.rows.map(s=>({staffId:s.id,name:s.name}))];
    const data=await scheduleData(client,tenantId);
    const versions=await client.query<{staff_id:string|null;version:number}>('SELECT staff_id,version FROM schedule_versions WHERE tenant_id=$1',[tenantId]);
    return {rules:{version:tenant.rules_version,leadMinutes:tenant.lead_minutes,windowDays:tenant.window_days,stepMinutes:tenant.step_minutes,cancellationHours:tenant.cancellation_hours,timezone:tenant.timezone},canEditRules:membership.role==='owner',today:DateTime.now().setZone(tenant.timezone).toISODate()!,scopes:scopes.map(scope=>({...scope,canEdit:canEdit(membership,scope.staffId),version:versions.rows.find(v=>v.staff_id===scope.staffId)?.version??0,days:Array.from({length:7},(_,i)=>({weekday:i+1,intervals:mergeAdjacent(data.hours.filter(h=>h.staff_id===scope.staffId&&h.weekday===i+1).map(h=>[h.start_minute,h.end_minute]))})),exceptions:data.exceptions.filter(e=>e.staff_id===scope.staffId).map(({staff_id,...e})=>e).sort((a,b)=>a.day.localeCompare(b.day))}))};
  });
}
export async function saveSchedule(actor:Actor,action:ScheduleAction,raw:unknown){
  const parsed=scheduleSchemas[action].safeParse(raw);
  if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli kuupäevi ja kellaaegu. Vahemikud ei tohi kattuda; erandite periood võib olla kuni 366 päeva.');
  const tenantId=parsed.data.tenantId;
  return withTenant(tenantId,async client=>{
    const {tenant,membership}=await context(client,actor,tenantId);
    if(action==='save-booking-rules'){
      if(membership.role!=='owner')throw new AppError(403,'FORBIDDEN','Ettevõtte broneerimisreegleid saab muuta ainult omanik.');
      const d=scheduleSchemas[action].parse(raw);
      const updated=await client.query<Tenant>('UPDATE tenants SET lead_minutes=$3,window_days=$4,step_minutes=$5,cancellation_hours=$6,timezone=$7,rules_version=rules_version+1 WHERE id=$1 AND rules_version=$2 RETURNING *',[tenantId,d.version,d.leadMinutes,d.windowDays,d.stepMinutes,d.cancellationHours,d.timezone]);
      if(!updated.rowCount)throw new AppError(409,'VERSION_CONFLICT','Reeglid on vahepeal muutunud. Laadi haldus uuesti.');
      if(tenant.timezone!==d.timezone)await ensureBookingsFit(client,updated.rows[0]);
      await audit(client,tenantId,actor.id,'schedule.rules.updated',undefined,tenantId,{version:d.version+1,leadMinutes:d.leadMinutes,windowDays:d.windowDays,stepMinutes:d.stepMinutes,cancellationHours:d.cancellationHours,timezone:d.timezone});
      return;
    }
    const d=parsed.data as {staffId:string|null;version:number};
    await checkScope(client,tenantId,membership,d.staffId);
    await checkVersion(client,tenantId,d.staffId,d.version);
    let changes:Record<string,unknown>={};
    if(action==='save-weekly'){
      const weekly=scheduleSchemas[action].parse(raw);
      changes={days:weekly.days};
      await client.query('DELETE FROM weekly_hours WHERE tenant_id=$1 AND staff_id IS NOT DISTINCT FROM $2::uuid',[tenantId,d.staffId]);
      for(const day of weekly.days)for(const [a,b] of mergeAdjacent(day.intervals))await client.query('INSERT INTO weekly_hours(tenant_id,staff_id,weekday,start_minute,end_minute) VALUES($1,$2,$3,$4,$5)',[tenantId,d.staffId,day.weekday,a,b]);
      await ensureBookingsFit(client,tenant,d.staffId);
    }else{
      const range=action==='save-exception'?scheduleSchemas[action].parse(raw):scheduleSchemas['reset-exception'].parse(raw);
      changes={startDay:range.startDay,endDay:range.endDay};
      if(action==='reset-exception')await client.query('DELETE FROM schedule_exceptions WHERE tenant_id=$1 AND staff_id IS NOT DISTINCT FROM $2::uuid AND day BETWEEN $3::date AND $4::date',[tenantId,d.staffId,range.startDay,range.endDay]);
      else{
        const exception=scheduleSchemas['save-exception'].parse(raw);
        await client.query(`INSERT INTO schedule_exceptions(tenant_id,staff_id,day,closed,intervals,kind)
          SELECT $1,$2,day::date,$5,$6,$7 FROM generate_series($3::date,$4::date,interval '1 day') day
          ON CONFLICT (tenant_id,staff_id,day) DO UPDATE SET closed=excluded.closed,intervals=excluded.intervals,kind=excluded.kind`,[tenantId,d.staffId,range.startDay,range.endDay,exception.closed,JSON.stringify(mergeAdjacent(exception.intervals)),exception.kind]);
      }
      const exception=action==='save-exception'?scheduleSchemas['save-exception'].parse(raw):null;
      const acknowledge=exception?.closed&&exception.acknowledgeConflicts?{actorId:actor.id,reason:d.staffId?'Töötaja puudumine / suletud tööpäev':'Asukoha sulgemine'}:undefined;
      await ensureBookingsFit(client,tenant,d.staffId,range.startDay,range.endDay,acknowledge);
      if(acknowledge)changes.affectedBookingsQueued=true;
    }
    await audit(client,tenantId,actor.id,'schedule.'+action,undefined,d.staffId??tenantId,{version:d.version+1,...changes});
  });
}
