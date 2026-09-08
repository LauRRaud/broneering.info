import {resolveLocale} from './locales';
/** Explicit language works even when an embedded page cannot use third-party cookies. */
export function localizedFetch(input:RequestInfo|URL,init?:RequestInit){
  const headers=new Headers(init?.headers);
  if(typeof document!=='undefined')headers.set('x-booking-language',resolveLocale(document.documentElement.lang));
  return globalThis.fetch(input,{...init,headers});
}
