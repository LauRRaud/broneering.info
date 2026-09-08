import et from '@/locales/et.json';
import en from '@/locales/en.json';
import ru from '@/locales/ru.json';
import {localeTags,type Locale} from './locales';
export type MessageValues=Record<string,string|number|null|undefined>;
export type Translate=(source:string,values?:MessageValues)=>string;
export const dictionaries:Record<Locale,Record<string,string>>={et,en,ru};
const sourceKeys=new Map(Object.entries({...en}).map(([key,value])=>[value,key]));
for(const [key,value] of Object.entries(ru))sourceKeys.set(value,key);
// Source-language message IDs follow the gettext convention. Company content is never auto-translated.
export function translator(locale:Locale):Translate{return (source,values={})=>{
  const raw=source.trim(),key=Object.hasOwn(et,raw)?raw:sourceKeys.get(raw)??raw,leading=source.match(/^\s*/)?.[0]??'',trailing=source.match(/\s*$/)?.[0]??'';
  const value=dictionaries[locale][key]??dictionaries.et[key]??key;
  return leading+value.replace(/\{(\w+)\}/g,(match,name)=>Object.hasOwn(values,name)?String(values[name]??''):match)+trailing;
};}
export function formatMoney(amount:number,locale:Locale){return new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR'}).format(amount/100);}
