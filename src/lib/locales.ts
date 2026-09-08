export const locales=['et','en','ru'] as const;
export type Locale=typeof locales[number];
export const localeNames:Record<Locale,string>={et:'Eesti',en:'English',ru:'Русский'};
export const localeTags:Record<Locale,string>={et:'et-EE',en:'en-GB',ru:'ru-RU'};
export function resolveLocale(value:unknown,fallback:Locale='et'):Locale{
  if(typeof value!=='string')return fallback;
  const code=value.trim().toLowerCase().split('-')[0];
  return (locales as readonly string[]).includes(code)?code as Locale:fallback;
}
export function languageCookie(isAdmin:boolean){return isAdmin?'booking_admin_language':'booking_language';}
export function localeFromHeaders(headers:Headers,fallback:Locale='et'):Locale{
  const host=headers.get('host')?.split(':')[0]??'';
  const name=languageCookie(host.startsWith('haldus.'));
  const saved=headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);
  // An explicit UI language takes precedence over the browser's preferences.
  const selected=headers.get('x-booking-language')??saved;
  return selected?resolveLocale(selected,fallback):fallback;
}
