# Ubuntu serverisse viimine

Tehniline demo paigaldati 7. septembril 2026 Ubuntu 24.04.4 LTS serverisse aadressil `217.146.72.147`. SSH kasutaja on `ubuntu`, port 22 ja selle arvuti olemasolev SSH-võti töötab. Serveris olid Docker ning Nginx juba olemas. Teiste rakenduste konfiguratsioone ei muudetud. Rakendus on tehniline katse; avalik ettevõtete liitumine pole veel valmis.

## Praegune paigaldus

- Projekt serveris: `/srv/broneering.info`.
- GitHub: privaatne `LauRRaud/broneering.info`, haru `main`.
- Serveri GitHubi ligipääs: eraldi ainult selle repo lugemisõigusega deploy key; privaatvõti jääb serverisse.
- Veebikonteiner kuulab ainult `127.0.0.1:3107`; PostgreSQL-il avalikku hostiporti pole.
- Pöördproksi: `/etc/nginx/sites-available/broneering.info`, link `sites-enabled` kaustas.
- HTTPS: broneering.info, www, haldus, demo ja demo2. Certbot kasutab webroot'i `/var/www/broneering-acme`; timer uuendab sertifikaati ning projektipõhine deploy hook laadib Nginxi uuesti.
- Andmebaasi paroolid genereeriti serveris `.env.server` faili õigustega 600. Need ei ole GitHubis.
- Demode domeeniseosed loodi käsuga `run --rm -e ALLOW_DEMO_SEED=true -e PUBLISH_DEMO_DOMAINS=broneering.info migrate node --import tsx scripts/seed.ts`.

## Järgmise muudatuse avaldamine

Arvutis tee kontrollitud muudatusest commit ja `git push`. Seejärel serveris:

```bash
ssh ubuntu@217.146.72.147
cd /srv/broneering.info
git pull --ff-only origin main
sudo docker compose --env-file .env.server -f compose.server.yaml build web migrate
umask 077
mkdir -p backups
sudo docker compose --env-file .env.server -f compose.server.yaml exec -T db pg_dump -U booking_owner -d booking -Fc > "backups/before-update-$(date -u +%Y%m%dT%H%M%SZ).dump"
sudo docker compose --env-file .env.server -f compose.server.yaml run --rm migrate
sudo docker compose --env-file .env.server -f compose.server.yaml up -d web
curl -f https://broneering.info/api/health
```

Käivita sammud järjekorras ja peatu vea korral. Andmebaasi migratsioonid peavad sobima seni töötava versiooniga; skeemi tagasipöördumine tuleb eraldi läbi mõelda. `backups/` on Gitis ignoreeritud, kuid samas serveris asuv koopia ei asenda eraldi varundust. Nginxi tavapärase koodiuuenduse puhul muuta ei ole vaja. GitHub Actionsi automaatset juurutust pole veel seadistatud.

Allpool on uue keskkonna ülesseadmise taustainfo.

## GitHub ja server on erinevad kohad

GitHub hoiab koodi ja muudatuste ajalugu. Ubuntu server käitab Node.js-i rakendust, PostgreSQL-i ja HTTPS-i pöördproksit. Hiljem saab GitHub Actions ehitada kontrollitud väljalaske ning selle SSH kaudu serverisse viia. Praegu ei ole automaatset juurutust seadistatud ega serveri saladusi GitHubi lisatud.

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
AUTH_SECRET=asenda_kolmanda_juhusliku_hex_vaartusega
AUTH_MAIL_MODE=disabled
```

Fail on `.gitignore` ja `.dockerignore` järgi välja jäetud. Paroolide muutmine failis ei muuda juba loodud PostgreSQL-i rollide paroole; hilisem vahetamine on eraldi kontrollitud toiming. `AUTH_SECRET` peab olema vähemalt 32 märki ja püsima taaskäivituste vahel samana. Selle vahetamine mõjutab sessioone ning krüpteeritud MFA saladuste loetavust. Kontokirjade lubamiseks sea `AUTH_MAIL_MODE=smtp` ja `.env.example` SMTP muutujad; ainult domeeni e-posti edasisuunamine ei anna saatmiseks SMTP ligipääsu.

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

## Peatüki 05 domeenikäsk
Uute alamdomeenide HTTPS on nüüd automatiseeritud olemasoleva Certboti HTTP-01 kaudu. See täpsustab ülal varasemat taristu puudujääki. Käsk, domeeni sulgemine ja uuendamise piirid: [CHAPTER-05](CHAPTER-05.md). Enne kasutamist rakenda migratsioon 004 ning paigalda uuendatud infra/nginx.conf ja infra/certbot-reload.sh. Iseteeninduslik liitumine tuleb peatükis 18.

## Arveldustöötaja

Pärast migratsioone 039–040 käivita `billing-worker` koos teiste `workers` profiili teenustega. See koostab saabunud kuuperioodide arveid ning töötleb arvete ja kreeditarvete e-posti järjekorda. Vajalikud on rakenduse andmebaasiühendus, AUTH_SECRET ja AUTH_BASE_URL. Arvete väljastaja ning saaja andmed peavad olema kinnitatud. Saatmiseks määra BILLING_MAIL_MODE=smtp ja SMTP seaded; vaikimisi disabled jätab kirjad ootele. Capture on lubatud ainult kohalikus keskkonnas. Maksete kontrollimiseks ja püsimakseteks käivitatakse eraldi payment-worker. Käivitamine ei kinnita pakkuja tegeliku makse ega SMTP tarne toimimist.

## Varundus, seire ja taastamine (peatükk 22)

Töövahendid, kaitstud seadistus, ajastamise näidised, isoleeritud taastamise vastuvõtt ning uuendamise/tagasipöörde järjekord on [CHAPTER-22.md](CHAPTER-22.md). Serveri Compose sisaldab nüüd veebi `/api/ready` kontrolli ja nelja töötaja südamelööki. `compose.backup.yaml` on eraldi sisse lülitatav pgBackResti kiht; ilma kaitstud välise hoidla ja võtmeteta seda ei aktiveerita. Kohalik taastamiskatse ei tähenda tootmise varunduse ega SLA olemasolu.
