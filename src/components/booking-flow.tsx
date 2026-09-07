"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { BookingInput, BookingResult, Catalog, Offer, Service, Staff } from "../lib/contracts";

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

function downloadCalendar(result: BookingResult) {
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

export default function BookingFlow({ catalog }: { catalog: Catalog }) {
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(catalog.today);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
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

  const service = useMemo(() => catalog.services.find((item) => item.id === serviceId), [catalog.services, serviceId]);
  const eligibleStaff = useMemo(
    () => catalog.staff.filter((item) => item.serviceIds.includes(serviceId)),
    [catalog.staff, serviceId],
  );
  const canGoBack = step !== "service";
  const visibleSteps = eligibleStaff.length === 1 ? stepLabels.filter(item => item.id !== "staff") : stepLabels;
  const bookingLocked = submitState === "submitting" || submitState === "uncertain";
  const isDateAtStart = date <= catalog.today;
  const isDateAtEnd = date >= catalog.maxDate;

  const dateStrip = useMemo(() => {
    const dates = [shiftDate(date, -2), shiftDate(date, -1), date, shiftDate(date, 1), shiftDate(date, 2)];
    return dates.filter((item, index, list) => item >= catalog.today && item <= catalog.maxDate && list.indexOf(item) === index);
  }, [catalog.maxDate, catalog.today, date]);

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
    setOffer(null);
    setSubmitState("idle");
    setSubmitError("");
    setResult(null);
    keyRef.current = "";
    payloadRef.current = "";
  }

  function chooseService(next: Service) {
    setServiceId(next.id);
    const nextStaff = catalog.staff.filter((item) => item.serviceIds.includes(next.id));
    setStaffId(nextStaff.length === 1 ? nextStaff[0].id : "");
    resetTime();
    setStep(nextStaff.length === 1 ? "time" : "staff");
  }

  function chooseStaff(next: Staff | null) {
    setStaffId(next?.id || "");
    resetTime();
    setStep("time");
  }

  function chooseDate(next: string) {
    if (next < catalog.today || next > catalog.maxDate) return;
    setDate(next);
    resetTime();
  }

  function chooseOffer(next: Offer) {
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
    if (submitLockRef.current || !offer || !service || !form.name.trim() || !form.email.trim()) return;
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
      <main className="booking-page">
        <section className="success-card" aria-labelledby="success-title">
          {catalog.tenant.demo && <div className="demo-banner success-demo"><span className="demo-dot" aria-hidden="true" />Demokeskkond — proovibroneeringud</div>}
          <div className="success-mark" aria-hidden="true">✓</div>
          <p className="eyebrow">Broneering kinnitatud</p>
          <h1 id="success-title" ref={headingRef} tabIndex={-1}>Kohtumiseni, {form.name.split(" ")[0] || "sind"}.</h1>
          <p className="success-lede">Sinu aeg on kalendrisse märgitud. Hoia broneeringu number alles.</p>
          <div className="confirmation-grid">
            <div><span>Broneering</span><strong>{result.reference}</strong></div>
            <div><span>Teenus</span><strong>{result.serviceName}</strong></div>
            <div><span>Koht</span><strong>{catalog.tenant.name}</strong></div>
            <div><span>Aeg</span><strong>{dateTimeLabel(result.start, catalog.tenant.timezone)}, {timeLabel(result.start, catalog.tenant.timezone)}</strong></div>
            <div><span>Töötaja</span><strong>{result.staffName}</strong></div>
            <div><span>Kestus</span><strong>{result.duration} min</strong></div>
            <div><span>Hind</span><strong>{money(result.price)}</strong></div>
          </div>
          <button className="button button-secondary" type="button" onClick={() => downloadCalendar(result)}>Lisa kalendrisse <span aria-hidden="true">↓</span></button>
          <button className="text-button" type="button" onClick={() => { setResult(null); setStep("service"); setServiceId(""); setStaffId(""); setOffer(null); }}>Tee uus broneering</button>
        </section>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <div className="booking-shell">
        <aside className="booking-rail">
          <div>
            <p className="brand-kicker">broneering.info</p>
            <p className="brand-name">{catalog.tenant.name}</p>
            <p className="brand-address">{catalog.tenant.address}</p>
          </div>
          <div className="rail-rule" />
          <nav aria-label="Broneerimise sammud" className="steps">
            {visibleSteps.map((item, index) => {
              const active = item.id === step;
              const complete = stepIndex(step) > index;
              const locked = stepIndex(step) < index;
              return (
                <button className={`step-item ${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`} key={item.id} type="button" onClick={() => !locked && !bookingLocked && setStep(item.id)} disabled={locked || bookingLocked} aria-current={active ? "step" : undefined}>
                  <span className="step-number">{complete ? "✓" : String(index + 1).padStart(2, "0")}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="rail-note"><span className="leaf" aria-hidden="true">✳</span><span>{catalog.tenant.description}</span></div>
        </aside>

        <section className="booking-content" aria-labelledby="booking-title">
          {catalog.tenant.demo && <div className="demo-banner"><span className="demo-dot" aria-hidden="true" />Demokeskkond — proovibroneeringud</div>}
          <div className="flow-heading">
            <div><p className="eyebrow">{String(stepIndex(step) + 1).padStart(2, "0")} / {String(visibleSteps.length).padStart(2, "0")}</p><h1 id="booking-title" ref={headingRef} tabIndex={-1}>{step === "service" ? "Leia endale sobiv aeg." : step === "staff" ? "Kes sind vastu võtab?" : step === "time" ? "Vali endale hetk." : "Veel mõned andmed."}</h1></div>
            {canGoBack && <button className="back-button" type="button" onClick={goBack} disabled={bookingLocked}><span aria-hidden="true">←</span> Tagasi</button>}
          </div>

          {step === "service" && (
            <div className="service-list" aria-label="Teenused">
              {catalog.services.map((item) => (
                <button className={`service-card ${item.id === serviceId ? "is-selected" : ""}`} key={item.id} type="button" onClick={() => chooseService(item)}>
                  <span className="service-category">{item.category}</span><span className="service-name">{item.name}</span><span className="service-description">{item.description}</span>
                  <span className="service-meta"><span>{item.durationFrom} min</span><span className="meta-dot" aria-hidden="true" /><span>alates {money(item.priceFrom)}</span></span><span className="card-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
              {!catalog.services.length && <p className="empty-state">Teenuseid ei ole veel lisatud.</p>}
            </div>
          )}

          {step === "staff" && (
            <div className="staff-list" aria-label="Töötajad">
              <button className={`staff-card any-staff ${staffId === "" ? "is-selected" : ""}`} type="button" onClick={() => chooseStaff(null)}><span className="avatar avatar-any">✦</span><span><strong>Töötaja pole oluline</strong><small>Näita kõigi seda teenust pakkuvate töötajate vabu aegu. Kuupäeva ja kellaaja valid ise.</small></span><span className="card-arrow" aria-hidden="true">↗</span></button>
              {eligibleStaff.map((item) => <button className={`staff-card ${staffId === item.id ? "is-selected" : ""}`} type="button" onClick={() => chooseStaff(item)} key={item.id}><span className="avatar">{item.name.charAt(0)}</span><span><strong>{item.name}</strong><small>{item.title}</small></span><span className="card-arrow" aria-hidden="true">↗</span></button>)}
              {!eligibleStaff.length && <p className="empty-state">Sellele teenusele ei ole sobivaid töötajaid.</p>}
            </div>
          )}

          {step === "time" && (
            <div className="time-panel">
              {submitError && <p className="message error-message" role="alert">{submitError}</p>}
              <div className="date-controls">
                <button className="round-button" type="button" onClick={() => chooseDate(shiftDate(date, -1))} disabled={isDateAtStart || bookingLocked} aria-label="Eelmine päev">←</button>
                <label className="date-input-wrap"><span>Valitud kuupäev</span><input type="date" value={date} min={catalog.today} max={catalog.maxDate} onChange={(event) => chooseDate(event.target.value)} disabled={bookingLocked} /></label>
                <button className="round-button" type="button" onClick={() => chooseDate(shiftDate(date, 1))} disabled={isDateAtEnd || bookingLocked} aria-label="Järgmine päev">→</button>
              </div>
              <div className="date-strip" aria-label="Vali kuupäev">
                {dateStrip.map((item) => <button type="button" className={`date-chip ${item === date ? "is-selected" : ""}`} key={item} onClick={() => chooseDate(item)} disabled={bookingLocked}><span>{shortDateLabel(item).split(" ")[0]}</span><strong>{localDate(item).getDate()}</strong></button>)}
              </div>
              <div className="selected-context"><span>{service?.name}</span><span className="context-slash">/</span><span>{staffId ? eligibleStaff.find((item) => item.id === staffId)?.name : "Kõik töötajad"}</span></div>
              {availability === "loading" && <div className="loading-state" role="status"><span className="loading-spinner" />Otsime vabu aegu…</div>}
              {availability === "error" && <div className="message error-message" role="alert"><strong>Ajad ei avanenud.</strong><span>{availabilityError}</span><button type="button" className="text-button" onClick={() => setAvailabilityRetry((value) => value + 1)}>Proovi uuesti</button></div>}
              {availability === "empty" && <div className="message empty-message"><strong>Sel päeval vabu aegu ei ole.</strong><span>Vali järgmine päev või proovi teist töötajat.</span></div>}
              {availability === "ready" && <div className="offer-list" aria-label="Vabad ajad">{offers.map((item) => <button className="offer-card" type="button" key={`${item.staffId}-${item.start}`} onClick={() => chooseOffer(item)}><span className="offer-time">{timeLabel(item.start, catalog.tenant.timezone)}</span><span className="offer-detail">{item.staffName}<small>{item.duration} min · {money(item.price)}</small></span><span className="card-arrow" aria-hidden="true">↗</span></button>)}</div>}
            </div>
          )}

          {step === "details" && offer && (
            <div className="details-layout">
              <form className="details-form" onSubmit={submitBooking}>
                <div className="form-field"><label htmlFor="name">Nimi <span>*</span></label><input id="name" name="name" autoComplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} required disabled={bookingLocked} placeholder="Ees- ja perekonnanimi" /></div>
                <div className="form-field"><label htmlFor="email">E-post <span>*</span></label><input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required disabled={bookingLocked} placeholder="sina@näide.ee" /></div>
                <div className="form-field"><label htmlFor="phone">Telefon <em>soovi korral</em></label><input id="phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} disabled={bookingLocked} placeholder="+372 …" /></div>
                <p className="privacy-note">Kasutame neid andmeid ainult sinu broneeringuga seoses.</p>
                {submitState === "uncertain" && <div className="submit-error uncertain-error" role="alert"><strong>Kontrollime kinnituse tulemust.</strong><span>{submitError}</span><small>Proovi sama taotlusega uuesti. Kinnitus loetakse õnnestunuks alles serveri vastuse järel.</small></div>}
                {submitState === "error" && <div className="submit-error" role="alert"><strong>Broneeringut ei saanud kinnitada.</strong><span>{submitError}</span><small>Kontrolli andmeid ja proovi uuesti.</small></div>}
                <button className="button button-primary" type="submit" disabled={submitState === "submitting"}><span>{submitState === "submitting" ? "Kinnitame…" : submitState === "uncertain" ? "Proovi uuesti" : "Kinnita broneering"}</span><span aria-hidden="true">↗</span></button>
              </form>
              <aside className="summary-card" aria-label="Broneeringu kokkuvõte"><p className="summary-label">Sinu broneering</p><h2>{service?.name}</h2><dl><div><dt>Koht</dt><dd>{catalog.tenant.name}<br />{catalog.tenant.address}</dd></div><div><dt>Kuupäev</dt><dd>{dateTimeLabel(offer.start, catalog.tenant.timezone)}</dd></div><div><dt>Kell</dt><dd>{timeLabel(offer.start, catalog.tenant.timezone)} – {timeLabel(offer.end, catalog.tenant.timezone)}</dd></div><div><dt>Töötaja</dt><dd>{offer.staffName}</dd></div><div><dt>Kestus</dt><dd>{offer.duration} min</dd></div><div><dt>Hind</dt><dd>{money(offer.price)}</dd></div></dl><div className="summary-divider" /><p className="summary-foot">Palume tühistamisest teada anda vähemalt {catalog.tenant.cancellationHours} tundi ette.</p>{catalog.tenant.demo && <p className="summary-demo">Demokeskkond — proovibroneeringud. E-kirju ei saadeta.</p>}</aside>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
