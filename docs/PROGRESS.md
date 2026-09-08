# Arendusplaani täitmise register

Alus: `Broneerimisplatvorm_arendusplaan_v1_0.docx`, versioon 1.0, 06.09.2026. Võrdlus tehtud 07.09.2026 rakenduse commit'i `7c89d6e` suhtes. See register ei muuda lähteplaani ega asenda omaniku vastuvõttu.

## Töökorra parandus

Omanik täpsustas, et arendus peab käima dokumendi peatükkide kaupa. Varasemalt ehitati valitud tehnilised osad, kuid puudus peatükkidega seotud täitmisregister. Praegune rakendus on peamiselt E2 läbiv tehniline katse, mitte terviklik V1.

Nõudeid käsitletakse sisukorra järjekorras. Iga arendusülesanne seotakse peatüki, D-otsuse ja sobiva AT-testiga; selle juurde märgitakse eesmärk, sisendid, eeltingimused, põhikäik, vead, õigused, andmete/teavituste mõju, sõltuvused, hinnang ja valmimise tõend (ptk 23). Kui teostus vajab hilisema peatüki alust, märgitakse sõltuvus registrisse. Puuduvat osa ei jäeta vaikimisi välja ega märgita peatükki tervikuna valmis ühe töötava alamfunktsiooni põhjal.

Kujundus on omaniku korraldusel praegu ootel. See ei vabasta funktsionaalsetest, klaviatuuri- ega ligipääsetavuse nõuetest. Uut kujundust ei teostata enne omanikuga suuna kokkuleppimist; dokumendi manustatud näidised kuuluvad siis läbivaatamisele.

Staatus **osaline** tähendab, et leidub teostus või tõend, kuid peatüki kõik nõuded pole täidetud. **Tegemata** tähendab, et nõutud funktsiooni või vastuvõtu tõendit ei ole. **Otsustada** tähendab omaniku ärilist või käitamise otsust, mida koodi olemasolust ei järeldata. Allolev on esmane koodiga võrdlus; see ei ole kõigi nõuete lõplik vastuvõtt.

## Peatükkide seis

