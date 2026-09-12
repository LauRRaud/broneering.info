# Ajasta halduse struktuuri lähteplaan

Kuupäev: 12.09.2026.

Staatus: vestluses välja töötatud põhisuund edasiseks kujundamiseks. Kasutaja palus selle dokumenteerida ja täpsustas: **kujundust veel ei tee**. See dokument ei kirjelda juba valminud uut haldust ega anna ülesannet alustada teostust, makette või serveripaigaldust. Visuaalse kujunduse annab kasutaja.

## Praegune teostus

Kohalik haldus on valdavalt üks pikk leht vormide, tabelite, kalendri ja avatavate jaotistega. Konto turvalisus, ettevõtte töövahendid ning platvormihalduri tööriistad paiknevad samas halduskomponendis, õigustest sõltuvate tingimustega.

Broneeringutel on päeva-, nädala- ja nimekirjavaade. Kalender ja loend võivad olla korraga nähtavad; broneeringu detail ning muutmisvorm avanevad loendi all. Allpool kirjeldatud ülemine põhimenüü, eraldi töövaated ja detailpaneel on kavandatavad muudatused.

## Kolm eraldi konteksti

1. **Valitud ettevõte** — näiteks Ilutegu broneeringud, kliendid, teenused, meeskond ja seaded.
2. **Minu konto** — konto andmed, turvalisus, parool, kaheastmeline autentimine, vaate-eelistused ja väljalogimine. Kasutajamenüü paremas ülanurgas. Kohustuslik autentimise seadistamine toimub enne kaitstud halduse avamist.
3. **Ajasta platvormihaldus** — ainult vastava õigusega kasutajale, eraldi kontekstina. Ettevõtted, tellimused, arveldus, omanike kutsed ja tugi. Sisenemise täpne asukoht jääb kujunduses otsustada: kasutajamenüü või ettevõttevaliku kontekstivahetus. See ei kuulu Ilutegu põhimenüüsse.

Ettevõtte vahetamisel peab valitud ettevõte olema üheselt nähtav. Salvestamata vormi ei tohi konteksti vahetades märkamatult kaotada. Nähtavad andmed ja tegevused peavad järgima olemasolevaid õigusi; navigeerimise ümberkorraldus ei laienda ligipääsu.

## Põhimenüü ja alamjaotused

Põhisuund on **Broneeringud · Kliendid · Teenused · Meeskond · Seaded**. Arvutis on lähtevariant ülemine tekstidega põhimenüü. Ainult ikoonidega riba ei ole lähtevariant. Menüü mahutavust tuleb hiljem kontrollida eri aknalaiuste ja tõlgetega; kindlaid mõõte pole kinnitatud.

| Põhiosa | Alamjaotused ja ülesanded |
| --- | --- |
| Broneeringud | Päev · Nädal · Nimekiri; kuupäev, töötajafilter, käsitsi lisamine, muutmine, tühistamine, seisundid ja lahendamist ootavad broneeringud. |
| Kliendid | Üks otsingu ja nimekirjaga põhivaade; valitud kliendist kontaktandmed, ajalugu, parandused ja duplikaatide ühendamine. |
| Teenused | Teenused · Kategooriad; hinnad, kestused, puhvrid ja teenust pakkuvad töötajad. |
| Meeskond | Töötajad · Graafikud · Ligipääsud; profiilid, teenuste seosed ja erandid, tööajad, puudumised, kontod, rollid ning kutsed vastavalt õigustele. |
| Seaded | Ülevaateleht lühikirjeldustega alajaotustest; iga jaotus avab oma sisu. Ei ole üks pikk kõiki seadeid sisaldav vorm ega kümnest vahelehest koosnev riba. |

Seadete indeks sisaldab:

