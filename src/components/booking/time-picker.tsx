'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {useI18n} from '@/components/i18n-provider';
import {localeTags} from '@/lib/locales';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import CalendarSurface from '@/components/ui/calendar-surface/calendar-surface';
import MonthCalendar from '@/components/ui/month-calendar/month-calendar';
import {calendarDate} from '@/components/ui/month-calendar/calendar-dates';
import Button from '@/components/ui/button/button';
import styles from './time-picker.module.css';

export default function TimePicker({date,min,max,disabled,onChange,serviceId,staffId,endpoint,children}:{date:string;min:string;max:string;disabled:boolean;onChange:(date:string)=>void;serviceId:string;staffId:string;endpoint:string;children:ReactNode}){
  const {t,locale}=useI18n(),[month,setMonth]=useState(date.slice(0,7)),[retry,setRetry]=useState(0);
  const [result,setResult]=useState<{key:string;days?:Record<string,boolean>;error?:boolean}>();
  const params=new URLSearchParams({serviceId,date:`${month}-01`,month:'1'});if(staffId)params.set('staffId',staffId);
  const url=`${endpoint}${endpoint.includes('?')?'&':'?'}${params}`,key=`${url}:${retry}`;
  useEffect(()=>setMonth(date.slice(0,7)),[date]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(url,{signal:controller.signal,cache:'no-store'}).then(async response=>{
      const body=await response.json();
      if(!response.ok||!body.days||typeof body.days!=='object'||Array.isArray(body.days))throw new Error('Invalid month response');
      if(!controller.signal.aborted)setResult({key,days:body.days});
    }).catch(()=>{if(!controller.signal.aborted)setResult({key,error:true});});
    return()=>controller.abort();
  },[key,url]);
  const current=result?.key===key?result:undefined;
  return <CalendarSurface className={styles.root}><div className={styles.layout}>
    <div className={styles.calendar} aria-busy={!current}>
      <MonthCalendar value={date} month={month} min={min} max={max} today={min} locale={localeTags[locale]} disabled={disabled} days={current?.days} size="large" onChange={onChange} onMonthChange={setMonth} labels={{previous:t('Eelmine kuu'),next:t('Järgmine kuu'),empty:t('Vabu aegu pole'),help:t('Liigu nooleklahvidega, vali Enteriga.'),selected:t('Valitud päev'),today:t('Täna')}}/>
      {!current&&<p className={styles.loadingStatus} role="status">{t('Kontrollime kuu vabu päevi…')}</p>}
      {current?.error&&<p role="status">{t('Kuu ülevaadet ei saanud laadida. Kuupäeva valides saad selle päeva aegu kontrollida.')} <Button type="button" onClick={()=>setRetry(value=>value+1)} disabled={disabled}>{t('Proovi uuesti')}</Button></p>}
    </div>
    <section aria-label={t('Valitud päeva ajad')} className={styles.times}>
      <h3 aria-live="polite">{new Intl.DateTimeFormat(localeTags[locale],{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(calendarDate(date))}</h3>
      {children}
    </section>
  </div></CalendarSurface>;
}
