# broneering.info

Reacti, Next.js-i ja TypeScripti baasil isemajutatava broneerimisplatvormi arendustööpuu. Andmebaas on PostgreSQL. Veebileht ja broneerimisvaade kasutavad ühist rakendust.

## Praegune seis

Dokumendi 30 peatüki täitmise seis, puuduvad tööd ja peatüki 01 tulemuste võrdlus: [arendusplaani register](docs/PROGRESS.md).

08.09.2026 peatüki 23 auditi viis koodi-/konfiguratsiooniviga on kohalikult parandatud. Kontroll: 261 testi, tüübikontroll, 48 migratsiooni, tootmispildi ehitus ja sihitud brauseri/proksi katsed läbisid. [Paranduste järelraport](docs/CHAPTER-23-FIXES.md). [Audit, failide katvus ja avatud tööd](docs/CHAPTER-23.md). See kirjeldab kohalikku tööpuud, mitte avaliku serveri praegust versiooni.

Avalik leht, demod ja haldus kasutavad brauseri vaikimisi HTML-elemente. Esialgne kujundus on omaniku soovil eemaldatud; uus kujundussuund lepitakse enne teostamist kokku.

Olemas on avalik teenuse veebileht, kaks kohalikku demokeskkonda, teenuste ja sobivate töötajate valik, päris andmebaasi põhine saadavus, broneeringu kinnitamine ja ICS-allalaadimine. Testitud on ettevõtete eraldatus, samaaegsed kinnitused, korduspäringud, pausid, puhvrid, erandpäevad ja kellakeeramise ajad.

Peatüki 04 teostus lisab kutsega konto loomise, kinnitatud e-posti, sisselogimise, TOTP ja varukoodid, liikmesused, rollid, üksikload, kutsete/ligipääsu tühistamise ja omaniku üleandmise. Täpne vastuvõtt ja piirid on [peatüki 04 registris](docs/CHAPTER-04.md). Kontode kirjade SMTP liides on olemas, kuid avaliku serveri saatmine vajab veel seadistamist; kohalikud testkirjad salvestatakse privaatsesse kausta.

See ei ole veel müügivalmis V1. Kohalikult on teostatud ettevõtte loomine/seadistamine, halduskalender, teavituste taustatöö, import/eksport, arveldus ja taastamistööriistad. Kuutasu kehtiv kokkulepe on 35 € lõpphind kuus, piiramatu töötajate arv ja prooviperioodita. Avatud on paranduste tootmisse paigaldus, päris SMTP/Maksekeskuse vastuvõtt, säilituse automaatika, kasutatav tugivaade ning koormuse, brauserite, piloodi ja üleandmise kontrollid. Kujundus ning tootmise väline varundus ja hoiatused on omaniku otsusel ootel.

Peatükk 05 lisab lubatud kodulehtede halduse, iframe-i ja modaali koos varulingiga ning käitaja käsuga uue alamdomeeni HTTPS-i. Paigaldus, testitulemused ja piirid: [peatükk 05](docs/CHAPTER-05.md).

Peatükk 06 lisab teenusegruppide hierarhia, teenuste ja töötajate halduse, vaikeväärtuste pärimise ning töötajapõhised erisused. Täpne seis: [peatükk 06](docs/CHAPTER-06.md). V1 tootesuund on ilu ja heaolu, konsultatsioonid ning lihtsad teenindusettevõtted; ruumide ja teiste ressursside ühine broneerimine jääb eraldi laienduseks.

Peatükk 07 lisab asukoha ja töötajate graafikute, perioodi erandite ning broneerimisreeglite halduse. Versioonid ja konfliktikontroll kaitsevad kinnitatud broneeringuid; muudetud tingimused küsitakse kliendilt uuesti. Täpne tõend: [peatükk 07](docs/CHAPTER-07.md).

Peatükk 08 lisab töötaja isikliku lingi, järgmise vaba päeva otsingu ning täpsustab kliendivormi ja kinnitust. Tõendid ja hilisemate peatükkide sõltuvused: [peatükk 08](docs/CHAPTER-08.md).

Peatükk 09 täpsustab ja kontrollib „Töötaja pole oluline” voogu: eraldi konkreetsed pakkumised, ajapuuduse teade ja automaatse asendamise keeld. [Teostus ja kontrollid](docs/CHAPTER-09.md).

