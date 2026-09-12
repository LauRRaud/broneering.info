# Arendusplaani täitmise register

**Ajasta tehniline kasutuselevõtt läbis:** [12.09 protokoll](DEPLOYMENT-AJASTA-2026-09-12.md). Lihtne avaleht, HTTPS ja ainult põhidomeeni avalehe suunamine töötavad; kujundus ja lõplik veebisisu on ootel.

**12.09.2026 hilisemad täpsustused:** [serverirestardi kontroll](RESTART-2026-09-12.md) läbis: neli konteinerit terved, samad püsiköited/pildid, 3 ettevõtte ja 3 broneeringu loendused säilisid, HTTPS ning avalikud API-d töötavad. G08 väline taastamine jääb avatuks. Toote nimi on **Ajasta**; [avalik veebileht ja ajasta.ee domeenikava](AJASTA-WEBSITE-PLAN.md) on tegemata töö G04/O-01/O-08 all. Omanik kinnitas lihtsa Ajasta avalehe ja ainult põhidomeeni avalehe suunamise; kujunduse teeb omanik. [Komponentide ja stiilide korraldus](FRONTEND-STRUCTURE.md).

**Koond 12.09.2026:** [V1 allesjäänud tööd ja otsused](REMAINING-WORK.md) sisaldab kõiki D-/O-otsuseid, G01–G09 täpset avatud ulatust ning algse plaani ptk 27–30 võrdlust. [Juhendite sisukord](README.md) näitab olemasolevaid juhiseid ja puuduva kasutajavastuvõtu piire.

**Peatükk 26, 12.09.2026:** [serveri tehniline vastuvõtt](CHAPTER-26.md) läbis: 12 000 päringut p95 19,2 ms, 30/30 kalendrimuudatust kuni 5,006 s, konkurents, import/eksport, sisemine arveldus, lahkumistähtajad ning 53 tabeli ja privaatfailide taastamine. SMTP, Maksekeskus ja väline varukoopia on omaniku juhisel hilisemaks; inimvastuvõtt ja päris säilitusleping jäävad eraldi.

**Peatükk 24 lõpetatud 10.09.2026:** [AT-01–18 tehniline vastuvõtt ja viis lisakontrolli](CHAPTER-24.md) läbisid. Värske tulemus: 290/290 automaattesti, 9/9 brauserifaasi ja build. Parandatud on nurjunud ajamuutuse järel kadunud vorm/põhjendus. Peatükkide 25–26 ja kogu V1 omaniku vastuvõtt jääb eraldi.

**23-G03 lõppvoor 10.09.2026:** [laiendatud tehnilise testimise aruanne](ACCEPTANCE-G03-COMPLETION.md): 505 HTTP-päringut ja üks andmebaasi räsivõrdlus (506/506), 14/14 brauserifaasi (356 kontrolli), 287/287 automaattesti ja tootmisbuild läbisid. Hilinenud modaali ning makselingi õiguskontrolli vead parandatud. Pärisseadmete, ekraanilugejate ja sõltumatu kasutaja vastuvõtt jääb avatuks; allpool on varasemate voorude ajalooline seis.

**23-G03 teine voor 09.09.2026:** [teenusevalikud, töötaja otselink, hinnamuutus ja päris ajapiiri aegumine](ACCEPTANCE-G03-VARIANTS.md) kontrollitud kolmes mootoris. Kõik 15 brauserifaasi läbisid; rakenduse koodi selles voorus muuta polnud vaja. G03 ülejäänud maatriks jääb avatuks.

**23-G03 uuendus 09.09.2026:** [esimene HTTP-, brauseri- ja klaviatuurimaatriks](ACCEPTANCE-G03.md) läbis; WebKiti põhisisulingi Tab-viga parandatud. See on piiritletud tehniline tõend, mitte 23-G03 ega V1 tervikvastuvõtt. Järgmise vooru katmata teekonnad on protokollis eraldi märgitud.

**Uuendus 09.09.2026:** 23-G09 piiratud auditeeritud kalendri- ja kliendikontaktide tugivaade on API/andmebaasi/brauseriga kontrollitud ning serverisse paigaldatud. [Teostus, õiguste piirid ja tõendid](SUPPORT-G09.md). Allpool olevad 08.09 kirjeldused säilitavad oma ajaloolise kontrolliseisu.

