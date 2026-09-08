import {expect,it} from 'vitest';
import {dictionaries,translator} from '../src/lib/i18n';
import {localeFromHeaders,resolveLocale} from '../src/lib/locales';
import {contactErrors} from '../src/lib/contact-validation';
it('has complete catalogs with matching interpolation parameters',()=>{
  const keys=Object.keys(dictionaries.et).sort();
  for(const language of ['en','ru'] as const){
    expect(Object.keys(dictionaries[language]).sort()).toEqual(keys);
    for(const key of keys){expect(dictionaries[language][key].trim(),`${language}: ${key}`).not.toBe('');expect(dictionaries[language][key].match(/\{\w+\}/g)?.sort()??[],key).toEqual(key.match(/\{\w+\}/g)?.sort()??[]);}
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
