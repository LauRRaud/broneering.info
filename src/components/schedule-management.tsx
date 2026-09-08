"use client";
import {localeTags} from '@/lib/locales';
import {useI18n} from '@/components/i18n-provider';

import {useEffect,useState,type FormEvent} from 'react';
import type {BookingRules,ScheduleScope,ScheduleState,TimeInterval} from '@/lib/schedule-contracts';
type Save=(action:string,payload:Record<string,unknown>)=>Promise<boolean>;
const weekdays=['Esmaspäev','Teisipäev','Kolmapäev','Neljapäev','Reede','Laupäev','Pühapäev'];
const kindLabels={vacation:'Puhkus',illness:'Haigus',extra_work:'Lisatööpäev',other:'Muu erand'};
const clock=(minute:number)=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
function minute(value:string){if(!/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value))return NaN;const [h,m]=value.split(':').map(Number);return h*60+m;}
type TimeText=[string,string];
function TimeRows({items,change}:{items:TimeText[];change:(items:TimeText[])=>void}){
  const {t,locale}=useI18n();

  return <>{items.length===0&&<p>{t("Suletud / töövaba päev")}</p>}{items.map(([a,b],i)=><p key={i}><label>{t("Algus ")}<input aria-label={t("Algus ")+(i+1)} value={a} onChange={e=>change(items.map((v,j)=>j===i?[e.target.value,v[1]]:v))} size={5} placeholder="09:00" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" required/></label> <label>{t("Lõpp ")}<input aria-label={t("Lõpp ")+(i+1)} value={b} onChange={e=>change(items.map((v,j)=>j===i?[v[0],e.target.value]:v))} size={5} placeholder="17:00" pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00" required/></label> <button type="button" onClick={()=>change(items.filter((_,j)=>j!==i))}>{t("Eemalda vahemik ")}{i+1}</button></p>)}<button type="button" disabled={items.length>=8} onClick={()=>change([...items,['09:00','17:00']])}>{t("Lisa töövahemik")}</button></>;
}
function WeeklyEditor({scope,save}:{scope:ScheduleScope;save:Save}){
  const {t,locale}=useI18n();

  const initial=()=>scope.days.map(d=>({weekday:d.weekday,intervals:d.intervals.map(([a,b])=>[clock(a),clock(b)] as TimeText)}));
  const [days,setDays]=useState(initial),[version,setVersion]=useState(scope.version),[dirty,setDirty]=useState(false);
  useEffect(()=>{if(!dirty){setDays(initial());setVersion(scope.version);}},[scope.version,dirty]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(await save('save-weekly',{staffId:scope.staffId,version,days:days.map(d=>({...d,intervals:d.intervals.map(([a,b])=>[minute(a),minute(b)])}))}))setDirty(false);}
  return <form onSubmit={submit}><fieldset disabled={!scope.canEdit}><legend>{t("Nädalagraafik")}</legend>{days.map(day=><fieldset key={day.weekday}><legend>{t(weekdays[day.weekday-1])}</legend><TimeRows items={day.intervals} change={intervals=>{setDirty(true);setDays(days.map(d=>d.weekday===day.weekday?{...d,intervals}:d));}}/></fieldset>)}{scope.canEdit&&<><button>{t("Salvesta nädalagraafik")}</button> <button type="button" onClick={()=>{setDirty(false);setDays(initial());setVersion(scope.version);}}>{t("Loobu salvestamata muudatustest")}</button></>}</fieldset></form>;
}
function ExceptionEditor({scope,today,save}:{scope:ScheduleScope;today:string;save:Save}){
  const {t,locale}=useI18n();

  const [closed,setClosed]=useState(true),[kind,setKind]=useState<keyof typeof kindLabels>('other'),[items,setItems]=useState<TimeText[]>([['09:00','17:00']]);
  const [version,setVersion]=useState(scope.version),[dirty,setDirty]=useState(false);
  useEffect(()=>{if(!dirty)setVersion(scope.version);},[scope.version,dirty]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,d=new FormData(form);if(await save('save-exception',{staffId:scope.staffId,version,startDay:String(d.get('startDay')),endDay:String(d.get('endDay')),closed,kind,acknowledgeConflicts:closed&&d.get('acknowledgeConflicts')==='on',intervals:closed?[]:items.map(([a,b])=>[minute(a),minute(b)])})){form.reset();setClosed(true);setKind('other');setItems([['09:00','17:00']]);setDirty(false);}}
  return <form onSubmit={submit} onChange={()=>setDirty(true)}><fieldset disabled={!scope.canEdit}><legend>{t("Lisa või asenda kuupäeva erand")}</legend><p>{t("Erand asendab valitud päevade nädalagraafiku. Üks periood võib olla kuni 366 päeva. Asukoha ja töötaja erandeid arvestatakse koos.")}</p><p><label>{t("Alguskuupäev ")}<input name="startDay" type="date" defaultValue={today} required/></label> <label>{t("Lõppkuupäev ")}<input name="endDay" type="date" defaultValue={today} required/></label></p><p><label>{t("Erandi liik ")}<select value={kind} onChange={e=>{const value=e.target.value as keyof typeof kindLabels;setKind(value);if(value==='vacation'||value==='illness')setClosed(true);if(value==='extra_work')setClosed(false);}}>{Object.entries(kindLabels).map(([key,label])=><option key={key} value={key}>{t(label)}</option>)}</select></label></p><label><input type="checkbox" checked={closed} disabled={kind==='vacation'||kind==='illness'} onChange={e=>setClosed(e.target.checked)}/> {t("Suletud / töövaba")}</label>{closed&&<p><label><input type="checkbox" name="acknowledgeConflicts"/> {t("Sulge ajad ja lisa mõjutatud broneeringud lahendamist ootavate loendisse")}</label><br/>{t("Ilma selle kinnituseta peatatakse konfliktne muudatus ning kuvatakse mõjutatud broneeringud. Kinnitamisel jäävad nende ajad alles ja kliendiga tuleb eraldi ühendust võtta.")}</p>}{!closed&&<TimeRows items={items} change={next=>{setItems(next);setDirty(true);}}/>}{scope.canEdit&&<p><button>{t("Salvesta erand")}</button> <button type="reset" onClick={()=>{setClosed(true);setKind('other');setItems([['09:00','17:00']]);setDirty(false);setVersion(scope.version);}}>{t("Loobu salvestamata erandist")}</button></p>}</fieldset></form>;
}
function RulesEditor({rules,canEdit,save}:{rules:BookingRules;canEdit:boolean;save:Save}){
  const {t,locale}=useI18n();

  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await save('save-booking-rules',{version:rules.version,leadMinutes:Number(d.get('leadMinutes')),windowDays:Number(d.get('windowDays')),stepMinutes:Number(d.get('stepMinutes')),cancellationHours:Number(d.get('cancellationHours')),timezone:String(d.get('timezone')).trim()});}
  return <form onSubmit={submit}><fieldset disabled={!canEdit}><legend>{t("Ettevõtte broneerimisreeglid")}</legend><p>{t("Allpool on ettevõtte praegused väärtused. Etteteatamine piirab kõige varasemat algust, mitte kliendi saabumisaega. Samm määrab algusaegu, mitte teenuse kestust.")}</p><p><label>{t("Minimaalne etteteatamine (min) ")}<input name="leadMinutes" type="number" min={0} max={525600} defaultValue={rules.leadMinutes} required/></label></p><p><label>{t("Ettebroneerimine (päeva) ")}<input name="windowDays" type="number" min={1} max={365} defaultValue={rules.windowDays} required/></label></p><p><label>{t("Algusaegade samm (min) ")}<input name="stepMinutes" type="number" min={5} max={60} defaultValue={rules.stepMinutes} required/></label></p><p><label>{t("Muutmise ja tühistamise tähtaeg (tundi) ")}<input name="cancellationHours" type="number" min={0} max={8760} defaultValue={rules.cancellationHours} required/></label></p><p><label>{t("Asukoha IANA ajavöönd ")}<input name="timezone" defaultValue={rules.timezone} maxLength={100} required list="booking-timezones"/></label><datalist id="booking-timezones"><option value="Europe/Tallinn"/><option value="Europe/Helsinki"/><option value="UTC"/></datalist></p><p>{t("Ajavööndi muutmine tõlgendab kohalikke graafikuaegu uues vööndis; kinnitatud broneeringute hetki see ei liiguta. Kinnitatud broneeringule jääb loomisel salvestatud etteteatamistähtaeg.")}</p>{canEdit&&<button>{t("Salvesta broneerimisreeglid")}</button>}</fieldset></form>;
}
export default function ScheduleManagement({tenantId,state,busy,save}:{tenantId:string;state:ScheduleState;busy:boolean;save:Save}){
  const {t,locale}=useI18n();

  const run:Save=(action,payload)=>save(action,{...payload,tenantId});
  return <section aria-labelledby="schedule-title"><h3 id="schedule-title">{t("Töögraafikud ja saadavus")}</h3><p>{t("Broneeritav aeg peab mahtuma nii asukoha lahtiolekuajasse kui ka töötaja graafikusse koos teenuse puhvritega. Pausi jaoks kasuta eraldi töövahemikke. Üle südaöö kestev töö jaga kahe päeva vahel; päeva lõpp võib olla 24:00.")}</p><fieldset disabled={busy}><legend>{t("Graafikute haldus")}</legend><details><summary>{t("Broneerimisreeglid")}</summary><RulesEditor key={state.rules.version} rules={state.rules} canEdit={state.canEditRules} save={run}/></details>{state.scopes.length===0&&<p>{t("Sinu kontoga ei ole seotud aktiivset töötajaprofiili.")}</p>}{state.scopes.map(scope=><details key={scope.staffId??'location'}><summary>{scope.name}{!scope.canEdit?t(" · ainult vaatamine"):''}</summary><WeeklyEditor scope={scope} save={run}/><ExceptionEditor scope={scope} today={state.today} save={run}/><h4>{t("Kuupäevapõhised erandid")}</h4>{scope.exceptions.length===0?<p>{t("Erandeid ei ole.")}</p>:<ul>{scope.exceptions.map(e=><li key={e.day}>{e.day} · {t(kindLabels[e.kind])} · {e.closed?'suletud':e.intervals.map(([a,b])=>clock(a)+'–'+clock(b)).join(', ')} {scope.canEdit&&<button type="button" onClick={()=>{void run('reset-exception',{staffId:scope.staffId,version:scope.version,startDay:e.day,endDay:e.day});}}>{t("Taasta ")}{e.day} {t("nädalagraafik")}</button>}</li>)}</ul>}</details>)}</fieldset></section>;
}
