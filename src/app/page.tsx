import {getServerI18n} from '@/lib/i18n-server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BookingFlow from '@/components/booking-flow';
import AdminApp from '@/components/admin-app';
import { hostnameFromHost,tenantForHost } from '@/lib/tenants';
import { catalogFor } from '@/lib/availability';
import { AppError } from '@/lib/errors';
import type { Metadata } from 'next';
import { searchPageForHost } from '@/lib/search';
import {bookingChallengeSiteKey} from '@/lib/booking-challenge';

export const dynamic='force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const page = await searchPageForHost((await headers()).get('host') ?? '');
  if (!page) return { robots: { index: false, follow: false } };
  return {
    title: page.title,
    description: page.description,
    robots: { index: true, follow: true },
    alternates: { canonical: page.url },
    openGraph: { title: page.title, description: page.description, url: page.url, siteName: 'broneering.info', locale: 'et_EE', type: 'website' },
  };
}
export default async function Page({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const {t,locale}=await getServerI18n();

  const host=(await headers()).get('host')??'';
  const hostname=hostnameFromHost(host);
  const local=['localhost','127.0.0.1'].includes(hostname)||hostname.endsWith('.localhost');
  const port=host.match(/:(\d+)$/)?.[0]??'';
  if(['localhost','127.0.0.1','broneering.info','www.broneering.info'].includes(hostname)) return (
    <main id="main-content" tabIndex={-1}>
      <h1>{t("broneering.info")}</h1>
      <p>{t("Paindlik broneerimissüsteem teenusepakkujatele.")}</p>
      <p>{t("Ilu ja heaolu, konsultatsioonid ning teised teenindusettevõtted: klient valib teenuse, teenindaja ja sobiva aja.")}</p>
      <p>{t("Rakendus on arenduses. Demodes saad proovida praegu toimivat broneerimisteekonda.")}</p>
      <h2>{t("Proovi broneerimist")}</h2>
      <ul>
        <li><a href={local?`http://ilutegu.localhost${port}`:'https://demo.broneering.info'}>{t("Ilutegu demo")}</a></li>
        <li><a href={local?`http://teine.localhost${port}`:'https://demo2.broneering.info'}>{t("Teine demo")}</a></li>
      </ul>
      <p><a href={local?`http://haldus.localhost${port}`:'https://haldus.broneering.info'}>{t("Ettevõtte haldus")}</a></p>
    </main>
  );
  if(['haldus.broneering.info','haldus.localhost'].includes(hostname)) {
    const query = await searchParams;
    const invitationToken = typeof query.invitation === 'string' && query.invitation.length <= 256 ? query.invitation : undefined;
    const resetToken = typeof query.token === 'string' && query.token.length <= 512 ? query.token : undefined;
    const authError = typeof query.error === 'string' ? t("Link on vigane või aegunud. Proovi toimingut uuesti.") : undefined;
    return <AdminApp invitationToken={invitationToken} resetToken={resetToken} authError={authError} initialLogin={query.login === '1'} />;
  }
  try {
    const query=await searchParams;
    const tenant=await tenantForHost(host,'existing');
    if(tenant.public_state!=='published')return <main id="main-content" tabIndex={-1}><h1>{tenant.name}</h1><p>{t('Ettevõte ei võta praegu broneeringuid vastu.')}</p><p>{t('Olemasoleva broneeringu kohta võta ettevõttega ühendust või kasuta oma halduslinki.')}</p>{tenant.contact_email&&<p><a href={'mailto:'+tenant.contact_email}>{tenant.contact_email}</a></p>}{tenant.contact_phone&&<p><a href={'tel:'+tenant.contact_phone.replace(/[^+\d]/g,'')}>{tenant.contact_phone}</a></p>}</main>;
    return <BookingFlow catalog={await catalogFor(tenant,query.staff===undefined?undefined:typeof query.staff==='string'?query.staff:'')} challengeSiteKey={bookingChallengeSiteKey()} />;
  }
  catch(error) {
    if(error instanceof AppError && error.code==='STAFF_UNAVAILABLE')return <main id="main-content" tabIndex={-1}><h1>{t("Töötaja link ei ole kasutatav")}</h1><p>{t("Töötaja ei võta selle lingi kaudu praegu broneeringuid vastu.")}</p><a href="/">{t("Vaata ettevõtte teenuseid ja töötajaid")}</a></main>;
    if(error instanceof AppError && error.status===404) notFound(); throw error;
  }
}
