"use client";
import Button from '@/components/ui/button/button';


import Heading from '@/components/ui/heading/heading';
import {isDefinitiveBookingRejection} from '@/lib/booking-mutation-outcome';
import {localizedService} from '@/lib/service-translation-contracts';

import {contactErrors,type ContactErrors} from '@/lib/contact-validation';
import {localeTags} from '@/lib/locales';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from '@/components/i18n-provider';


import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { BookingInput, BookingResult, Catalog, NextAvailability, Offer, Service, Staff } from "../lib/contracts";


import Turnstile from '@/components/turnstile';
import {ThemeSurface} from '@/components/ui/theme/theme-surface';
import TimePicker from '@/components/booking/time-picker';

import {canRequestReminder} from '@/components/booking/booking-reminder';
import BookingProgress from '@/components/booking/booking-progress';
import BookingConfirmation from '@/components/booking/booking-confirmation';
import BookingSuccess from '@/components/booking/booking-success';
import OfferSelection from '@/components/booking/offer-selection';
import Icon from '@/components/ui/icon/icon';
import flowStyles from './booking/booking-flow.module.css';
import StaffCard from '@/components/booking/staff-card';
import Avatar from '@/components/ui/avatar/avatar';
import BookingHeader from '@/components/booking/booking-header';
import {useScrollFade} from '@/components/booking/use-scroll-fade';
import {CategorySelection,descendSingleCategory,ServiceSelection,serviceCategories,firstBookingStep,initialCategoryPath,servicesAtPath,servicePath} from '@/components/booking/service-selection';

type Step = "category" | "service" | "staff" | "time" | "details";
type AvailabilityState = "idle" | "loading" | "ready" | "empty" | "error";

