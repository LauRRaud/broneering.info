'use client';
import {useI18n} from '@/components/i18n-provider';
import {useAppearance} from '@/components/ui/theme/theme-provider';
import DropdownMenu from '@/components/ui/dropdown-menu/dropdown-menu';
import {locales,localeNames} from '@/lib/locales';
import styles from './site-preferences.module.css';
export default function SitePreferences(){
  const {locale,t,setLocale}=useI18n();
  const {mode,highContrast,setMode,setHighContrast}=useAppearance();
  return <div className={styles.root}>
    <DropdownMenu compact label={locale.toUpperCase()} accessibleLabel={t('Keel')} items={locales.map(value=>({id:value,label:localeNames[value],lang:value,checked:locale===value,onSelect:()=>{setLocale(value);window.location.reload();}}))}/>
    <DropdownMenu compact label="" icon="sun" accessibleLabel={t('Kuva')} heading={t('Värvirežiim')} items={[
      {id:'system',label:t('Seadme järgi'),checked:mode==='system',onSelect:()=>setMode('system')},
      {id:'light',label:t('Hele'),checked:mode==='light',onSelect:()=>setMode('light')},
      {id:'dark',label:t('Tume'),checked:mode==='dark',onSelect:()=>setMode('dark')},
      {id:'contrast',label:t('Kõrge kontrast'),kind:'checkbox',separator:true,checked:highContrast,onSelect:()=>setHighContrast(!highContrast)},
    ]}/>
  </div>;
}