**Hilisem serveriuuendus 08.09.2026:** parandused, migratsioon 048 ja Nginxi impordipiir on paigaldatud. [Täpne paigaldusprotokoll ja allesjäänud piirid](DEPLOYMENT-2026-09-08.md). Allpool kirjeldatud kohalik kontroll eelnes sellele paigaldusele.

Alus: `Broneerimisplatvorm_arendusplaan_v1_0.docx`, versioon 1.0, 06.09.2026. Esmane võrdlus tehti 07.09.2026 commit'i `7c89d6e` suhtes; **08.09.2026 värske tööpuu koodi- ja vastuvõtuaudit on [peatükis 23](CHAPTER-23.md)**. See register ei muuda lähteplaani ega asenda omaniku vastuvõttu. Varasemad peatükkide testiarvud kirjeldavad nende kontrollimise hetke, mitte tänast koguarvu.

## Töökorra parandus

Omanik täpsustas, et arendus peab käima dokumendi peatükkide kaupa. Varasemalt ehitati valitud tehnilised osad, kuid puudus peatükkidega seotud täitmisregister. Praegune kohalik tööpuu sisaldab peatükkide 04–22 ulatuslikku teostust. Peatüki 23 audit läbis nõuded 01–30 ning oma rakenduskoodi, migratsioonid ja käitusskriptid; viis auditis leitud viga on hiljem parandatud ja paigaldatud. V1 tervikvastuvõttu takistavad registris nimetatud lahtised teostused, otsused ja vastuvõtud.

Nõudeid käsitletakse sisukorra järjekorras. Iga arendusülesanne seotakse peatüki, D-otsuse ja sobiva AT-testiga; selle juurde märgitakse eesmärk, sisendid, eeltingimused, põhikäik, vead, õigused, andmete/teavituste mõju, sõltuvused, hinnang ja valmimise tõend (ptk 23). Kui teostus vajab hilisema peatüki alust, märgitakse sõltuvus registrisse. Puuduvat osa ei jäeta vaikimisi välja ega märgita peatükki tervikuna valmis ühe töötava alamfunktsiooni põhjal.

Kujundus on omaniku korraldusel praegu ootel. See ei vabasta funktsionaalsetest, klaviatuuri- ega ligipääsetavuse nõuetest. Uut kujundust ei teostata enne omanikuga suuna kokkuleppimist; dokumendi manustatud näidised kuuluvad siis läbivaatamisele.

Staatus **osaline** tähendab, et leidub teostus või tõend, kuid peatüki kõik nõuded pole täidetud. **Tegemata** tähendab, et nõutud funktsiooni või vastuvõtu tõendit ei ole. **Otsustada** tähendab omaniku ärilist või käitamise otsust, mida koodi olemasolust ei järeldata. Allolev on esmane koodiga võrdlus; see ei ole kõigi nõuete lõplik vastuvõtt.

## Peatükkide seis

