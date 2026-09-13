import type {Translate} from '@/lib/i18n';
import styles from './home-features.module.css';
const features=[
  ['Broneerimine kliendile','Klient valib teenuse, spetsialisti ja sobiva aja. Lihtsalt, ka telefonis.'],
  ['Kalender sulle','Broneeringud ja tööajad ühes kohas. Vaata päeva, nädalat või nimekirja.'],
  ['Ühine töökorraldus','Teenused, meeskond ja ligipääsud. Sinu ettevõtte vajaduste järgi.'],
];
export default function HomeFeatures({t}:{t:Translate}){
  return <section id="voimalused" className={styles.root} aria-labelledby="features-title"><h2 id="features-title" className={styles.title}>{t('Vähem korraldamist. Rohkem aega.')}</h2>
    <div className={styles.list}>{features.map(([title,description],index)=><article className={styles.feature} key={title}><h3 className={styles.subtitle}><span className={styles.number} aria-hidden="true">0{index+1}</span><span>{t(title)}</span></h3><p className={styles.description}>{t(description)}</p></article>)}</div>
  </section>;
}
