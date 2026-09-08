'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {formatMoney} from '@/lib/i18n';
import {useI18n} from './i18n-provider';
import BillingPartyFields,{billingPartyFromForm} from './billing-party-fields';
import type {SubscriptionState} from '@/lib/subscriptions';
import type {InvoiceView,InvoicePreview} from '@/lib/invoices';
import BillingPayments from './billing-payments';
import BillingCheckout from './billing-checkout';
type Subscription=NonNullable<SubscriptionState['subscription']>;
export default function BillingInvoices({tenantId,platform,subscription,onChanged}:{tenantId:string;platform:boolean;subscription:Subscription;onChanged:()=>void}){
 const {t,locale}=useI18n(),[invoices,setInvoices]=useState<InvoiceView[]>([]),[more,setMore]=useState(false),[offset,setOffset]=useState(0),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState<InvoicePreview|null>(null),[confirmed,setConfirmed]=useState(false),[selected,setSelected]=useState<InvoiceView|null>(null);
 const running=useRef(false),pending=useRef<{signature:string;key:string}|null>(null);
 useEffect(()=>{const controller=new AbortController();setBusy(true);setError('');void fetch('/api/admin/billing?'+new URLSearchParams({tenantId,platform:String(platform),offset:String(offset)}),{cache:'no-store',signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error);if(!controller.signal.aborted){setInvoices(body.invoices);setMore(body.hasMore);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[tenantId,platform,offset,revision]);
 async function command(data:Record<string,unknown>){
  const signature=JSON.stringify(data);if(pending.current?.signature!==signature)pending.current={signature,key:crypto.randomUUID()};
  const response=await fetch('/api/admin/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestKey:pending.current.key})}),body=await response.json();if(!response.ok)throw Error(body.error);return body;
 }
 async function act(task:()=>Promise<void>){if(running.current)return;running.current=true;setBusy(true);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}}
 function recipient(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=new FormData(e.currentTarget);void act(async()=>{await command({action:'recipient',platform,tenantId,version:subscription.version,recipient:billingPartyFromForm(form)});onChanged();});}
 function preview(replacementInvoiceId?:string){void act(async()=>{setDraft(null);setConfirmed(false);const r=await fetch('/api/admin/billing?'+new URLSearchParams({view:'preview',tenantId,...(replacementInvoiceId?{replacementInvoiceId}:{})}),{cache:'no-store'}),body=await r.json();if(!r.ok)throw Error(body.error);setDraft(body);});}
 function issue(){if(!draft||!confirmed)return;void act(async()=>{const invoice=await command({action:'issue',tenantId,fingerprint:draft.fingerprint,confirmed:true,...(draft.replacementInvoiceId?{replacementInvoiceId:draft.replacementInvoiceId}:{})});setSelected(invoice);setDraft(null);setConfirmed(false);setRevision(v=>v+1);onChanged();});}
 function credit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;const f=new FormData(e.currentTarget);void act(async()=>{const reply=await command({action:'credit',tenantId,invoiceId:selected.id,version:selected.version,reason:String(f.get('reason')),confirmed:f.get('confirmed')==='on'});setSelected(reply.invoice);setDraft(null);setRevision(v=>v+1);onChanged();});}
 const money=(amount:number)=>formatMoney(amount,locale),status=(value:string)=>t(({issued:'Väljastatud',draft:'Mustand',void:'Tühistatud'} as Record<string,string>)[value]??value);
 return <section><h4>{t('Arved')}</h4>{error&&<p role="alert">{error} <button disabled={busy} onClick={()=>setRevision(v=>v+1)}>{t('Laadi uuesti')}</button></p>}
  <details><summary>{t('Arve saaja andmed')}</summary><form onSubmit={recipient}><fieldset disabled={busy}><BillingPartyFields value={{name:subscription.billingName,email:subscription.billingEmail,...subscription.recipient}}/><button>{t('Salvesta arve saaja')}</button></fieldset></form></details>
  {platform&&<p><button disabled={busy} onClick={()=>preview()}>{t('Vaata perioodi arve eelvaadet')}</button></p>}
  {draft&&<div><h4>{t('Arve eelvaade')}</h4><p>{draft.issuer.issuer.name} → {draft.recipient.name}</p><p>{draft.periodStart} – {draft.periodEnd} ({t('lõpp-päev välja arvatud')})</p>
   {draft.replacedNumber&&<p>{t('Asendatav arve')}: {draft.replacedNumber}. {t('Varasema arve laekumisi uuele arvele automaatselt ei kanta.')}</p>}
   <p>{draft.issuer.issuer.registrationCode} · {draft.issuer.issuer.address} · {draft.issuer.issuer.country} · {draft.issuer.issuer.vatNumber} · {draft.issuer.issuer.email}</p>
   <p>{draft.lines.map(line=>line.description).join(', ')} · {t('Maksumäär')}: {draft.issuer.taxRateBasisPoints/100}%</p>
   <p>{t('Väljastamise kuupäev')}: {draft.issuedOn} · {t('Maksetähtaeg')}: {draft.dueDate}</p><p>{t('Netosumma')}: {money(draft.subtotal)} · {t('Maks')}: {money(draft.tax)} · {t('Kokku')}: {money(draft.total)}</p>
   <p>{draft.issuer.taxNote}</p><p>IBAN: {draft.issuer.iban}</p><p>{draft.recipient.registrationCode} · {draft.recipient.address} · {draft.recipient.country} · {draft.recipient.vatNumber} · {draft.recipient.email}</p>
   <p><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>{t('Kontrollisin arve saajat, perioodi, hinda ja maksukäsitlust.')}</label></p><button disabled={busy||!confirmed} onClick={issue}>{t('Väljasta arve')}</button>
  </div>}
  <ul>{invoices.map(invoice=><li key={invoice.id}><button disabled={busy} onClick={()=>setSelected(invoice)}>{invoice.number??t('Mustand')}</button> · {status(invoice.status)} · {money(invoice.total)} · {t('Maksetähtaeg')}: {invoice.dueDate}</li>)}</ul>
  {offset>0&&<button disabled={busy} onClick={()=>setOffset(v=>Math.max(0,v-50))}>{t('Eelmine')}</button>}{more&&<button disabled={busy} onClick={()=>setOffset(v=>v+50)}>{t('Järgmine')}</button>}
  {selected&&<div><h4>{selected.number??t('Mustand')}</h4><p>{selected.issuer.issuer?.name} → {selected.recipient.name}</p><p>{selected.periodStart} – {selected.periodEnd} ({t('lõpp-päev välja arvatud')})</p>
   <p>{t('Netosumma')}: {money(selected.subtotal)} · {t('Maks')}: {money(selected.tax)} · {t('Kokku')}: {money(selected.total)}</p>
   <a target="_blank" rel="noopener noreferrer" href={'/api/admin/billing?'+new URLSearchParams({view:'print',tenantId,id:selected.id,platform:String(platform),lang:locale})}>{t('Ava prinditav arve')}</a>
   {selected.originalNumber&&<p>{t('Algarve')}: {selected.originalNumber} · {selected.correctionReason}</p>}
   {selected.replacedNumber&&<p>{t('Asendatud arve')}: {selected.replacedNumber}</p>}
   {platform&&selected.kind==='invoice'&&selected.status==='void'&&selected.creditId&&<p><button disabled={busy} onClick={()=>preview(selected.id)}>{t('Vaata parandatud arve eelvaadet')}</button></p>}
   {selected.mail&&<p>{t('Arve e-post')}: {t(({pending:'Ootel',failed:'Ebaõnnestunud',sent:'Saadetud',capture:'Kohalik katsekiri',skipped:'Vahele jäetud'} as Record<string,string>)[selected.mail.status]??selected.mail.status)} · {t('Katseid')}: {selected.mail.attempts}
    {platform&&selected.status==='issued'&&selected.mail.status==='failed'&&<button disabled={busy} onClick={()=>{void act(async()=>{const fresh=await command({action:'retry-mail',tenantId,invoiceId:selected.id});setSelected(fresh);setRevision(v=>v+1);});}}>{t('Proovi arvekirja uuesti')}</button>}
   </p>}
   {selected.reminder&&<p>{t('Arve meeldetuletus')}: {t(({pending:'Ootel',failed:'Ebaõnnestunud',sent:'Saadetud',capture:'Kohalik katsekiri',skipped:'Vahele jäetud'} as Record<string,string>)[selected.reminder.status]??selected.reminder.status)} · {t('Katseid')}: {selected.reminder.attempts}
    {platform&&selected.status==='issued'&&selected.reminder.status==='failed'&&<button disabled={busy} onClick={()=>{void act(async()=>{const fresh=await command({action:'retry-mail',kind:'overdue',tenantId,invoiceId:selected.id});setSelected(fresh);setRevision(v=>v+1);});}}>{t('Proovi arvekirja uuesti')}</button>}
   </p>}
   {selected.creditId&&<p>{t('Arve on krediteeritud.')}: <a target="_blank" rel="noopener noreferrer" href={'/api/admin/billing?'+new URLSearchParams({view:'print',tenantId,id:selected.creditId,platform:String(platform),lang:locale})}>{t('Kreeditarve')}</a> · {selected.voidReason}</p>}
   {platform&&selected.kind==='invoice'&&selected.status==='issued'&&<details key={selected.id}><summary>{t('Krediteeri kogu arve')}</summary><form onSubmit={credit}><fieldset disabled={busy}><p>{t('Kogu arve krediteerimine eemaldab selle perioodi kasutusõiguse. Algne arve ja laekumised säilivad. Vajadusel väljasta parandatud arve uue eelvaate kaudu.')}</p><p>{t('Kreeditarve ei tee pangas tagasimakset.')}</p><p><label>{t('Paranduse põhjus')} <textarea name="reason" minLength={10} maxLength={500} required/></label></p><p><label><input type="checkbox" name="confirmed" required/>{t('Kinnitan kogu arve krediteerimise.')}</label></p><button>{t('Väljasta kreeditarve')}</button></fieldset></form></details>}
   {selected.kind==='invoice'&&<BillingCheckout key={selected.id} tenantId={tenantId} platform={platform} invoice={selected} onChanged={()=>{void act(async()=>{const r=await fetch('/api/admin/billing?'+new URLSearchParams({view:'invoice',tenantId,id:selected.id,platform:String(platform)}),{cache:'no-store'}),body=await r.json();if(!r.ok)throw Error(body.error);setSelected(body);setRevision(v=>v+1);onChanged();});}}/>}
   {selected.kind==='invoice'&&<BillingPayments key={selected.id+':'+selected.status+':'+selected.version} tenantId={tenantId} platform={platform} invoice={selected} onChanged={fresh=>{setSelected(fresh);setInvoices(rows=>rows.map(row=>row.id===fresh.id?fresh:row));onChanged();}}/>}
  </div>}
 </section>;
}