| Ptk | Dokumendi peatükk | Seis | Olemasolev tõend ja puuduv töö |
| --- | --- | --- | --- |
| 01 | Toode ja esimese versiooni eesmärk | Osaline | Ühine rakendus ja kaks eraldatud demot. V1 tulemuste detailne võrdlus allpool. |
| 02 | Ulatusest väljas ja järgmised versioonid | Piirid kirjeldatud | [ROADMAP](ROADMAP.md) jätab SMS-id, kaardimaksed, väliskalendrid ja mitu asukohta hilisemaks. Neid ei loeta valmis funktsioonideks. |
| 03 | Lukustatud otsuste register | Osaline | D-01, D-04–08, D-10–12 ja D-14 põhimõtted kajastuvad mootoris. Isiklik otselink D-09 on teostatud peatükis 08 ja D-13 halduslink peatükis 10; D-16 kalender ja D-20 arveldus puuduvad. D-15 kujundus on ootel. Õiguslike ja äriliste otsuste täitmist ei tõenda kood. |
| 04 | Kasutajad, ettevõtted ja õigused | Osaline | [CHAPTER-04](CHAPTER-04.md): kutsega kontod, e-posti kinnitus, sessioonid, rollid, liikmesused, TOTP/varukoodid, ligipääsu sulgemine ja omaniku üleandmine. Tootmise SMTP/algomanik ja tulevaste kalendri-/kliendivaadete õigustega ühendamine on veel vajalikud. |
| 05 | Domeenid ja kodulehele lisamine | Osaline | [tenants.ts](../src/lib/tenants.ts), [SERVER](SERVER.md): [CHAPTER-05](CHAPTER-05.md): püsiv domeenireservatsioon, käitaja HTTPS-käsk, lubatud kodulehed, iframe ja modaal. Laiem brauserimaatriks ning iseteeninduslik liitumine jäävad hilisemate peatükkide tööks. |
| 06 | Teenused ja töötajate seosed | Osaline | [CHAPTER-06](CHAPTER-06.md): gruppide hierarhia, teenuste vaikeväärtused, töötajaprofiilid, pärimine/erisused, arhiveerimine, õigused, audit ja versioonikontroll. Peatükk 10 lisab peidetud teenuse käsitsi broneerimise ning lahkunud töötaja ligipääsu sulgemise ja lahendamist ootavad ajad. Täielik brauserimaatriks jääb avatuks. |
| 07 | Töögraafik ja vabade aegade reeglid | Osaline | [CHAPTER-07](CHAPTER-07.md): asukoha/töötaja nädalagraafikud, perioodi erandid, õigused, reeglite haldus, versioonid, audit ja broneeringukonfliktid. Kliendi tingimused kontrollitakse uuesti; kontaktid säilivad. Kalender, käsitsi erandid ja täielik brauserimaatriks jäävad hilisematesse peatükkidesse. |
| 08 | Kliendi broneerimisteekond | Osaline | [CHAPTER-08](CHAPTER-08.md): isiklik link, järgmise vaba päeva otsing, kontaktid, kokkuvõte, korduskindel kinnitus ja ICS. Peatükk 10 lisab omaniku poliitikaga halduslingi ning muudetud loomise kordusvastuse eristamise. Kasutatavuse tervikvastuvõtt jääb ptk 12/25. |
| 09 | „Töötaja pole oluline” täpne loogika | Osaline | [CHAPTER-09](CHAPTER-09.md): konkreetsed pakkumised, sama kellaaja hinna/kestuse eristamine, valitud päeva ajapuuduse teade ning automaatse asendamise keeld. Koondsaadavus, valikute muutmine, konkurents ja hilinenud vastused kontrollitud. O-06 automaatse töötajamääramise reegel ja täielik kasutatavuse vastuvõtt jäävad avatuks. |
| 10 | Muutmised, tühistamine ja erandolukorrad | Osaline; põhiteostus kontrollitud | [CHAPTER-10](CHAPTER-10.md): atomaarne muutmine/tühistamine, õigused, tähtaja põhjendatud erand, versioonid ja korduspäringud, omaniku poliitikaga halduslink, käsitsi e-postita broneering, seisundid/ajalugu, puudumise ja lahkumise lahendamist ootavad ajad. 104 testi ja brauseri põhivood läbivad. Tegelik meilisaatmine ning täielik turva/kasutatavuse vastuvõtt jäävad ptk 16/17/25. |
| 11 | Töötaja kalender ja ettevõtte haldus | Osaline | Peatükk 10 lisab päevapõhise loendi, detaili, käsitsi toimingud ja ajaloo. Puuduvad päeva-/nädalakalender, töötajafilter, kliendinimekiri ning taustavärskendus ja selle ühenduseta olek. |
| 12 | Kujundus, ligipääsetavus ja keeled | Kujundus ootel; muu osaline | Kasutatakse HTML-i vaikimisi elemente, nimetatud vormivälju ja sammu fookust. Puuduvad täielik klaviatuuri/ekraanilugeja kontroll, keelesüsteem ja brauserimaatriks. |
| 13 | Andmemudel ja põhiinvariandid | Osaline | Ettevõte/domeen, teenus/töötaja, graafik, broneering, kasutaja/liikmesus, korduspäring, audit, haldustunnused ja outbox olemas. Kliendiregister, paketid, tellimused ja mudeli tervikvastuvõtt puuduvad. |
| 14 | Tarkvara arhitektuur ja komponendid | Osaline | [ARCHITECTURE](ARCHITECTURE.md) dokumenteerib Next.js/pg lahenduse ja erinevuse tehnoloogiaettepanekust. Autentimine ja tehinguline haldus on olemas; taustatööd ning kogu kavandatud arhitektuuri vastuvõtt puuduvad. |
| 15 | Broneerimismootor ja samaaegsus | Osaline | Loomine, muutmine/tühistamine, graafikukirjutused, versioonid ja korduspäringud kasutavad ühist lukustusreeglit. 50 konkureerivat kinnitust, vana aja säilimine ja kaks haldajat on testitud. Täielik koormuskatse ning hilisemate töövoogude vastuvõtt puuduvad. |
| 16 | Ettevõtete eraldatus ja turvanõuded | Osaline | RLS, liitvälisvõtmed, host/Origin, sisendikontroll, rollid/MFA, värske liikmesus, halduslink ja päringupiirang on teostatud. V1 ASVS-i tervikvastuvõtt, failide ja hilisemate töövoogude kaitse jäävad avatuks. |
| 17 | E-kirjad ja oma saatmislahendus | Osaline | Loomise/muutmise/tühistamise ülesanded salvestuvad tehingus; vana versiooni ootel ülesanded tühistatakse, e-postita ülesanne märgitakse vahele jäetuks. Puuduvad broneeringukirjade saatja, SMTP seadistus, jälgitavad korduskatsed, meeldetuletused ja versiooni lõppkontroll saatmisel. |
| 18 | Liitumine, import, eksport ja lahkumine | Tegemata | Demoseemendus ei asenda seadistusviisardit, CSV-importi/-eksporti, duplikaatide lahendust ega lahkumise töövoogu. |
| 19 | Kuutasu, paketid ja arveldus | Tegemata; väärtused otsustada | Puuduvad paketid, perioodid, arved, laekumised, tähtajad ja ligipääsu üleminekud. Hinda ei ole omaniku eest määratud. |
| 20 | Ainuõigused ja kopeerimisriski vähendamine | Osaline; lepingud otsustada | Privaatne hoidla ja [sõltuvuste loend](DEPENDENCIES.md) olemas. Need ei tõenda lepinguliste õiguste üleandmist ega lepingute olemasolu. |
| 21 | Andmekaitse ja säilitamine | Osaline; tähtajad otsustada | Avalik saadavus ei väljasta kliendikontakte; logimine piiratud. Säilitusreeglid, kustutamine/anonüümimine, taotlused ja lepingud puuduvad. |
| 22 | Taristu, käitamine ja taastamine | Osaline | Docker, VPS, Nginx, HTTPS ja paigaldusjuhend olemas. Puuduvad välise varunduse terviklahendus, taastamisproov ja seire; `/api/health` tõendab vaid protsessi elusolekut. |
| 23 | Arenduse etapid ja tööde vastuvõtt | Osaline | E2 kohta on testitõendeid. Varasem tööregister puudus; käesolev register alustab nõuete jälgimist. E0/E1 ega E3–E10 valmimist ei ole tõendatud. |
| 24 | Vastuvõtutestid: broneerimise õigsus | Osaline | [VALIDATION](VALIDATION.md) ja peatükkide 06–10 tõendid katavad isiklikku linki, graafiku samaaegsust, atomaarset muutmist, halduse versioone ning töötaja lahkumist. AT-01–18 koondvastuvõtt vajab eraldi lõppprotokolli. |
| 25 | Vastuvõtutestid: turve ja kasutatavus | Osaline | Eraldatuse, rollide/sessioonide, halduslingi, GET-i kõrvaltoimete puudumise ning manustamise kontrollid on olemas. Täielik ASVS-i, klaviatuuri/ekraanilugeja ja brauserite maatriks puudub. |
| 26 | Vastuvõtutestid: käitamine ja kuutasu | Tegemata tervikuna | Varasem paigaldus ei asenda AT-36–48 vastuvõttu. Puuduvad meilide, arvelduse, taastamise, lahkumise, teise arendaja paigalduse ning lähtekoormuse terviktõendid. |
| 27 | Töömaht, kulud ja äriline kontroll | Otsustada | Puuduvad kinnitatud eelarve, töömahud, piloodi maksmisvalmiduse ja tulemuste tõendid. |
| 28 | Otsustamata detailid ja riskid | Osaliselt otsustatud | Domeen, haldusaadress, VPS ja tehnoloogia suund on vestluses täpsustatud. O-02–08 ja O-10–12 on olulises osas lahtised; O-01/O-09 pole tervikuna lahendatud. |
| 29 | Üleandmine ja dokumendiga jätkamine | Osaline | Kood omaniku hoidlas, käivitamis-/serverijuhend ja kontrollide kirjeldus olemas. Puudub täielik üleandmine, kõigi nõuete vastuvõtt ning sõltumatu paigaldus/taastamine. |
| 30 | Arutelu ajalugu ja asendatud ettepanekud | Taustmaterjal | Ajaloolisi ettepanekuid ei käsitleta kehtivate nõuetena. Kehtivust kontrollitakse D-registri, tekstiliste nõuete ja omaniku hilisemate korralduste järgi. |

