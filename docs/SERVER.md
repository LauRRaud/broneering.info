# Ubuntu serverisse viimine

Praegu ei ole SSH kasutaja, port, autentimine, Ubuntu versioon ega olemasolevad teenused teada. Selles töös serverisse sisse ei logitud ega seal muudatusi tehtud. Allolev on käivitusmaterjal järgmise sammu jaoks, mitte väide tehtud paigaldusest. Rakendus on tehniline katse; avalik ettevõtete liitumine pole veel valmis.

## GitHub ja server on erinevad kohad

GitHub hoiab koodi ja muudatuste ajalugu. Ubuntu server käitab Node.js-i rakendust, PostgreSQL-i ja HTTPS-i pöördproksit. Hiljem saab GitHub Actions ehitada kontrollitud väljalaske ning selle SSH kaudu serverisse viia. Praegu ei ole automaatset juurutust ega serveri saladusi lisatud.

SSH kasutajanimi, port ja ligipääsu lisamine leitakse VPS-i teenusepakkuja halduspaneelist. Parooli ega privaatvõtit ei panda vestlusse või GitHubi. Enne paigaldust tuleb üle vaadata Ubuntu versioon, olemasolevad veebilehed, portide 80/443 kasutus, Docker, kettaruum ja varundus. Olemasolevat proksit või andmebaasi ei asendata ülevaatuseta.

## Ettevalmistatud failid

`Dockerfile` sisaldab eraldi migratsiooni- ja käitamisetappi. Veebiprotsess töötab mitte-root kasutajana. `compose.server.yaml` jätab PostgreSQL-i ainult konteinerivõrku ja seob veebipordi hosti loopback-aadressile. `infra/Caddyfile.example` on näidis olemasoleva pöördproksiga ühendamiseks.

Pärast serveri ülevaatust paigalda vajadusel Docker Engine ja Compose plugin [Docker Ubuntu ametliku juhendi](https://docs.docker.com/engine/install/ubuntu/) järgi. Ära käivita juhuslikke installiskripte üle olemasoleva töötava serveri.

## Staging-keskkonna käsud pärast ligipääsu seadistamist

Klooni privaatne repo sobivasse uude projektikataloogi. Loo kohapeal `.env.server` fail ja sea õigused 600. Paroolid genereeri kaks korda käsuga `openssl rand -hex 32`; nii ei vaja ühendus-URL-i parool eraldi kodeerimist. Faili sisu:

```dotenv
DB_OWNER_PASSWORD=asenda_esimese_juhusliku_hex_vaartusega
DB_APP_PASSWORD=asenda_teise_juhusliku_hex_vaartusega
WEB_PORT=3107
```

Fail on `.gitignore` ja `.dockerignore` järgi välja jäetud. Paroolide muutmine failis ei muuda juba loodud PostgreSQL-i rollide paroole; hilisem vahetamine on eraldi kontrollitud toiming.

```bash
docker compose --env-file .env.server -f compose.server.yaml up -d db
docker compose --env-file .env.server -f compose.server.yaml run --rm migrate
docker compose --env-file .env.server -f compose.server.yaml up -d --build web
curl http://127.0.0.1:3107/api/health
```

Uus andmebaas on tühi. Avaleht töötab, ettevõtteleht vajab ettevõtte ja domeeniseose loomist. Kohalik `db:seed` ei loo tootmisdomeenide seoseid ning ei impordi päriskliente. Demokeskkonna avaldamiseks tuleb eraldi luua selgelt märgitud demoandmed ja siduda `demo.broneering.info` ning `demo2.broneering.info`; avalehe demo-viiteid ei avaldata enne, kui sihtkeskkonnad on kontrollitud.

## Domeenid ja HTTPS

Kavandatud DNS:

| Kirje | Siht |
| --- | --- |
| A `@` | `217.146.72.147` |
| A `haldus` | `217.146.72.147` |
| A `*` | `217.146.72.147` |

Olemasolevad kirjed tuleb esmalt üle kontrollida. Wildcard DNS ei loo rakenduses ettevõtet ega taga HTTPS-i. Esimeses staging-katses saab pöördproksi väljastada sertifikaadi täpselt loetletud hostidele. Automaatne uute ettevõtete HTTPS, sealhulgas wildcard-sertifikaadi DNS-01 lahendus ja DNS-i ligipääsu piirangud, tuleb enne iseteenindusliku liitumise avamist teostada.

Kohanda olemasoleva proksi seadistust, säilitades `Host` päise ja suunates ainult selle projekti domeenid `127.0.0.1:3107` peale. Kontrolli enne proksi laadimist tema enda konfiguratsiooni validaatoriga. Paigaldus peab toimima HTTPS-iga.

## Enne päris kasutust

Vajalikud on töötav autentimine ja MFA, haldus ning õiguskontroll, automaatne ettevõtte loomine, meili saatmine, turvalised broneeringu halduslingid, säilitusreeglid, kuritarvituskaitse, serveriseire, välised kaitstud varukoopiad ning mõõdetud taastamiskatse. Andmekaitse tekstid, kuutasu ja klienditingimused on omaniku otsustada. Tagasipöördumise plaan peab katma nii rakenduse väljalaske kui andmebaasi migratsioonid; konteineri taaskäivitamine ei ole andmebaasi taastamine.
