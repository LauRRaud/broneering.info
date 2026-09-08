"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { BookingInput, BookingResult, Catalog, NextAvailability, Offer, Service, Staff } from "../lib/contracts";

type Step = "service" | "staff" | "time" | "details";
type AvailabilityState = "idle" | "loading" | "ready" | "empty" | "error";

const stepLabels: Array<{ id: Step; label: string; short: string }> = [
  { id: "service", label: "Teenus", short: "01" },
  { id: "staff", label: "Töötaja", short: "02" },
  { id: "time", label: "Aeg", short: "03" },
  { id: "details", label: "Sinu andmed", short: "04" },
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
  throw new Error("Turvalise broneeringuvõtme loomiseks ava leht HTTPS-ühendusega.");
}

function money(value: number) {
  return new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value / 100);
}

function timeLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat("et-EE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(value));
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("et-EE", options).format(localDate(value));
}

function dateTimeLabel(value: string, timezone: string) {
  const formatted = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  return dateLabel(formatted);
}

function shortDateLabel(value: string) {
  return new Intl.DateTimeFormat("et-EE", { weekday: "short", day: "numeric", month: "short" }).format(localDate(value));
}

function cleanIcs(value: string) {
  return value.replace(/[\\;,\n\r]/g, " ").trim().slice(0, 180);
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function downloadCalendar(result: BookingResult, catalog: Catalog) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//broneering.info//Booking//ET",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${cleanIcs(result.id)}@broneering.info`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(result.start)}`,
    `DTEND:${icsDate(result.end)}`,
    `SUMMARY:${cleanIcs(result.serviceName)} · ${cleanIcs(result.staffName)}`,
    `LOCATION:${cleanIcs(catalog.tenant.name)} ${cleanIcs(catalog.tenant.address)}`,
    `DESCRIPTION:Broneering ${cleanIcs(result.reference)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "broneering.ics";
  link.click();
  URL.revokeObjectURL(url);
}

export default function BookingFlow({ catalog:initialCatalog }: { catalog: Catalog }) {
  const [catalog,setCatalog]=useState(initialCatalog);
  const [step, setStep] = useState<Step>("service");
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
  const [serviceCategory, setServiceCategory] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "uncertain" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
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
  const canGoBack = step !== "service";
  const visibleSteps = catalog.selectedStaffId || eligibleStaff.length === 1 ? stepLabels.filter(item => item.id !== "staff") : stepLabels;
  const bookingLocked = submitState === "submitting" || submitState === "uncertain" || catalogLoading;
  const filteredServices = catalog.services.filter(item => (!serviceCategory || item.category === serviceCategory) && `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase('et').includes(serviceSearch.trim().toLocaleLowerCase('et')));
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

    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { offers?: Offer[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Vabade aegade laadimine ebaõnnestus.");
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
        setAvailabilityError(error instanceof Error ? error.message : "Vabade aegade laadimine ebaõnnestus.");
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
      const response=await fetch(`/api/availability?${params}`,{cache:'no-store',signal:controller.signal});
      const body=await response.json() as NextAvailability & {error?:string};
      if(!response.ok)throw new Error(body.error || 'Järgmise vaba päeva otsing ebaõnnestus.');
      if(controller.signal.aborted)return;
      if(body.date)chooseDate(body.date);
      else {
        setNextDayCursor(body.searchedThrough);
        setNextDayExhausted(!body.hasMore);
        setNextDayMessage(body.hasMore?`Kuni ${dateLabel(body.searchedThrough)} vabu aegu ei ole. Võid otsingut jätkata.`:'Broneerimisakna lõpuni vabu aegu ei ole. Võid valida teise töötaja või teenuse.');
      }
    }catch(error){
      if(!controller.signal.aborted)setNextDayMessage(error instanceof Error?error.message:'Otsing ebaõnnestus. Proovi uuesti.');
    }finally{if(!controller.signal.aborted)setNextDaySearching(false);}
  }

  async function changeLinkedStaff() {
    setCatalogLoading(true);setSubmitError('');
    try {
      const response=await fetch('/api/catalog',{cache:'no-store'});
      if(!response.ok)throw new Error('Töötajate laadimine ebaõnnestus. Proovi uuesti.');
      const fresh=await response.json() as Catalog;
      resetTime();setCatalog(fresh);setServiceId('');setStaffId('');setDate(fresh.today);setStep('service');setServiceSearch('');setServiceCategory('');
      const url=new URL(window.location.href);url.searchParams.delete('staff');window.history.replaceState(null,'',url);
    }catch(error){setSubmitState('error');setSubmitError(error instanceof Error?error.message:'Töötajate laadimine ebaõnnestus.');}
    finally{setCatalogLoading(false);}
  }

  function chooseOffer(next: Offer) {
    if(bookingLocked)return;
    setOffer(next);
    setSubmitState("idle");
    setSubmitError("");
    setResult(null);
    setStep("details");
  }

  function goBack() {
    if (step === "details") setStep("time");
    else if (step === "time") setStep(eligibleStaff.length > 1 ? "staff" : "service");
    else if (step === "staff") setStep("service");
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitState("idle");
    setSubmitError("");
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current || catalogLoading || !offer || !service || !form.name.trim() || !form.email.trim()) return;
    if(submitState !== 'uncertain' && (form.name.trim().length<2 || !/^[+\d ()-]*$/.test(form.phone.trim()))) {
      setSubmitState('error');setSubmitError('Nimi peab sisaldama vähemalt kahte märki. Telefonis on lubatud numbrid, +, tühikud, sulud ja sidekriips.');return;
    }
    submitLockRef.current = true;
    setSubmitState("submitting");
    setSubmitError("");
    try {
      let serialized = payloadRef.current;
      if (!serialized) {
        const payload: BookingInput = {
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
        response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": keyRef.current },
          body: serialized,
        });
      } catch {
        setSubmitState("uncertain");
        setSubmitError("Ühendus katkes enne lõplikku vastust. Proovi sama taotlusega uuesti.");
        return;
      }
      let body: Partial<BookingResult> & { error?: string; code?: string } = {};
      try {
        body = await response.json();
      } catch {
        if (response.status >= 400 && response.status < 500) {
          setSubmitState("error");
          setSubmitError("Serveri vastust ei saanud lugeda.");
          keyRef.current = "";
          payloadRef.current = "";
        } else {
          setSubmitState("uncertain");
          setSubmitError("Server ei andnud lõplikku vastust. Proovi sama taotlusega uuesti.");
        }
        return;
      }
      if (!response.ok) {
        if (response.status >= 500) {
          setSubmitState("uncertain");
          setSubmitError("Server ei andnud lõplikku vastust. Proovi sama taotlusega uuesti.");
          return;
        }
        if(body.code==='RULES_CHANGED'||body.code==='STAFF_UNAVAILABLE'){
          keyRef.current='';payloadRef.current='';
          try{
            const refreshed=await fetch('/api/catalog',{cache:'no-store'});
            if(!refreshed.ok)throw new Error('refresh failed');
            const fresh=await refreshed.json() as Catalog;
            setCatalog(fresh);setOffer(null);setSubmitState('idle');setServiceId('');setStaffId('');setDate(fresh.today);setStep('service');
            setServiceSearch('');setServiceCategory('');
            const url=new URL(window.location.href);url.searchParams.delete('staff');window.history.replaceState(null,'',url);
            setSubmitError(body.code==='STAFF_UNAVAILABLE'?'Valitud töötaja ei ole enam broneeritav. Vali teenus ja töötaja uuesti. Sinu kontaktandmed on alles.':'Broneerimisreeglid on muutunud ja uuendatud. Vali teenus ning aeg uuesti. Sinu kontaktandmed on alles.');
          }catch{setSubmitState('error');setSubmitError('Värskeid tingimusi ei saanud laadida. Vajuta uuesti kinnitamise nuppu või laadi leht uuesti.');}
          return;
        }
        if (body.code === "SLOT_UNAVAILABLE" || body.code === "OFFER_CHANGED") {
          setOffer(null);
          setSubmitState("idle");
          setSubmitError(body.error || "Pakkumine muutus. Vali aeg uuesti.");
          keyRef.current = "";
          payloadRef.current = "";
          setAvailabilityRetry((value) => value + 1);
          setStep("time");
          return;
        }
        setSubmitState("error");
        setSubmitError(body.error || "Broneeringut ei saanud kinnitada.");
        keyRef.current = "";
        payloadRef.current = "";
        return;
      }
      if (!body.id || !body.reference || !body.serviceName || !body.staffName || body.status !== "confirmed" || !body.start || !body.end || !Number.isFinite(Date.parse(body.start)) || !Number.isFinite(Date.parse(body.end)) || typeof body.price !== "number" || typeof body.duration !== "number") {
        setSubmitState("uncertain");
        setSubmitError("Serveri kinnitus oli puudulik. Kontrolli sama taotluse tulemust uuesti.");
        return;
      }
      setResult(body as BookingResult);
      setSubmitState("idle");
    } catch (error: unknown) {
      setSubmitState("error");
      setSubmitError(error instanceof Error ? error.message : "Broneeringut ei saanud kinnitada.");
      keyRef.current = "";
      payloadRef.current = "";
    } finally {
      submitLockRef.current = false;
    }
  }

  function stepIndex(id: Step) {
    return visibleSteps.findIndex((item) => item.id === id);
  }

  if (result) {
    return (
      <main>
        <section aria-labelledby="success-title">
          {catalog.tenant.demo && <p role="status">Demokeskkond — proovibroneeringud</p>}
          <p>Broneering kinnitatud</p>
          <h1 id="success-title" ref={headingRef} tabIndex={-1}>Kohtumiseni, {form.name.split(" ")[0] || "sind"}.</h1>
          <p>Sinu aeg on kalendrisse märgitud. Hoia broneeringu number alles.</p>
          <dl>
            <div><dt>Broneering</dt><dd>{result.reference}</dd></div>
            <div><dt>Teenus</dt><dd>{result.serviceName}</dd></div>
            <div><dt>Koht</dt><dd>{catalog.tenant.name}<br />{catalog.tenant.address}</dd></div>
            <div><dt>Aeg</dt><dd>{dateTimeLabel(result.start, catalog.tenant.timezone)}, {timeLabel(result.start, catalog.tenant.timezone)} – {timeLabel(result.end, catalog.tenant.timezone)}</dd></div>
            <div><dt>Töötaja</dt><dd>{result.staffName}</dd></div>
            <div><dt>Kestus</dt><dd>{result.duration} min</dd></div>
            <div><dt>Hind</dt><dd>{money(result.price)}</dd></div>
          </dl>
          {result.cancellationHours != null && <p>Palume muutmisest või tühistamisest ettevõttele teada anda vähemalt {result.cancellationHours} tundi ette.</p>}
          <p>Broneering on kinnitatud sõltumata kinnituskirja kohalejõudmisest.{catalog.tenant.demo && ' Demokeskkond e-kirju ei saada.'}</p>
          <p><button type="button" onClick={() => downloadCalendar(result,catalog)}>Lisa kalendrisse</button></p>
          <button type="button" onClick={() => { setResult(null); setStep("service"); setServiceId(""); setStaffId(""); setOffer(null); }}>Tee uus broneering</button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header>
        <p>broneering.info</p>
        <h1>{catalog.tenant.name}</h1>
        <p>{catalog.tenant.address}</p>
        <p>{catalog.tenant.description}</p>
        {catalog.selectedStaffId && <p>Broneerid töötajale {catalog.staff.find(item=>item.id===catalog.selectedStaffId)?.name}. <button type="button" disabled={bookingLocked} onClick={changeLinkedStaff}>{catalogLoading?'Laadime töötajaid…':'Muuda töötajat'}</button></p>}
      </header>
      <nav aria-label="Broneerimise sammud">
        <ol>
            {visibleSteps.map((item, index) => {
              const active = item.id === step;
              const complete = stepIndex(step) > index;
              const locked = stepIndex(step) < index;
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => !locked && !bookingLocked && setStep(item.id)} disabled={locked || bookingLocked} aria-current={active ? "step" : undefined}>
                    {complete ? "Tehtud: " : `${index + 1}. `}{item.label}
                  </button>
                </li>
              );
            })}
        </ol>
      </nav>

      <section aria-labelledby="booking-title">
        {catalog.tenant.demo && <p role="status">Demokeskkond — proovibroneeringud</p>}
        <p>{stepIndex(step) + 1} / {visibleSteps.length}</p>
        <h2 id="booking-title" ref={headingRef} tabIndex={-1}>{step === "service" ? "Leia endale sobiv aeg." : step === "staff" ? "Kes sind vastu võtab?" : step === "time" ? "Vali endale hetk." : "Veel mõned andmed."}</h2>
        {(step==='service'||step==='staff')&&submitError&&<p role="alert">{submitError}</p>}
        {canGoBack && <p><button type="button" onClick={goBack} disabled={bookingLocked}>Tagasi</button></p>}

          {step === "service" && (
            <>
            {catalog.services.length > 8 && <fieldset disabled={bookingLocked}><legend>Leia teenus</legend><label>Otsi teenust <input type="search" value={serviceSearch} onChange={event=>setServiceSearch(event.target.value)} /></label><label>Teenusegrupp <select value={serviceCategory} onChange={event=>setServiceCategory(event.target.value)}><option value="">Kõik grupid</option>{[...new Set(catalog.services.map(item=>item.category))].map(category=><option key={category} value={category}>{category || 'Muud teenused'}</option>)}</select></label></fieldset>}
            <ul aria-label="Teenused">
              {filteredServices.map((item) => (
                <li key={item.id}>
                  <button type="button" disabled={bookingLocked} onClick={() => chooseService(item)} aria-pressed={item.id === serviceId}>
                    <span>{item.name}</span>
                  </button>
                  <p>{item.category}</p>
                  <p>{item.description}</p>
                  <p>{catalog.selectedStaffId?'':'Alates '}{item.durationFrom} min · {catalog.selectedStaffId?'':'alates '}{money(item.priceFrom)}</p>
                </li>
              ))}
              {!catalog.services.length && <li>Teenuseid ei ole veel lisatud.</li>}
              {!!catalog.services.length && !filteredServices.length && <li>Otsingule vastavaid teenuseid ei ole. Muuda otsingut või gruppi.</li>}
            </ul>
            </>
          )}

          {step === "staff" && (
            <ul aria-label="Töötajad">
              <li><button type="button" onClick={() => chooseStaff(null)} aria-pressed={staffId === ""}>Töötaja pole oluline</button><p>Näita kõigi seda teenust pakkuvate töötajate vabu aegu. Kuupäeva ja kellaaja valid ise.</p></li>
              {eligibleStaff.map((item) => <li key={item.id}><button type="button" onClick={() => chooseStaff(item)} aria-pressed={staffId === item.id}>{item.name}</button><p>{item.title}</p>{item.bio&&<p>{item.bio}</p>}{item.photoUrl&&<img src={item.photoUrl} alt="" width={96} height={96} loading="lazy" referrerPolicy="no-referrer"/>}</li>)}
              {!eligibleStaff.length && <li>Sellele teenusele ei ole sobivaid töötajaid.</li>}
            </ul>
          )}

          {step === "time" && (
            <div>
              {eligibleStaff.filter(item=>item.id===staffId).map(item=><aside key={item.id} aria-label="Teenindaja tutvustus"><p>{item.name}{item.title ? " · "+item.title : ""}</p>{item.bio&&<p>{item.bio}</p>}{item.photoUrl&&<img src={item.photoUrl} alt="" width={96} height={96} loading="lazy" referrerPolicy="no-referrer"/>}</aside>)}
              {submitError && <p role="alert">{submitError}</p>}
              <p><button type="button" onClick={() => chooseDate(shiftDate(date, -1))} disabled={isDateAtStart || bookingLocked} aria-label="Eelmine päev">Eelmine päev</button></p>
              <label>Valitud kuupäev <input type="date" value={date} min={catalog.today} max={catalog.maxDate} onChange={(event) => chooseDate(event.target.value)} disabled={bookingLocked} /></label>
              <p><button type="button" onClick={() => chooseDate(shiftDate(date, 1))} disabled={isDateAtEnd || bookingLocked} aria-label="Järgmine päev">Järgmine päev</button></p>
              <p>Valitud: {service?.name} / {staffId ? eligibleStaff.find((item) => item.id === staffId)?.name : "Kõik töötajad"}</p>
              <ul aria-label="Vali kuupäev">
                {dateStrip.map((item) => <li key={item}><button type="button" onClick={() => chooseDate(item)} disabled={bookingLocked} aria-pressed={item === date}>{shortDateLabel(item)}</button></li>)}
              </ul>
              {availability === "loading" && <p role="status">Otsime vabu aegu…</p>}
              {availability === "error" && <p role="alert"><strong>Ajad ei avanenud.</strong> {availabilityError} <button type="button" onClick={() => setAvailabilityRetry((value) => value + 1)}>Proovi uuesti</button></p>}
              {availability === "empty" && <div><p><strong>Sel päeval vabu aegu ei ole.</strong> Vali järgmine päev või proovi teist töötajat.</p><button type="button" onClick={findNextDay} disabled={nextDaySearching || nextDayExhausted || isDateAtEnd || bookingLocked}>{nextDaySearching?'Otsime järgmist vaba päeva…':nextDayCursor?'Jätka vaba päeva otsingut':'Leia järgmine vaba päev'}</button><p>Otsime kuni 31 päeva korraga. Kellaaeg jääb sinu valida.</p></div>}
              {nextDayMessage && <p role="status">{nextDayMessage}</p>}
              {availability === "ready" && <ul aria-label="Vabad ajad">{offers.map((item) => <li key={`${item.staffId}-${item.start}`}><button type="button" onClick={() => chooseOffer(item)}><strong>{timeLabel(item.start, catalog.tenant.timezone)}</strong> — {item.staffName}, {item.duration} min · {money(item.price)}</button></li>)}</ul>}
            </div>
          )}

          {step === "details" && offer && (
            <div>
              <form id="booking-form" onSubmit={submitBooking}>
                <p><label htmlFor="name">Teenuse saaja nimi *</label><br /><input id="name" name="name" autoComplete="name" minLength={2} maxLength={120} value={form.name} onChange={(event) => updateField("name", event.target.value)} required disabled={bookingLocked} placeholder="Ees- ja perekonnanimi" /></p>
                <p><label htmlFor="email">Kontaktisiku e-post *</label><br /><input id="email" name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(event) => updateField("email", event.target.value)} required disabled={bookingLocked} placeholder="sina@näide.ee" /></p>
                <p><label htmlFor="phone">Kontaktisiku telefon (soovi korral)</label><br /><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} disabled={bookingLocked} placeholder="+372 …" /></p>
                <p>Kontot pole vaja. Teisele inimesele broneerides sisesta tema nimi ja enda kontaktandmed. Kasutame neid andmeid ainult broneeringuga seoses.</p>
                {submitState === "uncertain" && <p role="alert"><strong>Kontrollime kinnituse tulemust.</strong> {submitError} Kinnitus loetakse õnnestunuks alles serveri vastuse järel.</p>}
                {submitState === "error" && <p role="alert"><strong>Broneeringut ei saanud kinnitada.</strong> {submitError} Kontrolli andmeid ja proovi uuesti.</p>}
              </form>
              <aside aria-label="Broneeringu kokkuvõte"><h3>Sinu broneering</h3><h4>{service?.name}</h4><dl><div><dt>Koht</dt><dd>{catalog.tenant.name}<br />{catalog.tenant.address}</dd></div><div><dt>Kuupäev</dt><dd>{dateTimeLabel(offer.start, catalog.tenant.timezone)}</dd></div><div><dt>Kell</dt><dd>{timeLabel(offer.start, catalog.tenant.timezone)} – {timeLabel(offer.end, catalog.tenant.timezone)}</dd></div><div><dt>Töötaja</dt><dd>{offer.staffName}</dd></div><div><dt>Kestus</dt><dd>{offer.duration} min</dd></div><div><dt>Hind</dt><dd>{money(offer.price)}</dd></div></dl><p>Palume muutmisest või tühistamisest ettevõttele teada anda vähemalt {catalog.tenant.cancellationHours} tundi ette.</p><p>Teenuse eest siin veebis ei maksta.</p>{catalog.tenant.demo && <p>Demokeskkond — proovibroneeringud. E-kirju ei saadeta.</p>}</aside>
              <button type="submit" form="booking-form" disabled={submitState === "submitting" || catalogLoading}>{submitState === "submitting" ? "Kinnitame…" : submitState === "uncertain" ? "Proovi uuesti" : "Kinnita broneering"}</button>
            </div>
          )}
      </section>
    </main>
  );
}
