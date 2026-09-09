# 23-G03 — esimene HTTP-, brauseri- ja klaviatuurimaatriks

09.09.2026 tehti kohalik automaatne põhimatriks ja parandati selle leitud klaviatuuriviga. **23-G03 tervikvastuvõtt jääb avatuks.** Testija oli Codex; sõltumatu testija ja omaniku vastuvõtt on märkimata. Kujundus on endiselt omaniku otsusel ootel.

## Tulemus ja parandatud viga

- **240 päris HTTP-päringut + üks andmebaasi räsi võrdlus: 241/241 läbis.** [Iga päringu roll, meetod, tee, oodatud/tegelik staatus ja tulemus](audits/acceptance-g03-20260909/http-results.json).
- **12 halduse rolli/mootori kombinatsiooni läbis.** Chrome 152.0.7977.83, Playwright Firefox 155.0 ja Playwright WebKit 26.5; igas owner/receptionist/staff/platform. Töölauavaade 1280 × 900; kolme ettevõtterolli broneeringunimekiri lisaks 390 × 844. Platvormi kitsast vaadet selles voorus ei kontrollitud.
- **Kolm avalikku broneerimist läbis ainult klaviatuuriga**, kõigis nimetatud mootorites 390 × 844: teenus → „Töötaja pole oluline” → konkreetne pakkumine → kontaktid → päris HTTP 201 ja nähtav kinnitus. Hind, kestus ja valitud töötaja kontrolliti kokkuvõttes. Sammuvahetusel kontrolliti pealkirja fookust ning kontaktiväljade Tab-järjekorda.
- Ühine põhisisu link jäi WebKiti algse seadistusega Tab-järjekorrast välja. `SkipLink` sai `tabIndex={0}`. [Enne parandust](audits/acceptance-g03-20260909/webkit-before-fix.log) ebaõnnestus see kõigi nelja rolliga; pärast tegeliku lähtekoodi parandust läbisid kõik kolm mootorit. Kontroll ei muuda lehe DOM-i ega kutsu `focus()`-t lingile või broneeringunupule: liikumine toimub Tab/Enter-klahvidega.
- Tootmisbuild, selle TypeScripti kontroll ja arhitektuurikontroll läbisid. [Buildi protokoll](audits/acceptance-g03-20260909/build.log). Selle väikese UI-paranduse jaoks ei käivitatud kogu Vitesti komplekti uuesti; eelneva G09 vooru 286 testi ei ole selle vooru testiarvu sisse liidetud.

Brauserilogid: [Chrome haldus](audits/acceptance-g03-20260909/chrome-browser.log), [Firefox haldus](audits/acceptance-g03-20260909/firefox-browser.log), [WebKit haldus](audits/acceptance-g03-20260909/webkit-browser.log), [Chrome broneerimine](audits/acceptance-g03-20260909/chrome-public.log), [Firefox broneerimine](audits/acceptance-g03-20260909/firefox-public.log), [WebKit broneerimine](audits/acceptance-g03-20260909/webkit-public.log). Logid sisaldavad täpset käivitatud katsekoodi. Samas kataloogis on 24 kuvatõmmist. WebKit Windowsis ja kitsas viewport **ei ole** Safari/iOS-i ega päris mobiilseadme vastuvõtt.

## Õiguste ja andmete kontrolli ulatus

Kaks eraldi sünteetilist ettevõtet, kummaski kaks töötajat ja kaks algset broneeringut. Kolm ettevõtterolli kuuluvad ainult ettevõttesse A; platvormikasutajal puudub liikmesus ja tugiluba. MFA-ga sessioonid loodi kohalikku andmebaasi ning allkirjastati rakenduse päris küpsisevormingus. Iga päring läbis tegeliku Next.js-i HTTP-marsruudi, Better Authi sessioonilugemise, õiguskontrolli ja PostgreSQL-i. Auth-, õiguste-, HTTP- ega andmebaasimokke ei kasutatud. Parooliga sisselogimise ja MFA registreerimise UI ei kuulu selle fixture'i tõendisse.

