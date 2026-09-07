import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BookingFlow from '@/components/booking-flow';
import MarketingSite from '@/components/marketing-site';
import { hostnameFromHost,tenantForHost } from '@/lib/tenants';
import { catalogFor } from '@/lib/availability';
import { AppError } from '@/lib/errors';

export const dynamic='force-dynamic';
export default async function Page() {
  const host=(await headers()).get('host')??'';
  const hostname=hostnameFromHost(host);
  const local=['localhost','127.0.0.1'].includes(hostname)||hostname.endsWith('.localhost');
  const port=host.match(/:(\d+)$/)?.[0]??'';
  if(['localhost','127.0.0.1','broneering.info','www.broneering.info'].includes(hostname)) return <MarketingSite demoHref={local?`http://ilutegu.localhost${port}`:'https://demo.broneering.info'} secondDemoHref={local?`http://teine.localhost${port}`:'https://demo2.broneering.info'} />;
  if(['haldus.broneering.info','haldus.localhost'].includes(hostname)) return <main style={{maxWidth:680,margin:'12vh auto',padding:32}}><p className="eyebrow">broneering.info / haldus</p><h1>Ettevõtte töölaud on valmimas.</h1><p>Siia tulevad teenuste ja töötajate haldus, töögraafikud ning broneeringute kalender. Kontode loomine ja sisselogimine pole selles tehnilises katses veel avatud.</p><a href={local?`http://localhost${port}`:'https://broneering.info'}>Tagasi avalehele →</a></main>;
  try { return <BookingFlow catalog={await catalogFor(await tenantForHost(host))} />; }
  catch(error) { if(error instanceof AppError && error.status===404) notFound(); throw error; }
}