| Ptk | Dokumendi peatükk | Seis | Olemasolev tõend ja puuduv töö |
| --- | --- | --- | --- |
| 01 | Toode ja esimese versiooni eesmärk | Osaline | Ühine rakendus ja kaks eraldatud demot. V1 tulemuste detailne võrdlus allpool. |
| 02 | Ulatusest väljas ja järgmised versioonid | Piirid kirjeldatud | [ROADMAP](ROADMAP.md) jätab SMS-id, lõppkliendi teenuse ettemaksed, väliskalendrid ja mitu asukohta hilisemaks; omaniku kuutasu Maksekeskuse makselingi/püsimakse otsus on eraldi kehtiv täpsustus. Neid ei loeta valmis funktsioonideks. |
| 03 | Lukustatud otsuste register | Koondatud; omaniku kooskõlastus avatud | [D-01–D-20 ja hilisemate otsuste koond](REMAINING-WORK.md). Kuutasu tingimused täpsustatud ptk 19; G01 õigused/arhitektuur ja G04 kujundus jäävad avatuks. |
| 04 | Kasutajad, ettevõtted ja õigused | Tehnilised põhivood ja paigaldus tehtud; vastuvõtt osaline | [CHAPTER-04](CHAPTER-04.md), G03 õiguste maatriks ja [G09 tugivaade](SUPPORT-G09.md). F-03 parandatud ja paigaldatud. Päris SMTP/kontovoo ning sõltumatu kasutaja vastuvõtt avatud. |
| 05 | Domeenid ja kodulehele lisamine | Tehniline teostus ja kolme mootori tõendid olemas | [CHAPTER-05](CHAPTER-05.md), [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): iframe/modaal, CSP, vead ja küpsisepiirangute tõendatud ulatus. Päris Safari/seadmed ja sõltumatu kasutaja vastuvõtt avatud. |
| 06 | Teenused ja töötajate seosed | Osaline | [CHAPTER-06](CHAPTER-06.md): gruppide hierarhia, teenuste vaikeväärtused, töötajaprofiilid, pärimine/erisused, arhiveerimine, õigused, audit ja versioonikontroll. Peatükk 10 lisab peidetud teenuse käsitsi broneerimise ning lahkunud töötaja ligipääsu sulgemise ja lahendamist ootavad ajad. Täielik brauserimaatriks jääb avatuks. |
| 07 | Töögraafik ja vabade aegade reeglid | Osaline | [CHAPTER-07](CHAPTER-07.md): asukoha/töötaja nädalagraafikud, perioodi erandid, õigused, reeglite haldus, versioonid, audit ja broneeringukonfliktid. Kliendi tingimused kontrollitakse uuesti; kontaktid säilivad. Kalender ja käsitsi erandid on hiljem lisatud; täielik brauserimaatriks jääb avatuks. |
| 08 | Kliendi broneerimisteekond | Osaline | [CHAPTER-08](CHAPTER-08.md): isiklik link, järgmise vaba päeva otsing, kontaktid, kokkuvõte, korduskindel kinnitus ja ICS. Peatükk 10 lisab omaniku poliitikaga halduslingi ning muudetud loomise kordusvastuse eristamise. Kasutatavuse tervikvastuvõtt jääb ptk 12/25. |
| 09 | „Töötaja pole oluline” täpne loogika | Osaline | [CHAPTER-09](CHAPTER-09.md): konkreetsed pakkumised, sama kellaaja hinna/kestuse eristamine, valitud päeva ajapuuduse teade ning automaatse asendamise keeld. Koondsaadavus, valikute muutmine, konkurents ja hilinenud vastused kontrollitud. O-06 automaatse töötajamääramise reegel ja täielik kasutatavuse vastuvõtt jäävad avatuks. |
| 10 | Muutmised, tühistamine ja erandolukorrad | Osaline; põhiteostus kontrollitud | [CHAPTER-10](CHAPTER-10.md): atomaarne muutmine/tühistamine, õigused, tähtaja põhjendatud erand, versioonid ja korduspäringud, omaniku poliitikaga halduslink, käsitsi e-postita broneering, seisundid/ajalugu, puudumise ja lahkumise lahendamist ootavad ajad. 104 testi ja brauseri põhivood läbivad. Tegelik meilisaatmine ning täielik turva/kasutatavuse vastuvõtt jäävad ptk 16/17/25. |
| 11 | Töötaja kalender ja ettevõtte haldus | Serveris; tehnilised kalendri- ja koormuskatsed tehtud | [CHAPTER-11](CHAPTER-11.md), [ptk 24](CHAPTER-24.md) haldusvormide parandus ning [ptk 26](CHAPTER-26.md) 30/30 kalendrimuudatust ka koormuse all. Lõplik kujundus ja sõltumatu kasutatavuse vastuvõtt avatud. |
| 12 | Kujundus, ligipääsetavus ja keeled | Kohalik keele- ja ligipääsetavuse teostus; kujundus ootel | [CHAPTER-12](CHAPTER-12.md): et/en/ru kataloogid, eraldi kliendi/haldaja/ettevõtte keel, väljade vead, fookus ja vormi säilitav modaal. 119 testi ja Chromiumi kontrollid. Ekraanilugeja/brauserimaatriks ning kujunduse vastuvõtt on veel vajalikud. |
| 13 | Andmemudel ja põhiinvariandid | Kohalik mudel ja piirangud teostatud | [CHAPTER-13](CHAPTER-13.md): 43 tabeli/vaate skeem, tugevdatud aja-/versioonipiirangud ning arvelduse, failide, impordi/ekspordi ja säilitamise alus. 136 testi; hilisemate peatükkide töövood pole tabelite olemasolu tõttu valmis. |
| 14 | Tarkvara arhitektuur ja komponendid | Kohalik alus teostatud | [CHAPTER-14](CHAPTER-14.md): moodulite vastutused, vaikimisi serveripoolsed teegid ja automaatne impordigraafi kontroll ehituses. Taustatööde, failide ning taristu tervikvastuvõtt vastavates hilisemates peatükkides. |
| 15 | Broneerimismootor ja samaaegsus | Tehniline teostus ja konkurentsikatsed tehtud | [CHAPTER-15](CHAPTER-15.md), [ptk 24](CHAPTER-24.md) õigsus ning [ptk 26](CHAPTER-26.md) serveri koormus/halduskonkurents. Avaliku Turnstile 50 kliendi katset ei väideta. |
| 16 | Ettevõtete eraldatus ja turvanõuded | Olemasoleva API kontrollid teostatud | [CHAPTER-16](CHAPTER-16.md): jagatud PostgreSQL-i mahupiir, täpne Origin, ohutud koondsignaalid ja ASVS 5.0.0 jälgitavus. 151 testi; failide ja hilisemate töövoogude ning tootmise tervikvastuvõtt jäävad avatuks. |
| 17 | E-kirjad ja oma saatmislahendus | Kohalik töövoog teostatud; päris SMTP ootel | [CHAPTER-17](CHAPTER-17.md): eraldi rendiga töötaja, korduskatsed, meeldetuletused, owner-seaded ja tagasiside, keeleline capture-katse ning Docker worker. 161 testi. Saatjadomeeni/SMTP pärisvastuvõtt ja arve-/impordiseos vastavates peatükkides. |
| 18 | Liitumine, import, eksport ja lahkumine | Teostus ja piiritletud serveri HTTP-vastuvõtt tehtud | [CHAPTER-18](CHAPTER-18.md), [ptk 26](CHAPTER-26.md): kliendi-/broneeringuimport, eksporditöötaja, õigused ja lahkumistähtajad. Kõigi vormide kasutatavus, SMTP ja kinnitatud säilitusleping avatud. |
| 19 | Kuutasu, paketid ja arveldus | Töös | 35 € lõpphind kuus, töötajate arv piiramatu, prooviperioodita; maksetähtaeg 7 päeva ja hilinemise lisaaeg 0. Tellimus, arve väljastamine/printimine, laekumised, laekumiskirje parandus ja värske kasutusõiguse kontroll on teostatud. Täielik kreeditarve, Maksekeskuse makselink/püsimakse, tagastuste võrdlus, automaatne kuuperiooditöö ning arvekirjad ja tähtajaületuse meeldetuletus on kohalikult teostatud. Ajaloolise täielikult krediteeritud arve asendamine on teostatud. Pakkuja/SMTP pärisvastuvõtt ja lõplik läbiv vastuvõtt on veel avatud. [CHAPTER-19](CHAPTER-19.md). |
| 20 | Ainuõigused ja kopeerimisriski vähendamine | Osaline; lepingud otsustada | [CHAPTER-20](CHAPTER-20.md): hoidla privaatsus kontrollitud, lukufaili register ja paigaldatud pakettide litsentsiteated kogutud, Linuxi konteineri inventuur kontrollitud. Puuduvad litsentsitekstid ja lepinguline õiguste ahel vajavad kinnitamist. |
| 21 | Andmekaitse ja säilitamine | Kohalikud põhivood teostatud; tähtajad ja tootmise sõltuvused avatud | [CHAPTER-21](CHAPTER-21.md): isikupõhine andmepakett, eelvaatega kontaktide eemaldamine, auditikoopiate puhastus, linkide/eksportide tühistamine, impordi algandmete koristus ja säilituskava haldus. 241 testi ja ehitus läbivad. Automaatne säilitustöö, lepingud ja välised koopiad on veel vajalikud. Taastamisregistri lepitus on ptk 22-s lisatud, ja auditi F-04 kliendiajaloo kuvamisviga on kohalikult parandatud. |
| 22 | Taristu, käitamine ja taastamine | Tehniline alus ning sama VPS-i täielik taastamiskatse tehtud | [CHAPTER-22](CHAPTER-22.md), [ptk 26](CHAPTER-26.md): DB, failid, uuem register ja taastatud rakendus. Väline server/võtmehoid, ajastused/häired, WAL/RPO/RTO ja sõltumatu paigaldus G08 all ootel. |
| 23 | Arenduse etapid ja tööde vastuvõtt | Audit ja register tehtud; etappide vastuvõtt avatud | [CHAPTER-23](CHAPTER-23.md): viis koodi-/konfiguratsioonileidu, peatükkide 01–30 failikatvus, E0–E10 seis, AT-01–48 tõendimaatriks ja hinnatud järgmiste tööde register. F-01–F-05 kohalik parandus kontrollitud: [järelraport](CHAPTER-23-FIXES.md). 261 testi, tüübikontroll, 48 migratsiooni ja Docker runner build läbivad; kogu V1 vastuvõtt on avatud. |
| 24 | Vastuvõtutestid: broneerimise õigsus | Tehniline vastuvõtt lõpetatud 10.09.2026 | [CHAPTER-24](CHAPTER-24.md): 18/18 nõuet ja viis lisakontrolli tõendatud; 290 testi, kolm brauserimootorit, P24-F01 vormiparandus. Pärisseadmed/ekraanilugejad ja käitamise vastuvõtt ptk 25–26. |
| 25 | Vastuvõtutestid: turve ja kasutatavus | Tehnilised tõendid olemas; kasutajavastuvõtt kujunduse järel | [CHAPTER-25](CHAPTER-25.md): õiguste ja brauserite automaatne maatriks tehtud. Omaniku 10.09 otsusel pärisseadmete ja sõltumatu kasutaja katsed pärast kujundust; ekraanilugejat testib pime inimene. Täielik vastuvõtt on ootel. |
| 26 | Vastuvõtutestid: käitamine ja kuutasu | Serveri tehniline voor läbitud; välised sõltuvused ootel | [CHAPTER-26](CHAPTER-26.md): AT-47/48, import/eksport, konkurents, sisemine arveldus, lahkumine ja samal VPS-il täisandmete taastamine. SMTP, Maksekeskus, väline varukoopia ning inimvastuvõtt hiljem. |
| 27 | Töömaht, kulud ja äriline kontroll | Algplaaniga võrreldud; otsused/tõendid avatud | [Ptk 27 võrdlus](REMAINING-WORK.md): algsed tunni-/kulunäited ei ole eelarve. Alles jäävad kinnitatud töömaht, hoolduskulud ning G02 piloodi tegelikud tulemused. |
| 28 | Otsustamata detailid ja riskid | O-01–O-12 koondatud; osaliselt kinnitatud | [Iga O-otsuse kinnitatud ja lahtine osa](REMAINING-WORK.md). Hind, prooviperioodi puudumine ja tähtaeg ei sulge O-02–O-04 ülejäänud küsimusi. |
| 29 | Üleandmine ja dokumendiga jätkamine | Üheksa üleantava osa register tehtud; vastuvõtt osaline | [Üleandmise nõuded](REMAINING-WORK.md), [juhendite sisukord](README.md). Kasutaja/platvormihalduri juhendid ja vastuvõtt, õigused/litsentsid, hooldaja/asendaja ning AT-44/G08 veel vajalikud. |
| 30 | Arutelu ajalugu ja asendatud ettepanekud | Algplaaniga võrreldud | [Asendatud ettepanekute koond](REMAINING-WORK.md) säilitab kliendi ajavaliku, oma kalendri ja hilisema Maksekeskuse kuutasu erandi. Ajaloolised hinnad ega maketid ei asenda kehtivaid nõudeid. |

