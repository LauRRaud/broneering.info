# 23-G03 — laiendatud tehnilise testimise lõpparuanne

Katsed 09.09.2026; aruanne lõpetatud 10.09.2026. Testija: Codex, Windowsi kohalik keskkond. **Allpool määratletud automaatne maatriks läbis. G03 omaniku tervikvastuvõtt jääb avatuks pärisseadmete, ekraanilugejate ja sõltumatu kasutajakatse ulatuses.** Kujunduse lõppvoor sõltub endiselt omaniku ootel 23-G04 tööst.

See voor lõpetab [esimeses protokollis](ACCEPTANCE-G03.md) nimetatud laiendatud HTTP-, taastumise ja manustamise automaatkatsed ning täiendab [teenusevalikute ja avatud vormi aegumise vooru](ACCEPTANCE-G03-VARIANTS.md). Varasemate voorude arve ei liideta allpoolsete tulemustega.

## Tulemus

| Kontroll | Tulemus ja tõend |
| --- | --- |
| Laiendatud tegeliku HTTP õiguste maatriks | **506/506**; [päringute meetodid, rollid, teed ja staatused](audits/acceptance-g03-completion-20260909/extended-http-results.json) |
| Brauserid | **14/14 faasi, 356/356 kontrolli**; [masinloetav koond](audits/acceptance-g03-completion-20260909/results.json) |
| Kõik olemasolevad automaattestid koos uue regressioonitestiga | **41 faili, 287/287 testi**, vahelejäetud teste pole; [logi](audits/acceptance-g03-completion-20260909/full-tests.log), [Vitesti JSON](audits/acceptance-g03-completion-20260909/vitest.json) |
| Tootmisbuild | Läbis, sealhulgas TypeScript ja 155 lähtefaili arhitektuurikontroll; [logi](audits/acceptance-g03-completion-20260909/build.log) |
| Korduste andmebaasijäljed | Kuus lõpliku brauserikatse broneeringut: igas mootoris üks taastatud loomine ja üks kahe haldaja muudetud/tühistatud broneering; [täpsed arvud koondis](audits/acceptance-g03-completion-20260909/results.json) |
| Koristus | Testettevõtteid ja testkontosid alles **0**; [koristusprotokoll](audits/acceptance-g03-completion-20260909/cleanup.json) |

Brauseriversioonid: Chrome 152.0.7977.83, Playwright Firefox 155.0 ja Playwright WebKit 26.5. Kõik töötasid Windowsis. Igas mootoris läbisid manustamine, taastumine, kahe haldaja konflikt ning keele/vaatesuuruse maatriks. Lisaks läbisid Chrome ja Firefox eraldi tõendatud küpsisepiirangu katse. Tõendikataloogis on 29 kuvatõmmist ning iga faasi logis tegelik katsekood ja kontrollide tulemused. WebKit Windowsis ei tõenda Safari ega Apple'i privaatsusseadistuste toimimist.

## Leitud ja parandatud vead

**G03-F01 — hilinenud modaal jäi tühjaks.** Kui iframe'i laadimine kestis üle widget'i kaheksasekundilise piiri, peideti raam ja näidati varulinki. Hiljem saabunud õige `ready`-sõnum eemaldas veateksti, kuid raam jäi peidetuks. Widget taastab nüüd eduka ühenduse korral `frame.hidden=false`. [Enne parandust ebaõnnestunud katse](audits/acceptance-g03-completion-20260909/modal-before-fix.log); kõigi kolme mootori lõplik `recovery`-faas läbis sama hilinemise. Päris iframe'i päring peatatakse katses ajutiselt ja seejärel lastakse rakendusse; rakenduse DOM-i paranduse simuleerimiseks ei muudeta.

