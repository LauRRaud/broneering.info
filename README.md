# broneering.info

Reacti, Next.js-i ja TypeScripti baasil isemajutatava broneerimisplatvormi esimene tehniline katse. Andmebaas on PostgreSQL. Veebileht ja broneerimisvaade kasutavad ühist rakendust.

## Praegune seis

Dokumendi 30 peatüki täitmise seis, puuduvad tööd ja peatüki 01 tulemuste võrdlus: [arendusplaani register](docs/PROGRESS.md).

Avalik leht, demod ja haldus kasutavad brauseri vaikimisi HTML-elemente. Esialgne kujundus on omaniku soovil eemaldatud; uus kujundussuund lepitakse enne teostamist kokku.

Olemas on avalik teenuse veebileht, kaks kohalikku demokeskkonda, teenuste ja sobivate töötajate valik, päris andmebaasi põhine saadavus, broneeringu kinnitamine ja ICS-allalaadimine. Testitud on ettevõtete eraldatus, samaaegsed kinnitused, korduspäringud, pausid, puhvrid, erandpäevad ja kellakeeramise ajad.

Peatüki 04 teostus lisab kutsega konto loomise, kinnitatud e-posti, sisselogimise, TOTP ja varukoodid, liikmesused, rollid, üksikload, kutsete/ligipääsu tühistamise ja omaniku üleandmise. Täpne vastuvõtt ja piirid on [peatüki 04 registris](docs/CHAPTER-04.md). Kontode kirjade SMTP liides on olemas, kuid avaliku serveri saatmine vajab veel seadistamist; kohalikud testkirjad salvestatakse privaatsesse kausta.

See ei ole veel müügivalmis V1. Ettevõtte iseteeninduslik liitumine, halduskalender, broneeringu muutmine/tühistamine, broneeringukirjade saatmine, arveldus ning varunduse taastamiskatse on järgmised etapid. Broneeringu e-kirja ülesanne salvestatakse koos broneeringuga, aga selle saatjat veel pole.

Peatükk 05 lisab lubatud kodulehtede halduse, iframe-i ja modaali koos varulingiga ning käitaja käsuga uue alamdomeeni HTTPS-i. Paigaldus, testitulemused ja piirid: [peatükk 05](docs/CHAPTER-05.md).

Peatükk 06 lisab teenusegruppide hierarhia, teenuste ja töötajate halduse, vaikeväärtuste pärimise ning töötajapõhised erisused. Täpne seis: [peatükk 06](docs/CHAPTER-06.md). V1 tootesuund on ilu ja heaolu, konsultatsioonid ning lihtsad teenindusettevõtted; ruumide ja teiste ressursside ühine broneerimine jääb eraldi laienduseks.

Peatükk 07 lisab asukoha ja töötajate graafikute, perioodi erandite ning broneerimisreeglite halduse. Versioonid ja konfliktikontroll kaitsevad kinnitatud broneeringuid; muudetud tingimused küsitakse kliendilt uuesti. Täpne tõend: [peatükk 07](docs/CHAPTER-07.md).

Peatükk 08 lisab töötaja isikliku lingi, järgmise vaba päeva otsingu ning täpsustab kliendivormi ja kinnitust. Tõendid ja hilisemate peatükkide sõltuvused: [peatükk 08](docs/CHAPTER-08.md).

Peatükk 09 täpsustab ja kontrollib „Töötaja pole oluline” voogu: eraldi konkreetsed pakkumised, ajapuuduse teade ja automaatse asendamise keeld. [Teostus ja kontrollid](docs/CHAPTER-09.md).

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
- `db/migrations/001_booking.sql`: skeem, RLS ja kattuvuse piirang.
- [Arhitektuur ja otsused](docs/ARCHITECTURE.md)
- [Ubuntu serveri ettevalmistus](docs/SERVER.md)
- [Järgmised tööd](docs/ROADMAP.md)

Kasutaja soov on hoida projekti lähtekood suletuna. GitHubi repo muudeti enne esimese koodi saatmist privaatseks. Projekti litsentsi valikut ei ole välja mõeldud. Sõltuvused säilitavad oma litsentsid; nende register on [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md).
