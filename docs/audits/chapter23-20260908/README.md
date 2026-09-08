# Peatüki 23 auditi tõendid — 08.09.2026

[Põhiaruanne](../../CHAPTER-23.md), [AT-maatriks](../../CHAPTER-23-ACCEPTANCE.md), [failide läbivaatuse katvus](../../CHAPTER-23-COVERAGE.md), [avatud tööd](../../CHAPTER-23-WORK.md).

See kaust säilitab konkreetse auditi tulemused. Neli leidu on korratud, viies tuleneb impordi suuruselepinguga vastuolus olevast Nginxi seadistusest. Failid ei ole üldine testikeskkonna paigaldaja ega tootmises käivitatav skriptikogum.

## Versioon ja keskkond

- HEAD: `4af7f99b2088e87f77619e6648d15455f9916f5b` **koos olemasolevate salvestamata muudatustega**. [baseline.json](baseline.json) sisaldab auditi alguse 331 ignoreerimata faili SHA-256 räsi. See on tunnusmanifest, mitte lähtekoodi täielik arhiiv.
- [summary.json](summary.json): värske kontrolli koond, versioonid ja pildi digest. Vitest: 38 faili / 250 testi; kõik läbisid, ükski ei olnud vahele jäetud. [vitest.json](vitest.json) säilitab täpsed testinimed ja ajad.
- PostgreSQL 18.6 käivitati auditi oma konteineris `broneering-ch23-audit-20260908`, ainult `127.0.0.1:50267`. Rakenduseroll oli `booking_app`, migratsiooni/fixture'i roll eraldi `booking_owner`. Teise taastamiskatse DB oli samas eraldi auditi konteineris.
- Tootmisrežiimis ehitatud rakendus käivitati oma konteineris `broneering-ch23-audit-web`, ainult `127.0.0.1:50969`. `/api/ready` andis 200. Konteinerid ja võrk kandsid silti `broneering.audit=chapter23-20260908`.
- Kõik kontaktid ja arved olid sünteetilised. Maksepakkuja fetch oli asendatud testvastusega; SMTP oli välja lülitatud või kontotestides privaatne capture. Kontokirju ja ligipääsusaladusi siia kausta ei kopeeritud.
- Kohaliku käivituse keskkonnamuutujad kirjutasid üle `.env.local` ühendused. Olemasolevaid arendus-/tootmisandmebaase ei kasutatud katsete sihina.

Auditi järel kontrollitud lähtefailide säilimine ja ajutiste teenuste koristus on [final-verification.json](final-verification.json). [evidence-manifest.json](evidence-manifest.json) annab selle kausta tõendifailide räsid; manifest ei sisalda enda räsi ega ole krüptograafiliselt allkirjastatud.

## Käivitatud kontrollid

| Kontroll | Säilitatud väljund |
| --- | --- |
| 47 migratsiooni tühja auditi DB-sse | [migrations.log.txt](migrations.log.txt) |
| `npm test -- --reporter=default --reporter=json --outputFile=output/audit-chapter23-20260908/vitest.json` | [tests.log.txt](tests.log.txt), [vitest.json](vitest.json) |
| `npm run typecheck` | [typecheck.log.txt](typecheck.log.txt) |
| `docker build --target runner --tag broneering-ch23-audit:20260908 .` | [build.log.txt](build.log.txt) |
| Pythoni `infra/operations/test_check.py`, `infra/backup/test_restore_guards.py`, `tests/provision_domain_test.py` | 6 läbivat unit-testi; algne terminalitulemus, eraldi toorlogi ei säilitatud |
| Taastamislepituse eraldi DB migratsioonid | [privacy-migrations.log.txt](privacy-migrations.log.txt) |

Ülaltoodud käsud on tehtud kontrolli kirjeldus. Andmebaasi vajavaid käske tuleb kordamisel suunata uude auditi jaoks loodud andmebaasi, mitte vaikimisi projekti olemasolevasse DB-sse. Täiskomplekti ei käivitatud uuesti pärast ainult auditi dokumentide lisamist; rakenduse lähtefailide muutumatust kontrolliti manifesti abil.

## F-01 ja F-03 kordamine

[probes.ts.txt](probes.ts.txt) on täpselt kasutatud katseskripti tekst, [probes.json](probes.json) selle tulemus. `.txt` lõpp hoiab arhiivi tavalisest testikäivitusest väljas.

Kordamiseks loo uus eraldi loopback-PostgreSQL, rakenda kõik migratsioonid ning määra **mõlemad** `DATABASE_URL` ja `MIGRATION_DATABASE_URL` selle sama uue instantsi samale DB-le. Skripti migratsiooniühenduse kaitse kontrollib `127.0.0.1`, `CH23_AUDIT_DB_PORT` vastet ja sünteetilist `local_audit_only` parooli; see ei asenda rakenduse ühenduse eraldi kontrolli. Kõik skriptis nähtavad paroolid/võtmed on kohalikud sünteetilised katseväärtused.

