import type {Ref} from 'react';
import type {BookingResult,Catalog} from '@/lib/contracts';
import {useI18n} from '@/components/i18n-provider';
import {localeTags} from '@/lib/locales';
import {downloadBookingCalendar} from '@/lib/booking-calendar';
import Heading from '@/components/ui/heading/heading';
import Button from '@/components/ui/button/button';
import Icon from '@/components/ui/icon/icon';
import TextLink from '@/components/ui/text-link/text-link';
import styles from './booking-success.module.css';
export default function BookingSuccess({result,tenant,name,serviceName,onRestart,headingRef}:{result:BookingResult;tenant:Catalog['tenant'];name:string;serviceName?:string;onRestart:()=>void;headingRef:Ref<HTMLHeadingElement>}){
  const {t,locale}=useI18n(),date=(value:string)=>new Intl.DateTimeFormat(localeTags[locale],{timeZone:tenant.timezone,dateStyle:'long',timeStyle:'short'}).format(new Date(value));
  return <section className={styles.root} aria-labelledby="success-title"><div className={styles.seal}><Icon name="check" size={40}/></div>
    <p className={styles.eyebrow}>{result.currentVersion?t('Broneeringu esialgne kinnitus'):t('Broneering kinnitatud')}</p>
    <Heading as="h2" id="success-title" ref={headingRef} tabIndex={-1}>{t('Kohtumiseni, ')}{name.split(' ')[0]}.</Heading>
    <p>{result.currentVersion?t('Broneeringut on pärast loomist muudetud. Allpool on esialgse kinnituse andmed; kontrolli kehtivat aega halduslingilt või ettevõttelt.'):t('Sinu aeg on kalendrisse märgitud. Hoia broneeringu number alles.')}</p>
    <div className={styles.card}><p>{serviceName??result.serviceName}</p><strong>{date(result.start)}</strong><p>{tenant.name} · {result.staffName}<br/>{tenant.address}</p><p>{result.duration} {t('min')} · {new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR'}).format(result.price/100)}</p><p className={styles.reference}>{t('Broneering')}: {result.reference}</p></div>
    {result.cancellationHours!=null&&<p>{t('Palume muutmisest või tühistamisest ettevõttele teada anda vähemalt ')}{result.cancellationHours} {t('tundi ette.')}</p>}
    {!result.currentVersion&&<p>{t('Broneering on kinnitatud sõltumata kinnituskirja kohalejõudmisest.')}</p>}
    <div className={styles.actions}><Button disabled={!!result.currentVersion} type="button" onClick={()=>downloadBookingCalendar(result,tenant)}><Icon name="calendar" size={19}/>{t('Lisa kalendrisse')}</Button>
    {result.managementUrl&&<TextLink href={result.managementUrl} target="_blank" rel="noopener noreferrer">{t('Vaata, muuda või tühista broneeringut')}</TextLink>}</div>
    {result.managementUrl&&<p>{t('Hoia halduslink alles ja enda teada. ')}{!result.currentVersion&&result.managementExpiresAt&&<>{t('Link kehtib kuni ')}{date(result.managementExpiresAt)}.</>}</p>}
    <Button className={styles.restart} type="button" onClick={onRestart}>{t('Tee uus broneering')}</Button>
  </section>;
}
