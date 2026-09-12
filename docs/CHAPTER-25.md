# Peatükk 25 — turve ja kasutatavus

**Seis 10.09.2026: tehnilised tõendid olemas; kujundusejärgne kasutajavastuvõtt ootel.** Peatükki tervikuna lõpetatuks ei märgita.

Omaniku otsus 10.09.2026: omanik praegu ise ei testi; pärisseadmete ja sõltumatu kasutaja katse tehakse pärast kujunduse valmimist. Ekraanilugeja kasutatavust testib **pime inimene**. Automaatne ligipääsetavuse kontroll, DOM-i nimed või arendaja katse ei asenda pimeda testija kasutuskogemust. Selles voorus kasutajakatseid ega ekraanilugeja kuulamiskatset ei tehtud.

## Olemasolev tõend

Lähteplaani peatükk 25 sisaldab AT-19–35, turvalisuse lisalävendit ning kasutatavuse pilooti. Nõuete senised tulemused on [AT-maatriksis](CHAPTER-23-ACCEPTANCE.md).

- [G03 esimene voor](ACCEPTANCE-G03.md): rollid, ettevõtete eraldatus, päris HTTP keelud ning klaviatuuri põhiteekond.
- [G03 lõppvoor](ACCEPTANCE-G03-COMPLETION.md): 505 HTTP-päringut ja üks DB-räsivõrdlus, 14 brauserifaasi, iframe/modaal, piiratud küpsised Chrome'is/Firefoxis ning eri keelte ja ekraanisuuruste kontroll. Need on 09.–10.09 tehtud katsed; neid ei käivitatud selle registri koostamisel uuesti.
- [Piiratud tugivaade](SUPPORT-G09.md): auditeeritud toe ligipääs ja õiguste piirid.
- [Peatükk 24](CHAPTER-24.md): broneerimise õigsuse tehniline vastuvõtt, 290 automaattesti ning kolme mootori värsked halduse kontrollid.

AT-34 vajab veel kujunduse teostust: loetamatu kontrasti blokeerimist ning mustandi ja avaliku kujunduse eraldust. Windowsi WebKit-katse ei tõenda päris Safari/iOS-i kasutatavust. Kogu ASVS-i vastuvõttu ei järeldata brauseri- või õiguste maatriksi läbimisest.

## Jätkamise eeltingimused

Kujundus on teostatud ja testitav versioon fikseeritud commit'i või väljalaske tunnusega. Testimiseks valmistatakse ette sünteetiline ettevõte, teenused, vabad ajad, proovibroneeringud ja eraldi rollikontod. Teavitused suunatakse testkeskkonda. Korraldaja annab testijale vajalikud ligipääsud; paroole, halduslinkide saladusi ega taastamiskoode protokolli ei kirjutata.

Enne katset pannakse kirja tegelik seade, OS, brauseri versioon, keel ning ekraanilugeja nimi ja versioon. Täpsed kombinatsioonid lepitakse kokku olemasolevate seadmete ja pimeda testija kasutatava ekraanilugeja järgi. Praegu ei ole seadmeid ega testijat määratud.

## Pimeda testija ülesanded

Testija kasutab ekraanilugejat ja oma tavapärast juhtimisviisi. Korraldaja annab ülesande eesmärgi ning jälgib; nupu asukohta või õiget klahvijada ette ei öelda. Vajalik abi märgitakse tulemusse.

1. Leia sobiv teenus, töötaja ja aeg; selgita enne kinnitamist valitud hinda, kestust ja töötajat ning lõpeta proovibroneering.
2. Paranda kontaktivälja viga. Kontrolli, et vea põhjus ja parandatav väli on leitavad ning varasemad sisestused säilivad.
3. Muuda teenust või vali päev, kus vabu aegu pole. Leia uus pakkumine ja saa aru, milline varasem valik enam ei kehti.
4. Ava broneerimine kodulehe modaalis, liigu selle sisus, sulge ja ava uuesti. Kontrolli dialoogi teatamist, fookuse järjekorda ja avajale naasmist.
5. Ava kehtiv halduslink ning muuda või tühista proovibroneering teadlikult. Ava seejärel aegunud link ja leia juhis edasiseks tegutsemiseks.
6. Leia testtöötaja või administraatori rollis päeva plaan ja konkreetne broneering. Muuda lubatud aega ning saa aru kinnituse või konflikti tulemusest.

Iga ülesande juures fikseeritakse lõpetamine, vajalik abi, segased nimetused, puuduva või liigse ettelugemise kohad, fookuse kaotus ja dünaamiliste teadete arusaadavus. Protokollis piisab testija kokkulepitud tunnusest ja kasutatud töövahenditest.

## Pärisseadmed ja sõltumatu kasutaja

Päris Safari/macOS/iOS-i ning Androidi katse hõlmab avalikku linki, iframe'i ja modaali; puutejuhtimist, ekraani pööramist, teksti suurendamist/suumi, vormivigu ning piiratud kolmanda osapoole küpsistega broneerimist. Chrome'i ja Firefoxi lõppvoor korratakse valitud toetatud versioonidega.

Sõltumatu klient teeb proovibroneeringu abita. Töötaja leiab päeva plaani ja muudab lubatud aega. Omaniku seadistamisülesandes mõõdetakse seadistusele kuluvat aega. Korraldaja märgib katkestamised, eksitavad tekstid ja abi küsimise kohad. Iga tulemuse juures on kirjas tegelik testija, roll ja töövahend.

