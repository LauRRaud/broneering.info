'use client';
import {useEffect,useRef,useState} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import type {OnboardingState} from '@/lib/onboarding';
export default function Onboarding({tenantId}:{tenantId:string}){
  const {t}=useI18n(),[state,setState]=useState<OnboardingState|null>(null),[draft,setDraft]=useState({name:'',address:'',description:'',terms:'',reviewed:false}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[reason,setReason]=useState(''),[dirty,setDirty]=useState(false);
  const running=useRef(false);
  function install(value:OnboardingState){setState(value);setDraft({name:value.name,address:value.address,description:value.description,terms:value.terms,reviewed:value.rulesReviewed});setDirty(false);}
  useEffect(()=>{const controller=new AbortController();fetch(`/api/admin/onboarding?tenantId=${encodeURIComponent(tenantId)}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);if(!controller.signal.aborted)install(b);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[tenantId]);
  async function action(payload?:Record<string,unknown>){
    if(running.current)return;running.current=true;setBusy(true);setError('');setMessage('');
    try{
      const response=await fetch('/api/admin/onboarding'+(payload?'':`?tenantId=${encodeURIComponent(tenantId)}`),payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,version:state?.version,...payload})}:{cache:'no-store'});
      const body=await response.json();if(!response.ok)throw Error(body.error??t('Toiming ebaõnnestus.'));
      install(body);setMessage(t(payload?'Seaded on salvestatud.':'Kontrollnimekiri on värskendatud.'));
    }catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}
    finally{running.current=false;setBusy(false);}
  }
  return <section aria-labelledby="onboarding-title"><h3 id="onboarding-title">{t('Ettevõtte seadistamine ja avaldamine')}</h3>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {!state?<p>{t('Laadimine…')}</p>:<>
      <p>{t('Avaliku lehe seisund:')} {t({draft:'Avaldamata',published:'Avaldatud',paused:'Broneerimine peatatud',closed:'Suletud'}[state.state]??state.state)}</p>
      <ol>{state.checks.map(check=><li key={check.key}>{t(check.label)}: {t(check.ready?'Valmis':'Vajab seadistamist')}</li>)}</ol>
      <p>{t('Kontaktid ja halduslingi poliitika määra broneeringute seadetes. Teenused, töötajad ja graafikud seadista allpool.')}</p>
      <form onSubmit={e=>{e.preventDefault();void action({action:'profile',rulesVersion:state.rulesVersion,...draft});}}>
        {(['name','address','description','terms'] as const).map(key=><p key={key}><label>{t({name:'Ettevõtte nimi',address:'Aadress',description:'Kirjeldus',terms:'Broneerimistingimused'}[key])}<br/><textarea value={draft[key]} required={key==='name'||key==='address'} maxLength={{name:200,address:500,description:3000,terms:5000}[key]} rows={key==='terms'?5:2} onChange={e=>{setDraft({...draft,[key]:e.target.value});setDirty(true);setMessage('');}}/></label></p>)}
        <p><label><input type="checkbox" checked={draft.reviewed} onChange={e=>{setDraft({...draft,reviewed:e.target.checked});setDirty(true);setMessage('');}}/>{t('Olen broneerimisreeglid ja tingimused üle kontrollinud.')}</label></p>
        <button disabled={busy} type="submit">{t('Salvesta ettevõtte andmed')}</button>
      </form>
      {state.state==='draft'&&state.demo&&<p><a href={`/preview?tenantId=${encodeURIComponent(tenantId)}`} target="_blank" rel="noopener noreferrer">{t('Tee proovibroneering')}</a></p>}
      <p>{t('Avaldamisel tühistatakse proovibroneeringud ja nende halduslingid. Pärisbroneeringud säilivad.')}</p>
      <button type="button" disabled={busy||dirty} onClick={()=>void action()}>{t('Värskenda kontrollnimekirja')}</button>
      {dirty&&<button type="button" disabled={busy} onClick={()=>void action()}>{t('Tühista salvestamata muudatused ja laadi värske seis')}</button>}
      {dirty&&<p>{t('Salvesta muudatused enne kontrollnimekirja värskendamist või avaldamist.')}</p>}
      {['draft','paused'].includes(state.state)&&<p><button type="button" disabled={busy||dirty||!state.canPublish} onClick={()=>void action({action:'publish'})}>{t('Avalda broneerimisleht')}</button></p>}
      {state.state==='published'&&<form onSubmit={e=>{e.preventDefault();void action({action:'pause',reason});}}><p><label>{t('Uute broneeringute peatamise põhjus')}<br/><input value={reason} onChange={e=>setReason(e.target.value)} required minLength={10} maxLength={500}/></label></p><button disabled={busy||dirty} type="submit">{t('Peata uued broneeringud')}</button></form>}
    </>}
  </section>;
}
