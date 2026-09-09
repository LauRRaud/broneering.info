# Peatükk 23 — teostuse audit ja tööde vastuvõtt

**Uuendus 09.09.2026:** 23-G09 piiratud auditeeritud kalendri- ja kliendikontaktide tugivaade on API/andmebaasi/brauseriga kontrollitud ning serverisse paigaldatud. [Teostus, õiguste piirid ja tõendid](SUPPORT-G09.md). Allpool olevad 08.09 kirjeldused säilitavad oma ajaloolise kontrolliseisu.

**Paranduste järelseis 08.09.2026:** F-01–F-05 on kohalikult parandatud ja kontrollitud: [muudatused, 261 testi ning brauseri/proksi tõendid](CHAPTER-23-FIXES.md). Tootmise paigaldust ja ülejäänud 23-G01–G09 töid pole tehtud. Allpool olevad leiud ja E0–E10 tabel kirjeldavad auditi algseisu.

**Auditi kuupäev: 08.09.2026. Järeldus: V1 tervikvastuvõtuks pole alust.** Kohalik teostus ulatub palju kaugemale esialgsest E2 katsest, kuid audit leidis viis parandamist vajavat viga: neli korrati katsetega ja üks kinnitati proksi seadistuse ning impordi lepingu võrdlusest. Lisaks puuduvad osa kasutatavuse, väliste ühenduste, koormuse ja üleandmise tõendeid. Läbivad automaattestid ei kõrvalda neid puudusi.

Audit on tehtud omaniku soovil ka tegeliku koodi ja käitumise kohta. See aruanne lõpetab peatüki 23 auditi ja loob vastuvõtu registri; see **ei märgi E0–E10 ega kogu toodet omaniku poolt vastu võetuks**. Auditi enda käigus rakenduskoodi ei parandatud; hilisema korralduse alusel tehtud parandused on eraldi järelraportis.

- [AT-01–AT-48 tõendite maatriks](CHAPTER-23-ACCEPTANCE.md)
- [Peatükkide 01–30 ja tegelikult kontrollitud failide katvus](CHAPTER-23-COVERAGE.md)
- [Paranduste ja puuduva vastuvõtu tööregister](CHAPTER-23-WORK.md)
- [Säilitatud katsetõendid ja kordamise piirid](audits/chapter23-20260908/README.md)

## Auditeeritud versioon ja meetod

Alus on `Broneerimisplatvorm_arendusplaan_v1_0.docx`, v1.0, 06.09.2026, eelkõige peatükid 23–26 ja 29, koos omaniku hilisemate otsustega. Lähtefaili SHA-256: `327f393d10da62d84fc76db4c684014698fca88cfe0837cd29894109dabcc3a0`.

Auditeeriti **tööpuud**, mille HEAD oli `4af7f99b2088e87f77619e6648d15455f9916f5b`, koos juba olemas olnud salvestamata peatükkide muudatustega. Pelgalt selle commit'i väljavõtmine ei taasta auditeeritud versiooni. Enne auditit talletati 331 Gitiga jälgitava või ignoreerimata faili räsi [baseline.json](audits/chapter23-20260908/baseline.json); see manifest identifitseerib lähtefailide seisu, kuid ei sisalda nende täielikke koopiaid.

Kontroll ühendab nõuete võrdluse peatükkide järjekorras, oma rakenduskoodi, migratsioonide ja käitusskriptide lugemise, kogu olemasoleva testikomplekti värske käivituse, tühja andmebaasi migratsioonid, tootmispildi ehituse ja täiendavad veakatsetused. Algset riskipõhist lugemist laiendati süstemaatiliselt kõigile teostatud peatükkidele; failide kontrolliviis on katvuse registris. Teenusekihi katsetes kasutati päris PostgreSQL-i ja rakenduse piiratud rolli; fixture'ide loomiseks eraldi operaatoriühendust. Makseteenuse HTTP-vastus oli asendatud kohaliku testvastusega. Chromiumi broneerimiskatses jooksis päris ehitatud rakendus ja esimene broneering salvestus päriselt auditi andmebaasi.

