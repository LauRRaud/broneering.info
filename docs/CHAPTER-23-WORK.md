# Peatükk 23 — paranduste ja vastuvõtu tööregister

**23-G03 lõppvoor 10.09.2026:** [laiendatud tehnilise testimise aruanne](ACCEPTANCE-G03-COMPLETION.md): 505 HTTP-päringut ja üks andmebaasi räsivõrdlus (506/506), 14/14 brauserifaasi (356 kontrolli), 287/287 automaattesti ja tootmisbuild läbisid. Hilinenud modaali ning makselingi õiguskontrolli vead parandatud. Pärisseadmete, ekraanilugejate ja sõltumatu kasutaja vastuvõtt jääb avatuks; allpool on varasemate voorude ajalooline seis.

**Hilisem serveriuuendus 08.09.2026:** parandused, migratsioon 048 ja Nginxi impordipiir on paigaldatud. [Täpne paigaldusprotokoll ja allesjäänud piirid](DEPLOYMENT-2026-09-08.md). Allpool kirjeldatud kohalik kontroll eelnes sellele paigaldusele.

Seis 08.09.2026 pärast omaniku paranduskäsku: **23-F01–F05 on kohalikult parandatud ja kontrollitud**, [järelraport ja tõendid](CHAPTER-23-FIXES.md). **23-G01–G08 on avatud; 23-G09 tehniline teostus ja kohalik kontroll on 09.09 valmis** ([tõendid](SUPPORT-G09.md)); tootmise paigaldus ja omaniku etappide vastuvõtt jäävad eraldi. Audit ega selle register ei ole korraldus väliste teenuste tellimiseks või tootmise muutmiseks. Omaniku varasem kujunduse ning välise varunduse/hoiatuste edasilükkamine jääb kehtima. [Koodileiud ja tõendid](CHAPTER-23.md), [AT-maatriks](CHAPTER-23-ACCEPTANCE.md).

Vastutaja on igal tööl pakutud **roll**, mitte määratud inimene. Hinnang tähendab järgmise kirjeldatud piiritletud töö arendaja/testija tunde; välise teenuse ooteaeg, partnerite ajakulu ja pärast katset ilmnev parandustöö on eraldi. Hinnangud vajavad töö alustamisel täpsustamist. Kõigi tööde kinnitaja on toote omanik; vastuvõtu kuupäev on märkimata.

Ühine lõpetamise reegel: salvestada versioon või tööpuu manifest, testija, kuupäev, tulemus ja tõend; teha muudatuse koodiülevaatus, ajakohastada juhend ning märkida allesjääv piirang. Oluline viga jääb avatuks kuni selle vastunäide enam ei õnnestu. Registrisse ei kirjutata paroole, päris kliendiandmeid, taastamisvõtmeid ega makseteenuse saladusi.

## 23-F01 — värske arve ja maksekatse kooskõla

**Seis: parandatud kohalikus tööpuus; kontroll läbis.** [Tõend](CHAPTER-23-FIXES.md). Allpool on töö algne vastuvõtuleping.

- **Seos / eesmärk:** P1; ptk 19, E9, AT-42 laiendus. Ettevõtte omanikule pakutakse ainult tänase kohustusega kooskõlas olevat makset.
- **Sisendid / eeltingimused:** väljastatud arve, valmis või teadmata tulemusega maksekatse, osaline/täielik laekumine või kreeditarve; pakkuja olekute leping. Sünteetiline testarve ja mock-pakkuja.
- **Põhikäik:** iga uue ja korratud lingi tagastamisel kontrollida värsket arvet ning summat; aegunud välise katse lahendamisel vältida teise tasutava tehingu pimesi loomist.
- **Vead:** arve muutub pakkujakutse ajal; vana tunnus; kadunud vastus; juba lõpetatud tehing; kahe haldaja samaaegne parandus.
- **Õigused / andmed / teavitused:** omaniku või ühe arve bearer-õigus kontrollitakse uuesti; rahafakte ega maksekviitungeid ei kustutata; vana tasumislink ei tohi minna uuesti välja makstava pakkumisena.
- **Katsed / tõend:** F-01 mõlemad reproduktsioonid; täielik tasumine, kreedit, pakkujakutse ajal muutumine, omaniku ja avaliku lingi teekond, paralleelsus. Uus raport ja täpne katsekood.
- **Sõltuvused / vastutaja / hinnang:** arve/makse olekute kokkulepe; arendaja + teine ülevaataja, **8–16 h**. Välise pakkuja vastuvõtt eraldi 23-G05.

