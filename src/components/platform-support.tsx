"use client";
import {useI18n} from './i18n-provider';
import SupportView from './support-view';
import type {SupportGrant} from '@/lib/access';
type Tenant={id:string;name:string;slug:string;active:boolean};
type Props={tenants:Tenant[];grants:SupportGrant[];selected:SupportGrant|null;busy:boolean;
  select:(grant:SupportGrant)=>void;start:(tenantId:string,reason:string)=>void;stop:(grantId:string)=>void};
export default function PlatformSupport({tenants,grants,selected,busy,select,start,stop}:Props){
  const {t}=useI18n();
  const tenantName=(id:string)=>tenants.find(tenant=>tenant.id===id)?.name||id;
  return <section aria-labelledby="platform-title">
    <h2 id="platform-title">{t('Platvorm')}</h2>
    <p>{t('Platvormi tugi annab ajutise ainult lugemise ligipääsu valitud ettevõtte kontekstile.')}</p>
    <ul>{tenants.map(tenant=><li key={tenant.id}>
      {tenant.name} ({tenant.slug}) · {t(tenant.active?'aktiivne':'peatatud')}
      <form onSubmit={event=>{event.preventDefault();start(tenant.id,String(new FormData(event.currentTarget).get('reason')||''));}}>
        <label htmlFor={`support-reason-${tenant.id}`}>{t('Põhjus')}</label><br/>
        <input id={`support-reason-${tenant.id}`} name="reason" minLength={10} maxLength={500} required/>
        <button type="submit" disabled={busy||!!selected}>{t('Alusta tuge')}</button>
      </form>
    </li>)}</ul>
    {grants.length>0&&<div>
      <h3>{t('Minu aktiivsed tugiload')}</h3>
      <ul>{grants.map(grant=><li key={grant.id}>
        {tenantName(grant.tenantId)} · {grant.reason}
        <button type="button" disabled={busy||selected?.id===grant.id} onClick={()=>select(grant)}>{t('Ava tugivaade')}</button>
        {selected?.id!==grant.id&&<button type="button" disabled={busy} onClick={()=>stop(grant.id)}>{t('Lõpeta tugi')}</button>}
      </li>)}</ul>
    </div>}
    {selected&&<>
      <SupportView key={selected.id} grant={selected} tenantName={tenantName(selected.tenantId)}/>
      <button type="button" disabled={busy} onClick={()=>stop(selected.id)}>{t('Lõpeta tugi')}</button>
    </>}
  </section>;
}
