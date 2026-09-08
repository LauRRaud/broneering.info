import {headers} from 'next/headers';
import {localeFromHeaders,type Locale} from './locales';
import {translator} from './i18n';
import {tenantForHost} from './tenants';
export async function getServerI18n(fallback?:Locale){
  const h=await headers();
  if(!fallback){try{fallback=(await tenantForHost(h.get('host')??'')).default_language;}catch{fallback='et';}}
  const locale=localeFromHeaders(h,fallback);return {locale,t:translator(locale)};
}
