'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import type {Staff} from '@/lib/contracts';
import {publicPhoneHref} from '@/lib/public-phone';
import {useI18n} from '@/components/i18n-provider';
import Button from '@/components/ui/button/button';
import TextLink from '@/components/ui/text-link/text-link';
import Icon from '@/components/ui/icon/icon';
import StaffIntroduction from './staff-introduction';
import styles from './staff-actions.module.css';

export default function StaffActions({staff,companyPhone=''}:{staff:Staff;companyPhone?:string}){
  const {t}=useI18n(),id=useId();
  const [open,setOpen]=useState(false),[introduction,setIntroduction]=useState(false),[active,setActive]=useState(0);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
  const personalHref=publicPhoneHref(staff.publicPhone??''),href=personalHref??publicPhoneHref(companyPhone);
  const number=personalHref?staff.publicPhone:companyPhone,hasInfo=!!(staff.title?.trim()||staff.bio?.trim());
  const count=Number(hasInfo)+Number(!!href),label=t('Töötaja {name} valikud',{name:staff.name});
  const close=(focus=false)=>{setOpen(false);if(focus)trigger.current?.focus();};
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  useLayoutEffect(()=>{
    if(!open)return;
    const position=()=>{
      const node=menu.current;if(!node)return;
      node.style.translate='none';
      const rect=node.getBoundingClientRect(),width=document.documentElement.clientWidth;
      const shift=rect.left<8?8-rect.left:rect.right>width-8?width-8-rect.right:0;
      node.style.translate=`${shift}px 0`;
    };
    position();window.addEventListener('resize',position);
    return()=>window.removeEventListener('resize',position);
  },[open]);
  useEffect(()=>{if(open)menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[active]?.focus();},[open,active]);
  function keyDown(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
    else if(event.key==='Tab'){close(true);}
    else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();setActive(value=>event.key==='Home'?0:event.key==='End'?count-1:(value+(event.key==='ArrowDown'?1:-1)+count)%count);
    }
  }
  if(!count)return null;
  return <>
    <div ref={root} className={styles.root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))close();}}>
      <Button ref={trigger} type="button" className={styles.trigger} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined}
        onClick={()=>{setActive(0);setOpen(value=>!value);}}
        onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setActive(event.key==='ArrowUp'?count-1:0);setOpen(true);}}}>
        <Icon name="more" size={22} strokeWidth={3}/>
      </Button>
      {open&&<div ref={menu} id={id} role="menu" aria-label={label} className={styles.menu} onKeyDown={keyDown}>
        {hasInfo&&<Button type="button" role="menuitem" tabIndex={active===0?0:-1} className={styles.item} aria-label={t('Töötaja {name} profiil',{name:staff.name})} aria-haspopup="dialog"
          onFocus={()=>setActive(0)} onClick={()=>{close(true);setIntroduction(true);}}>
          <span className={styles.icon}><Icon name="info" size={19}/></span><span>{t('Profiil')}</span>
        </Button>}
        {href&&<TextLink role="menuitem" tabIndex={active===count-1?0:-1} className={styles.item} href={href}
          aria-label={personalHref?t('Helista töötajale {name}: {phone}',{name:staff.name,phone:number!}):t('Helista ettevõttele')+': '+number}
          onFocus={()=>setActive(count-1)} onClick={()=>close(true)}>
          <span className={styles.icon}><Icon name="phone" size={18}/></span>
          <span className={styles.number}>{number}</span>
        </TextLink>}
      </div>}
    </div>
    <StaffIntroduction name={staff.name} title={staff.title} bio={staff.bio} open={introduction} onClose={()=>{setIntroduction(false);trigger.current?.focus();}}/>
  </>;
}
