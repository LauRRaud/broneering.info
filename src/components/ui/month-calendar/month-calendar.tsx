'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import Button from '../button/button';
import Icon from '../icon/icon';
import {calendarDate,moveDay,moveMonth,mondayIndex} from './calendar-dates';
import styles from './month-calendar.module.css';

type Props={value:string;month:string;min:string;max:string;today:string;locale:string;disabled?:boolean;days?:Record<string,boolean>;size?:'default'|'large';onChange:(date:string)=>void;onMonthChange:(month:string)=>void;labels:{previous:string;next:string;help:string;empty:string;selected?:string;today?:string}};
export default function MonthCalendar({value,month,min,max,today,locale,disabled=false,days,size='default',onChange,onMonthChange,labels}:Props){
  const id=useId(),grid=useRef<HTMLTableElement>(null),pendingFocus=useRef(false);
  const [focused,setFocused]=useState(value);
  useEffect(()=>setFocused(value),[value]);
  const first=`${month}-01`,end=moveDay(moveMonth(first,1),-1);
  const clamp=(date:string)=>date<min?min:date>max?max:date;
  const active=focused.startsWith(month)?clamp(focused):value.startsWith(month)?value:clamp(first);
  const start=moveDay(first,-mondayIndex(first));
  const count=Math.ceil((mondayIndex(first)+Number(end.slice(8)))/7)*7;
  const cells=Array.from({length:count},(_,index)=>moveDay(start,index));
  const format=(date:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat(locale,{...options,timeZone:'UTC'}).format(calendarDate(date));
  useLayoutEffect(()=>{if(pendingFocus.current){pendingFocus.current=false;grid.current?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)?.focus();}},[active,month]);
  function navigate(event:KeyboardEvent<HTMLButtonElement>,date:string){
    const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-mondayIndex(date),End:6-mondayIndex(date)};
    let target:string;
    if(event.key in offsets)target=moveDay(date,offsets[event.key]);
    else if(event.key==='PageUp'||event.key==='PageDown')target=moveMonth(date,(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1));
    else return;
    event.preventDefault();if(disabled)return;target=clamp(target);
    if(target===date)return;
    pendingFocus.current=true;setFocused(target);onMonthChange(target.slice(0,7));
  }
  return <div className={`${styles.root} ${size==='large'?styles.large:''}`}>
    <div className={styles.navigation}>
      <Button type="button" aria-label={labels.previous} disabled={disabled||first<=min} onClick={()=>onMonthChange(moveMonth(first,-1).slice(0,7))}><Icon className={styles.previous} name="chevron" size={17}/></Button>
      <h3 id={`${id}-month`} aria-live="polite">{format(first,{month:'long',year:'numeric'})}</h3>
      <Button type="button" aria-label={labels.next} disabled={disabled||end>=max} onClick={()=>onMonthChange(moveMonth(first,1).slice(0,7))}><Icon name="chevron" size={17}/></Button>
    </div>
    <table ref={grid} role="grid" aria-labelledby={`${id}-month`} aria-describedby={`${id}-help`} className={styles.grid}>
      <thead><tr>{Array.from({length:7},(_,index)=>moveDay('2024-01-01',index)).map(date=><th key={date} scope="col" abbr={format(date,{weekday:'long'})}>{format(date,{weekday:'short'})}</th>)}</tr></thead>
      <tbody>{Array.from({length:count/7},(_,row)=><tr key={row}>{cells.slice(row*7,row*7+7).map(date=><td key={date} aria-selected={date===value}>{date.startsWith(month)&&<Button type="button" data-date={date} tabIndex={date===active?0:-1} aria-label={`${format(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}${days?.[date]===false?`. ${labels.empty}`:''}`} aria-current={date===today?'date':undefined} aria-pressed={date===value} disabled={disabled||date<min||date>max} className={`${styles.day} ${days?.[date]===false?styles.empty:''}`} onFocus={()=>setFocused(date)} onKeyDown={event=>navigate(event,date)} onClick={()=>onChange(date)}>{Number(date.slice(8))}</Button>}</td>)}</tr>)}</tbody>
    </table>
    <p id={`${id}-help`} className={styles.help}>{labels.help}</p>
    {labels.selected&&<div className={styles.legend}><span><i className={styles.selected}/>{labels.selected}</span><span><i className={styles.today}/>{labels.today}</span><span><i/>{labels.empty}</span></div>}
  </div>;
}
