# Peatükk 23 — AT-01–AT-48 tõendite maatriks

**Peatükk 26, 12.09.2026:** [serveri tehniline vastuvõtt](CHAPTER-26.md) läbis: 12 000 päringut p95 19,2 ms, 30/30 kalendrimuudatust kuni 5,006 s, konkurents, import/eksport, sisemine arveldus, lahkumistähtajad ning 53 tabeli ja privaatfailide taastamine. SMTP, Maksekeskus ja väline varukoopia on omaniku juhisel hilisemaks; inimvastuvõtt ja päris säilitusleping jäävad eraldi.

**Peatüki 25 otsus 10.09.2026:** pärisseadmete ja sõltumatu kasutaja vastuvõtt pärast kujunduse valmimist; ekraanilugejat testib pime inimene. [Katsesammud ja tulemuse vorm](CHAPTER-25.md). Tehnilised tõendid säilivad, kasutajavastuvõtt on ootel.

**Peatükk 24 lõpetatud 10.09.2026:** [AT-01–18 tehniline vastuvõtt ja viis lisakontrolli](CHAPTER-24.md) läbisid. Värske tulemus: 290/290 automaattesti, 9/9 brauserifaasi ja build. Parandatud on nurjunud ajamuutuse järel kadunud vorm/põhjendus. Peatükkide 25–26 ja kogu V1 omaniku vastuvõtt jääb eraldi.

**23-G03 lõppvoor 10.09.2026:** [laiendatud tehnilise testimise aruanne](ACCEPTANCE-G03-COMPLETION.md): 505 HTTP-päringut ja üks andmebaasi räsivõrdlus (506/506), 14/14 brauserifaasi (356 kontrolli), 287/287 automaattesti ja tootmisbuild läbisid. Hilinenud modaali ning makselingi õiguskontrolli vead parandatud. Pärisseadmete, ekraanilugejate ja sõltumatu kasutaja vastuvõtt jääb avatuks; allpool on varasemate voorude ajalooline seis.

**23-G03 uuendus 09.09.2026:** [esimene automaatne põhimatriks](ACCEPTANCE-G03.md) lisab AT-02/05/19/22/23/24/32/35 piiratud uue HTTP- ja kolme brauserimootori tõendi. 241 kontrolli, 12 haldusrolli/mootori kombinatsiooni ja kolm klaviatuuriga avalikku broneerimist läbisid. WebKiti põhisisulingi viga parandatud. Allpoolsete ridade laiem vastuvõtt jääb avatuks vastavalt uue protokolli piiridele.

**Uuendus 09.09.2026:** 23-G09 piiratud auditeeritud kalendri- ja kliendikontaktide tugivaade on API/andmebaasi/brauseriga kontrollitud ning serverisse paigaldatud. [Teostus, õiguste piirid ja tõendid](SUPPORT-G09.md). Allpool olevad 08.09 kirjeldused säilitavad oma ajaloolise kontrolliseisu.

**Hilisem serveriuuendus 08.09.2026:** parandused, migratsioon 048 ja Nginxi impordipiir on paigaldatud. [Täpne paigaldusprotokoll ja allesjäänud piirid](DEPLOYMENT-2026-09-08.md). Allpool kirjeldatud kohalik kontroll eelnes sellele paigaldusele.

08.09.2026 auditeeritud tööpuu ja ühised keskkonnaandmed: [auditi põhiosa](CHAPTER-23.md). Katsete pealkirjad pärinevad lähteplaani peatükkidest 24–26. Kõik allpool viidatud automaattestid läbisid selle auditi käivituses; [JSON-raport](audits/chapter23-20260908/vitest.json) sisaldab täpseid testinimesid ja tulemusi.

08.09 paranduste järel on F-01–F-05 mõjutatud read allpool ajakohastatud. [Järelraport](CHAPTER-23-FIXES.md) eristab uut kohalikku tõendit kogu toote ja omaniku vastuvõtust.

- **Tehniline tõend**: nimetatud automaatkatse tõendab kirjeldatud piiri kohalikus keskkonnas. See ei ole omaniku allkirjastatud vastuvõtt ega kogu seotud kasutajaliidese katse.
- **Osaline**: olemas on kood, kitsam automaatkatse või varasem protokoll; terviktingimuse värske tõend puudub.
- **Viga**: auditis kinnitatud vastunäide takistab kirjeldatud teekonna vastuvõttu. Kitsamad olemasolevad testid võivad samal ajal läbida.
- **Puudub/ootel**: nõutav teostus või katseprotokoll puudub; edasilükkamise põhjus on märgitud.

