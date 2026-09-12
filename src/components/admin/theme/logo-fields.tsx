'use client';
import Button from '@/components/ui/button/button';
import Input from '@/components/ui/input/input';
import {useEffect,useId,useState} from 'react';
import {useI18n} from '@/components/i18n-provider';
import styles from './logo-fields.module.css';
export default function LogoFields({slot,url,disabled,onSave}:{slot:'light'|'dark';url?:string;disabled:boolean;onSave:(file:File|null)=>Promise<void>}){
  const {t}=useI18n(),id=useId(),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[error,setError]=useState('');
  useEffect(()=>{if(!file){setPreview('');return;}const uri=URL.createObjectURL(file);setPreview(uri);return()=>URL.revokeObjectURL(uri);},[file]);
  return <fieldset disabled={disabled}><legend>{t(slot==='light'?'Logo heledale taustale':'Logo tumedale taustale')}</legend>
    {(preview||url)&&<div className={styles.logoPreview} data-dark={slot==='dark'}><img src={preview||url} alt={t('Logo eelvaade')}/></div>}
    <label htmlFor={id}>{t('Vali logofail')}</label><Input id={id} type="file" accept="image/png,image/webp,image/jpeg" onChange={e=>{const selected=e.target.files?.[0];e.target.value='';if(!selected)return;if(selected.size>10*1024*1024||!['image/png','image/webp','image/jpeg'].includes(selected.type)){setError(t('Vali PNG-, WebP- või JPG-logo kuni 10 MB ja 40 megapikslit.'));return;}setError('');setFile(selected);}}/>
    {file&&<p>{file.name}{' '}<Button type="button" onClick={()=>void onSave(file).then(()=>setFile(null)).catch(()=>{})}>{t('Salvesta logo mustandisse')}</Button>{' '}<Button type="button" onClick={()=>setFile(null)}>{t('Loobu valitud logost')}</Button></p>}
    {url&&<p><Button type="button" onClick={()=>void onSave(null).then(()=>setFile(null)).catch(()=>{})}>{t('Eemalda logo mustandist')}</Button></p>}
    {error&&<p role="alert">{error}</p>}
  </fieldset>;
}
