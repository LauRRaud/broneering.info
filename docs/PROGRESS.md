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
| 03 | Lukustatud otsuste register | Osaline | D-01, D-04–08, D-10–12 ja D-14 põhimõtted kajastuvad olemasolevas mootoris. Isiklik otselink D-09 puudub; D-13 halduslink, D-16 kalender ja D-20 arveldus puuduvad. D-15 kujundus on ootel. Õiguste ja äriliste otsuste täitmist ei tõenda kood. |
| 04 | Kasutajad, ettevõtted ja õigused | Osaline | [CHAPTER-04](CHAPTER-04.md): kutsega kontod, e-posti kinnitus, sessioonid, rollid, liikmesused, TOTP/varukoodid, ligipääsu sulgemine ja omaniku üleandmine. Tootmise SMTP/algomanik ja tulevaste kalendri-/kliendivaadete õigustega ühendamine on veel vajalikud. |
| 05 | Domeenid ja kodulehele lisamine | Osaline | [tenants.ts](../src/lib/tenants.ts), [SERVER](SERVER.md): [CHAPTER-05](CHAPTER-05.md): püsiv domeenireservatsioon, käitaja HTTPS-käsk, lubatud kodulehed, iframe ja modaal. Laiem brauserimaatriks ning iseteeninduslik liitumine jäävad hilisemate peatükkide tööks. |
| 06 | Teenused ja töötajate seosed | Osaline | [skeem](../db/migrations/001_booking.sql), [availability.ts](../src/lib/availability.ts): teenuse-töötaja seosed, hind/kestus, aktiivsus ja avalik valik. Puuduvad haldus, teenuse vaikehind/-kestus ja erisuste haldus, grupihaldus ning arhiveerimise töövoog. |
| 07 | Töögraafik ja vabade aegade reeglid | Osaline | Mootoris on nädalagraafik, erandid, puhvrid, ajasamm, etteteatamine ja ajavöönd. [Põhitestid](../tests/booking.test.ts) katavad mitut reeglit. Puuduvad graafiku haldus ja selle samaaegsuse kontroll broneerimisega; demo vaikeväärtused ei ole kinnitatud tootmisreeglid. |
| 08 | Kliendi broneerimisteekond | Osaline | [booking-flow.tsx](../src/components/booking-flow.tsx): valikud, kontaktid, kokkuvõte, serverikinnitus, ICS ja põhivead. Töötaja isiklik otselink ning kõigi veaolukordade brauserikontroll puuduvad. |
| 09 | „Töötaja pole oluline” täpne loogika | Osaline | Kõigi sobivate töötajate konkreetsed pakkumised, aeg jääb kliendi valida. Hind/kestus ja töötaja on pakkumises ning kokkuvõttes. O-06 võrdsete pakkumiste lõplik käsitlus on kinnitamata. |
| 10 | Muutmised, tühistamine ja erandolukorrad | Tegemata | Loomine töötab, aga muutmise/tühistamise API, turvaline halduslink, õigused ja versioonikonfliktide voog puuduvad. Andmebaasi `cancelled` väärtus ei ole valmis tühistamisfunktsioon. |
| 11 | Töötaja kalender ja ettevõtte haldus | Tegemata | Haldusleht on tekstiline arendusseis. Puuduvad päeva-/nädalavaade, mobiililoend, käsitsi haldus, kliendinimekiri, audit ja taustavärskendus. |
| 12 | Kujundus, ligipääsetavus ja keeled | Kujundus ootel; muu osaline | Kasutatakse HTML-i vaikimisi elemente, nimetatud vormivälju ja sammu fookust. Puuduvad täielik klaviatuuri/ekraanilugeja kontroll, keelesüsteem ja brauserimaatriks. |
| 13 | Andmemudel ja põhiinvariandid | Osaline | Ettevõte/domeen, teenus/töötaja, graafik, broneering, korduspäring ja outbox olemas. Puuduvad nt kasutaja/liikmesus, kliendiregister, audit, haldustunnused, paketid ja tellimused. |
| 14 | Tarkvara arhitektuur ja komponendid | Osaline | [ARCHITECTURE](ARCHITECTURE.md) dokumenteerib Next.js/pg lahenduse ja erinevuse tehnoloogiaettepanekust. Autentimine ja taustatööd puuduvad; kogu kavandatud arhitektuuri vastavus ei ole kinnitatud. |
| 15 | Broneerimismootor ja samaaegsus | Osaline | [bookings.ts](../src/lib/bookings.ts): lukud, värske saadavuse kontroll, tehing ja korduspäringud. 50 konkureerivat kinnitust testitud. Graafikukirjutused, muutmine/tühistamine ja vananenud haldusversioonid puuduvad. |
| 16 | Ettevõtete eraldatus ja turvanõuded | Osaline | RLS, liitvälisvõtmed, täpne host, sisendikontroll ja protsessipõhine päringupiirang. Puuduvad autentimine, rollid, MFA, halduslink ning V1 terviklik turvakontroll. |
| 17 | E-kirjad ja oma saatmislahendus | Osaline | Teavitusülesanne salvestatakse loomisega samas tehingus. Puuduvad saatja, SMTP seadistus, jälgitavad korduskatsed, meeldetuletused ja sündmuse versiooni kontroll saatmisel. |
| 18 | Liitumine, import, eksport ja lahkumine | Tegemata | Demoseemendus ei asenda seadistusviisardit, CSV-importi/-eksporti, duplikaatide lahendust ega lahkumise töövoogu. |
| 19 | Kuutasu, paketid ja arveldus | Tegemata; väärtused otsustada | Puuduvad paketid, perioodid, arved, laekumised, tähtajad ja ligipääsu üleminekud. Hinda ei ole omaniku eest määratud. |
| 20 | Ainuõigused ja kopeerimisriski vähendamine | Osaline; lepingud otsustada | Privaatne hoidla ja [sõltuvuste loend](DEPENDENCIES.md) olemas. Need ei tõenda lepinguliste õiguste üleandmist ega lepingute olemasolu. |
| 21 | Andmekaitse ja säilitamine | Osaline; tähtajad otsustada | Avalik saadavus ei väljasta kliendikontakte; logimine piiratud. Säilitusreeglid, kustutamine/anonüümimine, taotlused ja lepingud puuduvad. |
| 22 | Taristu, käitamine ja taastamine | Osaline | Docker, VPS, Nginx, HTTPS ja paigaldusjuhend olemas. Puuduvad välise varunduse terviklahendus, taastamisproov ja seire; `/api/health` tõendab vaid protsessi elusolekut. |
| 23 | Arenduse etapid ja tööde vastuvõtt | Osaline | E2 kohta on testitõendeid. Varasem tööregister puudus; käesolev register alustab nõuete jälgimist. E0/E1 ega E3–E10 valmimist ei ole tõendatud. |
| 24 | Vastuvõtutestid: broneerimise õigsus | Osaline | [booking.test.ts](../tests/booking.test.ts) ja [VALIDATION](VALIDATION.md). Kõik AT-01–18 ei ole tehtud; muu hulgas puuduvad AT-04 ja AT-14–16 täisteostus/tõendid. |
| 25 | Vastuvõtutestid: turve ja kasutatavus | Osaline | Ettevõtete eraldatuse ja tundmatu hosti testid olemas. Rollid/sessioonid/halduslink, manustamine ja täielik kasutatavuse maatriks puuduvad. |
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
| Ettevõttekeskkond | Kaks demoettevõtet ja domeeniseosed; aadress ning mõned broneerimisreeglid andmebaasis | Loomine, kontaktide/seadete haldus, avaldamise seisund (04, 05, 18); kujundus ootel (12) |
| Teenused ja töötajad | Pakkumiste hind/kestus, seosed, näidisgraafikud ja erandid | Õigustega CRUD, grupid, vaikeväärtused ja arhiveerimine (04, 06, 07) |
| Avalik broneerimine | Töötav põhivoog andmebaasi kinnituseni | Isiklik otselink ja ülejäänud erandolukordade katmine (08–10, 24–25) |
| Kalender ja kliendid | Puudub | Päeva-/nädalavaade, mobiililoend, käsitsi toimingud ja kliendinimekiri (04, 10, 11) |
| Kliendi iseteenindus | ICS-allalaadimine olemas | Turvaline vaatamis-, muutmis- ja tühistamislink (10, 16) |
| Teavitused | Kinnituse outbox-kirje olemas | Saatmine, muudatused, tühistused, meeldetuletused ja korduskatsed (17) |
| Veebilehele lisamine | Link, lubatud päritolud, iframe, modaal ja varulink olemas (05) | Laiem brauserite ja veebiehitajate vastuvõtt (12/25) |
| Kuutasu ja platvormihaldus | Puudub | Paketid, perioodid, arved, maksed, ettevõtete ja tõrgete haldus (19, 22) |
| Käivitamine ja andmed | Demoseemendus olemas | Viisard, testrežiimi täielik elutsükkel, import/eksport, audit, lahkumine (18, 21) |
| Turvalisus ja käitamine | Andmebaasi eraldatus, HTTPS, oma taristu ja juhend | Õigused, varundus, taastamine, seire ja terviklikud vastuvõtutestid (04, 16, 22, 25–26) |