## 23-F02 — kadunud broneerimiskinnituse taastamine

**Seis: parandatud kohalikus tööpuus; kontroll läbis.** [Tõend](CHAPTER-23-FIXES.md). Allpool on töö algne vastuvõtuleping.

- **Seos / eesmärk:** P1; ptk 08/10/15, E4/E5, AT-12. Klient saab algse broneeringu kinnituse ka ajutise tõrke järel.
- **Sisendid / eeltingimused:** tegelik 201 salvestus, katkestatud vastus, sama võtme kordus ja 429 või loetamatu vastus; päris testbrauser ja eraldi DB.
- **Põhikäik:** säilitada teadmata tulemuse ajal tunnus ja sisu; selgitada ootel seisu, lubada sama toimingu kontrolli; lõpus näidata algset broneeringut.
- **Vead:** võrguviga, 429, katkine JSON, aegunud sessioon/hosti tõrge, hilinenud vastus. Üksnes tõendatud tagasilükkamine lubab uue toimingu koostamist.
- **Õigused / andmed / teavitused:** avalik kasutaja; säilitada kontaktid ainult ettenähtud kliendiseisus; üks broneering, üks loomissündmus ja algne outbox, kõrvalist kinnitust ei lisata.
- **Katsed / tõend:** brauseris 201 + vastuse kaotus → 429 → algne kinnitus; taotluste võtmed ja DB arvud; kontrollida ka teisi teadmata vastuseid ning erineva sisuga korduse keeldu.
- **Sõltuvused / vastutaja / hinnang:** `use-booking-mutation` ühiste reeglite võrdlus; arendaja/testija, **4–8 h**.

## 23-F03 — arhiveerimine sulgeb ka ootel kutsed

**Seis: parandatud kohalikus tööpuus; kontroll läbis.** [Tõend](CHAPTER-23-FIXES.md). Allpool on töö algne vastuvõtuleping.

- **Seos / eesmärk:** P1; ptk 04/06/10/16, E3/E6, AT-18/24 seotud elutsükkel. Varem antud kutse ei taasta lahkunud inimese ligipääsu.
- **Sisendid / eeltingimused:** aktiivse töötajaga seotud ootel kutse, seejärel arhiveerimine; muu hulgas UI lubatud `receptionist` + `staffId` kombinatsioon.
- **Põhikäik:** arhiveerimise tehing tühistab seotud kutsed; vastuvõtt kontrollib värsket töötajaseost ja ettevõtte seisu sama lukustusprotokolliga.
- **Vead:** kutse vastuvõtt ja arhiveerimine võistlevad; kutse juba kasutatud/aegunud; arhiveerimine puudutab omanikku; sama kutse kordus.
- **Õigused / andmed / teavitused:** omaniku seadistus; olemasolev audit ja broneeringuajalugu säilivad; sessioonid suletakse, vana kutsekiri ei anna ligipääsu.
- **Katsed / tõend:** vastuvõtt enne/pärast arhiveerimist ja samaaegselt; mõlemad seotud rollid; `customers.read` ja otsene API peavad keelama ligipääsu; omaniku kaitse säilib.
- **Sõltuvused / vastutaja / hinnang:** olemasolev tenant-lukk ja kutsete audit; arendaja + õiguste ülevaataja, **4–8 h**.

## 23-F04 — eemaldatud kliendiajaloo kuvamine pärast taastamist

**Seis: parandatud kohalikus tööpuus; kontroll läbis.** [Tõend](CHAPTER-23-FIXES.md). Allpool on töö algne vastuvõtuleping.

- **Seos / eesmärk:** P2; ptk 11/21/22, E6/E10, AT-43. Taastatud andmebaasi lubatud kliendivaade avaneb ka puhastatud auditiga.
- **Sisendid / eeltingimused:** kliendi parandus/ühendamine, kontaktide eemaldamise register ja isoleeritud taastamis-DB.
- **Põhikäik:** ühtlustada eemaldatud sündmuse kuju taastamisfunktsioonis, API-s ja vaates; kuvada arusaadav puhastatud ajalugu.
- **Vead:** tühi/vanema versiooni metadata; kaks lepituskäivitust; puuduv endine kasutaja; vana ja uue sündmuse segu.
- **Õigused / andmed / teavitused:** olemasolev kliendi lugemisõigus; kontaktid jäävad eemaldatuks, taastatud linke/ekspordifaile ei avata ja teavitusi ei saadeta.
- **Katsed / tõend:** tegelik taastamislepituse → API → brauseri jada, nii parandus- kui ühendamissündmus; korduskäivitus ning puutumata teise kliendi võrdlus.
- **Sõltuvused / vastutaja / hinnang:** migratsiooni 046 puhastamise leping; arendaja/testija, **3–6 h**.

