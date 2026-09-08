'use client';
import {useI18n} from '@/components/i18n-provider';

export default function ErrorPage({ reset }: { reset: () => void }) {
  const {t,locale}=useI18n();

  return <main id="main-content" tabIndex={-1}><h1>{t("Lehte ei saanud laadida")}</h1><p>{t("Ühendus teenusega katkes. Palun proovi uuesti.")}</p><button onClick={reset}>{t("Proovi uuesti")}</button></main>;
}
