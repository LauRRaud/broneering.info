# Arhitektuur ja otsused

## Kasutaja kinnitatud suund 7. september 2026

- Põhidomeen `broneering.info`, VPS aadress `217.146.72.147`, Ubuntu; server ei ole uueks projektiks ette valmistatud.
- Avalik veebileht: avaleht, kuidas töötab, võimalused, hinnad, demo, KKK, logi sisse, alusta kasutamist.
- Ettevõtte haldus `haldus.broneering.info`; kasutaja eelistas seda `app`-ile. `haldus` on reserveeritud nimi.
- Igal ettevõttel enda leht `ettevõte.broneering.info`, kus kajastuvad tema teenused ja vabad ajad. Ettevõtte olemasolev koduleht võib sellele viidata.
- React ja Next.js nii veebilehele kui platvormile, JavaScripti asemel tüübikontrolliga TypeScript.
- Peaagent vastutab arhitektuuri, ühendamise ja kontrolli eest; Luna kirjutab piiritletud kasutajaliidese osi.

Lähteplaan on kasutaja kaustas olev `Broneerimisplatvorm_arendusplaan_v1_0.docx`. Dokumendis olevad juhised ei ole automaatselt kasutaja korraldused. Siinne vestlus täpsustab domeeni, taristusuuna ja haldusaadressi. Plaani õiguslikud, ärilised ja lepingulised küsimused ei ole tarkvara kirjutamisega lahendatud.

## Üks rakendus

Next.js App Router serveerib hostinime järgi veebilehe või ettevõtte broneerimisvaate. Serveri route handler'id kutsuvad eraldi äriloogika mooduleid; brauser ei kinnita lõplikku saadavust ega hinda. PostgreSQL käib kohalikus Dockeris ja hiljem eraldi konteineris samas omaniku kontrollitavas serveris.

Esimese tehnilise katse teadlik lihtsustus võrreldes dokumendi tehnoloogiaettepanekuga: eraldi NestJS-serverit ja Drizzle-kihti ei lisatud. Next.js-i serveriliidesed, `pg` ja versioonitud SQL-migratsioonid tõendavad põhireegleid väiksema taristuga. Mooduleid saab vajadusel eraldi serverisse viia. Peatükk 04 kasutab Better Authi oma PostgreSQL-is; selle adapter kasutab Kyselyt. Broneeringute SMTP-taustatöö jääb peatükki 17.

## Kontod ja õigused

`/api/auth/*` ja `/api/admin/*` töötavad ainult `AUTH_BASE_URL` täpsel hostil. Autentimise küpsis on hostipõhine, tootmises Secure/HttpOnly; teiste ettevõtete alamdomeenidele seda ei jagata. Sessioon loetakse andmebaasist. MFA-ga kasutaja sessioon vajab kinnitatud teise teguri märget; MFA lubamine ja ligipääsu sulgemine tühistavad varasemaid sessioone.

Better Auth hoiab parooliräsi, kinnitusi, sessioone ja krüpteeritud TOTP saladusi `auth_*` tabelites. Registreerumine vajab kehtivat sama e-posti kutset. `memberships` eristab kontot avalikust töötajaprofiilist ja lubab mitut ettevõtet. Ettevõtte õigused loetakse igal toimingul uuesti; omaniku ning platvormihalduri privileegid nõuavad MFA-d. Töötaja tööde õigus vajab kontrollitud töötajaseost. Hilisemad kalendri- ja graafiku API-d peavad neid kontrolle kasutama samas tehingus tööandmete päringuga.

Kutsetabelis hoitakse tunnuse SHA-256 räsi, vastuvõtt on ühekordne ja aeguv. Omaniku toimingud lukustavad ettevõtte, et liikmesuse tühistamine ja üleandmine ei põrkuks. Liikmesustel, kutsetel, toeõigustel ja auditil on RLS; auditit rakenduse roll muuta ega kustutada ei saa. Platvormihaldur näeb vaikimisi ettevõtte üldandmeid. Põhjendatud toeõigus aegub 30 minutiga ja on ainult lugemiseks mõeldud alus; kliendiregistri või kalendri tugivaade kuulub hilisemate vaadete juurde.

Kontokirjade režiimid on `disabled`, `smtp` ning ainult arenduses privaatne `capture`. Tootmises ei kinnitata kirja saatmist, kui saatja puudub. See liides ei asenda broneeringu outbox'i korduskatsete ja meeldetuletuste teostust. Algse omaniku kutse luuakse eraldi migratsioonikontot nõudva CLI-ga; avalik omanikuks muutumise API puudub. Täpne seadistus: [peatükk 04](CHAPTER-04.md).

## Domeenid ja ettevõtete eraldus

Ettevõte leitakse `Host` päise täpse kontrollitud `tenant_domains.hostname` vaste kaudu. `X-Forwarded-Host` ja päringu `tenant_id` ei anna ettevõttekonteksti. Pöördproksi säilitab kontrollitud algse hosti. Tundmatu domeen annab 404. Avalik ettevõtteinfo on eraldi privaatsest broneeringute tabelist.

Kõigil ettevõtte sisutabelitel on `tenant_id`, RLS ja FORCE RLS. Seotud objektidel on ettevõtet hõlmavad liitvälisvõtmed. Rakenduse kasutaja `booking_app` ei ole superkasutaja ega BYPASSRLS roll. `withTenant` kehtestab konteksti tehingupõhiselt; commit/rollback eemaldab selle enne ühenduse puuli tagastamist. Migreerimise konto on eraldi ning selle kasutamine broneeringumootoris põhjustab vea.