**G03-F02 — väljalülitatud maksepakkuja varjas õiguse keeldu.** Korrektse makselingitaotluse puhul loeti pakkuja seadistust enne ettevõtte omanikuõigust. Seetõttu sai keelatud kasutaja konfiguratsiooni tõttu 503. Nüüd kontrollitakse sama tehingu sees esmalt värsket omanikuõigust või avaliku arvelingi õigust, seejärel pakkuja konfiguratsiooni. Keelatud kasutaja saab 403; lubatud omanik saab väljalülitatud ühenduse korral endiselt 503. Maksekatset ega välist päringut ei teki. [Uus regressioonitest](../tests/payment-checkout-freshness.test.ts) ja [sihitud kontrolli logi](audits/acceptance-g03-completion-20260909/checkout-regression.log); samuti läbis kogu maksete regressioonikomplekt.

## Õigused ja kõrvalmõjud

Kasutati kahte sünteetilist ettevõtet ning owner/receptionist/staff/platform ja anonüümset kasutajat. Päringud läbivad tegeliku Next.js-i marsruudi, Better Authi sessiooni, õiguskontrolli ja PostgreSQL-i. Fixture loob lokaalsed MFA-ga allkirjastatud sessioonid; parooli ja MFA registreerimise kasutajaliidest see ei tõenda.

- Laiendatud maatriks hõlmab billing'u lugemis-/kirjutusharusid, companies/onboarding/translations/privacy/import'i meetodeid, eelvaadet, teenuseid/hindu, töötajaid/graafikut, õigusi, omanikuvahetust, lahkumist, teavitusi ja tellimust. Täpne ulatus ning korrektse kehaga keelatud päringud on 506 rea raportis. Kõik kontrollitud vastused on `no-store`.
- Keelatud päringute eel ja järel võrreldi **22 ettevõttepõhise tabeli ning globaalse arveväljastaja tabeli** kanoniseeritud räsi. Äriandmed jäid samaks. Lubatud lugemisaudit, turvalogid ja päringupiirangute loendurid ei kuulu muutumatuse nõudesse.
- Sama sessiooniga MFA-verifitseeringu eemaldamine ja sessiooni aegumine annavad 401. Värskelt antud `services.manage` võimaldab hinnaparandust; selle eemaldamine keelab järgmise päringu 403-ga. Platvormi lipp ei asenda ettevõtte omanikuõigust.
- Omaniku kliendiandmete JSON-eksport läbis; võõras objekt annab 404. Omaniku ettevõtteeksport loodi päris API kaudu, valmis fail toodeti ainult selle töö jaoks käivitatud ekspordifunktsiooniga ja laaditi päris HTTP-ga alla. Võõras kontekst ning mitteomanikud saavad 403, aegunud fail 410. Valmis faili tootmise katse ei käivita teiste ettevõtete järjekorda.

Positiivne import, ettevõtte loomine ja kõik haldusvormid ei saanud selles voorus eraldi terviklikku brauseriteekonda. Nende olemasolevad valdkonnatestid läbisid uuesti; laiendatud HTTP-tõend puudutab raportis loetletud päringuid, mitte kõigi kombinatsioonide ammendavat tõestust.

## Brauseriteekonnad