**08.09 auditi algseisu täpsustus (F-01–F-05 on hiljem kohalikult parandatud; [järelraport](CHAPTER-23-FIXES.md)):** varasemad peatükkide teostuskirjeldused säilivad ajaloolise alusena. Ptk 04/06/10 õiguste elutsüklis on F-03; ptk 08/10 avalikus kinnituses F-02; ptk 11/21/22 taastatud kliendivaates F-04; ptk 18/22 proksi impordipiiris F-05; ptk 19 maksekatsetes F-01. Selle algseisu ajal puudus ka tugivaade; G09 teostus ja paigaldus on nüüd tehtud. Automaatne säilitustöö jääb kinnitatud andmelepinguni avatuks. Täpne praegune tulemus on [AT-maatriksis](CHAPTER-23-ACCEPTANCE.md).

Lisa A ja B: kujundus ootel. Lisa C: ajavaliku funktsionaalne nõue kehtib; klient valib aja ise. Lisa D ja allikad on mõistete ning tehniliste valikute taust, mitte valmimise tõend.

## Peatükk 01: esimese müüdava versiooni tulemused

Peatükk 01 on ülejäänud peatükkide koondnõue. Selle läbivaatamine ei tähenda, et kogu V1 on valmis. Iga puuduv tulemus viiakse vastava detailpeatüki töödesse.

