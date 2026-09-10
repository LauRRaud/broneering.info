"use client";
import Script from 'next/script';
import {useEffect,useRef} from 'react';

declare global { interface Window { turnstile?:{render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void;reset:(id:string)=>void} } }

export default function Turnstile({siteKey,onToken,resetSignal,label}:{siteKey:string;onToken:(token:string)=>void;resetSignal:number;label:string}){
  const element=useRef<HTMLDivElement>(null),widget=useRef<string|undefined>(undefined);
  const render=()=>{if(element.current&&window.turnstile&&!widget.current)widget.current=window.turnstile.render(element.current,{sitekey:siteKey,action:'booking',callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>onToken('')});};
  useEffect(()=>()=>{if(widget.current)window.turnstile?.remove(widget.current);},[]);
  useEffect(()=>{if(resetSignal&&widget.current)window.turnstile?.reset(widget.current);},[resetSignal]);
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={render}/><div ref={element} aria-label={label}/></>;
}
