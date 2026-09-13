'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {useI18n} from '@/components/i18n-provider';
import Button from '@/components/ui/button/button';
import Dialog from '@/components/ui/dialog/dialog';
import Icon from '@/components/ui/icon/icon';
import styles from './staff-introduction.module.css';

export default function StaffIntroduction({name,title='',bio=''}:{name:string;title?:string;bio?:string}){
  const {t}=useI18n(),id=useId(),[open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const node=dialog.current;if(!node)return;if(open){if(node.showModal)node.showModal();else node.setAttribute('open','');}else if(node.open){if(node.close)node.close();else node.removeAttribute('open');}},[open]);
  if(!title.trim()&&!bio.trim())return null;
  const close=()=>{setOpen(false);trigger.current?.focus();};
  return <>
    <Button ref={trigger} type="button" className={styles.toggle} aria-label={t('Töötaja {name} info',{name})} title={t('Tutvustus')} aria-haspopup="dialog" aria-controls={id} aria-expanded={open} onClick={()=>setOpen(true)}><Icon name="info" size={28}/></Button>
    <Dialog ref={dialog} id={id} className={styles.dialog} aria-labelledby={id+'-title'} onCancel={event=>{event.preventDefault();close();}} onClose={()=>setOpen(false)}>{open&&<>
      <Button type="button" autoFocus className={styles.close} aria-label={t('Sulge')} onClick={close}><Icon name="close" size={24}/></Button>
      <h2 id={id+'-title'}>{name}</h2>
      {title.trim()&&<p className={styles.role}>{title}</p>}
      {bio.trim()&&<p className={styles.bio}>{bio}</p>}
    </>}</Dialog>
  </>;
}