Peatükk 10 lisab kliendi ja haldaja muutmise/tühistamise, omaniku määratud kehtivusega halduslingid, e-postita käsitsi broneeringud, seisundid ja ajaloo ning puudumise/lahkumise lahendamist ootavad broneeringud. [Teostus, 104 testi ja brauserikontrollid](docs/CHAPTER-10.md). Uusi halduslinke väljastatakse alles pärast ettevõtte omaniku poliitika ja avaliku kontakti seadistamist.

## Avaldatud tehniline demo

7. septembril 2026 paigaldati katse Ubuntu VPS-i aadressil `217.146.72.147`. Kood asub privaatses [GitHubi repos](https://github.com/LauRRaud/broneering.info).

- [Avalik veebileht](https://broneering.info)
- [Ilutegu näidisandmetega demo](https://demo.broneering.info)
- [Stuudio Kask demo](https://demo2.broneering.info)
- [Halduskeskkond](https://haldus.broneering.info)

Demo ei tee päris salongi broneeringuid ega saada e-kirju. `ilutegu.ee` ja selle olemasolev broneerimislink jäid muutmata. Serveri aadressid ning käsitsi uuendamine on kirjeldatud [serverijuhendis](docs/SERVER.md). GitHubi push ei avalda muudatusi automaatselt.

## Käivitamine oma arvutis

Eeldused: Node.js 24, npm ja töötav Docker. Käsud käivita selle README-ga samas kaustas.

```powershell
Copy-Item .env.example .env.local
npm ci
docker compose --env-file .env.local up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Kui `.env.local` on juba seadistatud, ära seda üle kirjuta. Port 3107 valiti, et vältida konflikti arvutis juba töötava teise rakendusega. Kui andmebaasi vaikeport 55432 on hõivatud, lisa `.env.local` faili `LOCAL_DB_PORT=55433` ja muuda mõlema andmebaasiühenduse port samaks. Compose kasutab olemasolevat andmeköidet.

- [Teenuse veebileht](http://localhost:3107)
- [Ilutegu demo](http://ilutegu.localhost:3107)
- [Stuudio Kask demo](http://teine.localhost:3107)
- [Halduskeskkonna arendusseis](http://haldus.localhost:3107)

Ilutegu nimi lähtub kasutaja näitest; demo töötajad, graafikud, kestused ja pakkumised on näidisandmed. Stuudio Kask on väljamõeldud ettevõte. Demo ei saada e-kirju. Kasuta proovimisel väljamõeldud kontaktandmeid. Selle jaotise localhost-aadressid töötavad ainult selles arvutis; avalikud HTTPS-aadressid on eespool.

## Kontrollid

```powershell
npm run typecheck
npm test
npm run build
npm audit
```

Integratsioonitestid vajavad migreeritud PostgreSQL-i ning `.env.local` ühendusi. Need loovad juhuslike tunnustega eraldi testettevõtted ning kustutavad ainult oma testandmed. 50 konkureerivast sama aja taotlusest peab õnnestuma üks. Testid ei asenda arendusplaani kõigi 48 vastuvõtutesti täitmist.

## Failid

- `src/app/page.tsx`: avalik veebileht.
- `src/components/booking-flow.tsx`: broneerimisvaade.
- `src/lib/availability.ts`: serveri saadavusarvutus.
- `src/lib/bookings.ts`: tehinguline kinnitamine ja korduspäringud.
- `src/lib/booking-management.ts`: õigustega muutmine, tühistamine, käsitsi lisamine ja halduskäsud.
- `db/migrations/001_booking.sql`: skeem, RLS ja kattuvuse piirang.
- [Arhitektuur ja otsused](docs/ARCHITECTURE.md)
- [Ubuntu serveri ettevalmistus](docs/SERVER.md)
- [Järgmised tööd](docs/ROADMAP.md)

Kasutaja soov on hoida projekti lähtekood suletuna. GitHubi repo muudeti enne esimese koodi saatmist privaatseks. Projekti litsentsi valikut ei ole välja mõeldud. Sõltuvused säilitavad oma litsentsid; nende register on [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md).
