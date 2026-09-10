# Peatükk 24 — broneerimise õigsuse vastuvõtt

**10.09.2026: peatüki 24 tehniline vastuvõtt on lõpetatud. AT-01–AT-18: 18/18 läbitud; peatüki lõpu viis lisakontrolli on samuti tõendatud.** Testija: Codex. See protokoll ei kinnita kogu V1 omaniku vastuvõttu ega lõpeta peatükkide 25–26 pärisseadmete, ekraanilugejate, välisühenduste ja koormuse töid.

Alus on `Broneerimisplatvorm_arendusplaan_v1_0.docx` peatüki 24 täpne katsetabel. [Nõuded koos algdokumendi SHA-256 räsiga](audits/chapter24-20260910/requirements.json) säilitavad kõik 18 oodatavat tulemust ja lisakontrollide teksti. [Masinloetav koond](audits/chapter24-20260910/results.json) seob iga nõude läbinud testinimede ja brauseritõenditega.

## Lõplik kontroll

- **41 testifaili, 290/290 automaattesti**, null ebaõnnestunut ja null vahelejäetut. [Logi](audits/chapter24-20260910/full-tests.log), [Vitesti JSON](audits/chapter24-20260910/vitest.json).
- **9/9 uut brauserifaasi, 126/126 kontrolli**: avaliku valiku lisajuhud, kahe haldaja konflikt/kordus ning ebaõnnestunud muutmine/arhiveerimine. Chrome 152.0.7977.83, Playwright Firefox 155.0 ja WebKit 26.5 Windowsis. Avalik vaade 390 × 844, halduskatse 1280 × 900. Tõendikataloogis on 15 kuvatõmmist.
- **Tootmisbuild ja TypeScript läbisid**, sealhulgas 155 lähtefaili arhitektuurikontroll. [Build](audits/chapter24-20260910/build.log), [lõplik tüübikontroll](audits/chapter24-20260910/typecheck.log).
- Iga mootori järel kontrolliti broneeringute, käskude, sündmuste, teavituste ja ligipääsu tegelikku andmebaasiseisu. Kõik kolm järelkontrolli läbisid. Kõigi kolme fixture'i koristuse järel jäi alles **0 testettevõtet ja 0 testkontot**.

Varasemaid avaliku broneerimise tõendeid kasutatakse nende tegeliku kuupäevaga: [G03 esimene voor](ACCEPTANCE-G03.md), [09.09 valikute ja päris ajapiiri voor](ACCEPTANCE-G03-VARIANTS.md) ning [katkenud vastuse taastumine](ACCEPTANCE-G03-COMPLETION.md). Neid ei esitata 10.09 uuesti käivitatud brauseritestidena. Koondskript kontrollib, et nendega seotud avaliku voo, broneerimismootori, saadavuse ja vastuse liigitamise lähtekood pole muutunud. Muutunud halduskomponent sai uue kolme mootori kontrolli.

## AT-01–AT-18 tulemused

