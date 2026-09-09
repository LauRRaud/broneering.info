# Peatükk 04 — kasutajad, ettevõtted ja õigused

**Uuendus 09.09.2026:** 23-G09 piiratud auditeeritud kalendri- ja kliendikontaktide tugivaade on kohalikult teostatud ning API/andmebaasi/brauseriga kontrollitud. [Teostus, õiguste piirid ja tõendid](SUPPORT-G09.md). Allpool olevad 08.09 kirjeldused säilitavad oma ajaloolise kontrolliseisu.

Alustatud ja tehniline alus kontrollitud 07.09.2026 omaniku korraldusel. Alus: arendusplaani peatükk 04, rollimaatriks, D-01, D-04, D-13, D-19 ning peatüki 16 autentimisnõuded. Kujundus on ootel; vajalikud toimingud kasutavad HTML-i vaikevorme. See fail eristab kontrollitud teostust veel avatud vastuvõtust.

## Nõuded ja tööjaotus

| Töö | Kasutaja ja eesmärk | Sisendid, eeltingimused ja põhikäik | Vead, õigused ja mõju | Vastuvõtt, sõltuvus ja hinnang |
| --- | --- | --- | --- | --- |
| P04-01 Autentimine | Kutsutud kasutaja pääseb haldusse oma kontoga | Kehtiv kutse, nimi, e-post ja parool; e-posti kinnitamine, sisselogimine, väljalogimine | Vale/puuduv kutse, vale parool, kinnitamata e-post, keelatud konto; kasutaja ja sessioon oma PostgreSQL-is, ainult haldushosti küpsis | Autentimise integratsioonitestid; sõltub P04-03-st ja meilide saatmisliidesest; suur |
| P04-02 Liikmesus ja õigused | Omanik, vastuvõtt ja töötaja näevad ainult lubatud ettevõtet/toiminguid | Autenditud kasutaja, valitud ettevõte, aktiivne liikmesus, roll ja üksikload; server kontrollib igal päringul | Võõras ettevõte, puuduva töötajaseosega oma töö andmed, keelatud tegevus; kliendiandmeid ei anta platvormi haldurile vaikimisi | AT-19 ja AT-23; sõltub P04-01-st; suur |
| P04-03 Kutse ja ligipääsu sulgemine | Omanik lisab kasutaja ettevõttesse ja eemaldab lahkunud töötaja | Omaniku MFA, saaja e-post, roll, valikuline avalik töötajaprofiil; ühekordne aeguv kutse; vastuvõtmisel sama kinnitatud e-post | Aegunud/tühistatud/kasutatud või võõra e-posti kutse; eemaldamine tühistab sessioonid, ajalugu ei kustu; audit ilma kutsetunnuseta | AT-24, kutse- ja korduskatsete integratsioonitestid; meilide saatmine ptk 17 sõltuvus; suur |
| P04-04 MFA ja taastamine | Omanik ja platvormihaldur kasutavad teist autentimistegurit | Parool, TOTP autentimisrakendus, kontrollkood ja taastamiskoodid; privileegid avanevad alles pärast kinnitatud MFA-d | Vale/korduv taastamiskood, pooleli seadistus; MFA puudumine ei anna haldusõigust; parooli taastamine tühistab sessioonid | MFA, taastamiskoodide, paroolitaastamise ja sessioonide testid; Better Authi sobivuskatse; suur |
| P04-05 Omaniku vahetus | Ettevõttel säilib kontrollitud omanik | Praegune omanik ja olemasolev aktiivne, kinnitatud e-posti ning MFA-ga uus omanik; atomaarne üleandmine | Viimast omanikku ei eemaldata; võõras või kinnitamata kasutaja ei saa omanikuks; audit ja mõjutatud sessioonide tühistamine | Omanikuta jäämise ja samaaegsuse testid; P04-01–04; keskmine |
| P04-06 Platvormi ligipääsu piir | Platvormihaldur näeb ettevõtete seisundit ja loob põhjendatud tugijuhtumi | MFA-ga platvormi konto; ainult ettevõtete üldandmed; tugijuhtum nõuab põhjust ja aegub hiljemalt 30 minutiga | Puudub vaikimisi kliendiandmete massligipääs; tugijuhtum on logitud ja tühistatav; selle kontekst ei anna kirjutamisõigust | Ligipääsu- ja aegumise testid; paketid/arveldus/tõrkeseire jäävad vastavatesse detailpeatükkidesse; keskmine |

