# Peatükkide 11–23 paigaldus · 08.09.2026

**Paigaldatud GitHubi `main` harust serverisse `217.146.72.147`, `/srv/broneering.info`.** Avalik aadress: [broneering.info](https://broneering.info). Omaniku korraldus: „commiti kõik, vii githubi ja serverisse”.

Rakenduse väljalase: `f4cabda18b16a4be50e9d4e126eb2e3049aebe73`. See sisaldab põhimuudatust `0901155`, auditi täpseid baite säilitavat Giti seadistust ning serveri ehituses tuvastatud töötajate faililubade parandust. Järgnev dokumentatsiooni commit ei muuda käitatavat koodi.

## Paigaldus ja kontroll

- Kogu ignoreerimata projektitöö commit'iti ja push'iti privaatsesse GitHubi reposse. Staged failide saladuste mustrite kontroll ei leidnud privaatvõtmeid ega ehtsa võtme kujuga tokeneid. Keskkonnafailid ja DB-koopiad jäid välja; auditi tõendite Giti baitide vastavus räsimanifestile kontrolliti.
- Salvestati vana commit `4af7f99`, veebipildi tunnus ja projekti Nginxi konfiguratsioon. Loodi piiratud õigustega PostgreSQL dump, mille sisukord kontrolliti `pg_restore --list` abil.
- Koopia taastati eraldi ajutisse `upgrade_ch23_20260908` andmebaasi. Migratsioonid 010–048 läbisid, varasem broneering säilis, puuduvaid kliendiseoseid ja valideerimata piiranguid oli 0. Ajutine DB eemaldati.
- Veeb peatati lühikeseks hoolduseks, tehti uus koopia ja rakendati migratsioonid. Nüüd on **48 migratsiooni**, viimane `048_archived_staff_access.sql`. DB konteinerit ega mahtu ei asendatud.
- Paigaldati rakenduse/töötajate pildid ning projekti Nginxi fail. `nginx -t` läbis ja proksi laaditi uuesti. Teiste rakenduste konfiguratsioone ei muudetud; nende varasemad TLS-i parameetrite hoiatused jäid samaks.
- Töötajate käivitamine paljastas range checkout'i failirežiimi mõju: mitte-root protsess ei saanud `package.json` lugeda. Dockerfile määrab nüüd paketi failidele 644 ning töötajate lähtefailidele/kaustadele lugemis- ja läbimisõiguse. Parandatud pildid ehitati ja paigaldati uuesti.

| Kontroll | Tulemus |
| --- | --- |
| Avaleht, www, haldus, demo ja demo2 HTTPS | Kõik **200**. |
| `/api/ready` | **200**, `status=ready`. |
| Veeb, DB, export-worker, billing-worker | Kõik **healthy**; mõlema töötaja südamelöögi käsk läbis. |
| Privaatsete failide kaust | Veebiprotsessi kasutajale kirjutatav. |
| Avalik sünteetiline demobroneering | **201**; sama võtme/sisuga kordus tagastas sama ID ja viite. |
| Import läbi päris Nginxi | 32 KiB ja 5 MiB jõuavad autentimiskontrollini (**401**, sisselogimata); 5 MiB + 1 bait saab **413**. Tavalise API 32 KiB saab **413**. |
| Kontrollandmed | Mõlemad selle paigalduse sünteetilised demobroneeringud tühistati täpse demo-/kontakti-/ajafiltriga operaatoritehingus, sündmus säilitati ja ootel teated aegistati. Aktiivseid kontrollbroneeringuid jäi **0**. |

Olemasoleval demol polnud halduslingi poliitikat ega omanikuliikmesust. Avalik loomine ei andnud halduslinki ning kliendilingi tühistamist selle demoga ei tõendatud. Demo poliitikat ei muudetud; sünteetilised kirjed tühistati operaatoritehingus koos auditiga. Esimene kontrollskript tõlgendas järgmise vaba päeva vastust ekslikult pakkumiste loendina; parandatud kontroll küsis tagastatud päeva pakkumised eraldi.

Kohalik alus: [261 testi, tüübikontroll ja auditi paranduskatsed](CHAPTER-23-FIXES.md). Serveris ehitati lõplik Dockerfile ja kontrolliti tegelikke mitte-root teenuseid. See ei asenda kõigi AT-01–48, brauserite, rollide ega tootmismahu vastuvõttu.

## Säilinud piirangud ja taastamispunkt

SMTP ja Maksekeskuse ühendus jäävad senise seadistuse järgi välja lülitatuks. Teavituste/maksete töötaja pildid on ehitatud, kuid nende konteinerid **ei tööta**, sest transpordid pole seadistatud. Neid ei jäetud taaskäivitustsüklisse. Arveldustöö töötab andmebaasi tasemel; arvekirjade saatmine jääb keelatuks. Päriskirju ega makseid paigalduskatses ei tehtud.

Välist varunduskohta, automaatseid varundustaimerid ega hoiatuskanaleid ei aktiveeritud; omaniku varasem edasilükkamine säilib. Serveri `backups/` kausta jäid `20260908-chapter23.dump`, `20260908-chapter23-maintenance.dump`, nende sisukorrad ning vana pildi/commit'i ja Nginxi andmed. See on paigalduse taastamispunkt, mitte sõltumatu väline varundus. Pärast 39 uut migratsiooni kasutatakse [peatüki 22 tagasipöörde korda](CHAPTER-22.md).

Avatud jäävad [23-G01–G09](CHAPTER-23-WORK.md), sh tugivaade, säilituse automaatika, välised ühendused ja tervikvastuvõtt.