- **Ettevõtte andmed** — nimi, aadress ja kirjeldus.
- **Broneerimisreeglid ja tingimused** — etteteatamine, ettebroneerimise aken, algusaegade samm, muutmise/tühistamise tähtaeg, ajavöönd ja tingimuste tekst.
- **Broneerimisleht** — logo või nimi, ühine fondivalik, heleda ja tumeda vaate värvid, eelvaade, kontrastikontroll, mustand, kujunduse avaldamine/taastamine ja kodulehele lisamine.
- **Teavitused** — olemasolevad teavitus- ja meeldetuletusseaded.
- **Keeled ja tõlked** — ettevõtte keeled ning teenuste tõlked.
- **Arveldus** — ettevõtte tellimuse ja arvelduse olemasolevad toimingud.
- **Andmehaldus** — import, eksport, säilitamine ja teenusest lahkumine. Lahkumine ning muud suure mõjuga toimingud eristatakse tavatoimingutest.

Igal seadistusel on üks peamine asukoht; seotud töövaates võib olla sinna viiv otsetee. Omandi üleandmine kuulub õigustega seotud toimingute juurde ja peab olema selgelt eristatud tavalisest liikme muutmisest.

## Päis ja halduse üldine välimus

Päise lähteidee: vasakul Ajasta ja valitud ettevõte (nt **ILUTEGU** koos ettevõttevalikuga), põhimenüü ning paremal abi ja kasutajamenüü. Täpne paigutus otsustatakse kujundamisel.

Broneerimise oleku tekst peab olema selge, näiteks **„Broneerimine aktiivne”**, mitte üksnes „Aktiivne”. Kitsamas vaates võib olek olla ettevõttevaliku sees. Olekut ei tohi väljendada ainult värviga.

Halduse visuaalne alus on ühtne Ajasta keskkond. Ettevõtte avaliku broneerimislehe värvid, logo ja font kuuluvad kliendivaatesse ning selle eelvaatesse; need ei pea ümber kujundama kogu haldust.

## Broneeringud kui igapäevane töölaud

- Tavapärane sisselogimisjärgne vaade on valitud ettevõtte **Broneeringud / tänane päev**, pärast nõutavaid konto- ja ligipääsukontrolle.
- Eraldi statistikaga avaleht ei kuulu sellesse lähteplaani. Uue ettevõtte valmisoleku kontrollnimekirja võib näidata ajutiselt töövaates seni, kuni seadistamine vajab lõpetamist.
- Tööriistaribal on „Täna”, eelmine/järgmine periood, kuupäev, töötajafilter, „Lisa broneering” ja päev/nädal/nimekiri.
- Lahendamist ootavate broneeringute arv ja avamise võimalus on töövaates nähtavad, kui neid on.
- Suurel ekraanil on kalender peamine tööala. Täielik nimekiri ei pea pidevalt selle all korduma; nimekirjavaade peab jääma kergesti leitavaks ja ligipääsetavaks.
- Vaate vahetamisel säilivad valitud kuupäev ja sobiv töötajafilter. Praegune nädalavaade kasutab üht töötajat; kõigi töötajate filtrilt üleminekul tuleb valik selgelt lahendada.

### Broneeringu detail

Arvutis avaneb valitud broneering parempoolses detailpaneelis. Umbes **360–420 px** on katsetatav lähtevahemik, mitte kinnitatud nõue. Paneel ei tohi jätta kalendrit kasutuskõlbmatult kitsaks. Väiksemas aknas võib detail avaneda tööala kohale või omaette vaatesse; telefonis on lähteidee eraldi täislaiuses detailivaade.

Detailis on kohe leitavad kliendi nimi, lubatud kontaktandmed, teenus, töötaja, algus/lõpp, hind, olek ja õigustega lubatud tegevused. „Muuda” avab sama detaili vormirežiimi. Kontaktide nähtavust ei eeldata kõigile rollidele.

Detaili sulgemisel säilivad kalendri kuupäev, filter ja kerimiskoht. Salvestamata muudatused, salvestamise tulemus, ühenduse katkemine ning teise kasutaja tehtud muudatus peavad olema arusaadavad. Ühenduse või kinnituse ebakindluse korral säilivad olemasolevad korduskindluse ja versioonikontrolli kaitsed.

