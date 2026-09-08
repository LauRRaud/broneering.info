# Paranduste kohalik tõend · 08.09.2026

Tulemus, ulatus, muudetud failid ja kasutuselevõtu piirid on [järelraportis](../../CHAPTER-23-FIXES.md). Aluseks oli auditi järel säilinud tööpuu; [baseline.json](baseline.json) identifitseerib enne parandust olemas olnud 359 faili. [preservation.json](preservation.json): 341 sama räsiga, 18 sihilikult muudetud faili, 0 kadunud faili. Uued parandus-, testi- ja raportifailid lisanduvad sellele.

- [red.log](red.log): enne parandust 5 reproduktsiooni ebaõnnestub ja 17 olemasolevat kontrolli läbib.
- [tests.log](tests.log), [vitest.json](vitest.json): 40 faili, 261 testi, 0 ebaõnnestumist. [payment-final.log](payment-final.log): pärast viimast makselugemise lukustuse täpsustust 19 mõjutatud arveldustesti läbis.
- [typecheck.log](typecheck.log), [build.log](build.log): lõplik tüübikontroll ja Docker runner, sealhulgas arhitektuuripiirid ning Next.js build.
- [migrations.log](migrations.log), [database-proof.json](database-proof.json): 48 migratsiooni; päris brauserikatse jättis ühe broneeringu, ühe päringukirje ja ühe sündmuse. Taastamiskatse ehitas ka tühja andmebaasi kõigi 48 migratsiooniga.
- [nginx.log](nginx.log): päris Nginxi konfiguratsioon ja viis päringumahu kontrolli. Korratav hoidla käsuga `python tests/nginx_import_limit_test.py`; vajab Dockerit ja OpenSSL-i ning kasutab ainult uut lokaalset konteinerit.
- [browser-evidence.txt](browser-evidence.txt): neljal päringul sama tunnus ja sisu, esimene 201 salvestus. [Ootel vorm](chapter23-fixed-uncertain.png) ja [taastatud kinnitus](chapter23-fixed-confirmation.png).
- [privacy-evidence.txt](privacy-evidence.txt): vana tühja paranduse/ühendamise ajalooga kaart avaneb, ootamatuid JavaScripti vigu pole. [Kliendivaade](chapter23-fixed-customer.png).

Broneerimiskatse kasutas ehitatud rakendust, päris PostgreSQL-i ning sünteetilist demoteenust. [Route'i skript](browser-route.js.txt) laseb esimesel päringul päriselt salvestuda, katkestab vastuse, annab järgmistele sünteetilise 429 ja HTML 403 ning laseb neljandal sama päringu serverist taastada. [Vormiskript](browser-flow.js.txt) kontrollib lukustatud välju ja tunnuse/sisu püsimist. Server nõuab tootmisrežiimis HTTPS Origin'it; loopback-katse route adapter seadis selle päise teadlikult. See ei tõenda tootmise TLS-i ega avaliku serveri versiooni. Skript eeldab kirjeldatud sünteetilist teenust, vaba aega ja vastavat vormisammu; siin talletatud pordid pole püsiv teenus.

Esimene vormiskripti katse ootas pärast edukat salvestust vale pealkirja; tegelik kinnitus kontrolliti värskelt „Kohtumiseni, Auditi.” pealkirja, päringutõendi ja DB arvudega. Talletatud skriptis on õige pealkiri. Nginxi esimese katsestubi vaikimisi 1 MiB piir parandati stubis; hoidla proksi katse jooksis uuesti edukalt. Need olid kontrollrakise vead.

[Kliendivaate skript](privacy-browser.js.txt) kasutab algses auditis päris taastamisfunktsioonist saadud sünteetilist `{}` ajalugu ja lisatud sama kujuga ühendamise kirjet. Identiteedi/kliendi API on selles kuvamiskatses asendatud; teised haldusteenused saavad tahtliku 403. [Lõppkontroll](privacy-confirm.js.txt) eristab need ootamatutest vigadest. Tegelik SQL-lepitus ja korduv taastamine kontrollitakse `tests/recovery-reconcile.test.ts` kaudu.

Maksekatsed kasutavad sünteetilisi võtmeid ja täielikult asendatud HTTP-transpordi vastuseid. Live-semantika käivitamine testis ei teinud ühtegi päris makset. Automaattestide uuesti käivitamiseks tuleb anda `DATABASE_URL` ja `MIGRATION_DATABASE_URL` eraldi tühjale kohalikule testandmebaasile ning käivitada hoidla migratsioonid. Olemasolev arendus- või tootmisandmebaas ei ole nende fixture'ide siht.

Parandusringi konteinerid, nende testmaht, võrk ja eraldi Chromiumi sessioon suleti pärast tõendite kogumist. Tootmist ei muudetud. [manifest.json](manifest.json) sisaldab selle kausta failide SHA-256 räsisid.
