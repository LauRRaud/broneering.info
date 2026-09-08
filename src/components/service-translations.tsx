"use client";
import {useEffect,useRef,useState} from 'react';
import {useI18n} from './i18n-provider';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {locales,localeNames,localeTags,type Locale} from '@/lib/locales';
import {translationStatus,type TranslationState,type TranslationService} from '@/lib/service-translation-contracts';

const statuses={missing:'Tõlge puudub',draft:'Mustand',review:'Vajab ülevaatamist',published:'Kinnitatud'};
export default function ServiceTranslations({tenantId,revision}:{tenantId:string;revision:string}){
  const {t,locale}=useI18n();
  const [state,setState]=useState<TranslationState|null>(null),[selected,setSelected]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[onlyPending,setOnlyPending]=useState(true),[dirty,setDirty]=useState(false);
  const generation=useRef(0),lock=useRef(false);
  const selectedRef=useRef(selected);selectedRef.current=selected;
  async function load(id=selectedRef.current){
    const current=++generation.current;
    try{const response=await fetch('/api/admin/translations?'+new URLSearchParams({tenantId,...(id?{serviceId:id}:{})}),{cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error);if(current===generation.current){setState(body);setError('');}}catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'Tõlkeid ei saanud laadida.');}
  }
  useEffect(()=>{void load();return()=>{generation.current++;};},[tenantId,revision,selected]);
  useEffect(()=>{const timer=setInterval(()=>{if(!lock.current)void load();},15000);return()=>clearInterval(timer);},[tenantId]);
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  async function change(payload:Record<string,unknown>){
    if(lock.current)return false;lock.current=true;setBusy(true);setError('');setMessage('');
    try{const response=await fetch('/api/admin/translations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,...payload})});const body=await response.json();if(!response.ok)throw Error(body.error);setDirty(false);await load();setMessage(payload.action==='publish'?'Tõlge kinnitati ja on kliendile nähtav.':payload.action==='generate'?'Tõlkemustandid loodi. Vaata need üle ja kinnita.':'Tõlkemustand salvestati.');return true;}catch(e){setError(e instanceof Error?e.message:'Tõlke salvestamine ebaõnnestus.');return false;}finally{lock.current=false;setBusy(false);}
  }
  const service=state?.services.find(s=>s.id===selected);
  useEffect(()=>{setMessage('');},[service?.contentVersion]);
  const pending=state?.services.filter(s=>s.active&&locales.some(l=>l!==s.sourceLanguage&&translationStatus(s,l)!=='published'))??[];
  return <section aria-labelledby="translations-title"><h3 id="translations-title">{t('Teenuste tõlked')}</h3><p>{t('Tõlgi teenuse nimi ja kirjeldus. Automaattõlge on mustand; kliendile avaldatakse ainult kinnitatud tõlge. Algteksti muutmisel tuleb tõlked uuesti üle vaadata.')}</p>
    {error&&<p role="alert">{t(error)}</p>}<p role="status">{busy?t('Salvestame…'):t(message)}</p>
    {!state?<button onClick={()=>load()}>{t('Laadi tõlked')}</button>:<>
      <p>{t('Ülevaatamist vajavaid teenuseid: {count}',{count:pending.length})}</p>
      <label><input type="checkbox" checked={onlyPending} onChange={e=>setOnlyPending(e.target.checked)}/>{t('Näita ainult puuduvaid ja ülevaatamist vajavaid tõlkeid')}</label>
      <ul>{(onlyPending?pending:state.services).map(s=><li key={s.id}><button disabled={busy||dirty} onClick={()=>{setSelected(s.id);setMessage('');}}>{s.name}{!s.active?t(' · arhiveeritud'):''}</button> — {locales.filter(l=>l!==s.sourceLanguage).map(l=>`${localeNames[l]}: ${t(statuses[translationStatus(s,l)])}`).join(' · ')}</li>)}</ul>
      <button disabled={busy} onClick={()=>load()}>{t('Värskenda tõlgete seisu')}</button>
      {dirty&&<p>{t('Sul on salvestamata tõlge. Salvesta see või loobu muudatustest enne teise teenuse avamist.')}</p>}
      {service&&<TranslationEditor key={service.id} service={service} generationAvailable={state.generationAvailable} busy={busy} change={change} setDirty={setDirty}/>}
      {service&&<details><summary>{t('Tekstide ja tõlgete ajalugu')}</summary><p>{t('Näidatakse 100 viimast muudatust.')}</p><ol>{state.history.map((event,index)=><li key={index}><p>{new Date(event.at).toLocaleString(localeTags[locale])} · {event.actorName??t('Süsteem')} · {t(({ 'catalog.save-service':'Algtekst salvestati','translation.saved':'Tõlkemustand salvestati.','translation.generated':'Automaattõlke mustand loodi','translation.published':'Tõlge kinnitati'} as Record<string,string>)[event.action]??event.action)} {typeof event.metadata.language==='string'?localeNames[event.metadata.language as Locale]:''}</p>{(['before','after'] as const).map(key=>{const content=event.metadata[key] as {name?:string;description?:string;language?:Locale}|null;return content?<div key={key}><strong>{t(key==='before'?'Enne:':'Pärast:')}</strong><p lang={content.language??(event.metadata.language as Locale)}>{content.name}<br/>{content.description}</p></div>:null;})}</li>)}</ol></details>}
    </>}
  </section>;
}
function TranslationEditor({service,generationAvailable,busy,change,setDirty}:{service:TranslationService;generationAvailable:boolean;busy:boolean;change:(payload:Record<string,unknown>)=>Promise<boolean>;setDirty:(value:boolean)=>void}){
  const {t}=useI18n();
  const [language,setLanguage]=useState<Locale>(locales.find(l=>l!==service.sourceLanguage)!),[name,setName]=useState(''),[description,setDescription]=useState(''),[dirty,setLocalDirty]=useState(false),[editVersion,setEditVersion]=useState(0),[editSource,setEditSource]=useState(service.contentVersion);
  const title=useRef<HTMLHeadingElement>(null);
  const row=service.translations.find(r=>r.language===language),status=translationStatus(service,language);
  function reset(){setName(row?.name??'');setDescription(row?.description??'');setEditVersion(row?.version??0);setEditSource(service.contentVersion);setLocalDirty(false);setDirty(false);}
  useEffect(()=>{title.current?.focus();},[]);
  useEffect(()=>{if(!dirty)reset();},[language,row?.version,service.contentVersion,dirty]);
  useEffect(()=>{if(!dirty&&language===service.sourceLanguage)setLanguage(locales.find(l=>l!==service.sourceLanguage)!);},[service.sourceLanguage,dirty,language]);
  const changed=()=>{setLocalDirty(true);setDirty(true);};
  const missing=locales.filter(l=>l!==service.sourceLanguage&&!service.translations.some(r=>r.language===l));
  return <article><h4 ref={title} tabIndex={-1}>{service.name}</h4><p>{t('Algteksti keel')}: {localeNames[service.sourceLanguage]}</p><blockquote lang={service.sourceLanguage}><strong>{service.name}</strong><p>{service.description}</p></blockquote>
    {!generationAvailable&&<p>{t('Automaattõlge pole veel seadistatud. Tõlked saad sisestada käsitsi.')}</p>}
    {!!missing.length&&<button disabled={busy||dirty||!generationAvailable} onClick={()=>change({action:'generate',serviceId:service.id,sourceVersion:service.contentVersion,targets:missing.map(language=>({language,version:0}))})}>{t('Loo puuduvad tõlked')}</button>}
    <p><label>{t('Tõlke keel')} <select disabled={busy||dirty} value={language} onChange={e=>setLanguage(e.target.value as Locale)}>{locales.filter(l=>l!==service.sourceLanguage).map(l=><option key={l} value={l}>{localeNames[l]}</option>)}</select></label> — {t(statuses[status])}</p>
    {status==='review'&&<p role="status">{t('Algtekst muutus. Kontrolli tõlget uue algteksti järgi ning salvesta enne kinnitamist uus mustand.')}</p>}
    {dirty&&(editSource!==service.contentVersion||editVersion!==(row?.version??0))&&<p role="alert">{t('Algtekst või tõlge muutus. Sinu tekst on alles. Kopeeri vajalikud parandused, loobu vormi muudatustest ja ava värske versioon.')}</p>}
    <form onSubmit={async e=>{e.preventDefault();if(await change({action:'save',serviceId:service.id,sourceVersion:editSource,language,version:editVersion,name,description})){setLocalDirty(false);setDirty(false);}}}>
      <p><label>{t('Tõlgitud teenusenimi')} <input lang={language} value={name} required maxLength={150} disabled={busy} onChange={e=>{setName(e.target.value);changed();}}/></label></p>
      <p><label>{t('Tõlgitud kirjeldus')} <textarea lang={language} value={description} maxLength={1000} rows={5} disabled={busy} onChange={e=>{setDescription(e.target.value);changed();}}/></label></p>
      <button disabled={busy}>{t('Salvesta mustand')}</button> <button type="button" disabled={busy||!dirty} onClick={reset}>{t('Loobu vormi muudatustest')}</button>
    </form>
    <p><button disabled={busy||dirty||!row||status==='review'||status==='published'} onClick={()=>change({action:'publish',serviceId:service.id,sourceVersion:service.contentVersion,language,version:row!.version})}>{t('Kinnita ja avalda tõlge')}</button> <button disabled={busy||dirty||!generationAvailable} onClick={()=>{if(!row||window.confirm(t('Kas asendada salvestatud tõlkemustand uue automaattõlkega?'))){void change({action:'generate',serviceId:service.id,sourceVersion:service.contentVersion,targets:[{language,version:row?.version??0}]});}}}>{t('Loo uus automaattõlke mustand')}</button></p>
    <p>{t('Varem kinnitatud tõlge jääb nähtavaks, kuni sama algteksti uus mustand kinnitatakse. Muutunud algteksti korral näidatakse kinnitamiseni põhikeelset teksti.')}</p>
  </article>;
}