Testija: Codex, kohalik koodi- ja käitumisaudit. Kõigi ridade omaniku kinnitaja ja vastuvõtu kuupäev: **märkimata**. Ajaloolised peatükkide brauseritõendid on taust; neid ei esitata selles voorus uuesti käivitatuna.

## Broneerimise õigsus

| ID ja lähteplaani katse | Seis | Tegelik tõend | Puuduv vastuvõtt / parandus |
| --- | --- | --- | --- |
| AT-01 Teenuse järgi töötajate valik | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-02 Vigane töötaja otse API-s | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-03 Teenusel ainult üks töötaja | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-04 Töötaja isiklik otselink | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-05 „Töötaja pole oluline” | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-06 Erinev hind/kestus samal ajal | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-07 Etteteatamine 2 h, praegu 13.00 | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-08 Etteteatamispiir möödub vormis | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-09 Teenuse puhver ja kõrvalbroneering | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-10 Tööpaus, puhkus ja erandpäev | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-11 50 sama aja samaaegset taotlust | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-12 Sama päringu kordus | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-13 Sama tunnus, erinev sisu | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-14 Graafiku sulgemine ja broneerimine | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-15 Aja muutmine ebaõnnestub | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-16 Kaks administraatorit muudavad | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-17 Kellakeeramine ja ajavöönd | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |
| AT-18 Teenuse või töötaja arhiveerimine | Läbitud tehniline vastuvõtt 10.09.2026 | [Peatüki 24 koond, täpsed testinimed ja varasemate/uute tõendite eristus](CHAPTER-24.md) | Ptk 25–26 ning V1 omaniku vastuvõtt eraldi |

## Turve ja kasutatavus