Kõik uued katseandmed olid sünteetilised. Audit kasutas eraldi märgistatud andmebaasi, veebikonteinerit, võrku ja ainult loopback-porte. Olemasolevaid arendusandmebaase ega tootmist ei kasutatud katsete sihina. Päriskirju, makseid, juurutust ega serveritellimust ei tehtud.

## Kinnitatud koodileiud

P1 tähendab siin viga, mis tuleb lahendada enne mõjutatud voo tasulist kasutuselevõttu; P2 on piiratud teekonna oluline funktsionaalne viga. Need on töö prioriteedid, mitte CVSS-hinnangud. F-01–F-04 on korratud auditeeritud tööpuul. F-05 on staatiliselt kinnitatud konfiguratsiooniviga; tootmisproksi ei muudetud ega proovitud.

### F-01 · P1 · Olemasolev maksekatse võib küsida arve aegunud summat

**Asukoht:** [payment-checkout.ts](../src/lib/payment-checkout.ts), `beginCheckout`, read 29–35; pakkuja vastuse salvestamine, read 58–60. Seotud avaliku vaate päring: `readPublicInvoicePayment` samas failis.

35 € arve jaoks luuakse valmis 35 € maksekatse. Seejärel märgib haldur 10 € osalise laekumise. Uue päringutunnuse ja **värske arveversiooniga** makse alustamine tagastab endise valmis 35 € katse, kuigi tasumata on 25 €. Täieliku kreeditarve järel tagastab **algse tunnuse ja sisuga** korduspäring endiselt sama `ready` suunamislingi, kuigi arve seisund on `void`.

Põhjus: vana päringutunnuse haru naaseb enne arve värske seisu kontrolli. Teise tunnusega leitud poolelioleva katse haru kontrollib meetodit, kuid ei võrdle katse summat arve jäägiga. Ka välise loomispäringu ajal muutunud jäägi korral kontrollitakse hiljem vaid seda, kas midagi on tasuda, mitte summa võrdsust.

**Tõend:** [probes.json](audits/chapter23-20260908/probes.json): `outstanding=2500`, `returnedAmount=3500`, `sameAttempt=true`; krediteerimise järel `invoiceStatus=void`, `returnedState=ready`, `redirectReturned=true`. Mõlemas katses tehti ainult üks mock-pakkuja loomiskutse. Koodikontroll näitab sama teenuse kasutust omaniku ja avaliku makselingi teekonnas; dünaamiline katse tehti omaniku teenusefunktsiooniga.

**Mõju:** kasutajale saab anda arve praeguse kohustusega vastuolus oleva makselingi. Pakkuja juures võib see viia ülemakseni ja käsitsi lahendamise vajaduseni. Audit ei teinud pärismakset ega väida, et maksepartner võtaks krediteeritud arve eest kindlasti raha maha. Kohalik laekumiste hilisem arvestus ei paranda juba kasutajale pakutud valet summat.

**Parandus ja vastuvõtt:** iga makselinki tagastav tee peab kontrollima arve tänast tasutavust ja katse summat. Aegunud katse ei tohi jääda makstavaks pakkumiseks. Vana välise tehingu võimalikku lõpetamist tuleb lepitada enne uut maksekatset; pelgalt uue lingi automaatne loomine võib tekitada kaks tasutavat tehingut. Lisada katsed osalise/täieliku laekumise, krediteerimise, vana tunnuse korduse ning pakkuja vastuse ootamise ajal muutunud arve kohta. Töö: **23-F01**, etapp E9.

### F-02 · P1 · 429 pärast kadunud kinnitust katkestab broneeringu tulemuse taastamise

**Asukoht:** [booking-flow.tsx](../src/components/booking-flow.tsx), `submitBooking`, read 323–327 ja 363–366. [bookings/route.ts](../src/app/api/bookings/route.ts), read 8–10, rakendab mahupiiri enne broneerimismootori korduspäringu kontrolli.

Brauseris korratud jada:

1. Klient saadab taotluse tunnusega A. Server salvestab broneeringu ja tagastab 201; katse katkestab vastuse enne brauserini jõudmist.
2. Kasutaja vajutab „Proovi uuesti”. Brauser saadab õigesti sama tunnuse A ja sama sisu, kuid saab katses HTTP 429.
3. Üldine 4xx-haru tühjendab `keyRef` ja `payloadRef` ning lubab vormi muuta. Järgmine kinnitus saadetakse uue tunnusega B.
4. Mootor leiab esimese broneeringu hõivatud aja ja tagastab `SLOT_UNAVAILABLE`. Kasutajaliides suunab uut aega valima, kuigi tema enda esimene broneering on kinnitatud.

