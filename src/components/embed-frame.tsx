'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {validEmbedMessage} from '@/lib/embed-contracts';

export default function EmbedFrame({parentOrigin,children}:{parentOrigin:string;children:ReactNode}) {
  const content=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(window.parent===window || !content.current)return;
    let channel='';let previous=0;let scheduled=0;
    const send=(type:'broneering:ready'|'broneering:resize')=>{
      if(!channel||!content.current)return;
      const height=Math.max(100,Math.min(20000,Math.ceil(content.current.getBoundingClientRect().height)+32));
      if(type==='broneering:resize' && previous===height)return;
      previous=height;
      window.parent.postMessage({type,version:1,channel,height},parentOrigin);
    };
    const receive=(event:MessageEvent)=>{
      if(event.source!==window.parent||event.origin!==parentOrigin||!validEmbedMessage(event.data,'broneering:init'))return;
      channel=event.data.channel;send('broneering:ready');
    };
    const escape=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && !event.defaultPrevented && channel){
        window.parent.postMessage({type:'broneering:close',version:1,channel},parentOrigin);
      }
    };
    const observer=new ResizeObserver(()=>{cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(()=>send('broneering:resize'));});
    observer.observe(content.current);window.addEventListener('message',receive);window.addEventListener('keydown',escape);
    return()=>{observer.disconnect();window.removeEventListener('message',receive);window.removeEventListener('keydown',escape);cancelAnimationFrame(scheduled);};
  },[parentOrigin]);
  return <div ref={content}>{children}</div>;
}