| ID | Kontrollitud oodatav tulemus | Tulemus ja tõend |
| --- | --- | --- |
| AT-01 | Teenus näitab ainult sobiva aktiivse seosega töötajaid | **Läbis.** Värske sobivuse/saadavuse test; varasem valikuvoor ja uus arhiveerimise brauserikatse |
| AT-02 | Sobimatu töötaja otsene broneerimiskatse keelatakse | **Läbis.** Värske mootori test ning 09.09 tegeliku HTTP negatiivne katse |
| AT-03 | Ühe sobiva töötaja korral samm puudub ja nimi on enne kinnitamist nähtav | **Läbis.** 09.09 valikuvoor kõigis mootorites; uus katse pärast teise töötaja arhiveerimist |
| AT-04 | Isiklik link näitab ainult selle töötaja teenuseid | **Läbis.** Värske kataloogitest, 09.09 valikuvoor ja uus arhiveeritud töötaja lingi katse. Kasutajale kuvatakse juhis ja ettevõtte varulink; kataloogi API keeldub 404-ga |
| AT-05 | Koondsaadavus ei vali ega broneeri aega automaatselt | **Läbis.** Värske pakkumiste ühenduse test; uus järgmise päeva otsing jätab aja valimata ning ei saada loomispäringut |
| AT-06 | Hind, kestus ja töötaja kuuluvad üheselt konkreetsele pakkumisele | **Läbis.** Värske hinnamuutuse test; 09.09 brauserites eraldi pakkumised ning hinnamuutus → keeld → uus teadlik kinnitus |
| AT-07 | Kell 13.00 ja 120-minutilise etteteatamisega ei pakuta ega kinnitata aega enne 15.00 | **Läbis.** Värsked määratud kellaga mootori/graafiku testid; selle katse etteteatamine on täpselt 120 minutit |
| AT-08 | Vormis möödunud ajapiir kontrollitakse kinnitamisel uuesti; kontaktid säilivad | **Läbis.** Värske mootori test ja 09.09 kolmes brauseris tegelikult möödunud ajapiiri tõend |
| AT-09 | Kogu hõivamine, sealhulgas puhvrid, peab sobima | **Läbis.** Värsked puhvri/pausi ja ainult puhvrit puudutava konflikti testid |
| AT-10 | Pausid, puhkus ja erandpäevad mõjutavad saadavust õigesti | **Läbis.** Värsked sulgemise, asenduspäeva, puhkuse ja asukoha/töötaja ühisosa testid; uus suletud päeva brauserikatse |
| AT-11 | 50 sama aja kinnitamiskatsest tekib üks uus broneering | **Läbis.** 50 paralleelset tegeliku mootori/PostgreSQL-i toimingut; üks broneering ja üks outbox-kirje |
| AT-12 | Sama tunnuse ja sisuga kordus taastab sama tulemuse | **Läbis.** Värske 12 paralleelse korduse test, uus kahe haldaja tühistamise kadunud vastus/kordus ning 09.09 avaliku loomise taastumine |
| AT-13 | Muudetud sisuga sama tunnus annab konflikti ja jätab vana sisu alles | **Läbis.** Täiendatud test võrdleb kogu salvestatud broneeringurida ning kontrollib pärast konflikti algse sisuga korduse täpset tulemust |
| AT-14 | Graafiku sulgemine ja broneerimine järgivad ühist lukustust | **Läbis.** Värske samaaegse sulgemise/kinnitamise test: üks võitja, keelatud aega ei teki |
| AT-15 | Nurjunud ajamuutus säilitab vana aja tervikuna | **Läbis pärast allpool kirjeldatud vormiparandust.** Värske mootori test; uus päris konkureeriva broneeringuga brauserikatse, vana DB-rida täielikult muutumatu |
| AT-16 | Vana versioon ei kirjuta teise haldaja muudatust üle | **Läbis.** Värske konkurentsitest ja uus owner/receptionist katse eraldi brauserikontekstides kõigis mootorites |
| AT-17 | Ajavööndi ja kellakeeramise hetked on korrektsed | **Läbis.** Kaks uut päris graafiku/saadavuse testi: 29.03.2026 ja 25.10.2026 Europe/Tallinn. Olematu ja kokkulepitud reegli järgi mitmetähenduslik kellatund pole valitav, tegelik kestus on õige |
| AT-18 | Arhiveerimine sulgeb uued valikud, säilitab ajaloo ja toob töötaja tulevased ajad lahendamiseks | **Läbis.** Värsked ajaloo/ligipääsu testid ning uus teenuse/töötaja arhiveerimise vormi- ja DB-kontroll kõigis mootorites |

AT-18 järgib lähteplaani peatükkide 06 ja 10 täpsustusi: teenuse arhiveerimine eemaldab uued valikud ja säilitab olemasoleva broneeringu; töötaja lahkumisel suletakse ligipääs ning tulevased kinnitatud broneeringud lisatakse lahendamist ootavate loendisse. Broneeringuid ei liigutata ega tühistata automaatselt.

AT-11 on sama hõivamise õigsuskatse mootori ja päris andmebaasiga. See ei ole 20 HTTP saadavuspäringu/s, 100 ettevõtte või 100 000 ajaloolise broneeringu koormuskatse; need on peatüki 26 ja 23-G06 töö.

## Peatüki lõpus nõutud lisakontrollid

1. **Teenuse muutus tühistab vana ajavaliku.** Uus brauserikatse kontrollib valiku eemaldamist, kinnitussammu lukustumist kuni uue pakkumise valimiseni ning nime/e-posti säilimist.
2. **Hinna muutus vajab uut kinnitamist.** 09.09 G03 valikuvoor: vana pakkumine 409, värske pakkumise teadlik valik ja alles seejärel 201; kontaktid säilivad.
3. **Vaba ajata päeval pakutakse uut päeva.** Uus katse kasutab tegelikku järgmise päeva API-d; tulemus jääb ajavaliku sammu ja ühtegi broneeringut ei teki.
4. **Katkenud ühendus käivitab tulemuse kontrolli.** 09.09 avaliku loomise katse ja värske halduse tühistamise kordus kontrollivad tegelikku salvestust ning sama toimingu taastamist.
5. **Käsitsi broneering kasutab sama sobivuse/kattumise loogikat.** Värske käsitsi/avaliku loomise konkurentsitest ja uus sobimatu töötaja ning ainult puhvreid kattuva käsitsi taotluse test. Tagasilükkamisel ei lisandu broneeringut ega käsku ja vana rida/sündmused/teavitused jäävad samaks.

## P24-F01 — värskendus kustutas avatud muutmisvormi

