# 23-G03 — teenusevalikud ja avatud vormi aegumine

09.09.2026 teine kohalik brauserivoor täiendab [G03 esimest maatriksit](ACCEPTANCE-G03.md). Rakenduse käitumiskoodi selles voorus ei muudetud. Lisati korduv katse ning sünteetilise fixture'i valikud. Testija: Codex; omaniku ja sõltumatu testija vastuvõtt on endiselt märkimata.

## Kontrollitud valikud ja hinnamuutus

Chrome 152.0.7977.83, Playwright Firefox 155.0 ja WebKit 26.5 Windowsis, igaühes 390 × 844. Need on brauserimootorite ja kitsa vaate katsed; Safari/iOS-i, pärisseadmeid ega ekraanilugejaid need ei asenda. Erinevalt esimese vooru klaviatuuriteekonnast kasutab see voor nuppude klikke ja väljade täitmist.

| Nõue | Katse | Tulemus |
| --- | --- | --- |
| AT-01/03 | Ainuteenust pakub ainult töötaja 1; töötaja samm jäetakse ära, kokkuvõttes 15 min / 15 € ja õige töötaja | Kõik kolm mootorit läbisid |
| AT-04 | Töötaja 2 isiklik `?staff=` link; ainult temaga seotud teenus ja pakkumised; tema 45 min / 35 € kokkuvõte | Kõik kolm mootorit läbisid |
| AT-05/06 | „Töötaja pole oluline”; kell 09:00 nähtavad töötaja 1 (30 min / 25 €) ja töötaja 2 (45 min / 35 €) eraldi pakkumised | Kõik kolm mootorit läbisid |
| AT-06, G03 veateekond | Töötaja 2 pakkumine valitakse ja kontaktid täidetakse; andmebaasis muudetakse tema hind 35 → 45 €; avatud vorm kinnitatakse | Kõik kolm said päris 409 `OFFER_CHANGED`; vajalik oli uus valik |
| AT-06 taastumine | Valitakse nähtavalt uus 45 € pakkumine; nimi, e-post ja telefon on alles; uus kinnitamine | Kõik kolm said 201 hinnaga 4500 senti ja kestusega 45 min |

Hinnamuutuse järel ja enne uusi kinnitamisi oli andmebaasis endiselt ainult neli algset sünteetilist broneeringut, **null** loomissündmust ja **null** outbox-kirjet. Pärast uusi kinnitamisi lisandus täpselt kolm proovibroneeringut, kolm loomissündmust ja kolm ootel teavitust. Kontaktid on `example.invalid`, ettevõtted demo-režiimis; teavitustöölisi ei käivitatud ja kirju ei saadetud.

Tõendid kataloogis [acceptance-g03-variants-20260909](audits/acceptance-g03-variants-20260909): iga mootori `prepare`, `reject`, `confirm` logi sisaldab täpset käivitatud koodi ja tulemust; `rejections-database-proof.json` ning `confirmed-database-proof.json` näitavad kõrvalmõjusid. Kuvatõmmised toetavad logides tehtud täpseid DOM- ja HTTP-kontrolle.

## AT-08: etteteatamispiir avatud vormis

**Kõik kolm mootorit läbisid.** Valitud aeg oli 16.09.2026 kell 16.00 Europe/Tallinn; enne vormide avamist seati fixture'i etteteatamine 10 238 minutile. Selle konkreetse pakkumise piir saabus 09.09.2026 kell **10:22:00 UTC / 13:22:00 Europe/Tallinn**.

Chrome'i ja Firefoxi kontaktivormid olid valmis 10:19:19 UTC, WebKiti vorm 10:19:40 UTC. Piiri möödumise järel kinnitati sama avatud vorm 10:22:26–27 UTC: päris API vastas kõigil 409 `SLOT_UNAVAILABLE`. Vana 16.00 pakkumine eemaldati uuest loendist; uue aja teadliku valimise järel säilisid täpselt nimi, e-post ja telefon. Uusi aegu selles AT-08 faasis ei salvestatud.

