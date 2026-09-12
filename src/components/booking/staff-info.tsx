'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {publicPhoneHref} from '@/lib/public-phone';
import {useI18n} from '@/components/i18n-provider';
import Button from '@/components/ui/button/button';
import Dialog from '@/components/ui/dialog/dialog';
import TextLink from '@/components/ui/text-link/text-link';
import Icon from '@/components/ui/icon/icon';
import Avatar from '@/components/ui/avatar/avatar';
import styles from './staff-info.module.css';
export default function StaffInfo({name,photoUrl,phone='',bio='',title=''}:{name:string;photoUrl?:string;phone?:string;bio?:string;title?:string}){
  const {t}=useI18n(),id=useId(),[open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const href=publicPhoneHref(phone);
  useEffect(()=>{const node=dialog.current;if(!node)return;if(open){if(node.showModal)node.showModal();else node.setAttribute('open','');}else if(node.open){if(node.close)node.close();else node.removeAttribute('open');}},[open]);
  if(!href&&!bio.trim()&&!title.trim())return null;
  const close=()=>{setOpen(false);trigger.current?.focus();},label=t('Töötaja {name} info',{name});
  return <><Button ref={trigger} type="button" className={styles.toggle} aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><Icon name="info" size={28} strokeWidth={1.8}/></Button>
    <Dialog className={styles.dialog} ref={dialog} id={id} aria-labelledby={id+'-title'} onCancel={event=>{event.preventDefault();close();}} onClose={()=>setOpen(false)}>{open&&<>
      <Button className={styles.close} type="button" autoFocus aria-label={t('Sulge')} onClick={close}><Icon name="close" size={20}/></Button>
      <div className={styles.hero}><span className={styles.avatar}><Avatar name={name} src={photoUrl}/></span><div className={styles.identity}><h2 id={id+'-title'} className={styles.title}>{name}</h2>{title.trim()&&<p className={styles.role}>{title}</p>}</div></div>
      {(bio.trim()||href)&&<div className={styles.content}>
        {bio.trim()&&<section><h3 className={styles.sectionTitle}>{t('Tutvustus')}</h3><p className={styles.bio}>{bio}</p></section>}
        {href&&<section><h3 className={styles.sectionTitle}>{t('Kontakt')}</h3><TextLink className={styles.phone} href={href} aria-label={t('Helista töötajale {name}: {phone}',{name,phone})}><span>{t('Helista')}</span><strong>{phone}</strong></TextLink></section>}
      </div>}
    </>}</Dialog></>;
}
