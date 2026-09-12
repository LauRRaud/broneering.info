'use client';
import {useId,useRef} from 'react';
import {useI18n} from '@/components/i18n-provider';
import Button from '@/components/ui/button/button';
import Dialog from '@/components/ui/dialog/dialog';
import Icon from '@/components/ui/icon/icon';
import styles from './booking-terms.module.css';
export default function BookingTerms({company,terms}:{company:string;terms?:string}){
  const {t}=useI18n(),id=useId(),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  if(!terms?.trim())return null;
  const close=()=>{dialog.current?.close();trigger.current?.focus();};
  return <>
    <p>{t('Broneeringu kinnitamisega nõustud')}{' '}<Button ref={trigger} type="button" className={styles.link} aria-haspopup="dialog" aria-controls={id} onClick={()=>dialog.current?.showModal()}>{t('broneerimistingimustega')}</Button>.</p>
    <Dialog className={styles.dialog} ref={dialog} id={id} aria-labelledby={id+'-title'} onCancel={event=>{event.preventDefault();close();}} onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}>
      <Button className={styles.close} type="button" autoFocus aria-label={t('Sulge tingimused')} onClick={close}><Icon name="close" size={22}/></Button>
      <p className={styles.company}>{company}</p><h2 id={id+'-title'}>{t('Broneerimistingimused')}</h2>
      <div className={styles.terms}>{terms}</div>
    </Dialog>
  </>;
}