Peaagent vastutab nõuete, liideste, ühendamise, testitõendite ja avaldamise eest. Luna kirjutab piiritletud autentimise, liikmesuse ja lihtvormide osad. Hinnangud näitavad suhtelist töömahtu, mitte kinnitatud ajakava.

## Rollimaatriksi rakendamine

Omanikul on ettevõtte seadete, kasutajate, arvelduse ja ettevõtte tööandmete õigused. Vastuvõtul on kõigi töötajate broneeringute ja tööks vajalike kliendiandmete õigused. Töötaja enda broneeringute õigus eeldab kontrollitud seost selle ettevõtte avaliku töötajaprofiiliga. Avalik töötaja võib jätkuvalt eksisteerida kontota; vastuvõtu kontol ei pea töötajaprofiili olema. Sama konto võib kuuluda mitmesse ettevõttesse eri rolliga.

Selgesõnalised omaniku antavad erandid: vastuvõtule teenuste muutmine, kõigi graafikute muutmine ja kujunduse avaldamine; töötajale oma graafiku muutmine. Need on alguses keelatud. Üldist rolliredaktorit ei lisata. Dokumendi „ei vaikimisi” erandid, mida omanik pole täpsustanud (nt vastuvõtu kliendieksport), jäävad keelatuks; nende laiendamine kuulub O-07 otsusesse. Õiguse kirje ei tähenda, et hilisemate peatükkide kalender, hinnahaldus või kujunduse avaldamine oleks juba ehitatud.

Teiste töötajate hõivatuse õigus ja teiste klientide isikuandmete õigus hoitakse lahus. Platvormihalduri tunnus ei asenda ettevõtte liikmesust ega anna automaatset ligipääsu selle broneeringutele.

## Tehnilised piirid

Autentimiseks kasutatakse dokumendis soovitatud kohapeal töötavat Better Authi. Kasutajad ja sessioonid asuvad omaniku PostgreSQL-is; välise autentimisteenuse kontot ei lisata. Olemasolevad ettevõtted seotakse oma liikmesustabeliga. Autentimistabelid ei asenda broneeringumootori RLS-i ega olemasolevaid ettevõtte välisvõtmeid.

Avalikud broneerimislehed jäävad kontovabaks. Autentimise ja halduse API töötab ainult seadistatud `AUTH_BASE_URL` hostil. Küpsisel ei ole ühist alamdomeenide `Domain` välja. Tootmises kasutatakse HTTPS-i, eraldi juhuslikku saladust ning serverist loetavat sessiooni, et tühistamine jõustuks kohe.

Kutsete ja parooli taastamise saatmine on seotud peatükiga 17. SMTP puudumisel on sõltuvad toimingud selgelt kättesaamatud. Kohalikus arenduses võib lubada privaatse kirjade salvestuse; tootmises sellist režiimi ei lubata. Kirjatunnuseid, MFA saladusi ega paroole ei kirjutata rakenduse logisse. Esimene omanik luuakse serveri kontrollitud algseadistusega, mitte avaliku „tee mind omanikuks” API-ga.

## Vastuvõtu seis

**Osaline: tehniline konto- ja õiguste alus töötab, päris kontode avamine sõltub veel SMTP-st ja algomaniku määramisest.** P04-01–05 on rakendatud alltoodud testide piires. P04-06 sisaldab ettevõtete üldandmeid, põhjendatud 30-minutilist toeõigust, kontrollimise abifunktsiooni ja auditit; kalendri/kliendiandmete tugivaadet ei ole veel olemas. Hilisemad tööandmete API-d peavad kasutama õigust ja töötaja ulatust sama tehingu sees.

Kontrollitud 07.09.2026:

- `npm test`: **38 testi läbis**, kuues failis. Neist 12 broneerimismootori, 4 otsingunähtavuse, 11 õiguste/andmebaasi, 6 halduse API, 4 autentimise piiri/sessiooni ja 1 tegeliku kontoteekonna test.
- Läbiv kontotest kasutab päris serveriliideseid ja kohalikku kirjasalvestust: kutseta registreerumise keeld, kutsega konto, e-posti kinnitus, MFA eelne omaniku keeld, TOTP registreerimine, varasema sessiooni tühistamine, varukoodi ühekordsus ja parooli taastamisel sessioonide tühistamine.
- Õiguste testid katavad töötaja enda/teise profiili, võõra ettevõtte, keelatud konto, lubamatu üksikloa, aegunud/tühistatud/kasutatud kutse, kontekstita RLS-i, auditi kustutamiskeelu, toe aegumise/tühistamise, liikme eemaldamise ja kahe samaaegse omanikuvahetuse korral ühe omaniku säilimise.
- Brauseris loodi eraldi väljamõeldud proovikonto CLI algkutse abil. Kinnitati e-post, logiti sisse ja võeti kutse vastu; omaniku tööandmed jäid MFA-ta suletuks. Brauseri konsoolis oli 0 viga. Prooviettevõte ja konto eemaldati.
- `npm run build` läbis ilma hoiatuseta. Kõik kolm migratsiooni läbisid tühjas ajutises skeemis kontrolli (20 tabelit; tehing pöörati tagasi). `npm audit --omit=dev`: 0 teadaolevat haavatavust. Need kontrollid ei ole täielik turvaaudit ega dokumendi 48 vastuvõtutesti lõpetamine.

