# V1 allesjäänud tööd ja otsused

Seis **12.09.2026**. Koostaja: Codex. See register ühendab algse plaani otsused ja peatükkide 27–30 nõuded värskete tehniliste tõenditega. **V1 tervikvastuvõtt on avatud.** Kinnitatud ärivalik, teostatud funktsioon, piiritletud tehniline katse ja omaniku vastuvõtt on eri staatused.

Võrdluse lähteversioon on `c1b0d4dbf5d38b5f2b28ee1ef5156752a5d821a5`; kohalik tööpuu oli alustamisel puhas. Algallikas on projekti juurkausta `Broneerimisplatvorm_arendusplaan_v1_0.docx`, versioon 1.0, 06.09.2026, SHA-256 `327f393d10da62d84fc76db4c684014698fca88cfe0837cd29894109dabcc3a0`. [Võrdluses kasutatud nõuete tekst](audits/remaining-work-20260912/source-requirements.json) säilitab D- ja O-registri ning peatükid 27–30. Algdokumenti ei muudetud.

12.09 üleandmises kinnitatud piirid ja hilisemad kuupäevastatud tõendid täpsustavad vanu staatuseid. Registri esmasel koostamisel serverit ega väliste kontode hetkeseisu ei kontrollitud, rakendusteste ei korratud ning uut litsentsiinventuuri ei tehtud. **Hilisem 12.09 lisatõend:** kasutaja tehtud [serverirestardi järelkontroll](RESTART-2026-09-12.md) läbis oma kirjeldatud ulatuses. Serveri ja rakenduspildi versioonieristus on [peatükis 26](CHAPTER-26.md).

## Kehtiv ulatus ja tööpiirid

V1 teenindab ilu- ja heaoluettevõtteid, konsultatsioone ning muid teenuseid, kus üks broneering hõivab ühe töötaja. Ühine rakendus eraldab ettevõtete andmed. Ettevõttel on alamdomeen, avalik broneerimine ja manustamine; halduses õigused, teenused, graafikud, kalender, kliendid, import/eksport, lahkumine, teavitused, arveldus ja auditeeritud tugi.

- Üks pakett: **35 € lõpphind kuus**, piiramatu töötajate arv, prooviperioodita. Maksetähtaeg 7 kalendripäeva, lisapikendus 0 päeva. [Kinnitatud tingimused](CHAPTER-19.md).
- Omaniku 12.09 täpsustus: toote nimi **Ajasta**; kinnitatud avalik veeb `ajasta.ee` ja `broneering.info` avalehe edasisuunamine, säilitades ettevõtete alamdomeenid. [Ajasta veebilehe töö ja domeenikava](AJASTA-WEBSITE-PLAN.md). Valmis tootetutvustus-/müügileht on tegemata; praegune tehniline avaleht juba kasutab Reacti, Next.js-i ja TypeScripti. Lihtne avaleht on eraldi komponent; lõpliku kujunduse teeb omanik. Domeenide tehniline kasutuselevõtt dokumenteeritakse eraldi.
- Ettevõtte kuutasu Maksekeskuse makselink ja kaardi korduvmakse on kinnitatud laiendus. Lõppkliendi teenuse ettemaks jääb V1-st välja.
- Ruumid, seadmed ja ressursikombinatsioonid on tulevane eraldi ulatus; neid ei esitata töötajatena. Ka SMS, väliskalendrid ja mitu asukohta jäävad [edasise arenduse nimekirja](ROADMAP.md).
- Kujundus on ootel. Pärisseadmete ja sõltumatute kasutajate vastuvõtt toimub pärast lõplikku kujundust; ekraanilugejat testib pime inimene.
- SMTP, Maksekeskuse seadistus, teine varundusserver ning seire/häirete lõplik aktiveerimine on omaniku soovil hilisemaks. Puuduvat seadistust ei loeta läbitud katseks ega küsita korduvalt uuesti.
- Säilitamistähtaegu ei määrata omaniku eest ja automaatset kustutamist ei aktiveerita kinnitamata poliitikaga. Inimestega võetakse ühendust ainult selge loaga. Alamagente ei kasutata.
- `NODE_ENV=production`, terve konteiner või avalik HTTPS-leht ei kinnita toote lõplikku tootmisvastuvõttu.

