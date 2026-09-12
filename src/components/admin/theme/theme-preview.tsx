'use client';
import Button from '@/components/ui/button/button';
import Input from '@/components/ui/input/input';
import Select from '@/components/ui/select/select';
import TextLink from '@/components/ui/text-link/text-link';
import Heading from '@/components/ui/heading/heading';
import {useRef,useState} from 'react';
import {ThemeSurface} from '@/components/ui/theme/theme-surface';
import {useI18n} from '@/components/i18n-provider';
import type {PublicTheme} from '@/lib/theme-contracts';
import Icon from '@/components/ui/icon/icon';
import BrandIdentity from '@/components/ui/theme/brand-identity';
import CalendarSurface from '@/components/ui/calendar-surface/calendar-surface';
import styles from './theme-preview.module.css';
export default function ThemePreview({theme}:{theme:PublicTheme}){
  const {t}=useI18n(),[mode,setMode]=useState<'light'|'dark'>('light'),[high,setHigh]=useState(false),dialog=useRef<HTMLDialogElement>(null);
  const content=<ThemeSurface theme={theme} mode={mode} highContrast={high} className={styles.preview}>
    <BrandIdentity as="h4" name={t('Ettevõtte nimi')}/><h4 className={styles.title}>{t('Vali teenus')}</h4><p className={styles.muted}>{t('Vali teenus, töötaja ja sobiv aeg.')}</p><div className={styles.card}><Icon name="lotus" size={48}/><TextLink href="#theme-help">{t('Teenuse lisainfo')}</TextLink><button type="button" className={styles.back} aria-label={t('Tagasi')}><Icon name="chevron" size={18}/></button></div>
    <p><Button type="button" aria-pressed="true">✓ {t('Valitud teenus')}</Button>{' '}<Button type="button" disabled>{t('Mitteaktiivne nupp')}</Button></p>
    <CalendarSurface><p>{t('Vali aeg')}</p><ul>{['10:00','10:30','11:00'].map((time,i)=><li key={time}><Button type="button" aria-pressed={i===1}>{i===1?'✓ ':''}{time}</Button></li>)}</ul></CalendarSurface>
    <p><label>{t('Nimevälja näidis')}<br/><Input readOnly value={t('Ees- ja perekonnanimi')}/></label></p><p>{t('Veateate näidis: kontrolli sisestatud andmeid.')}</p>
  </ThemeSurface>;
  return <section aria-label={t('Kujunduse eelvaade')}><Heading as="h3">{t('Kujunduse eelvaade')}</Heading><p>{t('See on värvide ja elementide näidis. Siin broneeringut ei tehta.')}</p>
    <p><label>{t('Eelvaate režiim')}{' '}<Select value={mode} onChange={e=>setMode(e.target.value as 'light'|'dark')}><option value="light">{t('Hele')}</option><option value="dark">{t('Tume')}</option></Select></label>{' '}<label><Input type="checkbox" checked={high} onChange={e=>setHigh(e.target.checked)}/>{t('Kõrge kontrast')}</label></p>
    {content}<p><Button type="button" onClick={()=>dialog.current?.showModal()}>{t('Vaata modaalis')}</Button></p>
    <dialog ref={dialog} className={styles.dialog} aria-label={t('Kujunduse eelvaade')}><Button type="button" autoFocus onClick={()=>dialog.current?.close()}>{t('Sulge eelvaade')}</Button>{content}</dialog>
  </section>;
}
