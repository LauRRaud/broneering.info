# Peatükk 26 — käitamise ja kuutasu vastuvõtt

Seis 12.09.2026: praegu teostatav serveri tehniline vastuvõtt läbis. AT-47/48 lähtekoormuse ja kalendri mõõtmised on tehtud, samuti serveri konkurentsi, impordi/ekspordi, lahkumise, sisemise arvelduse ning kogu sünteetilise andmebaasi ja privaatfailide taastamise katsed. Peatüki täielik omaniku vastuvõtt jääb avatuks allpool nimetatud väliste sõltuvuste ja inimvastuvõtu ulatuses.

Omanik kinnitas 12.09, et teist varuserverit, SMTP-d ega Maksekeskuse seadistust veel pole; need tehakse hiljem pärast kujundust. Neid teenuseid ei aktiveeritud ega märgita kontrollituks. Säilituse automaatika ja lepingulised tähtajad vajavad endiselt eraldi kinnitatud andmelepingut.

## Keskkond ja tõendite piir

- Mõõdetud rakenduse commit: `bd47944701f712c5402029bf6a9ecf8b0ed1ec56`; serveri veebipilt `sha256:df1d159c16a38d1343d5bccd1253d56e026c0a11a59adc050a5afc47fd569158`.
- Sama VPS kui töötav testteenus, Ubuntu 24.04, 3 virtuaalset CPU-d (AMD EPYC 9274F), ligikaudu 6,9 GiB RAM-i. Serveris töötavad ka muud projektid. [Ressursitõend](audits/chapter26-20260912/resources-before.log).
- Eraldi Compose-projekt, PostgreSQL 18 andmebaas, privaatfailide maht ja juhuslikud katsevõtmed. Veebipiir 1,25 CPU / 768 MiB, DB 0,75 CPU / 512 MiB. Postgresi piirangud, indeksid ja triggerid jäid aktiivseks.
- Algne jaotus: 100 ettevõtet, 100 000 ajaloolist ja 1000 tulevast broneeringut; 5 töötajat, 2 teenust ja 100 ajaloolist kliendiprofiili ettevõtte kohta. [Jaotus](audits/chapter26-20260912/dataset.json), [algne DB-kontroll](audits/chapter26-20260912/database-proof.json).
- Töötajad töötavad iga päev 09–12 ja 13–18; asukoht 09–18. Igas viiendas ettevõttes on ühe töötaja ühe päeva sulgemiserand. Teenused 25 € / 30 min ja 35 € / 45 min, puhver 5 min enne/pärast; teist teenust osutab kaks töötajat.
- Sünteetilised kontaktid kasutavad `example.invalid`. Standardi kuutasu on päris sisemise arveregistri kaudu kaetud sünteetilise maksekandega. Välist makset või kirja ei saadetud.
- Koormusklient töötas serveri loopback-võrgus läbi eraldi Nginxi TLS-proksi. 100 lähte-IP-d, üks ettevõtte kohta, säilitasid 5 päringu/s IP-põhise piirangu. Tulemus ei sisalda lõppkasutaja interneti latentsust.
- „Külm” tähendab äsja käivitatud rakendust ilma varasemate saadavuspäringuteta. DB oli seemendatud ja ANALYZE tehtud; jagatud serveri OS-i/DB vahemälu ei tühjendatud.

## Koormus ja kalender — AT-47/48

10.09.2026: päringud jagunesid ringis 100 ettevõtte vahel, vaheldusid kaks teenust ja kolm tulevast päeva; 25% päringutest kindla töötajaga, 75% kõigi sobivate töötajatega. Iga vastuse staatus, pakkumiste väljade lubatud loend, ettevõte, töötaja, hind, kestus ja päev kontrolliti. Ajastatud avatud koormus ei oodanud eelmise päringu lõppu; salvestati ka ajastuse hilinemine.