## Tehniliselt lõpetatud kontrollid

| Töö | Tegelik tulemus ja tõend | Vastuvõtu piir |
| --- | --- | --- |
| Auditi F-01–F-05 | [Parandused](CHAPTER-23-FIXES.md), [serveri paigaldus 08.09](DEPLOYMENT-2026-09-08.md) | Varasemad vigade kirjeldused jäävad ajaloolisteks vastunäideteks |
| G03 automaatmaatriks | [Lõppvoor](ACCEPTANCE-G03-COMPLETION.md): 506/506 HTTP/DB kontrolli, 14/14 brauserifaasi kolmes mootoris | Ei asenda pärisseadmeid, sõltumatut kasutajat, ekraanilugejat ega kogu ASVS-i vastuvõttu |
| Peatükk 24 | [AT-01–18 ja viis lisakontrolli](CHAPTER-24.md), 290/290 automaattesti ning 9/9 uut brauserifaasi | Broneerimise õigsuse tehniline vastuvõtt; ülejäänud V1 eraldi |
| G06 / AT-47–48 | [Peatükk 26](CHAPTER-26.md): 100 ettevõtet, 100 000 ajaloolist ja 1000 tulevast broneeringut; 12 000/12 000 vastust, p95 19,23 ms; 30/30 kalendrimuudatust kuni 5,006 s | Sama VPS-i sünteetiline mõõtmine; ei mõõda lõppkasutaja interneti latentsust |
| Serveri konkurents | [Peatükk 26](CHAPTER-26.md): 50 autentitud halduskatset, üks õnnestumine ja 49 konflikti; kordus ei dubleerinud | Ei ole 50 avaliku Turnstile-kliendi katse |
| Import, eksport ja lahkumine | [Peatükk 26](CHAPTER-26.md): tegelik HTTP, vead, kordused, eksporditöötaja väljund/õigused ning tegeliku kella tähtajad | Kõigi haldusvormide sõltumatu kasutatavus, SMTP ja päris säilitusleping eraldi |
| Sisemine arveldus | [Peatükk 26](CHAPTER-26.md): korduvad/paralleelsed periooditööd ja sünteetilised maksekanded | Ei asenda Maksekeskuse ega pärisarvete seadistuse vastuvõttu |
| Sama VPS-i taastamine | [Peatükk 26](CHAPTER-26.md): kõigi 53 tabeli täielik räsivõrdlus, failid, uuem eemaldamisregister, vanade seansside/eksportide tühistamine ja taastatud rakendus; 11,9 s | Ei tõenda serverikao taastamist uuel hostil, välist varundusgraafikut ega WAL/RPO/RTO valmisolekut |
| Serveri taaskäivitus | [12.09 kasutaja restardi järelkontroll](RESTART-2026-09-12.md): neli olemasolevat konteinerit terved, samad pildid/köited, viis HTTPS-juurt ja kaks avalikku API-voogu läbivad; 3 ettevõtte ja 3 broneeringu loendus säilis | Ei tõenda katkestuse täpset kestust, kõigi ridade sisu, pooleli kirjutusi, ootamatut krahhi ega teise hosti taastamist |
| G09 tugiligipääs | [Teostatud, kontrollitud ja serveris](SUPPORT-G09.md) | Omaniku ja sõltumatu ülevaataja vastuvõtu kinnitus puudub |

Neid kontrolle ei korrata ainult registri sulgemiseks. Kordus vajab uut muudatust, konkreetset kahtlust või lõpliku vastuvõtu uut keskkonda. Peatüki 26 katsekeskkond on koristatud; vana seemendust ei saa taaskasutada.

## Allesjäänud tööde register