| ID ja lähteplaani katse | Seis | Tegelik tõend | Puuduv vastuvõtt / parandus |
| --- | --- | --- | --- |
| AT-19 Teise ettevõtte ID API-päringus | Tehniline ja HTTP-tõend | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md) ja esimene G03 voor: laiendatud rollide/ettevõtete tegelik HTTP maatriks; keelatud kirjutuste järel äriandmete räsid võrdsed | Sõltumatu turva-/kasutajavastuvõtt; täpne kontrollitud ulatus on raportites |
| AT-20 Teise ettevõtte eksport või fail | Tehniline ja HTTP-tõend | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): API eksporditaotlus, piiritletud töötleja, valmis faili tegelik allalaadimine; võõras kontekst ja mitteomanikud 403, aegunud fail 410 | Sõltumatu brauseri/proksi vastuvõtt |
| AT-21 Ettevõttekontekst ühenduste puulis | Tehniline tõend | `booking.test.ts`: eri kontekstid/ühendused; `data-model.test.ts`: kontekstita read varjatud; `db.test.ts`: rikutud ühendus kõrvaldatakse | Kontrollitud rakenduseroll ei ole superuser/BYPASSRLS |
| AT-22 Avalik saadavuse päring | Tehniline ja HTTP-tõend | `booking.test.ts` ning [G03 esimene HTTP-voor](ACCEPTANCE-G03.md): saadavuse DTO ei sisalda kliendikontaktide välju | Sõltumatu turva-/logivastuvõtt |
| AT-23 Rolli piirang ja peidetud nupp | Tehniline, HTTP- ja brauseritõend | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): neli rolli, laiendatud API maatriks, värske lisaõiguse andmine/eemaldamine; [G09 tugivaate piirid](SUPPORT-G09.md) | Sõltumatu kasutaja ning kõigi haldusvormide vastuvõtt |
| AT-24 Lahkunud töötaja sessioon | Tehniline ja HTTP-tõend | F-03 ning [G03 esimene voor](ACCEPTANCE-G03.md): sama küpsisega eemaldatud liikmesus 403, keelatud konto 401; [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): MFA-ta/aegunud sessioon 401. Migratsioon 048 paigaldatud 08.09 | Sõltumatu töötaja lahkumise tervikteekond |
| AT-25 Aegunud, tühistatud või võõras link | Tehniline ja brauseritõend | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): aegunud, tühistatud ja võõras link 410, kontaktijuhis nähtav, broneeringu andmed/muutmisnupud puuduvad; kolm mootorit | Pärisseadmete ja ekraanilugeja vastuvõtt |
| AT-26 Meiliskanner avab halduslingi | Tehniline tõend | `booking-management-http.test.ts`: GET kutsub ainult lugemist; `booking-management.test.ts`: kõrvaltoimeta lugemine | Kliendi kirjutus nõuab eraldi kinnitust ja kaitstud päringut |
| AT-27 Tundmatu alamdomeen | Tehniline tõend | `booking.test.ts`: täpne host ja tundmatud/reserveeritud nimed; `embed.test.ts`: mittevalmis domeen jääb suletuks | Tegelik DNS/TLS vastuvõtt pärast juurutust eraldi |
| AT-28 Võltsitud postMessage | Tehniline ja brauseritõend | `widget.test.ts` ning [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): eri päritoludega iframe, vale saatja/kanali sõnumid eiratakse; kolm mootorit | Sõltumatu vastuvõtt |
| AT-29 Iframe lubamata kodulehel | Tehniline ja brauseritõend | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): tegelik CSP `frame-ancestors` keeld lubamata vanema puhul kõigis kolmes mootoris; varulink säilib | Päris Safari ja sõltumatu vastuvõtt |
| AT-30 Piiratud kolmanda osapoole küpsised | Osaline, Chrome/Firefox tõend olemas | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): prooviküpsis esmalt olemas, kolmanda osapoole iframe’is ja päringus blokeeritud; tegelik broneering 201 | Safari tegeliku küpsisepiirangu ja pärisseadmete vastuvõtt |
| AT-31 JavaScripti paigaldusskripti rike | Tehniline ja brauseritõend | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): widget’i skripti blokeerimine, skriptita HTML ning hilinenud iframe; varulink säilib, G03-F01 hilise modaali taastumise parandus läbis kolmes mootoris | Pärisseadmete ja sõltumatu kasutaja vastuvõtt |
| AT-32 Klaviatuur ja ekraanilugeja | Osaline, klaviatuuri tehniline tõend olemas | [G03 esimene voor](ACCEPTANCE-G03.md) ning [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): klaviatuuri põhiteekond, fookus, nimed ja modaal kolmes mootoris | Ekraanilugeja tegelik kuulamiskatse ja kujundusejärgne vastuvõtt |
| AT-33 Modaali fookus ja sulgemine | Tehniline ja brauseritõend | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): Tab modaali piires, Escape vanemas/iframe’is, avaja fookus ja kerimine taastuvad, korduv avamine; kolm mootorit | Ekraanilugeja, pärisseadmete ja sõltumatu vastuvõtt |
| AT-34 Kujunduse halb kontrast ja mustand | **Puudub/ootel** | `data-model.test.ts` kontrollib mustandi/avaldatu DB eraldust; kasutatav teema-, meedia- ja kontrastihaldus puudub | Kujundus omaniku otsusel ootel; **23-G04**, DB tabel pole funktsiooni vastuvõtt |
| AT-35 Mobiil ja brauserid | Osaline, kolme mootori maatriks olemas | [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): Chrome/Firefox/WebKit Windowsis; neli rolli, ET/EN/RU, 320 × 700 / 844 × 390 / 1280 × 900 ning avalikud kitsad vaated | Safari/macOS/iOS, Android, päris puutejuhtimine ja suum; kujundusejärgne sõltumatu vastuvõtt |

Parooli taastamise, MFA/varukoodide ja sessiooni sulgemise päris handler'i katse läbis (`auth-flow.test.ts`). See on väärtuslik lisatõend, kuid ei asenda ptk 25 kogu ASVS-i, väärkasutuse, logide ega failiüleslaadimise vastuvõttu. Uut CVE-inventuuri selles voorus ei tehtud.

## Käitamine ja kuutasu

