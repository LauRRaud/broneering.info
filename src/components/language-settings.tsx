"use client";
import {useEffect,useState} from 'react';
import {useI18n} from './i18n-provider';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {locales,localeNames,type Locale} from '@/lib/locales';
export default function LanguageSettings({tenantId,owner}:{tenantId:string;owner:boolean}){
  const {t,locale,explicit,setLocale}=useI18n();
  const [company,setCompany]=useState<Locale>('et'),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{let active=true;fetch('/api/admin/language?tenantId='+tenantId,{cache:'no-store'}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error);if(active){setCompany(body.defaultLanguage);if(!explicit)setLocale(body.adminLanguage,false);setReady(true);}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[tenantId]);
  return <section aria-labelledby="language-settings-title"><h3 id="language-settings-title">{t('Keele-eelistused')}</h3><form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const response=await fetch('/api/admin/language',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,adminLanguage:locale,...(owner?{defaultLanguage:company}:{})})});const body=await response.json();if(!response.ok)throw Error(body.error);setLocale(locale);setMessage('Keele-eelistused salvestati.');}catch(e){setMessage(e instanceof Error?e.message:'Salvestamine ebaõnnestus.');}finally{setBusy(false);}}}>
    <p>{t('Minu halduskeel')}: {localeNames[locale]}</p>
    {owner&&<label>{t('Ettevõtte vaikekeel')} <select value={company} disabled={!ready||busy} onChange={e=>setCompany(e.target.value as Locale)}>{locales.map(l=><option key={l} value={l} lang={l}>{localeNames[l]}</option>)}</select></label>}
    <p>{t('Kliendi valitud keel on ettevõtte vaikekeele ees. Teenuste sisu tõlkeid see seadistus ei loo.')}</p>
    <button disabled={!ready||busy}>{t('Salvesta keele-eelistused')}</button><p role="status">{t(message)}</p>
  </form></section>;
}