Lisa A ja B: kujundus ootel. Lisa C: ajavaliku funktsionaalne nõue kehtib; klient valib aja ise. Lisa D ja allikad on mõistete ning tehniliste valikute taust, mitte valmimise tõend.

## Peatükk 01: esimese müüdava versiooni tulemused

Peatükk 01 on ülejäänud peatükkide koondnõue. Selle läbivaatamine ei tähenda, et kogu V1 on valmis. Iga puuduv tulemus viiakse vastava detailpeatüki töödesse.

| Valdkond dokumendist | Praegune tulemus | Veel vaja / detailpeatükid |
| --- | --- | --- |
| Ettevõttekeskkond | Demoettevõtted, domeeniseosed, graafikud, broneerimisreeglid ja omaniku kontakt-/halduslingi seaded | Loomise/seadistamise viisard ja avaldamise tervikvoog (18); kujundus ootel (12) |
| Teenused ja töötajad | Õigustega haldus, grupid, vaikeväärtused, pärimine, graafikud ja arhiveerimine (04, 06, 07, 10) | Terviklik kasutatavuse ja vastuvõtu kontroll (12, 24, 25) |
| Avalik broneerimine | Põhivoog, isiklik otselink, konkreetsed pakkumised ja erandolukordade kontrollid (08–10) | Täielik kasutatavuse ja vastuvõtu protokoll (24–25) |
| Kalender ja kliendid | Broneeringute päevapõhine loend, detail, käsitsi toimingud ja ajalugu (10) | Päeva-/nädalakalender, töötajafilter, kliendinimekiri ja taustavärskendus (11) |
| Kliendi iseteenindus | Omaniku poliitikaga vaatamis-, muutmis- ja tühistamislink ning versioonitud ICS (10) | Turva ja kasutatavuse tervikvastuvõtt (16, 25) |
| Teavitused | Loomise, muutmise ja tühistamise versioonitud outbox; vanade ootel teadete sulgemine ja e-postita erand (10) | Saatmine, meeldetuletused, korduskatsed ja saatmishetke lõppkontroll (17) |
| Veebilehele lisamine | Link, lubatud päritolud, iframe, modaal ja varulink olemas (05) | Laiem brauserite ja veebiehitajate vastuvõtt (12/25) |
| Kuutasu ja platvormihaldus | Puudub | Paketid, perioodid, arved, maksed, ettevõtete ja tõrgete haldus (19, 22) |
| Käivitamine ja andmed | Demoseemendus olemas | Viisard, testrežiimi täielik elutsükkel, import/eksport, audit, lahkumine (18, 21) |
| Turvalisus ja käitamine | Andmebaasi eraldatus, HTTPS, oma taristu ja juhend | Õigused, varundus, taastamine, seire ja terviklikud vastuvõtutestid (04, 16, 22, 25–26) |