| ID ja lähteplaani katse | Seis | Tegelik tõend | Puuduv vastuvõtt / parandus |
| --- | --- | --- | --- |
| AT-36 Meiliserver on maas | Osaline | [notifications.test.ts](../tests/notifications.test.ts): ajutine SMTP saatmisviga, sama Message-ID, korduskatsed ja privaatsete vigade varjamine; outbox on broneeringutehingus | Päris oma SMTP katkestamise ja taastamise katse **23-G05** |
| AT-37 Broneering muutub enne meeldetuletust | Tehniline tõend | `booking-management.test.ts`, `notifications.test.ts`: vanad ülesanded asendatakse; saatja kontrollib värsket versiooni lukus | Päris saatmisvastuvõtt 23-G05 |
| AT-38 Tühistatud broneeringu taustatöö | Tehniline tõend | `notifications.test.ts`: juba võetud kinnitus/meeldetuletus tühistatakse, kui tühistamine jõustub enne saatmist | SMTP-le juba üle antud kirja tagasikutsumist ei lubata |
| AT-39 CSV-impordi kordus ja vead | Osaline; tuvastatud viga parandatud | Parseri ja impordi teenusetestid läbivad; F-05 päris Nginx lubab 5 MiB ja keelab 5 MiB + 1 baidi. [Järelraport](CHAPTER-23-FIXES.md) | Autentitud import läbi paigaldatud proksi ja brauseri 23-G03; Nginxi muudatus pole tootmises |
| AT-40 Import või testrežiim | Tehniline tõend | `import-management.test.ts`: algset kirjalainet ei teki; `onboarding.test.ts`, `notifications.test.ts`: demo/testi teavitused summutatud | Kontrollida pärast SMTP ühendamist sünteetiliste adressaatidega 23-G05 |
| AT-41 Sama kuu arveldustöö kordus | Tehniline tõend | [invoices.test.ts](../tests/invoices.test.ts): üks perioodiarve, automaatne tasumata kuude töö, ankurpäev, lõpetamine ja paralleelsed kordused | Välise pakkuja/worker'i pärisvastuvõtt 23-G05; F-01 maksekatse piir on kohalikult parandatud |
| AT-42 Makse märkimine ja tähtaja ületamine | Tehniline tõend | `payments.test.ts`, `invoices.test.ts` ja `payment-checkout-freshness.test.ts`: F-01 parandatud, kõik tagastusteed, osaline/täielik tasumine, kreedit, võistlus ja tegeliku laekumise säilitamine läbivad | Päris maksepakkuja/SMTP tervikvastuvõtt 23-G05 |
| AT-43 Varukoopiast taastamine | Osaline; tuvastatud viga parandatud | Taastamisartefakti/lepituskatse läbivad; F-04 puhastatud kuju ja vana tühja ajaloo brauserivaade kontrollitud. [Järelraport](CHAPTER-23-FIXES.md) | Täielik DB + failide + eemaldamiste + rakenduse taastamine, tootmismahu RPO/RTO 23-G08; väline hoiukoht edasi lükatud |
| AT-44 Puhas uus server ja teine arendaja | Osaline | Auditis tühja DB 47 migratsiooni, `runner` build ja readiness läbivad; paigaldusjuhend olemas | Sõltumatu teise arendaja paigaldus ja broneerimine uuel serveril **23-G08** |
| AT-45 Lähtekoodi ja õiguste üleandmine | Osaline | Kohalik kood/lukufail/juhendid, ptk 20 varasem privaatsuse ja litsentside inventuur | Omaniku ligipääsude ning lepingulise õiguste ahela ja puuduvate litsentsitekstide kinnitus **23-G01** |
| AT-46 Ettevõtte lahkumine | Osaline | [company-exit.test.ts](../tests/company-exit.test.ts), `exports.test.ts`, `embed.test.ts`: tähtajad, õiguste lõpp, eksport, broneeringute säilimine, domeeni reserveerimine | Kokkulepitud tähtaegade, failide üleandmise ja täieliku säilituse tervikvastuvõtt **23-G07/G08** |
| AT-47 Kalendri taustavärskendus | Tehniliselt läbitud 10.09 | [Ptk 26](CHAPTER-26.md): kaks eraldi kasutajat, 15 + 15 loomise/muutmise/tühistamise mõõtmist, kuni 5006 ms, ka 20 päringu/s all | Mõõdetud Chrome’i ja taristu piires; sõltumatu kasutaja vastuvõtt eraldi |
| AT-48 Koormuskatse | Tehniliselt läbitud 10.09 | [Ptk 26](CHAPTER-26.md): 100 ettevõtet, 100 000 ajaloolist broneeringut, 20 päringut/s 600 s, 12 000/12 000 korrektset vastust, p95 19,2 ms | Sama VPS-i loopback-proksi mõõtmine, täpne jaotus ja toorandmed protokollis |

Ühtegi osalist või vigast rida ei saa sulgeda lihtsalt olemasoleva testikomplekti uuesti käivitamisega. Paranduse juurde tuleb lisada puuduvat piiri läbiv katse ja uus versioonitud tõend. Lahtiste tööde täielikud sisendid, vastutaja roll, sõltuvused ja hinnangud: [tööregister](CHAPTER-23-WORK.md).
