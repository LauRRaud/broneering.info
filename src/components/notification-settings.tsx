'use client';
import {useEffect,useRef,useState} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import type {NotificationState} from '@/lib/notification-contracts';
import {useI18n} from './i18n-provider';
import {localeTags} from '@/lib/locales';
const statusLabels:Record<string,string>={pending:'Saatmise ootel',sending:'Edastamisel',sent:'SMTP-le edastatud',failed:'Saatmine ebaõnnestus',skipped:'Jäeti saatmata',superseded:'Asendatud uuema muudatusega'};
const kindLabels:Record<string,string>={'booking.confirmed':'Broneering on kinnitatud','booking.changed':'Broneeringut on muudetud','booking.cancelled':'Broneering on tühistatud','booking.reminder':'Broneeringu meeldetuletus'};
export default function NotificationSettings({tenantId}:{tenantId:string}){
  const {t,locale}=useI18n();
  const [state,setState]=useState<NotificationState|null>(null),[draft,setDraft]=useState({version:0,notificationEmail:'',reminderMinutes:''}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[page,setPage]=useState(0),[revision,setRevision]=useState(0),[reason,setReason]=useState('');
  const dirty=useRef(false),saving=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();let inFlight=false;
    async function load(){if(inFlight||saving.current||document.hidden)return;inFlight=true;try{
      const response=await fetch(`/api/admin/notifications?tenantId=${encodeURIComponent(tenantId)}&page=${page}`,{cache:'no-store',signal:controller.signal});
      const body=await response.json();if(!response.ok)throw Error(body.error);
      if(!controller.signal.aborted){setState(body);if(!dirty.current)setDraft({version:body.settings.version,notificationEmail:body.settings.notificationEmail,reminderMinutes:body.settings.reminderMinutes==null?'':String(body.settings.reminderMinutes)});}
    }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Teavitusi ei saanud laadida.');}finally{inFlight=false;}}
    void load();const timer=setInterval(load,10000);return()=>{controller.abort();clearInterval(timer);};
  },[tenantId,page,revision]);
  async function command(data:Record<string,unknown>){if(saving.current)return;saving.current=true;setBusy(true);setMessage('');try{
    const response=await fetch('/api/admin/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,...data})});const body=await response.json();if(!response.ok)throw Error(body.error);
    if(data.action==='settings')dirty.current=false;setMessage('Teavituste muudatus salvestati.');setRevision(r=>r+1);
  }catch(error){setMessage(error instanceof Error?error.message:'Salvestamine ebaõnnestus.');}finally{saving.current=false;setBusy(false);}}
  const when=(value:string|null)=>value?new Date(value).toLocaleString(localeTags[locale]):'—';
  return <section aria-labelledby="notification-title"><h3 id="notification-title">{t('E-kirjad ja meeldetuletused')}</h3>
    {message&&<p role="status">{t(message)}</p>}
    {!state?<p>{t('Laadime teavitusi…')}</p>:<>
      <p>{t(state.mode==='capture'?'Proovirežiim: kirjad salvestatakse privaatsesse proovikausta.':state.configured?'Saatmislahendus on seadistatud.':'E-kirjade saatmine ei ole veel seadistatud.')}</p>
      {state.demo&&<p>{t('Demorežiimis päris e-kirju ei saadeta.')}</p>}
      <form onSubmit={e=>{e.preventDefault();void command({action:'settings',version:draft.version,notificationEmail:draft.notificationEmail,reminderMinutes:draft.reminderMinutes===''?null:Number(draft.reminderMinutes)});}}><fieldset disabled={busy||!draft.version}>
        <label>{t('Ettevõtte teavituste e-post')} <input type="email" maxLength={254} value={draft.notificationEmail} onChange={e=>{dirty.current=true;setMessage('');setDraft({...draft,notificationEmail:e.target.value});}}/></label>
        <p>{t('Tühja aadressi korral ettevõttele broneeringute koopiaid ei saadeta.')}</p>
        <label>{t('Meeldetuletus minutites enne aega')} <input type="number" min={5} max={43200} step={1} value={draft.reminderMinutes} onChange={e=>{dirty.current=true;setMessage('');setDraft({...draft,reminderMinutes:e.target.value});}}/></label>
        <p>{t('Tühi väärtus keelab meeldetuletused. Muudatus rakendub ka saatmata tulevastele meeldetuletustele.')}</p>
        {draft.version!==state.settings.version&&<p role="alert">{t('Seadeid on vahepeal muudetud. Laadi värske seis.')}</p>}
        <button disabled={draft.version!==state.settings.version}>{t('Salvesta teavituste seaded')}</button>
        <button type="button" onClick={()=>{dirty.current=false;setRevision(r=>r+1);}}>{t('Loobu muutustest ja laadi uuesti')}</button>
      </fieldset></form>
      <p>{t('SMTP-le edastamine ei tõenda kirja kohaletoimetamist ega lugemist.')}</p>
      <label>{t('Korduskatse või tagasiside põhjendus')} <input value={reason} maxLength={500} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>
      <div className="table-scroll" role="region" aria-label={t('Teavituste järjekord')} tabIndex={0}><table className="notification-queue"><thead><tr>{['Broneeringu number','Teavitus','Saaja','Seisund','Katsed','Järgmine katse','Tagasiside','Toimingud'].map(label=><th scope="col" key={label}>{t(label)}</th>)}</tr></thead><tbody>
        {state.jobs.map(job=><tr key={job.id}><td>{job.reference}</td><td>{t(kindLabels[job.kind.replace(/^company\./,'')]??job.kind)}</td><td>{t(job.recipientKind==='company'?'Ettevõte':'Klient')}</td><td>{t(statusLabels[job.status]??job.status)}{job.capturedAt&&' · '+t('Proovikiri')}{job.lastErrorCode&&<small> {job.lastErrorCode}</small>}{job.sentAt&&<small> {when(job.sentAt)}</small>}</td><td>{job.attempts}/{job.retryBudget}</td><td>{['pending','failed'].includes(job.status)&&job.attempts<job.retryBudget?when(job.nextAttemptAt):'—'}</td><td>{t(job.deliveryStatus==='delivered'?'Kohaletoimetamine kinnitatud':job.deliveryStatus==='bounced'?'Tagasipõrge':'Teadmata')}</td><td>
          {job.status==='failed'&&job.attempts<80&&<button disabled={busy||reason.trim().length<3} onClick={()=>void command({action:'retry',id:job.id,version:job.version,reason})}>{t('Proovi saatmist uuesti')}</button>}
          {job.status==='sent'&&<><button disabled={busy||reason.trim().length<3} onClick={()=>void command({action:'feedback',id:job.id,version:job.version,deliveryStatus:'bounced',reason})}>{t('Märgi tagasipõrge')}</button><button disabled={busy||reason.trim().length<3} onClick={()=>void command({action:'feedback',id:job.id,version:job.version,deliveryStatus:'delivered',reason})}>{t('Kinnita kohaletoimetamine')}</button></>}
        </td></tr>)}
      </tbody></table></div>
      {!state.jobs.length&&<p>{t('Teavitusi veel ei ole.')}</p>}
      <button disabled={busy||page===0} onClick={()=>setPage(p=>p-1)}>{t('Eelmine lehekülg')}</button><button disabled={busy||!state.hasMore} onClick={()=>setPage(p=>p+1)}>{t('Järgmine lehekülg')}</button>
    </>}
  </section>;
}
