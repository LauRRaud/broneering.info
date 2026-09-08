'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import type {SubscriptionState} from '@/lib/subscriptions';
import BillingInvoices from './billing-invoices';

export default function SubscriptionManagement({tenantId:ownerTenant,tenants}:{tenantId?:string;tenants?:{id:string;name:string}[]}){
 const {t}=useI18n(),[selected,setSelected]=useState(''),[state,setState]=useState<SubscriptionState|null>(null),[loadedTenant,setLoadedTenant]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const tenantId=ownerTenant??selected,platform=ownerTenant===undefined,running=useRef(false),pending=useRef<{signature:string;key:string}|null>(null);
 useEffect(()=>{const changed=(event:Event)=>{if((event as CustomEvent<string>).detail===tenantId)setRevision(v=>v+1);};window.addEventListener('billing-changed',changed);return()=>window.removeEventListener('billing-changed',changed);},[tenantId]);
 useEffect(()=>{setError('');pending.current=null;if(!tenantId)return;const controller=new AbortController();setBusy(true);
  void fetch('/api/admin/subscription?'+new URLSearchParams({tenantId,platform:String(platform)}),{cache:'no-store',signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error);if(!controller.signal.aborted){setState(body);setLoadedTenant(tenantId);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();
 },[tenantId,platform,revision]);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(running.current)return;const form=new FormData(event.currentTarget),data={tenantId,start:String(form.get('start')),billingName:String(form.get('billingName')),billingEmail:String(form.get('billingEmail')),confirmed:form.get('confirmed')==='on'},signature=JSON.stringify(data);
  if(pending.current?.signature!==signature)pending.current={signature,key:crypto.randomUUID()};running.current=true;setBusy(true);setError('');
  try{const r=await fetch('/api/admin/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestKey:pending.current.key})});const body=await r.json();if(!r.ok)throw Error(body.error);setState(body);}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}
 }
 const ready=loadedTenant===tenantId&&state,s=ready?state.subscription:null;
 const statuses:Record<string,string>={pending:'Ootab tasumist',active:'Aktiivne',limited:'Piiratud',ended:'Lõppenud',trial:'Prooviperiood'};
 return <section><h3>{t('Kuutasu ja tellimus')}</h3>
  {platform&&<p><label>{t('Ettevõte')} <select disabled={busy} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t('Vali ettevõte')}</option>{tenants?.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label></p>}
  {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>setRevision(v=>v+1)}>{t('Laadi uuesti')}</button></p>}
  {busy&&<p role="status">{t('Laadimine…')}</p>}
  {s&&<dl><dt>{t('Pakett')}</dt><dd>{s.plan.name} · {(s.plan.monthlyPrice/100).toFixed(2)} {s.plan.currency}/{t('kuu')}</dd>
   <dt>{t('Töötajate arv')}</dt><dd>{s.plan.staffLimit??t('Piiramatu')}</dd><dt>{t('Tellimuse seisund')}</dt><dd>{t(statuses[s.status]??s.status)}</dd>
   <dt>{t('Arveldusperiood (lõpp-päev välja arvatud)')}</dt><dd>{s.periodStart} – {s.periodEnd}</dd><dt>{t('Tasutud perioodi lõpp')}</dt><dd>{s.paidThrough??'—'}</dd>
   <dt>{t('Arve saaja')}</dt><dd>{s.billingName} · {s.billingEmail}</dd><dt>{t('Makseviis')}</dt><dd>{t(s.paymentMode==='autopay'?'Automaatne püsimakse':'Arve makselingiga')}</dd></dl>}
  {s?.access.reason==='overdue'&&<p role="status">{t('Arve maksetähtaeg on ületatud. Uued broneeringud on peatatud; olemasolevate broneeringute haldus ja eksport jäävad avatuks.')}</p>}
  {s?.access.reason==='payment_due'&&<p>{t('Arve ootab tasumist. Uusi broneeringuid saab vastu võtta kuni maksetähtajani.')}{' '}{s.access.dueDate}</p>}
  {s&&<BillingInvoices key={tenantId} tenantId={tenantId} platform={platform} subscription={s} onChanged={()=>window.dispatchEvent(new CustomEvent('billing-changed',{detail:tenantId}))}/>}
  {ready&&!s&&<><p>{t('Ettevõttel pole veel tellimust.')}</p>{platform&&<form onSubmit={submit}><fieldset disabled={busy}>
   <p>{t('35 € lõpphind kuus. Piiramatu töötajate arv. Prooviperioodi ei ole. Maksetähtaeg 7 päeva, hilinemise lisaaeg 0 päeva.')}</p>
   <p><label>{t('Tellimuse alguspäev')} <input name="start" type="date" required/></label></p>
   <p><label>{t('Arve saaja')} <input name="billingName" required minLength={2} maxLength={200}/></label></p>
   <p><label>{t('Arvelduse e-post')} <input name="billingEmail" type="email" required maxLength={254}/></label></p>
   <p><label><input type="checkbox" name="confirmed" required/>{t('Ettevõttega on tellimuse tingimused ja alguspäev kokku lepitud.')}</label></p>
   <button>{t('Loo tellimus')}</button></fieldset></form>}</>}
 </section>;
}
