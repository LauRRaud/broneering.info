# Esimese tehnilise katse kontroll 7. september 2026

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

Päris Ubuntu VPS-i paigaldus, automaatne juurutus, avalik DNS/HTTPS tervik, Safari/Firefox maatriks, ekraanilugeja põhjalik kontroll, kadunud kinnituse järel lehe taasavamise taastamine, pikaajaline koormus, kuritarvituskaitse mitme protsessi vahel, varukoopia taastamine, halduse õigused/MFA, SMTP ja arveldus. Ülaltoodud testid katavad osa lähteplaani AT-nõuetest, mitte kõiki 48 testi ega kogu nimetatud nõude võimalikku ulatust.
