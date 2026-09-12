'use client';
import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import Icon,{type IconName} from '@/components/ui/icon/icon';
import styles from './dropdown-menu.module.css';

type Item={id:string;label:string;checked:boolean;onSelect:()=>void;kind?:'radio'|'checkbox';icon?:IconName;lang?:string;separator?:boolean};
type Props={label:string;accessibleLabel:string;heading?:string;items:Item[];icon?:IconName;align?:'start'|'end';compact?:boolean};
export default function DropdownMenu({label,accessibleLabel,heading,items,icon,align='end',compact=false}:Props){
  const id=useId(),[open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
  const [active,setActive]=useState(0);
  const close=(returnFocus=false)=>{setOpen(false);if(returnFocus)trigger.current?.focus();};
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  useEffect(()=>{if(open)menu.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]')[active]?.focus();},[open,active]);
  function show(index?:number){setActive(index??Math.max(0,items.findIndex(item=>item.checked)));setOpen(true);}
  function keyDown(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
    else if(event.key==='Tab'){close();}
    else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();setActive(value=>event.key==='Home'?0:event.key==='End'?items.length-1:(value+(event.key==='ArrowDown'?1:-1)+items.length)%items.length);
    }
  }
  return <div ref={root} className={styles.root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))close();}}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={accessibleLabel} aria-expanded={open} aria-haspopup="menu" aria-controls={id} onClick={()=>open?close():show()} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show(event.key==='ArrowUp'?items.length-1:0);}}}>{icon&&<Icon name={icon} size={18}/>}<span>{label}</span><Icon name="chevron" size={16}/></button>
    {open&&<div className={styles.panel} data-align={align} data-compact={compact||undefined}>{heading&&<p className={styles.heading}>{heading}</p>}<div ref={menu} id={id} role="menu" aria-label={accessibleLabel} onKeyDown={keyDown}>
      {items.map((item,index)=><button key={item.id} type="button" role={item.kind==='checkbox'?'menuitemcheckbox':'menuitemradio'} aria-checked={item.checked} lang={item.lang} tabIndex={active===index?0:-1} className={styles.item} data-separator={item.separator||undefined} onFocus={()=>setActive(index)} onClick={()=>{item.onSelect();if(item.kind!=='checkbox')close(true);}}>
        {item.icon&&<Icon name={item.icon} size={18}/>}<span>{item.label}</span><span className={styles.check}>{item.checked&&<Icon name="check" size={17}/>}</span>
      </button>)}
    </div></div>}
  </div>;
}