Rollid näitavad vajalikku vastutust, mitte juba määratud inimest. Kinnitaja ja vastuvõtu kuupäev tuleb lisada tegeliku kinnituse järel. Hinnangud [algses tööregistris](CHAPTER-23-WORK.md) on ajaloolised järgmise sammu hinnangud; neid ei liideta valmis tööde mahuga ega käsitleta eelarvena.

| ID ja plaaniseos | Järgmine konkreetne tulemus | Eeltingimus ja vastutus | Sulgemise tõend |
| --- | --- | --- | --- |
| G01 / ptk 03, 20, 27–29 / AT-45 | Selle D-/O-koondi kooskõlastus; lõpliku väljalaske npm-, platvormi- ja süsteemikomponentide inventuur ning puuduvad litsentsitekstid; õiguste ja ligipääsude üleandmine; arhitektuuri vastuvõtt | Tehnilist inventuuri saab jätkata. Väljalaske versioon peab olema fikseeritud; omanik, käitaja ja lepingute koostaja kinnitavad oma osa | Versiooniga seotud inventuur/teated, kontrollitud kontode omanikud, lepingute viited, arhitektuuri ja otsuste kinnitus. Käesolev koond sulgeb ainult registri koostamise sammu |
| G02 / ptk 01, 23, 27 | Intervjuu- ja piloodiprotokollid; vähemalt 5 intervjuu ja 3 pilootpartneri eesmärgi kontroll | Protokollide ettevalmistus võimalik; inimeste kaasamine vajab luba ja kokkuleppeid. Omanik/tootejuht | Tegelikud intervjuud, partnerikokkulepped, maksmisvalmidus, abita broneerimine, seadistusaeg, igapäevane kasutus ja toe maht |
| G03 / ptk 25 / AT-19–35 | Sõltumatu turva- ja kasutajavastuvõtt; kõigi kokku lepitud vormide/teekondade kontroll, päris Safari/macOS/iOS ja Android, klaviatuur, suum ning pimeda inimese ekraanilugejakatse | Lõplik kujundus ja fikseeritud versioon; testija, seadmed ning maatriks lepitakse hiljem kokku. [Katseplaan](CHAPTER-25.md) olemas | Testija, seade/versioon, tulemus ja minimaalne tõend iga nõude kohta; ASVS-i lisalävendi tõendiseosed; paranduste korduskatsed ja omaniku vastuvõtt |
| G04 / ptk 05, 12 / AT-34 | Ajasta avalik tootetutvustus-/müügileht ja domeenikava; rakenduse kinnitatud kujundus, versioonitud teema, mustand/avaldamine, meedia/fontide õigused, kontrast ja tööfailid | **Kujundus omaniku otsusel ootel.** [Ajasta veebilehe kava](AJASTA-WEBSITE-PLAN.md); domeenikorraldus kinnitatud; kujundus ning lõplik veebisisu ja vastuvõtt ootel. Omanik ja disainer/arendaja | Kinnitatud makett/ulatus, lehe ja kokkulepitud suunamiste vastuvõtt, olemasolevate haldus-/broneerimis-/manustamislinkide säilimine; AT-34 ning kujundusjärgsed AT-32/33/35 kontrollid |
| G05 / ptk 04, 17, 19 / AT-36–42 | Päris SMTP saatmine/kohaletoimetamine, tõrge ja taastumine; Maksekeskuse sandbox, makselink, korduvmakse nõusolek, lõpetamine, lepitus ja tagastus; hilisem pärisühenduste vastuvõtt | **Seadistused hiljem pärast kujundust.** Omanik/käitaja, arendaja; kinnitatud arveväljastaja ja maksukäsitlus, katseadressaadid ja pakkuja keskkond | Minimaalsed saatmistõendid ning pakkuja tehingute ja kohaliku arveregistri kooskõla. Sisemised sünteetilised maksed ei sulge seda rida |
| G06 / ptk 11, 26 / AT-47–48 | **Tehniline mõõtevoor lõpetatud**, uut iseseisvat koormustööd pole tuvastatud | Uus katse ainult muudatuse, kahtluse või uue vastuvõtukeskkonna tõttu | Olemasolev [ptk 26 protokoll](CHAPTER-26.md); üldine omaniku vastuvõtt eraldi |
| G07 / ptk 18, 21 / AT-46 | Andmeliikide säilitamise/kustutamise andmelepinguprojekt ja kuivkäigu plaan; seejärel kinnitatud piiratud partiidega korduskindel automaatika ja seire | Projekti/kuivkäigu ettevalmistus võimalik; poliitika on **kinnitamata**. Omanik ja lepingute/andmekaitse koostaja kinnitavad tähtajad ning säilitamiskeelud enne sõltuvat teostust | Kinnitatud andmeliigid, tähtajad, arveldusandmed, lahkumine ja erandid; kuivkäigu arvud; katkestuse/korduse/keelatud eemaldamise katsed; taastamisregistri seos ja aktiveerimise kinnitus |
| G08 / ptk 22, 26, 29 / AT-43–44 | Teine varundusserver, sõltumatu võtmehoid, ajastused, häire saaja/asendaja; serverikao taastamine uuel hostil DB/WAL/failide/registriga; teise arendaja puhas paigaldus | **Väline taristu ja seire aktiveerimine hiljem.** Käitaja, asendaja ning sõltumatu teine arendaja tuleb määrata | Uue hosti täielik taastamine ja rakenduse vastuvõtt; RPO ≤ 15 min / RTO ≤ 4 h eesmärkide tegelik mõõtmine, häire kättesaamine; AT-44 broneering juhendi järgi |
| G09 / ptk 04, 19 / AT-23 | Olemasoleva piiratud auditeeritud tugivaate omaniku ja sõltumatu ülevaataja vastuvõtt | Tehniline osa valmis ja serveris. Testija ning kinnitaja määratakse vastuvõtuks | Toe alustamine, lubatud lugemine/audit, lõpetamine/aegumine ja kirjutuskeeld; kinnitaja ning kuupäev |