| Valdkond dokumendist | Praegune tulemus | Veel vaja / detailpeatükid |
| --- | --- | --- |
| Ettevõttekeskkond | Demoettevõtted, domeeniseosed, graafikud, broneerimisreeglid ja omaniku kontakt-/halduslingi seaded | Loomise/seadistamise viisard ja avaldamine on kohalikult olemas (18); kujundus ootel (12), tervikvastuvõtt avatud (23) |
| Teenused ja töötajad | Õigustega haldus, grupid, vaikeväärtused, pärimine, graafikud ja arhiveerimine (04, 06, 07, 10) | Terviklik kasutatavuse ja vastuvõtu kontroll (12, 24, 25) |
| Avalik broneerimine | Põhivoog, isiklik otselink, konkreetsed pakkumised ja erandolukordade kontrollid (08–10) | Täielik kasutatavuse ja vastuvõtu protokoll (24–25) |
| Kalender ja kliendid | Päeva-/nädalakalender, töötajafilter, mobiililoend, kliendikaardid/ajalugu/parandamine, eksport, mõõdikud ja taustavärskendus (10–11) | Paigaldus ning ptk 26 kalendri/koormuse tehniline katse tehtud; piloot ja kujundusejärgne kasutatavuse vastuvõtt (12/25) avatud |
| Kliendi iseteenindus | Omaniku poliitikaga vaatamis-, muutmis- ja tühistamislink ning versioonitud ICS (10) | Turva ja kasutatavuse tervikvastuvõtt (16, 25) |
| Teavitused | Versioonitud outbox, saatja, meeldetuletused, rendid, korduskatsed ja saatmishetke kontroll olemas (17) | Päris SMTP vastuvõtt 23-G05 |
| Veebilehele lisamine | Link, lubatud päritolud, iframe, modaal ja varulink olemas (05) | Laiem brauserite ja veebiehitajate vastuvõtt (12/25) |
| Kuutasu ja platvormihaldus | 35 € plaan, perioodid, arved/kreeditarved, laekumised ja Maksekeskuse ühendus kohalikult olemas (19) | 23-G09 omaniku vastuvõtt, pakkuja/SMTP pärisvastuvõtt |
| Käivitamine ja andmed | Viisard, testrežiim, import/eksport, audit, lahkumine ja kontaktide eemaldamine kohalikult olemas (18, 21) | Proksi paigaldus ja ptk 26 HTTP-katsed tehtud; säilitusleping/automaatika G07 ning täielik üleandmine avatud |
| Turvalisus ja käitamine | RLS, rollid/MFA, oma taristu, kohalik taastamiskaitse ja seiretööriistad | Migratsioon 048/parandused paigaldatud, sama VPS-i taastamine ja koormus kontrollitud; väline varundus/hoiatused ja sõltumatu vastuvõtt avatud |

