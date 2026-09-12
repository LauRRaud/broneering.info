import {guideSections} from '@/content/user-guide';

// Plain semantic HTML; visual design is supplied by the owner.
export default function UserGuide({adminUrl}: {adminUrl: string}) {
  return <main id="main-content" tabIndex={-1} lang="et">
    <p><a href="/">Ajasta avaleht</a> · <a href={adminUrl}>Ettevõtte haldus</a></p>
    <h1>Ajasta kasutusjuhend</h1>
    <p>Üks juhend broneerijale ja ettevõtte haldajale. Vali sisukorrast vajalik teema.</p>
    <p>Eestikeelne esmane versioon · uuendatud 12.09.2026. Kujunduse valmimisel täiendame juhendit ekraanipiltidega.</p>
    <nav aria-labelledby="sisukord">
      <h2 id="sisukord">Sisukord</h2>
      <ol>{guideSections.map(section=><li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
    </nav>
    {guideSections.map(section=><section key={section.id} aria-labelledby={section.id}>
      <h2 id={section.id} tabIndex={-1}>{section.title}</h2>
      <p>{section.intro}</p>
      <ol>{section.steps.map(step=><li key={step}>{step}</li>)}</ol>
      <p>{section.result}</p>
      <p><a href="#sisukord">Tagasi sisukorda</a></p>
    </section>)}
  </main>;
}
