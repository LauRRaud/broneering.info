"use client";
import {localeTags} from '@/lib/locales';
import {useI18n} from '@/components/i18n-provider';

import {DateTime} from 'luxon';
import {useEffect,useRef} from 'react';
import type {AdminBookingsState,BookingDetail} from '@/lib/booking-management-contracts';
import styles from './admin-calendar.module.css';
const names:Record<string,string>={confirmed:'Kinnitatud',cancelled:'Tühistatud',completed:'Teenindatud',no_show:'Ei ilmunud'};
const clock=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
export default function AdminCalendar({state,locked,select,create}:{state:AdminBookingsState;locked:boolean;select:(b:BookingDetail)=>void;create:(day:string,staffId:string)=>void}){
  const {t,locale}=useI18n();

  const container=useRef<HTMLDivElement>(null),scope=state.columns?.map(c=>c.day+c.staffId).join(',');
  useEffect(()=>{
    const node=container.current;if(!node)return;
    let positioned=false;
    const position=()=>{if(!node.clientHeight){positioned=false;return;}if(!positioned){node.scrollTop=Math.max(0,Math.min(540,...(state.columns??[]).flatMap(c=>c.working.map(i=>i[0])))-60);positioned=true;}};
    const observer=new ResizeObserver(position);observer.observe(node);position();return()=>observer.disconnect();
  },[scope]);
  if(!state.columns?.length)return null;
  return <div ref={container} className={styles.calendar} role="region" aria-label={t("Kalender: kellaaeg vertikaalselt")} tabIndex={0}>
    <div className={styles.grid} style={{gridTemplateColumns:`4rem repeat(${state.columns.length},minmax(11rem,1fr))`}}>
      <div><div className={styles.heading}>{t("Kell")}</div><div className={styles.times}>{Array.from({length:24},(_,h)=><span key={h} style={{top:h*60}}>{clock(h*60)}</span>)}</div></div>
      {state.columns.map(column=>{
        const start=DateTime.fromISO(column.day,{zone:state.timezone}),end=start.plus({days:1});
        return <div key={column.day+column.staffId}><div className={styles.heading}>{column.name}<br/>{start.toFormat('dd.MM.yyyy')}<br/><button type="button" disabled={locked} onClick={()=>create(column.day,column.staffId)}>{t("Lisa broneering")}</button></div>
          <div className={styles.column} aria-label={`${column.name}, ${column.day}`}>
            <span className={styles.closed}>{column.closed?t("Puudumine / suletud"):t("Tööväline aeg")}</span>
            {column.working.map(([a,b])=><div key={a} className={styles.working} style={{top:a,height:b-a}}>{t("Tööaeg ")}{clock(a)}–{clock(b)}</div>)}
            {state.bookings.filter(b=>b.status!=='cancelled'&&b.staffId===column.staffId&&Date.parse(b.end)>start.toMillis()&&Date.parse(b.start)<end.toMillis()).map(b=>{
              const a=DateTime.fromISO(b.start).setZone(state.timezone),z=DateTime.fromISO(b.end).setZone(state.timezone);
              const top=a<start?0:a.hour*60+a.minute,bottom=z>=end?1440:z.hour*60+z.minute;
              return <button key={b.id} type="button" disabled={locked} className={styles.booking} style={{top,height:Math.max(1,bottom-top)}} onClick={()=>select(b)}>{a.toFormat('HH:mm ZZ')}–{z.toFormat('HH:mm ZZ')} · {b.name}<br/>{b.serviceName} · {t(names[b.status])}{b.attentionReason?t(" · Vajab lahendamist"):''}</button>;
            })}
          </div>
        </div>;
      })}
    </div>
  </div>;
}