| Voor | Kestus | Päringuid | p50 | p95 | p99 | Maksimum | Tulemus |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Külm rakendus | 5 s | 100 | 21,7 ms | 30,4 ms | 93,1 ms | 130,2 ms | 100/100 |
| Soojendus | 60 s | 1200 | 12,3 ms | 19,5 ms | 22,7 ms | 36,8 ms | 1200/1200 |
| Põhimõõtmine | 600 s | 12 000 | 11,6 ms | **19,2 ms** | 22,3 ms | 43,0 ms | **12 000/12 000** |
| Kalendriga paralleelne koormus | 120 s | 2400 | 12,2 ms | 20,5 ms | 24,5 ms | 53,1 ms | 2400/2400 |

Kõik vastused olid HTTP 200 ja kontrollitud sisuga. Põhimõõtmise p95 arvutati toorandmetest uuesti üle; 1 sekundi piir läbis. Algse koormuse ajal tehti töötava teenuse vastu 134 valmisolekukontrolli, kõik läbisid. [Koond](audits/chapter26-20260912/load-all-results.json), [12 000 päringu toorandmed](audits/chapter26-20260912/load-measure-requests.json), [tervis](audits/chapter26-20260912/health-original-load.json), [lisakoormus](audits/chapter26-20260912/load-under-load-results.json).

Kalendris kirjutas omanik ja muudatusi jälgis eraldi vastuvõtutöötaja seanss Chrome'is 152.0.7977.83. Mõlemas voorus viis loomist, viis ajamuutust ja viis tühistamist. Aktiivne brauser uuendas andmeid perioodiliselt, käsitsi värskendamist ei tehtud. Mõõtmine sisaldab kirjutuspäringut ja Windowsi brauseri SSH-tunneli latentsust.

- Tavakoormuse 15/15 muudatuse suurim nähtavusaeg: **5006 ms**.
- 20 päringu/s all 15/15 muudatuse suurim nähtavusaeg: **4998 ms**.
- Kõik 30 muudatust jäid 10 sekundi sisse. [Tavakoormus](audits/chapter26-20260912/calendar-baseline.json), [koormuse all](audits/chapter26-20260912/calendar-under-load.json), [ekraanipilt](audits/chapter26-20260912/calendar-under-load.png).

12.09 tehti lisaks 50 eri päringutunnusega sama pakkumise kinnitust autentitud omaniku HTTP-liidese kaudu: 1 õnnestumine, 49 `SLOT_UNAVAILABLE` vastust; võitja korduspäring tagastas sama broneeringu. DB-s täpselt üks broneering, käsk, sündmus ja saatmata teavitus. [Tõend](audits/chapter26-20260912/concurrency-results.json). See katse kasutab haldusliidest; avaliku Turnstile-kinnituse 50 kliendi katset see ei tõenda.

## Import, eksport, arveldus ja lahkumine

**AT-39/40, tegelik HTTP:** kliendi- ja broneeringu-CSV üleslaadimine, eelvaade ja kinnitamine läbisid. Vigane rida blokeeris esialgse kinnituse; selgesõnalise vahelejätmise järel imporditi üks ja jäeti üks välja. Sama kinnituse kordus ning uue faili korduv väline ID ei tekitanud duplikaate. Vigane CSV-päis lükati tagasi. Broneeringuimport säilitas `source=import`, `customer_notifications=false` ja `is_test=false`; outbox'i arv jäi 31 peale.

Omanik taotles ekspordi HTTP kaudu, tegelik eksporditöö koostas privaatse JSONL-faili ja omanik laadis selle HTTP kaudu alla. Failis 1285 rida koos manifestiga, sh ettevõtte kõik 1024 broneeringut, 984 579 baiti. Kliendiseosed kontrolliti; vastuvõtutöötajale allalaadimine 403. [Impordi/ekspordi protokoll ja SHA-256](audits/chapter26-20260912/operations-import-export.json). Teenuse- ja töötajaimporti katab lisaks värske integratsioonitest, HTTP katses olid kliendid ja broneeringud.

