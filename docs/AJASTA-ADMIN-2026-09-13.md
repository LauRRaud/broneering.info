# Ajasta avaleht ja teenusepakkuja haldus 13.09.2026

Ajasta avaleht, sisselogimine ja teenusepakkuja haldus kujundati Ilutegu demo sooja ning kompaktse visuaalse keelega. Avaleht on jaotatud eraldi komponentideks; hero meediaraam ootab omaniku antavat fotot ning sellele ei loodud asenduspilti. Avalik konto loomine on suletud. „Loo konto” ja sisselogimise tegevused viivad haldusse, kus suletud liitumine on selgelt kirjas.

Haldus jaguneb broneeringute, klientide, teenuste, meeskonna ja seadete vaadeteks. Broneeringute kuupäev kasutab avaliku demo `MonthCalendar` komponenti. Kuupäeva- ja töötajafiltrid on võrdse mõõduga, rippmenüüd kasutavad ühtset Ajasta kujundust ning aktiivne/fookuses väli ei kasuta brauseri musta vaikimisserva. Klientide toimingud, teenusevormid, liikmete õigused ja ettevõtte seadistamine kohanduvad kitsas vaates kaartideks ning eraldi vormiridadeks.

Ettevõtte enda broneerimislehe kujundus jääb ettevõtte seadete „Kujundus” alale koos eelvaate ja avaldamisega. Haldus ise säilitab ühtse Ajasta kujunduse ning näitab ettevõtte nime/konteksti päises.

Kohalik kontroll:

- 58 testifaili ja 361 testi läbisid;
- arhitektuurikontroll, TypeScript ja Next.js tootmisbuild läbisid;
- 1280 × 720 töölauavaade ning 707 × 698 kitsas vaade kontrolliti päris brauseris;
- avalehe, halduse ja Ilutegu demo brauserikonsoolis ei olnud vigu;
- sünteetilised prooviettevõtted, kasutajad, sessioonid ja broneeringud eemaldati pärast kontrolli;
- kujunduse võrdlus ja parandusring on failis [`design-qa.md`](../design-qa.md), tulemusega `passed`.

## Serveripaigaldus

Rakenduse commit `4d4302e` ja halduse metaandmete järelparandus `2a3ac6c` saadeti GitHubi `main` harusse. Serveri checkout `/srv/broneering.info` uuendati puhtast `0326860` versioonist. Enne migratsioone loodi õigustega 600 varukoopia `backups/before-ajasta-admin-20260913T093302Z.dump` (305945 baiti). Skeemis on 54 migratsiooni.

Lõplik veebipilt on `sha256:d10c68e1e9d71d85e72196c2431ff8cfdb43f7b8dacff15a29c99ff18a44372b`. Eelmine pilt säilitati märgendiga `broneeringinfo-web:before-ajasta-admin-20260913`. Taasloodi ainult veebikonteiner; andmebaas ning ekspordi- ja arveldustöötaja jäid tööle.

Paigaldusjärgne kontroll:

- `https://ajasta.ee/`, `https://www.ajasta.ee/`, `https://broneering.info/` ja `https://www.broneering.info/` vastasid 200 ning pealkirjaga „Ajasta – broneerimissüsteem teenusepakkujatele”;
- `https://haldus.broneering.info/` vastas 200 ning pealkirjaga „Ajasta haldus”;
- `https://demo.broneering.info/` ja `https://demo2.broneering.info/` vastasid 200;
- Ilutegu kataloogis säilis 34 teenust ja viis töötajat;
- readiness tagastas `ready`;
- web, db, export-worker ja billing-worker olid `healthy`;
- tootmise Ajasta, haldus ja Ilutegu avati brauseris ning nende konsoolis ei olnud vigu.

Üksikasjalik esimese paigaldusetapi väljund on failis [`server-deploy.log`](audits/ajasta-admin-20260913/server-deploy.log).