## 23-F05 — impordi suurusepiir läbi serveriproksi

**Seis: parandatud kohalikus tööpuus; kontroll läbis.** [Tõend](CHAPTER-23-FIXES.md). Allpool on töö algne vastuvõtuleping.

- **Seos / eesmärk:** P2; ptk 18/22, E8/E10, AT-39. Lubatud 5 MiB CSV jõuab õiguskontrollitud impordi API-ni.
- **Sisendid / eeltingimused:** hoidla Nginxi seadistus, täpne imporditee ja sünteetilised piirsuurusega CSV-failid; eraldi testproksi.
- **Põhikäik:** lisada impordi tee jaoks sobiv suurusepiir koos olemasolevate hosti/IP/proto päiste ja mahupiiriga; rakenduse parser jääb lõplikuks kontrolliks.
- **Vead:** 16 KiB piir, 5 MiB ületamine, chunked-sisu, vale MIME, vigane UTF-8, mitte-JSON proksivastus.
- **Õigused / andmed / teavitused:** import jääb omaniku sessiooni/Origin-kaitse taha; suuruspiiri muutus ei anna uusi õigusi; ühtegi algset kinnituskirja ei saadeta.
- **Katsed / tõend:** päris proksi kaudu 16 KiB ümbrus, 100 KiB, 5 MiB ja üle piiri; vigade loetavus brauseris; ülejäänud API piirid säilivad.
- **Sõltuvused / vastutaja / hinnang:** testproksi ja impordikonto; arendaja/käitaja, **2–4 h**. Tootmise muutmine on eraldi juurutussamm.

## 23-G01 — otsused, õigused ja väljalaske litsentsitõend

- **Seos / eesmärk:** ptk 03/20/27/28/29, E0/E10, AT-45. Omanikul on kinnitatud tooteotsused, vajalikud ligipääsud ja kontrollitav õiguste ahel.
- **Sisendid / eeltingimused:** D-/O-register, omaniku hilisemad otsused, õiguste lepingud, lukufail ja Windowsi/Linuxi/OS-i inventuur; dokumentide tegelikud omanikud peavad olema määratud.
- **Põhikäik:** koondada kinnitatud ja lahtised otsused; siduda tööpuu väljalaskega, täiendada puuduvad litsentsitekstid ja lepingulise üleandmise tõendid. Dokumenteeritud Next.js + `pg` lihtsustus hinnata V1 lõpliku arhitektuuri kokkuleppena.
- **Vead:** puuduv õiguste ahel või litsentsitekst, vale konto omanik, eri dokumentide vastuoluline hind või ulatus.
- **Õigused / andmed / teavitused:** otsused teeb omanik, lepingud kontrollib pädev koostaja; saladused antakse üle kaitstud kanaliga, registrisse ainult viited.
- **Katsed / tõend:** lukufailiga kooskõlaline väljalaske inventuur, ligipääsu kontroll ning kinnitatud dokumentide viited; tarkvaratest ei kinnita õiguslikku sobivust.
- **Sõltuvused / vastutaja / hinnang:** omanik + käitaja + lepingute koostaja; järgmise inventuuri/otsustekoondi tehniline töö **4–8 h**, lepingutöö eraldi.

## 23-G02 — vajaduse kontroll ja piloot

- **Seos / eesmärk:** ptk 01/23/27, E1/E10. Tõendada tegelik kasutusvajadus, maksmisvalmidus ja abita põhiteekond.
- **Sisendid / eeltingimused:** intervjuukava, sihtettevõtete nimekiri, 35 € tingimused; vähemalt 5 intervjuu ja 3 pilootpartneri eesmärk on seni tõendamata.
- **Põhikäik:** korraldada intervjuud, fikseerida tulemused, leppida piloot kokku ja mõõta broneerimise lõpetamist, seadistusaega ning toe mahtu.
- **Vead:** katse vajab kõrvalist abi, kasutaja loobub, maksma ei olda valmis, piloot tekitab ettenägematu toe mahu.
- **Õigused / andmed / teavitused:** kontakt ja partneritega suhtlemine omaniku korraldusel; protokollis vajalik minimaalne teave, testimiseks sünteetilised broneeringud.
- **Katsed / tõend:** intervjuuprotokollid, partnerite kokkulepped ja mõõdetud ülesanded; eesmärgi täitumist ei järeldata koodi olemasolust.
- **Sõltuvused / vastutaja / hinnang:** põhivigade parandused ja piloodi kokkulepped; omanik/tootejuht, järgmine kava ning tulemuste vorm **3–5 h**, intervjuud ja piloot eraldi.

