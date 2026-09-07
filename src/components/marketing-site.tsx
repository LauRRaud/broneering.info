"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./marketing-site.module.css";

type MarketingSiteProps = {
  demoHref?: string;
  secondDemoHref?: string;
};

const features = [
  { number: "01", title: "Teenused ja inimesed", text: "Lisa teenused, kestused, hinnad ja inimesed, kes neid pakuvad. Kõik ühes selges vaates." },
  { number: "02", title: "Sinu päris graafik", text: "Määra tööajad, pausid ja erandid. Klient näeb ainult neid aegu, mis päriselt sobivad." },
  { number: "03", title: "Jaga oma kohta", text: "Kui liitumine avaneb, saad omaette aadressi ja lisad broneerimisnupu olemasolevale veebilehele, Instagrami või sõnumisse." },
  { number: "04", title: "Kliendi jaoks lihtne", text: "Teenuse valik, sobiv aeg ja kinnitus — ilma kontota ning ilma pikema edasi-tagasi kirjutamiseta." },
  { number: "05", title: "Üks süsteem", text: "Avalik koduleht, ettevõtte haldus ja kliendi broneerimisvaade on seotud ühe selge töövooga." },
  { number: "06", title: "Kasvab koos sinuga", text: "Alusta oma põhitööriistadest ja lisa järgmised detailid siis, kui sul neid päriselt vaja on." },
];

const faqs = [
  { question: "Kas broneering.info on juba valmis?", answer: "Oleme varajases arenduses ja viime praegu läbi esimesi pilootkatsetusi. Demo on päriselt kasutatav, ettevõtte liitumine ja haldus on veel arendamisel." },
  { question: "Kas klient peab endale konto tegema?", answer: "Ei pea. Broneerimiseks piisab kliendi nimest ja e-postist ning kogu teekond on tehtud võimalikult lühikeseks." },
  { question: "Kuidas minu ettevõtte broneerimisleht välja näeb?", answer: "Kui ettevõtete liitumine avaneb, saab iga ettevõte oma aadressi kujul omafirma.broneering.info. Seal on sinu teenused, töötajad ja vabad ajad. Broneerimisnupu saab lisada ka olemasolevale veebilehele." },
  { question: "Kas saan siduda oma praeguse veebilehega?", answer: "Jah. Plaanis on lihtne broneerimisnupp või link, mille saad lisada oma veebilehele, sotsiaalmeediasse ja sõnumitesse." },
  { question: "Kui palju teenus maksab?", answer: "Hind ei ole veel lõplikult paigas. Kujundame piloodi põhjal paketi, mis oleks väikesele teenuseettevõttele aus ja arusaadav. Avaldame hinnad enne avatud liitumist." },
];

function Arrow() {
  return <span className={styles.arrow} aria-hidden="true">↗</span>;
}

function MiniBookingPreview() {
  return (
    <div className={styles.previewWindow} aria-label="Broneerimisvaate näidis">
      <div className={styles.previewTopbar}><span className={styles.windowDots}><i /><i /><i /></span><span className={styles.previewUrl}>stuudiokask.broneering.info</span><span className={styles.previewLock}>⌁</span></div>
      <div className={styles.previewBody}>
        <div className={styles.previewBrand}><span className={styles.previewLogo}>s</span><span>STUUDIO KASK</span><small>Tallinn · iluteenused</small></div>
        <div className={styles.previewLabel}>VALI TEENUS</div>
        <div className={styles.previewService}><span><strong>Näohooldus</strong><small>60 min · 55 €</small></span><b>✓</b></div>
        <div className={styles.previewLabel}>VALI AEG</div>
        <div className={styles.previewDates}><span>E<br /><b>12</b></span><span className={styles.previewDateActive}>T<br /><b>13</b></span><span>K<br /><b>14</b></span><span>N<br /><b>15</b></span><span>R<br /><b>16</b></span></div>
        <div className={styles.previewTimes}><span>10:00</span><span className={styles.previewTimeActive}>11:30</span><span>13:00</span><span>14:30</span></div>
        <div className={styles.previewFooter}><span>Valmis? <strong>Vali aeg</strong></span><span className={styles.previewButton}>Jätka <Arrow /></span></div>
      </div>
      <span className={styles.previewTag}>NÄIDIS</span>
    </div>
  );
}