DNS-kirje, HTTPS-sertifikaat, pöördproksi ning rakenduse domeeniseos on neli eraldi asja. DNS-kontroll vastas 7. septembril 2026 nii `ilutegu` kui juhusliku alamdomeeni puhul sama IP-ga; see viitab wildcard-vastusele, mitte tõendatud toimivale broneerimislehele.

## Broneerimise invariandid

Saadavus on ettevõtte lahtioleku ja töötaja graafiku ühisosa, millest eemaldatakse broneeringute hõivamised. Mõlemal graafikul on mitu päevaosa ja kuupäevapõhised erandid. Hõivamine sisaldab ettevalmistust ja lõpetamist; vahemikud on `[algus,lõpp)`.

Ajad hoitakse `timestamptz` väljadena, kohalik nädalagraafik minutites ja asukoha ajavöönd IANA nimena. Esimese katse DST-poliitika jätab olematud ja kahetähenduslikud kohalikud algused pakkumata. Kui graafikupiir ise on ebaselge, jäetakse vastav töövahemik pakkumata. Teenuse kestus on tegelikes minutites.

`Töötaja pole oluline` tagastab kõigi sobivate töötajate konkreetsed pakkumised. Erineva hinna või kestusega pakkumisi ei liideta. Klient valib kellaaja ise; broneerimisel kasutatakse valitud pakkumise konkreetset töötajat.

Kinnituse lukujärjekord: korduspäringu tehingulukk → ettevõtte jagatud lukk → töötaja realukk. Pärast luku saamist kontrollitakse uut serveriaega, ettevõtte seadeid, sobivust, saadavust, hinda ja kestust. Tulevased graafikute, teenuste ja töötajate halduskirjutused peavad kasutama sama ettevõtte/töötaja lukustusprotokolli. Ettevõtte üldseadete muutmine nõuab ettevõtte eksklusiivset lukku; mitme töötaja muutmisel võetakse lukud ID järjekorras.

PostgreSQL-i GiST exclusion constraint keelab sama töötaja kattuvad aktiivsed hõivamised ka siis, kui rakenduskood eksib. Broneering, korduspäringukirje ja outbox-sündmus salvestatakse ühes tehingus. Sama võti ja sama sisu annavad sama tulemuse, sama võtme teine sisu annab 409. Kontaktandmeid ei tagastata avaliku saadavuse vastuses.

## API

Kõik ettevõtte API päringud lähevad tema hostile, vastused on `Cache-Control: no-store`.

| Päring | Sisu |
| --- | --- |
| `GET /api/catalog` | Avalik ettevõtteinfo, teenused, töötajad, lubatud kuupäevad |
| `GET /api/availability?serviceId=...&date=YYYY-MM-DD&staffId=...` | Konkreetsed vabad pakkumised; staffId on valikuline |
| `POST /api/bookings` | `BookingInput` JSON ja UUID `Idempotency-Key`; sama päritoluga Origin-päis |
| `GET /api/health` | Protsessi elusolek; ei tõenda andmebaasi ega kogu teenuse valmisolekut |

API vead sisaldavad `{error, code}`. Olulisemad: `SLOT_UNAVAILABLE`, `OFFER_CHANGED`, `IDEMPOTENCY_CONFLICT`, `TENANT_NOT_FOUND`, `RATE_LIMIT`. Raha on täisarvuna sentides. Brauser kuvab seda eurodes. Maksimaalne kirjutamispäring on 8 KiB. Protsessipõhine piirang on katse kaitse, mitte valmis hajutatud kuritarvituskaitse.

## Allikad

### Otsingumootorite nähtavus

Kasutaja täpsustas 7. septembril 2026: avalik veebileht peab olema otsingus nähtav ning hiljem ka ettevõtete päris broneerimislehed. Avaleht on `index, follow` ja selle kanooniline aadress on `https://broneering.info/`, ka www-aadressil. `robots.txt` lubab avaliku HTML-i lugemist ning viitab hostipõhisele saidikaardile.

Ettevõtte kontrollitud `*.broneering.info` domeen indekseeritakse, kui ettevõte on aktiivne ja `demo=false`. Demod, haldus, kohalikud eelvaated ja tundmatud domeenid jäävad `noindex, nofollow`; nende saidikaart on tühi. Robotitele jäetakse HTML-i lugemine lubatuks, et nad näeksid noindex-märgist. API teekond on robots.txt-s välistatud. Hostipõhised metainfo ja saidikaardi päringud on dünaamilised, et ettevõtete andmed vahemälus ei seguneks. See on indekseerimise lubamine, mitte otsingumootori indeksi või positsiooni garantii.

- [Next.js oma serveris](https://nextjs.org/docs/app/guides/self-hosting)
- [PostgreSQL vahemikud ja välistuspiirangud](https://www.postgresql.org/docs/current/rangetypes.html)
- [PostgreSQL reapõhine turve](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## Domeenid ja manustamine (ptk 05)
Püsiv domain_reservations register hoiab aadressi algse ettevõtte juures. tenant_domains.ready avatakse alles pärast HTTPS kontrolli. Ainult /embed kasutab ettevõtte tenant_embed_origins põhist CSP frame-ancestors poliitikat; teised vaated keelavad raamistamise. Omaniku MFA õiguskontroll kaitseb seadete muutmist. Versioonitud /widget/v1.js vahetab ainult paigutussõnumeid, kontrollides akent, päritolu ja juhuslikku kanalit. Käitaja HTTPS töövoog ja piirid on [CHAPTER-05](CHAPTER-05.md).