## Järgmine teostuskoht

Peatüki **04: kasutajad, ettevõtted ja õigused** teostus ja kontrollitõendid on [eraldi registris](CHAPTER-04.md). See lisandus täpsustab ka peatükkide 11, 13, 14, 16 ja 25 varasemat autentimise/õiguste puudujääki; nende peatükkide muud tööd jäävad avatuks. Peatüki 17 SMTP sõltuvus tuleb lõpetada enne päris kontode avamist. Halduskalendrit ega teenuste muutmise nuppe ei loeta valmis enne serveripoolsete õigustega ühendamist. Peatüki 05 teostus on kirjeldatud [CHAPTER-05.md](CHAPTER-05.md). Järgmine põhiteostus on peatükk 06: teenused ja töötajate seosed.

## Tõendite piir

Algse võrdluse ajal oli 12 broneerimismootori testi ja 4 otsingunähtavuse testi. Peatüki 04 uued kontrollid ja tegelik tulemus on [CHAPTER-04.md](CHAPTER-04.md). **Kooditestide arv ei tähenda 48 dokumendi vastuvõtutesti läbimist.** Brauseris kinnitatud proovibroneering tõendab konkreetset põhivoogu. Varasemate kontrollide ulatus on failis [VALIDATION.md](VALIDATION.md).
