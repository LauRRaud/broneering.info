# Ajasta avalehe kasutuselevõtt 12.09.2026

**Tulemus:** `https://ajasta.ee/` teenindab lihtsat Ajasta avalehte. `broneering.info` ja `www.broneering.info` ainult avalehe `/` päringud saavad 302 suunamise Ajastasse. Ettevõtete alamdomeenid, haldus, vidin ja senised API-aadressid säilivad. Uue kujunduse teeb omanik.

## Versioon ja paigaldus

- Rakenduse commit: `a4376155765937fd136cf4cd902f6f2cc8e3288c`.
- Töötava veebipildi ID: `sha256:305dad42b2a03e6514c51d61812dc4938686c5884aa8817308b2aa04cf3570dc`.
- Eelmine veebipilt on serveris märgendiga `broneeringinfo-web:before-ajasta-20260912`.
- Serveri checkout `/srv/broneering.info` uuendati `git pull --ff-only origin main` abil. Ehitati ja taasloodi ainult `web`; migratsioone ei käivitatud. Andmebaasi ning ekspordi- ja arveldustöötaja konteinereid ei taasloodud.
- DNS oli juba õige: Ajasta A-kirje `217.146.72.147`, www CNAME `ajasta.ee`. DNS-i ega Porkbuni seadistust ei muudetud.
- Lisati ainult selle projekti `/etc/nginx/sites-available/ajasta.ee` virtuaalhost. Certbot väljastas HTTP-01 webroot'i kaudu sertifikaadi hostidele `ajasta.ee` ja `www.ajasta.ee`, kehtiv kuni 11.12.2026. `certbot.timer` on lubatud ning projektipõhine uuendamishook hõlmab nüüd Ajastat.
- Enne põhidomeeni suunamise aktiveerimist kontrolliti Ajasta HTTPS-i ja avalehe sisu. `nginx -t` läbis enne kummagi seadistuse reload'i. Esimene vahetult reload'i järel tehtud HTTPS-päring jõudis veel vana sertifikaadini; korduskontroll nii serverist kui väljast läbis enne suunamise aktiveerimist.

## Kontrollid

- Neli domeenipõhist otsingutesti läbisid, sh Ajasta kanooniline URL, võõraste hostide välistamine ja ettevõtete senine käitumine.
- Kohalik TypeScripti kontroll ning kohalik ja serveri tootmisehitus läbisid; arhitektuuripiiride kontroll läbis 158 lähtefailiga.
- [15 avalikku HTTP-kontrolli](audits/ajasta-20260912/public-checks.json): Ajasta 200, www ja põhidomeeni täpsed 302 sihid, päringuparameetrite säilimine, HTTP → HTTPS, vidin 200 JavaScriptina, readiness `ready`, haldus ja mõlemad demod 200, demode kataloogides kummaski 4 teenust, Ajasta sitemap ja robots.
- Playwright: [töölauavaade](audits/ajasta-20260912/desktop.png), [390 px mobiilivaade](audits/ajasta-20260912/mobile.png), inglise keele valik ja demole navigeerimine töötavad. Leht kasutab brauseri vaikekujundust. Favicon on veel kujundustöö osa: brauser küsis puuduvat `/favicon.ico` faili ja sai 404; seda ei käsitleta valmis brändivisuaalina.
- Kõik neli teenindavat konteinerit olid järelkontrollis `healthy`. Varasem omaniku tehtud [serverirestardi kontroll](RESTART-2026-09-12.md) jääb eraldi tõendiks; veebipaigaldus muutis nüüd veebipildi ja konteineri versiooni.

See kontroll ei ole uus broneeringu kirjutamise, SMTP, maksete ega välise taastamise vastuvõtt.

## Tagasipööre

Projektifaili ja sertifikaadi hook'i eelmised koopiad asuvad serveris `/srv/broneering.info/output/ajasta-20260912/broneering.nginx.before` ning `certbot-hook.before`. Suunamise saab eemaldada, taastades ainult Broneeringu Nginxi projektifaili ning tehes `nginx -t` ja reload'i. Ajasta avaleht võib seejuures tööle jääda.

Veebiversiooni tagasipöördeks märgenda `broneeringinfo-web:before-ajasta-20260912` uuesti `broneeringinfo-web:latest` ning käivita projektikataloogis `sudo docker compose --env-file .env.server -f compose.server.yaml up -d --no-deps --no-build web`. Kui taastad Ajastat mittetundva veebiversiooni, eemalda esmalt põhidomeeni suunamine. Andmebaasi skeemi tagasipööret see muudatus ei vaja. Teiste saitide Nginxi faile ei muudeta.

Lõplik veebisisu, omaniku kujundus ning iseseisev kasutajavastuvõtt jäävad [Ajasta veebiplaani](AJASTA-WEBSITE-PLAN.md). Failide ja stiilide korraldus on [kujundusarhitektuuri juhendis](FRONTEND-STRUCTURE.md).