## 23-G03 — brauseri-, õiguste ja kasutatavuse vastuvõtt

**Seis 10.09.2026: kirjeldatud automaatne maatriks lõpetatud, sõltumatu tervikvastuvõtt avatud.** [Lõpparuanne, kahe paranduse vastunäited, kordamise juhis ja tõendid](ACCEPTANCE-G03-COMPLETION.md). 505 päris HTTP-päringut ja üks andmebaasi räsivõrdlus, 14 brauserifaasi, 287 automaattesti ja build läbisid. Ülejäänud vastuvõtt nõuab päris Safari/iOS/Androidi seadmeid, ekraanilugejaid ning sõltumatut kasutajat; lõpliku kujunduse järel tuleb ligipääsetavuse kordusvoor. [Esimene voor](ACCEPTANCE-G03.md) ja [valikute/aegumise voor](ACCEPTANCE-G03-VARIANTS.md) säilitavad eraldi tõendid. Allpool on algne tööleping.

- **Seos / eesmärk:** ptk 08–12/16/24/25, E3–E7/E10, eriti AT-01–08 ja AT-19–35. Mõõta tervikteekonda kokkulepitud brauserites ning rollidega.
- **Sisendid / eeltingimused:** AT-maatriks, praegused API-d ja õigused; täpsed toetatud versioonid ning klaviatuuri/ekraanilugeja kombinatsioonid.
- **Põhikäik:** järgmise sammuna koostada katseandmed ja automatiseeritav põhiteekond, rollide/HTTP negatiivne maatriks ning käsitsi kontrollide plaan; seejärel täita kogu kokkulepitud maatriks.
- **Vead:** kadunud vastus, vananenud vorm, aegunud link, keelatud õigus, võltsitud sõnum, CSP, skriptirike, piiratud küpsised, fookuse või ekraanilugeja katkestus.
- **Õigused / andmed / teavitused:** vähemalt kaks ettevõtet, owner/receptionist/staff/platform; ainult testkontaktid, kirjad capture/mock-režiimis; õigused kontrollitakse päris HTTP-ga.
- **Katsed / tõend:** brauseri versioon, viewport, roll, sammud, tulemus ja trace/screenshot; valitud ASVS-i kontrollide seosed; puuduvad katsed ei saa rohelist staatust.
- **Sõltuvused / vastutaja / hinnang:** F-02/F-03, lõpliku kujunduse järel uus ligipääsetavuse voor; arendaja + sõltumatu testija, järgmine automaatne põhimatriks **12–20 h**, kogu laiendatud maatriksi maht pärast seda.

## 23-G04 — kujunduse teostus ja vastuvõtt

- **Seos / eesmärk:** ptk 12, E5/E7, AT-34. Ühine versioonitud teema toimib alamdomeenil, iframe'is ja modaalis.
- **Sisendid / eeltingimused:** omaniku kinnitatud suund, mallide/fontide/piltide valik ning õigused. **Omaniku otsusel praegu ootel.**
- **Põhikäik:** kinnitada disain ja täpne ulatus; teostada mustand, eelvaade, avaldamine, vaikeseadete taastamine ning piiratud meedia/kontrasti reeglid.
- **Vead:** halb kontrast, vigane või suur pilt, salvestamata katse avalikus vaates, erinev teema eri paigutustes.
- **Õigused / andmed / teavitused:** omaniku kujundusõigus; pildid valideeritakse/töödeldakse serveris; teema ei muuda broneerimisõigusi ega saada kliendikirju.
- **Katsed / tõend:** AT-34 ning AT-32/33/35 kordus lõpliku kujundusega; tööfailid ja kasutusõigused üleandmises.
- **Sõltuvused / vastutaja / hinnang:** omaniku suund; disainer/arendaja. Järgmine piiritletud disainileping/prototüüp **6–10 h**, teostus hinnata kinnitatud maketi järgi.

## 23-G05 — SMTP ja maksepakkuja ühenduste vastuvõtt

