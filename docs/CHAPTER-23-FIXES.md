# Peatüki 23 auditi parandused

**08.09.2026 · Tulemus: `fixed` — F-01–F-05 parandatud ja kohalikult kontrollitud.** Omaniku korraldus „tee parandused” järgnes [auditile](CHAPTER-23.md). Muudatused on tööpuus; tootmisse neid selles voorus ei viidud. V1 ülejäänud teostuse ja vastuvõtu tööd 23-G01–G09 jäävad [registrisse](CHAPTER-23-WORK.md).

| Leid | Parandus | Korduskatse ja säilinud põhikäitumine |
| --- | --- | --- |
| F-01 · aegunud maksekatse | Kõik maksekatse tagastamise teed võrdlevad arve praegust seisundit, numbrit ja jääki katse summaga. Vastuolu annab `review`, `INVOICE_CHANGED` ja suunamislingita vastuse. Avalikud/platvormi lugemised võtavad tenant-luku, et arve ja katse lugemise vahele ei satuks laekumise muudatust. | Sama/värske tunnus, omaniku/platvormi/avaliku lingi lugemine, 10 € osamakse, täielik tasumine, ülemakse, kreedit ning arve muutumine link/enroll pakkujakutse ajal. Algne muutumatu arve saab endiselt ühe valmis katse; nullsummaga kaardisidumine läbib olemasolevad arveldustestid. |
| F-02 · kadunud broneeringukinnitus | Avalik vorm ja halduse ühine hook kasutavad sama lõpliku tagasilükkamise reeglit. Võrgu-, piirangu-, loa-, tundmatu ja loetamatu vastuse ajal säilivad päringutunnus ning sisu; avalikus vormis jäävad väljad lukku ja sama taotlust saab korrata. | Päris Chromium + ehitatud rakendus + PostgreSQL: salvestatud 201 vastus katkestati, järgnes JSON 429 ja HTML 403, neljas päring taastas algse kinnituse. Kõigil neljal sama tunnus/sisu; DB-s **üks broneering, üks päringukirje, üks sündmus**. Pakkumise ja versiooni tegelik konflikt lubab endiselt uue valiku. |
| F-03 · kutse kaudu taastuv ligipääs | Arhiveerimise tehing tühistab seotud ootel kutsed ja auditeerib need. Vastuvõtt kontrollib aktiivset töötajat. Ühine liikmesuse kontroll keelab mitteomaniku ligipääsu arhiveeritud seosega; rollimuutus kontrollib kõiki antud töötajaseoseid. Migratsioon 048 sulgeb varasemast jäänud vigased kutsed/liikmesused ja sessioonid. | Mõlemad seotud rollid, vana kutse pärast taasaktiveerimist, legacy-andmed, korduv migratsioon, arhiveerimise/vastuvõtu võistlus. Uus kutse aktiivsele töötajale ja töötajaseoseta vastuvõtja töötavad; omaniku kaitse, e-posti seos, ühekordne token ja õiguste põhikatsed läbivad. |
| F-04 · taastatud kliendikaardi viga | Taastamislepitus jätab paranduste/ühendamiste sündmustele sama puhastatud kuju nagu tavaline eemaldamine. Vaade talub ka varasemast jäänud tühje `before/after/source/target` välju. | Päris taastamis-DB ja korduv lepitus säilitavad puhastatud kuju, eemaldavad kontaktid/põhjuse ning jätavad kõrvalise kliendi alles. Ehitatud kliendivaade avas ka algse veakatse `{}` paranduse ja tühja ühendamise kirje ilma käitusaegse veata. |
| F-05 · CSV proksi piir | Täpsel `/api/admin/imports` teel on 5 MiB piir; tavaline 16 KiB API piir ning kiirusepiirang ja proxy päised säilivad. Rakenduse CSV suuruse, autentimise ja õiguste kontrollid jäävad kehtima. | Päris Nginx laadis hoidla konfiguratsiooni: 32 KiB ja täpselt 5 MiB jõudsid impordi upstream'ini; 5 MiB + 1 bait sai 413. Tavalise API ja impordi alamtee 32 KiB said endiselt 413. |

## Paranduse piirid

F-01 ei kustuta ega märgi välise pakkuja katset näiliselt tühistatuks. Avalikult antud link võib pakkuja juures hiljem laekuda: algne tehingutunnus ja salvestatud pakkujaseis säilivad, taustatöö saab katset kontrollida ning allkirjastatud laekumine arvestatakse üks kord ka krediteeritud arvel. Seda kinnitas täielikult asendatud HTTP-transpordiga live-semantika katse: 10 € pangalaekumine + 35 € pakkuja laekumine = 45 € arvel. Päris makseid ega väliseid API-kutseid ei tehtud. Juba kasutajale väljastatud välist linki see parandus maksepakkuja juures tagasi ei kutsu.

