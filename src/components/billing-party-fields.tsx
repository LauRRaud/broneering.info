'use client';
import {useI18n} from './i18n-provider';
import type {BillingParty} from '@/lib/billing-config';
export function billingPartyFromForm(form:FormData):BillingParty{return {name:String(form.get('name')??''),registrationCode:String(form.get('registrationCode')??''),address:String(form.get('address')??''),country:String(form.get('country')??''),vatNumber:String(form.get('vatNumber')??''),email:String(form.get('email')??'')};}
export default function BillingPartyFields({value={}}:{value?:Partial<BillingParty>}){
 const {t}=useI18n();const fields=[['name','Juriidiline nimi',200],['registrationCode','Registrikood',50],['address','Arveldusaadress',500],['country','Riigikood (2 tähte)',2],['vatNumber','Käibemaksukohustuslase number',50],['email','Arvelduse e-post',254]] as const;
 return <>{fields.map(([key,label,max])=><p key={key}><label>{t(label)} <input name={key} required={key!=='vatNumber'} type={key==='email'?'email':'text'} defaultValue={value[key]??''} maxLength={max} minLength={key==='vatNumber'?undefined:2} pattern={key==='country'?'[A-Za-z]{2}':undefined}/></label></p>)}</>;
}
