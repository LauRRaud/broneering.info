import {getServerI18n} from '@/lib/i18n-server';
export default async function NotFound(){
  const {t,locale}=await getServerI18n();
return <main id="main-content" tabIndex={-1}><p>{t("broneering.info")}</p><h1>{t("Broneerimislehte ei leitud")}</h1><p>{t("Kontrolli ettevõtte veebiaadressi. Tundmatul aadressil ei avata ühegi teise ettevõtte andmeid.")}</p></main>;}
