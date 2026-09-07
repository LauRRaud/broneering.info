# Esimese tehnilise katse kontroll 7. september 2026

## Kujunduse eemaldamise kontroll

Omaniku soovil eemaldati avalehe turunduskomponent, mõlemad CSS-failid, ikoon ning demo-, haldus-, vea- ja 404-vaadete kujundus. Alles on brauseri vaikimisi HTML-elemendid. Varasemad allpool kirjeldatud kujunduse ja mobiilimenüü kontrollid käivad eemaldatud versiooni kohta.

`npm test`: 16 testi läbitud. `npm run build`: edukas. Kohalikus brauseris läbiti kujunduseta voog: Meeste lõikus → töötaja pole oluline → 8. september 2026 → Kertu kell 09.00 → väljamõeldud nimi ja `.invalid` e-post → kinnitus `BR-7CF554EC7B18` (30 minutit, 25 €). Brauseri vealogi oli tühi. Ekraanipilt kinnitas brauseri vaikimisi välimust. Broneerimise serveriloogikat ega andmebaasiskeemi ei muudetud.

## Läbitud

- `npm run typecheck`: tüübikontroll läbitud.
- `npm test`: 12 testi läbitud päris PostgreSQL-i vastu.
- 50 konkureerivat sama töötaja sama aja kinnitust: üks õnnestunud broneering, üks teavitusülesanne.
- 12 sama võtmega samaaegset korduspäringut: üks broneering ja kõigile sama tulemus.
- Ettevõtete andmete eraldatus, konteksti puudumisel tühi privaatne päring, RLS-i kirjutamiskeeld vale ettevõttega.
- Võõra töötaja/teenuse valik, hinnamuutus, etteteatamine, puhvrid, pausid, graafikuerandid, tundmatu domeen ja reserveeritud `haldus` nimi.
- PostgreSQL ise lükkab tagasi kattuva hõivamise ka otse SQL-i kaudu.
- Europe/Tallinn kevadine olematu ja sügisene kahetähenduslik kellaaeg.
- `npm audit`: 0 teadaolevat haavatavust kontrolli hetkel; see ei asenda rakenduse turvaülevaatust.
- Linuxi `docker build -t broneering-info:pilot .`: edukas Next.js tootmisehitus.
- Ehitatud konteineri `/api/health` ja Ilutegu `/api/catalog` päringud töötasid; protsess käitus UID 1001-ga.

## Brauseris läbitud

Playwright CLI Chromiumiga kohalikus keskkonnas: Ilutegu teenuse valik → „Töötaja pole oluline” → sama algusajaga erineva hinnaga konkreetsed Mari/Kertu pakkumised → kliendi enda valitud pakkumine → nimi ja test-e-post → serveris salvestatud kinnitus. Ekraan näitas 35,00 € ning andmebaasile saadeti 3500 senti. ICS-fail laaditi alla ja selle algus/lõpp vastasid valitud ajale.

Kontrollitud 1280-pikslist broneerimisvaadet, 390 × 844 mobiili kinnitusvaadet, 1440-pikslist avalehte ja mobiilset avalehte. Mobiilimenüü avanes, „Logi sisse” teade avanes native dialog’is ning Escape sulges selle. Ekraanipildid on kohalikus ignoreeritud `output/playwright/` kaustas.

## Kontrollimata või veel teostamata

Automaatne juurutus, uute ettevõtete wildcard-HTTPS, Safari/Firefox maatriks, ekraanilugeja põhjalik kontroll, kadunud kinnituse järel lehe taasavamise taastamine, pikaajaline koormus, kuritarvituskaitse mitme protsessi vahel, varukoopia taastamine, halduse õigused/MFA, SMTP ja arveldus. Ülaltoodud testid katavad osa lähteplaani AT-nõuetest, mitte kõiki 48 testi ega kogu nimetatud nõude võimalikku ulatust.

## VPS-i avaldamise kontroll samal päeval

Ubuntu 24.04.4 LTS serveris ehitati GitHubi commit `4c5cd0d` Dockeriga, käivitati migratsioon ja loodi kaks demoettevõtet. Rakendus ja andmebaas käivad eraldi konteinerites. Nginxi uus projektipõhine konfiguratsioon läbis `nginx -t`; olemasolevad hoiatusteated olid olemas juba enne muudatust.

HTTPS GET tagastas 200 aadressidel broneering.info, www.broneering.info, haldus.broneering.info, demo.broneering.info ja demo2.broneering.info. Let’s Encrypti sertifikaat väljastati kõigile viiele hostile, `certbot.timer` on aktiivne ning uuenduse Nginxi laadimishaak on paigaldatud. Serveri `.env.server` õigused on 600 ja fail ei kuulu Giti. Serveri GitHubi võti on ainult selle repo lugemisõigusega. Kõigi uute ettevõtete automaatne HTTPS ei ole selle viie domeeni kontrolliga tõendatud.

Avalikus demos läbiti Chromiumiga broneerimine: Meeste lõikus, Mari, 7. september 2026 kell 17.15, 30 minutit, 25 €. Server tagastas kinnituse `BR-4AF211021676`. Kasutati väljamõeldud nime ja `.invalid` e-posti. Brauseri konsoolis oli 0 viga ja 0 hoiatust. Tegemist oli demoandmebaasi proovibroneeringuga, mitte salongi päris ajaga.

## Peatükk 05 — 07.09.2026
46 rakenduse testi ja eraldi 1 tegeliku vidinaskripti test läbisid; 3 Pythoni testi ning kohalik ja VPS-i tootmisbuild läbisid. Brauseri CSP, iframe/modaal, Escape/fookus ning päris alamdomeeni sertifikaadi väljastamine, uuendamise proov ja sulgemine on kirjeldatud [CHAPTER-05](CHAPTER-05.md). Laiem brauserimaatriks jääb avatuks.

## Peatükk 06 — 07.09.2026
Kõik 59 rakenduse testi, tüübikontroll ja kohalik tootmisbuild läbisid. Kaksteist uut testi katavad hinnakirja õigusi, pärimist, erisusi, ajaloo säilitamist, versioone, broneeringu samaaegsust, hierarhiat ja RLS-i. Brauseris läbiti ajutise MFA omaniku grupi/alamgrupi, teenuse, töötaja ja seose loomine ning kontrolliti avalikku hinda ja profiili. Testandmed eemaldati. Serveri commit f51fd68, migratsioonid 005/006 ja HTTPS kontrollid on [CHAPTER-06](CHAPTER-06.md).