## Järgmine teostuskoht

Peatüki **04: kasutajad, ettevõtted ja õigused** teostus ja kontrollitõendid on [eraldi registris](CHAPTER-04.md). See lisandus täpsustab ka peatükkide 11, 13, 14, 16 ja 25 varasemat autentimise/õiguste puudujääki; nende peatükkide muud tööd jäävad avatuks. Peatüki 17 SMTP sõltuvus tuleb lõpetada enne päris kontode avamist. Halduskalendrit ega teenuste muutmise nuppe ei loeta valmis enne serveripoolsete õigustega ühendamist. Peatüki 05 teostus on kirjeldatud [CHAPTER-05.md](CHAPTER-05.md). Peatüki 06 teostus ja omaniku teenusegruppide täpsustus on [CHAPTER-06.md](CHAPTER-06.md). Peatüki 07 teostus on [CHAPTER-07.md](CHAPTER-07.md). Peatüki 08 teostus ja piirid on [CHAPTER-08.md](CHAPTER-08.md). Peatüki 09 teostus ja tõendid on [CHAPTER-09.md](CHAPTER-09.md). Peatüki 10 teostus ja tõendid on [CHAPTER-10.md](CHAPTER-10.md). Järgmine põhiteostus on peatükk 11: töötaja kalender ja ettevõtte haldus.

## Tõendite piir

Algse võrdluse ajal oli 12 broneerimismootori testi ja 4 otsingunähtavuse testi. Peatüki 04 uued kontrollid ja tegelik tulemus on [CHAPTER-04.md](CHAPTER-04.md). **Kooditestide arv ei tähenda 48 dokumendi vastuvõtutesti läbimist.** Brauseris kinnitatud proovibroneering tõendab konkreetset põhivoogu. Varasemate kontrollide ulatus on failis [VALIDATION.md](VALIDATION.md).
