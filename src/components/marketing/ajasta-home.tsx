import type { Translate } from '@/lib/i18n';
import GuideLink from '@/components/help/guide-link';

// Intentionally plain HTML. The owner will supply the visual design.
export default function AjastaHome({ t, local, port }: { t: Translate; local: boolean; port: string }) {
  return (
    <main id="main-content" tabIndex={-1}>
      <h1>Ajasta</h1>
      <p>{t('Paindlik broneerimissüsteem teenusepakkujatele.')}</p>
      <p>{t('Rakendus on arenduses. Demodes saad proovida praegu toimivat broneerimisteekonda.')}</p>
      <h2>{t('Proovi broneerimist')}</h2>
      <ul>
        <li><a href={local ? `http://ilutegu.localhost${port}` : 'https://demo.broneering.info'}>{t('Ilutegu demo')}</a></li>
        <li><a href={local ? `http://teine.localhost${port}` : 'https://demo2.broneering.info'}>{t('Teine demo')}</a></li>
      </ul>
      <p><a href={local ? `http://haldus.localhost${port}` : 'https://haldus.broneering.info'}>{t('Ettevõtte haldus')}</a></p>
      <GuideLink t={t} href={local ? '/juhend' : undefined}/>
    </main>
  );
}
