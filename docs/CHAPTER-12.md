# Peatükk 12 — keeled ja ligipääsetavus

08.09.2026, kohalik tööpuu. Omaniku täpsustus: kujundus jääb ootele; kasutajaliides peab toetama eesti, inglise ja vene keelt. See asendab lähteplaani esialgse ainult eestikeelse kasutajaliidese ulatuse.

## Teostus

- `src/locales/et.json`, `en.json`, `ru.json` on välised tõlkekataloogid. Lähtetekst on gettext-laadne võti; väärtuste kohatäited säilivad. Kuupäevad, kellaajad ja eurohinnad kasutavad valitud lokaati. Ettevõtte sisestatud sisu ei tõlgita automaatselt.
- Ühine keelevalik töötab avalikus vaates, halduses ja manustatud vaates. Aktiivse kliendivormi keelevahetus ei laadi lehte uuesti ega tühjenda kontakti või pakkumist. Dokumendi `lang` muutub koos valikuga; staatiline serverivaade laaditakse valiku järel uuesti.
- Avaliku kliendi ja halduskeskkonna keeleküpsised on eraldi. Ettevõtte vaikekeelt saab salvestada omanik; iga liige saab salvestada oma selle ettevõtte halduskeele. Server kontrollib aktiivset liikmesust ja omanikuõigust ning auditeerib muudatuse. Kliendi otsene valik on ettevõtte vaikekeele ees.
- Migratsioon 012 lisab ettevõtte vaikekeele, liikme halduskeele, broneeringu kliendikeele ja teavitusjärjekorra keele. Olemasolevad kirjed saavad `et`. Vana ilma keeleparameetrita korduspäringu kuju jääb toetatuks. Kliendikeel säilib broneeringu muutmisel ning liigub teavituse järjekorrakirjele ja kalendifaili.
- Käsitsi lisamisel saab valida kliendi keele eraldi haldaja keelest. Kliendi halduslink alustab broneeringu keelest, kui kasutaja pole ise keelt valinud.
- Vidina kasutajatekstid genereeritakse build'i ajal samadest kataloogidest (`scripts/widget-languages.ts`). Paigalduskood sisaldab valitud keelt. Modaal säilitab sulgemise ja uuesti avamise vahel sama iframe'i ja poolelioleva vormi; Escape ja sulgemisnupp tagastavad fookuse avajale.
- Põhisisu vahelejätmise link, nähtav klaviatuurifookus, 24 px juhtelementide miinimum, vähendatud liikumise eelistus ja kitsas vaates keritav haldustabel. Broneerimissammud ja avatud halduse broneeringuvorm saavad pealkirjafookuse.
- Avaliku kontaktivormi väljade vead on seotud `aria-describedby` ja `aria-invalid` abil. Vigade kokkuvõte sisaldab väljalinke; saatmine suunab esimesele vigasele väljale. Vea parandamisel säilivad muud andmed.

Toetatud keelte loend ja SQL-i lubatud väärtused on teadlikult piiratud `et/en/ru`-ga. Uue keele lisamine nõuab kataloogi, lokaadi ja andmebaasipiirangu täiendamist; see pole haldusest vabalt lisatav keel.

## Kontrollid ja piirid

119 testi 14 failis, TypeScripti kontroll ja tootmisbuild läbisid. Uued testid kontrollivad kataloogide võtmete/kohatäidete võrdsust, keeleprioriteeti, kehtivat mitmekeelset nime ja väljavigu, rolli- ja ettevõttepiiri keelesätetes, broneeringu/teavituse keele säilimist ning vana korduspäringu toimimist.

Chromiumis kontrolliti ingliskeelset teenuse/töötaja/aja/kontakti voogu; tühja vormi saatmine fokuseeris vigase nimevälja. Vene keelele lülitamisel säilisid nimi, e-post ja pakkumine. 390 px vaates oli dokumendi laius 390 px nii avalikus vormis kui halduses. Kontrolliti halduskeele ja ettevõtte vaikekeele salvestamist, venekeelse modaalakna klaviatuuriga avamist, Escape'i, fookuse tagastamist ja sammu säilimist uuesti avamisel. Taustalehe juhtelemendid jäid modaali ajal klaviatuurile kättesaamatuks. Kontrollitud manustatud vaates puudusid korduvad ID-d ja nimeta vormijuhikud.