## Järgmine teostuskoht

Järgmiseks sobib **G01 tehniline litsentsiinventuur**. Allesjäänud tööde ja D-/O-otsuste koond on koostatud, kuid omaniku kooskõlastus, lõpliku väljalaske litsentsid/õigused ning üleandmine on avatud. [Täpne tööde register](REMAINING-WORK.md) määrab iga töö sisendi, sõltuvuse ja sulgemise tõendi.

G02 intervjuu-/piloodiprotokolle ning G07 andmelepinguprojekti/kuivkäigu kavandit saab ette valmistada. Kujundus, pärisseadmete ja sõltumatu kasutaja vastuvõtt, SMTP/Maksekeskuse seadistus ning väline varundus/häired jätkuvad omaniku määratud ajal. Lõpetatud tehnilisi kontrolle ei korrata ilma uue muudatuse või konkreetse kahtluseta.

## Tõendite piir

Algse võrdluse ajal oli 12 broneerimismootori testi ja 4 otsingunähtavuse testi. Peatüki 04 uued kontrollid ja tegelik tulemus on [CHAPTER-04.md](CHAPTER-04.md). **Kooditestide arv ei tähenda 48 dokumendi vastuvõtutesti läbimist.** Brauseris kinnitatud proovibroneering tõendab konkreetset põhivoogu. Varasemate kontrollide ulatus on failis [VALIDATION.md](VALIDATION.md).
