"use client";
import {useEffect,useRef,useState} from 'react';
import type {BookingResult} from '@/lib/contracts';
type Pending={key:string;body:string};
export function useBookingMutation(namespace:string,endpoint:string,headers:Record<string,string>={}){
  const [ready,setReady]=useState(false),[pending,setPending]=useState<Pending|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(''),[code,setCode]=useState(''),[result,setResult]=useState<BookingResult|null>(null);
  const lock=useRef(false),pendingRef=useRef<Pending|null>(null),storageKey='booking-command:'+namespace;
  useEffect(()=>{
    try{const raw=sessionStorage.getItem(storageKey);if(raw){const saved=JSON.parse(raw) as Pending;if(typeof saved.key==='string'&&typeof saved.body==='string'){pendingRef.current=saved;setPending(saved);setError('Eelmine toiming vajab tulemuse kontrolli. Korda sama taotlust.');}}}catch{}
    setReady(true);
  },[storageKey]);
  useEffect(()=>{if(!pending)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[pending]);
  function clear(){pendingRef.current=null;setPending(null);try{sessionStorage.removeItem(storageKey);}catch{}}
  async function send(payload?:unknown):Promise<BookingResult|null>{
    if(lock.current||!ready)return null;lock.current=true;setSaving(true);setError('');setCode('');setResult(null);
    try{
      const operation=pendingRef.current??{key:crypto.randomUUID(),body:JSON.stringify(payload)};
      pendingRef.current=operation;setPending(operation);try{sessionStorage.setItem(storageKey,JSON.stringify(operation));}catch{}
      let response:Response;
      try{response=await fetch(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json','Idempotency-Key':operation.key},body:operation.body});}
      catch{setError('Ühendus katkes. Tulemus pole teada; kontrolli sama taotluse tulemust uuesti.');return null;}
      let body:Partial<BookingResult>&{error?:string;code?:string};
      try{body=await response.json();}catch{
        if(response.status>=400&&response.status<500&&![401,403,429].includes(response.status))clear();
        setError('Serveri vastust ei saanud lugeda. Proovi uuesti.');return null;
      }
      if(!response.ok){
        // Admission/auth failures do not tell us whether an earlier lost reply committed.
        // Keep the same key across rate limits, reauthentication and temporary access loss.
        const retryable=['RATE_LIMIT','UNAUTHENTICATED','MFA_REQUIRED','EMAIL_UNVERIFIED','ORIGIN_REJECTED','LINK_UNAVAILABLE','STAFF_SCOPE_DENIED','MEMBERSHIP_REQUIRED','ACCOUNT_DISABLED'];
        if(response.status<500&&response.status!==429&&!retryable.includes(body.code??''))clear();
        setError(body.error||'Toiming ei õnnestunud.');setCode(body.code||'');return null;
      }
      if(!body.id||!body.reference||!body.version||!['confirmed','cancelled','completed','no_show'].includes(body.status??'')){
        setError('Serveri kinnitus oli puudulik. Kontrolli sama taotluse tulemust uuesti.');return null;
      }
      clear();setResult(body as BookingResult);return body as BookingResult;
    }catch{setError('Toimingut ei saanud lõpule viia. Proovi uuesti.');return null;}
    finally{lock.current=false;setSaving(false);}
  }
  return {ready,saving,uncertain:!!pending&&!saving,locked:!ready||!!pending,error,code,result,send};
}
