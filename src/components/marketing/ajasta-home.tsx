import type { Translate } from '@/lib/i18n';
import {ThemeSurface} from '@/components/ui/theme/theme-surface';
import {marketingTheme} from './marketing-theme';
import HomeHeader from './home-header';
import HomeHero from './home-hero';
import HomeFeatures from './home-features';
import HomeStart from './home-start';
import HomeFooter from './home-footer';
import styles from './ajasta-home.module.css';

export default function AjastaHome({ t, local, port }: { t: Translate; local: boolean; port: string }) {
  const demoUrl=local?`http://ilutegu.localhost${port}/`:'https://demo.broneering.info/';
  const adminUrl=local?`http://haldus.localhost${port}/?login=1`:'https://haldus.broneering.info/?login=1';
  return <ThemeSurface theme={marketingTheme} className={styles.root}>
    <div data-marketing-home id="top">
      <HomeHeader t={t} adminUrl={adminUrl}/>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <HomeHero t={t} demoUrl={demoUrl}/>
        <p className={styles.ribbon}>{t('Sinu ettevõtte nägu. Sinu töökorraldus.')}</p>
        <HomeFeatures t={t}/>
        <HomeStart t={t} demoUrl={demoUrl} adminUrl={adminUrl}/>
      </main>
      <HomeFooter t={t} adminUrl={adminUrl}/>
    </div>
  </ThemeSurface>;
}
