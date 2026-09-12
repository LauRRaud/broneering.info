'use client';
import {useId,useRef,useState} from 'react';
import type {Offer} from '@/lib/contracts';
import {useI18n} from '@/components/i18n-provider';
import {localeTags} from '@/lib/locales';
import Button from '@/components/ui/button/button';
import Icon from '@/components/ui/icon/icon';
import styles from './offer-selection.module.css';
const periods=['Hommik','Päev','Õhtu'] as const;
export function offerPeriod(start:string,timezone:string){const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:timezone}).format(new Date(start)));return hour<12?'Hommik':hour<17?'Päev':'Õhtu';}
export default function OfferSelection({offers,timezone,showStaff,selected,disabled,onSelect}:{offers:Offer[];timezone:string;showStaff:boolean;selected?:Offer|null;disabled:boolean;onSelect:(offer:Offer)=>void}){
  const {t,locale}=useI18n(),id=useId(),tabs=useRef<HTMLDivElement>(null);
  const [period,setPeriod]=useState<(typeof periods)[number]>(()=>selected?offerPeriod(selected.start,timezone):offers[0]?offerPeriod(offers[0].start,timezone):'Hommik');
  const group=offers.filter(item=>offerPeriod(item.start,timezone)===period);
  const clock=(start:string)=>new Intl.DateTimeFormat(localeTags[locale],{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:timezone}).format(new Date(start));
  const money=(price:number)=>new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR',maximumFractionDigits:price%100?2:0}).format(price/100);
  return <div aria-label={t('Vabad ajad')}>
    <div ref={tabs} role="tablist" aria-label={t('Päevaosa')} className={styles.tabs}>{periods.map((value,index)=><button key={value} id={id+'-'+index} role="tab" type="button" aria-selected={period===value} aria-controls={id+'-panel'} tabIndex={period===value?0:-1} disabled={disabled} onClick={()=>setPeriod(value)} onKeyDown={event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:-1)+3)%3;setPeriod(periods[next]);tabs.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
    }}>{t(value)}</button>)}</div>
    <div className={styles.panel} id={id+'-panel'} role="tabpanel" aria-labelledby={id+'-'+periods.indexOf(period)} tabIndex={0}>
      {group.length?<ul className={showStaff?styles.detailed:styles.times}>{group.map(item=><li key={item.staffId+item.start}><Button className={styles.offer} type="button" disabled={disabled} aria-pressed={selected?.start===item.start&&selected.staffId===item.staffId} onClick={()=>onSelect(item)}>
        <strong>{clock(item.start)}</strong>{showStaff&&<><span>{item.staffName}</span><small>{item.duration} {t('min')} · {money(item.price)}</small></>}
      </Button></li>)}</ul>:<p className={styles.empty}><Icon name="clock" size={26}/>{t('Selles päevaosas vabu aegu ei ole.')}</p>}
    </div>
  </div>;
}
