import type {Translate} from '@/lib/i18n';

export default function GuideLink({t, newTab=false, href='/juhend'}: {t: Translate; newTab?: boolean; href?: string}) {
  return <p><a href={href} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined}>{t('Kasutusjuhend')}{newTab && ` (${t('avaneb uuel vahelehel')})`}</a></p>;
}
