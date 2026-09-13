'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {publicPhoneHref} from '@/lib/public-phone';
import {useI18n} from '@/components/i18n-provider';
import Button from '@/components/ui/button/button';
import TextLink from '@/components/ui/text-link/text-link';
import Icon from '@/components/ui/icon/icon';
import styles from './staff-info.module.css';

export default function StaffInfo({name,phone='',companyPhone=''}:{name:string;phone?:string;companyPhone?:string}){
  const {t}=useI18n(),id=useId(),[open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const personalHref=publicPhoneHref(phone),href=personalHref??publicPhoneHref(companyPhone),number=personalHref?phone:companyPhone;
  const label=personalHref?t('Töötaja {name} telefon',{name}):t('Ettevõtte telefon');
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  if(!href)return null;
  return <div ref={root} className={styles.root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();}}}>
    <Button ref={trigger} type="button" className={styles.toggle} aria-label={label} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><Icon name="phone" size={28}/></Button>
    {open&&<div id={id} className={styles.panel}><TextLink className={styles.phone} href={href} aria-label={personalHref?t('Helista töötajale {name}: {phone}',{name,phone:number}):t('Ettevõtte telefon')+': '+number}>{number}</TextLink></div>}
  </div>;
}
