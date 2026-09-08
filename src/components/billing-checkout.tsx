'use client';
import {useEffect,useRef,useState} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import type {InvoiceView} from '@/lib/invoices';
import type {CheckoutView} from '@/lib/payment-checkout';
type CardSettings={key:string;scriptUrl:string;origin:string};
type Mandate={id:string;status:string;version:number;validUntil:string|null};
type CheckoutSdk={initialize:(options:Record<string,unknown>)=>void;open:()=>void};
declare global{interface Window{Maksekeskus?:{Checkout:CheckoutSdk};bookingCardCompleted?:(data:unknown)=>void;bookingCardCancelled?:()=>void;}}
export default function BillingCheckout({tenantId,invoice,platform,onChanged}:{tenantId:string;invoice:InvoiceView;platform:boolean;onChanged:()=>void}){
 const {t}=useI18n(),[attempts,setAttempts]=useState<CheckoutView[]>([]),[enabled,setEnabled]=useState(false),[mode,setMode]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [method,setMethod]=useState<'link'|'enroll'>('link'),[consented,setConsented]=useState(false),[card,setCard]=useState<CardSettings|null>(null),[mandate,setMandate]=useState<Mandate|null>(null),[revokeConfirmed,setRevokeConfirmed]=useState(false);
 const running=useRef(false),key=useRef<string|null>(null),last=useRef<string|null>(null),changed=useRef(onChanged);changed.current=onChanged;
 useEffect(()=>{const controller=new AbortController();
  async function refresh(){try{const r=await fetch('/api/admin/billing?'+new URLSearchParams({view:'checkout',tenantId,id:invoice.id,platform:String(platform)}),{cache:'no-store',signal:controller.signal}),body=await r.json();if(!r.ok)throw Error(body.error);if(controller.signal.aborted)return;setAttempts(body.attempts);setEnabled(body.provider.enabled);setMode(body.provider.mode);setCard(body.card);setMandate(body.mandate);
   const openAttempt=body.attempts.find((a:CheckoutView)=>['creating','ready','pending','unknown','review'].includes(a.state));if(openAttempt&&['link','enroll'].includes(openAttempt.method))setMethod(openAttempt.method);
   const signature=JSON.stringify([body.attempts.map((a:CheckoutView)=>[a.id,a.state]),body.mandate?.status]);if(last.current&&last.current!==signature)changed.current();last.current=signature;
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}}
  void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},10000);return()=>{controller.abort();clearInterval(timer);};
 },[tenantId,invoice.id,platform,revision,t]);
 async function openCard(attempt:CheckoutView){
  if(!card||card.origin!==window.location.origin||!attempt.transactionId)throw Error(t('Kaardimakse vajab kinnitatud HTTPS-aadressi.'));
  if(!window.Maksekeskus){await new Promise<void>((resolve,reject)=>{let script=document.querySelector<HTMLScriptElement>('script[data-booking-card]');
   if(script&&script.src!==card.scriptUrl){reject(Error(t('Toiming ebaõnnestus.')));return;}
   const timer=setTimeout(()=>reject(Error(t('Kaardivormi laadimine ebaõnnestus.'))),15000);
   if(!script){script=document.createElement('script');script.src=card.scriptUrl;script.dataset.bookingCard='true';script.async=true;document.body.appendChild(script);}
   script.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});script.addEventListener('error',()=>{clearTimeout(timer);script?.remove();reject(Error(t('Kaardivormi laadimine ebaõnnestus.')));},{once:true});
  });}
  if(!window.Maksekeskus)throw Error(t('Kaardivormi laadimine ebaõnnestus.'));
  window.bookingCardCompleted=(data:unknown)=>{if(!data||typeof data!=='object')return;const d=data as Record<string,unknown>;if(typeof d.json!=='string'||typeof d.mac!=='string')return;
   void fetch('/api/payments/makecommerce/notify?'+new URLSearchParams({tenantId,attemptId:attempt.id}),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({json:d.json,mac:d.mac})}).then(async r=>{if(!r.ok)throw Error(t('Makse teadet ei saanud kinnitada.'));setRevision(v=>v+1);}).catch(e=>setError(e.message));
  };
  window.bookingCardCancelled=()=>setRevision(v=>v+1);
  window.Maksekeskus.Checkout.initialize({key:card.key,transaction:attempt.transactionId,email:invoice.recipient.email,clientName:invoice.recipient.name,locale:document.documentElement.lang||'et',recurringTitle:t('Automaatne püsimakse'),recurringDescription:t('35 € kuus. Iga makse kohta väljastatakse arve. Püsimakse saab halduses lõpetada; ebaõnnestumisel saad arve makselingi.'),recurringConfirmation:t('Nõustun igakuise 35 € kaardimaksega.'),recurringChecked:false,recurringRequired:true,completed:'bookingCardCompleted',cancelled:'bookingCardCancelled'});
  window.Maksekeskus.Checkout.open();
 }
 async function start(){if(running.current)return;running.current=true;setBusy(true);setError('');key.current??=crypto.randomUUID();
  try{const r=await fetch('/api/admin/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'checkout',tenantId,invoiceId:invoice.id,invoiceVersion:invoice.version,method,requestKey:key.current,...(method==='enroll'?{consentVersion:'monthly-v1',confirmed:consented}: {})})}),body=await r.json();if(!r.ok)throw Error(body.error);setRevision(v=>v+1);
   if(body.method==='enroll'&&body.state==='ready')await openCard(body);else if(body.redirectUrl)window.location.assign(body.redirectUrl);else if(['failed','cancelled','expired','completed'].includes(body.state))key.current=null;
  }catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}
 }
 async function revoke(){if(!mandate||!revokeConfirmed||running.current)return;running.current=true;setBusy(true);setError('');try{const r=await fetch('/api/admin/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'revoke-mandate',tenantId,mandateId:mandate.id,version:mandate.version,requestKey:crypto.randomUUID(),confirmed:true})}),body=await r.json();if(!r.ok)throw Error(body.error);setRevision(v=>v+1);setRevokeConfirmed(false);setMethod('link');key.current=null;onChanged();}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}}
 const active=attempts.find(a=>['creating','ready','pending','unknown','review'].includes(a.state));
 const labels:Record<string,string>={creating:'Makse ettevalmistamisel',ready:'Makse on avamiseks valmis',pending:'Makse kinnitus on ootel',completed:'Makse kinnitatud',cancelled:'Makse katkestatud',expired:'Makse aegus',unknown:'Makse tulemus on kontrollimisel',failed:'Makse ebaõnnestus',review:'Makse vajab kontrolli'};
 return <section><h5>{t('Veebimakse')}</h5>{error&&<p role="alert">{error}</p>}{mode==='test'&&<p>{t('Maksekeskuse testkeskkond: testmakse ei tasu pärisarvet.')}</p>}
  {!enabled&&<p>{t('Veebimaksed pole praegu saadaval.')}</p>}
  {!platform&&enabled&&invoice.status==='issued'&&<div><p><label>{t('Makseviis')} <select disabled={busy||!!active} value={active?.method==='enroll'?'enroll':method} onChange={e=>{setMethod(e.target.value as 'link'|'enroll');setConsented(false);key.current=null;}}><option value="link">{t('Arve makselingiga')}</option><option value="enroll" disabled={!!mandate&&['active','pending'].includes(mandate.status)&&active?.method!=='enroll'}>{t('Automaatne püsimakse')}</option></select></label></p>
   {method==='enroll'&&<p><label><input type="checkbox" checked={consented} onChange={e=>setConsented(e.target.checked)}/>{t('Nõustun igakuise 35 € kaardimaksega.')}</label> {t('35 € kuus. Iga makse kohta väljastatakse arve. Püsimakse saab halduses lõpetada; ebaõnnestumisel saad arve makselingi.')}</p>}
   {(method==='enroll'||invoice.total>invoice.paidAmount)&&(!active||active.state==='ready')&&<button disabled={busy||(method==='enroll'&&!consented)} onClick={start}>{t(method==='enroll'?'Seo kaart ja kinnita püsimakse':'Maksa arve')}</button>}
  </div>}
  {mandate&&<p>{t('Püsimakse')}: {t(({pending:'Kaardi kinnitus on ootel',active:'Aktiivne',revoked:'Püsimakse lõpetatud',failed:'Kaardi sidumine ebaõnnestus',expired:'Kaart on aegunud',test_complete:'Testkaardi sidumine õnnestus'} as Record<string,string>)[mandate.status]??mandate.status)}{mandate.validUntil?' · '+mandate.validUntil:''}</p>}
  {!platform&&mandate&&['active','pending'].includes(mandate.status)&&<p><label><input type="checkbox" checked={revokeConfirmed} onChange={e=>setRevokeConfirmed(e.target.checked)}/>{t('Lõpetan järgmiste püsimaksete nõusoleku. Juba alustatud makse võib veel laekuda.')}</label> <button disabled={busy||!revokeConfirmed} onClick={revoke}>{t('Lõpeta püsimakse')}</button></p>}
  {active&&<p role="status">{t(labels[active.state]??active.state)}</p>}
  <ul>{attempts.map(a=><li key={a.id}>{a.createdAt} · {t(labels[a.state]??a.state)}{a.environment==='test'?' · TEST':''}</li>)}</ul>
  <button disabled={busy} onClick={()=>{setError('');setRevision(v=>v+1);}}>{t('Värskenda makse seisundit')}</button>
 </section>;
}
