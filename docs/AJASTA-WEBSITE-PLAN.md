# Ajasta veebileht ja domeenid

**Omaniku otsus 12.09.2026:** olemasolev avaleht saab toote nime **Ajasta** ja asub `ajasta.ee` aadressil. Avaleht jääb kujunduseta; omanik teeb uue kujunduse. `broneering.info` avaleht suunatakse Ajastasse, klientide `nimi.broneering.info` aadressid säilivad.

## Teostus

Olemasolev Reacti, Next.js-i ja TypeScripti rakendus teenindab ka Ajasta veebilehte. Eraldi [AjastaHome komponendis](../src/components/marketing/ajasta-home.tsx) on praegu pealkiri, lühikirjeldus, arendusteade, kaks demo- ja halduse link. Visuaalset stiilikihti ei ole; ligipääsetavuse baasreeglid säilivad. [Komponentide ja stiilide korraldus](FRONTEND-STRUCTURE.md) kehtib avalikule veebile, broneerimisele ja haldusele.

| Aadress | Käitumine |
| --- | --- |
| `https://ajasta.ee/` | Ajasta lihtne avaleht; kanooniline tootelehe aadress |
| `https://www.ajasta.ee/` | 302 suunamine põhikujule `https://ajasta.ee/` |
| `https://broneering.info/` ja `https://www.broneering.info/` | Ainult täpse avalehe `/` 302 suunamine Ajastasse; päringuparameetrid säilivad |
| `https://broneering.info/widget/v1.js` | Jätkuvalt manustamise skript samal aadressil |
| `broneering.info/api/*` | Olemasolevad API-d ja valmisolekukontroll säilivad |
| `haldus.broneering.info` | Olemasolev haldus |
| Ettevõtete `nimi.broneering.info` | Sama ettevõtte broneerimisleht; edasisuunamist ei lisata |

Ajasta hostid on avalehe lubatud hostide loendis. Ettevõtete otsingumetaandmed, demo/halduse noindex ning olemasolevad autentimis- ja manustamislepingud säilivad. Ajasta avalik turundushost ei paku API-sid. Püsiva 301/308 suunamise saab valida pärast lõplikku kujunduse ja aadresside vastuvõttu; praegune 302 väldib ajutise lahenduse püsivat brauserivahemällu jäämist.

## Porkbun ja DNS

**Porkbuni URL Forwarding teenust selle lahenduse jaoks ei kasutata.** Pildil märgitud “Use wildcard URL forwarding” hõlmaks ka alamdomeene. Ka ainult põhidomeeni suunamine Porkbuni kaudu viiks selle liikluse rakendusserverist ära ja mõjutaks põhidomeenil asuvat vidina skripti.

Säilita olemasolevad serverile `217.146.72.147` osutavad põhidomeeni, www ja kliendialamdomeenide DNS-kirjed. Ära asenda wildcard DNS-i wildcard URL forwarding'uga. Muude teenuste MX/TXT kirjeid ei muudeta. Suunamine toimub [Nginxi projektiseadistuses](../infra/nginx.conf) ainult täpsele teekonnale `/` ja kahele põhidomeeni hostile. [Porkbuni ametlik juhend](https://kb.porkbun.com/article/39-how-to-set-up-url-forwarding) kirjeldab tühja Hostname välja, wildcard'i mõju ja välise majutuse DNS-i konflikti.

12.09 DNS-kontroll: `ajasta.ee A 217.146.72.147`; `www.ajasta.ee CNAME ajasta.ee`. DNS-i ei muudetud. Ajasta jaoks paigaldati eraldi [Nginxi virtuaalhost](../infra/ajasta.nginx.conf) ja Certboti sertifikaat. Sertifikaadi uuendamise järel katab [projektipõhine hook](../infra/certbot-reload.sh) ka Ajasta.

## Allesjäänud veebitöö

G04 / O-01 / O-08 / ptk 05, 12, 28–29 ei ole tervikuna lõpetatud. Omaniku kujundus, valmis tootetutvustus ja müügisisu ning lõplik vastuvõtt on veel tegemata. Sisuline alus on avaleht, kuidas töötab, võimalused, hinnad, demo, KKK, sisselogimine ja alustamine. Juhendite leitavus tuleb siduda [üleandmisega](README.md).

Lõplik leht peab esitama tegeliku V1 ulatuse, kinnitatud 35 € lõpphinna, piiramatu töötajate arvu, prooviperioodi puudumise ning maksetingimused. Liitumiskutse peab vastama teenuse tegelikule kasutusvalmidusele. SMTP, Maksekeskuse päriskatsed, väline taastamine ja sõltumatu kasutaja vastuvõtt jäävad oma tööde alla.

Paigalduse, kontrollide ja tagasipöörde tulemus: [12.09 kasutuselevõtu protokoll](DEPLOYMENT-AJASTA-2026-09-12.md). Uue kujunduse saabudes kontrollitakse mobiilivaadet, klaviatuuri, tõlkeid, demo-, abi- ja halduslinke ning manustamise toimimist.
