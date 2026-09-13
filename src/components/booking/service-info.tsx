'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {useI18n} from '@/components/i18n-provider';
import Button from '@/components/ui/button/button';
import Dialog from '@/components/ui/dialog/dialog';
import Icon from '@/components/ui/icon/icon';
import styles from './service-info.module.css';

export default function ServiceInfo({name,description,language,translationNotice}:{name:string;description:string;language:string;translationNotice?:string}){
  const {t}=useI18n(),id=useId(),[open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const node=dialog.current;if(!node)return;if(open){if(node.showModal)node.showModal();else node.setAttribute('open','');}else if(node.open){if(node.close)node.close();else node.removeAttribute('open');}},[open]);
  if(!description.trim()&&!translationNotice)return null;
  const close=()=>{setOpen(false);trigger.current?.focus();};
  return <><Button ref={trigger} type="button" className={styles.toggle} aria-label={`${t('Teenuse lisainfo')}: ${name}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><Icon name="info" size={24}/></Button>
    <Dialog className={styles.dialog} ref={dialog} id={id} aria-labelledby={`${id}-title`} onCancel={event=>{event.preventDefault();close();}} onClose={()=>setOpen(false)}>{open&&<>
      <Button className={styles.close} type="button" autoFocus aria-label={t('Sulge')} onClick={close}><Icon name="close"/></Button>
      <h2 id={`${id}-title`} className={styles.title} lang={language}>{name}</h2>
      {translationNotice&&<p className={styles.notice}>{translationNotice}</p>}
      {description.trim()&&<p className={styles.description} lang={language}>{description}</p>}
    </>}</Dialog>
  </>;
}
