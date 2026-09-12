import {expect,it} from 'vitest';
import {readdirSync,readFileSync} from 'node:fs';
import {dictionaries,translator} from '../src/lib/i18n';
import {localeFromHeaders,resolveLocale} from '../src/lib/locales';
import {contactErrors} from '../src/lib/contact-validation';
import {iluteguDemoServices} from '../scripts/data/ilutegu-demo';
import {iluteguDemoTranslations} from '../scripts/data/ilutegu-demo-translations';
it('has complete catalogs with matching interpolation parameters',()=>{
  const keys=Object.keys(dictionaries.et).sort();
  for(const language of ['en','ru'] as const){
    expect(Object.keys(dictionaries[language]).sort()).toEqual(keys);
    for(const key of keys){expect(dictionaries[language][key].trim(),`${language}: ${key}`).not.toBe('');expect(dictionaries[language][key].match(/\{\w+\}/g)?.sort()??[],key).toEqual(key.match(/\{\w+\}/g)?.sort()??[]);}
  }
});
it('defines every literal used by the public booking flow in every language',()=>{
  const bookingFiles=['src/components/booking-flow.tsx',...readdirSync('src/components/booking').filter(file=>file.endsWith('.tsx')).map(file=>'src/components/booking/'+file)];
  const keys=new Set<string>();
  for(const file of bookingFiles)for(const match of readFileSync(file,'utf8').matchAll(/\bt\(\s*(['"])(.*?)\1/g))keys.add(match[2]);
  for(const language of ['et','en','ru'] as const)for(const key of keys)expect(Object.hasOwn(dictionaries[language],key),`${language}: ${key}`).toBe(true);
});
it('translates calendar legend labels',()=>{
  expect(translator('en')('Täna')).toBe('Today');
  expect(translator('ru')('Täna')).toBe('Сегодня');
});
it('translates dynamic booking labels and every Ilutegu demo service',()=>{
  const keys=['Teenuse saaja nimi','Kontaktisiku e-post','Telefoninumber','Muuda teenust','Muuda töötajat','Muuda aega','Juuksur','Massaaž','Ripsmed','Küünehooldus'];
  for(const language of ['en','ru'] as const)for(const key of keys)expect(translator(language)(key),`${language}: ${key}`).not.toBe(key);
  expect(Object.keys(iluteguDemoTranslations).sort()).toEqual(iluteguDemoServices.map(service=>service.name).sort());
  for(const service of iluteguDemoServices)for(const language of ['en','ru'] as const){
    expect(iluteguDemoTranslations[service.name][language].name.trim()).not.toBe('');
    expect(iluteguDemoTranslations[service.name][language].description.trim()).not.toBe('');
  }
});
it('separates admin and customer preferences and honours explicit selections',()=>{
  const h=new Headers({host:'haldus.localhost:3107',cookie:'booking_language=ru; booking_admin_language=en'});
  expect(localeFromHeaders(h)).toBe('en');h.set('host','salon.localhost:3107');expect(localeFromHeaders(h)).toBe('ru');
  h.set('x-booking-language','et');expect(localeFromHeaders(h)).toBe('et');
  expect(localeFromHeaders(new Headers(), 'ru')).toBe('ru');expect(resolveLocale('en-GB')).toBe('en');expect(resolveLocale('de','ru')).toBe('ru');
});
it('translates messages without translating company content and retains spacing',()=>{
  expect(translator('en')(' Keel ')).toBe(' Language ');
  expect(translator('ru')('Language')).toBe('Язык');
  expect(translator('ru')('Ilutegu OÜ')).toBe('Ilutegu OÜ');
});
it('returns field-specific errors and accepts valid multilingual contact names',()=>{
  expect(Object.keys(contactErrors({name:' ',email:'bad',phone:'abc'}))).toEqual(['name','email','phone']);
  expect(contactErrors({name:'Мария Тамм',email:'maria@example.com',phone:'+372 (555) 12-34'})).toEqual({});
  expect(contactErrors({name:'Mari',email:'mari@example.com',phone:''})).toEqual({});
});
