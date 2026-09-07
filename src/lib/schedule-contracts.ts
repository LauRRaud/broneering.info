import {z} from 'zod';
import {DateTime,IANAZone} from 'luxon';
const interval=z.tuple([z.number().int().min(0).max(1439),z.number().int().min(1).max(1440)]).refine(([a,b])=>a<b);
const intervals=z.array(interval).max(8).refine(items=>{
  const sorted=[...items].sort((a,b)=>a[0]-b[0]);
  return sorted.every((item,i)=>i===0||sorted[i-1][1]<=item[0]);
},'Töövahemikud ei tohi kattuda.');
const scope={tenantId:z.uuid(),staffId:z.uuid().nullable(),version:z.number().int().nonnegative()};
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>DateTime.fromISO(value,{zone:'UTC'}).toISODate()===value);
const range={startDay:day,endDay:day};
const validRange=(d:{startDay:string;endDay:string})=>{
  const days=DateTime.fromISO(d.endDay,{zone:'UTC'}).diff(DateTime.fromISO(d.startDay,{zone:'UTC'}),'days').days;
  return days>=0&&days<366;
};
export const scheduleSchemas={
  'save-weekly':z.object({...scope,days:z.array(z.object({weekday:z.number().int().min(1).max(7),intervals}).strict()).length(7).refine(days=>new Set(days.map(d=>d.weekday)).size===7)}).strict(),
  'save-exception':z.object({...scope,...range,closed:z.boolean(),intervals,kind:z.enum(['vacation','illness','extra_work','other'])}).strict().refine(validRange).refine(d=>d.closed?d.intervals.length===0:d.intervals.length>0).refine(d=>!['vacation','illness'].includes(d.kind)||d.closed).refine(d=>d.kind!=='extra_work'||!d.closed),
  'reset-exception':z.object({...scope,...range}).strict().refine(validRange),
  'save-booking-rules':z.object({tenantId:z.uuid(),version:z.number().int().positive(),leadMinutes:z.number().int().min(0).max(525600),windowDays:z.number().int().min(1).max(365),stepMinutes:z.number().int().min(5).max(60),cancellationHours:z.number().int().min(0).max(8760),timezone:z.string().max(100).refine(value=>(value==='UTC'||value.includes('/'))&&IANAZone.isValidZone(value))}).strict(),
};
export type ScheduleAction=keyof typeof scheduleSchemas;
export type TimeInterval=[number,number];
export type WeeklyDay={weekday:number;intervals:TimeInterval[]};
export type ScheduleException={day:string;closed:boolean;intervals:TimeInterval[];kind:'vacation'|'illness'|'extra_work'|'other'};
export type ScheduleScope={staffId:string|null;name:string;version:number;canEdit:boolean;days:WeeklyDay[];exceptions:ScheduleException[]};
export type BookingRules={version:number;leadMinutes:number;windowDays:number;stepMinutes:number;cancellationHours:number;timezone:string};
export type ScheduleState={rules:BookingRules;canEditRules:boolean;scopes:ScheduleScope[];today:string};
export type ScheduleConflict={reference:string;staffName:string;start:string;end:string};
export function mergeAdjacent(items:TimeInterval[]):TimeInterval[]{
  const merged:TimeInterval[]=[];
  for(const [a,b] of [...items].sort((x,y)=>x[0]-y[0])){
    const last=merged.at(-1);
    if(last&&a<=last[1])last[1]=Math.max(last[1],b);else merged.push([a,b]);
  }
  return merged;
}