function BookingFlowContent({ catalog:initialCatalog,previewTenantId,challengeSiteKey,designPreview=false }: { catalog: Catalog;previewTenantId?:string;challengeSiteKey?:string;designPreview?:boolean }) {
  const endpoint=(action:string,query='')=>previewTenantId?`/api/admin/${designPreview?'theme-preview':'preview'}/${action}?tenantId=${encodeURIComponent(previewTenantId)}${query?'&'+query:''}`:`/api/${action}${query?'?'+query:''}`;
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




  const [sourceCatalog,setCatalog]=useState(initialCatalog);
  const catalog=useMemo(()=>({...sourceCatalog,services:sourceCatalog.services.map(service=>localizedService(service,locale))}),[sourceCatalog,locale]);
  const [step, setStep] = useState<Step>(()=>firstBookingStep(initialCatalog));
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffChosen,setStaffChosen]=useState(false);
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
  const [categoryPath, setCategoryPath] = useState<string[]>(()=>initialCategoryPath(initialCatalog));
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [emailReminder,setEmailReminder]=useState(false);
  const [smsReminder,setSmsReminder]=useState(false);
  const [fieldErrors,setFieldErrors]=useState<ContactErrors>({});
  const [validationAttempt,setValidationAttempt]=useState(0);
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
  const stageRef=useRef<HTMLDivElement>(null);
  const footerFade=useScrollFade(stageRef,step==='service'&&!result,step+categoryPath.join('/'));
  const headingFocusFrame = useRef<number | null>(null);
  const nextDayAbort = useRef<AbortController | null>(null);

  useEffect(()=>{
    const first=Object.keys(fieldErrors)[0];
    if(!first)return;
    if(headingFocusFrame.current!==null){window.cancelAnimationFrame(headingFocusFrame.current);headingFocusFrame.current=null;}
    document.getElementById(first)?.focus();
  },[validationAttempt]);

  const service = useMemo(() => catalog.services.find((item) => item.id === serviceId), [catalog.services, serviceId]);
  const eligibleStaff = useMemo(
    () => catalog.staff.filter((item) => item.serviceIds.includes(serviceId)),
    [catalog.staff, serviceId],
  );
  const initialPath=initialCategoryPath(catalog);
  const categories=serviceCategories(catalog,categoryPath);
  const visibleSteps = stepLabels.filter(item => (item.id !== 'category' || firstBookingStep(catalog)==='category') && (item.id !== 'staff' || !catalog.selectedStaffId));
  const canGoBack = step !== visibleSteps[0].id || (step==='category'&&categoryPath.length>initialPath.length);
  const bookingLocked = submitState === "submitting" || submitState === "uncertain" || catalogLoading;
  const categoryServices = servicesAtPath(sourceCatalog.services,categoryPath);
  const isDateAtEnd = date >= catalog.maxDate;


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
    if(headingFocusFrame.current!==null)window.cancelAnimationFrame(headingFocusFrame.current);
    const frame = window.requestAnimationFrame(() => {
      headingFocusFrame.current=null;
      const heading=headingRef.current;
      if(!heading)return;
      const embedded=!!heading.closest('[data-booking-embed]');
      heading.focus({preventScroll:!embedded});
      if(!embedded&&window.scrollY>0)window.scrollTo({top:0,left:window.scrollX,behavior:'instant'});
    });
    headingFocusFrame.current=frame;
    return () => {window.cancelAnimationFrame(frame);if(headingFocusFrame.current===frame)headingFocusFrame.current=null;};
  }, [result, step, categoryPath]);

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
    const nextPath=descendSingleCategory(catalog,[...categoryPath,category]);
    if(!service||!nextPath.every((part,index)=>servicePath(service)[index]===part)){setServiceId('');setStaffId('');setStaffChosen(false);setServiceSearch('');resetTime();}
    setCategoryPath(nextPath);
    setStep(serviceCategories(catalog,nextPath).length?'category':'service');
  }

  function chooseService(next: Service) {
    if(bookingLocked)return;
    setServiceId(next.id);
    const nextStaff = catalog.staff.filter((item) => item.serviceIds.includes(next.id));
    if(next.id!==serviceId){
      const linkedStaff=catalog.selectedStaffId?nextStaff.find(item=>item.id===catalog.selectedStaffId):undefined;
      setStaffId(linkedStaff?.id??"");
      setStaffChosen(!!linkedStaff);
    }
    resetTime();
    setStep(catalog.selectedStaffId ? "time" : "staff");
  }

  function chooseStaff(next: Staff | null) {
    if(bookingLocked)return;
    setStaffId(next?.id || "");
    setStaffChosen(true);
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
      resetTime();setCatalog(fresh);setServiceId('');setStaffId('');setDate(fresh.today);setStep(firstBookingStep(fresh));setServiceSearch('');setCategoryPath(initialCategoryPath(fresh));
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
    else if (step === "time") setStep(catalog.selectedStaffId ? "service" : "staff");
    else if (step === "staff") setStep("service");
    else if (step === "service" && categories.length) setStep("category");
    else if ((step === "service" || step === "category") && categoryPath.length > initialPath.length) {
      let previous=categoryPath.slice(0,-1);
      while(previous.length>initialPath.length&&serviceCategories(catalog,previous).length===1&&!servicesAtPath(catalog.services,previous).length)previous=previous.slice(0,-1);
      setCategoryPath(previous);setStep(serviceCategories(catalog,previous).length?'category':'service');
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors(current=>({...current,[field]:undefined}));
    setSubmitState("idle");
    setSubmitError("");
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(designPreview)return;
    if (submitLockRef.current || catalogLoading || !offer || !service) return;
    if(challengeSiteKey&&!challengeToken){setSubmitState(state=>state==='uncertain'?'uncertain':'error');setSubmitError(t('Palun kinnita, et sa ei ole robot.'));return;}
    if(submitState !== 'uncertain'){const errors=contactErrors(form,smsReminder&&catalog.tenant.demo&&canRequestReminder(offer.start,catalog.tenant.reminderMinutes));setFieldErrors(errors);if(Object.keys(errors).length){setValidationAttempt(value=>value+1);return;}}
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
          smsReminder:smsReminder&&catalog.tenant.demo&&canRequestReminder(offer.start,catalog.tenant.reminderMinutes),
          emailReminder:emailReminder&&canRequestReminder(offer.start,catalog.tenant.reminderMinutes),
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
            setServiceSearch('');setCategoryPath(initialCategoryPath(fresh));
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

  function stepCompleted(id:Step){
    if(id==='category')return !!serviceId||stepIndex(step)>stepIndex(id);
    if(id==='service')return !!serviceId;
    if(id==='staff')return !!catalog.selectedStaffId||staffChosen;
    if(id==='time')return !!offer;
    return false;
  }

  function stepSelectable(id:Step){
    if(id==='category')return true;
    if(id==='service')return firstBookingStep(catalog)==='service'||!!serviceId||stepIndex(step)>stepIndex(id);
    if(id==='staff')return !!serviceId;
    if(id==='time')return !!serviceId&&(!!catalog.selectedStaffId||staffChosen);
    return !!offer;
  }

  function goToStep(index:number){
    const next=visibleSteps[index];
    if(!next||next.id===step||bookingLocked||!stepSelectable(next.id))return;
    if(next.id==='category')setCategoryPath(initialPath);
    else if(service)setCategoryPath(servicePath(service));
    setStep(next.id);
  }

  const titles={category:t('Vali kategooria'),service:t('Vali teenus'),staff:t('Vali spetsialist'),time:t('Vali aeg'),details:t('Kinnita broneering')};
  const restart=()=>{setResult(null);setStep(firstBookingStep(catalog));setCategoryPath(initialCategoryPath(catalog));setServiceSearch('');setServiceId('');setStaffId('');setStaffChosen(false);setOffer(null);setForm({name:'',email:'',phone:''});setEmailReminder(false);setSmsReminder(false);keyRef.current='';payloadRef.current='';};
  return <main className={flowStyles.root} id="main-content" tabIndex={-1} data-live-language data-booking-flow>
    <BookingHeader tenant={catalog.tenant}/>
    {designPreview&&<p className={flowStyles.notice} role="status">{t('Kujunduse eelvaade — broneeringu kinnitamine on välja lülitatud.')}</p>}
    {catalog.selectedStaffId&&!result&&<p className={flowStyles.linked}>{t('Broneerid töötajale ')}{catalog.staff.find(item=>item.id===catalog.selectedStaffId)?.name}. <Button type="button" disabled={bookingLocked} onClick={changeLinkedStaff}>{catalogLoading?t('Laadime töötajaid…'):t('Muuda töötajat')}</Button></p>}
    <div className={flowStyles.body} data-step={result?'success':step}>
    {result?<BookingSuccess result={result} tenant={catalog.tenant} name={form.name} serviceName={service?.name} onRestart={restart} headingRef={headingRef}/>:<section aria-labelledby="booking-title">
      <div className={flowStyles.intro}><Heading as="h2" className={flowStyles.title} id="booking-title" ref={headingRef} tabIndex={-1}>{titles[step]}</Heading></div>
      {(step==='category'||step==='service'||step==='staff')&&submitError&&<p className={flowStyles.notice} role="alert">{t(submitError)}</p>}
      <div className={flowStyles.stage} ref={stageRef} key={step+categoryPath.join('/')}>
      {step==='category'&&<CategorySelection categories={categories} selected={service?servicePath(service)[categoryPath.length]??null:null} disabled={bookingLocked} onSelect={chooseCategory}/>}
      {(step==='service'||(step==='category'&&categoryServices.length>0))&&<ServiceSelection services={categoryServices} selected={serviceId} disabled={bookingLocked} exactPrice={!!catalog.selectedStaffId||catalog.staff.filter(item=>categoryServices.some(service=>item.serviceIds.includes(service.id))).length===1} search={serviceSearch} onSearch={setServiceSearch} onSelect={chooseService}/>}
      {step==='staff'&&<ul className={flowStyles.staffList} aria-label={t('Töötajad')}>
        {eligibleStaff.map(item=><li key={item.id}><StaffCard companyPhone={catalog.tenant.contactPhone} staff={item} serviceId={serviceId} showPrice={new Set(eligibleStaff.map(person=>{const detail=person.serviceDetails?.find(value=>value.serviceId===serviceId);return detail?detail.price+':'+detail.duration:'';})).size>1} selected={staffChosen&&staffId===item.id} disabled={bookingLocked} onSelect={()=>chooseStaff(item)}/></li>)}
        {eligibleStaff.length>1&&<li><Button className={flowStyles.any} type="button" disabled={bookingLocked} onClick={()=>chooseStaff(null)} aria-label={t('Eelistus puudub')} aria-pressed={staffChosen&&staffId===''}><span className={flowStyles.anyAvatar}><Avatar name="?"/></span><strong>{t('Eelistus puudub')}</strong></Button></li>}
        {!eligibleStaff.length&&<li>{t('Sellele teenusele ei ole sobivaid töötajaid.')}</li>}
      </ul>}
      {step==='time'&&<TimePicker key={serviceId+':'+staffId} date={date} min={catalog.today} max={catalog.maxDate} disabled={bookingLocked} onChange={chooseDate} serviceId={serviceId} staffId={staffId} endpoint={endpoint('availability')}>
        {submitError&&<p role="alert">{t(submitError)}</p>}
        {availability==='loading'&&<p role="status">{t('Otsime vabu aegu…')}</p>}
        {availability==='error'&&<p role="alert">{t('Ajad ei avanenud.')} {t(availabilityError)} <Button type="button" onClick={()=>setAvailabilityRetry(value=>value+1)}>{t('Proovi uuesti')}</Button></p>}
        {availability==='empty'&&<div><p>{t('Sel päeval vabu aegu ei ole.')}</p><Button className={flowStyles.nextDay} variant="primary" type="button" onClick={findNextDay} disabled={nextDaySearching||nextDayExhausted||isDateAtEnd||bookingLocked}>{nextDaySearching?t('Otsime järgmist vaba päeva…'):nextDayCursor?t('Jätka vaba päeva otsingut'):t('Leia järgmine vaba päev')}</Button></div>}
        {nextDayMessage&&<p role="status">{t(nextDayMessage)}</p>}
        {availability==='ready'&&<OfferSelection key={date} offers={offers} timezone={catalog.tenant.timezone} showStaff={!staffId} selected={offer} disabled={bookingLocked} onSelect={chooseOffer}/>}
      </TimePicker>}
      {step==='details'&&offer&&service&&<BookingConfirmation tenant={catalog.tenant} service={service} offer={offer} form={form} errors={fieldErrors} locked={bookingLocked} state={submitState} error={submitError} preview={designPreview} emailReminder={emailReminder} onReminder={setEmailReminder} smsReminder={smsReminder} onSmsReminder={setSmsReminder} onField={updateField} onSubmit={submitBooking} canEditStaff={!catalog.selectedStaffId&&eligibleStaff.length>0} onEdit={target=>{if(!bookingLocked)setStep(target);}}>
        {challengeSiteKey&&<Turnstile siteKey={challengeSiteKey} onToken={setChallengeToken} resetSignal={challengeReset} label={t('Botikontroll')}/>}
      </BookingConfirmation>}
      </div>
    </section>}
    </div>
    <footer className={flowStyles.footer} data-fade={footerFade||undefined}><span aria-hidden="true"/>{!result?<BookingProgress current={stepIndex(step)} labels={visibleSteps.map(item=>item.label)} completed={visibleSteps.map(item=>stepCompleted(item.id))} selectable={visibleSteps.map(item=>stepSelectable(item.id))} canGoBack={canGoBack} disabled={bookingLocked} onBack={goBack} onSelect={goToStep}/>:<span/>}<a className={flowStyles.brand} href="https://ajasta.ee" target="_blank" rel="noopener noreferrer" aria-label={t('Ajasta broneerimistarkvara')}><Icon name="clock" size={25}/>Ajasta.ee</a></footer>
  </main>;
}

export default function BookingFlow(props:Parameters<typeof BookingFlowContent>[0]){return <ThemeSurface theme={props.catalog.theme}><BookingFlowContent {...props}/></ThemeSurface>;}
