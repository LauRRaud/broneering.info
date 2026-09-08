'use client';
import {useEffect,useRef,useState} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import type {CompanyExitState} from '@/lib/company-exit';
export default function CompanyExit({tenantId,onChanged}:{tenantId:string;onChanged:()=>void}){
 const {t}=useI18n(),[state,setState]=useState<CompanyExitState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[cancelConfirmed,setCancelConfirmed]=useState(false);
 const [form,setForm]=useState({bookingStopsAt:'',serviceEndsAt:'',dataAccessUntil:'',deletionNotBefore:'',agreement:''});
 const running=useRef(false);
 function apply(s:CompanyExitState){setState(s);setForm({bookingStopsAt:s.bookingStopsAt??'',serviceEndsAt:s.serviceEndsAt??'',dataAccessUntil:s.dataAccessUntil??'',deletionNotBefore:s.deletionNotBefore??'',agreement:s.agreement??''});setConfirmed(false);setCancelConfirmed(false);}
 useEffect(()=>{const controller=new AbortController();void fetch(`/api/admin/exit?tenantId=${encodeURIComponent(tenantId)}`,{signal:controller.signal,cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);if(!controller.signal.aborted)apply(b);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[tenantId]);
 async function save(action:'schedule'|'cancel'){
  if(!state||running.current)return;running.current=true;setBusy(true);setError('');
  try{const r=await fetch('/api/admin/exit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,version:state.version,action,...(action==='schedule'?{...form,confirmed}:{})})});const b=await r.json();if(!r.ok)throw Error(b.error);apply(b);onChanged();}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}
 }
 const labels={bookingStopsAt:'Uute broneeringute peatamise aeg',serviceEndsAt:'Tellimuse lõpp',dataAccessUntil:'Ajutise andmeligipääsu lõpp',deletionNotBefore:'Varaseim andmete kustutamise aeg'};
 return <section aria-labelledby="company-exit-title"><h3 id="company-exit-title">{t('Teenusest lahkumine')}</h3>
  <p>{t('Lahkumiskava tähtajad peavad vastama lepingule. Olemasolevad broneeringud säilivad ning vana alamdomeen jääb reserveerituks. Andmete kustutamine toimub eraldi säilituskava järgi.')}</p>
  {error&&<p role="alert">{error}</p>}
  {state&&<>
   {state.scheduled&&<><p role="status">{t(state.accessExpired?'Ajutine andmeligipääs on lõppenud.':state.serviceEnded?'Tellimus on lõppenud.':state.bookingsStopped?'Uute broneeringute vastuvõtt on peatatud.':'Lahkumiskava on kinnitatud.')}</p><dl>{Object.entries(labels).map(([key,label])=><div key={key}><dt>{t(label)}</dt><dd>{state[key as keyof typeof labels]}</dd></div>)}</dl></>}
   {!state.accessExpired&&<p>{t('Säilivad tulevased broneeringud:')} {state.futureBookings}. <a href="#export-title">{t('Ekspordi ettevõtte andmed')}</a></p>}
   {(state.accessExpired||state.serviceEnded)?<p>{t('Taasavamiseks või tähtaja pikendamiseks võta ühendust platvormi haldajaga.')}</p>:<>
    <form onSubmit={e=>{e.preventDefault();void save('schedule');}}><fieldset disabled={busy}><legend>{t('Kokkulepitud lahkumiskava')}</legend>
     <p>{t('Sisesta täpsed ajatemplid koos ajavööndi nihkega (ISO 8601). Tähtajad järgivad allolevat järjekorda.')}</p>
     {Object.entries(labels).map(([key,label])=><p key={key}><label>{t(label)} <input required value={form[key as keyof typeof labels]} placeholder="2030-01-15T10:00:00+02:00" onChange={e=>{setForm({...form,[key]:e.target.value});setConfirmed(false);}}/></label></p>)}
     <p><label>{t('Lahkumiskokkuleppe viide')} <textarea required minLength={10} maxLength={1000} value={form.agreement} onChange={e=>{setForm({...form,agreement:e.target.value});setConfirmed(false);}}/></label></p>
     <p><label><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t('Kinnitan, et need tähtajad ja andmete tagastamise kord on kokku lepitud.')}</label></p>
     <button disabled={!confirmed}>{t('Salvesta lahkumiskava')}</button>
    </fieldset></form>
    {state.scheduled&&<fieldset disabled={busy}><legend>{t('Lahkumiskava tühistamine')}</legend><p>{t('Peatatud broneerimislehe saab pärast tühistamist uuesti avaldada seadistamise vaates.')}</p><label><input type="checkbox" checked={cancelConfirmed} onChange={e=>setCancelConfirmed(e.target.checked)}/>{t('Kinnitan lahkumiskava tühistamise')}</label>{' '}<button disabled={!cancelConfirmed} onClick={()=>void save('cancel')}>{t('Tühista lahkumiskava')}</button></fieldset>}
   </>}
  </>}
 </section>;
}
