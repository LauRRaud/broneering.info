'use client';
import {useEffect,useRef,useState} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
type Kind='services'|'staff'|'customers'|'bookings';
type Batch={source_purged_at:string|null;id:string;kind:Kind;status:string;headers:string[];mapping:Record<string,number>;total_rows:number;imported_rows:number;rejected_rows:number;version:number;cutover_at:string|null;timezone:string|null;reminders_enabled:boolean;error_report:{errors:number;warnings:number}[]};
type Row={row_number:number;source_values:string[];normalized:Record<string,unknown>;status:string;error_code:string|null;warning_codes:string[]};
type Setup={timezone:string;fields:Record<Kind,string[]>;groups:{id:string;name:string}[];services:{id:string;name:string}[];staff:{id:string;name:string}[]};
const kinds:Record<Kind,string>={services:'Teenused',staff:'Töötajad',customers:'Kliendid',bookings:'Broneeringud'};
const statuses:Record<string,string>={uploaded:'Üles laaditud',preview:'Eelvaade',completed:'Lõpetatud',cancelled:'Tühistatud',imported:'Imporditud',skipped:'Vahele jäetud',failed:'Tõrge'};
const fields:Record<string,string>={externalId:'Vana süsteemi tunnus',name:'Nimi',groupId:'Teenusegrupi tunnus',description:'Kirjeldus',priceCents:'Hind sentides',duration:'Kestus minutites',bufferBefore:'Ettevalmistus minutites',bufferAfter:'Lõpetamine minutites',title:'Ametinimetus',bio:'Tutvustus',email:'E-post',phone:'Telefon',serviceId:'Teenuse tunnus',staffId:'Töötaja tunnus',startAt:'Algusaeg koos ajavööndi nihkega'};
const rowErrors:Record<string,string>={CSV_ROW_WIDTH:'Reas on vale arv veerge.',GROUP_NOT_FOUND:'Aktiivset teenusegruppi ei leitud.',ASSIGNMENT_NOT_FOUND:'Aktiivset töötaja ja teenuse seost ei leitud.',DUPLICATE_EXTERNAL_ID:'Vana süsteemi tunnus kordub selles failis.',EXTERNAL_ID_IMPORTED:'Vana süsteemi tunnus on juba imporditud.',DUPLICATE_ROW:'Sama kirje kordub selles failis.',ALREADY_IMPORTED:'Sama kirje on juba imporditud.',BOOKING_TIMEZONE:'Algusaeg ei vasta ettevõtte ajavööndile.',BOOKING_PAST:'Algusaeg peab olema tulevikus ja pärast üleminekuaega.',BOOKING_OVERLAP:'Aeg kattub teise broneeringuga.'};
async function api(url:string,options?:RequestInit){const r=await fetch(url,options);const b=await r.json();if(!r.ok)throw Error(b.error);return b;}
const json=(method:string,data:unknown)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
export default function ImportManagement({tenantId}:{tenantId:string}){
  const {t}=useI18n(),[setup,setSetup]=useState<Setup|null>(null),[batches,setBatches]=useState<Batch[]>([]),[selected,setSelected]=useState(''),[kind,setKind]=useState<Kind>('customers'),[delimiter,setDelimiter]=useState(','),[file,setFile]=useState<File|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const running=useRef(false),pending=useRef<{file:File;kind:Kind;delimiter:string;key:string}|null>(null);
  const base=`/api/admin/imports?tenantId=${encodeURIComponent(tenantId)}`;
  async function reload(){const [b,s]=await Promise.all([api(base),api(base+'&setup=1')]);setBatches(b.batches);setSetup(s);}
  useEffect(()=>{const controller=new AbortController();void Promise.all([api(base+'&setup=1',{signal:controller.signal}),api(base,{signal:controller.signal})]).then(([s,b])=>{if(!controller.signal.aborted){setSetup(s);setBatches(b.batches);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[base]);
  async function upload(){
    if(!file||running.current)return;running.current=true;setBusy(true);setError('');
    if(pending.current?.file!==file||pending.current.kind!==kind||pending.current.delimiter!==delimiter)pending.current={file,kind,delimiter,key:crypto.randomUUID()};
    try{
      const result=await api(base+`&kind=${kind}&delimiter=${encodeURIComponent(delimiter)}`,{method:'POST',headers:{'Content-Type':'text/csv','Idempotency-Key':pending.current.key},body:file});
      pending.current=null;setSelected(result.id);await reload();
    }catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}
  }
  return <section aria-labelledby="import-title"><h3 id="import-title">{t('CSV-import')}</h3>
    <p>{t('Laadi üles UTF-8 CSV-fail (kuni 5 MiB ja 10 000 rida). Hinnad on sentides ning kestused minutites. Teenused ja töötajad lisatakse veebis peidetuna; kasutajakontosid import ei loo.')}</p>
    <p>{t('Broneeringute ajad peavad sisaldama ajavööndi nihet, näiteks 2030-01-15T10:00:00+02:00. Teenuse ja töötaja seos peab olema enne importi seadistatud. Algseid kinnituskirju ei saadeta.')}</p>
    {error&&<p role="alert">{error}</p>}
    <form onSubmit={e=>{e.preventDefault();void upload();}}><fieldset disabled={busy}><legend>{t('Uus import')}</legend>
      <label>{t('Andmete liik')} <select value={kind} onChange={e=>setKind(e.target.value as Kind)}>{Object.entries(kinds).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select></label>{' '}
      <a href={base+`&template=${kind}`} download>{t('Laadi CSV-mall alla')}</a>
      <p><label>{t('Eraldaja')} <select value={delimiter} onChange={e=>setDelimiter(e.target.value)}><option value=",">{t('Koma')}</option><option value=";">{t('Semikoolon')}</option></select></label></p>
      <p><label>{t('CSV-fail')} <input type="file" accept=".csv,text/csv" required onChange={e=>setFile(e.target.files?.[0]??null)}/></label></p><button disabled={!setup||!file}>{t('Laadi fail eelvaatesse')}</button>
    </fieldset></form>
    {setup&&<details><summary>{t('Mallides kasutatavad tunnused')}</summary><p>{t('Kopeeri sobiv tunnus CSV-faili. externalId on vana süsteemi kirje tunnus; selle kordus märgitakse veaks. Sama e-posti aadressiga kliente ei ühendata automaatselt.')}</p>{(['groups','services','staff'] as const).map(group=><div key={group}><h4>{t(group==='groups'?'Teenusegrupid':group==='services'?'Teenused':'Töötajad')}</h4><ul>{setup[group].map(item=><li key={item.id}>{item.name}: <code>{item.id}</code></li>)}</ul></div>)}</details>}
    <p><label>{t('Impordipartii')} <select value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">{t('Vali import')}</option>{batches.map(b=><option value={b.id} key={b.id}>{t(kinds[b.kind])} · {b.id.slice(0,8)} · {t(statuses[b.status]??b.status)} · {b.total_rows}</option>)}</select></label></p>
    {selected&&setup&&<ImportDetail key={selected} id={selected} tenantId={tenantId} setup={setup} onChanged={reload}/>}
  </section>;
}
function ImportDetail({id,tenantId,setup,onChanged}:{id:string;tenantId:string;setup:Setup;onChanged:()=>Promise<void>}){
  const {t}=useI18n(),[batch,setBatch]=useState<Batch|null>(null),[rows,setRows]=useState<Row[]>([]),[next,setNext]=useState<number|null>(null),[mapping,setMapping]=useState<Record<string,number>>({}),[cutover,setCutover]=useState(new Date().toISOString()),[dirty,setDirty]=useState(false),[skipInvalid,setSkipInvalid]=useState(false),[skipDuplicates,setSkipDuplicates]=useState(false),[notify,setNotify]=useState(false),[cancel,setCancel]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const running=useRef(false),base=`/api/admin/imports?tenantId=${encodeURIComponent(tenantId)}&id=${id}`;
  function apply(result:{batches:Batch[];rows:Row[];nextAfter:number|null}){
    const b=result.batches[0];setBatch(b);setRows(result.rows);setNext(result.nextAfter);setMapping(Object.keys(b.mapping).length?b.mapping:Object.fromEntries(b.headers.map((h,i)=>[h,i]).filter(([h])=>setup.fields[b.kind].includes(String(h)))));setCutover(b.cutover_at??new Date().toISOString());setDirty(false);
  }
  useEffect(()=>{const controller=new AbortController();void api(base,{signal:controller.signal}).then(b=>{if(!controller.signal.aborted)apply(b);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[base]);
  async function act(method:string,data:unknown){
    if(running.current)return;running.current=true;setBusy(true);setError('');setMessage('');
    try{await api('/api/admin/imports',json(method,data));apply(await api(base));await onChanged();setMessage('Toiming on tehtud.');setCancel(false);setNotify(false);}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}
  }
  async function more(){if(next===null||running.current)return;running.current=true;setBusy(true);try{const b=await api(base+'&after='+next);setRows(previous=>[...previous,...b.rows]);setNext(b.nextAfter);}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}}
  if(!batch)return error?<p role="alert">{error}</p>:<p>{t('Laadin…')}</p>;
  const editable=['uploaded','preview'].includes(batch.status),identity={tenantId,id,version:batch.version};
  return <div>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{t(message)}</p>}
    <p>{t('Ridu:')} {batch.total_rows} · {t('Imporditud:')} {batch.imported_rows} · {t('Vahele jäetud:')} {batch.rejected_rows}</p>
    {batch.status==='preview'&&<p role="status">{t('Kogu partii vigased read:')} {batch.error_report[0]?.errors??0} · {t('Duplikaadikahtlusega read:')} {batch.error_report[0]?.warnings??0}</p>}
    {editable&&<form onSubmit={e=>{e.preventDefault();void act('PATCH',{...identity,mapping,timezone:setup.timezone,cutoverAt:cutover});}}><fieldset disabled={busy}><legend>{t('Väljade vastendus')}</legend>
      {setup.fields[batch.kind].map(field=><p key={field}><label>{t(fields[field]??field)} <select value={mapping[field]??''} onChange={e=>{const updated={...mapping};if(e.target.value==='')delete updated[field];else updated[field]=Number(e.target.value);setMapping(updated);setDirty(true);}}><option value="">{t('Ära impordi seda välja')}</option>{batch.headers.map((h,i)=><option key={i} value={i}>{h}</option>)}</select></label></p>)}
      <p>{t('Ajavöönd:')} {setup.timezone}</p><p><label>{t('Kokkulepitud üleminekuaeg (ISO 8601)')} <input required value={cutover} onChange={e=>{setCutover(e.target.value);setDirty(true);}}/></label></p>
      <button>{t('Kontrolli eelvaadet')}</button></fieldset></form>}
    <div style={{overflowX:'auto'}} tabIndex={0} role="region" aria-label={t('Impordi read')}><table><thead><tr><th>{t('Rida')}</th><th>{t('Andmed')}</th><th>{t('Seisund ja vead')}</th></tr></thead><tbody>{rows.map(row=><tr key={row.row_number}><td>{row.row_number}</td><td>{Object.keys(row.normalized).length?Object.entries(row.normalized).map(([k,v])=><div key={k}>{t(fields[k]??k)}: {String(v)}</div>):row.source_values.join(' | ')}</td><td>{t(statuses[row.status]??row.status)}{[...(row.error_code?.split(',')??[]),...row.warning_codes].map(code=><div key={code}>{code.startsWith('FIELD_')?t('Kontrolli välja:')+' '+t(fields[code.slice(6)]??code.slice(6)):t(rowErrors[code]??code)}</div>)}</td></tr>)}</tbody></table></div>
    {next!==null&&<button disabled={busy} onClick={()=>void more()}>{t('Näita järgmisi ridu')}</button>}
    {batch.status==='preview'&&<fieldset disabled={busy||dirty}><legend>{t('Impordi kinnitamine')}</legend><p>{t('Kinnitus rakendub kogu partiile, ka järgmistele lehekülgedele. Vigaseid ja duplikaadikahtlusega ridu saab ainult alloleva kinnitusega vahele jätta.')}</p>
      <p><label><input type="checkbox" checked={skipInvalid} onChange={e=>setSkipInvalid(e.target.checked)}/>{t('Jäta vigased read vahele')}</label></p><p><label><input type="checkbox" checked={skipDuplicates} onChange={e=>setSkipDuplicates(e.target.checked)}/>{t('Jäta duplikaadikahtlusega read vahele')}</label></p>
      <button onClick={()=>void act('PUT',{...identity,skipInvalid,skipDuplicates})}>{t('Kinnita import')}</button></fieldset>}
    {editable&&<fieldset disabled={busy}><legend>{t('Impordi tühistamine')}</legend><label><input type="checkbox" checked={cancel} onChange={e=>setCancel(e.target.checked)}/>{t('Eemalda selle lõpetamata impordi fail ja eelvaate andmed')}</label>{' '}<button disabled={!cancel} onClick={()=>void act('PATCH',{...identity,action:'cancel'})}>{t('Tühista import')}</button></fieldset>}
    {['completed','cancelled'].includes(batch.status)&&!batch.source_purged_at&&<fieldset disabled={busy}><legend>{t('Impordi algandmete eemaldamine')}</legend><p>{t('Eemaldatakse kogu selle impordi algfail ja eelvaate andmed. Loodud kliendikaardid ja broneeringud säilivad.')}</p><label><input type="checkbox" checked={cancel} onChange={e=>setCancel(e.target.checked)}/>{t('Kinnitan impordi algandmete eemaldamise')}</label>{' '}<button disabled={!cancel} onClick={()=>void act('PATCH',{...identity,action:'discard-source',confirmed:true})}>{t('Eemalda impordi algandmed')}</button></fieldset>}
    {batch.source_purged_at&&<p>{t('Impordi algandmed on eemaldatud.')}</p>}
    {batch.kind==='bookings'&&batch.status==='completed'&&!batch.reminders_enabled&&<fieldset disabled={busy}><legend>{t('Imporditud broneeringute teavitused')}</legend><p>{t('Eraldi kinnitus lubab tulevased meeldetuletused ja järgnevate muudatuste kliendikirjad. Juba möödunud meeldetuletusaegu ei saadeta tagantjärele.')}</p><label><input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)}/>{t('Kinnitan klienditeavituste lubamise')}</label>{' '}<button disabled={!notify} onClick={()=>void act('PATCH',{...identity,action:'enable-reminders'})}>{t('Luba meeldetuletused')}</button></fieldset>}
  </div>;
}