**Tõend:** [brauseri päringud](audits/chapter23-20260908/browser-evidence.txt), [seis pärast 429](audits/chapter23-20260908/chapter23-rate-limit.png), [eksitav lõpptulemus](audits/chapter23-20260908/chapter23-lost-confirmation.png). Esimene päring: 201 ja broneering `3a811651-6ee2-4688-a180-789f9507459a`; tunnused A/A/B, identne sisu. Andmebaasi järelkontroll: selle sünteetilise ettevõtte üks `confirmed` broneering. Teine vastus oli teadlikult sisestatud 429, mitte väide loomuliku koormuspiiri ületamise kohta. Marsruudi kood kinnitab, et selline vastus saab tekkida enne korduse taastamist.

**Mõju:** klient ei saa kinnitust kätte ja võib pidada enda kinnitatud aega ebaõnnestunuks; uue aja valimine võib lisada teise soovimatu broneeringu. Sama töötaja sama aja topeltbroneerimist ei tekkinud: andmebaasi kattuvuskaitse toimis.

**Parandus ja vastuvõtt:** teadmata lõpptulemus peab säilima üle mahupiiri, loetamatu vastuse ja teiste vastuste, mis ei tõenda algse toimingu tagasilükkamist. Hoida sama tunnus ja muutumatu sisu kuni selge tulemuseni. Võrrelda olemasoleva [use-booking-mutation.ts](../src/components/use-booking-mutation.ts) käsitlusega, et eri vaadete reeglid ei lahkneks. Lisada päris brauserikatse jada 201 + kadunud vastus → 429 → sama tunnusega õnnestunud taastamine; tulemus peab olema algne broneering, üks broneering ja üks loomissündmus. Töö: **23-F02**, E4/E5, AT-12 tervikteekond.

### F-03 · P1 · Töötaja arhiveerimine jätab tema ootel kutse kasutatavaks

**Asukoht:** [service-management.ts](../src/lib/service-management.ts), `save-staff`, read 64–68; [invitations.ts](../src/lib/invitations.ts), `acceptInvitation`, read 104–117.

Omanik kutsub aktiivse töötajaprofiiliga seotud inimese vastuvõtutöötaja rolli (`receptionist`, `staffId`). Enne kutse vastuvõtmist arhiveerib omanik töötaja. Kutse saaja võtab vana kutse vastu ja saab aktiivse liikmesuse ning `customers.read` õiguse.

Arhiveerimine sulgeb olemasolevad liikmesused ja sessioonid, kuid jätab seotud ootel kutsed alles. Kutse loomine kontrollib töötaja aktiivsust; kutse vastuvõtmine seda enam ei kontrolli. Vastuvõtutöötaja tavapärane kliendiõiguse kontroll tugineb aktiivsele liikmesusele, mistõttu pääseb see teekond läbi. API lubab sellist rolli ja töötajaseose kombinatsiooni.

**Tõend:** [probes.json](audits/chapter23-20260908/probes.json): `archived=true`, `invitationAccepted=true`, `role=receptionist`, `canReadCustomers=true`. Katse kasutas kutse loomise, arhiveerimise, vastuvõtmise ja õiguse kontrolli päris teenusefunktsioone. See ei eelda teise ettevõtte tunnuse võltsimist ega konto parooli murdmist: eeltingimus on varem õiguspäraselt saadud, endiselt kehtiv kutse ja kinnitatud konto.

**Mõju:** lahkumisel kavandatud ligipääsu sulgemine jääb pooleli; varem kutsutud inimene võib pärast arhiveerimist saada ettevõtte kliendiandmete õiguse. Tavalise `staff` rolli broneerimisfunktsioonidel on täiendav aktiivse töötaja kontroll, seega ei üldistata leidu kõigile rollidele ega tegevustele.

