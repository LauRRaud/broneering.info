'use client';
import Input from '@/components/ui/input/input';
import {useId} from 'react';
import {colorLabels,resolvedPalette,type Palette,type ColorKey} from '@/lib/theme-contracts';
import {useI18n} from '@/components/i18n-provider';
import styles from './palette-fields.module.css';
export default function PaletteFields({value,onChange}:{value:Palette;onChange:(palette:Palette)=>void}){
  const id=useId(),{t}=useI18n();const colors=resolvedPalette(value);
  return <div className={styles.colors}>{(Object.keys(colorLabels) as ColorKey[]).map(key=><div key={key} className={styles.color}><label htmlFor={`${id}-${key}`}>{t(colorLabels[key])}</label><Input aria-label={t(colorLabels[key])+' — '+t('värvivalija')} type="color" value={/^#[0-9a-f]{6}$/i.test(colors[key])?colors[key]:'#000000'} onChange={e=>onChange({...value,[key]:e.target.value})}/><Input id={`${id}-${key}`} aria-label={t(colorLabels[key])+' HEX'} type="text" value={colors[key]} maxLength={7} pattern="#[0-9a-fA-F]{6}" aria-invalid={!/^#[0-9a-f]{6}$/i.test(colors[key])} onChange={e=>onChange({...value,[key]:e.target.value})}/></div>)}</div>;
}