## D-01–D-20 kehtiv otsuste koond

Siinne „kehtiv” tähendab plaani nõuet või dokumenteeritud hilisemat omanikuotsust, mitte nõude lõplikku vastuvõttu.

| ID | Kehtiv nõue või hilisem täpsustus | Täitmise tõend ja allesjääv piir |
| --- | --- | --- |
| D-01 | Ühine mitme ettevõttega rakendus, eraldatud andmed | G03 HTTP/DB tõendid; sõltumatu vastuvõtt G03 |
| D-02 | Kuutasuline toode ilma püsiva tasuta paketita; 35 € lõpphind, piiramatu töötajate arv, prooviperioodita | [Ptk 19](CHAPTER-19.md), ptk 26 sisemine katse; G05 |
| D-03 | Suletud eritellimuskood, õiguste üleandmine omaniku ettevõttele | [Ptk 20](CHAPTER-20.md); lepinguline õiguste ahel G01 |
| D-04 | Põhifunktsioonid omaniku kontrollitavas taristus | [Arhitektuur](ARCHITECTURE.md); lõplik vastuvõtt G01/G08. Maksekeskus on kinnitatud kuutasu erand |
| D-05 | Üldvoog algab teenusest, siis sobivad töötajad | Ptk 24 AT-01–04; sõltumatu kasutaja G03 |
| D-06 | Kuupäeva ja kellaaja valib klient, automaatset kinnitust ei teki | Ptk 24 AT-05; G03 |
| D-07 | „Töötaja pole oluline” kuvab sobivate töötajate pakkumised | [Ptk 09](CHAPTER-09.md), AT-05–06; O-06 eraldi |
| D-08 | Ühe sobiva töötaja sammu võib vahele jätta, nimi on enne kinnitamist nähtav | Ptk 24 AT-03; G03 |
| D-09 | Isiklik töötajalink piirab valiku tema teenustele | Ptk 24 AT-04; G03 |
| D-10 | Kokkuvõttes töötaja, lõplik hind, kestus, asukoht ja valitud aeg | Ptk 08/24 tehnilised tõendid; täielik kasutaja vastuvõtt G03 |
| D-11 | Minimaalne etteteatamine ei asenda kliendi hinnangut kohalejõudmisele | Ptk 24 AT-07–08; vaikeväärtuste kinnitus O-05 |
| D-12 | Edukas kinnitus järgneb serveri kontrollile/salvestusele, salongi heakskiitu ei oodata | Ptk 24 AT-11–16 ning G03 taastumisvoog |
| D-13 | Broneerimine kontota, muutmine/tühistamine turvalise lingiga | Ptk 10 ja G03; tegelik kirja kohaletoimetamine G05, lingi poliitika O-10 |
| D-14 | Töötaja kattuvat hõivamist ei luba ka administraator | Ptk 24 ning ptk 26 konkurentsitõend |
| D-15 | Piiratud kujundusseaded, ühine loogika ja üldpaigutus | Logo-, värvi- ja fondiredaktor, režiimid, mustand/eelvaade/avaldamine/taastamine on kohalikult teostatud; vt THEME-SETTINGS-REQUIREMENTS.md. G04 lõplik disain ja kasutajavastuvõtt ootel |
| D-16 | Oma kalender, FullCalendar Premium ja kohustuslikud tasulised pilvekomponendid väljas | Ptk 11 ning G06 tehniline tõend; kasutatavus G03 |
| D-17 | Ettevõttele kasutusõigus, mitte serverikood, edasimüügiõigus või repo ligipääs | Ptk 20; kasutustingimused ja üleandmine G01 |
| D-18 | Absoluutset kopeerimatust ega üldise idee ainuõigust ei lubata | Ptk 20; õiguste ja litsentside piirid G01 |
| D-19 | Üks keskkond ühe teenust osutava ettevõtte kohta; iseseisvate ettevõtjate kliendibaase ei jagata vaikimisi | Ptk 04/16 ning G03; tegelike pilootide ettevõttejaotus G02 |
| D-20 | Arvepõhine kuutasu; maksmata jätmine ei kustuta broneeringuid automaatselt | Ptk 19/26; makselink/korduvmakse täpsustus, G05 ja lahkumise leping G07 |

