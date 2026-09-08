'use client';
import {useEffect,useRef,useState} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import {localeTags} from '@/lib/locales';
import type {ExportJob} from '@/lib/export-management';
export default function ExportManagement({tenantId}:{tenantId:string}){
  const {t,locale}=useI18n(),[jobs,setJobs]=useState<ExportJob[]>([]),[hours,setHours]=useState(24),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const pending=useRef<{hours:number;key:string}|null>(null),running=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    const load=async()=>{if(document.hidden)return;try{const r=await fetch(`/api/admin/exports?tenantId=${encodeURIComponent(tenantId)}`,{cache:'no-store',signal:controller.signal});const b=await r.json();if(!r.ok)throw Error(b.error);if(!controller.signal.aborted)setJobs(b.jobs);}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}};
    void load();const timer=setInterval(()=>void load(),10000);return()=>{clearInterval(timer);controller.abort();};
  },[tenantId]);
  async function create(){
    if(running.current)return;running.current=true;setBusy(true);setError('');setMessage('');
    if(pending.current?.hours!==hours)pending.current={hours,key:crypto.randomUUID()};
    try{
      const r=await fetch('/api/admin/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,requestKey:pending.current.key,expiresHours:hours})});const b=await r.json();if(!r.ok)throw Error(b.error);
      setMessage(t('Eksport on tellitud. Valmis fail ilmub allalaadimiseks siia.'));pending.current=null;
      const state=await fetch(`/api/admin/exports?tenantId=${encodeURIComponent(tenantId)}`,{cache:'no-store'});if(state.ok)setJobs((await state.json()).jobs);
    }catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}
  }
  const labels:Record<string,string>={pending:'Ootel',running:'Koostamisel',ready:'Valmis',failed:'Tõrge',expired:'Aegunud',cancelled:'Tühistatud'};
  return <section aria-labelledby="export-title"><h3 id="export-title">{t('Ettevõtte andmete eksport')}</h3>
    <p>{t('JSONL-fail sisaldab ettevõtte seadeid, teenuseid, töötajaid, graafikuid, kliente, broneeringuid ja arveldusandmeid. Iga rida on JSON-kirje; seosed säilivad tunnuste kaudu.')}</p>
    <p>{t('Fail koostatakse taustal ja on allalaaditav ainult sisselogitud omanikule. Aegumisaeg algab tellimisest. Ühe faili piir on 512 MiB.')}</p>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <form onSubmit={e=>{e.preventDefault();void create();}}><p><label>{t('Faili kehtivus tundides')}<br/><input type="number" min={1} max={168} required value={hours} onChange={e=>setHours(Number(e.target.value))}/></label></p><button type="submit" disabled={busy}>{t('Telli andmete eksport')}</button></form>
    <ul>{jobs.map(job=><li key={job.id}>{t(labels[job.status]??job.status)} · {new Date(job.createdAt).toLocaleString(localeTags[locale])} · {t('Aegub:')} {new Date(job.expiresAt).toLocaleString(localeTags[locale])}{job.status==='ready'&&<> · {job.recordCount} {t('kirjet')} · {job.bytes} B <a href={`/api/admin/exports?tenantId=${encodeURIComponent(tenantId)}&download=${job.id}`} download>{t('Laadi eksport alla')}</a></>}{job.errorCode&&<small> ({job.errorCode})</small>}</li>)}</ul>
  </section>;
}
