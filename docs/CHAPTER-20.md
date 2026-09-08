# Peatükk 20: õiguste päritolu ja kopeerimisriski vähendamine

## Kontrollitud tehniline seis

08.09.2026 `gh repo view --json nameWithOwner,isPrivate` kinnitas, et `LauRRaud/broneering.info` on privaatne hoidla. Rakenduse `package.json` sisaldab `private: true`. Kliendile ei pakuta serverikoodi allalaadimist. Ettevõtte eksport koosneb lubatud andmeväljadest, mitte hoidlast ega serveri failidest. Arhitektuurikontroll lubab brauserisse ainult selgelt loetletud jagatud teegid; andmebaasi, maksete, õiguste ja taustatööde moodulid jäävad serverisse.

Saladused ja katsesisu on Gitist, Docker ehituskontekstist ning Next standalone failijälitusest välistatud. See vähendab juhusliku avaldamise riski, kuid ei tõenda kogu õiguste ahelat ega taga tehnilist kopeerimatust. Ligipääsude tegelik loend, hoidla kasutajate MFA ja lepingud vajavad omaniku eraldi kontrolli.

## Kolmandate osapoolte osad

`npm run licenses` genereerib lukufailist [sõltuvuste registri](DEPENDENCIES.md), paigaldatud failidest [täielike teadete kogumiku](THIRD-PARTY-NOTICES.txt) ning [katvuse ja puudujääkide loendi](LICENSE-COVERAGE.md). Failinimed LICENSE, LICENCE, NOTICE ja COPYING leitakse ka pakettidesse põimitud teekidest. README-s olev terviklik litsentsijaotis kogutakse eraldi; pelgalt MIT silt ei loeta täielikuks teateks.

Windowsi kontroll: 194 lukufailikirjet, 111 paigaldatud paketti, 233 litsentsi-/teatefaili või README-jaotist. Kaheksal paigaldatud paketil puudus automaatselt tuvastatud täielik tekst. Linuxi dependencies-konteineri kontroll: 112 paigaldatud paketti, 233 teadet ning üheksa täieliku teksti kontrolli vajavat kirjet. Puuduva platvormi binaarpaketti ei nimetata selle masina paigaldatud sõltuvuseks. Need numbrid ei ole litsentside õigusliku sobivuse kinnitus.

Docker genereerib teated Linuxi tegeliku paigalduse järgi ning säilitab need veebikonteineris `/app/THIRD-PARTY-NOTICES.txt`; töötajakonteinerid pärivad sama faili dependencies-etapist. Konteineri operatsioonisüsteemi, Node.js-i enda ning PostgreSQL-i teated ei kuulu npm-registrisse ja vajavad eraldi inventuuri. `npm ci` fikseerib sõltuvused lukufaili järgi. Litsentsigeneraator peatub, kui paigaldatud versioon ei vasta lukufailile.

## Õiguste päritolu register

| Materjal | Praegune päritolu ja piir | Üleandmise tõend |
| --- | --- | --- |
| Rakenduse kood, migratsioonid, testid ja dokumendid | Selle projekti tööruum ja privaatne hoidla; arenduses on kasutatud AI abi | Hoidla ja failid on olemas; need ei asenda lepingulise õiguste ahela kontrolli |
| Kolmandate osapoolte teegid | Lukufail, paigaldatud pakettide teated, konteinerite digestid | Oma litsentsid ja nõutavad teated; neid ei nimetata platvormi ainuomandiks |
| Kujundus, logo ja brändivara | Uus kujundus on omaniku korraldusel ootel | Uut kujundus- ega kaubamärgiõiguste üleandmist ei väideta |
| Ettevõtete ja klientide andmed | Ettevõttepõhine andmebaas ja õigustega töövood | Andmekaitserollid ning töötlemise juhised kuuluvad peatükki 21 |

## Lepingulise kontrolli lähteülesanne

Omaniku ja lepingute koostaja kontrolli vajavad eritellimuse täpne ulatus, õiguste üleandmise hetk ja tasu, arendajate/alltöövõtjate õiguste ahel, varasema materjali erandid, konfidentsiaalsus, lubatud muutmine ja edasiarendus ning koostöö lõpetamisel ligipääsude sulgemine. Selles registris ei määrata lepingupooli ega kehtestata uut litsentsi. Allkirjastatud lepinguid ei ole tööruumis tuvastatud ega nende olemasolu kinnitatud.

Peatüki tehniline inventuur on tehtud. Täielikud puuduvad litsentsitekstid, konteinerite süsteemikomponentide inventuur ja lepingulise õiguste ahela kinnitus jäävad üleandmise eelduseks. Järgmine peatükk on 21: andmekaitse ja säilitamine.