**AT-41/42, sisemine arveregister:** eraldi 101. sünteetilise ettevõtte varasema tellimuse katse lõi paralleelse ja korduva tööga ühe arve iga juuli–septembri perioodi kohta, kokku kolm 35 € arvet. Iga maksekannet korrati sama tunnusega; registreeriti kokku kolm laekumist. Tähtaja ületamise otsus kontrolliti teenuse funktsiooni sisendiks antud kuupäeval ja täieliku tasumise järel oli ligipääs lubatud. See on tegelike DB-funktsioonide katse, mitte Maksekeskuse tehing. [Protokoll](audits/chapter26-20260912/operations-billing.json).

**AT-46, tegelikud tähtajad:** HTTP kaudu kinnitati ainult sünteetilise ettevõtte lahkumiskava. Uute broneeringute leht sulgus, lubatud ajal koostati ja laaditi alla eksport. 17 sekundi tegeliku ootamise järel lõppes kalendri, uue ekspordi ja varasema ekspordi allalaadimise õigus; omaniku lahkumise metaandmed jäid nähtavaks. Kõik 1024 broneeringut ja domeenireservatsioon säilisid. Aega ei võltsitud ega muudetud lõppkontrolli saavutamiseks otse DB-s. [Protokoll](audits/chapter26-20260912/operations-exit.json). See ei kinnita päris kliendi lepingulisi säilitustähtaegu ega aktiveeri automaatset kustutamist.

## Täismahus taastamine — AT-43

12.09 peatati ainult eraldi testveeb; testtöötajaid ei jooksnud. Tehti kogu sünteetilise DB `pg_dump` ja rakenduse taastamis-CLI abil 13 privaatfaili krüpteeritud koopia. Seejärel eemaldati teise testettevõtte ajaloolise kliendi kontaktid tegeliku eemaldamisteenusega ja koostati uuem eraldi eemaldamisregister.

Taastamine toimus uude `recovery_…` andmebaasi samas isoleeritud PostgreSQL-konteineris, uude privaatfailide kataloogi ja eraldi rakenduskonteinerisse. Enne registri rakendamist võrreldi kõigi **53 tabeli kõiki ridu** järjestusest sõltumatu räsivõrdlusega: täielik kattuvus, 101 ettevõtet ja 101 014 broneeringut. Esialgne 100 ettevõtte koormusandmestik oli selleks ajaks täienenud arveldusettevõtte, kalendri-, konkurentsi- ja impordikatsete kirjetega.

Taastamis-CLI rakendas uuema registri ja kontroll läbis:

- 10 broneeringu eemaldatud kontaktid jäid eemaldatuks; broneeringute koguarv säilis.
- Vanad sisselogimisseansid kustutati, varasemad ekspordid tühistati ja impordi kontaktkoopiaid ei jäetud uuesti kättesaadavaks.
- Üks säilitatav sünteetiline privaatfail taastus täpse suuruse ja SHA-256-ga; impordi/ekspordi koopiad eemaldati vastavalt taastamislepingule.
- Rakenduse DB-kasutajal polnud superkasutaja ega RLS-ist möödumise õigust.
- Taastatud veebis: anonüümne haldus 401, värske testseanss 200, avalikud pakkumised 200; uus käsitsi broneering õnnestus ja ilmus loendisse.

Mõõdetud taastamiskäik koos kontrollide ja rakenduse käivitamisega: **11,9 s**. Koopia vanus taastamise alguses: **2,829 s**. Need on konkreetse sama VPS-i sünteetilise katse mõõtmised. Need ei tõenda serverikao, teise masina, kaugühenduse, välise varundusgraafiku ega WAL-i 15 minuti RPO / 4 tunni RTO eesmärki. [Kokkuvõte](audits/chapter26-20260912/recovery/summary.json), [kõik tabelid](audits/chapter26-20260912/recovery/database-restored.json), [privaatsus ja failid](audits/chapter26-20260912/recovery/recovery-verified.json), [rakenduse HTTP-kontroll](audits/chapter26-20260912/recovery/http-verified.json), [käivituslogi](audits/chapter26-20260912/recovery-run.log).