## O-01–O-12 avatud osad

| ID | Juba määratud või tehniliselt olemas | Veel kinnitada ja sulgemise viis |
| --- | --- | --- |
| O-01 | Omaniku 12.09 nimevalik **Ajasta**; praegused tehnilised aadressid `broneering.info` ja `haldus.broneering.info`, repo `LauRRaud/broneering.info` | Kinnitatud `ajasta.ee` avaleht ja ainult `broneering.info` avalehe suunamine; [domeenikava](AJASTA-WEBSITE-PLAN.md). Omaniku ettevõte/kontaktid ning repo/domeenide/serveri/teenusekontode tegelik omand ja üleandmine; G01/G04 |
| O-02 | Üks 35 € lõpphinnaga pakett, töötajate piir puudub; kuu ankurpäeva tehniline loogika | Algusperioodi ärireegli lõplik vastuvõtt, arveväljastaja ja maksukäsitluse kinnitatud seadistus, personaalse seadistuse/impordi/töö hind; G01/G05 |
| O-03 | Prooviperioodi ega püsivat tasuta paketti ei ole | Piloodipartnerid, piloodi tingimused/kestus/vastutus ja mõõtmised. Eraldi soodustust ega tasuta pilooti pole selle registriga lubatud; G02 |
| O-04 | Maksetähtaeg 7 päeva, lisaaeg 0; tasumata arve piirangu tehniline käitumine ptk 19 | Meeldetuletuste tegelik saatmine, piiratud teenuse/lepingu lõpetamise terviklik tingimuste ja kasutajavoo vastuvõtt; G05/G07 |
| O-05 | Graafiku ja broneerimispoliitika seadistus ning piiride katsed olemas | Etteteatamise, broneerimisakna, ajasammu, meeldetuletuse ning muutmise/tühistamise vaikeväärtuste kooskõlastatud loend. Koodi vaikeväärtus ei ole omanikuotsus; G01/G03/G05 |
| O-06 | Kõik konkreetsed pakkumised jäävad kliendile valida; automaatset asendamist ei tehta | Võrdsete pakkumiste töötajamääramise ja töökoormuse jaotuse vajadus endiselt kinnitamata. Uut automaatset jaotamist ei alustata; [ptk 09](CHAPTER-09.md), G01 |
| O-07 | Rollid/lisaõigused ja serveri keelud tehniliselt kontrollitud | Oma graafiku, hinnamuutuse, vastuvõtu ekspordi ja etteteatamise erandite lõpliku rollimaatriksi kinnitus; G01/G03 |
| O-08 | Kujundus edasi lükatud | Mallide arv, tume teema, fondid, bränd ning prototüübi heakskiit; G04 |
| O-09 | Ubuntu VPS ja omaniku kontrollitava taristu suund määratud; Turnstile üleandmise järgi aktiivne | Taristu tegelik asukoht/lepingud/haldaja; SMTP; välise varukoopia ja võtmete hoid; seire ja häire saaja/asendaja. Edasilükatud osa G05/G08 |
| O-10 | Turvalised lingid, eksport/lahkumine, kontaktide käsitsi eemaldamine ja taastamislepituse tehnika olemas | Kõigi andmeliikide tähtajad, säilitamiskeelud, halduslingi kehtivuspoliitika, lahkumise eksport, arveldusandmed ja väliste koopiate käsitlus; G07/G08 |
| O-11 | Lukufail, API/andmemudeli kirjeldused ja lukustus-/kordusprotokoll olemas | Lõpliku väljalaske toetatud versioonide ja API lepingute ülevaatus, täielik litsentsiinventuur/tekstid ning lubatud tingimused; Next.js + pg arhitektuuri lõplik vastuvõtt; G01 |
| O-12 | Järgmiste sammude esialgsed hinnangud olemas; töö toimub alamagentideta | Eelarve, tegelik meeskond ja ajakava, garantiitöö, personaalne tugi, toeajad, hooldaja/asendaja ning rikkele reageerimise vastutus; G01/G02/G08 |

