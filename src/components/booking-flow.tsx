"use client";
import {isDefinitiveBookingRejection} from '@/lib/booking-mutation-outcome';
import {localizedService} from '@/lib/service-translation-contracts';
import {localeNames} from '@/lib/locales';
import {contactErrors,type ContactErrors} from '@/lib/contact-validation';
import {localeTags} from '@/lib/locales';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from '@/components/i18n-provider';


import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { BookingInput, BookingResult, Catalog, NextAvailability, Offer, Service, Staff } from "../lib/contracts";

import {downloadBookingCalendar} from '@/lib/booking-calendar';
import Turnstile from '@/components/turnstile';
import selectionStyles from '@/components/booking/selection.module.css';
import BookingHeader from '@/components/booking/booking-header';
import {CategorySelection,ServiceSelection,serviceCategories,firstBookingStep} from '@/components/booking/service-selection';

type Step = "category" | "service" | "staff" | "time" | "details";
type AvailabilityState = "idle" | "loading" | "ready" | "empty" | "error";

export default function BookingFlow({ catalog:initialCatalog,previewTenantId,challengeSiteKey }: { catalog: Catalog;previewTenantId?:string;challengeSiteKey?:string }) {
  const endpoint=(action:string,query='')=>previewTenantId?`/api/admin/preview/${action}?tenantId=${encodeURIComponent(previewTenantId)}${query?'&'+query:''}`:`/api/${action}${query?'?'+query:''}`;
  const {t,locale}=useI18n();
const stepLabels: Array<{ id: Step; label: string; short: string }> = [
  { id: "category", label: t("Teenusegrupp"), short: "00" },
  { id: "service", label: t('Teenus'), short: "01" },
  { id: "staff", label: t('Töötaja'), short: "02" },
  { id: "time", label: t('Aeg'), short: "03" },
  { id: "details", label: t('Sinu andmed'), short: "04" },
];

function localDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, amount: number) {
  const value = localDate(date);
  value.setDate(value.getDate() + amount);
  return dateValue(value);
}

function makeIdempotencyKey() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return [...bytes].map((byte, index) => `${[4, 6, 8, 10].includes(index) ? "-" : ""}${byte.toString(16).padStart(2, "0")}`).join("");
  }
  throw new Error(t("Turvalise broneeringuvõtme loomiseks ava leht HTTPS-ühendusega."));
}

function money(value: number) {
  return new Intl.NumberFormat(localeTags[locale], { style: "currency", currency: "EUR" }).format(value / 100);
}

function timeLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat(localeTags[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(value));
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(localeTags[locale], options).format(localDate(value));
}

function dateTimeLabel(value: string, timezone: string) {
  const formatted = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  return dateLabel(formatted);
}

