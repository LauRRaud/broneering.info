'use client';
import {useRef,useState,type FormEvent} from 'react';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from './i18n-provider';
import type {ProvisionReply} from '@/lib/company-provisioning';
export default function CompanyProvisioning({onCreated}:{onCreated:()=>void}){
  const {t}=useI18n(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reply,setReply]=useState<ProvisionReply|null>(null);
  const pending=useRef<{payload:string;key:string}|null>(null),running=useRef(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(running.current)return;running.current=true;setBusy(true);setError('');
    const data=new FormData(event.currentTarget),values=Object.fromEntries(['name','address','slug','ownerEmail'].map(key=>[key,String(data.get(key)??'')]));
    const payload=JSON.stringify(values);
    if(pending.current?.payload!==payload)pending.current={payload,key:crypto.randomUUID()};
    try{
      const response=await fetch('/api/admin/companies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,requestKey:pending.current.key})});
      const body=await response.json();if(!response.ok)throw Error(body.error??t('Toiming ebaõnnestus.'));
      setReply(body);onCreated();
    }catch(e){setError(e instanceof Error?e.message:t('Toiming ebaõnnestus.'));}
    finally{running.current=false;setBusy(false);}
  }
  return <section aria-labelledby="company-create-title"><h3 id="company-create-title">{t('Loo ettevõte')}</h3>
    <p>{t('Uus ettevõte alustab avaldamata testrežiimis. Omanik aktiveerib konto kutsega ja seadistab MFA.')}</p>
    {error&&<p role="alert">{error}</p>}
    {reply?<div role="status"><p>{t('Ettevõte loodud. Veebiaadress ootab seadistamist:')} {reply.hostname}</p>
      <p>{t('Edasta see privaatne kutselink omanikule. Kutset ei ole e-postiga saadetud.')}</p>
      <p><label>{t('Omaniku kutselink')}<br/><textarea readOnly rows={3} value={reply.activationUrl} onFocus={e=>e.currentTarget.select()}/></label></p>
      <p>{t('Kutse aegub:')} {reply.expiresAt}</p>
      <button type="button" onClick={()=>{setReply(null);pending.current=null;}}>{t('Loo järgmine ettevõte')}</button>
    </div>:<form onSubmit={submit}>
      {(['name','address','slug','ownerEmail'] as const).map(name=><p key={name}><label>{t({name:'Ettevõtte nimi',address:'Aadress',slug:'Alamdomeen',ownerEmail:'Omaniku e-post'}[name])}<br/><input name={name} required type={name==='ownerEmail'?'email':'text'} minLength={name==='slug'?3:2} maxLength={name==='slug'?50:name==='address'?500:320}/></label></p>)}
      <button type="submit" disabled={busy}>{t('Loo ettevõte ja omaniku kutse')}</button>
    </form>}
  </section>;
}
