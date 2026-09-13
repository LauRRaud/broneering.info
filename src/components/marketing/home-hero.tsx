import type {Translate} from '@/lib/i18n';
import ActionLink from '@/components/ui/action-link/action-link';
import HeroMedia from './hero-media';
import styles from './home-hero.module.css';
export default function HomeHero({t,demoUrl}:{t:Translate;demoUrl:string}){
  return <section className={styles.root} aria-labelledby="home-title">
    <div className={styles.copy}>
      <h1 id="home-title" className={styles.title}><span>{t('Sinu aeg.')}</span>{' '}<span>{t('Lihtsalt')}</span>{' '}<em>{t('broneeritud.')}</em></h1>
      <p className={styles.description}>{t('Kliendid broneerivad ise. Sina keskendud oma tööle.')}</p>
      <div className={styles.actions}><ActionLink href={demoUrl}>{t('Vaata demot')}</ActionLink><ActionLink variant="secondary" href="#alustamine">{t('Kuidas alustada')}</ActionLink></div>
    </div>
    <HeroMedia/>
  </section>;
}