function shortDateLabel(value: string) {
  return new Intl.DateTimeFormat(localeTags[locale], { weekday: "short", day: "numeric", month: "short" }).format(localDate(value));
}



  const [sourceCatalog,setCatalog]=useState(initialCatalog);
  const catalog=useMemo(()=>({...sourceCatalog,services:sourceCatalog.services.map(service=>localizedService(service,locale))}),[sourceCatalog,locale]);
  const [step, setStep] = useState<Step>(()=>firstBookingStep(initialCatalog));
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(catalog.today);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [nextDaySearching, setNextDaySearching] = useState(false);
  const [nextDayMessage, setNextDayMessage] = useState("");
  const [nextDayCursor, setNextDayCursor] = useState("");
  const [nextDayExhausted, setNextDayExhausted] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceCategory, setServiceCategory] = useState<string|null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [fieldErrors,setFieldErrors]=useState<ContactErrors>({});
  const [validationAttempt,setValidationAttempt]=useState(0);
  useEffect(()=>{const first=Object.keys(fieldErrors)[0];if(first)document.getElementById(first)?.focus();},[validationAttempt]);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "uncertain" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [challengeToken,setChallengeToken]=useState('');
  const [challengeReset,setChallengeReset]=useState(0);
  const requestNumber = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef("");
  const payloadRef = useRef("");
  const submitLockRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextDayAbort = useRef<AbortController | null>(null);

  const service = useMemo(() => catalog.services.find((item) => item.id === serviceId), [catalog.services, serviceId]);
  const eligibleStaff = useMemo(
    () => catalog.staff.filter((item) => item.serviceIds.includes(serviceId)),
    [catalog.staff, serviceId],
  );
  const categories=serviceCategories(catalog);
  const visibleSteps = stepLabels.filter(item => (item.id !== 'category' || categories.length > 1) && (item.id !== 'staff' || (!catalog.selectedStaffId && eligibleStaff.length !== 1)));
  const canGoBack = step !== visibleSteps[0].id;
  const bookingLocked = submitState === "submitting" || submitState === "uncertain" || catalogLoading;
  const categoryServices = sourceCatalog.services.filter(item => serviceCategory===null || item.category === serviceCategory);
  const isDateAtStart = date <= catalog.today;
  const isDateAtEnd = date >= catalog.maxDate;

  const dateStrip = useMemo(() => {
    const dates = [shiftDate(date, -2), shiftDate(date, -1), date, shiftDate(date, 1), shiftDate(date, 2)];
    return dates.filter((item, index, list) => item >= catalog.today && item <= catalog.maxDate && list.indexOf(item) === index);
  }, [catalog.maxDate, catalog.today, date]);

  useEffect(() => {
    setNextDaySearching(false);
    setNextDayMessage("");
    setNextDayCursor("");
    setNextDayExhausted(false);
    return () => nextDayAbort.current?.abort();
  }, [serviceId, staffId, date, step]);

  useEffect(() => {
    if (!serviceId || !date || date < catalog.today || date > catalog.maxDate) {
      setOffers([]);
      setAvailability("idle");
      return;
    }
    const currentRequest = ++requestNumber.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAvailability("loading");
    setAvailabilityError("");
    const params = new URLSearchParams({ serviceId, date });
    if (staffId) params.set("staffId", staffId);

    fetch(endpoint('availability',params.toString()), { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { offers?: Offer[]; error?: string };
        if (!response.ok) throw new Error(body.error || t("Vabade aegade laadimine ebaõnnestus."));
        return body;
      })
      .then((body) => {
        if (currentRequest !== requestNumber.current) return;
        const nextOffers = Array.isArray(body.offers) ? body.offers : [];
        setOffers(nextOffers);
        setAvailability(nextOffers.length ? "ready" : "empty");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || currentRequest !== requestNumber.current) return;
        setAvailabilityError(error instanceof Error ? error.message : t("Vabade aegade laadimine ebaõnnestus."));
        setAvailability("error");
        setOffers([]);
      });

    return () => controller.abort();
  }, [availabilityRetry, catalog.maxDate, catalog.today, date, serviceId, staffId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [result, step]);

  function resetTime() {
    requestNumber.current++;
    abortRef.current?.abort();
    setOffers([]);
    setAvailability('loading');
    setAvailabilityRetry(value=>value+1);
    setOffer(null);
    setSubmitState("idle");
    setSubmitError("");
    setResult(null);
    keyRef.current = "";
    payloadRef.current = "";
  }

  function chooseCategory(category: string) {
    if(bookingLocked)return;
    if(category!==serviceCategory){setServiceId('');setStaffId('');setServiceSearch('');resetTime();}
    setServiceCategory(category);
    setStep('service');
  }

  function chooseService(next: Service) {
    if(bookingLocked)return;
    setServiceId(next.id);
    const nextStaff = catalog.staff.filter((item) => item.serviceIds.includes(next.id));
    setStaffId(nextStaff.length === 1 ? nextStaff[0].id : "");
    resetTime();
    setStep(nextStaff.length === 1 ? "time" : "staff");
  }

  function chooseStaff(next: Staff | null) {
    if(bookingLocked)return;
    setStaffId(next?.id || "");
    resetTime();
    setStep("time");
  }

  function chooseDate(next: string) {
    if(bookingLocked)return;
    if (next < catalog.today || next > catalog.maxDate) return;
    setDate(next);
    resetTime();
  }

  async function findNextDay() {
    nextDayAbort.current?.abort();
    const controller = new AbortController();
    nextDayAbort.current = controller;
    setNextDaySearching(true);
    setNextDayMessage("");
    try {
      const params = new URLSearchParams({serviceId,date:nextDayCursor||date,next:'1'});
      if(staffId)params.set('staffId',staffId);
      const response=await fetch(endpoint('availability',params.toString()),{cache:'no-store',signal:controller.signal});
      const body=await response.json() as NextAvailability & {error?:string};
      if(!response.ok)throw new Error(body.error || t("Järgmise vaba päeva otsing ebaõnnestus."));
      if(controller.signal.aborted)return;
      if(body.date)chooseDate(body.date);
      else {
        setNextDayCursor(body.searchedThrough);
        setNextDayExhausted(!body.hasMore);
        setNextDayMessage(body.hasMore?t("Kuni {value0} vabu aegu ei ole. Võid otsingut jätkata.",{value0:dateLabel(body.searchedThrough)}):t("Broneerimisakna lõpuni vabu aegu ei ole. Võid valida teise töötaja või teenuse."));
      }
    }catch(error){
      if(!controller.signal.aborted)setNextDayMessage(error instanceof Error?error.message:t("Otsing ebaõnnestus. Proovi uuesti."));
    }finally{if(!controller.signal.aborted)setNextDaySearching(false);}
  }

  async function changeLinkedStaff() {
    setCatalogLoading(true);setSubmitError('');
    try {
      const response=await fetch(endpoint('catalog'),{cache:'no-store'});
      if(!response.ok)throw new Error(t("Töötajate laadimine ebaõnnestus. Proovi uuesti."));
      const fresh=await response.json() as Catalog;
      resetTime();setCatalog(fresh);setServiceId('');setStaffId('');setDate(fresh.today);setStep(firstBookingStep(fresh));setServiceSearch('');setServiceCategory(null);
      const url=new URL(window.location.href);url.searchParams.delete('staff');window.history.replaceState(null,'',url);
    }catch(error){setSubmitState('error');setSubmitError(error instanceof Error?error.message:t("Töötajate laadimine ebaõnnestus."));}
    finally{setCatalogLoading(false);}
  }

  function chooseOffer(next: Offer) {
    if(bookingLocked || availability !== 'ready' || !offers.includes(next))return;
    setOffer(next);
    setSubmitState("idle");
    setSubmitError("");
    setResult(null);
    setStep("details");
  }

  function goBack() {
    if(bookingLocked)return;
    if (step === "details") setStep("time");
    else if (step === "time") setStep(eligibleStaff.length > 1 ? "staff" : "service");
    else if (step === "staff") setStep("service");
    else if (step === "service" && categories.length > 1) setStep("category");
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors(current=>({...current,[field]:undefined}));
    setSubmitState("idle");
    setSubmitError("");
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current || catalogLoading || !offer || !service) return;
    if(challengeSiteKey&&!challengeToken){setSubmitState(state=>state==='uncertain'?'uncertain':'error');setSubmitError(t('Palun kinnita, et sa ei ole robot.'));return;}
    if(submitState !== 'uncertain'){const errors=contactErrors(form);setFieldErrors(errors);if(Object.keys(errors).length){setValidationAttempt(value=>value+1);return;}}
    submitLockRef.current = true;
    setSubmitState("submitting");
    setSubmitError("");
    try {
      let serialized = payloadRef.current;
      if (!serialized) {
        const payload: BookingInput = {
          language:locale,
          serviceId: offer.serviceId,
          staffId: offer.staffId,
          start: offer.start,
          expectedPrice: offer.price,
          expectedDuration: offer.duration,
          expectedRulesVersion:catalog.tenant.rulesVersion,
          name: form.name.trim(),
          email: form.email.trim(),
          ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        };
        serialized = JSON.stringify(payload);
        payloadRef.current = serialized;
      }
      if (!keyRef.current) keyRef.current = makeIdempotencyKey();
      let response: Response;
      try {
        response = await fetch(endpoint('bookings'), {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": keyRef.current,...(challengeToken?{'CF-Turnstile-Response':challengeToken}:{}) },
          body: serialized,
        });
      } catch {
        setSubmitState("uncertain");
        setSubmitError(t("Ühendus katkes enne lõplikku vastust. Proovi sama taotlusega uuesti."));
        return;
      }
      let body: Partial<BookingResult> & { error?: string; code?: string } = {};
      try {
        body = await response.json();
      } catch {
        setSubmitState("uncertain");
        setSubmitError(t("Server ei andnud lõplikku vastust. Proovi sama taotlusega uuesti."));
        return;
      }
      if (!response.ok) {
        if(challengeSiteKey&&response.status===403&&(body.code==='CHALLENGE_REQUIRED'||body.code==='CHALLENGE_REJECTED')){
          // Admission failure cannot rule out an earlier committed request.
          // Refresh only the challenge; keep the command and its inputs locked.
          setChallengeToken('');setChallengeReset(value=>value+1);
          setSubmitState('uncertain');
          setSubmitError(t('Turvakontroll ebaõnnestus. Palun proovi uuesti.'));
          return;
        }
        if (!isDefinitiveBookingRejection(response.status,body.code)) {
          setSubmitState("uncertain");
          setSubmitError(t("Server ei andnud lõplikku vastust. Proovi sama taotlusega uuesti."));
          return;
        }
        if(challengeSiteKey){setChallengeToken('');setChallengeReset(value=>value+1);}
        if(body.code==='RULES_CHANGED'||body.code==='STAFF_UNAVAILABLE'){
          keyRef.current='';payloadRef.current='';
          try{
            const refreshed=await fetch(endpoint('catalog'),{cache:'no-store'});
            if(!refreshed.ok)throw new Error("refresh failed");
            const fresh=await refreshed.json() as Catalog;
            setCatalog(fresh);setOffer(null);setSubmitState('idle');setServiceId('');setStaffId('');setDate(fresh.today);setStep(firstBookingStep(fresh));
            setServiceSearch('');setServiceCategory(null);
            const url=new URL(window.location.href);url.searchParams.delete('staff');window.history.replaceState(null,'',url);
            setSubmitError(body.code==='STAFF_UNAVAILABLE'?t("Valitud töötaja ei ole enam broneeritav. Vali teenus ja töötaja uuesti. Sinu kontaktandmed on alles."):t("Broneerimisreeglid on muutunud ja uuendatud. Vali teenus ning aeg uuesti. Sinu kontaktandmed on alles."));
          }catch{setSubmitState('error');setSubmitError(t("Värskeid tingimusi ei saanud laadida. Vajuta uuesti kinnitamise nuppu või laadi leht uuesti."));}
          return;
        }
        if (body.code === "SLOT_UNAVAILABLE" || body.code === "OFFER_CHANGED") {
          setOffer(null);
          setSubmitState("idle");
          setSubmitError(body.error || t("Pakkumine muutus. Vali aeg uuesti."));
          keyRef.current = "";
          payloadRef.current = "";
          setAvailabilityRetry((value) => value + 1);
          setStep("time");
          return;
        }
        setSubmitState("error");
        setSubmitError(body.error || t("Broneeringut ei saanud kinnitada."));
        keyRef.current = "";
        payloadRef.current = "";
        return;
      }
      if (!body.id || !body.reference || !body.serviceName || !body.staffName || body.status !== "confirmed" || !body.start || !body.end || !Number.isFinite(Date.parse(body.start)) || !Number.isFinite(Date.parse(body.end)) || typeof body.price !== "number" || typeof body.duration !== "number") {
        setSubmitState("uncertain");
        setSubmitError(t("Serveri kinnitus oli puudulik. Kontrolli sama taotluse tulemust uuesti."));
        return;
      }
      setResult(body as BookingResult);
      setSubmitState("idle");
    } catch (error: unknown) {
      setSubmitState("uncertain");
      setSubmitError(t("Server ei andnud lõplikku vastust. Proovi sama taotlusega uuesti."));
    } finally {
      submitLockRef.current = false;
    }
  }

  function stepIndex(id: Step) {
    return visibleSteps.findIndex((item) => item.id === id);
  }

  if (result) {
    return (
      <main id="main-content" tabIndex={-1} data-live-language>
        <section aria-labelledby="success-title">
          {catalog.tenant.demo && <p role="status">{t("Demokeskkond — proovibroneeringud")}</p>}
          <p>{result.currentVersion ? t("Broneeringu esialgne kinnitus") : t("Broneering kinnitatud")}</p>
          <h1 id="success-title" ref={headingRef} tabIndex={-1}>{t("Kohtumiseni, ")}{form.name.split(" ")[0] || "sind"}.</h1>
          <p>{result.currentVersion ? t("Broneeringut on pärast loomist muudetud. Allpool on esialgse kinnituse andmed; kontrolli kehtivat aega halduslingilt või ettevõttelt.") : t("Sinu aeg on kalendrisse märgitud. Hoia broneeringu number alles.")}</p>
          <dl>
            <div><dt>{t("Broneering")}</dt><dd>{result.reference}</dd></div>
            <div><dt>{t("Teenus")}</dt><dd>{result.serviceName}</dd></div>
            <div><dt>{t("Koht")}</dt><dd>{catalog.tenant.name}<br />{catalog.tenant.address}</dd></div>
            <div><dt>{t("Aeg")}</dt><dd>{dateTimeLabel(result.start, catalog.tenant.timezone)}, {timeLabel(result.start, catalog.tenant.timezone)} – {timeLabel(result.end, catalog.tenant.timezone)}</dd></div>
            <div><dt>{t("Töötaja")}</dt><dd>{result.staffName}</dd></div>
            <div><dt>{t("Kestus")}</dt><dd>{result.duration}{t(" min")}</dd></div>
            <div><dt>{t("Hind")}</dt><dd>{money(result.price)}</dd></div>
          </dl>
          {result.cancellationHours != null && <p>{t("Palume muutmisest või tühistamisest ettevõttele teada anda vähemalt ")}{result.cancellationHours} {t("tundi ette.")}</p>}
          <p>{result.currentVersion ? t("Siin näidatud esialgne kinnitus ei kajasta hilisemaid muudatusi.") : t("Broneering on kinnitatud sõltumata kinnituskirja kohalejõudmisest.")}{catalog.tenant.demo && t(" Demokeskkond e-kirju ei saada.")}</p>
          <p><button type="button" disabled={!!result.currentVersion} onClick={() => downloadBookingCalendar(result,catalog.tenant)}>{t("Lisa kalendrisse")}</button></p>{result.managementUrl&&<p><a href={result.managementUrl} target="_blank" rel={"noopener noreferrer"}>{t("Vaata, muuda või tühista broneeringut")}</a><br/>{t("Hoia halduslink alles ja enda teada. ")}{!result.currentVersion&&result.managementExpiresAt&&<>{t("Link kehtib kuni ")}{dateTimeLabel(result.managementExpiresAt,catalog.tenant.timezone)}, {timeLabel(result.managementExpiresAt,catalog.tenant.timezone)}.</>}</p>}
          <button type="button" onClick={() => { setResult(null); setStep(firstBookingStep(catalog)); setServiceCategory(null); setServiceSearch(""); setServiceId(""); setStaffId(""); setOffer(null); }}>{t("Tee uus broneering")}</button>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} data-live-language>
      <BookingHeader tenant={catalog.tenant}/>
      {catalog.selectedStaffId && <p>{t("Broneerid töötajale ")}{catalog.staff.find(item=>item.id===catalog.selectedStaffId)?.name}. <button type="button" disabled={bookingLocked} onClick={changeLinkedStaff}>{catalogLoading?t("Laadime töötajaid…"):t("Muuda töötajat")}</button></p>}

      <section aria-labelledby="booking-title">
        <p>{t('Samm {current} / {total}',{current:stepIndex(step)+1,total:visibleSteps.length})}</p>
        <h2 id="booking-title" ref={headingRef} tabIndex={-1}>{step === 'category' ? t('Vali teenusegrupp') : step === "service" ? t("Vali teenus") : step === "staff" ? t("Vali töötaja") : step === "time" ? t("Vali aeg") : t("Sinu andmed")}</h2>
        {step==='service'&&serviceCategory!==null&&<p>{serviceCategory || t('Muud teenused')}</p>}
        {step==='staff'&&<p>{service?.name}</p>}
        {(step==='category'||step==='service'||step==='staff')&&submitError&&<p role="alert">{t(submitError)}</p>}
        {canGoBack && <p><button type="button" onClick={goBack} disabled={bookingLocked}>{t("Tagasi")}</button></p>}

          {step === 'category' && <CategorySelection categories={categories} selected={serviceCategory} disabled={bookingLocked} onSelect={chooseCategory}/>}
          {step === 'service' && <ServiceSelection services={categoryServices} selected={serviceId} disabled={bookingLocked} exactPrice={!!catalog.selectedStaffId} search={serviceSearch} onSearch={setServiceSearch} onSelect={chooseService}/>}

          {step === "staff" && (
            <ul aria-label={t("Töötajad")}>
              <li><button type="button" onClick={() => chooseStaff(null)} aria-pressed={staffId === ""}>{t("Töötaja pole oluline")}</button><p>{t("Näita kõigi seda teenust pakkuvate töötajate vabu aegu. Kuupäeva ja kellaaja valid ise.")}</p></li>
              {eligibleStaff.map((item) => <li key={item.id}><button type="button" onClick={() => chooseStaff(item)} aria-pressed={staffId === item.id}>{item.name}</button><p>{item.title}</p>{item.bio&&<details><summary>{t("Teenindaja tutvustus")}</summary><p>{item.bio}</p></details>}{item.photoUrl&&<img src={item.photoUrl} alt="" width={96} height={96} loading="lazy" referrerPolicy="no-referrer"/>}</li>)}
              {!eligibleStaff.length && <li>{t("Sellele teenusele ei ole sobivaid töötajaid.")}</li>}
            </ul>
          )}

          {step === "time" && (
            <div>

              {submitError && <p role="alert">{t(submitError)}</p>}
              <p><button type="button" onClick={() => chooseDate(shiftDate(date, -1))} disabled={isDateAtStart || bookingLocked} aria-label={t("Eelmine päev")}>{t("Eelmine päev")}</button></p>
              <label>{t("Valitud kuupäev ")}<input type="date" value={date} min={catalog.today} max={catalog.maxDate} onChange={(event) => chooseDate(event.target.value)} disabled={bookingLocked} /></label>
              <p><button type="button" onClick={() => chooseDate(shiftDate(date, 1))} disabled={isDateAtEnd || bookingLocked} aria-label={t("Järgmine päev")}>{t("Järgmine päev")}</button></p>
              <p>{t("Valitud: ")}{service?.name} / {staffId ? eligibleStaff.find((item) => item.id === staffId)?.name : t("Kõik töötajad")}</p>
              {!staffId && <p>{t("Iga pakkumine näitab konkreetset töötajat, hinda ja kestust. Samal kellaajal võib olla mitu pakkumist; vali neist endale sobiv. Ühtegi aega ei valita sinu eest.")}</p>}
              <ul aria-label={t("Vali kuupäev")}>
                {dateStrip.map((item) => <li key={item}><button type="button" onClick={() => chooseDate(item)} disabled={bookingLocked} aria-pressed={item === date}>{shortDateLabel(item)}</button></li>)}
              </ul>
              {availability === "loading" && <p role="status">{t("Otsime vabu aegu…")}</p>}
              {availability === "error" && <p role="alert"><strong>{t("Ajad ei avanenud.")}</strong> {t(availabilityError)} <button type="button" onClick={() => setAvailabilityRetry((value) => value + 1)}>{t("Proovi uuesti")}</button></p>}
              {availability === "empty" && <div><p><strong>{t("Sel päeval vabu aegu ei ole.")}</strong> {t("Vali järgmine päev või proovi teist töötajat.")}</p><button type="button" onClick={findNextDay} disabled={nextDaySearching || nextDayExhausted || isDateAtEnd || bookingLocked}>{nextDaySearching?t("Otsime järgmist vaba päeva…"):nextDayCursor?t("Jätka vaba päeva otsingut"):t("Leia järgmine vaba päev")}</button><p>{t("Otsime kuni 31 päeva korraga. Kellaaeg jääb sinu valida.")}</p></div>}
              {nextDayMessage && <p role="status">{t(nextDayMessage)}</p>}
              {!staffId && (availability === 'ready' || availability === 'empty') && eligibleStaff.some(item=>!offers.some(value=>value.staffId===item.id)) && <ul aria-label={t("Töötajad, kellel sel päeval vabu aegu pole")}>{eligibleStaff.filter(item=>!offers.some(value=>value.staffId===item.id)).map(item=><li key={item.id}>{item.name}{t(": sel päeval vabu aegu pole.")}</li>)}</ul>}
              {availability === "ready" && <ul aria-label={t("Vabad ajad")}>{offers.map((item) => <li key={`${item.staffId}-${item.start}`}><button type="button" onClick={() => chooseOffer(item)}><strong>{timeLabel(item.start, catalog.tenant.timezone)}</strong> — {item.staffName}, {item.duration} {t("min · ")}{money(item.price)}</button></li>)}</ul>}
            </div>
          )}

          {step === "details" && offer && (
            <div>
              <form id="booking-form" noValidate onSubmit={submitBooking}>
                {Object.values(fieldErrors).some(Boolean)&&<div role="alert"><p>{t("Kontrolli esiletõstetud välju.")}</p><ul>{Object.entries(fieldErrors).filter(([,error])=>error).map(([field,error])=><li key={field}><a href={'#'+field}>{t(error!)}</a></li>)}</ul></div>}
                <p><label htmlFor="name">{t("Teenuse saaja nimi *")}</label><br /><input id="name" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name?"name-error contact-help":"contact-help"} name="name" autoComplete="name" minLength={2} maxLength={120} value={form.name} onChange={(event) => updateField("name", event.target.value)} required disabled={bookingLocked} placeholder={t("Ees- ja perekonnanimi")} />{fieldErrors.name&&<span className="field-error" id="name-error">{t(fieldErrors.name!)}</span>}</p>
                <p><label htmlFor="email">{t("Kontaktisiku e-post *")}</label><br /><input id="email" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email?"email-error contact-help":"contact-help"} name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(event) => updateField("email", event.target.value)} required disabled={bookingLocked} placeholder={t("sina@näide.ee")} />{fieldErrors.email&&<span className="field-error" id="email-error">{t(fieldErrors.email!)}</span>}</p>
                <p><label htmlFor="phone">{t("Kontaktisiku telefon (soovi korral)")}</label><br /><input id="phone" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone?"phone-error contact-help":"contact-help"} name="phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} disabled={bookingLocked} placeholder="+372 …" />{fieldErrors.phone&&<span className="field-error" id="phone-error">{t(fieldErrors.phone!)}</span>}</p>
                <p id="contact-help">{t("Kontot pole vaja. Teisele inimesele broneerides sisesta tema nimi ja enda kontaktandmed. Kasutame neid andmeid ainult broneeringuga seoses.")}</p>
                {challengeSiteKey&&<Turnstile siteKey={challengeSiteKey} onToken={setChallengeToken} resetSignal={challengeReset} label={t("Botikontroll")}/>}
                {submitState === "uncertain" && <p role="alert"><strong>{t("Kontrollime kinnituse tulemust.")}</strong> {t(submitError)} {t("Kinnitus loetakse õnnestunuks alles serveri vastuse järel.")}</p>}
                {submitState === "error" && <p role="alert"><strong>{t("Broneeringut ei saanud kinnitada.")}</strong> {t(submitError)} {t("Kontrolli andmeid ja proovi uuesti.")}</p>}
              </form>
              <aside aria-label={t("Broneeringu kokkuvõte")}><h3>{t("Sinu broneering")}</h3><h4 lang={service?.contentLanguage}>{service?.name}</h4>{service?.translationMissing&&<p>{t("Tõlge pole veel kinnitatud. Algteksti keel: {language}",{language:localeNames[service.contentLanguage]})}</p>}<dl><div><dt>{t("Koht")}</dt><dd>{catalog.tenant.name}<br />{catalog.tenant.address}</dd></div><div><dt>{t("Kuupäev")}</dt><dd>{dateTimeLabel(offer.start, catalog.tenant.timezone)}</dd></div><div><dt>{t("Kell")}</dt><dd>{timeLabel(offer.start, catalog.tenant.timezone)} – {timeLabel(offer.end, catalog.tenant.timezone)}</dd></div><div><dt>{t("Töötaja")}</dt><dd>{offer.staffName}</dd></div><div><dt>{t("Kestus")}</dt><dd>{offer.duration}{t(" min")}</dd></div><div><dt>{t("Hind")}</dt><dd>{money(offer.price)}</dd></div></dl><p>{t("Palume muutmisest või tühistamisest ettevõttele teada anda vähemalt ")}{catalog.tenant.cancellationHours} {t("tundi ette.")}</p><p>{t("Teenuse eest siin veebis ei maksta.")}</p>{catalog.tenant.demo && <p>{t("Demokeskkond — proovibroneeringud. E-kirju ei saadeta.")}</p>}</aside>
              {catalog.tenant.bookingTerms&&<section aria-label={t('Broneerimistingimused')}><h3>{t('Broneerimistingimused')}</h3><p className={selectionStyles.terms}>{catalog.tenant.bookingTerms}</p></section>}
              <button type="submit" form="booking-form" disabled={submitState === "submitting" || catalogLoading}>{submitState === "submitting" ? "Kinnitame…" : submitState === "uncertain" ? t("Proovi uuesti") : t("Kinnita broneering")}</button>
            </div>
          )}
      </section>
    </main>
  );
}
