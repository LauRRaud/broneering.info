import type {Translate} from '@/lib/i18n';
import TextLink from '@/components/ui/text-link/text-link';
import Wordmark from '@/components/ui/wordmark/wordmark';
import ActionLink from '@/components/ui/action-link/action-link';
import styles from './home-footer.module.css';
export default function HomeFooter({t,adminUrl}:{t:Translate;adminUrl:string}){
  return <footer className={styles.root}><div className={styles.inner}>
    <div className={styles.intro}><Wordmark href="#top" label={t('Ajasta avaleht')}/><p>{t('Aega selleks, mis loeb.')}</p></div>
    <p className={styles.statement}>{t('Lihtsam viis hoida oma broneeringud ja tööpäev ühes kohas.')}</p>
    <div className={styles.actions}><ActionLink href={adminUrl}>{t('Loo konto')}</ActionLink><ActionLink variant="secondary" href={adminUrl}>{t('Logi sisse')}</ActionLink></div>
    <div className={styles.bottom}><span>{t('Broneerimissüsteem teenusepakkujatele.')}</span><nav className={styles.links} aria-label={t('Abi ja ligipääs')}><TextLink href="#voimalused" className={styles.link}>{t('Võimalused')}</TextLink><TextLink href="#demo" className={styles.link}>{t('Demo')}</TextLink><TextLink href="/juhend" className={styles.link}>{t('Kasutusjuhend')}</TextLink><TextLink href="#top" className={styles.link}>{t('Tagasi üles')}</TextLink></nav></div>
  </div></footer>;
}
