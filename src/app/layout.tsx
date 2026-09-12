import localFont from 'next/font/local';
import type { Metadata } from "next";
import {headers} from 'next/headers';
import {I18nProvider,LanguageSwitcher,SkipLink} from '@/components/i18n-provider';
import {localeFromHeaders,languageCookie,type Locale} from '@/lib/locales';
import {tenantForHost} from '@/lib/tenants';
import './accessibility.css';
import {ThemeProvider} from '@/components/ui/theme/theme-provider';
import {ThemeSurface} from '@/components/ui/theme/theme-surface';
import AppearanceControls from '@/components/ui/theme/appearance-controls';
import type {ThemeMode} from '@/lib/theme-contracts';
import layoutStyles from './layout.module.css';

const editorial=localFont({src:'../styles/fonts/CormorantGaramond.woff2',variable:'--font-cormorant',weight:'300 700',display:'swap',preload:false});
const modern=localFont({src:'../styles/fonts/Manrope.woff2',variable:'--font-manrope',weight:'200 800',display:'swap',preload:false});

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
  const cookie=requestHeaders.get('cookie')??'', savedMode=cookie.match(/(?:^|;\s*)ajasta-appearance=(light|dark|system)(?:;|$)/)?.[1] as ThemeMode|undefined, highContrast=/(?:^|;\s*)ajasta-contrast=high(?:;|$)/.test(cookie);
  return (
    <html lang={locale} className={editorial.variable+' '+modern.variable}>
      <body><I18nProvider initialLocale={locale} explicit={explicit} isAdmin={isAdmin}><ThemeProvider initialMode={savedMode} initialContrast={highContrast}><ThemeSurface className={layoutStyles.document}><SkipLink/><div className={layoutStyles.utilities}><LanguageSwitcher/><AppearanceControls/></div>{children}</ThemeSurface></ThemeProvider></I18nProvider></body>
    </html>
  );
}
