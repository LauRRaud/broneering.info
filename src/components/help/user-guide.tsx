import {guideSections} from '@/content/user-guide';
import {ThemeSurface} from '@/components/ui/theme/theme-surface';
import {marketingTheme} from '@/components/marketing/marketing-theme';
import Wordmark from '@/components/ui/wordmark/wordmark';
import SitePreferences from '@/components/ui/site-preferences/site-preferences';
import ActionLink from '@/components/ui/action-link/action-link';
import styles from './user-guide.module.css';

export default function UserGuide({adminUrl}: {adminUrl: string}) {
  return <ThemeSurface theme={marketingTheme} className={styles.page}>
    <div data-user-guide lang="et">
      <header className={styles.header}><Wordmark href="/" label="Ajasta avaleht"/><div className={styles.tools}><SitePreferences/><ActionLink variant="secondary" href={adminUrl}>Ettevõtte haldus</ActionLink></div></header>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <div className={styles.intro}><p className={styles.eyebrow}>Abi ja juhised</p><h1>Kuidas Ajastat kasutada?</h1><p>Leia vastus broneerimise või oma ettevõtte haldamise kohta.</p><div className={styles.shortcuts}><ActionLink variant="secondary" href="#broneerimine">Soovin aega broneerida</ActionLink><ActionLink variant="secondary" href="#esimesed-sammud">Haldan ettevõtet</ActionLink></div></div>
        <div className={styles.layout}>
          <nav className={styles.contents} aria-labelledby="sisukord"><h2 id="sisukord" tabIndex={-1}>Sisukord</h2><ol>{guideSections.map((section,index)=><li key={section.id}><a href={`#${section.id}`}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>{section.title}</a></li>)}</ol></nav>
          <div>{guideSections.map((section,index)=><section className={styles.chapter} key={section.id} aria-labelledby={section.id}>
            <span className={styles.number} aria-hidden="true">{String(index+1).padStart(2,'0')}</span><h2 id={section.id} tabIndex={-1}>{section.title}</h2><p className={styles.lead}>{section.intro}</p>
            <ol className={styles.steps}>{section.steps.map(step=><li key={step}>{step}</li>)}</ol><p className={styles.note}>{section.result}</p>
            <a className={styles.back} href="#sisukord">Tagasi sisukorda</a>
          </section>)}</div>
        </div>
      </main>
      <footer className={styles.footer}><Wordmark href="/"/><span>Aega selleks, mis loeb.</span><ActionLink variant="secondary" href="/">Ajasta avaleht</ActionLink></footer>
    </div>
  </ThemeSurface>;
}
