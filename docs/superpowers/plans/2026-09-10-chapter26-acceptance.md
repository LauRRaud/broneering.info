# Peatüki 26 vastuvõtu teostusplaan

> Teostus toimub samas ülesandes etapiti. Omaniku juhise järgi alamagente ei kasutata. Töö jätkub olemasoleval arendusharul ning hõlmab ka serveri mõõtmist.

**Eesmärk:** tõendada AT-36–48 teostatavad käitamispiirid tegelike mõõtmistega ja eristada puuduvad välised sõltuvused.

**Arhitektuur:** eraldi sünteetiline testikeskkond samal VPS-il, oma PostgreSQL, privaatfailid ja tootmise veebipilt. Testliiklus käib eraldi loopback-pordi TLS-proksi kaudu; töötava teenuse valmisolekut jälgitakse sõltumatult. Brauseri jaoks kasutatakse SSH tunnelit. Taastamine toimub veel eraldi keskkonnas.

**Tehnoloogia:** olemasolev Node 24, PostgreSQL 18, Docker Compose, Nginx, Playwright CLI, pgBackRest ja rakenduse taastamis-CLI.

**Lähteülesanne:** `Broneerimisplatvorm_arendusplaan_v1_0.docx`, peatükk 26; `docs/CHAPTER-23-ACCEPTANCE.md` AT-36–48. Omanik täpsustas, et testida tuleb ka serverit.

## Ühised piirid

- 100 ettevõtet ja 100 000 ajaloolist broneeringut; 20 saadavuspäringut sekundis; p95 siht alla 1 s.
- Kahe kasutaja muudatuse nähtavus aktiivses kalendris kuni 10 s tavakoormusel.
- Tulemuses fikseeritakse taristu, töötajad, graafikud, jaotus, külma/sooja oleku piir ja kestus.
- Ainult sünteetilised andmed. Olemasoleva tootmise DB, failid, võtmed ja SMTP/maksejärjekorrad ei ole katseandmed.
- Päris SMTP ja Maksekeskuse vastuvõtt vajab nende tegelikku seadistust. Puuduvat sõltuvust ei märgita läbituks.
- Varunduse välise asukoha varasem edasilükkamine kehtib; uusi tasulisi teenuseid ei tellita.
- Ptk 25 kasutajakatse ootab kujundust; ekraanilugejat testib hiljem pime inimene.

## 1. Serveri jõudlus ja kalendri värskendus

Failid: `scripts/chapter26-fixture.ts`, `scripts/chapter26-load.mjs`, `scripts/chapter26-calendar.js`, `infra/acceptance/chapter26.compose.yaml`, serveri ülesseadmise/koristuse skriptid samas kataloogis.

- [x] Kontrolli tegeliku serveri ressursse, vaba ketast, tootmise pilti ja redigeeritud konfiguratsiooni olemasolu; salvesta ainult ohutud koondandmed.
- [x] Loo eraldi projekti nimi, märgistatud mahud/võrk, juhuslikud katsevõtmed ja loopback-pordid. Keeldu olemasoleva sihi ülekirjutamisest.
- [x] Rakenda tühjale andmebaasile kõik migratsioonid ja loo mõõdetud jaotusega 100 ettevõtet/100 000 ajaloolist broneeringut ning kaks eraldi testkasutajat.
- [x] Käivita tootmise pildiga külma rakenduse voor; soojenda ning mõõda 20 päringut/s 10 minutit. Salvesta iga päringu latentsus, staatus ja andmete õigsus. Mitme kliendi IP-jaotus peab säilitama proksi päringupiirangu tähenduse.
- [x] Mõõda 50 sama aja kinnituse konkurents tegeliku HTTP kaudu ning kontrolli DB-s üht võitjat ja kõrvaltoimeid.
- [x] Mõõda teise kasutaja salvestuse nähtavust aktiivses brauseris, ilma lehte käsitsi värskendamata. Kontrolli loomist, muutmist ja tühistamist.
- [ ] Paranda ainult korratavalt tuvastatud viga; korda puudutatud katset. Tootmise tõrke korral katkesta koormuse lisamine ja salvesta ebaõnnestunud tulemus.

## 2. Import, lahkumine ja arveldus

Failid: `scripts/chapter26-operations.ts`, olemasolevad impordi/ekspordi, lahkumise ja arvelduse teenused ning testid.

- [x] Tee testkonto kaudu korrektne, vigane ja korduv CSV-import; kontrolli tegelikku ekspordifaili ja teavituste puudumist.
- [x] Koosta kokkulepitud testtähtaegadega lahkumine, väljasta andmed, kontrolli tähtaegade järel värsket ligipääsukeeldu, andmete säilimist ja domeenireservatsiooni.
- [x] Käivita perioodiarveldus korduvalt ja samaaegselt; kontrolli arve ja kasutusõiguse ühesust. Võrdle makse/ületuse elutsüklit olemasolevate integratsioonitestidega.

## 3. Taastamine

Failid: `scripts/chapter26-recovery.ts`, `infra/backup/prove_recovery.py` olemasolev alus, `scripts/operations/recovery.ts`.

- [x] Tee sünteetilise mahu DB ja privaatfailide koopia, seejärel uuem eemaldamisregister.
- [x] Taasta DB ja failid eraldi sihti; rakenda värske register ning kontrolli andmeid, õigusi, failiräsisid ja taastatud rakenduse põhivoogu.
- [x] Mõõda kasutatud koopia värskus ja täieliku taastamiskäigu kestus. Märgi kohaliku/sama VPS-i koopia piir ning eraldi välise varukoopia vastuvõtu puudumine.

## 4. SMTP, Maksekeskus ja üleandmine

- [x] Kontrolli olemasoleva seadistuse täidetust väärtusi avaldamata. Töötava SMTP puhul tee esmalt ühenduse/TLS/autentimise kontroll ilma kirja saatmata.
- [ ] Kui teenuse katseandmed ja adressaat on olemas, täida täpne saatmise/makse test; muidu salvesta vajalik sõltuvus ja jätka sõltumatu tööga.
- [x] Märgi teise arendaja paigaldus ja lepinguliste õiguste kinnitus eraldi inimvastuvõtuks; agent ei esine sõltumatu arendaja ega õiguste kinnitajana.

## 5. Tõendid ja lõpetamine

- [x] Salvesta `docs/CHAPTER-26.md`, `docs/audits/chapter26-20260912` redigeeritud protokollid, lähteräsid ja AT-36–48 täpne seis.
- [x] Sulge ainult loodud testserverid, tunnel ja märgistatud testmahud; kinnita töötava tootmise tervis.
- [x] Kontrolli muudatusele sobivad testid/build, viited ja tööpuu. Avalda muudatused varasema GitHubi/serveri töökorralduse järgi. Dokumentatsiooni muutus ei vaja veebipildi taaskäivitamist.

**12.09.2026 täpsustus:** omanik lükkas välise varuserveri, SMTP ja Maksekeskuse vastuvõtu ajale pärast kujundust. Sama VPS-i täis-DB/failide/registri taastamine on läbitud. Raport: `docs/CHAPTER-26.md`.

**Lõppseis:** 61/61 sihitud regressioonitesti, tüübikontroll ja arhitektuurikontroll läbisid. Testkeskkonnad, võtmed ja sünteetilised varukoopiad eemaldatud; töötav teenus terve. Raport ja tõendipakk avaldatakse sama muudatusena.