| Faas | Kontrollitud käitumine |
| --- | --- |
| `embed`, kolm mootorit | Eri saidiga vanem `http://127.0.0.1:3110` ja ettevõtte `*.localhost:3108` iframe; tegelik broneering 201; sõnumites ainult protokolli-/paigutusandmed; vale saatja/kanali sõnum ei muuda kõrgust ega sulge modaali; lubamata vanema korral jõustab brauser CSP ja varulink säilib |
| Modaali klaviatuur, kolm mootorit | Tab püsib avatud modaali piires, Escape töötab nii vanemas kui iframe'is, avaja fookus ja lehe kerimine taastuvad; korduv avamine läbib |
| `recovery`, kolm mootorit | Tegelik 201 salvestus, vastuse katkestus, 429, HTML-kujuline 403 ja seejärel tegelik kordus annavad algse kinnituse; kõik kordused kasutavad sama võtit ja sisu; üks broneering, üks loomissündmus, üks outbox-kirje |
| Vigased lingid, kolm mootorit | Aegunud, tühistatud ja teise ettevõtte halduslink annavad 410 ning loetava kontaktijuhise; broneeringu andmeid ja muutmisnuppe ei kuvata |
| Skripti rike, kolm mootorit | Blokeeritud widget'i päringu ja skriptita HTML-i korral jääb tavaline broneerimislink kasutatavaks; hilinenud raam taastub G03-F01 parandusega |
| `concurrency`, kolm mootorit | Omanik ja receptionist avavad sama versiooni eraldi brauserikontekstides; esimese muutus 200, teine 409 `VERSION_CONFLICT`, põhjendus säilib ja uus versioon avaneb; tühistamise tegeliku vastuse kaotus ning sama võtmega kordus annavad sama tulemuse |
| `layout`, kolm mootorit | Nelja haldusrolli ET/EN/RU vaated suurustel 320 × 700, 844 × 390 ja 1280 × 900: 108 kombinatsiooni; avalik teenusesamm kolmes keeles kahel suurusel: 18 kombinatsiooni; nähtavatel kontrollitud vaadetel pole horisontaalset ülevoolu, nimeta vormikontrolle ega korduvaid ID-sid |
| `cookie`, Chrome ja Firefox | Esmalt saab sama `SameSite=None; Secure` prooviküpsist esimese osapoolena lugeda; piiratud iframe'is puudub see nii `document.cookie`-st kui tegeliku päringu päisest; broneerimine annab 201 |

Chrome'i küpsisepiirang rakendatakse CDP-ga ning iframe laaditakse seejärel uuesti, nagu nõuab [CDP meetodi leping](https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-setCookieControls). Firefox käivitatakse salvestatud `network.cookie.cookieBehavior=1` seadistusega. WebKiti Windowsi käituses ei saadud samaväärset Safari küpsisepiirangu tõendit ja sellele ei anta läbitud staatust.

Taastumiskatses süstitakse ainult kirjeldatud transpordirikkeid ja ajutisi veavastuseid. Salvestus ning lõplik kordus on päris API/DB toimingud. Kahe haldaja katse lõpptulemus on igas mootoris tühistatud versioon 3, kolm käsku ja kolm sündmust. Selle käsitsi sisestatud broneeringu klienditeavitused on välja lülitatud: kolm outbox-kirjet on korrektselt `skipped`, mitte saadetud kirjad.

Kõik kontaktid on sünteetilised `example.invalid` aadressid. Katsetes saadud ootel testteavitusi ei saadetud; teavitustöölist ei käivitatud. [Andmebaasi koond](audits/acceptance-g03-completion-20260909/database-proof.json) sisaldab ka katseharness'i varasemaid kordusi, mistõttu selle üldarv on suurem kui kuue lõpliku korduskatse arv. Koristus eemaldas mõlemad testettevõtted, kontod, sessioonid ja kohalikud allkirjastatud sessioonifailid; ajutised serverid ja brauserid suleti.

## Kordamine ja lähteversioon

Aluseks on `a892b9dd5ae293fd7b57c0a065408ff216104df8` ning selle aruandega kaasnevad muudatused. [SHA-256 manifest](audits/acceptance-g03-completion-20260909/source-manifest.json) kirjeldab kontrollitud lähtefailide täpseid kohaliku tööpuu baite. Koondraport kontrollib kõigi faaside `pass` väärtusi ja andmebaasi lõppseisu; CLI protsessi edukas käivitumine üksi ei ole läbimine.

