import {z} from 'zod';
import {DateTime} from 'luxon';
import {AppError} from './errors';

export const importFields={
  services:['externalId','name','groupId','description','priceCents','duration','bufferBefore','bufferAfter'],
  staff:['externalId','name','title','bio'],
  customers:['externalId','name','email','phone'],
  bookings:['externalId','serviceId','staffId','name','email','phone','startAt','priceCents','duration','bufferBefore','bufferAfter'],
} as const;
export type ImportKind=keyof typeof importFields;
const required:Record<ImportKind,string[]>={services:['name','groupId','priceCents','duration'],staff:['name'],customers:['name'],bookings:['serviceId','staffId','name','startAt','priceCents','duration']};
const text=(max:number,min=0)=>z.string().trim().min(min).max(max);
const integer=(min:number,max:number)=>z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(min).max(max));
const contact={name:text(120,2),email:z.union([z.literal(''),z.email().max(254)]),phone:text(30).regex(/^[+\d ()-]*$/)};
const price=integer(0,100_000_000),duration=integer(5,720),buffer=integer(0,240);
const schemas={
  services:z.object({externalId:text(120),name:text(150,1),groupId:z.uuid(),description:text(1000),priceCents:price,duration,bufferBefore:buffer,bufferAfter:buffer}),
  staff:z.object({externalId:text(120),name:text(120,1),title:text(150),bio:text(1000)}),
  customers:z.object({externalId:text(120),...contact}),
  bookings:z.object({externalId:text(120),...contact,serviceId:z.uuid(),staffId:z.uuid(),startAt:text(50,1),priceCents:price,duration,bufferBefore:buffer,bufferAfter:buffer}),
};
export function validateImportMapping(kind:ImportKind,headers:string[],mapping:Record<string,number>){
  const keys=Object.keys(mapping);
  if(keys.some(key=>!(importFields[kind] as readonly string[]).includes(key)||!Number.isInteger(mapping[key])||mapping[key]<0||mapping[key]>=headers.length)
    ||new Set(Object.values(mapping)).size!==keys.length||required[kind].some(key=>mapping[key]===undefined)) {
    throw new AppError(400,'IMPORT_MAPPING','Vastenda kõik kohustuslikud väljad eri CSV-veergudega.');
  }
}
export function normalizeImportRow(kind:ImportKind,values:string[],mapping:Record<string,number>,timezone:string,cutoverAt:string,now=Date.now()):{data:Record<string,string|number>;errors:string[]}{
  const raw:Record<string,string>={};
  for(const field of importFields[kind])raw[field]=mapping[field]===undefined?(['bufferBefore','bufferAfter'].includes(field)?'0':''):values[mapping[field]]?.trim()??'';
  const result=schemas[kind].safeParse(raw);
  if(!result.success)return {data:{},errors:[...new Set(result.error.issues.map(issue=>'FIELD_'+String(issue.path[0])))]};
  const data:Record<string,string|number>=result.data;
  if(kind==='bookings'){
    // Require an explicit offset, then verify it against the chosen company's zone.
    // This makes both occurrences of a DST fold distinguishable and rejects gap times.
    const start=DateTime.fromISO(String(data.startAt),{setZone:true});
    const zone=start.setZone(timezone),cutover=DateTime.fromISO(cutoverAt,{setZone:true});
    if(!/(Z|[+-]\d{2}:\d{2})$/.test(String(data.startAt))||!start.isValid||!zone.isValid||zone.offset!==start.offset)return {data,errors:['BOOKING_TIMEZONE']};
    if(!cutover.isValid||start.toMillis()<cutover.toMillis()||start.toMillis()<=now)return {data,errors:['BOOKING_PAST']};
    data.startAt=start.toUTC().toISO()!;
  }
  return {data,errors:[]};
}
export function importTemplate(kind:ImportKind){
  const examples:Record<ImportKind,string[]>={
    services:['service-1','Näidisteenus','REPLACE_GROUP_UUID','','3500','60','0','0'],
    staff:['staff-1','Näidistöötaja','',''],
    customers:['customer-1','Näidisklient','customer@example.invalid',''],
    bookings:['booking-1','REPLACE_SERVICE_UUID','REPLACE_STAFF_UUID','Näidisklient','customer@example.invalid','','2030-01-15T10:00:00+02:00','3500','60','0','0'],
  };
  return '\uFEFF'+importFields[kind].join(',')+'\r\n'+examples[kind].join(',')+'\r\n';
}
