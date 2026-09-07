import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BookingFlow from '@/components/booking-flow';
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
export default async function Page() {
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
    </main>
  );
  if(['haldus.broneering.info','haldus.localhost'].includes(hostname)) return <main><p>broneering.info / haldus</p><h1>Ettevõtte töölaud on valmimas.</h1><p>Siia tulevad teenuste ja töötajate haldus, töögraafikud ning broneeringute kalender. Kontode loomine ja sisselogimine pole selles tehnilises katses veel avatud.</p><a href={local?`http://localhost${port}`:'https://broneering.info'}>Tagasi avalehele</a></main>;
  try { return <BookingFlow catalog={await catalogFor(await tenantForHost(host))} />; }
  catch(error) { if(error instanceof AppError && error.status===404) notFound(); throw error; }
}
