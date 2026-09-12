'use client';
import {useI18n} from '@/components/i18n-provider';
import {useAppearance} from '@/components/ui/theme/theme-provider';
import {locales,localeNames} from '@/lib/locales';
import DropdownMenu from '@/components/ui/dropdown-menu/dropdown-menu';
import styles from './booking-preferences.module.css';
export default function BookingPreferences(){
  const {locale,t,setLocale}=useI18n(),{mode,highContrast,setMode,setHighContrast}=useAppearance();
  return <div className={styles.root}>
    <DropdownMenu compact label={locale.toUpperCase()} accessibleLabel={t('Keel')} align="start" items={locales.map(value=>({id:value,label:localeNames[value],lang:value,checked:locale===value,onSelect:()=>setLocale(value)}))}/>
    <DropdownMenu label={t('Kuva')} accessibleLabel={t('Kuva')} heading={t('Värvirežiim')} items={[
      {id:'system',label:t('Seadme järgi'),checked:mode==='system',onSelect:()=>setMode('system')},
      {id:'light',label:t('Hele'),checked:mode==='light',onSelect:()=>setMode('light')},
      {id:'dark',label:t('Tume'),checked:mode==='dark',onSelect:()=>setMode('dark')},
      {id:'contrast',label:t('Kõrge kontrast'),kind:'checkbox',separator:true,checked:highContrast,onSelect:()=>setHighContrast(!highContrast)}
    ]}/>
  </div>;
}