**Parandus ja vastuvõtt:** tühistada arhiveerimistehingus seotud ootel kutsed koos auditiga ning kontrollida töötajaseose lubatavust ka kutse vastuvõtmise tehingus. Ühine ettevõttelukk peab tagama õige tulemuse ka samaaegsel arhiveerimisel ja kutse vastuvõtmisel. Katsed mõlemale toimingujärjekorrale ja samaaegsusele; lõppseisus ei tohi vana kutse taastada ligipääsu. Töö: **23-F03**, E3/E6, AT-18/24.

### F-04 · P2 · Taastamise järel võib kliendikaardi ajalugu haldusvaate katkestada

**Asukoht:** [reconcile.ts](../scripts/operations/reconcile.ts), rida 22; [customer-management.tsx](../src/components/customer-management.tsx), read 21 ja 25.

Kliendikaarti on varem parandatud ja seejärel on selle kontaktid eemaldatud. Isoleeritud taastamisandmebaasis eemaldamisregistri rakendamine asendab kliendiga seotud auditisündmuse `metadata` tühja objektiga. Klienditeenus tagastab selle kuju muutmata. Kasutajaliides loeb otse `metadata.before.name` ja `metadata.after.name`; ühendamissündmuse juures eeldab samamoodi `source` ja `target` objekte. Puuduv alamobjekt tekitab `TypeError`-i ja kogu haldus läheb Next.js-i üldisele vealehele.

**Tõend:** [teenuse tegelik vastus](audits/chapter23-20260908/privacy-fixture.json), [brauseri vead](audits/chapter23-20260908/privacy-browser-errors.txt), [ekraanitõend](audits/chapter23-20260908/chapter23-recovered-customer.png). Sünteetiline klient parandati ja eemaldati päris teenusefunktsioonidega; lepitustöö käivitati päris eraldi `recovery_…` andmebaasis. Brauseris kasutati ehitatud rakendust ning selle teenuse tegelikku kliendivastust. Identiteet ja kõrvalised API-d olid kuvavea isoleerimiseks mock'itud; see ei olnud täielik autentitud taastamise läbikatse. Parandussündmuse krahh korrati; ühendamissündmuse samasugune puudus tuvastati koodist.

Tavaline kontaktide eemaldamine migratsiooni 046 funktsiooni kaudu säilitab puhastatud enne/pärast struktuuri ja ei tekitanud seda viga. Probleem on taastamise lepituse ja vaate erinevas andmelepingus. Kontaktide lekkimist või taastumist selle katsega ei tuvastatud.

**Parandus ja vastuvõtt:** kasutada taastamisel sama puhastatud auditikuju või anda API kaudu selge eemaldatud sündmuse esitus; vaade peab oskama eemaldatud ajalugu turvaliselt näidata. Kontrollida parandamise ja ühendamise ajalugu, lepituse korduskäivitust ja brauseris kaardi avamist. Töö **23-F04**, E6/E10, ptk 11/21/22 ja AT-43.

### F-05 · P2 · Serveri 16 KiB piir takistab lubatud CSV-importi

**Asukoht:** [nginx.conf](../infra/nginx.conf), rida 37 ja sellele järgnev `/api/` asukoht; [import-csv.ts](../src/lib/import-csv.ts), rida 3; [import-management.tsx](../src/components/import-management.tsx), rida 30.

Impordi API ja kasutajaliides lubavad kuni 5 MiB UTF-8 CSV-faili. Ka haldusdomeeni teenindavas Nginxi serveriplokis on aga `client_max_body_size 16k`; `/api/` ega imporditee seda üle ei määra. Selle konfiguratsiooniga katkeb näiteks korrektse 100 KiB faili üleslaadimine HTTP 413-ga enne rakenduseni jõudmist. Nginxi direktiivi dokumentatsioon kinnitab piiri ületamise korral 413 vastust. [Nginxi ametlik kirjeldus](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size).

**Tõendi piir:** see on hoidlasse antud serveriseadistuse ja rakenduse lepingu vastuolu. Jooksva VPS-i aktiivset konfiguratsiooni selles auditivoorus ei loetud ega impordipäringuga koormatud. Teenusekihi CSV-testid ja otse Node'i vastu tehtud katsed ei läbi seda proksit. Domeeni genereerimise mall kasutab samuti 16 KiB piiri, kuid impordi põhiviga puudutab haldusdomeeni seadistust.

