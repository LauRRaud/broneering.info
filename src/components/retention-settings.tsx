'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import type {RetentionState} from '@/lib/retention';

export default function RetentionSettings({tenantId}:{tenantId:string}){
 const {t}=useI18n();
 const [state,setState]=useState<RetentionState|null>(null),[days,setDays]=useState(''),[hold,setHold]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const running=useRef(false);
 function apply(value:RetentionState){setState(value);setDays(value.retainDays===null?'':String(value.retainDays));setHold(value.legalHold);setConfirmed(false);}
 useEffect(()=>{const controller=new AbortController();setState(null);setError('');fetch('/api/admin/retention?'+new URLSearchParams({tenantId}),{signal:controller.signal,cache:'no-store'}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error);if(!controller.signal.aborted)apply(body);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[tenantId,revision]);
 async function save(event:FormEvent){event.preventDefault();if(!state||!confirmed||running.current)return;running.current=true;setBusy(true);setError('');try{const response=await fetch('/api/admin/retention',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,version:state.version,retainDays:days===''?null:Number(days),legalHold:hold,confirmed})});const body=await response.json();if(!response.ok)throw Error(body.error);apply(body);}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}}
 return <section aria-labelledby="retention-title"><h3 id="retention-title">{t('Kliendikontaktide säilituskava')}</h3><p>{t('Tähtaega arvestatakse viimasest broneeringust. Tühi väli tähendab kinnitamata tähtaega. Arvete säilitamine otsustatakse eraldi.')}</p><p role="status">{t('Automaatne kontaktide eemaldamine ei ole veel kasutusel. Kava salvestamine ei kustuta andmeid.')}</p>
 {error&&<p role="alert">{t(error)} <button type="button" disabled={busy} onClick={()=>setRevision(v=>v+1)}>{t('Proovi uuesti')}</button></p>}
 {state&&<form onSubmit={save}><fieldset disabled={busy}><label>{t('Säilitamise päevade arv')} <input type="number" min={1} max={36500} step={1} value={days} onChange={e=>{setDays(e.target.value);setConfirmed(false);}}/></label><p><label><input type="checkbox" checked={hold} onChange={e=>{setHold(e.target.checked);setConfirmed(false);}}/>{t('Peata kontaktide eemaldamine säilitamiskohustuse tõttu')}</label></p><p><label><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t('Kinnitan, et säilituskava vastab ettevõtte põhjendatud vajadusele.')}</label></p><button disabled={!confirmed}>{t('Salvesta säilituskava')}</button></fieldset></form>}
 </section>;
}
