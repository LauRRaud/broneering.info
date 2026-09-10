# Peatükk 23 — nõuete ja failide läbivaatuse katvus

**23-G03 lõppvoor 10.09.2026:** [laiendatud tehnilise testimise aruanne](ACCEPTANCE-G03-COMPLETION.md): 505 HTTP-päringut ja üks andmebaasi räsivõrdlus (506/506), 14/14 brauserifaasi (356 kontrolli), 287/287 automaattesti ja tootmisbuild läbisid. Hilinenud modaali ning makselingi õiguskontrolli vead parandatud. Pärisseadmete, ekraanilugejate ja sõltumatu kasutaja vastuvõtt jääb avatuks; allpool on varasemate voorude ajalooline seis.

**23-G03 uuendus 09.09.2026:** [esimene HTTP-, brauseri- ja klaviatuurimaatriks](ACCEPTANCE-G03.md) täiendab allpoolset ptk 08–12/16/24/25 katvust. Kolme mootori katse leidis ja kinnitas WebKiti põhisisulingi paranduse; katmata harud, pärisseadmed ja ekraanilugejad on uues protokollis eraldi märgitud.

**Uuendus 09.09.2026:** 23-G09 piiratud auditeeritud kalendri- ja kliendikontaktide tugivaade on API/andmebaasi/brauseriga kontrollitud ning serverisse paigaldatud. [Teostus, õiguste piirid ja tõendid](SUPPORT-G09.md). Allpool olevad 08.09 kirjeldused säilitavad oma ajaloolise kontrolliseisu.

See on 08.09.2026 auditi **tehtud kontrolli** register. Peatüki number ja etapp E0–E10 on eri asjad: lähteplaanil on 30 peatükki, tööde teostusjärjekorral 11 etappi. Audit võrdles peatükkide nõudeid nende tegeliku teostusega algusest lõpuni; koodi lugemine algas riskantsematest kohtadest ja laienes seejärel kogu oma rakenduskoodile. See ei ole väide, et kõik nõuded on täidetud.

[Täielik failide inventuur ja kontrolliviis](audits/chapter23-20260908/file-inventory.tsv) sisaldab iga kontrolli alla võetud lähtefaili eraldi. Inventuuri read ei ole koodikatvuse protsendid. Üks ühine fail võib täita mitut peatükki; allpool on tema peamine vastutus ja ristseosed.

Kontrolliviisid:

- **Lugemine:** oma TS/TSX/JS/CSS, SQL-migratsioonid, käitusskriptid ja seadistused loeti; võrreldi valideerimist, õigusi, tehinguid, olekute üleminekuid, API lepingut ning kasutajavaadet. `src/locales/*.json` sisu on eraldi automaatse kontrolli all.
- **Automaatne katse:** kõik 38 Vitesti faili ja 6 Pythoni testi käivitati. Testide nimed/tulemused seoti nõuetega; kriitiliste testide sisu vaadati lisaks. Iga testifaili iga rea käsitsi ülevaatust ei väideta.
- **Struktuuri/inventuuri kontroll:** kolme tõlkekataloogi võtmed ja interpolatsioonid, lukustatud sõltuvused ning olemasolevad litsentsiregistrid. Kõigi tõlgete keelelist kvaliteeti, sõltuvuste lähtekoodi ega OS-pakettide õigusi ei sertifitseerita.
- **Käitumiskatse:** täiendavad DB/makse/kutse katsed F-01/F-03, brauseri võrgutõrge F-02 ja taastatud kliendi kuva F-04. Piirid on [tõendite juhendis](audits/chapter23-20260908/README.md).

## Peatükid lähteplaani järjekorras

