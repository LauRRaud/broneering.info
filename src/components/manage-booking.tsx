"use client";
import {localeTags} from '@/lib/locales';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from '@/components/i18n-provider';

import {useEffect,useRef,useState} from 'react';
import type {BookingAvailability,ManagedBookingState} from '@/lib/booking-management-contracts';
import type {Offer} from '@/lib/contracts';
import {useBookingMutation} from './use-booking-mutation';
import {downloadBookingCalendar} from '@/lib/booking-calendar';
const statusNames:Record<string,string>={confirmed:'Kinnitatud',cancelled:'Tühistatud',completed:'Teenindatud',no_show:'Ei ilmunud'};
type Company={name:string;address:string;email:string;phone:string};
function Contacts({company}:{company:Company}){
  const {t,locale}=useI18n();
  const money=(value:number)=>new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR'}).format(value/100);
  const moment=(value:string,zone:string)=>new Intl.DateTimeFormat(localeTags[locale],{dateStyle:'medium',timeStyle:'short',timeZone:zone}).format(new Date(value));
return <aside aria-label={t("Ettevõtte kontakt")}><h2>{company.name}</h2><p>{company.address}</p>{company.email&&<p><a href={'mailto:'+company.email}>{company.email}</a></p>}{company.phone&&<p><a href={'tel:'+company.phone.replace(/[^+\d]/g,'')}>{company.phone}</a></p>}{!company.email&&!company.phone&&<p>{t("Ettevõte ei ole veel avalikke kontaktandmeid lisanud.")}</p>}</aside>;}
export default function ManageBooking({company}:{company:Company}){
  const {t,locale,explicit,setLocale}=useI18n();
  const money=(value:number)=>new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR'}).format(value/100);
  const moment=(value:string,zone:string)=>new Intl.DateTimeFormat(localeTags[locale],{dateStyle:'medium',timeStyle:'short',timeZone:zone}).format(new Date(value));

  const [token,setToken]=useState(''),[state,setState]=useState<ManagedBookingState|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const request=useRef(0);
  async function load(value:string){
    const number=++request.current;setLoading(true);setError('');
    try{
      const response=await fetch('/api/booking/manage',{cache:'no-store',headers:{Authorization:'Bearer '+value}});
      const body=await response.json();if(number!==request.current)return;
      if(!response.ok){setState(null);throw new Error(body.error||t("Broneeringut ei saanud avada."));}setState(body);if(!explicit&&body.booking?.language)setLocale(body.booking.language,false);
    }catch(error){if(number===request.current)setError(error instanceof Error?error.message:t("Broneeringut ei saanud avada."));}
    finally{if(number===request.current)setLoading(false);}
  }
  useEffect(()=>{
    const read=()=>{const value=window.location.hash.slice(1);setState(null);setToken(value);void load(value);};read();window.addEventListener('hashchange',read);return()=>{request.current++;window.removeEventListener('hashchange',read);};
  },[]);
  return <main id="main-content" tabIndex={-1} data-live-language><h1>{t("Sinu broneering")}</h1>{loading&&<p role="status">{t("Laadime värsket seisu…")}</p>}{error&&<p role="alert">{t(error)} <button type="button" onClick={()=>load(token)}>{t("Proovi uuesti")}</button></p>}{state&&<BookingControls key={state.booking.id+':'+token} state={state} token={token} loading={loading} reload={()=>load(token)}/>}<Contacts company={company}/><p><a href="/">{t("Ettevõtte broneerimisleht")}</a></p></main>;
}
function BookingControls({state,token,loading,reload}:{state:ManagedBookingState;token:string;loading:boolean;reload:()=>Promise<void>}){
  const {t,locale}=useI18n();
  const money=(value:number)=>new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR'}).format(value/100);
  const moment=(value:string,zone:string)=>new Intl.DateTimeFormat(localeTags[locale],{dateStyle:'medium',timeStyle:'short',timeZone:zone}).format(new Date(value));

  const booking=state.booking,mutation=useBookingMutation('public:'+booking.id+':'+state.linkId,'/api/booking/manage',{Authorization:'Bearer '+token});
  const [mode,setMode]=useState<'view'|'cancel'|'reschedule'>('view'),[day,setDay]=useState(state.today),[offers,setOffers]=useState<Offer[]>([]),[offer,setOffer]=useState<Offer|null>(null),[reason,setReason]=useState(''),[offerLoading,setOfferLoading]=useState(false),[offerError,setOfferError]=useState(''),[offerVersion,setOfferVersion]=useState(state.rulesVersion),[retry,setRetry]=useState(0),[notice,setNotice]=useState(''),[serviceName,setServiceName]=useState(booking.serviceName);
  const locked=mutation.locked||loading,heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{setMode('view');setOffer(null);},[booking.version]);
  useEffect(()=>{heading.current?.focus();},[mode,booking.version]);
  useEffect(()=>{
    if(['VERSION_CONFLICT','CUTOFF_PASSED','LINK_UNAVAILABLE'].includes(mutation.code))void reload();
    if(['SLOT_UNAVAILABLE','OFFER_CHANGED','RULES_CHANGED'].includes(mutation.code)){setOffer(null);setRetry(value=>value+1);}
  },[mutation.code]);
  useEffect(()=>{
    if(mode!=='reschedule')return;
    const controller=new AbortController();setOffers([]);setOffer(null);setOfferLoading(true);setOfferError('');
    fetch('/api/booking/manage?day='+day,{cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+token}}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||t("Aegu ei saanud laadida."));return body as BookingAvailability;}).then(body=>{if(!controller.signal.aborted){setOffers(body.offers);setOfferVersion(body.rulesVersion);setServiceName(body.serviceName??booking.serviceName);}}).catch(error=>{if(!controller.signal.aborted)setOfferError(error instanceof Error?error.message:t("Aegu ei saanud laadida."));}).finally(()=>{if(!controller.signal.aborted)setOfferLoading(false);});
    return()=>controller.abort();
  },[day,mode,token,retry]);
  async function submit(payload?:unknown){const result=await mutation.send(payload);if(result){setNotice(result.currentVersion?t("Toiming oli salvestatud, kuid broneeringut on pärast seda uuesti muudetud. Kontrolli värsket seisu."):result.status==='cancelled'?t("Broneering on tühistatud."):t("Muudatus on salvestatud."));await reload();}}
  return <section aria-labelledby="booking-state"><h2 id="booking-state" ref={heading} tabIndex={-1}>{t(statusNames[booking.status])||booking.status} · {booking.reference}</h2>
    <dl><dt>{t("Teenuse saaja")}</dt><dd>{booking.name}</dd><dt>{t("Teenus")}</dt><dd>{booking.serviceName}</dd><dt>{t("Töötaja")}</dt><dd>{booking.staffName}</dd><dt>{t("Aeg")}</dt><dd>{moment(booking.start,state.tenant.timezone)} – {moment(booking.end,state.tenant.timezone)}</dd><dt>{t("Kestus ja hind")}</dt><dd>{booking.duration} {t("min · ")}{money(booking.price)}</dd></dl>
    {booking.attentionReason&&<p role="status">{t("Ettevõte peab selle broneeringu korralduse üle vaatama. Kehtiv aeg on ülal; seda ei ole automaatselt muudetud. Võta ettevõttega ühendust.")}</p>}
    {booking.deadline?<p>{t("Muutmine ja tühistamine on lubatud kuni ")}{moment(booking.deadline,state.tenant.timezone)}.</p>:<p>{t("Varasema broneeringu muutmistingimused pole teada. Võta ettevõttega ühendust.")}</p>}
    {!booking.canChange&&booking.status==='confirmed'&&<p>{t("Muutmise või tühistamise tähtaeg on möödas. Ettevõtte kontaktid on allpool.")}</p>}
    <p>{t("Halduslink kehtib kuni ")}{moment(state.expiresAt,state.tenant.timezone)}{t(". Hoia link enda teada.")}</p>
    {notice&&<p role="status">{t(notice)}</p>}{mutation.error&&<p role="alert">{t(mutation.error)}</p>}{mutation.saving&&<p role="status">{t("Salvestame…")}</p>}{mutation.uncertain&&<p role="alert">{t("Tulemus on kontrollimisel. ")}<button type="button" onClick={()=>submit()}>{t("Kontrolli sama toimingu tulemust")}</button></p>}
    {mode==='view'&&<p><button type="button" disabled={locked||!booking.canChange} onClick={()=>{setMode('reschedule');setNotice('');}}>{t("Muuda aega")}</button> <button type="button" disabled={locked||!booking.canChange} onClick={()=>{setMode('cancel');setNotice('');}}>{t("Tühista broneering")}</button> <button type="button" disabled={locked} onClick={()=>downloadBookingCalendar(booking,state.tenant)}>{t("Laadi kalendrisündmus")}</button></p>}
    {mode==='cancel'&&<form onSubmit={event=>{event.preventDefault();void submit({action:'cancel',version:booking.version,reason});}}><p>{t("Kas soovid ülal näidatud broneeringu tühistada? Aeg vabastatakse alles pärast serveri kinnitust.")}</p><label>{t("Põhjus (soovi korral) ")}<textarea value={reason} maxLength={500} disabled={locked} onChange={event=>setReason(event.target.value)}/></label><p>{t(booking.notice)}{state.tenant.demo?t(" Demokeskkond e-kirju ei saada."):''}</p><button disabled={locked||!booking.canChange}>{t("Jah, tühista broneering")}</button> <button type="button" disabled={locked} onClick={()=>setMode('view')}>{t("Jäta broneering alles")}</button></form>}
    {mode==='reschedule'&&<div><p>{t("Vali uus päev ja konkreetne pakkumine. Vana aeg jääb alles, kuni uus on serveris kinnitatud.")}</p><label>{t("Uus kuupäev ")}<input type="date" value={day} min={state.today} max={state.maxDate} disabled={locked} onChange={event=>{setOffer(null);setDay(event.target.value);}}/></label>{offerLoading&&<p role="status">{t("Laadime vabu aegu…")}</p>}{offerError&&<p role="alert">{t(offerError)} <button type="button" disabled={locked} onClick={()=>setRetry(value=>value+1)}>{t("Laadi ajad uuesti")}</button></p>}{!offerLoading&&!offerError&&!offers.length&&<p>{t("Sel päeval vabu aegu pole. Vali teine päev.")}</p>}
      <ul aria-label={t("Uue aja pakkumised")}>{!offerLoading&&offers.map(item=><li key={item.staffId+':'+item.start}><button type="button" disabled={locked} aria-pressed={offer===item} onClick={()=>setOffer(item)}>{moment(item.start,state.tenant.timezone)} — {item.staffName}, {item.duration} {t("min · ")}{money(item.price)}</button></li>)}</ul>
      {offer&&<form onSubmit={event=>{event.preventDefault();void submit({action:'reschedule',version:booking.version,serviceId:offer.serviceId,staffId:offer.staffId,start:offer.start,expectedPrice:offer.price,expectedDuration:offer.duration,expectedRulesVersion:offerVersion});}}><h3>{t("Kinnita uus pakkumine")}</h3><p>{serviceName} — {offer.staffName}, {moment(offer.start,state.tenant.timezone)} – {moment(offer.end,state.tenant.timezone)}, {offer.duration} {t("min · ")}{money(offer.price)}.</p><p>{t("Varasem kokkulepitud etteteatamine jääb ")}{booking.cancellationHours} {t("tunniks enne uut algust. ")}{t(booking.notice)}{state.tenant.demo?t(" Demokeskkond e-kirju ei saada."):''}</p><button disabled={locked||!booking.canChange}>{t("Kinnita aja muutmine")}</button></form>}
      <p><button type="button" disabled={locked} onClick={()=>setMode('view')}>{t("Loobu muutmisest")}</button></p>
    </div>}
  </section>;
}
