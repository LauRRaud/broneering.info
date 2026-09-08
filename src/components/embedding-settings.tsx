'use client';
import {useI18n} from '@/components/i18n-provider';

import {useMemo,useState} from 'react';
import {installationCode} from '@/lib/embed-contracts';
export type EmbeddingSettings={origins:string[];domains:Array<{hostname:string;ready:boolean}>};
export default function EmbeddingSettingsForm({tenantId,settings,onSave}:{tenantId:string;settings:EmbeddingSettings;onSave:(origins:string[])=>Promise<boolean>}) {
  const {t,locale}=useI18n();

  const [text,setText]=useState(settings.origins.join('\n'));
  const [selected,setSelected]=useState(settings.origins[0]||'');
  const [busy,setBusy]=useState(false);
  const local=typeof window!=='undefined' && (window.location.hostname.endsWith('.localhost')||window.location.hostname==='localhost');
  const domain=settings.domains.find(d=>d.ready && (local?d.hostname.endsWith('.localhost'):d.hostname.endsWith('.broneering.info')));
  const root=domain?`${local?'http':'https'}://${domain.hostname}${local?`:${window.location.port}`:''}/`:'';
  const script=local?`${window.location.origin}/widget/v1.js`:'https://broneering.info/widget/v1.js';
  const snippets=useMemo(()=>root&&selected?installationCode(root,script,selected,locale):null,[root,script,selected,locale]);
  return <section aria-labelledby={`embedding-${tenantId}`}>
    <h3 id={`embedding-${tenantId}`}>{t("Kodulehele lisamine")}</h3>
    <p>{t("Lisa iga lubatud kodulehe täpne algusaadress eraldi reale, näiteks https://salong.ee ja https://www.salong.ee. Teekondi ega metamärke ei kasutata.")}</p>
    <form onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);try{await onSave(text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean));}finally{setBusy(false);}}}>
      <label htmlFor={`origins-${tenantId}`}>{t("Lubatud kodulehed (kuni 10)")}</label><br/>
      <textarea id={`origins-${tenantId}`} rows={5} cols={55} value={text} onChange={event=>setText(event.target.value)}/><br/>
      <button disabled={busy} type="submit">{t("Salvesta kodulehed")}</button>
    </form>
    {root?<p>{t("Broneerimisleht: ")}<a href={root} target="_blank" rel={"noopener noreferrer"}>{root}</a></p>:<p>{t("Broneerimisaadress vajab veel seadistamist või HTTPS-i kinnitamist.")}</p>}
    {settings.origins.length>0 && <p><label>{t("Paigalduskoha aadress ")}<select value={selected} onChange={event=>setSelected(event.target.value)}><option value="">{t("Vali koduleht")}</option>{settings.origins.map(origin=><option key={origin} value={origin}>{origin}</option>)}</select></label></p>}
    {snippets && <>{Object.entries(snippets).map(([key,value])=><p key={key}><label>{({link:t("Tavaline link"),inline:t("Lehesisene vaade"),modal:t("Modaal")} as Record<string,string>)[key]}<br/><textarea rows={key==='inline'?5:3} cols={80} readOnly value={value} onFocus={event=>event.target.select()}/></label></p>)}</>}
    <p>{t("Kodulehe platvorm peab lubama iframe-i ja skripti. Tavaline link töötab ka ilma skriptita. Modaalis sulgemine ei kinnita ega tühista broneeringut.")}</p>
  </section>;
}
