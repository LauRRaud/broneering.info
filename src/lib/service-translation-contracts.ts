import {z} from 'zod';
import {locales,type Locale} from './locales';
export const translatedText=z.object({name:z.string().trim().min(1).max(150),description:z.string().trim().max(1000)}).strict();
const target={language:z.enum(locales),version:z.number().int().nonnegative()};
const base={tenantId:z.uuid(),serviceId:z.uuid(),sourceVersion:z.number().int().positive()};
export const translationCommand=z.discriminatedUnion('action',[
  z.object({...base,...target,action:z.literal('save'),...translatedText.shape}).strict(),
  z.object({...base,...target,action:z.literal('publish')}).strict(),
  z.object({...base,action:z.literal('generate'),targets:z.array(z.object(target).strict()).min(1).max(2)}).strict(),
]);
export type TranslationRow={language:Locale;name:string;description:string;sourceVersion:number;version:number;status:'draft'|'published';origin:'manual'|'machine';updatedAt:string;publishedName:string|null;publishedDescription:string|null;publishedSourceVersion:number|null};
export type TranslationService={id:string;name:string;description:string;sourceLanguage:Locale;contentVersion:number;active:boolean;translations:TranslationRow[]};
export type TranslationState={services:TranslationService[];generationAvailable:boolean;history:Array<{action:string;at:string;actorName:string|null;metadata:Record<string,unknown>}>};
export function translationStatus(service:TranslationService,language:Locale){
  const row=service.translations.find(t=>t.language===language);
  return !row?'missing':row.sourceVersion!==service.contentVersion?'review':row.status;
}
export type PublicServiceTranslation={name:string;description:string};
export function localizedService<T extends {name:string;description:string;sourceLanguage?:Locale;translations?:Partial<Record<Locale,PublicServiceTranslation>>}>(service:T,locale:Locale){
  const translated=locale!==service.sourceLanguage?service.translations?.[locale]:undefined;
  return {...service,...translated,contentLanguage:translated?locale:service.sourceLanguage??'et',translationMissing:!!service.sourceLanguage&&locale!==service.sourceLanguage&&!translated};
}