export default function MarketingSite({ demoHref, secondDemoHref }: MarketingSiteProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const resolvedDemoHref = demoHref || "https://demo.broneering.info";
  const resolvedSecondDemoHref = secondDemoHref || "https://demo2.broneering.info";
  const loginDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = loginDialogRef.current;
    if (!dialog) return;
    if (loginOpen && !dialog.open) dialog.showModal();
    if (!loginOpen && dialog.open) dialog.close();
  }, [loginOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <main className={styles.site}>
      <a className={styles.skipLink} href="#sisu">Liigu sisu juurde</a>
      <header className={styles.header}>
        <a className={styles.wordmark} href="#algus" onClick={closeMobile} aria-label="broneering.info avaleht"><span className={styles.wordmarkMark}>b<span>·</span></span><span>broneering<span className={styles.wordmarkDot}>.</span>info</span></a>
        <button className={styles.menuButton} type="button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-controls="main-nav"><span /><span /><span /><b>{mobileOpen ? "Sulge" : "Menüü"}</b></button>
        <nav id="main-nav" className={`${styles.nav} ${mobileOpen ? styles.navOpen : ""}`} aria-label="Põhinavigatsioon">
          <a href="#kuidas" onClick={closeMobile}>Kuidas töötab</a>
          <a href="#voimalused" onClick={closeMobile}>Võimalused</a>
          <a href="#hinnad" onClick={closeMobile}>Hinnad</a>
          <a href="#demo" onClick={closeMobile}>Näidis</a>
          <a href="#kkk" onClick={closeMobile}>KKK</a>
          <a className={styles.navStart} href="#alusta" onClick={closeMobile}>Alusta kasutamist <Arrow /></a>
          <button className={styles.loginButton} type="button" onClick={() => { setLoginOpen(true); closeMobile(); }}>Logi sisse <Arrow /></button>
        </nav>
      </header>

      <div id="sisu">
        <section id="algus" className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.eyebrowLine} /> Eesti ettevõtetele, kes töötavad inimestega</p>
            <h1>Vähem edasi-tagasi.<br /><em>Rohkem päris aega.</em></h1>
            <p className={styles.heroLead}>broneering.info aitab sinu klientidel leida sobiva aja ja sinul oma päeva rahulikult planeerida.</p>
            <p className={styles.heroNote}>Oleme varajases arenduses. Proovi toimivat demot ja vaata, kas see sobib sinu töökorraldusega.</p>
            <div className={styles.heroActions}><a className={`${styles.button} ${styles.buttonPrimary}`} href="#demo">Vaata toimivat demot <Arrow /></a><a className={`${styles.button} ${styles.buttonQuiet}`} href="#kuidas">Kuidas see töötab <span aria-hidden="true">↓</span></a></div>
          </div>
          <div className={styles.heroVisual}><MiniBookingPreview /><span className={styles.heroSeal}>Päris demo<br /><b>01</b></span><span className={styles.heroCaption}>Sinu ettevõtte nimi<br /><i>selge algus</i></span></div>
        </section>

        <div className={styles.signalBar} aria-label="Toote põhimõtted"><span>Üks lihtne broneerimisvaade</span><i /><span>Oma aadress sinu ettevõttele</span><i /><span>Ehitatud Eestis</span></div>

        <section id="kuidas" className={`${styles.section} ${styles.howSection}`}>
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>01 / Kuidas töötab</p><h2>Alusta selgest kohast.</h2><p>Broneerimise loogika on lihtne. Sina seadistad oma töökorralduse, klient valib sobiva teenuse ja aja.</p></div>
          <div className={styles.steps}>
            <article className={styles.step}><span className={styles.stepNumber}>01</span><div><h3>Loo oma ettevõtte ala</h3><p>Kui liitumine avaneb, saad oma aadressi kujul <strong>omafirma.broneering.info</strong> ning paned paika teenused, töötajad ja lahtiolekuajad.</p></div></article>
            <article className={styles.step}><span className={styles.stepNumber}>02</span><div><h3>Jaga broneerimisnuppu</h3><p>Lisa link oma praegusele veebilehele, sotsiaalmeediasse või saada see kliendile otse. Ümber kolima ei pea.</p></div></article>
            <article className={styles.step}><span className={styles.stepNumber}>03</span><div><h3>Hoia päev enda käes</h3><p>Klient näeb vabu aegu ja saab kinnituse. Sina näed kokkuleppeid ühest kohast ning saad keskenduda tööle.</p></div></article>
          </div>
        </section>

        <section id="voimalused" className={`${styles.section} ${styles.featureSection}`}>
          <div className={styles.featureHeading}><p className={styles.eyebrow}>02 / Võimalused</p><h2>Väikesed detailid,<br /><em>suur rahu.</em></h2><p>Esimeses versioonis keskendume sellele, mis aitab igapäevastel kokkulepetel lihtsalt liikuda.</p></div>
          <div className={styles.featureGrid}>{features.map((feature) => <article className={styles.featureCard} key={feature.number}><span>{feature.number}</span><h3>{feature.title}</h3><p>{feature.text}</p><Arrow /></article>)}</div>
        </section>

        <section className={styles.systemSection}><div className={styles.systemOrb} aria-hidden="true" /><div className={styles.systemContent}><p className={styles.eyebrow}>Sinu link, sinu töölaud</p><h2>Üks koht,<br /><em>vähem admini.</em></h2><p>Sinu avalik koduleht tutvustab teenuseid ja suunab kliendi sinu ettevõtte enda broneerimislingile. Haldusvaade aadressil <strong>haldus.broneering.info</strong> aitab sul samas kohas teenuseid, töötajaid ja graafikut kohandada.</p><div className={styles.systemRail}><span><b>01</b> Sinu avalik koduleht</span><span><b>02</b> Haldusvaade ettevõttele</span><span><b>03</b> Oma broneerimislink</span></div></div></section>

        <section id="hinnad" className={`${styles.section} ${styles.pricingSection}`}>
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>03 / Hinnad</p><h2>Aus vastus praegu.</h2><p>Hind ei ole veel lõplikult paigas. Tahame enne avalikku käivitamist aru saada, millist tuge ja milliseid võimalusi sinu ettevõte päriselt vajab.</p></div>
          <div className={styles.priceCard}><div><span className={styles.priceKicker}>Praegu</span><h3>Piloot</h3><p>Esimesed ettevõtted aitavad meil teha toote paremaks ja paika panna selge hinnastamise.</p></div><ul><li><span>✓</span> Toimiv broneerimisdemo</li><li><span>✓</span> Oma ettevõtte vaade on arendamisel</li><li><span>✓</span> Tingimused avaldame enne liitumist</li></ul><a href="#demo" className={`${styles.button} ${styles.buttonLight}`}>Proovi demot <Arrow /></a><small>Ettevõtete liitumine avaneb pärast pilootkatset.</small></div>
        </section>

        <section id="demo" className={`${styles.section} ${styles.demoSection}`}>
          <div className={styles.demoHeading}><div><p className={styles.eyebrow}>04 / Näidis</p><h2>Kliki sisse.<br /><em>Tunne ise.</em></h2></div><p>Need on demokeskkonnad. Töötajad ja graafikud on näidisandmed. Proovimisel kasuta väljamõeldud nime ja e-posti.</p></div>
          <div className={styles.demoGrid}><div className={styles.demoCard}><div className={styles.demoCardTop}><span className={styles.demoIcon}>i</span><div><strong>Ilutegu</strong><small>Tabasalu · näidisandmed</small></div><span className={styles.demoStatus}>avatud</span></div><p>Ilutegu on päris salongi nimi, kuid demo kasutab väljamõeldud graafikut ja töötajaid.</p><a href={resolvedDemoHref} className={styles.demoLink}>Ava Ilutegu demo <Arrow /></a></div><div className={`${styles.demoCard} ${styles.demoCardAlt}`}><div className={styles.demoCardTop}><span className={styles.demoIcon}>t</span><div><strong>Teine ettevõte</strong><small>näidisandmed</small></div><span className={styles.demoStatus}>avatud</span></div><p>Teine demo kasutab samuti väljamõeldud graafikut ja töötajaid, et saaksid seda julgelt proovida.</p><a href={resolvedSecondDemoHref} className={styles.demoLink}>Ava teine demo <Arrow /></a></div></div><p className={styles.demoFootnote}><span /> Näidisvaade · proovibroneeringud ei saada päris teavitusi</p>
        </section>

        <section id="kkk" className={`${styles.section} ${styles.faqSection}`}><div className={styles.faqIntro}><p className={styles.eyebrow}>05 / KKK</p><h2>Küsimused, mis<br /><em>tavaliselt tekivad.</em></h2></div><div className={styles.faqList}>{faqs.map((faq) => <details key={faq.question} className={styles.faqItem}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></section>

        <section id="alusta" className={styles.startSection}><div className={styles.startIndex}>06</div><div className={styles.startCopy}><p className={styles.eyebrow}>Alusta kasutamist</p><h2>Järgmine hea samm<br /><em>on väike.</em></h2><p>Proovi esmalt demot ja vaata, kuidas teenuse, töötaja ning sobiva aja valik kliendi jaoks töötab.</p><a className={`${styles.button} ${styles.buttonPrimary}`} href="#demo">Proovi toimivat demot <Arrow /></a><p className={styles.startStatus}>Ettevõtete liitumine avaneb pärast pilootkatset.</p></div><div className={styles.startAside}><span>Kui liitumine avaneb</span><strong>1</strong><p>seadistad ettevõtte<br />ja teenused</p><strong>2</strong><p>lisad töötajad<br />ja graafiku</p><strong>3</strong><p>jagad oma<br />broneerimislinki</p></div></section>
      </div>

      <footer className={styles.footer}><a className={styles.wordmark} href="#algus"><span className={styles.wordmarkMark}>b<span>·</span></span><span>broneering<span className={styles.wordmarkDot}>.</span>info</span></a><p>Broneerimine, mis jätab ruumi päris tööle.</p><span>© 2026 · Varajases arenduses</span></footer>

      <dialog ref={loginDialogRef} className={styles.loginDialog} aria-labelledby="login-title" onCancel={(event) => { event.preventDefault(); setLoginOpen(false); }} onClose={() => setLoginOpen(false)}><button className={styles.dialogClose} type="button" onClick={() => setLoginOpen(false)} aria-label="Sulge">×</button><span className={styles.dialogMark}>b<span>·</span></span><p className={styles.eyebrow}>Ettevõtte haldus</p><h2 id="login-title">Varsti siin.</h2><p>Ettevõtete haldus on arendamisel. Praegu saad proovida broneerimise demot.</p><div className={styles.dialogActions}><a className={`${styles.button} ${styles.buttonPrimary}`} href="#demo" onClick={() => setLoginOpen(false)}>Proovi demot <Arrow /></a><button className={styles.buttonQuiet} type="button" onClick={() => setLoginOpen(false)}>Sulge</button></div></dialog>
    </main>
  );
}
