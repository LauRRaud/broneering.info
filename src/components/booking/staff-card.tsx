'use client';
import type {Staff} from '@/lib/contracts';
import Avatar from '@/components/ui/avatar/avatar';
import Button from '@/components/ui/button/button';
import {useI18n} from '@/components/i18n-provider';
import {localeTags} from '@/lib/locales';
import StaffInfo from './staff-info';
import StaffIntroduction from './staff-introduction';
import styles from './staff-card.module.css';

export default function StaffCard({staff,onSelect,selected,disabled=false,serviceId,showPrice=false,companyPhone}:{staff:Staff;onSelect?:()=>void;selected?:boolean;disabled?:boolean;serviceId?:string;showPrice?:boolean;companyPhone?:string}){
  const {t,locale}=useI18n(),detail=staff.serviceDetails?.find(item=>item.serviceId===serviceId);
  const identity=<><span className={styles.avatar}><Avatar name={staff.name} src={staff.photoUrl} singleInitial/></span><span className={styles.name}>{staff.name}</span>{showPrice&&detail&&<span className={styles.price}>{detail.duration} {t('min')} · {new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR',maximumFractionDigits:detail.price%100?2:0}).format(detail.price/100)}</span>}</>;
  return <div className={styles.card}>
    {onSelect?<Button className={styles.identity} type="button" onClick={onSelect} aria-label={staff.name} aria-pressed={selected} disabled={disabled}>{identity}</Button>:<div className={styles.identity}>{identity}</div>}
    <div className={styles.introduction}><StaffIntroduction name={staff.name} title={staff.title} bio={staff.bio}/></div>
    <div className={styles.info}><StaffInfo name={staff.name} phone={staff.publicPhone} companyPhone={companyPhone}/></div>
  </div>;
}
