'use client';
import type {Translate} from '@/lib/i18n';
import styles from './settings-nav.module.css';

export type SettingsArea='company'|'appearance'|'notifications'|'data'|'account';
const items:Array<{id:SettingsArea;label:string}>=[
  {id:'company',label:'Ettevõte'},
  {id:'appearance',label:'Kujundus'},
  {id:'notifications',label:'Teavitused'},
  {id:'data',label:'Andmed'},
  {id:'account',label:'Konto'},
];
export default function SettingsNav({t,value,onChange}:{t:Translate;value:SettingsArea;onChange:(value:SettingsArea)=>void}){
  return <div className={styles.header}><div><p>{t('Seaded')}</p><h1>{t(items.find(item=>item.id===value)?.label??'Ettevõte')}</h1></div><nav aria-label={t('Seadete jaotised')}>{items.map(item=><button key={item.id} type="button" aria-current={value===item.id?'page':undefined} onClick={()=>onChange(item.id)}>{t(item.label)}</button>)}</nav></div>;
}
