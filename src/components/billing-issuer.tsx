'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import BillingPartyFields,{billingPartyFromForm} from './billing-party-fields';
import type {BillingIssuerVersion} from '@/lib/billing-config';
export default function BillingIssuer(){
 const {t}=useI18n(),[issuer,setIssuer]=useState<BillingIssuerVersion|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[revision,setRevision]=useState(0);
 const pending=useRef<{signature:string;key:string}|null>(null),running=useRef(false);
 useEffect(()=>{const controller=new AbortController();setBusy(true);setError('');void fetch('/api/admin/billing?view=issuer',{cache:'no-store',signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error);if(!controller.signal.aborted){setIssuer(body.issuer);setLoaded(true);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[revision]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(running.current)return;const form=new FormData(e.currentTarget),data={action:'issuer',expectedVersion:issuer?.version??0,
  settings:{issuer:billingPartyFromForm(form),iban:String(form.get('iban')),numberPrefix:String(form.get('numberPrefix')),vatRegistered:form.get('vatRegistered')==='on',taxRateBasisPoints:Math.round(Number(form.get('taxRate'))*100),taxNote:String(form.get('taxNote'))},approvalNote:String(form.get('approvalNote')),confirmed:form.get('confirmed')==='on'},signature=JSON.stringify(data);
  if(pending.current?.signature!==signature)pending.current={signature,key:crypto.randomUUID()};running.current=true;setBusy(true);setError('');setSaved(false);
  try{const r=await fetch('/api/admin/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestKey:pending.current.key})});const body=await r.json();if(!r.ok)throw Error(body.error);setIssuer(body.issuer);setSaved(true);}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}
 }
 return <section><h3>{t('Arve väljastaja ja maksuseaded')}</h3><p>{t('Kinnita andmed raamatupidajaga. Uus seadistus kehtib järgmistele väljastatavatele arvetele; varasemad arved säilitavad oma andmed.')}</p>
  {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>setRevision(v=>v+1)}>{t('Laadi uuesti')}</button></p>}
  {saved&&<p role="status">{t('Arve väljastaja seaded on kinnitatud.')}</p>}
  {loaded&&<details><summary>{t('Muuda arve väljastaja seadeid')} ({issuer?.version??'—'})</summary><form key={issuer?.version??0} onSubmit={submit}><fieldset disabled={busy}>
   <BillingPartyFields value={issuer?.settings.issuer}/>
   <p><label>IBAN <input name="iban" defaultValue={issuer?.settings.iban??''} required maxLength={42}/></label></p>
   <p><label>{t('Arvenumbri eesliide')} <input name="numberPrefix" defaultValue={issuer?.settings.numberPrefix??''} required pattern="[A-Za-z][A-Za-z0-9-]{0,11}" maxLength={12}/></label></p>
   <p><label><input type="checkbox" name="vatRegistered" defaultChecked={issuer?.settings.vatRegistered??false}/>{t('Väljastaja on käibemaksukohustuslane')}</label></p>
   <p><label>{t('Kinnitatud maksumäär (%)')} <input name="taxRate" type="number" min="0" max="100" step="0.01" required defaultValue={issuer?issuer.settings.taxRateBasisPoints/100:''}/></label></p>
   <p><label>{t('Maksukäsitluse märkus')} <textarea name="taxNote" maxLength={500} defaultValue={issuer?.settings.taxNote??''}/></label></p>
   <p><label>{t('Raamatupidamise kinnituse viide')} <textarea name="approvalNote" required minLength={10} maxLength={1000}/></label></p>
   <p><label><input type="checkbox" name="confirmed" required/>{t('Väljastaja andmed, maksukäsitlus ja nummerdus on raamatupidamisega kinnitatud.')}</label></p>
   <button>{t('Kinnita arve väljastaja seaded')}</button></fieldset></form></details>}
 </section>;
}
