"use client";
import {locales,localeNames} from '@/lib/locales';
import {useI18n} from '@/components/i18n-provider';

import {useState,type FormEvent} from 'react';
import type {ManagedGroup,ManagedService,ManagedStaff,ManagedAssignment,ServiceManagementState} from '@/lib/service-management-contracts';
type Save=(action:string,payload:Record<string,unknown>)=>Promise<boolean>;
type Props={tenantId:string;catalog:ServiceManagementState;busy:boolean;save:Save};
const text=(d:FormData,key:string)=>String(d.get(key)||'').trim();
const num=(d:FormData,key:string)=>Number(text(d,key));
const money=(d:FormData,key:string)=>Math.round(num(d,key)*100);
const optional=(d:FormData,key:string,cents=false)=>text(d,key)===''?null:(cents?money(d,key):num(d,key));
function Input({name,label,value='',max=150}:{name:string;label:string;value?:string;max?:number}){return <label>{label} <input name={name} defaultValue={value} maxLength={max} required/></label>;}
function NumberInput({name,label,value,price=false,inherit=false}:{name:string;label:string;value:number|null;price?:boolean;inherit?:boolean}){
  const {t,locale}=useI18n();

  return <label>{label} <input name={name} type="number" min={name.toLowerCase().includes('duration')?5:0} max={price?1000000:name.toLowerCase().includes('duration')?720:240} step={price?'0.01':'1'} defaultValue={value===null?'':price?(value/100).toFixed(2):value} required={!inherit} placeholder={inherit?t("Teenuse vaikeväärtus"):undefined}/></label>;
}
function Flags({active=true,online=true,withOnline=true}:{active?:boolean;online?:boolean;withOnline?:boolean}){
  const {t,locale}=useI18n();
return <><label><input name="active" type="checkbox" defaultChecked={active}/> {t("Aktiivne (märge maha = arhiveeritud)")}</label>{withOnline&&<label><input name="online" type="checkbox" defaultChecked={online}/> {t("Veebis broneeritav")}</label>}</>;}
function GroupForm({item,groups,save}:{item?:ManagedGroup;groups:ManagedGroup[];save:Save}){
  const {t,locale}=useI18n();

  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,d=new FormData(form);if(await save('save-group',{id:item?.id,version:item?.version,name:text(d,'name'),parentId:text(d,'parentId')||null,active:d.has('active')})&&!item)form.reset();}
  return <form onSubmit={submit}><Input name="name" label={t("Grupi nimi")} value={item?.name} max={100}/><label>{t("Ülemgrupp ")}<select name="parentId" defaultValue={item?.parentId||""}><option value="">{t("Põhikategooria")}</option>{groups.filter(g=>{let current:ManagedGroup|undefined=g;for(let i=0;current&&i<=groups.length;i++){if(current.id===item?.id)return false;current=groups.find(p=>p.id===current?.parentId);}return true;}).map(g=><option key={g.id} value={g.id}>{g.path}</option>)}</select></label><Flags active={item?.active} withOnline={false}/><button>{t("Salvesta grupp")}</button></form>;
}
function ServiceForm({item,groups,save}:{item?:ManagedService;groups:ManagedGroup[];save:Save}){
  const {t,locale}=useI18n();

  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,d=new FormData(form);if(await save('save-service',{id:item?.id,version:item?.version,groupId:text(d,'groupId'),sourceLanguage:text(d,'sourceLanguage'),name:text(d,'name'),description:text(d,'description'),defaultPrice:money(d,'defaultPrice'),defaultDuration:num(d,'defaultDuration'),bufferBefore:num(d,'bufferBefore'),bufferAfter:num(d,'bufferAfter'),active:d.has('active'),online:d.has('online')})&&!item)form.reset();}
  return <form onSubmit={submit}><label>{t("Teenusegrupp ")}<select name="groupId" defaultValue={item?.groupId||''} required><option value="">{t("Vali grupp")}</option>{groups.map(g=><option key={g.id} value={g.id}>{g.path}{!g.active?t(" (arhiveeritud)"):''}</option>)}</select></label><label>{t("Algteksti keel")} <select name="sourceLanguage" defaultValue={item?.sourceLanguage??'et'}>{locales.map(l=><option key={l} value={l}>{localeNames[l]}</option>)}</select></label><Input name="name" label={t("Teenuse nimi")} value={item?.name}/><label>{t("Lühikirjeldus ")}<textarea name="description" defaultValue={item?.description} maxLength={1000}/></label><NumberInput name="defaultPrice" label={t("Vaikehind (€)")} value={item?.defaultPrice??0} price/><NumberInput name="defaultDuration" label={t("Vaikekestus (min)")} value={item?.defaultDuration??30}/><NumberInput name="bufferBefore" label={t("Ettevalmistus (min)")} value={item?.bufferBefore??0}/><NumberInput name="bufferAfter" label={t("Lõpetamine (min)")} value={item?.bufferAfter??0}/><Flags active={item?.active} online={item?.online}/><button>{t("Salvesta teenus")}</button></form>;
}
function StaffForm({item,save}:{item?:ManagedStaff;save:Save}){
  const {t,locale}=useI18n();

  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,d=new FormData(form);if(await save('save-staff',{id:item?.id,version:item?.version,name:text(d,'name'),title:text(d,'title'),bio:text(d,'bio'),photoUrl:text(d,'photoUrl'),active:d.has('active'),online:d.has('online')})&&!item)form.reset();}
  return <form onSubmit={submit}><Input name="name" label={t("Töötaja nimi")} value={item?.name} max={120}/><label>{t("Amet ")}<input name="title" defaultValue={item?.title} maxLength={150}/></label><label>{t("Avalik lühitutvustus ")}<textarea name="bio" defaultValue={item?.bio} maxLength={1000}/></label><label>{t("Foto HTTPS-aadress (valikuline) ")}<input name="photoUrl" type="url" pattern="https://.*" defaultValue={item?.photoUrl} maxLength={2000}/></label><Flags active={item?.active} online={item?.online}/><button>{t("Salvesta töötaja")}</button></form>;
}
function PricingForm({service,item,save}:{service:ManagedService;item?:ManagedAssignment;save:Save}){
  const {t,locale}=useI18n();

  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await save('save-pricing',{serviceId:service.id,staffId:item?.staffId,version:item?.version??service.version,price:item?optional(d,'price',true):money(d,'price'),duration:item?optional(d,'duration'):num(d,'duration')});}
  return <form onSubmit={submit}><NumberInput name="price" label={t("Hind (€)")} value={item?item.price:service.defaultPrice} price inherit={!!item}/><NumberInput name="duration" label={t("Kestus (min)")} value={item?item.duration:service.defaultDuration} inherit={!!item}/><button>{t("Salvesta hind ja kestus")}</button></form>;
}
function AssignmentForm({catalog,item,save}:{catalog:ServiceManagementState;item?:ManagedAssignment;save:Save}){
  const {t,locale}=useI18n();

  const [serviceId,setServiceId]=useState(item?.serviceId||'');
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,d=new FormData(form);if(await save('save-assignment',{serviceId:item?.serviceId||serviceId,staffId:item?.staffId||text(d,'staffId'),version:item?.version??0,price:optional(d,'price',true),duration:optional(d,'duration'),bufferBefore:optional(d,'bufferBefore'),bufferAfter:optional(d,'bufferAfter'),active:d.has('active')})&&!item){form.reset();setServiceId('');}}
  return <form onSubmit={submit}>{!item&&<><label>{t("Teenus ")}<select required value={serviceId} onChange={e=>setServiceId(e.target.value)}><option value="">{t("Vali teenus")}</option>{catalog.services.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>{t("Töötaja ")}<select name="staffId" required key={serviceId} defaultValue=""><option value="">{t("Vali töötaja")}</option>{catalog.staff.filter(st=>st.active&&!catalog.assignments.some(a=>a.serviceId===serviceId&&a.staffId===st.id)).map(st=><option key={st.id} value={st.id}>{st.name}</option>)}</select></label></>}<NumberInput name="price" label={t("Erihind (€)")} value={item?.price??null} price inherit/><NumberInput name="duration" label={t("Erikestus (min)")} value={item?.duration??null} inherit/><NumberInput name="bufferBefore" label={t("Ettevalmistuse erand (min)")} value={item?.bufferBefore??null} inherit/><NumberInput name="bufferAfter" label={t("Lõpetamise erand (min)")} value={item?.bufferAfter??null} inherit/><Flags active={item?.active} withOnline={false}/><button>{t("Salvesta seos")}</button></form>;
}
export default function ServiceManagement({tenantId,catalog,busy,save}:Props){
  const {t,locale}=useI18n();

  const run:Save=(action,payload)=>save(action,{...payload,tenantId});
  return <section aria-labelledby="services-admin-title"><h3 id="services-admin-title">{t("Teenused ja töötajad")}</h3><p>{t("Hinnad on eurodes. Arhiveerimine ja hinnakirja muutmine säilitab varasemate broneeringute ajad ja hinnad. Töötaja arhiveerimine sulgeb tema ettevõtte ligipääsu ja sessioonid ning lisab tulevased broneeringud lahendamist ootavate loendisse. Uuesti aktiveerimine ligipääsu ei taasta. Grupi arhiveerimine peidab ka selle alamgrupid ja teenused. Veebis peidetud aktiivseid teenuseid saab lisada käsitsi broneeringute vaates.")}</p><fieldset disabled={busy}><legend>{t("Hinnakiri")}</legend>
  {catalog.canEditStructure&&<><h4>{t("Teenusegrupid")}</h4><p>{t("Loo põhikategooriad ja vajaduse korral nende alamgrupid. Broneeritav teenus kuulub valitud gruppi.")}</p>{catalog.groups.map(g=><details key={g.id}><summary>{g.path}{!g.active?t(" · arhiveeritud"):''}</summary><GroupForm key={g.version} item={g} groups={catalog.groups} save={run}/></details>)}<details><summary>{t("Lisa teenusegrupp")}</summary><GroupForm groups={catalog.groups} save={run}/></details></>}
  <h4>{t("Teenused")}</h4>{catalog.services.length===0&&<p>{t("Teenuseid veel pole.")}</p>}{catalog.services.map(s=><details key={s.id}><summary>{s.name} · {(s.defaultPrice/100).toFixed(2)} € · {s.defaultDuration}{t(" min")}{!s.active?t(" · arhiveeritud"):!s.online?t(" · veebis peidetud"):''}</summary>{catalog.canEditStructure?<ServiceForm key={s.version} item={s} groups={catalog.groups} save={run}/>:<PricingForm key={s.version} service={s} save={run}/>}</details>)}
  {catalog.canEditStructure&&<details><summary>{t("Lisa teenus")}</summary>{catalog.groups.length?<ServiceForm groups={catalog.groups} save={run}/>:<p>{t("Lisa esmalt teenusegrupp.")}</p>}</details>}
  {catalog.canEditStructure&&<><h4>{t("Töötajad")}</h4><p>{t("Profiil ei vaja sisselogimiskontot. Siia lisa ainult avalik tutvustus. Graafikuid saad hallata töögraafikute jaotises.")}</p>{catalog.staff.map(st=><details key={st.id}><summary>{st.name}{!st.active?t(" · arhiveeritud"):!st.online?t(" · veebis peidetud"):''}</summary><StaffForm key={st.version} item={st} save={run}/></details>)}<details><summary>{t("Lisa töötaja")}</summary><StaffForm save={run}/></details></>}
  <h4>{t("Töötaja teenused")}</h4><p>{t("Tühi erandiväli pärib teenuse vaikeväärtuse, ka pärast vaikeväärtuse muutmist. Täidetud väli jääb eraldi määratud väärtuseks.")}</p>
  {catalog.assignments.map(a=>{const s=catalog.services.find(s=>s.id===a.serviceId)!,st=catalog.staff.find(st=>st.id===a.staffId)!;return <details key={a.serviceId+':'+a.staffId}><summary>{s.name} — {st.name}{!a.active?t(" · arhiveeritud"):''}</summary><ul>{([['price',t("Hind"),s.defaultPrice,'€'],['duration',t("Kestus"),s.defaultDuration,'min'],['bufferBefore',t("Ettevalmistus"),s.bufferBefore,'min'],['bufferAfter',t("Lõpetamine"),s.bufferAfter,'min']] as const).map(([key,label,base,unit])=><li key={key}>{label}: {key==='price'?((a[key]??base)/100).toFixed(2):(a[key]??base)} {unit} — {a[key]===null?t("päritud"):a[key]===base?t("eraldi määratud, sama kui vaikeväärtus"):t("erisus teenuse vaikeväärtusest")}</li>)}</ul>{catalog.canEditStructure?<AssignmentForm key={a.version} catalog={catalog} item={a} save={run}/>:<PricingForm key={a.version} service={s} item={a} save={run}/>}</details>;})}
  {catalog.canEditStructure&&<details><summary>{t("Seo töötaja teenusega")}</summary><AssignmentForm catalog={catalog} save={run}/></details>}
  </fieldset></section>;
}