AT-19, AT-23 ja AT-24 konto-/liikmesusosa kohta on ülal tõendid. Kalender, kliendiregister, ettevõtte liitumisviisard, arveldus ning broneeringute meilide saatja jäävad oma peatükkidesse. Omaniku taastamise operatiivne juhend MFA ja kõigi varukoodide kaotamisel ning täielik kasutatavuse kontroll on veel avatud. Peatükki ei märgita tervikuna vastu võetuks.

Serverisse avaldati 07.09.2026 kood `f326bb4`. Enne migratsioone salvestati `/srv/broneering.info/backups/before-chapter04-20260907T131739Z.dump`. Linuxi ehitus ja migratsioonid 002/003 läbisid; uus veebikonteiner käivitus. HTTPS kontroll: avaleht ja mõlemad demod 200, halduse anonüümne olek 200 koos `mailAvailable:false`, sama halduse päring demo hostilt 404, seadistamata saatjaga registreerumine 503. Avaldatud sisselogimisvorm kontrolliti ka brauseris. Serverisse ei loodud päris kasutajat ega saadetud kirja.

## Kontokirjade seadistus

Tootmises on `AUTH_MAIL_MODE=disabled`. Haldus ütleb, et kutse, konto loomine või taastamiskirja saatmine ei ole veel saadaval; API tagastab 503. Olemasoleva konto sisselogimine ei sõltu SMTP-st.

Saatmiseks on vaja `AUTH_MAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT` (vaikimisi 587), `SMTP_USER`, `SMTP_PASSWORD` ja `SMTP_FROM`. Port 465 kasutab TLS-i; muidu on STARTTLS nõutud. Üksnes domeeni e-posti edasisuunamine ei anna SMTP saatmise kasutajat. Tegelik kirjade kohaletoimetamine, saatjadomeeni DNS ning veaseire kontrollitakse SMTP seadistamisel. Käesolevas etapis päris kirju ei saadetud.

Kohalikuks prooviks sea `.env.local` failis `AUTH_MAIL_MODE=capture`. Kirjad lähevad Gitist ja Dockerist välistatud `output/auth-mail/` kausta. See režiim on tootmises keelatud. `AUTH_SECRET` peab olema püsiv ja juhuslik; tootmises vähemalt 32 baiti.

## Esimese omaniku algkutse

Avalik registreerumine ei loo ettevõtet ega anna omanikuroolli. Olemasolevale ettevõttele loob algkutse `scripts/bootstrap-owner.ts` migratsioonikonto õigusega. Vajalikud on `BOOTSTRAP_EMAIL` ja `BOOTSTRAP_TENANT_SLUG`. Vaikimisi on kuivkäivitus; kirjutamine nõuab täpselt `BOOTSTRAP_CONFIRM=CREATE_OWNER_INVITATION` väärtust. See on operatiivse CLI kaitse, mitte rakenduse kasutajalt lisakinnituse küsimine.

Väljund on privaatne `output/bootstrap-owner.json`, kuhu salvestatakse 48 tundi kehtiv aktiveerimislink. Tunnust ei prindita logisse. Aktiivse omaniku olemasolul skript peatub; kordusalgkutse tühistab varasema algkutse ja logib selle. Saaja peab kasutama sama e-posti, selle kinnitama, kutse vastu võtma ja MFA seadistama. Omaniku päris e-posti ega platvormi administraatorit ei ole kasutaja eest määratud.

Serveri migratsioonikonteiner vajab väljundi säilitamiseks eraldi privaatset köidet, näiteks `/srv/broneering.info/bootstrap:/app/output`. Sea ka `AUTH_BASE_URL=https://haldus.broneering.info`; lokaalne vaikeaadress ei sobi tootmise algkutseks. SMTP peab enne päris kontole kutse andmist töötama. Algkutse on privaatne ligipääsulink; seda ei panda reposse ega avalikule veebilehele.
