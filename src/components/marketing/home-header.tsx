import type {Translate} from '@/lib/i18n';
import TextLink from '@/components/ui/text-link/text-link';
import SitePreferences from '@/components/ui/site-preferences/site-preferences';
import Wordmark from '@/components/ui/wordmark/wordmark';
import styles from './home-header.module.css';
export default function HomeHeader({t,adminUrl}:{t:Translate;adminUrl:string}){
  return <header className={styles.root}><div className={styles.inner}>
    <Wordmark href="#top" label={t('Ajasta avaleht')}/>
    <nav className={styles.nav} aria-label={t('Põhimenüü')}>
      <TextLink className={styles.link} href="#voimalused">{t('Võimalused')}</TextLink>
      <TextLink className={styles.link} href="#demo">{t('Demo')}</TextLink>
      <TextLink className={styles.link} href="#alustamine">{t('Alustamine')}</TextLink>
    </nav>
    <div className={styles.tools}><SitePreferences/><TextLink href={adminUrl} className={styles.login}>{t('Logi sisse')}</TextLink></div>
  </div></header>;
}