Brauseris valiti uus aeg, kuid enne kinnitamist hõivas selle teine tegelik broneering. API andis õigesti 409 `SLOT_UNAVAILABLE`. Sellele järgnev loendi värskendus seadis oleku ajutiselt tühjaks, eemaldas muutmisvormi DOM-ist ning kaotas sisestatud põhjenduse. [Enne parandust ebaõnnestunud katse](audits/chapter24-20260910/failed-move-before-fix.log) ja [DOM-i tõend](audits/chapter24-20260910/failed-move-before-fix-snapshot.log).

Nüüd säilib sama ettevõtte/kasutaja/kalendrivaliku värskendamisel avatud vorm; laadimise ajal on salvestamine lukus. Muutmisvorm loeb pakkumised uuesti, eemaldab hõivatud aja ja nõuab uut valikut, säilitades põhjenduse. Kalendri ulatuse muutmine ning õiguse/sessioni keeld eemaldavad endiselt vastava vana vaate. Uus brauserikatse kontrollib ka neid piire.

Lõplik parandus läbis Chrome'is, Firefoxis ja WebKitis: [Chrome](audits/chapter24-20260910/chrome-admin.log), [Firefox](audits/chapter24-20260910/firefox-admin.log), [WebKit](audits/chapter24-20260910/webkit-admin.log). Kood: [booking-management.tsx](../src/components/booking-management.tsx). Rakenduse andmebaasi/API kirjutusloogikat selle parandusega ei muudetud.

## Andmed ja tõendite piirid

Iga mootor kasutas kahte eraldi sünteetilist ettevõtet ja kohalikke MFA-ga testisessioone. Põhirollid olid owner ja receptionist; arhiveeritava staff-konto ligipääsu ning sessioonide sulgumist kontrolliti DB-st. Testija käivitatud katkestused ja konkureeriva broneeringu ajastus on brauserikoodis nähtavad. AT-15 blokeeriv broneering salvestatakse tegeliku avaliku HTTP API kaudu enne haldaja päringu jätkamist; vastuseid selle katse õnnestumiseks ei võltsita.

Iga mootori ettevõttes A oli lõpuks neli broneeringut: kaks algset, üks käsitsi loodud/muudetud/tühistatud ning üks nurjunud ümbertõstmise sihtaja hõivanud proovibroneering. Vana ümbertõstmata broneeringu täielik DB-rida jäi samaks, sündmusi ja teavitusi ei lisandunud. Arhiveeritud töötaja algne broneering säilis koos ühe `attention.required` sündmusega. Käsitsi broneeringu kolm teavituskirjet olid `skipped`; blokeeriva proovibroneeringu üks kirje jäi ootele. Kirju ega makseid ei saadetud ning teavitustöölist ei käivitatud.

DB-protokollid: [Chrome](audits/chapter24-20260910/chrome-database-proof.json), [Firefox](audits/chapter24-20260910/firefox-database-proof.json), [WebKit](audits/chapter24-20260910/webkit-database-proof.json). Koristus: [Chrome](audits/chapter24-20260910/chrome-cleanup.json), [Firefox](audits/chapter24-20260910/firefox-cleanup.json), [WebKit](audits/chapter24-20260910/webkit-cleanup.json). Ajutised testserver ja brauserid suleti. Pärisseadmeid, VoiceOverit ega Windowsi ekraanilugejat see peatüki 24 protokoll ei tõenda; nende vastuvõtt jääb peatükki 25.

## Kordamine

Käivita hoidla juurest ainult kohalikul testandmebaasil. Vajalikud on migratsioonid, `.env.local`, Node.js, PowerShell ning Playwright CLI Chrome/Firefox/WebKit. Fixture keeldub kaugandmebaasist ja nõuab täpselt allolevat testpäritolu. Varasem G03 fixture peab olema enne koristatud.

```powershell
$env:AUTH_BASE_URL='http://haldus.localhost:3108'
# Eraldi terminalis sama keskkonnamuutujaga:
npx next dev --hostname 127.0.0.1 --port 3108
# Hoidla juurest teises terminalis:
./scripts/chapter24-run.ps1
# Sulge selle katse arendusserver enne buildi.
npm test -- --reporter=default --reporter=json --outputFile=output/playwright/chapter24/vitest.json *> output/playwright/chapter24/full-tests.log
npm run build *> output/playwright/chapter24/build.log
npm run typecheck *> output/playwright/chapter24/typecheck.log
node scripts/chapter24-report.mjs
```

Runner kontrollib iga faasi tegelikku `pass` tulemust ja käivitab koristuse ka vea korral. Raport seob nõuded testinimedega, kontrollib varasemate tõendite kasutamise eeltingimusi ning salvestab [lähtefailide SHA-256 manifesti](audits/chapter24-20260910/source-manifest.json). Uue auditi puhul vali uus tõendikataloog; olemasolev 10.09 protokoll peab säilima.

## Paigaldus

Kohalik testimine on lõpetatud. Paranduse tootmise paigalduse tegelik tõend lisatakse serverikontrolli järel.