**Parandus ja vastuvõtt:** anda täpsele autentitud imporditeele kokkulepitud 5 MiB piir, säilitades selle asukoha proksi päised ja mahupiiri; ülejäänud API piire ei pea suurendama. Hoida rakenduse voopõhine suuruse kontroll. Kontrollida päris testproksi kaudu alla/üle 16 KiB, kuni 5 MiB ning üle 5 MiB faile ja brauseri arusaadavat veateadet. Töö **23-F05**, E8/E10, ptk 18/22 ja AT-39.

## Puuduv teostus, mida testide edu varjab

**Tugivaade ei ole ühendatud.** [access.ts](../src/lib/access.ts) sisaldab `authorizeSupportGrant` kontrolli, aga sellel pole `src`-puus ühtegi kutsujat. [admin-app.tsx](../src/components/admin-app.tsx) „Alusta tuge” loob loa ja näitab loa tunnust ning lõpetamise nuppu; see ei ava valitud ettevõtte kalendrit ega kliendiandmete lugemisvaadet. Tavaline haldusolek nõuab tegelikku liikmesust. Loa väljastamise/kehtivuse test läbib, kuid ptk 04/19 kasutatav auditeeritud tugi on endiselt tegemata: **23-G09**. See on funktsionaalne puudujääk, mitte tõend õiguskaitsest möödumise kohta.

**Säilituskava automaatne täitmine puudub.** `retention.ts` tagastab `automationEnabled:false`. Kontaktide käsitsi eemaldamine ei ole kõigi andmeklasside tähtajaline kustutamine ega kogu andmestiku anonüümimine: **23-G07**.

## Mis koodis toimib ja mida selle põhjal järeldada saab

| Valdkond | Vaadatud teostus ja värske tõend | Piir |
| --- | --- | --- |
| Ettevõtete eraldatus | `db.ts`, `tenants.ts`, `access.ts`, RLS ja liitvälisvõtmed; rakenduserolliga eraldus-, puuli- ja võõra tunnuse katsed | See ei ole kõigi võimalike ründeteede ammendav turvaaudit |
| Broneerimise õigsus | `availability.ts`, `bookings.ts`, `booking-management.ts`, graafiku/teenuse muutused; ühised lukud, kattuvuspiirang, versioonid, terviktehingu piiratud kordused | Põhimootori edu ei kata F-02 brauseri olekuviga ega lähtekoormust |
| Kontod ja õigused | `auth.ts`, `admin-http.ts`, `access.ts`, kutsed ja marsruutide valvurid; värske konto/liikmesus, omaniku MFA, Origin ja host | F-03 näitab puuduvat kontrolli kutse elutsükli üleminekul |
| Arveldus | Tellimus, muutumatud arved, laekumised/parandused, kreeditarved, maksekatsed/-sündmused, püsimaksed ja töötajad | F-01 avatud; välise pakkuja leping, päriskeskkond ja lepituse tervikvastuvõtt puuduvad |
| Teavitused | Outbox, rendiga töövõtt, versiooni kontroll enne saatmist, tühistamine, korduskatsed, demo/impordi summutamine | Mock/capture ja teenusetestid ei tõenda SMTP kohaletoimetamist |
| Import, eksport ja kontaktid | CSV parser, versioonitud eelvaade, kinnitamine, privaatfailid, omaniku allalaadimisõigus, eksportide sulgemine kontaktide eemaldamisel | Säilituskava salvestub, aga `retention.ts` tagastab alati `automationEnabled:false`; automaatne säilitustöö on teadaolevalt teostamata |
| Manustamine | `embed.ts`, `proxy.ts`, `embed-frame.tsx`, tegelik `public/widget/v1.js`; täpsed päritolud, sõnumiskeemid, varulink, native dialog | Küpsiste, fookuse ja eri veebiehitajate täielik brauserikatse puudub |
| Käitamine ja taastamine | Readiness, töötajate tervis, `recovery.ts`, `reconcile.ts`, krüptitud artefakti testid, käitamise juhend | F-04/F-05; väline backup/hoiatuskanal on omaniku otsusel edasi lükatud; tootmismahu RPO/RTO tõend puudub |

