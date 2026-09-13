import type {Translate} from '@/lib/i18n';
import ActionLink from '@/components/ui/action-link/action-link';
import Icon from '@/components/ui/icon/icon';
import styles from './home-start.module.css';
const steps=[['Ettevõte ja teenused','Lisa ettevõtte andmed ning teenuste hinnad ja kestused.'],['Meeskond ja tööajad','Määra, kes teenuseid pakub ja millal saab aega broneerida.'],['Sinu broneerimislink','Jaga linki klientidega või lisa broneerimine oma kodulehele.']];
export default function HomeStart({t,demoUrl,adminUrl}:{t:Translate;demoUrl:string;adminUrl:string}){
  return <div className={styles.band}><div className={styles.root}>
    <section id="demo" className={styles.demo} aria-labelledby="demo-title">
      <h2 id="demo-title" className={styles.title}>{t('Proovi kliendi vaadet.')}</h2><p className={styles.lead}>{t('Vali teenus, spetsialist ja sobiv aeg.')}</p>
      <ActionLink href={demoUrl}>{t('Ava Ilutegu demo')}</ActionLink>
      <p className={styles.note}>{t('Näidisandmetega demo. Päris salongi broneeringut ei teki.')}</p>
      <ActionLink variant="secondary" href="/juhend">{t('Tutvu kasutusjuhendiga')}</ActionLink>
    </section>
    <section id="alustamine" className={styles.start} aria-labelledby="start-title">
      <h2 id="start-title" className={styles.title}>{t('Alustame sinu ettevõttest.')}</h2>
      <ol className={styles.steps}>{steps.map(([title,description],index)=><li className={styles.step} key={title}><span className={styles.number} aria-hidden="true">0{index+1}</span><div><h3 className={styles.stepTitle}>{t(title)}</h3><p className={styles.stepDescription}>{t(description)}</p></div></li>)}</ol>
      <div className={styles.status}><Icon name="clock" size={24}/><div><p className={styles.statusTitle}>{t('Ajasta on arenduses.')}</p><p className={styles.statusText}>{t('Liitumine on hetkel suletud. Paketid ja hinnad avaldame enne konto loomise avamist.')}</p><div className={styles.statusActions}><ActionLink href={adminUrl}>{t('Loo konto')}</ActionLink><ActionLink variant="secondary" href={adminUrl}>{t('Logi sisse')}</ActionLink></div></div></div>
    </section>
  </div></div>;
}