## Peatükk 27 kulud ja äriline kontroll

Algse plaani 600–900 tundi, 60 €/h, 36 000–54 000 € ja 150–350 €/kuu taristureserv on näidisarvutused, mitte kinnitatud eelarve. Ka 29 €/kuu kuni viie töötajaga pakett on asendatud 35 € lõpphinnaga piiramatu töötajate arvuga paketiga. 100 ettevõtte tulunäidet ei käsitleta müügiprognoosi ega puhaskasumina.

Järgmine eelarve peab lähtuma selle registri allesjäänud töödest ning eraldi kalendri/taristu hooldusest, meilide saatmismaine haldusest, sõltuvuste uuendustest, varundusest/taastamisest, turva- ja ligipääsetavuse kontrollidest, lepingutest, andmete üleviimisest, kasutajatoest, serverist/riistvarast, domeenist ja ühendustest. Tariife ega kulusummasid selles voorus ei hinnatud. G02 peab tõendama maksmisvalmidust, broneerimise lõpetamist, seadistusaega, töötajate igapäevast kasutust ja toe mahtu; intervjuu või piloodi vorm üksi ei täida eesmärki.

## Peatükk 28 riskid ja muudatused

12.09 serveri lugemiskontrollis puudusid broneerimise neljal konteineril eraldi CPU- ja mäluülempiirid. [Restardi läbimine](RESTART-2026-09-12.md) ei eralda teenust sama VPS-i teiste platvormide ressursipuudusest. G08 käitamise järeltegevus on ühise serveri ressursijaotuse ja piiride ülevaatus; teisi projekte ega nende seadistusi selles töös ei muudeta.

Andmeeralduse ja topeltbroneeringu tehnilised katsed on olemas; sõltumatu turva-/kasutajavastuvõtt jääb G03 alla. Õiguste päritolu risk jääb G01, kohaletoimetamise risk G05 ning ühe serveri või hooldaja kaotuse risk G08 alla. Toe tegelik koormus ja personaalse töö hinnastus vajavad G02/O-02/O-12 tõendeid ja otsuseid.