### Kalendri olemasolev piirang

Praegune `AdminCalendar` joonistab käesoleva loendilehe tühistamata broneeringud. **Enne kalendri muutmist peamiseks töövaateks tuleb lahendada valitud päeva/nädala kõigi asjakohaste broneeringute katvus**, mitte lihtsalt eemaldada allolev nimekiri. Osalist tulemust ei tohi näidata täieliku kalendrina.

Tööaeg või tühi kalendripind ei tõenda broneeritavat vaba aega: arvestada tuleb teenuse kestust, puhvreid, graafikuid ja olemasolevaid broneeringuid. Uue või muudetud aja saadavust kontrollib endiselt olemasolev pakkumiste mootor.

## Töötajad, teenused ja õigused

Avalik töötajaprofiil ning sisselogimiskonto on erinevad asjad. Töötaja võib pakkuda teenuseid ilma kontota; vastuvõtutöötajal võib olla konto ilma teenusepakkuja profiilita. Seetõttu eristatakse Meeskonnas „Töötajad” ja „Ligipääsud”. Profiili loomine ei tähenda automaatselt kutse saatmist.

Töötaja–teenuse seost saab avada nii teenuse kui töötaja juurest, kuid muuta tuleb sama seose andmeid. Päritud vaikehind/kestus ja töötajapõhine erand peavad olema eristatavad.

Puudumise märkimine ja mõjutatud broneeringute lahendamine moodustavad seotud töövoo: graafikumuudatus näitab mõjutatud broneeringuid ning need on vastava toimingu järel leitavad ka Broneeringute lahendamist ootavate loendis. Kujundus ei tohi jätta muljet, et puudumise märkimine tühistab või tõstab broneeringud automaatselt ümber.

## Kaks eraldi avaldamise seisundit

| Mõiste | Tähendus ja sõnastus |
| --- | --- |
| Broneerimislehe seisund | Avaldamata, avaldatud, peatatud või suletud; näiteks „Broneerimine aktiivne” ja tegevus „Peata uued broneeringud”. |
| Kujunduse seisund | Avaldatud kujundus ning võimalik uus mustand; näiteks „Mustandis on muudatusi” ja „Avalda kujundus”. |

Kujunduse avaldamine ei ole ettevõtte broneerimislehe esmakordse avamise või peatamise sünonüüm. Mustandi salvestamine ja avaldamine jäävad eraldi toiminguteks. Ettevõtte avaldamise valmisoleku kontrollid säilivad.

## Ulatus ja järgmine töö alles kasutaja soovil

See plaan korraldab olemasolevaid võimalusi ümber. Eraldi pealkirja- ja tekstifont, vormiehitaja, üldine integratsioonikeskus, broneeringute lohistamine ning uus statistikalaud ei ole selle plaaniga tellitud funktsioonid. Praegu on teemal üks ühine fondivalik. Olemasolevat hinnakirjalist broneeringute väärtust ei tohi nimetada tegelikuks käibeks.

Kujundamisel tuleb säilitada hele/tume/kõrge kontrast, klaviatuuriga kasutamine, loetavad olekud, tõlked ja rollipõhised õigused. Järgida tuleb [AGENTS.md](../AGENTS.md) ning [komponentide ja stiilide korraldust](FRONTEND-STRUCTURE.md).

Kui kasutaja hiljem kujundamisega jätkab, on esimene kavandatav vaatepaar **Ilutegu omaniku Broneeringud / päev avatud ja suletud detailpaneeliga**, mitme töötaja ning erineva kestusega broneeringutega. See aitab kontrollida menüü, kalendri ja paneeli ruumijaotust. Mobiilipaigutus, lõplikud mõõdud, värvid, kirjatüübid ning paneeli käitumise murdepunktid on veel otsustamata.

Praegune ülesanne lõpeb dokumenteerimisega: kujundust, rakenduskoodi ega serverit selle plaani salvestamise käigus ei muudeta.
