import type { Metadata } from "next";
import {headers} from 'next/headers';
import {I18nProvider,LanguageSwitcher,SkipLink} from '@/components/i18n-provider';
import {localeFromHeaders,languageCookie,type Locale} from '@/lib/locales';
import {tenantForHost} from '@/lib/tenants';
import './accessibility.css';

export const metadata: Metadata = {
  title: "broneering.info",
  description: "Lihtne ja rahulik viis oma aeg broneerida.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders=await headers(),host=requestHeaders.get('host')??'',isAdmin=host.startsWith('haldus.');
  let fallback:Locale='et';
  if(!isAdmin){try{fallback=(await tenantForHost(host)).default_language;}catch{/* The page itself handles unknown hosts. */}}
  const locale=localeFromHeaders(requestHeaders,fallback),explicit=requestHeaders.get('cookie')?.split(';').some(v=>v.trim().startsWith(languageCookie(isAdmin)+'='))??false;
  return (
    <html lang={locale}>
      <body><I18nProvider initialLocale={locale} explicit={explicit} isAdmin={isAdmin}><SkipLink/><LanguageSwitcher/>{children}</I18nProvider></body>
    </html>
  );
}