| Ptk | Nõuete võrdlus ja loetud teostus | Järeldus / järgmine piir |
| --- | --- | --- |
| 01 Toode ja esimese versiooni eesmärk | `src/app/page.tsx`, `search.ts`, avalehe meta/robots/sitemap; kogu ülejäänud funktsioonide koond | Kohalik toode olemas, V1 tervikvastuvõtt puudub; ptk 23 põhijäreldus |
| 02 Ulatusest väljas | Lähteplaan + `ROADMAP.md`; booking vs subscription/makse moodulite eristus | Lõppkliendi teenuse ettemaks, mitu asukohta ja ressursid jäävad välja; omaniku hilisem kuutasu Maksekeskuse otsus arvestatud |
| 03 Lukustatud otsused | Lähteplaani D-register, `ARCHITECTURE.md`, ptk 19/22 hilisemad otsused; vastavate moodulite tegelik käitumine | Õiguste ahel ja kõigi otsuste omaniku kinnitus 23-G01; kood ei kinnita äriotsust |
| 04 Kasutajad ja õigused | `auth*`, `access.ts`, `invitations.ts`, `admin-contracts.ts`, `admin-http.ts`, admin/auth marsruudid, `admin-app.tsx`, `bootstrap-owner.ts`; migratsioonid 002–003 | **F-03** ootel kutse; **23-G09** kasutatav tugivaade puudu. Sessiooni/MFA/õiguste põhikatsed läbivad |
| 05 Domeenid ja manustamine | `tenants.ts`, `embed*`, `proxy.ts`, `embed-frame.tsx`, `embedding-settings.tsx`, tegelik `public/widget/v1.js`, domeeni/Certboti/Nginxi failid; 004 | Täpsed hostid ja päritolud; päris eri brauserite/küpsiste/veebiehitajate maatriks 23-G03 |
| 06 Teenused ja töötajad | `service-management*`, `service-content.ts`, halduse UI, seoste lepingud; 005–006 | Pärimine, arhiiv ja versioonid olemas; **F-03** seotud töötaja kutsete elutsükkel |
| 07 Graafikud ja ajareeglid | `schedule-management*`, `schedule-contracts.ts`, `availability.ts`, booking-policy marsruut; 007 | Ühisosa, erandid, konflikt ja lukustus kontrollitud; lõplik UI maatriks 23-G03 |
| 08 Avalik klienditeekond | `booking-flow.tsx`, `contracts.ts`, avalikud catalog/availability/bookings API-d, `contact-validation.ts`, `booking-secrets.ts`, avalikud lehed | Põhivoog olemas; **F-02** kadunud tulemuse taastamine; kasutatavuse piloot puudu |
| 09 Töötaja eelistuseta valik | `availability.ts`, `bookings.ts`, `booking-flow.tsx`; pakkumiste koondamine, eristamine ja sõltuvused | Konkreetsed pakkumised ilma vaikimisi asenduseta; brauseri/kasutaja täielik vastuvõtt puudub |
| 10 Muutmine ja erandolukorrad | `booking-management*`, `booking-records.ts`, `booking-access.ts`, `booking-secrets.ts`, `manage-booking.tsx`, `use-booking-mutation.ts`, haldus-/bearer-API; 008–009 | Atomaarne muutmine, audit, kordused ja staatused olemas; **F-02/F-03** |
| 11 Kalender ja kliendid | `admin-calendar.tsx`/CSS, `booking-calendar.ts`, `booking-management.tsx`, `customer-management.ts`/TSX ja API; 010–011 | Põhivaated ja mõõdikud olemas; **F-04** taastatud kliendiajalugu; AT-47 tegelik mõõtmine puudub |
| 12 Kujundus, ligipääsetavus, keeled | `i18n*`, `locales.ts`, `language-settings*`, `client-fetch.ts`, `service-translations*`, `translation-provider.ts`, `service-translation-contracts.ts`, `accessibility.css`, widget'i keelegeneraator; 012–013 | Keelemehhanism ja teksti kinnitamine olemas; kataloogide struktuur testitud. Kujundus/meedia/kontrast ootel, ekraanilugeja maatriks puudub |
| 13 Andmemudel | **Kõik 47 migratsiooni** 001–047 loetud; `db.ts`, andmekihid, `migrate.ts`, `schema-report.ts`, andmemudeli testid | RLS, liitvälisvõtmed ja invariandid kontrollitud; tabeli olemasolu ei tähenda teema/säilituse/tugivaate valmimist |
| 14 Arhitektuur | `package.json`, `next.config.ts`, TS/Vitest seaded, `scripts/architecture.ts`, serveri/kliendi impordipiirid ja Docker | Oma Next.js server + `pg`/SQL, mitte algse tehnoloogiaettepaneku NestJS/Drizzle; lihtsustus dokumenteeritud, lõpliku üleandmise kokkulepe 23-G01 |
| 15 Mootor ja samaaegsus | `db.ts`, `bookings.ts`, `availability.ts`, muutmis-/graafiku-/teenuse-/impordikirjutuste ühised lukud ja lepingud | Päris DB konkurentsi- ja tagasipööramise katsed läbivad; kasutajaliidese **F-02**, koormus 23-G06 |
| 16 Eraldatus ja turve | Õiguskontrollid kõigis oma API-des, `http.ts`, `admin-http.ts`, `request-limits.ts`, `security-log.ts`, tokenid, failid, maksecallback'id; 017 | Mitmekihilised piirid olemas; **F-03**, praeguse kogu API/ASVS-i tervikmaatriks 23-G03; uus CVE-skann ei kuulunud vooru |
| 17 E-kirjad | Kõik `notification-*` moodulid, `auth-mail.ts`, seade-UI/API, notification worker, `smtp-verify.ts`; 018 | Outbox/rent/versioonid/kordused kontrollitud; oma SMTP tegelik kohaletoimetamine 23-G05 |
| 18 Liitumine/import/eksport/lahkumine | `company-provisioning*`, `onboarding*`, `preview*`, kutse taastamise UI, kõik `import-*`/`export-*`, `private-files.ts`, `company-exit*`, API-d; 019–028 | Kohalikud töövood olemas; **F-05** impordi proksi, päris elutsükli üleandmine 23-G07/G08 |
| 19 Kuutasu ja platvormihaldus | Kõik `billing-*`, `subscriptions.ts`, `invoices.ts`, `invoice-*`, `payments.ts`, `payment-*`, `makecommerce.ts`, arvelduse/makse UI/API ja worker'id; 029–042 | **F-01** aegunud maksekatse, **23-G09** tugivaade puudu; pakkuja/SMTP vastuvõtt 23-G05 |
| 20 Õigused ja litsentsid | `scripts/licenses.ts`, `package*.json`, Docker koopia/notice-etapp ning `DEPENDENCIES.md`, `LICENSE-COVERAGE.md`, ptk 20 | Varasem kogumine on tehniline inventuur. Puuduvad tekstid/OS-i inventuur ja lepinguline ahel 23-G01; uut juriidilist hinnangut ei tehtud |
| 21 Andmekaitse ja säilitamine | `customer-privacy.ts`, `customer-merge.ts`, `retention.ts`, impordi elutsükkel, ekspordi tühistamine, retention/customer UI/API; 043–046 | Käsitsi kontaktide eemaldamine olemas; automaatne säilitustöö **23-G07**; taastamisseos **F-04** |
| 22 Taristu/käitamine/taastamine | Kõik `infra` skriptid/seaded/timer'id, Compose/Docker, `operations-health.ts`, `worker-health.ts`, `/api/ready`, recovery/reconcile/artefact ja tervisekontrollid; 047 | **F-04/F-05**; kohalikud kaitsetestid/build olemas; väline varundus/hoiatused edasi lükatud, RPO/RTO ja teine arendaja 23-G08 |
| 23 Etapid ja vastuvõtt | Lähteplaani E0–E10/ülesande väljad/DoD, käesolev auditi- ja tööregister | Audit tehtud; toote/etappide omaniku vastuvõttu ei antud |
| 24 Broneerimise AT-testid | AT-01–18 seostatud tegelike testide, UI ja DB koodiga | Eraldi maatriks; **F-02**, seotud **F-03** |
| 25 Turbe/kasutatavuse AT-testid | AT-19–35, auth/access/http/DB/widget testide nimed ja tulemused, marsruutide/vaadete kood | Eraldi maatriks; brauserid/ekraanilugeja/ASVS puudulikud, teema ootel |
| 26 Käitamise/kuutasu AT-testid | AT-36–48, teavituse/arvelduse/impordi/ekspordi/taastamise automaattestid | Eraldi maatriks; **F-01/F-04/F-05**, tegelik koormus ja sõltumatu paigaldus puuduvad |
| 27 Maht/kulud/ärikontroll | Lähteplaani planeerimiseeldused vs hilisem 35 € kuutasu; tööregistri järgmiste sammude hinnangud | Varasemad tunnid/eurod ei ole kinnitatud eelarve; piloodi tõend puudub, 23-G01/G02 |
| 28 Otsused ja riskid | O-01–O-12 kontroll olemasolevate peatükkide ja hilisemate omanikuotsuste vastu | O-02/03/04 kuutasu/no-trial/tähtaeg täpsustatud; disain, säilituse detailid, välise backup'i/hoiatuste ja toe korraldus lahtised |
| 29 Üleandmine | Hoidla ja juhendite olemasolu, testide käivitatavus, tõendimanifest ning puuduv sõltumatu katse | Omaniku õiguste/litsentside, tööfailide ja taastamise täielik üleandmine 23-G01/G08 |
| 30 Arutelu ajalugu | Asendatud ettepanekute võrdlus kehtivate otsustega; Lisa C ajavalik seostatud ptk 09 teostusega | Ajalooline „esimene vaba aeg” või 29 € / 5 töötaja näide ei kirjuta kehtivaid otsuseid üle |

## Mida katvus ei tähenda

Audit ei kinnita tootmise praegust versiooni, väliseid lepinguid, SMTP/Maksekeskuse pärisseadeid, kõigi sõltuvuste turvalisust ega kõigi võimalike olekujadade veatust. Võrgutõrke ja taastatud kliendi brauserikatsed on konkreetsed vastunäited, mitte täielik brauserite regressioonikomplekt. Testide 250/250 tulemus ja viis leidu on omavahel kooskõlas: leiud puudutavad seni katmata piire.

Rakenduskoodi audit lõpetati avatud leidude kirjeldamisega. Paranduste teostus, uued regressioonitestid ja omaniku vastuvõtt on [tööregistris](CHAPTER-23-WORK.md), mitte märgitud selles voorus tehtuks.
