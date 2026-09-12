// Date-only arithmetic in UTC avoids browser time zone and DST shifts.
export const calendarDate=(value:string)=>new Date(`${value}T12:00:00Z`);
export const calendarValue=(value:Date)=>value.toISOString().slice(0,10);
export function moveDay(value:string,amount:number){const date=calendarDate(value);date.setUTCDate(date.getUTCDate()+amount);return calendarValue(date);}
export function moveMonth(value:string,amount:number){
  const date=calendarDate(value),day=date.getUTCDate();
  date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+amount);
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(day,last));return calendarValue(date);
}
export const mondayIndex=(value:string)=>(calendarDate(value).getUTCDay()+6)%7;