F-03 puhul tehti enne parandust sõltumatu lugemispõhine piirikontroll ja pärast esmast parandust üks eraldi möödapääsu/regressiooni ülevaatus. Järelülevaatus osutas enne parandust arhiveeritud töötajate kutsete taasaktiveerimise teele. See kinnitati lähtekoodist ning suleti migratsiooniga 048; selle kordus- ja taasaktiveerimiskatse läbis. Omaniku ebatavalist legacy-seost automaatselt ei tühistata, sest olemasolev arhiveerimine kaitseb omanikku ja omandi parandamiseks peab ligipääs säilima.

F-04 brauserikatses asendati identiteedi ja kliendi API vastused sünteetilise varem taastatud fixture'iga. Kontroll kasutab päris ehitatud kasutajaliidest, kuid ei ole kogu autentitud DB-taastamise üleandmiskatse. Muude haldusteenuste teadlikult antud 403 vastused on tõendis eristatud; JavaScripti ootamatuid vigu oli **0**. PostgreSQL-i taastamislepitus kontrolliti eraldi päris andmebaasiga.

F-05 Nginxi katse upstream oli kohalik stub. See tõendab päris proksi mahu- ja marsruudipiiri; kogu autentitud CSV-import läbi tootmisproksi on jätkuvalt välise vastuvõtu osa. Dünaamilised ettevõtete alamdomeenid ei ole impordi haldushost ning neile suurema päringumahu erandit ei lisatud.

## Kontrollid ja tõendid

Kõik katsed jooksid uues märgistatud lokaalses PostgreSQL 18 konteineris, loopback-pordil, piiratud `booking_app` rakenduserolliga. Fixture'ide ja migratsioonide jaoks oli eraldi operaatoriühendus. Olemasolevaid arendusandmebaase ei kasutatud katsete sihina.

| Kontroll | Tulemus |
| --- | --- |
| Esmased regressioonid enne parandust | **5 oodatud ebaõnnestumist**, 17 läbimist: vanad makse-, kutse- ja taastamisvead reprodutseerusid. |
| `npm run typecheck` | Läbis. |
| `npm test -- --reporter=default --reporter=json --outputFile=…` | **40 faili, 261 testi läbis**, 0 ebaõnnestumist, 52,05 s. |
| Viimase makselugemise lukustuse järel `npm test -- tests/payment-checkout-freshness.test.ts tests/invoices.test.ts` | **19 testi läbis**; kontrolliti parandatud valdkonda pärast viimast kooditäpsustust. |
| `npm run db:migrate` ja taastamiskatse tühi DB | **48 migratsiooni** rakenduvad; 048 kontrolliti ka olemasolevate vigaste kirjete ja topeltkäivitusega. |
| `docker build --target runner --tag broneering-ch23-fixes:20260908 .` | Läbis, sh arhitektuuripiirid ja Next.js tootmisehitus. |
| `python tests/nginx_import_limit_test.py` | Nginxi konfiguratsioon ja kõik viis päringupiiri kontrolli läbisid. |
| Python `unittest discover` käitus-, taastamiskaitse ja domeenitestid | **6 testi läbis**. |
| Chromiumi F-02 ja F-04 korduskatsed | Algne kinnitus taastub; eemaldatud kliendikaart avaneb; kuvatud tulemused kontrolliti ka ekraanipiltidelt. |

Täpsed logid, masinloetavad tulemused, brauseri tõendid ja räsid: [paranduste tõendikaust](audits/chapter23-fixes-20260908/README.md). Esialgset auditi tõendikausta ei kirjutatud üle.

## Muudetud failid ja kasutuselevõtt

- Makse: [payment-checkout.ts](../src/lib/payment-checkout.ts), [uued maksekatse testid](../tests/payment-checkout-freshness.test.ts).
- Broneeringu tulemus: [booking-mutation-outcome.ts](../src/lib/booking-mutation-outcome.ts), [avalik vorm](../src/components/booking-flow.tsx), [ühine hook](../src/components/use-booking-mutation.ts), [testid](../tests/booking-mutation-outcome.test.ts), [brauserikindlate moodulite loend](../scripts/architecture.ts).
- Kutse/ligipääs: [invitations.ts](../src/lib/invitations.ts), [access.ts](../src/lib/access.ts), [service-management.ts](../src/lib/service-management.ts), [migratsioon 048](../db/migrations/048_archived_staff_access.sql), [elutsükli testid](../tests/service-management.test.ts).
- Taastamine: [reconcile.ts](../scripts/operations/reconcile.ts), [kliendivaade](../src/components/customer-management.tsx), [taastamiskatse](../tests/recovery-reconcile.test.ts).
- Import: [nginx.conf](../infra/nginx.conf), [päris Nginxi katse](../tests/nginx_import_limit_test.py).

Kasutuselevõtul tuleb rakendada **migratsioon 048**, uuendada rakenduse/taastamistööriista pilt ning paigaldada Nginxi konfiguratsioon koos `nginx -t` kontrolli ja reload'iga. Ainult veebipildi uuendamine ei paranda proksi piirangut ega korista legacy-kutseid. Selles voorus tehti need kontrollid ainult eraldatud kohalikus keskkonnas. Tootmise paigaldus, päris SMTP/maksepakkuja vastuvõtt ja omaniku etappide kinnitamine on tegemata.
