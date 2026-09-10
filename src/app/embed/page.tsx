import {getServerI18n} from '@/lib/i18n-server';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import BookingFlow from '@/components/booking-flow';
import EmbedFrame from '@/components/embed-frame';
import {tenantForHost} from '@/lib/tenants';
import {catalogFor} from '@/lib/availability';
import {embedOrigins} from '@/lib/embed';
import {canonicalEmbedOrigin} from '@/lib/embed-contracts';
import {AppError} from '@/lib/errors';
import {bookingChallengeSiteKey} from '@/lib/booking-challenge';
export const dynamic='force-dynamic';
export const metadata={title:'Broneeri aeg',robots:{index:false,follow:false}};
export default async function EmbedPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {t,locale}=await getServerI18n();

  try {
    const tenant=await tenantForHost((await headers()).get('host')||'');
    const query=await searchParams;
    let parent='';
    try {parent=canonicalEmbedOrigin(typeof query.parent==='string'?query.parent:'',process.env.NODE_ENV!=='production');}catch{}
    if(!parent || !(await embedOrigins(tenant.id)).includes(parent))return <main id="main-content" tabIndex={-1}><h1>{t("Ava broneerimisleht")}</h1><p>{t("Manustamine pole sellele kodulehele seadistatud.")}</p><a href="/" target="_blank" rel={"noopener noreferrer"}>{t("Ava broneerimisleht")}</a></main>;
    try {
      return <EmbedFrame parentOrigin={parent}><BookingFlow catalog={await catalogFor(tenant,query.staff===undefined?undefined:typeof query.staff==='string'?query.staff:'')} challengeSiteKey={bookingChallengeSiteKey()}/></EmbedFrame>;
    }catch(error){
      if(error instanceof AppError && error.code==='STAFF_UNAVAILABLE')return <EmbedFrame parentOrigin={parent}><main id="main-content" tabIndex={-1}><h1>{t("Töötaja link ei ole kasutatav")}</h1><a href={`/embed?parent=${encodeURIComponent(parent)}`}>{t("Vaata ettevõtte teenuseid ja töötajaid")}</a></main></EmbedFrame>;
      throw error;
    }
  }catch(error){if(error instanceof AppError && error.status===404)notFound();throw error;}
}