Tõendi piir: see ei ole WCAG 2.2 AA tervikvastuvõtt. Päris ekraanilugeja ning Safari/Firefoxi maatriks ja hilisema kujunduse kontrasti/teksti suurendamise lõppkontroll on veel vajalikud. Kujunduse redaktor, teemad, fondid ja avaldamise töövoog on omaniku korraldusel ootel. Teenuste nimede ja kirjelduste tõlkeredaktor lisandus omaniku jätkutellimusena allpool. Teavituste tegelik saatmine ja kirjade mallid on peatüki 17 sõltuvus; siin säilitatakse nende jaoks kliendikeel. Tootmisse ei paigaldatud.

Kontrollide alus: [WCAG väljade vigade tuvastamine](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), [juhtelemendi sihtala](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [WAI modaalakna klaviatuurikäitumine](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).


## Omaniku täiendus: teenuste sisu tõlked

Lisatud on teenuse algteksti keel, käsitsi sisestatav tõlkemustand, automaattõlke ühendus, kinnitamine/avaldamine ning puuduva või vananenud tõlke loend. Tõlkeid haldab ettevõtte omanik sama õiguse alusel nagu teenuse algteksti. Haldus värskendab seisu iga 15 sekundi järel ja säilitab poolelioleva vormi ka konflikti korral. Ajaloos on tegija, aeg ning enne/pärast tekstid. Need on ettevõtte piires piiratud ligipääsuga.

Migratsioon 013 eristab teenuse sisuversiooni hinnakirjaversioonist. Ainult nime, kirjelduse või lähtekeele muutmine muudab tõlke ülevaatamist vajavaks. Klient saab ainult sama sisuversiooni kinnitatud tõlke; muidu põhikeelse teksti koos keelemärkega. Sama algteksti uus mustand ei peida senist kinnitatud tõlget. Uue broneeringu teenusenimi salvestatakse kliendi keeles hetktõmmisena; hilisem tõlke muutus vana broneeringut ei kirjuta üle.

Automaattõlge kasutab serveripoolset OpenAI Responses API ühendust, struktureeritud JSON-vastust ja `store:false`. Teenusele saadetakse ainult algteksti nimi, kirjeldus ja keeled. Võrk töötab väljaspool andmebaasilukke; pärast vastust kontrollitakse uuesti õigusi ja mõlemat versiooni. Puudulik, keeldutud või vigane vastus ei salvesta tekste. Ühenduse käivitamiseks määra serveris `OPENAI_API_KEY` ja `TRANSLATION_MODEL` (Responses API struktureeritud väljundit toetav mudel). Võti ei lähe brauserisse. Siinses keskkonnas neid pole: päris teenusevõrgu katse on veel tegemata; käsitsi töövoog on täielikult kasutatav. Ühenduse leping kontrolliti [ametliku struktureeritud väljundi juhendi](https://developers.openai.com/api/docs/guides/structured-outputs) järgi.

129 testi 15 failis ja tootmisbuild läbisid. Lisatud kontrollid: mustandi avalikkusest välistamine, vana avaldatud teksti säilimine, algteksti vananemine, hinnamuutuse mõju puudumine, konkureeriva käsitsi paranduse/algteksti kaitse automaattõlke hilinemisel, RLS/rollid, audit ning broneeringu nime hetktõmmis. Teenusepakkuja puuduv seadistus, sisend, keeldumine, puudulik/vale keel ja pikkus on kontrollitud võrgumakettidega. Chromiumis kinnitati mustandi salvestamine ja avaldamine, ingliskeelne avalik tekst, algteksti muutmise järel põhikeelele naasmine, mustandi säilimine konflikti ajal ja 390 px vaade.
