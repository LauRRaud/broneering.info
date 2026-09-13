'use client';
import {useState,type FormEvent, type ReactNode} from 'react';
import type {Catalog,Offer,Service} from '@/lib/contracts';
import type {ContactErrors} from '@/lib/contact-validation';
import {useI18n} from '@/components/i18n-provider';
import {localeTags,localeNames} from '@/lib/locales';
import {localizedService} from '@/lib/service-translation-contracts';
import Button from '@/components/ui/button/button';
import Input from '@/components/ui/input/input';
import Icon,{type IconName} from '@/components/ui/icon/icon';
import TextLink from '@/components/ui/text-link/text-link';
import BookingTerms from './booking-terms';
import BookingPolicy from './booking-policy';
import BookingReminder,{canRequestReminder} from './booking-reminder';
import {bookingAddress} from './booking-address';
import styles from './booking-confirmation.module.css';
type Fields={name:string;email:string;phone:string};
type Props={tenant:Catalog['tenant'];service:Service;offer:Offer;form:Fields;errors:ContactErrors;locked:boolean;state:'idle'|'submitting'|'uncertain'|'error';error:string;preview:boolean;smsReminder:boolean;onSmsReminder:(value:boolean)=>void;emailReminder:boolean;onReminder:(value:boolean)=>void;onField:(field:keyof Fields,value:string)=>void;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;onEdit:(step:'service'|'staff'|'time')=>void;canEditStaff:boolean;children?:ReactNode};
export default function BookingConfirmation({tenant,service,offer,form,errors,locked,state,error,preview,emailReminder,onReminder,smsReminder,onSmsReminder,onField,onSubmit,onEdit,canEditStaff,children}:Props){
  const {t,locale}=useI18n(),[editing,setEditing]=useState(false),translated=localizedService(service,locale);
  const reminderMinutes=tenant.reminderMinutes??0,reminderAvailable=canRequestReminder(offer.start,tenant.reminderMinutes);
  const reminderTiming=reminderMinutes%60===0?t('{value} h enne aega',{value:reminderMinutes/60}):t('{value} min enne aega',{value:reminderMinutes});
  const needsPhone=smsReminder&&tenant.demo&&reminderAvailable;
  const time=(date:string)=>new Intl.DateTimeFormat(localeTags[locale],{timeZone:tenant.timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(date));
  const date=new Intl.DateTimeFormat(localeTags[locale],{timeZone:tenant.timezone,day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(offer.start));
  const rows:Array<{icon?:IconName;label:string;value:ReactNode;nowrap?:boolean;address?:boolean}>=[
    {icon:'store',label:t('Ettevõte'),value:tenant.name},{icon:'pin',label:t('Asukoht'),value:bookingAddress(tenant.address),nowrap:true,address:true},
    {icon:'person',label:t('Töötaja'),value:offer.staffName},{icon:'calendar',label:t('Kuupäev'),value:date,nowrap:true},
    {icon:'clock',label:t('Kellaaeg'),value:time(offer.start)+' – '+time(offer.end),nowrap:true},
    {icon:'clock',label:t('Kestus'),value:offer.duration+' '+t('min'),nowrap:true},
    {icon:'tag',label:t('Hind'),value:new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR',maximumFractionDigits:offer.price%100?2:0}).format(offer.price/100)},
  ];
  return <form id="booking-form" className={styles.layout} noValidate onSubmit={onSubmit}>
    <section className={styles.contact} aria-label={t('Sinu andmed')}>
      {Object.values(errors).some(Boolean)&&<div role="alert" className={styles.error}><p>{t('Kontrolli esiletõstetud välju.')}</p><ul>{Object.entries(errors).filter(([,e])=>e).map(([field,e])=><li key={field}><TextLink href={'#'+field}>{t(e!)}</TextLink></li>)}</ul></div>}
      {(['name','email','phone'] as const).map(field=><div className={styles.field} data-field={field} key={field}><label htmlFor={field}>{t({name:'Teenuse saaja nimi',email:'Kontaktisiku e-post',phone:'Telefoninumber'}[field])}{(field!=='phone'||needsPhone)&&<span className={styles.required}> *</span>}</label>
        <Input id={field} name={field} type={field==='phone'?'tel':field==='email'?'email':'text'} autoComplete={field==='phone'?'tel':field} minLength={field==='name'?2:undefined} maxLength={field==='name'?120:field==='email'?254:30} required={field!=='phone'||needsPhone} value={form[field]} disabled={locked} onChange={e=>onField(field,e.target.value)} aria-invalid={!!errors[field]} aria-describedby={errors[field]?field+'-error contact-help':'contact-help'} placeholder={field==='phone'?'+372 …':field==='name'?t('Ees- ja perekonnanimi'):t('sina@mail.ee')}/>
        {errors[field]&&<span className={styles.error} id={field+'-error'}>{t(errors[field]!)}</span>}
      </div>)}
      <p id="contact-help" className={styles.help}>{t('Kasutame neid andmeid ainult broneeringuga seoses.')}{reminderAvailable&&<> {t('Meeldetuletuse saadame {timing}.',{timing:reminderTiming})}</>}</p>
      {reminderAvailable&&<div className={styles.reminders}><BookingReminder checked={emailReminder} disabled={locked} onChange={onReminder}/>{tenant.demo&&<BookingReminder channel="sms" checked={smsReminder} disabled={locked} onChange={onSmsReminder}/>}</div>}
      {children}
    </section>
    <div className={styles.right}>
      <aside className={styles.summary} aria-label={t('Broneeringu kokkuvõte')}><div className={styles.summaryTitle}><h3 lang={translated.contentLanguage}>{translated.name}</h3><div className={styles.summaryControls}><BookingPolicy cancellationHours={tenant.cancellationHours}/><Button className={styles.edit} type="button" disabled={locked} aria-label={t('Muuda')} aria-expanded={editing} onClick={()=>setEditing(!editing)}><Icon name="edit" size={17}/><span>{t('Muuda')}</span></Button></div></div>
        {editing&&<div className={styles.editOptions}>{(['service',...(canEditStaff?['staff'] as const:[]),'time'] as const).map(step=><Button type="button" key={step} disabled={locked} onClick={()=>onEdit(step)}>{t({service:'Muuda teenust',staff:'Muuda töötajat',time:'Muuda aega'}[step])}</Button>)}</div>}
        {translated.translationMissing&&<p className={styles.help}>{t('Tõlge pole veel kinnitatud. Algteksti keel: {language}',{language:localeNames[translated.contentLanguage]})}</p>}
        <dl className={styles.rows}>{rows.map(row=><div key={row.label} data-address={row.address||undefined}><dt>{row.icon&&<Icon name={row.icon} size={23}/ >}{row.label}</dt><dd className={row.nowrap?styles.nowrap:undefined}>{row.value}</dd></div>)}</dl>
      </aside>
      <div className={styles.actions}>
        {state==='uncertain'&&<p role="alert" className={styles.error}><strong>{t('Kontrollime kinnituse tulemust.')}</strong> {t(error)} {t('Kinnitus loetakse õnnestunuks alles serveri vastuse järel.')}</p>}
        {state==='error'&&<p role="alert" className={styles.error}><strong>{t('Broneeringut ei saanud kinnitada.')}</strong> {t(error)} {t('Kontrolli andmeid ja proovi uuesti.')}</p>}
        <div className={styles.actionRow}><BookingTerms company={tenant.name} terms={tenant.bookingTerms}/><div className={styles.confirmGroup}>
          <Button className={styles.confirm} variant="primary" type="submit" disabled={preview||state==='submitting'||(locked&&state!=='uncertain')}>{state==='submitting'?t('Kinnitame…'):state==='uncertain'?t('Proovi uuesti'):t('Kinnita broneering')}</Button>
        </div></div>
      </div>
    </div>
  </form>;
}