| Katse | Kontrollitud tulemus |
| --- | --- |
| Oma ja võõras ettevõte, neli rolli ning anonüümne kasutaja | `state`, broneeringud, kliendid/CSV, ekspordi seis, impordi seis/seadistus/CSV-mall, teavitused, säilitamine, lahkumine, arved, tellimus, keel; kõik ootuspärased 200/401/403 |
| Broneeringute ulatus | Owner/receptionist näevad kahte, staff ühte enda broneeringut; teise töötaja kalender, ajalugu ja tühistamine keelatud |
| Võõra objekti tunnus oma ettevõtte sees | Võõras kliendiparandus ja broneeringu tühistamine 404; võõra ettevõtte kontekstiga 403 |
| Keelatud kirjutused korrektse vormiga | Teenusegrupp, hinnastus, manustamispäritolud, graafikuerand, broneerimispoliitika, säilitamine, teavitusseaded, vaikekeel, eksporditaotlus, liikme õigused ja eemaldamine; iga asjakohane roll/ettevõte 403 |
| Lubatud kirjutuse võrdlus | Owner ja receptionist saavad sünteetilist kliendikaarti parandada; staff/platform ei saa |
| Õiguse muutus aktiivse sessiooni ajal | Mitteaktiivseks muudetud staff-liikmesus annab 403; keelatud receptionist-konto 401 |
| Avalik API | Saadavus ei sisalda kliendiandmete välju; võõra töötajaga korrektne vorm 409 `STAFF_UNAVAILABLE`; lisatud `tenantId` 400; võõras Origin 403 |
| Vahemälu ja kõrvalmõjud | Kõigil 240 vastusel `no-store`; negatiivsete katsete eel/järel 13 äriandmetabeli kanoniseeritud räsid võrdsed |

Räsivõrdlus ei hõlma turvaloge, päringupiirangute loendureid ega lugemisauditit, kuhu lubatud lugemine/keeld võib õiguspäraselt jälje jätta. Positiivsed kliendiparandused tehakse pärast võrdlust ja sünteetiline kliendikaart taastatakse. Testimine ei küsi ega laadi alla päris ettevõtete faile.

[Andmebaasitõend](audits/acceptance-g03-20260909/database-proof.json): neli algset sünteetilist broneeringut ning kolm brauseris loodud `is_test=true` broneeringut, kolm loomissündmust ja kolm ootel klienditeavituse kirjet. Kõik kontaktid on `example.invalid`; testettevõtted on demo-režiimis, teavitustöölist ei käivitatud ja kirju ei saadetud. [Koristus](audits/acceptance-g03-20260909/cleanup.json): mõlemad ettevõtted ja kõik neli kontot eemaldatud; nende sessioonid ning kohalikud allkirjastatud sessioonifailid samuti eemaldatud.

## Seos nõuetega ja järelejäänud vastuvõtt

AT-02 sai päris HTTP võõra töötaja katse; AT-05 põhiline ühissaadavuse teekond sai kolme mootori klaviatuuritõendi. AT-19/22/23/24 ja AT-32/35 said ülal piiritletud uue tõendi. AT-01–08 ega AT-19–35 tervikuna ei ole valmis.