Audit hõlmas oma `src`-koodi, kõigi 47 SQL-migratsiooni, `scripts`-tööriistade ja `infra` seadistuste lugemist. Täpne inventuur ning eraldi automaatse kontrolliga kaetud tõlkefailid/testid on [katvuse registris](CHAPTER-23-COVERAGE.md). Iga võimaliku toimingujada, sõltuvuste lähtekoodi ega iga tõlke keelelise kvaliteedi täielikku kontrolli ei väideta. Uut sõltuvuste CVE-inventuuri ega välist penetratsioonitesti selles auditivoorus ei tehtud. Tootmisserveri praegust seisu ei võrdsustata kohaliku tööpuuga.

Hooldatavuse tähelepanek: mitmed arvelduse ja halduse failid koondavad suure osa juhtloogikast pikkadesse üherealistesse harudesse ning kasutavad laiu `any` tüüpe. See raskendab tehingute ja olekumuutuste ülevaatust. F-01–F-03 parandustes tasub eraldada nimetatud eeltingimused ja hoida sama toimingu tagasilöökide käsitlus ühine. Üldist ümberkirjutust audit ei nõua.

## Selle auditi käigus tehtud kontrollid

| Kontroll | Tulemus | Tõendi piir |
| --- | --- | --- |
| Kõik migratsioonid tühja PostgreSQL-i | 47 migratsiooni rakendusid | Kohalik PostgreSQL 18.6; ei tõenda olemasoleva tootmisandmestiku uuendust |
| `npm test` koos JSON-raportiga | **38 faili, 250 testi, 0 vahele jäetud, 0 ebaõnnestunud; 47,63 s** | Andmebaasitestid olid lubatud, mitte keskkonnamuutujate puudumise tõttu vahele jäetud |
| `npm run typecheck` | Läbis | Tüübid ei tõenda äriliste üleminekute õigsust |
| Pythoni käitamise, taastamiskaitse ja domeeni unit-testid | 6 testi läbis | Ühiktestid, mitte tootmise hooldusproov |
| Docker `runner` ehitus | Läbis, sh arhitektuurikontroll ja Next.js tootmise build | Pildi digest ja ehituslogi säilitatud |
| Ehitatud veebikonteineri `/api/ready` | HTTP 200, `ready` | Auditi isoleeritud DB ning õige rakenduseroll |
| Maksete ja arhiveeritud kutse täiendavad katsed | F-01 ja F-03 korratud | Päris kohalik DB, maksepakkuja mock |
| Chromiumi võrgutõrke katse | F-02 korratud; serveris 1 kinnitatud broneering | Üks brauser, sünteetiline 429 ja teadlik vastuse kaotus |
| Taastamise lepituse ja kliendivaate katse | F-04 korratud | Päris DB/teenus; brauseris eraldatud kliendiandmete kuvamine |
| Proksi ja CSV-lepingu võrdlus | F-05 kinnitatud seadistusest | 16 KiB / 5 MiB vastuolu; tootmisproksit ei katsetatud |

Auditi pildi manifestide loendi digest: `sha256:bc90ee4a3ce4b630b7225726ae361c369d46de743ab8ac9fd31421be4fc0727a`. Käivitatud pildi konfiguratsiooni ID: `sha256:52a8e779a169e572e9c6e94faa0c15a70ceccde198fb68b2420fd9f154021417`.

Peatüki 22 varasem kahe reaga pgBackResti/WAL-i taastamiskatse on ajalooline tõend, mitte selles auditivoorus korratud täismahuline taastamine. Selle 4,17/4,55 sekundi tulemusi ei esitata tootmise RPO/RTO-na. Jooksev testikomplekt kontrollis krüptitud failide ja eemaldamisregistri lepituse mehhanismi.

## E0–E10 vastuvõtu seis

Vastutajad allpool on **täitmist vajavad rollid**, mitte nimetatud inimestele antud ülesanded. Hinnangud on tööregistris järgmise piiritletud sammu arendustundidena; need ei ole kogu etapi lepinguline maht ega ajakava. Kõigi etappide omaniku vastuvõtu kuupäev on praegu **märkimata**.