Kujundusejärgses tehnilises voorus kontrollitakse uuesti kontrasti, suurendust, klaviatuuri, modaali fookust ja avaldamise/mustandi piire (AT-32–35). Turvalisuse lisalävendis seotakse parooli- ja MFA-taastamise, üleslaadimise, sisendite väärkasutuse, päringupiiride ning logisaladuste tegelikud tõendid [ASVS-i registriga](CHAPTER-16.md). Puuduv või sõltuvuse tõttu tegemata kontroll jääb avatuks.

## Platvormihalduri arusaadavuse vastuvõtt

Omaniku täpsustus 12.09.2026: ka tema platvormihaldus peab olema arusaadav. See on eraldi ettevõtte omaniku igapäevasest broneerimishaldusest. [Platvormihalduri juhendi esmane versioon](PLATFORM-ADMIN-GUIDE.md) on koostatud praeguse lähtekoodi põhjal; allolevaid kasutajakatseid pole tehtud. Kujundus jääb ootele.

Haldur peab saama aru, millist ettevõtet ta parajasti haldab, mida näidatud seisund tähendab, mis põhjustas tõrke, mida saab järgmiseks teha ning mida kinnitamine muudab. Tehnilist veakoodi või arendaja suulist juhendamist ei loeta piisavaks selgituseks. Vajalikud kinnitused ja õiguste piirid peavad olema nähtavad enne toimingut. Täpne lahendus hinnatakse lõpliku kujundusega.

| Ülesanne | Vastuvõtul kontrollitav tulemus |
| --- | --- |
| Leia ettevõte ja selle seis | Haldur tuvastab õige ettevõtte ning eristab seadistamist, avaldamist, maksepiirangut ja lahkumist; eri vormide ettevõttevalik ei eksita |
| Loo testettevõte ja taasta esimese omaniku kutse | Haldur mõistab avaldamata testrežiimi, kutse saajat/aegumist ja seda, kas kiri saadeti; eristab taastamist omanikuvahetusest |
| Leia tellimus, arve ja laekumine | Haldur selgitab 35 € hinda, perioodi, maksetähtaega, tasumata jääki ning piirangu põhjust; leiab õige arve |
| Paranda sünteetiline laekumiskirje või krediteeri testarve | Haldur eristab parandust, kreeditarvet ja tegelikku tagasimakset; saab enne kinnitamist aru mõjust kasutusõigusele ning leiab ajaloo |
| Lahenda makse- või saatmistõrke järgmine samm | Haldur eristab ootel, ebaõnnestunud, kontrollimist vajavat ja edukat tulemust ning test-/päriskeskkonda; teab, millal värskendada, korrata või anda juhtum käitajale. Pärisühenduste katse sõltub G05-st |
| Alusta ja lõpeta auditeeritud tugi | Haldur teab ettevõtet, põhjust, aegumist ja lubatud andmeid; mõistab ainult lugemise piiri ning leiab lõpetamise toimingu. Seos G09 |
| Korralda ettevõtte lahkumise pöördumine | Haldur eristab pausi, tellimuse/andmeligipääsu lõppu ja kustutamist ning teab, kes võib toimingut teha. Platvormihalduri sulgemise/taasavamise töökorraldus on praegu kooskõlastamata; omaniku vorm üksi seda nõuet ei sulge |
| Leia juhis ja rikke vastutaja | Haldur leiab rollile sobiva juhendi ning määratud hooldaja/asendaja kontakti ja toeajad. Praegu on kontaktid määramata |

Katse tehakse pärast kujundust sünteetiliste andmetega ning fikseeritud versioonis. Omanik täidab enda platvormihalduri ülesanded; sõltumatu testija katab kokkulepitud kasutajamaatriksi. Iga ülesande juures märgitakse lõpetamine, abi vajadus, eksimus, põhjuse ja tagajärje mõistmine ning tõend. Ebaselge haldusvaade jääb parandustööks ka siis, kui juhend kirjeldab õiget klõpsujada. Omaniku praegune nõue ei ole olemasoleva halduse vastuvõtu kinnitus.

## Tulemuse vorm ja lõpetamine

Allolev on täitmata vorm, mitte läbitud katse.

| Väli | Täidetav teave |
| --- | --- |
| Katse ja nõue | Ülesande tunnus ning AT-/ASVS-seos |
| Versioon ja aeg | Commit/väljalase, keskkond, kuupäev |
| Testija ja roll | Kokkulepitud tunnus, klient/töötaja/omanik |
| Töövahendid | Seade, OS, brauser, ekraanilugeja ja nende versioonid, keel |
| Tulemus | Läbis / viga / tegemata; tegelik käik ja oodatud tulemus |
| Kasutatavus | Aeg, abi, katkestus, eksitav tekst või fookuse/ettelugemise probleem |
| Tõend ja järelkontroll | Minimaalne lubatud tõend, vea tunnus, paranduse versioon ja korduskatse |

Peatükk lõpetatakse pärast kokkulepitud maatriksi täitmist, pimeda testija ekraanilugejakatset, sõltumatut kasutajakatset, takistavate vigade parandamist ja omaniku vastuvõttu. Kriitilise andmelekke või ettevõtete eraldusveaga väljalaset ei võeta vastu. Kujunduse valmimine on katsete jätkamise sõltuvus; selle registri koostamine ei käivita kujundustööd.
