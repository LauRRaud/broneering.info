'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {Catalog} from '@/lib/contracts';
import {publicPhoneHref} from '@/lib/public-phone';
import {useI18n} from '@/components/i18n-provider';
import Button from '@/components/ui/button/button';
import Dialog from '@/components/ui/dialog/dialog';
import Icon from '@/components/ui/icon/icon';
import TextLink from '@/components/ui/text-link/text-link';
import {bookingAddress} from './booking-address';
import styles from './company-info.module.css';

export default function CompanyInfo({tenant}:{tenant:Catalog['tenant']}){
  const {t}=useI18n(),id=useId(),[open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const phone=publicPhoneHref(tenant.contactPhone??''),email=tenant.contactEmail?.trim(),address=tenant.address.trim();
  useEffect(()=>{const node=dialog.current;if(!node)return;if(open){if(node.showModal)node.showModal();else node.setAttribute('open','');}else if(node.open){if(node.close)node.close();else node.removeAttribute('open');}},[open]);
  if(!address&&!phone&&!email&&!tenant.description.trim())return null;
  const close=()=>{setOpen(false);trigger.current?.focus();};
  return <>
    <Button ref={trigger} className={styles.trigger} type="button" aria-label={t('Ettevõtte info')} aria-haspopup="dialog" aria-controls={id} aria-expanded={open} onClick={()=>setOpen(true)}><span className={styles.address}>{bookingAddress(address)||t('Ettevõtte info')}</span><span className={styles.icon}><Icon name="info" size={24}/></span></Button>
    <Dialog ref={dialog} id={id} className={styles.dialog} aria-labelledby={id+'-title'} onCancel={event=>{event.preventDefault();close();}} onClose={()=>setOpen(false)}>{open&&<>
      <Button className={styles.close} type="button" autoFocus aria-label={t('Sulge')} onClick={close}><Icon name="close" size={24}/></Button>
      <h2 id={id+'-title'}>{tenant.name}</h2>
      <dl className={styles.details}>
        {address&&<div><dt>{t('Aadress')}</dt><dd>{address}<TextLink className={styles.map} href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address)} target="_blank" rel="noopener noreferrer">{t('Vaata kaardil')}</TextLink></dd></div>}
        {phone&&<div><dt>{t('Telefon')}</dt><dd><TextLink href={phone}>{tenant.contactPhone}</TextLink></dd></div>}
        {email&&<div><dt>{t('E-post')}</dt><dd><TextLink href={'mailto:'+email}>{email}</TextLink></dd></div>}
      </dl>
      {tenant.description.trim()&&<p className={styles.description}>{tenant.description}</p>}
    </>}</Dialog>
  </>;
}
