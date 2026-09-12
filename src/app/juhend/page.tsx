import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {notFound, redirect} from 'next/navigation';
import {hostnameFromHost} from '@/lib/tenants';
import UserGuide from '@/components/help/user-guide';

export const metadata: Metadata = {
  title: 'Ajasta kasutusjuhend',
  description: 'Ajasta ühine juhend: esimesed sammud, teenused, töögraafikud, broneeringud ja kodulehele lisamine.',
  alternates: {canonical: 'https://ajasta.ee/juhend'},
  robots: {index: true, follow: true},
};

export default async function GuidePage() {
  const rawHost=(await headers()).get('host')??'';
  const host=hostnameFromHost(rawHost);
  if(host==='haldus.localhost') redirect(`http://localhost${rawHost.match(/:(\d+)$/)?.[0]??''}/juhend`);
  if(['haldus.broneering.info','broneering.info','www.broneering.info','www.ajasta.ee'].includes(host)) redirect('https://ajasta.ee/juhend');
  if(!['ajasta.ee','localhost','127.0.0.1'].includes(host)) notFound();
  const local=['localhost','127.0.0.1'].includes(host);
  return <UserGuide adminUrl={local ? `http://haldus.localhost${rawHost.match(/:(\d+)$/)?.[0]??''}` : 'https://haldus.broneering.info'}/>;
}