| Etapp | Tehniline seis ja vastuvõtu piir | Vastutaja roll / järgmine töö |
| --- | --- | --- |
| E0 Otsused ja lepingud | Osaline: V1 piirid ja mitu äriotsust olemas; õiguste ahel, puuduvad litsentsitekstid ning otsuste täielik kinnitus puuduvad | Omanik ja lepingute koostaja; 23-G01 |
| E1 Vajaduse kontroll | 5 intervjuu ja vähemalt 3 pilootpartneri eesmärgi täitmise tõend puudub | Omanik/tootejuht; 23-G02 |
| E2 Läbiv tehniline katse | Kohalik tehniline tulemus tõendatud kahe ettevõtte, päris PostgreSQL-i, eraldatuse ja 50 samaaegse kinnitusega | Arendaja/testija; olemasolevad testid ja käesolev protokoll; omaniku vastuvõtt veel märkimata |
| E3 Platvormi alus | Ulatuslik kohalik alus olemas; F-03 takistab ligipääsu elutsükli vastuvõttu | Arendaja; 23-F03, 23-G03 |
| E4 Broneerimismootor | DB ja teenusekihi õigsuse põhikatsed läbivad; korduspäringu tervikteekonnas F-02 | Arendaja/testija; 23-F02 |
| E5 Klienditeekond | Toimiv prototüüp olemas; F-02 ja täielik vigade/kasutatavuse maatriks avatud | Arendaja ning kasutatavuse testija; 23-F02, 23-G03 |
| E6 Ettevõtte töövahend | Kalender, mobiililoend, käsitsi haldus ja kliendid olemas; F-03/F-04 ning AT-47 mõõtmine avatud | Arendaja/testija; 23-F03, 23-F04, 23-G03, 23-G06 |
| E7 Kujundus ja manustamine | Manustamise tehniline alus olemas; kujundus omaniku korraldusel ootel; brauseri-/küpsisepiirangute vastuvõtt puudub | Omanik/disainer/testija; 23-G03, 23-G04 |
| E8 Teavitused ja elutsükkel | Järjekord, viisard, testrežiim, import/eksport ja lahkumisreeglid olemas; F-05, päris SMTP ja säilituse automaatika avatud | Arendaja/käitaja; 23-F05, 23-G05, 23-G07 |
| E9 Kuutasu ja platvormihaldus | Kohalikud arveldusvood olemas; F-01, kasutatav tugivaade ning SMTP/maksepakkuja pärisvastuvõtt avatud | Arendaja/käitaja/omanik; 23-F01, 23-G05, 23-G09 |
| E10 Piloot ja üleandmine | Vastuvõtmata: F-04/F-05, puudub piloot, lähtekoormuse katse, täielik turva-/taastamisvastuvõtt ja teise arendaja paigaldus | Omanik, käitaja ja sõltumatu testija; 23-F04, 23-F05, 23-G02, 23-G03, 23-G06, 23-G08 |

## Kinnitatud erandid ja lõpetamise reegel

Kuutasu kehtiv alus on **35 € lõpphind kuus, piiramatu töötajate arv, prooviperioodita, maksetähtaeg 7 päeva ja hilinemise lisaaeg 0**. Omaniku hilisem Maksekeskuse arve makselingi/püsimakse otsus täpsustab algset ulatust; seda ei märgita keelatud lisaarenduseks. Broneeriva lõppkliendi teenuse ettemaks ei kuulu samasse otsusesse.

Kujundus on omaniku korraldusel ootel. Peatüki 22 järgi jäävad välise varunduskoha valik, tootmise varunduse aktiveerimine ja hoiatuste korraldus hilisemaks. Need on nähtavad sõltuvused, mitte selle auditi käigus täitmata jäetud juurutuskorraldus. Edasilükkamine ei tõenda vastavate V1 vastuvõtutingimuste täitmist.

Etapi saab sulgeda alles siis, kui selle kokkulepitud katsed läbivad, parandatud kood on üle vaadatud, dokumentatsioon ja õiguste/litsentside kontroll on ajakohased, olulised vead lahendatud ning omanik on tulemuse registris vastu võtnud. Iga vastuvõtt peab sisaldama töö ID-d, versiooni/tööpuu tunnust, kuupäeva, testijat, tõendit, allesjäävaid piiranguid ja kinnitajat. F-01–F-05 kohalik parandustõend on [järelraportis](CHAPTER-23-FIXES.md); ülejäänud vastuvõtu protokollid jäävad [avatud töödeks](CHAPTER-23-WORK.md).
