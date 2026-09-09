"use client";
import {useEffect,useState} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import {localeTags} from '@/lib/locales';
import type {SupportGrant} from '@/lib/access';
import type {SupportViewState} from '@/lib/support-view';

export default function SupportView({grant,tenantName}:{grant:SupportGrant;tenantName:string}){
  const {t,locale}=useI18n();
  const [view,setView]=useState<'calendar'|'customers'>('calendar'),[day,setDay]=useState(''),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[revision,setRevision]=useState(0);
  const [state,setState]=useState<SupportViewState|null>(null),[error,setError]=useState(''),[closed,setClosed]=useState(false);
  useEffect(()=>{
    let controller:AbortController|undefined;
    let disposed=false;
    const deadline=Date.parse(grant.expiresAt);
    const close=()=>{controller?.abort();setState(null);setClosed(true);setError(t('Toe ligipääs on lõppenud.'));};
    async function load(){
      controller?.abort();
      if(Date.now()>=deadline){close();return;}
      if(document.visibilityState==='hidden'){setState(null);return;}
      const request=new AbortController();controller=request;
      setState(null);setError('');
      try{
        const response=await fetch('/api/admin/support?'+new URLSearchParams({tenantId:grant.tenantId,grantId:grant.id,view,page:String(page),...(day?{day}:{})}),{
          cache:'no-store',signal:request.signal,headers:view==='customers'?{'X-Support-Search':encodeURIComponent(query)}:{},
        });
        const body=await response.json();
        if(disposed||request.signal.aborted)return;
        if(!response.ok){
          if([401,403,404].includes(response.status))setClosed(true);
          throw new Error(body.error||t('Tugivaade ei ole kättesaadav.'));
        }
        if(Date.now()>=deadline){close();return;}
        setState(body);
      }catch(e){if(!disposed&&!request.signal.aborted){setState(null);setError(e instanceof Error?e.message:t('Tugivaade ei ole kättesaadav.'));}}
    }
    if(closed)return;
    void load();
    const refresh=()=>{void load();};
    const poll=window.setInterval(refresh,15000);
    const expiry=window.setTimeout(close,Math.max(0,deadline-Date.now()));
    const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('support-grants');
    if(channel)channel.onmessage=event=>{if(event.data?.revoked===grant.id)close();};
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{disposed=true;controller?.abort();channel?.close();clearInterval(poll);clearTimeout(expiry);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[grant.id,grant.tenantId,grant.expiresAt,view,day,query,page,revision,closed,t]);
  const format=(value:string)=>new Date(value).toLocaleString(localeTags[locale],{timeZone:state?.tenant.timezone});
  return <section aria-labelledby="support-view-title">
    <h3 id="support-view-title">{t('Tugivaade — ainult lugemiseks')}: {tenantName}</h3>
    <p>{t('Põhjus')}: {grant.reason} · {t('Aegub')}: {format(grant.expiresAt)}</p>
    <p>{t('Kalender ja kliendikontaktid. Iga lugemine auditeeritakse.')}</p>
    {error&&<p role="alert">{error}</p>}
    {!closed&&<>
      <nav aria-label={t('Tugivaate valik')}><button type="button" aria-pressed={view==='calendar'} onClick={()=>{setState(null);setView('calendar');setPage(0);}}>{t('Kalender')}</button> <button type="button" aria-pressed={view==='customers'} onClick={()=>{setState(null);setView('customers');setPage(0);}}>{t('Kliendid')}</button></nav>
      {view==='calendar'?<label>{t('Kuupäev')} <input type="date" value={day||state?.day||''} onChange={e=>{setState(null);setDay(e.target.value);setPage(0);}}/></label>:
        <form onSubmit={e=>{e.preventDefault();setState(null);setQuery(search);setPage(0);setRevision(r=>r+1);}}><label>{t('Otsi klienti')} <input value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/></label><button>{t('Otsi')}</button></form>}
      <button type="button" onClick={()=>setRevision(r=>r+1)}>{t('Värskenda')}</button>
      {!state&&!error&&<p role="status">{t('Laadin…')}</p>}
      {state&&<>
        {view==='calendar'?<ul>{state.bookings.map(b=><li key={b.id}><strong>{format(b.start)} – {format(b.end)}</strong><br/>{b.serviceName} · {b.staffName} · {b.customerName}<br/>{b.reference} · {t(({confirmed:'Kinnitatud',cancelled:'Tühistatud',completed:'Teenindatud',no_show:'Ei ilmunud'} as Record<string,string>)[b.status]||b.status)}</li>)}</ul>:
          <ul>{state.customers.map(c=><li key={c.id}><strong>{c.name}</strong><br/>{c.email||'—'} · {c.phone||'—'}</li>)}</ul>}
        {state.bookings.length+state.customers.length===0&&<p>{t('Kirjeid ei leitud.')}</p>}
        <p>{t('Lehekülg')} {page+1} <button type="button" disabled={page===0} onClick={()=>{setState(null);setPage(p=>p-1);}}>{t('Eelmine')}</button> <button type="button" disabled={!state.hasMore} onClick={()=>{setState(null);setPage(p=>p+1);}}>{t('Järgmine')}</button></p>
      </>}
    </>}
  </section>;
}
