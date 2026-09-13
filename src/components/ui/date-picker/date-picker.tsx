'use client';

import {useEffect,useRef,useState} from 'react';
import CalendarSurface from '@/components/ui/calendar-surface/calendar-surface';
import Icon from '@/components/ui/icon/icon';
import MonthCalendar from '@/components/ui/month-calendar/month-calendar';
import styles from './date-picker.module.css';

type Props={
  value:string;
  locale:string;
  disabled?:boolean;
  min?:string;
  max?:string;
  onChange:(value:string)=>void;
  labels:{open:string;previous:string;next:string;help:string;empty:string;selected:string;today:string};
};

export default function DatePicker({value,locale,disabled=false,min='2000-01-01',max='2099-12-31',onChange,labels}:Props){
  const [open,setOpen]=useState(false),[month,setMonth]=useState(value.slice(0,7));
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const today=new Date().toISOString().slice(0,10);
  useEffect(()=>setMonth(value.slice(0,7)),[value]);
  useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
  const formatted=new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
  return <div ref={root} className={styles.root} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}}}>
    <button ref={trigger} className={styles.trigger} type="button" disabled={disabled} aria-label={labels.open} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(current=>!current)}><span>{formatted}</span><Icon name="calendar" size={17}/></button>
    {open&&<CalendarSurface className={styles.panel} role="dialog" aria-label={labels.open}>
      <MonthCalendar value={value} month={month} min={min} max={max} today={today} locale={locale} onChange={date=>{onChange(date);setOpen(false);trigger.current?.focus();}} onMonthChange={setMonth} labels={{previous:labels.previous,next:labels.next,help:labels.help,empty:labels.empty,selected:labels.selected,today:labels.today}}/>
    </CalendarSurface>}
  </div>;
}
