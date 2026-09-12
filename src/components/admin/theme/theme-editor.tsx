'use client';
import Button from '@/components/ui/button/button';
import Select from '@/components/ui/select/select';
import TextLink from '@/components/ui/text-link/text-link';
import Heading from '@/components/ui/heading/heading';
import {useEffect,useState} from 'react';
import {useI18n} from '@/components/i18n-provider';
import {localizedFetch} from '@/lib/client-fetch';
import {colorLabels,contrastIssues,defaultTheme,themeSchema,type ThemeState,type ThemeConfig} from '@/lib/theme-contracts';
import PaletteFields from './palette-fields';
import LogoFields from './logo-fields';
import ThemePreview from './theme-preview';
import styles from './theme-editor.module.css';

export default function ThemeEditor({tenantId}:{tenantId:string}){
  const {t}=useI18n(),[open,setOpen]=useState(false),[state,setState]=useState<ThemeState|null>(null),[config,setConfig]=useState<ThemeConfig>(defaultTheme),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const current=state?.draft??state?.published,dirty=!!state&&JSON.stringify(config)!==JSON.stringify(current?.config??defaultTheme),issues=contrastIssues(config);
  const valid=themeSchema.safeParse(config).success;
  function adopt(next:ThemeState){setState(next);setConfig(next.draft?.config??next.published?.config??defaultTheme);}
  async function load(){setBusy(true);setError('');try{const response=await localizedFetch(`/api/admin/theme?tenantId=${tenantId}`,{signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error);adopt(data);}catch(e){setError(e instanceof Error?e.message:t('Kujundust ei saanud laadida.'));}finally{setBusy(false);}}
  useEffect(()=>{if(open&&!state&&!busy&&!error)void load();},[open,state,busy,error]); // A failed request waits for the explicit retry.
  const expected={tenantId,version:state?.draft?.version??null,revision:state?.draft?.revision??null,publishedVersion:state?.published?.version??null};
  async function change(action:'save'|'publish'|'restore',restoreVersion?:number){
    if(busy)return;setBusy(true);setError('');setMessage('');
    try{const response=await localizedFetch('/api/admin/theme',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...expected,action,...(action==='save'?{config}:{}),...(restoreVersion?{restoreVersion}:{})}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error);adopt(data);setMessage(t(action==='publish'?'Kujundus on avaldatud.':action==='restore'?'Varasem kujundus on taastatud mustandisse. Kontrolli ja avalda.':'Kujunduse mustand on salvestatud.'));}
    catch(e){setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:t('Vastus katkes. Laadi kujundus uuesti ja kontrolli tulemust.'));}finally{setBusy(false);}
  }
  async function logo(slot:'light'|'dark',file:File|null){
    setBusy(true);setError('');setMessage('');
    try{const q=new URLSearchParams(Object.fromEntries(Object.entries({...expected,slot}).map(([k,v])=>[k,String(v)])));const response=await localizedFetch('/api/admin/theme-logo?'+q,{method:file?'PUT':'DELETE',...(file?{headers:{'Content-Type':file.type},body:file}:{}),signal:AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok)throw new Error(data.error);adopt(data);setMessage(t('Logo muudatus on salvestatud mustandisse.'));}
    catch(e){setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:t('Vastus katkes. Laadi kujundus uuesti ja kontrolli tulemust.'));throw e;}finally{setBusy(false);}
  }
  return <details className={styles.editor} open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t('Broneerimislehe kujundus')}</summary>
    {busy&&<p role="status">{t('Töötleme kujundust…')}</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <p><Button type="button" disabled={busy} onClick={()=>{if(!dirty||window.confirm(t('Loobuda salvestamata kujundusmuudatustest?')))void load();}}>{t('Laadi kujundus uuesti')}</Button></p>
    {state&&<><p id="theme-help">{t('Muudatused jõuavad broneerimislehele ja veebilehele lisatud broneerimisaknasse alles avaldamisel.')}{' '}<TextLink href="/juhend#kujundus" target="_blank" rel="noopener">{t('Kujunduse juhend')}</TextLink></p>
      <p>{t('Avaldatud versioon')}: {state.published?.version??'—'} · {t('Mustand')}: {state.draft?.version??'—'}{dirty?' · '+t('Salvestamata muudatused'):''}</p>
      <div className={styles.layout}><div>
        <fieldset disabled={busy}><legend>{t('Ettevõtte tähis päises')}</legend>
          <label>{t('Näita päises')}{' '}<Select value={config.brandDisplay??'logo'} onChange={e=>setConfig({...config,brandDisplay:e.target.value as 'name'|'logo'})}><option value="name">{t('Ettevõtte nimi')}</option><option value="logo">{t('Logo')}</option></Select></label>
          <p>{t('Tähis kuvatakse broneerimislehe päises vasakul. Logo puudumisel või laadimisveal kuvatakse ettevõtte nimi.')}</p>
        </fieldset>
        <fieldset disabled={busy}><legend>{t('Värvid ja font')}</legend><p><label>{t('Font')}{' '}<Select value={config.font} onChange={e=>setConfig({...config,font:e.target.value as ThemeConfig['font']})}><option value="editorial">Cormorant Garamond</option><option value="modern">Manrope</option><option value="system">{t('Seadme põhifont')}</option><option value="humanist">{t('Humanistlik sans-serif')}</option><option value="serif">{t('Seriifidega font')}</option></Select></label></p><p><label>{t('Pealkirjade font')}{' '}<Select value={config.headingFont??'serif'} onChange={e=>setConfig({...config,headingFont:e.target.value as ThemeConfig['font']})}><option value="editorial">Cormorant Garamond</option><option value="modern">Manrope</option><option value="system">{t('Seadme põhifont')}</option><option value="humanist">{t('Humanistlik sans-serif')}</option><option value="serif">{t('Seriifidega font')}</option></Select></label></p><p>{t('Saad valida kaasasolevate veebifontide ja seadme fontide vahel. Veebifondid laaditakse meie serverist.')}</p>
          {(['light','dark'] as const).map(mode=><details key={mode} open={mode==='light'}><summary>{t(mode==='light'?'Heleda vaate värvid':'Tumeda vaate värvid')}</summary><PaletteFields value={config[mode]} onChange={value=>setConfig({...config,[mode]:value})}/><Button type="button" onClick={()=>setConfig({...config,[mode]:defaultTheme[mode]})}>{t('Taasta selle vaate vaikevärvid')}</Button></details>)}
        </fieldset>
        <p>{t('Soovitame läbipaistva taustaga PNG- või WebP-logo. JPG on samuti lubatud. Kuni 10 MB. Teine logoversioon on valikuline; selle puudumisel kasutatakse sama logo mõlemas vaates.')}</p>
        <p>{t('Taustaga logo on samuti lubatud. Pildi tausta automaatselt ei eemaldata.')}</p>
        {(!state.draft||dirty)&&<p>{t('Salvesta värvide ja fondi mustand enne logo lisamist või eemaldamist.')}</p>}
        <LogoFields slot="light" url={current?.lightLogo} disabled={busy||!state.draft||dirty} onSave={file=>logo('light',file)}/><LogoFields slot="dark" url={current?.darkLogo} disabled={busy||!state.draft||dirty} onSave={file=>logo('dark',file)}/>
      </div><ThemePreview theme={{config:valid?config:(current?.config??defaultTheme),lightLogo:current?.lightLogo,darkLogo:current?.darkLogo}}/></div>
      {!valid&&<p role="alert">{t('Värvikood peab olema kujul #123ABC. Paranda kood enne salvestamist.')}</p>}
      <section aria-label={t('Kontrastikontroll')}><Heading as="h3">{t('Kontrastikontroll')}</Heading><p>{t('Teksti kontrast peab olema vähemalt 4,5 : 1 ning juhtnuppude ja valiku eristus vähemalt 3 : 1. Kõrge kontrastiga vaade kasutab kindlaid loetavaid värve.')}</p>
        {issues.length?<><p role="status">{t('Avaldamiseks paranda järgmised värvipaarid:')}</p><ul>{issues.map(issue=><li key={`${issue.mode}-${issue.foreground}-${issue.background}`}>{t(issue.mode==='light'?'Hele':'Tume')}: {t(colorLabels[issue.foreground])} / {t(colorLabels[issue.background])} — {issue.ratio.toFixed(2)} : 1 ({t('vähemalt')} {issue.minimum} : 1)</li>)}</ul></>:<p role="status">{t('Kontrollitud värvipaarid vastavad kontrasti alampiiridele.')}</p>}
        <p>{t('Kontrastikontroll ei asenda kogu kasutajateekonna ligipääsetavuse auditit. Logo loetavust kontrolli eelvaates ise.')}</p>
      </section>
      <div className={styles.actions}><Button type="button" disabled={busy||!valid} onClick={()=>void change('save')}>{t('Salvesta kujunduse mustand')}</Button><Button type="button" disabled={busy||!valid||dirty||!state.draft||issues.length>0} onClick={()=>void change('publish')}>{t('Avalda kujundus')}</Button>{state.draft&&<TextLink href={`/preview?tenantId=${tenantId}&theme=draft`} target="_blank" rel="noopener">{t('Ava salvestatud mustandi broneerimisvaade')}</TextLink>}</div>
      <p>{t('Salvestatud mustandi eelvaates saab läbida broneerimissamme; lõplik kinnitamine on välja lülitatud.')}</p>
      {(state.history.length>0||state.published)&&<details><summary>{t('Taasta varasem kujundus')}</summary><p>{t('Taastamine asendab praeguse mustandi. Avalik leht muutub alles pärast avaldamist.')}</p><ul>{[...(state.published?[{version:state.published.version,publishedAt:''}]:[]),...state.history].map(item=><li key={item.version}>{t('Versioon')} {item.version}{' '}<Button type="button" disabled={busy} onClick={()=>{if(window.confirm(t('Asendada praegune mustand valitud versiooniga?')))void change('restore',item.version);}}>{t('Taasta mustandisse')}</Button></li>)}</ul></details>}
    </>}
  </details>;
}
