import type {BookingResult} from './contracts';
const date=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const escape=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(line:string){
  const encoder=new TextEncoder();let result='',part='',bytes=0;
  for(const char of line){const length=encoder.encode(char).length;if(bytes+length>75){result+=part+'\r\n';part=' ';bytes=1;}part+=char;bytes+=length;}return result+part;
}
export function bookingCalendar(result:BookingResult,company:{name:string;address:string},now=new Date()){
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//broneering.info//Booking//ET','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${result.id}@broneering.info`,`DTSTAMP:${date(now.toISOString())}`,`SEQUENCE:${result.version??1}`,`DTSTART:${date(result.start)}`,`DTEND:${date(result.end)}`,`SUMMARY:${escape(result.serviceName+' · '+result.staffName)}`,`LOCATION:${escape(company.name+' '+company.address)}`,`DESCRIPTION:${escape('Broneering '+result.reference)}`,`STATUS:${result.status==='cancelled'?'CANCELLED':'CONFIRMED'}`,'END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
export function downloadBookingCalendar(result:BookingResult,company:{name:string;address:string}){
  const url=URL.createObjectURL(new Blob([bookingCalendar(result,company)],{type:'text/calendar;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='broneering.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
