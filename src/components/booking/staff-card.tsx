'use client';
import type {Staff} from '@/lib/contracts';
import Avatar from '@/components/ui/avatar/avatar';
import Button from '@/components/ui/button/button';
import {useI18n} from '@/components/i18n-provider';
import {localeTags} from '@/lib/locales';
import StaffInfo from './staff-info';
import styles from './staff-card.module.css';

export default function StaffCard({staff,onSelect,selected,disabled=false,serviceId,showPrice=false}:{staff:Staff;onSelect?:()=>void;selected?:boolean;disabled?:boolean;serviceId?:string;showPrice?:boolean}){
  const {t,locale}=useI18n(),detail=staff.serviceDetails?.find(item=>item.serviceId===serviceId);
  const identity=<><span className={styles.avatar}><Avatar name={staff.name} src={staff.photoUrl}/></span><span className={styles.name}>{staff.name}</span>{showPrice&&detail&&<span className={styles.price}>{detail.duration} {t('min')} · {new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR',maximumFractionDigits:detail.price%100?2:0}).format(detail.price/100)}</span>}</>;
  return <div className={styles.card}>
    {onSelect?<Button className={styles.identity} type="button" onClick={onSelect} aria-label={staff.name} aria-pressed={selected} disabled={disabled}>{identity}</Button>:<div className={styles.identity}>{identity}</div>}
    <div className={styles.info}><StaffInfo name={staff.name} photoUrl={staff.photoUrl} phone={staff.publicPhone} bio={staff.bio} title={staff.title}/></div>
  </div>;
}