Uus idee läheb järgmise versiooni nimekirja, kui see ei paranda kokkulepitud V1 põhitoimingu, õiguste, turbe või töökindluse puudust. Ulatuse muutmisel fikseeritakse tunnus, kuupäev, põhjus, mõju töömahule/ajale/kulule, kinnitaja ja muudetud nõuded. Selle registri koostamine ei lisa tootele uusi funktsioone ega kehtesta uusi ärireegleid.

## Peatükk 29 üleandmise täielikkus

Omaniku täpsustus 12.09.2026: üleandmisel on vajalikud leitavad kasutusjuhendid ning ka tema platvormihaldus peab olema arusaadav. [Juhendite sisukord](README.md) eristab lõppkliendi/ettevõtte haldaja, platvormihalduri ja käitaja vajadused. [Platvormihalduri juhendi esmane versioon](PLATFORM-ADMIN-GUIDE.md) on olemas; praeguste vormide ja serveriõigustega võrreldud, kuid inimese poolt katsetamata. [Vastuvõtuülesanded](CHAPTER-25.md#platvormihalduri-arusaadavuse-vastuvõtt) kontrollivad ka vaate enda selgust, mitte ainult juhendi olemasolu.

Ühtse lõppkliendi ja ettevõtte haldaja juhendi esmane versioon on kohalikult koostatud ja seotud avalehe ning haldusega. Omaniku täpsustusel valmistatakse muudatused esmalt kohalikult ette ning serverisse avaldatakse pärast ülevaatamist. Juhendite järgmine töö on puuduva kasutajasisu lisamine, avaldamine ja kasutajavastuvõtt, platvormihalduri juhendi täiendamine kinnitatud sulgemise/taasavamise töökorra järgi ning käitaja kontaktide/vastutuse lisamine pärast nende määramist. Lõpliku kujunduse järel kontrollitakse nupunimed, ekraanipildid, juhendi kättesaadavus ja tegelik kasutamine. Need on G01/G03/G04/G08/G09 ning ptk 29 üleandmise osad, mitte uued ligipääsuõigused.

| Algse plaani üleantav osa | Olemasolev alus | Puuduv vastuvõtu tõend |
| --- | --- | --- |
| Lähtekood ja ajalugu | Git-hoidla, commit'id, [paigaldusjuhend](SERVER.md) | Omaniku tegelik kontroll privaatse repo ja väljalasete/ligipääsude üle; G01 |
| Õiguste dokumendid | [Ptk 20](CHAPTER-20.md), [sõltuvuste register](DEPENDENCIES.md), [litsentside puudujäägid](LICENSE-COVERAGE.md) | Allkirjastatud õiguste üleandmine ja alltöövõtjate ahel, lõpliku väljalaske täielikud kolmandate osapoolte tekstid; G01 |
| Disaini tööfailid | G04 ootel | Tootmisdisain, komponendid/tekstid ja ikoonide/piltide/fontide õigused; ekraanipilt ei asenda tööfaili |
| Paigaldus ja seadistus | [README](../README.md), [SERVER](SERVER.md), migratsioonid ning keskkonnamuutujate kirjeldused | Teise arendaja puhas paigaldus ja broneering AT-44; saladuste turvalise üleandmise protokoll; G01/G08 |
| API ja andmemudel | [Arhitektuur](ARCHITECTURE.md), [skeem](SCHEMA.md), [ptk 14](CHAPTER-14.md), [ptk 15](CHAPTER-15.md), õiguste ja API kood | Lõpliku versiooni skeemide, õiguste, veakoodide, indeksite, piirangute ja kordus-/lukustusreeglite kooskõla ning vastuvõtt; G01/O-11 |
| Testid | Testikood ja G03/ptk 24/ptk 26 protokollid, [tõendimaatriks](CHAPTER-23-ACCEPTANCE.md) | G03/G04/G05/G08/G09 puuduva ulatuse tegelikud protokollid ja omaniku vastuvõtt; olemasolevaid tõendeid ei kirjutata ümber |
| Käitamise juhendid | [SERVER](SERVER.md), [ptk 17](CHAPTER-17.md), [ptk 22](CHAPTER-22.md): taastamine, meilivead, TLS, seire ja tagasipööre | Tegeliku seadistuse ja sõltumatu käitaja kontroll, välised koopiad/võtmed ning häire kättesaamine; G05/G08 |
| Äriline haldus | [Platvormihalduri juhendi esmane versioon](PLATFORM-ADMIN-GUIDE.md), [ptk 18](CHAPTER-18.md), [ptk 19](CHAPTER-19.md), [tugivaade](SUPPORT-G09.md) | Omanikuga kontrollitud juhend ning arusaadav haldusvaade paketile, arvele, laekumisele ja toejuhtumile; sulgemise/taasavamise kinnitatud töökorraldus. Juhendi esmane versioon ei tõenda vastuvõttu |
| Piirangud ja hooldus | Käesolev register ning valdkondade protokollid | Garantiitingimused, hooldaja/asendaja kontaktid, toeajad ja rikkevastutus; O-12 |

AT-44 põhikatse nõuab, et teine arendaja käivitab juhendi põhjal süsteemi puhtas keskkonnas ja teeb eduka broneeringu ilma kohustusliku tasulise tarkvarateenuse kontota. Domeeni, võrgu ja e-posti välisühendused dokumenteeritakse eraldi. Sünteetiline samal VPS-il taastamine ei täida seda sõltumatu paigalduse nõuet.

Algdokumendi heakskiiduväljad jäävad tegeliku kinnituse ootele: omaniku ettevõte/kinnitaja, kinnitatud V1 ulatus/kuupäev/erandid ning järgmise muudatuse tunnus, põhjus, mõju ja kinnitaja. Käesolev dokument ei kirjuta neid täidetuks.

## Peatükk 30 asendatud ettepanekud

Kehtivad teenusest algav voog, kliendi enda aja valimine, oma kalender, ettevõtete alamdomeenid ja omaniku hallatav põhitaristu. Vanad kujunduskollaažid ja „esimene vaba aeg” ei määra teostust. FullCalendar Premium, lõppkliendi ettemaks, Stripe, SMS ja Google'i kalendri ühendus ei ole V1 nõuded. Hilisem Maksekeskuse erand puudutab ettevõtte kuutasu, mitte kliendi teenuse ettemaksu.

Better Authi või muu kohaliku teegi lubamine algses arutelus ei nõua iga nimetatud teegi kasutamist. Tegelik Next.js + pg/SQL lahendus on kirjeldatud [arhitektuuris](ARCHITECTURE.md); selle lõplik kooskõlastus jääb G01. Vanad tunnid/hinnad ja konkurendi ajaloolised hinnanäited ei ole praegune hinnakiri, eelarve ega võrdlusuuring. „Lukus” tootesuund ei asenda teostust, lepinguid ega vastuvõtutõendeid.

## Järgmised iseseisvalt ettevalmistatavad tööd

Peatükkide järjekorra järgi sobib järgmiseks **G01 tehniline litsentsiinventuur**: fikseerida kontrollitav versioon ja paigaldused, koguda npm- ning süsteemikomponentide teated, täita puuduvad litsentsitekstid ja dokumenteerida allesjäävad kinnitused. Lõpliku väljalaske eel vajab muutunud sõltuvuste/piltide inventuur uuendamist.

Seejärel saab ette valmistada G02 intervjuu/piloodi vormid või G07 andmelepinguprojekti ja kuivkäigu aruande kavandi. Need tööd ei vaja inimeste poole pöördumist, kujunduse alustamist, teenuste tellimist ega kustutamise aktiveerimist. Õiguslikke tähtaegu, kinnitajate nimesid ega läbitud inimkatseid ei mõelda välja.