## Kontrollide seis ja edasine vastuvõtt

| AT | Seis pärast seda vooru |
| --- | --- |
| 36–38 | Värsked teavituste integratsioonitestid läbivad; päris SMTP katkestus/taastamine ja kirjade vastuvõtt omaniku soovil hiljem. |
| 39 | Serveri HTTP kliendi-/broneeringuimport, vead ja kordused läbisid; kõik neli impordiliiki värskes integratsioonikatses. |
| 40 | Impordi teavituste puudumine serveri DB-s tõendatud; päris SMTP-ga kontroll hiljem. |
| 41–42 | Sisemine kordusarveldus, laekumise korduskindlus ja kasutusõigused läbivad; päris Maksekeskus hiljem. |
| 43 | Täis-DB + failid + uuem register + taastatud rakendus samal VPS-il läbisid; väline server ja varundusgraafik hiljem. |
| 44 | Teise sõltumatu arendaja puhta serveri paigaldus jääb inimvastuvõtuks. |
| 45 | Omaniku ligipääsude ja lepingulise õiguste ahela kinnitus jääb inimvastuvõtuks. |
| 46 | Tehniline ekspordi/tähtaja/ligipääsu/säilimise katse läbis; päris andmeleping ja säilituse automaatika on eraldi. |
| 47–48 | Mõõdetud keskkonna ja jaotuse piires tehniliselt läbitud. |

Värske kohalik regressioon: **10 testifaili, 61/61 testi läbisid**, sealhulgas import, eksport, arved, maksed, lahkumine, teavitused, taastamisartefakt ja eemaldamisregistri lepitus. [Testilog](audits/chapter26-20260912/tests.log), [masinloetav tulemus](audits/chapter26-20260912/tests.json). Rakenduse koodi ega migratsioone selles voorus ei muudetud; uus veebipildi build pole vajalik. Katseabide tüübikontroll läbis.

Katseabides parandati UTC asemel ettevõtte ajavööndiga CSV-aeg, katkestatud katsete lõpetamata importide koristus ja katsekonteineri UID vastavus veebile. Taaskatsetes esinesid ka õiguspärane päringulimiit, lõpetamata impordi piir ja ajutised SSH katkestused; neid ei käsitleta läbitud katsetena. Taastatud veebi esimene valmisolekupäring eelnes rakenduse käivitumise lõpule; järgnevad valmisoleku ja põhivoo kontrollid läbisid. Uut rakenduse viga selles voorus ei tuvastatud.

Taasesituse alused: [testkeskkond](../infra/acceptance/chapter26.compose.yaml), [seemendus](../scripts/chapter26-fixture.ts), [koormus](../scripts/chapter26-load.mjs), [kalender](../scripts/chapter26-calendar.js), [konkurents](../scripts/chapter26-concurrency.mjs), [toimingud](../scripts/chapter26-operations.ts), [taastamiskäik](../infra/acceptance/chapter26-recovery.sh). Skriptid on piiratud eraldi testandmebaasidega; seadistuse võtmeid ja autentimisseansse ei avaldata tõendipakis.

12.09 lõppkoristus: taastatud veeb, algne testveeb ja DB, märgistatud testmahud/võrk, eraldi Nginx, katsevõtmed ja sünteetilised varukoopiad eemaldati. Eemaldati ka varasema nurjunud seemenduse kataloog ning kohalikud katseautentimise failid. Töötava teenuse valmisolek jäi korras. [Koristuslogi](audits/chapter26-20260912/cleanup.log), [järelkontroll](audits/chapter26-20260912/cleanup-verify.log), [vana katsekataloog](audits/chapter26-20260912/cleanup-old-fixture.log). Järgmisel korral tuleb luua uus testkeskkond; lõpetatud lahkumiskatsetega seemendust ei kasutata algse lähtekoormuse korduseks.