- **Seos / eesmärk:** ptk 04/17/19, E8/E9, AT-36–42. Oma kirjad ja kuutasu välistehingud töötavad kontrollitud seadistusega.
- **Sisendid / eeltingimused:** omaniku hallatud saatjadomeen/SMTP, pakkuja test- ja hiljem pärisseaded, arve väljastaja kinnitatud andmed ning testadressaadid.
- **Põhikäik:** kontrollida SMTP autentimine/saatmine/katkestus, konto- ja broneeringu-/arvekirjad; pakkuja sandbox'is makselink, püsimakse nõusolek, lepitamine, tagastus ja loobumine.
- **Vead:** SMTP maas, kiri tagasi, pakkujavastus kadunud/duplikaat/hilinenud, osaline makse, tagastus või lõpetatud leping.
- **Õigused / andmed / teavitused:** võtmed ainult serveris; testideks eraldi adressaadid ja pakkuja katseandmed; pärismaksed/saatmine ainult vastava kasutuselevõtu kokkuleppe piires.
- **Katsed / tõend:** saatmiste koondtulemused ilma saladusteta, pakkuja tehingu ja kohaliku raha kooskõla, F-01 paranduse vastuvõtt; SMTP vastuvõtt ei võrdu adressaadi postkasti jõudmise garantiiga.
- **Sõltuvused / vastutaja / hinnang:** F-01, ühenduste ja väljastaja andmete kättesaadavus; käitaja/arendaja + omanik, tehniline testivoor **8–16 h**, välised seadistused/ooteajad eraldi.

## 23-G06 — koormus ja kalendri nähtavuse aeg

- **Seos / eesmärk:** ptk 11/26, E6/E10, AT-47/48. Tõendada õigsus ja kokkulepitud reageerimisajad lähtekoormusel.
- **Sisendid / eeltingimused:** eraldi mõõtekeskkond, 100 ettevõtet, 100 000 ajaloolist broneeringut, määratud töötajate/graafikute jaotus.
- **Põhikäik:** valmistada seemendus ja koormusskript, mõõta 20 saadavuspäringut/s ning kahe kasutaja kalendrivärskendust; fikseerida külm/soe seis, kestus ja serveri ressursid.
- **Vead:** p95 ≥ 1 s, nähtavus > 10 s, 429/5xx osakaal, DB lukud, teise ettevõtte andmed või vigane hõivamine. Lävendit ei saavutata veapäringute valimist välja jätmisega.
- **Õigused / andmed / teavitused:** ainult eraldi sünteetilised ettevõtted, kõrvaltoimed välja lülitatud; ükski töö ei tohi kasutada teiste projektide DB-d.
- **Katsed / tõend:** toorandmed, latentsused, vead, õigsuse järelkontrollid, täpne konfiguratsioon; 50 ühe aja kinnitust ei asenda seda katset.
- **Sõltuvused / vastutaja / hinnang:** kokkulepitud taristu; arendaja/testija/käitaja, esimene piiritletud voor **8–16 h**, leitud kitsaskohtade parandamine eraldi.

## 23-G07 — säilituse automaatika ja lahkumise andmeleping

- **Seos / eesmärk:** ptk 18/21, E8/E10, AT-46. Kinnitatud säilitustähtajad rakenduvad tegelikult ja andmed antakse lahkumisel õigesti üle.
- **Sisendid / eeltingimused:** kinnitatud andmeklasside tähtajad, legal hold, arvelduse säilituse kokkulepe, ekspordi- ja kustutuskuupäevad. Praegu on automaatika välja lülitatud.
- **Põhikäik:** järgmiseks kinnitada iga klassi täitmise leping ja kuiva läbimise aruanne; selle alusel teostada piiratud partiidega korduskindel töö ning jälgimine.
- **Vead:** aktiivne säilituskeeld, vigane tähtaeg, pooleli import/eksport, katkestus, korduskäivitus, vanast koopiast taastatud kontaktid.
- **Õigused / andmed / teavitused:** ainult kinnitatud poliitika, omaniku nõusolek ja piiratud operaatoriõigus; säilitatavad rahafaktid/ajalugu ei kao üldise kustutuse käigus; ei teki ootamatuid kliendikirju.
- **Katsed / tõend:** enne/pärast klasside arvud, keelatud kustutuse test, taastamisregistri seos, aegunud ekspordi/linkide kontroll ja AT-46 üleandmise protokoll.
- **Sõltuvused / vastutaja / hinnang:** kinnitatud tähtajad, F-04 ja 23-G08; omanik + andmekaitse/lepingute koostaja + arendaja. Järgmine andmeleping ja dry-run kavand **6–10 h**, lõplik automaatika hinnata pärast kinnitust.

