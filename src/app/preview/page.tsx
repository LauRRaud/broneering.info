import {themeState,themePreviewTenant} from '@/lib/themes';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {getIdentity} from '@/lib/auth';
import {authHost} from '@/lib/auth-host';
import {previewTenant} from '@/lib/preview';
import {catalogFor} from '@/lib/availability';
import BookingFlow from '@/components/booking-flow';
import {AppError} from '@/lib/errors';
import {getServerI18n} from '@/lib/i18n-server';
export const dynamic='force-dynamic';
export default async function PreviewPage({searchParams}:{searchParams:Promise<{tenantId?:string;theme?:string}>}){
  const h=await headers();if(h.get('host')?.toLowerCase()!==authHost)notFound();
  const {t}=await getServerI18n();
  const actor=await getIdentity(h);if(!actor)return <main id="main-content"><a href="/">{t('Logi halduses sisse')}</a></main>;
  try{const params=await searchParams,tenant=await (params.theme==='draft'?themePreviewTenant:previewTenant)(actor,params.tenantId??''),catalog=await catalogFor(tenant,undefined,actor,params.theme==='draft');if(params.theme==='draft'){const theme=await themeState(actor,tenant.id);catalog.theme=theme.draft??theme.published??catalog.theme;}return <><p><a href="/">{t('Tagasi haldusse')}</a></p><BookingFlow catalog={catalog} previewTenantId={tenant.id} designPreview={params.theme==='draft'}/></>;}
  catch(e){if(e instanceof AppError)return <main id="main-content"><p>{t(e.message)}</p><a href="/">{t('Tagasi haldusse')}</a></main>;throw e;}
}
