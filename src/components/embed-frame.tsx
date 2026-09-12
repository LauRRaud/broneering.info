'use client';
import {useI18n} from '@/components/i18n-provider';

import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {validEmbedMessage} from '@/lib/embed-contracts';
import {resolveLocale} from '@/lib/locales';

const EmbedCloseContext=createContext<(()=>void)|null>(null);
export const useEmbedClose=()=>useContext(EmbedCloseContext);

export default function EmbedFrame({parentOrigin,children}:{parentOrigin:string;children:ReactNode}) {
  const {explicit,setLocale}=useI18n();
  useEffect(()=>{const selected=new URLSearchParams(location.search).get('lang');if(selected&&!explicit)setLocale(resolveLocale(selected),false);},[]);

  const content=useRef<HTMLDivElement>(null),channelRef=useRef(''),[modal,setModal]=useState(false);
  useEffect(()=>setModal(new URLSearchParams(location.search).get('modal')==='1'),[]);
  useEffect(()=>{
    if(window.parent===window || !content.current)return;
    let channel='';let previous=0;let scheduled=0;
    const send=(type:'broneering:ready'|'broneering:resize')=>{
      if(!channel||!content.current)return;
      // Include the language and appearance controls above the booking content.
      const height=Math.max(100,Math.min(20000,Math.ceil(content.current.getBoundingClientRect().bottom+window.scrollY)+16));
      if(type==='broneering:resize' && previous===height)return;
      previous=height;
      window.parent.postMessage({type,version:1,channel,height},parentOrigin);
    };
    const receive=(event:MessageEvent)=>{
      if(event.source!==window.parent||event.origin!==parentOrigin||!validEmbedMessage(event.data,'broneering:init'))return;
      channel=event.data.channel;channelRef.current=channel;send('broneering:ready');
    };
    const escape=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]') && channel){
        window.parent.postMessage({type:'broneering:close',version:1,channel},parentOrigin);
      }
    };
    const observer=new ResizeObserver(()=>{cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(()=>send('broneering:resize'));});
    observer.observe(content.current);observer.observe(document.body);window.addEventListener('message',receive);window.addEventListener('keydown',escape);
    return()=>{observer.disconnect();window.removeEventListener('message',receive);window.removeEventListener('keydown',escape);cancelAnimationFrame(scheduled);};
  },[parentOrigin]);
  const close=()=>{if(channelRef.current)window.parent.postMessage({type:'broneering:close',version:1,channel:channelRef.current},parentOrigin);};
  return <EmbedCloseContext.Provider value={modal?close:null}><div ref={content} data-booking-embed>{children}</div></EmbedCloseContext.Provider>;
}
