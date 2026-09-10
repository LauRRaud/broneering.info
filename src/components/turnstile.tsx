"use client";
import Script from 'next/script';
import {useEffect,useRef} from 'react';

declare global { interface Window { turnstile?:{render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void;reset:(id:string)=>void} } }

export default function Turnstile({siteKey,onToken,resetSignal,label}:{siteKey:string;onToken:(token:string)=>void;resetSignal:number;label:string}){
  const element=useRef<HTMLDivElement>(null),widget=useRef<string|undefined>(undefined);
  const tokenCallback=useRef(onToken);
  useEffect(()=>{tokenCallback.current=onToken;},[onToken]);
  const render=()=>{if(element.current&&window.turnstile&&widget.current===undefined)widget.current=window.turnstile.render(element.current,{sitekey:siteKey,action:'booking',callback:(token:string)=>tokenCallback.current(token),'expired-callback':()=>tokenCallback.current(''),'error-callback':()=>tokenCallback.current('')});};
  useEffect(()=>{
    // Also recreate an already loaded widget after effect cleanup in Strict Mode.
    render();
    return ()=>{
      if(widget.current!==undefined)window.turnstile?.remove(widget.current);
      widget.current=undefined;
      tokenCallback.current('');
    };
  },[siteKey]);
  useEffect(()=>{if(resetSignal&&widget.current!==undefined){tokenCallback.current('');window.turnstile?.reset(widget.current);}},[resetSignal]);
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render}/><div ref={element} aria-label={label}/></>;
}