[Koondtulemus](audits/acceptance-g03-variants-20260909/results.json) kontrollib kõigi **15 brauserifaasi** läbimist ja seda, et vorm avati enne ning tagasilükkamine toimus pärast tegelikku ajapiiri. [Lõplik andmebaasitõend](audits/acceptance-g03-variants-20260909/final-database-proof.json) võrdub hinnamuutuse edukate kinnitamiste järgse seisuga: seitse broneeringut kokku, neist kolm proovibroneeringut, kolm loomissündmust ja kolm outbox-kirjet. Aegunud vormi katsed ei lisanud ühtegi kirjet. [Koristuse järel](audits/acceptance-g03-variants-20260909/cleanup.json) on mõlemad ettevõtted ja neli kontot eemaldatud, samuti nende sessioonid ja kohalikud allkirjastatud sessioonifailid.

Esialgne WebKiti katse luges loendit enne asünkroonse värskenduse lõppu; [see ebaõnnestumine](audits/acceptance-g03-variants-20260909/webkit-initial-timing-failure.log) on säilitatud. Katse muudeti ootama vana pakkumise eemaldamist ja Reacti efekti tehtavat pealkirjafookust. Pärast seda loodi uus päris ajapiir ja korrati kõiki kolme mootorit. Rakenduse koodi ei muudetud ega lisatud fikseeritud viivitust, mis varjaks aeglast värskendust.

TypeScripti kontroll läbis. Uusi funktsioone, migratsioone ega sõltuvusi ei lisatud rakendusse; tootmisbuildi ja kogu Vitesti komplekti ei korratud üksnes katsetööriistade/dokumentatsiooni muutmise tõttu. Tootmises töötab esimese G03 vooru juba kontrollitud veebipilt.

## Kordamine ja piirid

Kasuta esimese protokolli kohalikku keskkonda `AUTH_BASE_URL=http://haldus.localhost:3108` ja PostgreSQL-i. Käivita `scripts/acceptance-g03-fixture.ts variants` tavalise fixture'i loomise asemel. See lisab ainuteenuse ning teise töötaja hinnaks/kestuseks 35 € / 45 min. Tavarežiimi andmestik säilib varasema HTTP- ja klaviatuurimaatriksi kordamiseks.

1. Ava kolm eraldi Playwright CLI sessiooni. `scripts/acceptance-g03-variants.js` kohatäited asenda fixture'i manifestist (`__PUBLIC_URL__`, `__DAY__`, `__STAFF__` = teine töötaja), mootori nimest ja faasist. Ära salvesta auth-küpsiseid tõenditesse.
2. Käivita kõigis `prepare`. Iga faasi `pass:true` peab olema kontrollitud. Vormid jäävad avatuks.
3. Käivita fixture'i `raise-price`; kõigis brauserites `reject`; seejärel fixture'i `proof`. Alles nüüd käivita `confirm` ja salvesta uus `proof`. Uued ajad on mootoriti erinevad, et hinnamuutuse katse ei muutuks hõivamiskonfliktiks.
4. Käivita fixture'i `deadline` ning kohe kõigis `deadline-prepare`. Manifestis on `deadline.expiresAt`; oota päris kella järgi selle möödumiseni, vorme muutmata. Käivita `deadline-reject`, salvesta fixture'i `proof` ning korista `cleanup` abil.

Ajapiiri seadistus muudab ettevõtte reeglit **enne** uute vormide avamist. Vormid loevad värske reegli versiooni; ooteajal ei muudeta reeglit, serveri kella, brauseri kella ega API-vastuseid. Nii saab eristada päriselt möödunud etteteatamispiiri reeglimuudatuse konfliktist.

See voor ei lõpeta kogu G03 vastuvõttu: ülejäänud API-harud, iframe/modaal/CSP/küpsisepiirangud, ebaõnnestunud võrgu teekondade laiendatud maatriks, päris Safari/mobiiliseadmed ja ekraanilugejad jäävad esimese protokolli järgi avatuks.
