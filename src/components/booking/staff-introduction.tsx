'use client';
import {useEffect,useId,useRef} from 'react';
import {useI18n} from '@/components/i18n-provider';
import Button from '@/components/ui/button/button';
import Dialog from '@/components/ui/dialog/dialog';
import Icon from '@/components/ui/icon/icon';
import styles from './staff-introduction.module.css';

export default function StaffIntroduction({name,title='',bio='',open,onClose}:{name:string;title?:string;bio?:string;open:boolean;onClose:()=>void}){
  const {t}=useI18n(),id=useId(),dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const node=dialog.current;if(!node)return;if(open){if(node.showModal)node.showModal();else node.setAttribute('open','');}else if(node.open){if(node.close)node.close();else node.removeAttribute('open');}},[open]);
  if(!title.trim()&&!bio.trim())return null;

  return <>
    <Dialog ref={dialog} id={id} className={styles.dialog} aria-labelledby={id+'-title'} onCancel={event=>{event.preventDefault();onClose();}} onClose={()=>{if(open)onClose();}}>{open&&<>
      <Button type="button" autoFocus className={styles.close} aria-label={t('Sulge')} onClick={onClose}><Icon name="close" size={24}/></Button>
      <h2 id={id+'-title'}>{name}</h2>
      {title.trim()&&<p className={styles.role}>{title}</p>}
      {bio.trim()&&<p className={styles.bio}>{bio}</p>}
    </>}</Dialog>
  </>;
}