## 23-G08 — väline taastamine ja sõltumatu paigaldus

- **Seos / eesmärk:** ptk 22/26/29, E10, AT-43/44. Uus käitaja suudab taastada andmed ja käivitada teenuse omaniku taristus.
- **Sisendid / eeltingimused:** kaitstud väline hoiukoht, võtmete sõltumatu hoiuviis, seire/hoiatuste saaja, realistlik sünteetiline andmemaht ja puhas sihtserver. Välise koha ning tootmise aktiveerimine on **omaniku otsusel edasi lükatud**.
- **Põhikäik:** kasutuselevõtu järel taastada DB/WAL, privaatfailid ja uuem eemaldamisregister eraldi tühja sihti; avada rakendus, kontrollida õigusi/seoseid ning mõõta RPO/RTO. Teine arendaja järgib juhendit ilma algse teostaja varjatud sammudeta.
- **Vead:** vana/puuduv/katkine koopia, vale võti/keskkond, mittetühi siht, puuduolev fail, aegunud eemaldamisregister, DB või worker'i rike.
- **Õigused / andmed / teavitused:** operaatori eraldi õigused ja võrguisolatsioon; taastatud keskkond ei saada kirju ega maksekutseid; tootmiskirjutused ja siht kaitstakse juhendi järgi.
- **Katsed / tõend:** AT-43/44, F-04 järelkontroll, tegelik RPO ≤ 15 min / RTO ≤ 4 h sihttaseme katse, hoiatuse kohalejõudmine ja üleandmise protokoll.
- **Sõltuvused / vastutaja / hinnang:** F-04/F-05, hoiukoha otsus ning ligipääsud; käitaja + teine arendaja, esimene piiritletud taastamis-/paigaldusvoor **8–16 h**, taristu hankimine eraldi.

## 23-G09 — tegelik auditeeritud tugivaade

**Seis 09.09.2026: piiratud kalendri/kliendikontaktide lugemisvoog on teostatud, kohalikult kontrollitud ning serverisse paigaldatud.** [Teostus ning API, andmebaasi ja brauseri tõendid](SUPPORT-G09.md). Omaniku ja sõltumatu ülevaataja vastuvõtt on märkimata. Allpool on töö algne vastuvõtuleping.

- **Seos / eesmärk:** ptk 04/19, E9. Platvormihaldur saab põhjendatud ajutise loa alusel ettevõtet aidata.
- **Sisendid / eeltingimused:** olemasolev support grant, ettevõte ja nõutud lugemisvaadete selgelt piiratud loend.
- **Põhikäik:** ühendada eraldi ainult lugemiseks tugivaade loa kontrolliga igal päringul; kuvada ettevõte, põhjendus ja aegumine; lõpetamine sulgeb ligipääsu kohe.
- **Vead:** vale ettevõte/kasutaja, aegunud või tühistatud luba, mitme vahelehe vana seis, otsene kirjutuskatse.
- **Õigused / andmed / teavitused:** värske platvormiõigus + MFA + kehtiv grant; puudub vaikimisi tenant-liikmesus; vajalikud lugemised auditeeritakse, tundlikke andmeid ei kopeerita üldlogisse ja kirju ei saadeta.
- **Katsed / tõend:** tegelik API ja brauseri avamine/lõpetamine/aegumine, võõra loa ja kõikide kirjutuste keeld; praegune üksnes grant'i test ei piisa.
- **Sõltuvused / vastutaja / hinnang:** toe täpne lubatud andmete ulatus; arendaja + õiguste ülevaataja, esimene piiratud kalendri/kliendi lugemisvoog **8–16 h**.

## Järjekord ja etappide sulgemine

F-01–F-05 kohalik parandusring on lõpetatud. 23-G09 piiratud tugivaate tehniline teostus on 09.09 valmis. Järgmiste töödena jäävad 23-G03/G05/G06/G08 vastavad protokollid. Äriotsused, piloot ja õiguste ahel liiguvad omaniku tööna nende sõltuvustega samal ajal. Kujunduse ja tootmise varunduse edasilükkamist audit ei tühista.

E2 kohalikule tehnilisele katsele on [värske tõend](CHAPTER-23.md) olemas ning eraldi koodimuudatust selle tõendi tekitamiseks vaja ei ole; lõplik omaniku vastuvõtt tuleb registreerida. E0–E10 muud piirid on põhiosa tabelis. Etappe ei märgita tervikuna valmis selle põhjal, et käesolev audit ja tööregister valmis said.