1. Järgi [esimese vooru kohaliku keskkonna juhist](ACCEPTANCE-G03.md#kordamine): ainult kohalik migratsioonidega DB ning `AUTH_BASE_URL=http://haldus.localhost:3108`, Next.js pordil 3108. Loo uus tavaline fixture, mitte `variants`-fixture.
2. Käivita `scripts/acceptance-g03-extended-http.ts`. Käivita `scripts/acceptance-g03-link-fixture.ts`. Lisa testettevõtte A lubatud manustamispäritoluks täpselt `http://127.0.0.1:3110` ning käivita `node scripts/acceptance-g03-embed-server.mjs`. Päritolu `http://localhost:3110` peab jääma lubamata.
3. Käivita Playwright CLI-ga iga mootori jaoks eraldi `acceptance-g03-embed.js`, `acceptance-g03-recovery.js`, `acceptance-g03-admin-concurrency.js` ja `acceptance-g03-layout.js`. Asenda faili koopias `__ENGINE__`, `__DAY__`, `__PUBLIC_URL__` fixture'i väärtustega. Taastumisfaasi `__EXPIRED_URL__`, `__REVOKED_URL__`, `__FOREIGN_URL__` on vastava fixture'i lingi ettevõtte aadress + `/broneering#` + token; võõra lingi katse kasutab ettevõtte A aadressi ja ettevõtte B tokenit. Kasuta CLI `run-code --filename` käsku. Logide nimed on `<engine>-embed.log`, `-recovery.log`, `-concurrency.log`, `-layout.log`.
4. Käivita `acceptance-g03-cookie.js` Chrome'is ja Firefoxis; Firefoxi avamisel anna `--config scripts/acceptance-g03-firefox-cookies.json`. Salvesta `<engine>-cookie.log`. Katsetega loodud broneeringud nõuavad igale kinnitusele vaba aega; värske fixture väldib eelmiste käivituste hõivamisi.
5. Enne koristust käivita `node --env-file=.env.local --import tsx scripts/acceptance-g03-completion-report.ts`, fixture'i `proof` ja alati lõpuks `cleanup`. Sulge ainult selle katse CLI sessioonid ning kohalikud serverid. Koondskript salvestab auditikataloogi; uue auditi kuupäeva jaoks muuda sihtkataloogi ja hoia eelnev tõend alles.

MFA-sessioonid, võtmed, andmebaasiühendused ja fixture'i bearer-tokenid ei kuulu avalikku protokolli. Logide koondamisel eemaldatakse sünteetilised halduslingi tokenid.

## Allesjäänud vastuvõtt

| Avatud töö | Lõpetamise tingimus |
| --- | --- |
| Safari/macOS/iOS ja Androidi pärisseadmed | Täpselt fikseeritud OS/brauser, puutejuhtimine, pööramine, suum/reflow ning iframe/modaal; Safari tegeliku küpsisepiirangu katse. Siinses keskkonnas puuduvad `xcrun` ja `adb`, seega neid käivitusi ei toimunud |
| Ekraanilugeja | Kinnitatud Windowsi ekraanilugeja/brauseri ja VoiceOver/Safari kombinatsioonide kogu põhiteekond kuulamisel: väljad, vead, dünaamilised teated, modaal ja fookus. Üksnes DOM-i nimede kontroll ei tõenda seda |
| Sõltumatu kasutaja ja lõplik kujundus | Teine testija täidab põhiteekonna abita; omanik kinnitab vastuvõtu. Pärast 23-G04 kujundust korrata kontrasti, suumi, klaviatuuri ja ekraanilugeja maatriksit |

ASVS-i seos jääb [peatüki 16 kaardi](CHAPTER-16.md#asvs-i-jälgitavus) piiresse: `3.5.1` Origin/CSRF, `8.3.1` värske serveriõigus ja `8.4.1` ettevõtte/objekti eraldatus. Käesolev tõend ei märgi kogu ASVS L2 vastavust, SMTP/maksepakkuja välisühendusi (23-G05), koormusvastuvõttu (23-G06) ega V1 omaniku vastuvõttu lõpetatuks.

## Paigaldus

Kohalik testimine ja build on lõpetatud. Selle vooru tootmise paigalduse tõend lisatakse pärast tegelikku serverikontrolli.
