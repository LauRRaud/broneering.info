'use client';
import {useI18n} from '@/components/i18n-provider';
import styles from './booking-reminder.module.css';

export function canRequestReminder(start:string,minutes?:number|null){
  return minutes!=null&&minutes>0&&Date.parse(start)-minutes*60000>Date.now();
}
export default function BookingReminder({checked,onChange,disabled,channel='email'}:{checked:boolean;onChange:(value:boolean)=>void;disabled:boolean;channel?:'email'|'sms'}){
  const {t}=useI18n();
  return <p><label className={styles.label}><input type="checkbox" name={channel+'Reminder'} checked={checked} onChange={event=>onChange(event.target.checked)} disabled={disabled}/><span>{t(channel==='sms'?'Soovin meeldetuletust SMS-iga':'Soovin meeldetuletust e-postiga')}</span></label></p>;
}