ASVS-i seos kasutab [peatükis 16 valitud ASVS 5.0.0 kontrollide kaarti](CHAPTER-16.md#asvs-i-jälgitavus): `3.5.1` Origin/CSRF, `8.3.1` värske serveriõigus ja töötaja ulatus, `8.4.1` ettevõtte/objekti eraldatus. Need katsed täiendavad projekti kaarti; need ei tõenda kõigi nende nõuete ega ASVS L2 tervikvastavust.

Järgmine voor peab täitma järgmise protokolli. Iga rea juurde tuleb salvestada seadme/OS-i/brauseri/tugitehnoloogia täpne versioon, roll, sammud, oodatud/tegelik tulemus, tõend ja testija; katmata rida jääb avatuks.

| Avatud kontroll | Järgmine katse ja vastuvõtutingimus |
| --- | --- |
| Ülejäänud API-harud ja õigused | Kõik billing/companies/onboarding/preview/translations/privacy/import-write harud, valmis failide allalaadimine, antud ja eemaldatud lisaõigused, MFA-ta ning aegunud sessioon; korrektne keelatud vorm ei muuda andmeid |
| AT-01/03/04/06–08 | Üks/mitu töötajat, isiklik otselink, erinev hind/kestus, pakkumise aegumine avatud vormis; kontaktid säilivad ja muutunud pakkumine vajab uut valikut |
| AT-25 ja taastumine | Aegunud/tühistatud/võõras halduslink; katkestatud võrgu või vastuse järel arusaadav taastumine ning üks salvestatud toiming |
| AT-28–31/33 | Päris eri päritoluga iframe/modaal, CSP, võltsitud sõnumid, keelatud kolmanda osapoole küpsised, blokeeritud/laadimata skript, Escape, fookuselõks ja avaja fookuse taastamine |
| AT-32 ekraanilugeja | Omanikuga kinnitatud Windowsi ekraanilugeja/brauseri ning Apple'i VoiceOver/Safari kombinatsioonid; vead, dünaamilised teated, fookus ja kogu teekond kuulamisel, ilma visuaalse abita |
| AT-34/35 ja pärisseadmed | Kinnitatud Safari/macOS/iOS, Androidi brauserid, suum/reflow, puutejuhtimine, horisontaalne vaade, pikad tekstid ja kõik haldusvormid; pärast lõplikku kujundust kordusvoor |

## Kordamine

Käivita projekti juurest ainult kohalikul arendusandmebaasil. Vajalik on paigaldatud Playwright CLI ja selle brauserid. Andmebaasi migratsioonid peavad olema rakendatud; `.env.local` sisaldab kohaliku andmebaasi ning auth'i võtmeid. Neid ei kopeerita tõenditesse.

```powershell
$env:AUTH_BASE_URL='http://haldus.localhost:3108'
# Eraldi terminalis:
npx next dev --hostname 127.0.0.1 --port 3108
# Teises terminalis sama AUTH_BASE_URL:
node --env-file=.env.local --import tsx scripts/acceptance-g03-fixture.ts
node --env-file=.env.local --import tsx scripts/acceptance-g03-http.ts
$f=Get-Content output/playwright/acceptance-g03/fixture.json -Raw | ConvertFrom-Json
foreach($engine in @('chrome','firefox','webkit')) {
  npx --yes --package @playwright/cli playwright-cli -s=g03 open http://haldus.localhost:3108 --browser $engine
  foreach($kind in @('browser','public')) {
    (Get-Content "scripts/acceptance-g03-$kind.js" -Raw).Replace('__DAY__',$f.day).Replace('__PUBLIC_URL__',('http://'+$f.tenants[0].slug+'.localhost:3108')).Replace('__ENGINE__',$engine) | Set-Content output/playwright/acceptance-g03/run.js
    npx --yes --package @playwright/cli playwright-cli -s=g03 run-code --filename output/playwright/acceptance-g03/run.js
  }
  npx --yes --package @playwright/cli playwright-cli -s=g03 close
}
node --env-file=.env.local --import tsx scripts/acceptance-g03-fixture.ts proof
node --env-file=.env.local --import tsx scripts/acceptance-g03-fixture.ts cleanup
```

HTTP-skript lõpetab veaga, kui mõni kontroll ei läbi. Brauserikatse tulemuse igal real peab olema `pass:true`; CLI edukas käivitumine üksi ei ole läbinud vastuvõtt. Katse ebaõnnestumisel säilita tõend ja käivita ikka koristus. Avaliku teekonna kolm loomist on tahtlikud ning tehakse ainult demo-fixture'is.

## Paigaldus

Lähtekoodi parandus ja kontrollitud katsetööriistad on paigalduseks ette valmistatud. Serveri tulemus lisatakse pärast kontrollitud veebikonteineri uuendust; migratsioone pole lisatud.
