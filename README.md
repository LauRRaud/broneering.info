# broneering.info

Reacti, Next.js-i ja TypeScripti baasil isemajutatava broneerimisplatvormi esimene tehniline katse. Andmebaas on PostgreSQL. Veebileht ja broneerimisvaade kasutavad ühist rakendust.

## Praegune seis

Avalik leht, demod ja halduse arendusseisu leht kasutavad brauseri vaikimisi HTML-elemente. Esialgne kujundus on omaniku soovil eemaldatud; uus kujundussuund lepitakse enne teostamist kokku.

Olemas on avalik teenuse veebileht, kaks kohalikku demokeskkonda, teenuste ja sobivate töötajate valik, päris andmebaasi põhine saadavus, broneeringu kinnitamine ja ICS-allalaadimine. Testitud on ettevõtete eraldatus, samaaegsed kinnitused, korduspäringud, pausid, puhvrid, erandpäevad ja kellakeeramise ajad.

See ei ole veel müügivalmis V1. Ettevõtte iseteeninduslik liitumine, sisselogimine/MFA, halduskalender, teenuste ja graafikute muutmise kasutajaliides, broneeringu muutmine/tühistamine, e-kirjade saatmine, arveldus ning varunduse taastamiskatse on järgmised etapid. Haldusaadress näitab ausat arendusseisu. E-kirja ülesanne salvestatakse koos broneeringuga, aga saatjat veel pole.

## Avaldatud tehniline demo

7. septembril 2026 paigaldati katse Ubuntu VPS-i aadressil `217.146.72.147`. Kood asub privaatses [GitHubi repos](https://github.com/LauRRaud/broneering.info).

- [Avalik veebileht](https://broneering.info)
- [Ilutegu näidisandmetega demo](https://demo.broneering.info)
- [Stuudio Kask demo](https://demo2.broneering.info)
- [Halduskeskkonna arendusseis](https://haldus.broneering.info)

Demo ei tee päris salongi broneeringuid ega saada e-kirju. `ilutegu.ee` ja selle olemasolev broneerimislink jäid muutmata. Serveri aadressid ning käsitsi uuendamine on kirjeldatud [serverijuhendis](docs/SERVER.md). GitHubi push ei avalda muudatusi automaatselt.

## Käivitamine oma arvutis

Eeldused: Node.js 24, npm ja töötav Docker. Käsud käivita selle README-ga samas kaustas.

```powershell
Copy-Item .env.example .env.local
npm ci
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Kui `.env.local` on juba seadistatud, ära seda üle kirjuta. Port 3107 valiti, et vältida konflikti arvutis juba töötava teise rakendusega.

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

- `src/components/marketing-site.tsx`: avalik veebileht.
- `src/components/booking-flow.tsx`: broneerimisvaade.
- `src/lib/availability.ts`: serveri saadavusarvutus.
- `src/lib/bookings.ts`: tehinguline kinnitamine ja korduspäringud.
- `db/migrations/001_booking.sql`: skeem, RLS ja kattuvuse piirang.
- [Arhitektuur ja otsused](docs/ARCHITECTURE.md)
- [Ubuntu serveri ettevalmistus](docs/SERVER.md)
- [Järgmised tööd](docs/ROADMAP.md)

Kasutaja soov on hoida projekti lähtekood suletuna. GitHubi repo muudeti enne esimese koodi saatmist privaatseks. Projekti litsentsi valikut ei ole välja mõeldud. Sõltuvused säilitavad oma litsentsid; nende register on [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md).
