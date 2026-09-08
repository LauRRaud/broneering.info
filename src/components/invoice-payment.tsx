'use client';
import {useEffect,useRef,useState} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {formatMoney} from '@/lib/i18n';
import {useI18n} from './i18n-provider';
import type {readPublicInvoicePayment} from '@/lib/payment-checkout';
type Payment=Awaited<ReturnType<typeof readPublicInvoicePayment>>;
export default function InvoicePayment(){
 const {t,locale}=useI18n(),[identity,setIdentity]=useState<{tenantId:string;token:string}|null>(null),[payment,setPayment]=useState<Payment|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),running=useRef(false),key=useRef<string|null>(null);
 useEffect(()=>{const match=/^#([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/i.exec(window.location.hash);if(match)setIdentity({tenantId:match[1],token:match[2]});else setError(t('Arve makselinki ei leitud.'));},[t]);
 useEffect(()=>{if(!identity)return;const controller=new AbortController();async function refresh(){try{const r=await fetch('/api/payments/invoice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'summary',...identity}),signal:controller.signal}),body=await r.json();if(!r.ok)throw Error(body.error);if(!controller.signal.aborted)setPayment(body);}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}}
  void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},10000);return()=>{controller.abort();clearInterval(timer);};
 },[identity,revision,t]);
 async function pay(){if(!identity||!payment||running.current)return;running.current=true;setBusy(true);setError('');key.current??=crypto.randomUUID();try{const r=await fetch('/api/payments/invoice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'checkout',...identity,invoiceVersion:payment.invoice.version,requestKey:key.current})}),body=await r.json();if(!r.ok)throw Error(body.error);if(body.redirectUrl)window.location.assign(body.redirectUrl);else if(['failed','cancelled','expired','completed'].includes(body.state))key.current=null;setRevision(v=>v+1);}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));setRevision(v=>v+1);}finally{running.current=false;setBusy(false);}}
 const i=payment?.invoice;
 return <main id="main-content" data-live-language><h1>{t('Arve tasumine')}</h1>{error&&<p role="alert">{error}</p>}
  {i&&<><h2>{t('Arve')} {i.number}</h2><p>{i.issuer} → {i.recipient}</p><p>{t('Kokku')}: {formatMoney(i.total,locale)} · {t('Laekunud')}: {formatMoney(i.paidAmount,locale)}</p>
   {i.status==='void'?<p role="status">{t('Arve on krediteeritud.')}</p>:i.outstanding===0?<p role="status">{t('Arve on tasutud.')}</p>:<><p>{t('Tasumata')}: {formatMoney(i.outstanding,locale)} · {t('Maksetähtaeg')}: {i.dueDate}</p>
    {payment.provider.mode==='test'&&<p>{t('Maksekeskuse testkeskkond: testmakse ei tasu pärisarvet.')}</p>}
    {payment.provider.enabled&&(!payment.attempt||payment.attempt.state==='ready')?<button disabled={busy} onClick={pay}>{t('Maksa arve')}</button>:payment.attempt?<p role="status">{t('Makse kinnitus on ootel')}</p>:<p>{t('Veebimaksed pole praegu saadaval.')}</p>}
    <p>{t('Pangaülekanne')}: {i.issuer}<br/>IBAN: {i.iban}<br/>{t('Makse selgitus')}: {i.number}</p></>}
   <p><button disabled={busy} onClick={()=>{setError('');setRevision(v=>v+1);}}>{t('Värskenda makse seisundit')}</button></p>
  </>}
 </main>;
}
