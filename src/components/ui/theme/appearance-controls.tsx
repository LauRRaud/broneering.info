'use client';
import Input from '@/components/ui/input/input';
import Select from '@/components/ui/select/select';
import {useId} from 'react';
import {useI18n} from '@/components/i18n-provider';
import type {ThemeMode} from '@/lib/theme-contracts';
import {useAppearance} from './theme-provider';
import styles from './appearance-controls.module.css';
export default function AppearanceControls(){
  const {t}=useI18n(),id=useId(),{mode,highContrast,setMode,setHighContrast}=useAppearance();
  return <details className={styles.controls}><summary>{t('Vaade')}</summary><label htmlFor={id}>{t('Värvirežiim')}</label>{' '}<Select id={id} value={mode} onChange={e=>setMode(e.target.value as ThemeMode)}><option value="system">{t('Seadme järgi')}</option><option value="light">{t('Hele')}</option><option value="dark">{t('Tume')}</option></Select>{' '}<label><Input type="checkbox" checked={highContrast} onChange={e=>setHighContrast(e.target.checked)}/>{t('Kõrge kontrast')}</label></details>;
}
