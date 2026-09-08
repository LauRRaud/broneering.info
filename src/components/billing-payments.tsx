'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {formatMoney} from '@/lib/i18n';
import {useI18n} from './i18n-provider';
import type {InvoiceView} from '@/lib/invoices';
import type {PaymentView} from '@/lib/payments';
export default function BillingPayments({tenantId,platform,invoice,onChanged}:{tenantId:string;platform:boolean;invoice:InvoiceView;onChanged:(invoice:InvoiceView)=>void}){
 const {t,locale}=useI18n(),[current,setCurrent]=useState(invoice),[payments,setPayments]=useState<PaymentView[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[revision,setRevision]=useState(0),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[amount,setAmount]=useState(''),[overpayment,setOverpayment]=useState(false),[reversing,setReversing]=useState<PaymentView|null>(null);
 const running=useRef(false),pending=useRef<{signature:string;key:string}|null>(null);
 useEffect(()=>{const controller=new AbortController();setBusy(true);setError('');const query=new URLSearchParams({tenantId,platform:String(platform),id:invoice.id});
  void Promise.all(['invoice','payments'].map(async view=>{const r=await fetch('/api/admin/billing?'+new URLSearchParams({...Object.fromEntries(query),view,offset:String(offset)}),{cache:'no-store',signal:controller.signal}),body=await r.json();if(!r.ok)throw Error(body.error);return body;})).then(([fresh,list])=>{if(controller.signal.aborted)return;setCurrent(fresh);setPayments(list.payments);setMore(list.hasMore);setAmount((Math.max(0,fresh.total-fresh.paidAmount)/100).toFixed(2));setOverpayment(false);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();
 },[tenantId,platform,invoice.id,revision,offset]);
 async function save(data:Record<string,unknown>){if(running.current)return;running.current=true;setBusy(true);setError('');setMessage('');const signature=JSON.stringify(data);if(pending.current?.signature!==signature)pending.current={signature,key:crypto.randomUUID()};
  try{const r=await fetch('/api/admin/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestKey:pending.current.key})}),body=await r.json();if(!r.ok)throw Error(body.error);
   setCurrent(body.invoice);setMessage(data.action==='payment'?'Laekumine on salvestatud.':'Laekumiskirje on tagasi pööratud.');setReversing(null);onChanged(body.invoice);setRevision(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}finally{running.current=false;setBusy(false);}
 }
 const cents=Math.round(Number(amount)*100),outstanding=current.status==='void'?0:Math.max(0,current.total-current.paidAmount),money=(value:number)=>formatMoney(value,locale);
 function record(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);void save({action:'payment',tenantId,invoiceId:current.id,invoiceVersion:current.version,amount:cents,receivedOn:String(f.get('receivedOn')),bankEntryId:String(f.get('bankEntryId')),reference:String(f.get('reference')),confirmed:f.get('confirmed')==='on',allowOverpayment:cents>outstanding&&overpayment});}
 function reverse(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!reversing)return;const f=new FormData(e.currentTarget);void save({action:'reverse-payment',tenantId,paymentId:reversing.id,version:reversing.version,reason:String(f.get('reason')),confirmed:f.get('confirmed')==='on'});}
 return <section><h5>{t('Laekumised')}</h5>{error&&<p role="alert">{error} <button disabled={busy} onClick={()=>setRevision(v=>v+1)}>{t('Laadi uuesti')}</button></p>}{message&&<p role="status">{t(message)}</p>}
  <p>{t('Laekunud')}: {money(current.paidAmount)} · {t('Tasumata')}: {money(outstanding)}</p>{current.status==='void'&&current.paidAmount>0?<p>{t('Krediteeritud arve laekumine vajab eraldi arveldamist.')}: {money(current.paidAmount)}. {t('Kreeditarve ei tee pangas tagasimakset.')}</p>:current.paidAmount>current.total&&<p>{t('Enammakse')}: {money(current.paidAmount-current.total)}. {t('Enammakset ei kanta automaatselt järgmisele arvele.')}</p>}
  {platform&&current.status==='issued'&&<details><summary>{t('Lisa laekumine')}</summary><form key={current.version} onSubmit={record}><fieldset disabled={busy}>
   <p><label>{t('Laekunud summa (€)')} <input type="number" min="0.01" max="1000000" step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setOverpayment(false);}} required/></label></p>
   <p><label>{t('Laekumise kuupäev')} <input name="receivedOn" type="date" required/></label></p>
   <p><label>{t('Pangaväljavõtte kande tunnus')} <input name="bankEntryId" required maxLength={200}/></label></p>
   <p><label>{t('Makse märkus')} <input name="reference" maxLength={200}/></label></p>
   {cents>outstanding&&<p><label><input type="checkbox" checked={overpayment} onChange={e=>setOverpayment(e.target.checked)} required/>{t('Kontrollisin enammakset pangaväljavõttelt.')}</label></p>}
   <p><label><input name="confirmed" type="checkbox" required/>{t('Kontrollisin summat ja laekumise kuupäeva pangaväljavõttelt.')}</label></p><button>{t('Salvesta laekumine')}</button>
  </fieldset></form></details>}
  <ul>{payments.map(payment=><li key={payment.id} style={{overflowWrap:'anywhere'}}><p>{payment.receivedOn} · {money(payment.amount)} · {payment.bankEntryId} · {payment.reference}</p><p>{t('Sisestas')}: {payment.source==='makecommerce'?'Maksekeskus':payment.recordedByName??payment.recordedBy} · {payment.recordedAt}</p>
   {payment.refundedAmount>0&&<p>{t('Tagastatud')}: {money(payment.refundedAmount)}</p>}
   {payment.reversedAt?<p>{t('Parandatud')}: {payment.reversalReason} · {payment.reversedByName??payment.reversedBy} · {payment.reversedAt}</p>:platform&&payment.source==='manual'&&<button disabled={busy} onClick={()=>setReversing(payment)}>{t('Paranda laekumiskirje')}</button>}
  </li>)}</ul>{offset>0&&<button disabled={busy} onClick={()=>setOffset(v=>Math.max(0,v-50))}>{t('Eelmine')}</button>}{more&&<button disabled={busy} onClick={()=>setOffset(v=>v+50)}>{t('Järgmine')}</button>}
  {reversing&&<form onSubmit={reverse}><fieldset disabled={busy}><legend>{t('Laekumiskirje parandamine')}</legend><p>{reversing.receivedOn} · {money(reversing.amount)} · {reversing.bankEntryId}</p><p>{t('Parandus eemaldab kirje arve laekunud summast. Pangas raha ei liigutata. Algne kirje säilib ajaloos.')}</p>
   <p><label>{t('Paranduse põhjus')} <textarea name="reason" required minLength={10} maxLength={500}/></label></p><p><label><input name="confirmed" type="checkbox" required/>{t('Kinnitan selle laekumiskirje tagasipööramise.')}</label></p><button>{t('Pööra laekumiskirje tagasi')}</button> <button type="button" onClick={()=>setReversing(null)}>{t('Loobu')}</button>
  </fieldset></form>}
 </section>;
}
