'use client';
import {useEffect,useId,useState,type ChangeEvent} from 'react';
import {useI18n} from '@/components/i18n-provider';
import {localizedFetch} from '@/lib/client-fetch';
import type {ManagedStaff} from '@/lib/service-management-contracts';
import styles from './staff-photo-editor.module.css';

export default function StaffPhotoEditor({tenantId,staff,onSaved,disabled=false}:{tenantId:string;staff:ManagedStaff;onSaved:()=>Promise<void>;disabled?:boolean}){
  const {t}=useI18n(),id=useId();
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const endpoint=`/api/admin/staff-photo?${new URLSearchParams({tenantId,staffId:staff.id,version:String(staff.version)})}`;
  const current=staff.photoUrl.startsWith('/api/staff-photos/')?endpoint:staff.photoUrl;
  useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  function select(event:ChangeEvent<HTMLInputElement>){
    const selected=event.target.files?.[0];event.target.value='';if(!selected)return;
    setError('');setMessage('');
    if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>10*1024*1024){setError(t('Vali JPG-, PNG- või WebP-pilt kuni 10 MB. HEIC-pilt salvesta esmalt JPG-na.'));return;}
    setFile(selected);
  }
  async function save(remove=false){
    if(busy||disabled||(!remove&&!file))return;setBusy(true);setError('');setMessage('');
    try{
      const response=await localizedFetch(endpoint,{method:remove?'DELETE':'PUT',...(remove?{}:{headers:{'Content-Type':file!.type},body:file!}),signal:AbortSignal.timeout(30000)});
      if(!response.ok){const result=await response.json().catch(()=>null);throw new Error(result?.error??t('Foto salvestamine ebaõnnestus. Proovi uuesti.'));}
      setFile(null);await onSaved();setMessage(t(remove?'Foto on eemaldatud.':'Foto on salvestatud.'));
    }catch(e){setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:t('Foto salvestamise vastus katkes. Laadi haldus uuesti ja kontrolli tulemust enne uut katset.'));}
    finally{setBusy(false);}
  }
  return <fieldset disabled={busy||disabled} className={styles.editor}>
    <legend>{t('Töötaja foto')}</legend>
    <p>{t('Foto on avalik broneerimisvaates. Vali pilt või tee telefoniga uus foto, vaata eelvaadet ja salvesta.')}</p>
    {(preview||current)&&<img src={preview||current} alt={t('Töötaja foto eelvaade')} className={styles.preview} referrerPolicy="no-referrer"/>}
    <p><label htmlFor={`${id}-file`}>{t('Vali pilt')}</label><br/><input id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp" onChange={select}/></p>
    <p><label htmlFor={`${id}-camera`}>{t('Tee foto')}</label><br/><input id={`${id}-camera`} type="file" accept="image/*" capture="environment" onChange={select}/></p>
    <p>{t('Kaamera avamine sõltub telefonist ja brauserist. Arvutis võib avaneda failivalik. JPG, PNG või WebP, kuni 10 MB.')}</p>
    {file&&<><p>{t('Valitud fail: ')}{file.name}</p><button type="button" onClick={()=>void save()}>{t('Salvesta foto')}</button> <button type="button" onClick={()=>{setFile(null);setError('');}}>{t('Loobu valitud fotost')}</button></>}
    {staff.photoUrl&&<p><button type="button" onClick={()=>void save(true)}>{t('Eemalda foto')}</button></p>}
    <p>{t('Foto salvestatakse töötaja muudest andmetest eraldi. Salvesta pooleliolevad töötaja andmed enne foto muutmist.')}</p>
    {disabled&&<p role="status">{t('Salvesta töötaja andmete muudatused, et fotovalikud avada.')}</p>}
    {busy&&<p role="status">{t('Foto salvestamine…')}</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  </fieldset>;
}
