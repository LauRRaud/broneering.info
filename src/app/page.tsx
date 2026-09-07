import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BookingFlow from '@/components/booking-flow';
import AdminApp from '@/components/admin-app';
import { hostnameFromHost,tenantForHost } from '@/lib/tenants';
import { catalogFor } from '@/lib/availability';
import { AppError } from '@/lib/errors';
import type { Metadata } from 'next';
import { searchPageForHost } from '@/lib/search';

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
  const host=(await headers()).get('host')??'';
  const hostname=hostnameFromHost(host);
  const local=['localhost','127.0.0.1'].includes(hostname)||hostname.endsWith('.localhost');
  const port=host.match(/:(\d+)$/)?.[0]??'';
  if(['localhost','127.0.0.1','broneering.info','www.broneering.info'].includes(hostname)) return (
    <main>
      <h1>broneering.info</h1>
      <p>Lihtne viis aja broneerimiseks.</p>
      <h2>Proovi broneerimist</h2>
      <ul>
        <li><a href={local?`http://ilutegu.localhost${port}`:'https://demo.broneering.info'}>Ilutegu demo</a></li>
        <li><a href={local?`http://teine.localhost${port}`:'https://demo2.broneering.info'}>Teine demo</a></li>
      </ul>
      <p><a href={local?`http://haldus.localhost${port}`:'https://haldus.broneering.info'}>Ettevõtte haldus</a></p>
    </main>
  );
  if(['haldus.broneering.info','haldus.localhost'].includes(hostname)) {
    const query = await searchParams;
    const invitationToken = typeof query.invitation === 'string' && query.invitation.length <= 256 ? query.invitation : undefined;
    const resetToken = typeof query.token === 'string' && query.token.length <= 512 ? query.token : undefined;
    const authError = typeof query.error === 'string' ? 'Link on vigane või aegunud. Proovi toimingut uuesti.' : undefined;
    return <AdminApp invitationToken={invitationToken} resetToken={resetToken} authError={authError} initialLogin={query.login === '1'} />;
  }
  try { return <BookingFlow catalog={await catalogFor(await tenantForHost(host))} />; }
  catch(error) { if(error instanceof AppError && error.status===404) notFound(); throw error; }
}