Kopeeri arhiiv uue katse jaoks algsesse suhtelisse asukohta `output/audit-chapter23-20260908/probes.ts`, sest impordid eeldavad sealset kaustasügavust. Käivitus toimus `node --env-file-if-exists=.env.local --import tsx output/audit-chapter23-20260908/probes.ts` abil, kus auditi ühendused olid juba keskkonnas määratud. Skript muudab ka globaalset arve väljastaja fixture'it ja jätab brauserikatse sünteetilised read alles; seepärast sobib ainult täiesti eraldi katse-DB. Teist korda kasuta uut DB-d: brauserifixture'il on kindel slug.

F-01 oodatud vigane tulemus: pärast 10 € laekumist on jääk 2500 senti, tagastatud valmis katse summa 3500 senti; täieliku krediteerimise järel vana võtme kordus annab ikka `ready`. F-03: arhiveeritud töötajaga seotud vana vastuvõtutöötaja kutse võetakse vastu ja kliendilugemise õigus jääb lubatuks.

## F-02 brauseri võrgutõrge

[browser-route.js.txt](browser-route.js.txt) ja [browser-flow.js.txt](browser-flow.js.txt) säilitavad kasutatud Playwrighti katse. [browser-evidence.txt](browser-evidence.txt) näitab 201 kinnitust ning kolme päringu võtmeid A/A/B ja sama sisu. Esimene toiming jõudis päris rakendusse ja DB-sse; vastus katkestati enne brauserit. Teine vastus asendati teadlikult 429-ga. Kolmas päring läks uuesti päris mootorisse ja põrkas esimese enda broneeringu hõivamisega.

Katse kasutas `@playwright/cli` sessiooni `chapter23-audit`, `run-code --filename` faili ning eraldi Chromiumi. Loopback-HTTP keskkonna tõttu suunati route.fetch `127.0.0.1` aadressile koos sünteetilise õige Host'i ja HTTPS Origin'iga. See kohandus kontrollib rakenduse olekuloogikat, **mitte päris TLS-i või tootmisproksi**. Skripti pordid, fixture'i teenus/töötaja ja kuupäev on konkreetse katse omad; hilisemaks korduseks tuleb need siduda uue fixture'iga ja tulevase kuupäevaga.

- [Seis pärast 429](chapter23-rate-limit.png): vorm muutub taas redigeeritavaks, kuigi esimene tulemus on teadmata.
- [Lõpptulemus](chapter23-lost-confirmation.png): klient suunatakse uut aega valima. DB järelkontroll leidis auditi ettevõttelt ühe kinnitatud broneeringu, ID `3a811651-6ee2-4688-a180-789f9507459a`.

## F-04 taastatud kliendivaade

[privacy-probe.ts.txt](privacy-probe.ts.txt) kasutab päris kliendi parandamise/eemaldamise funktsioone ja käivitab eemaldamisregistri lepituse ainult `recovery_` + 32 hex-märki nimega DB puhul. Mõlemad ühendused peavad viitama uuele samale auditi DB-le. Katses oli DB `recovery_743b95a3d4c74dcd87f2a8f4f86a56ed`. [privacy-fixture.json](privacy-fixture.json) on tegelik teenuse vastus: kontaktid on eemaldatud, parandussündmuse `metadata` on `{}`.

[privacy-browser.js.txt](privacy-browser.js.txt) kuvab selle vastuse ehitatud rakenduses. Identiteet ja kõrvalised halduse API-d olid mock'itud, et isoleerida tegeliku `CustomerManagement` komponendi kuvamine. Avati eemaldatud kliendi kaart. [privacy-browser-errors.txt](privacy-browser-errors.txt) sisaldab `Cannot read properties of undefined (reading 'name')`; listener'ite tõttu on sama viga topelt ning kõrvaliste mock-päringute 403-d ei ole leid. [Ekraanipilt](chapter23-recovered-customer.png) näitab kogu halduse üldist vealehte.

See tõendab taastamisskripti loodud andmekuju ja tegeliku vaate vastuolu. See ei tõenda terviklikku autentitud backup/restore/SMTP/worker'i vooru. Tavalise kontaktieemaldusega sama krahhi ei tekkinud.

## F-05 ja puuduva toe kontroll

Staatilise kontrolli asukohad: `infra/nginx.conf:37` seab `client_max_body_size 16k`, `/api/` seda ei asenda; `src/lib/import-csv.ts:3` lubab 5 MiB ning sama lubadus on impordi UI-s. Piiri ületamine põhjustab Nginxis 413. [Ametlik direktiivi kirjeldus](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size), kontrollitud 08.09.2026. Aktiivset tootmisproksit ei katsetatud.

Tugivaate puuduse kontroll: `rg -n authorizeSupportGrant src tests` leidis definitsiooni ja testi, kuid mitte rakenduse kutsujat. `admin-app.tsx` grant'i loomise/lõpetamise UI loeti koos admin state ja õiguskontrollidega. Loa olemasolu ei ava kasutatavat ettevõtte tugivaadet.
