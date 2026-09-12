# Projekti juhendid ja vastuvõtt

Siit leiab broneering.info olemasolevad juhised ja nende lõpetamise seisu. Seis 12.09.2026: tehniline dokumentatsioon on olemas, kuid lõppkasutaja juhendi ning sõltumatu paigalduse/käitamise vastuvõtt on veel tegemata. [Täielik tööde ja otsuste register](REMAINING-WORK.md) järgib algse arendusplaani peatükke.

## Kasutaja ja ettevõtte haldaja

Ühtse lõppkasutaja kasutusjuhendi **esmane versioon on kohalikus eelvaates olemas, avaldamine ja kasutajavastuvõtt on ootel**. See avaneb avalehelt ja haldusest samale `/juhend` lehele, haldusest uuel vahelehel. Üks [sisufail](../src/content/user-guide.ts) hoiab peatükke ja püsivaid ankrulinke; [kohaliku eelvaate juhis](LOCAL-PREVIEW.md). Arenduspeatükid jäävad tehniliseks alusmaterjaliks.

| Kasutaja ülesanne | Olemasolev alus |
| --- | --- |
| Teenuse, töötaja ja aja valimine; kinnitamine | [Kliendi broneerimisteekond](CHAPTER-08.md), [töötaja eelistuseta valik](CHAPTER-09.md) |
| Broneeringu muutmine või tühistamine | [Muutmised ja erandolukorrad](CHAPTER-10.md) |
| Kontod, kutsed ja õigused | [Kasutajad ja õigused](CHAPTER-04.md) |
| Teenused, töötajad ja tööajad | [Teenused](CHAPTER-06.md), [graafikud](CHAPTER-07.md) |
| Kalender, käsitsi broneeringud ja kliendid | [Muutmised](CHAPTER-10.md), [kalender ja ettevõtte haldus](CHAPTER-11.md) |
| Broneerimise lisamine oma kodulehele | [Domeenid ja manustamine](CHAPTER-05.md) |
| Liitumine, import, eksport ja lahkumine | [Ettevõtte elutsükkel](CHAPTER-18.md) |
| Pakett, arved, laekumised ja maksetõrked | [Arveldus](CHAPTER-19.md); SMTP ja Maksekeskuse pärisvastuvõtt ootel |
| Andmetaotlus ja kontaktide eemaldamine | [Andmekaitse töövood](CHAPTER-21.md); automaatne säilitamispoliitika kinnitamata |

Valmiv kasutusjuhend peab selgitama iga rolli põhitoiminguid, eeltingimusi, õnnestumise tulemust ja tõrke korral jätkamist. Lõplikud nupunimed ning ekraanipildid kontrollitakse pärast kujundust. Iseseisev kasutaja peab saama juhendi järgi ülesande lõpetada; juhendi faili olemasolu üksi ei tõenda vastuvõttu. Omaniku 12.09 täpsustuse järgi kasutatakse ühte juhendit aadressil `ajasta.ee/juhend`, millele viitavad nii avaleht kui ka haldus. Kohalik esmane versioon katab peamised broneerimise, teenuste, graafikute ja manustamise toimingud. Import/eksport, arveldus ning andmetaotlused vajavad veel kasutajale suunatud peatükke; tehnilist dokumentatsiooni ei avaldata automaatselt abilehel.

## Platvormi omanik ja administraator

[Platvormihalduri kasutusjuhendi esmane versioon](PLATFORM-ADMIN-GUIDE.md) kirjeldab ettevõtte loomist, kutseid, tellimusi, arveid, laekumisi, makse- ja saatmistõrkeid ning auditeeritud tuge. Juhend eristab ettevõtte omaniku ja platvormihalduri õigusi ning nimetab puuduva sulgemise/taasavamise töökorra.

**Seis:** praeguse lähtekoodiga võrreldud; omaniku kasutuskatse ja lõpliku kujunduse kontroll on tegemata. [Platvormihalduri vastuvõtuülesanded](CHAPTER-25.md#platvormihalduri-arusaadavuse-vastuvõtt) kontrollivad ka haldusvaate enda selgust: nähtav ettevõte, seisund, põhjus, võimalik järgmine tegevus ja toimingu tagajärg.

## Arendaja ja käitaja

| Vajadus | Juhend ja seis |
| --- | --- |
| Kohalik käivitamine ja testid | [Projekti README](../README.md); teise arendaja sõltumatu katse AT-44 on ootel |
| Ubuntu server, domeenid, TLS ja paigaldus | [SERVER](SERVER.md); tegelikke ligipääse ei salvestata dokumentidesse |
| Arhitektuur, API/andmemudel ja lukustused | [Arhitektuur](ARCHITECTURE.md), [skeem](SCHEMA.md), [moodulid](CHAPTER-14.md), [broneerimismootor](CHAPTER-15.md) |
| Varundus, taastamine, seire ja tagasipööre | [Käitamisjuhised](CHAPTER-22.md), [sama VPS-i taastamise tõend](CHAPTER-26.md); väline taastamine, võtmehoid ja häirete lõplik aktiveerimine ootel |
| Kirjade vead ja taastumine | [Teavituste töövoog](CHAPTER-17.md); SMTP seadistus ja päris katse ootel |
| Ajutine auditeeritud tugiligipääs | [Toe juhend](SUPPORT-G09.md); omaniku/sõltumatu ülevaataja vastuvõtt ootel |

Hooldaja, asendaja, kontaktkanal, toeajad ja rikkele reageerimise vastutus on **määramata**. Kokkuleppe järel lisatakse need käitamise üleandmisprotokolli; juurdepääsuvõtmed antakse üle eraldi kaitstud kanaliga. Teise arendaja paigalduskatse protokoll peab nimetama tegeliku testija, versiooni ja puhta keskkonna ning tõendama edukat broneeringut juhendi järgi.

## Tööde seis ja tõendid

- [Allesjäänud tööd, D-/O-otsused ning üleandmise nõuded](REMAINING-WORK.md)
- [Peatükkide täitmise register](PROGRESS.md)
- [AT-01–48 tõendimaatriks](CHAPTER-23-ACCEPTANCE.md)
- [Kasutatavuse ja ligipääsetavuse vastuvõtu plaan](CHAPTER-25.md)
- [Litsentside senine katvus ja puudujäägid](LICENSE-COVERAGE.md)
- [Kasutaja tehtud serverirestardi järelkontroll](RESTART-2026-09-12.md)
- [Ajasta avaliku veebilehe ja domeenide kasutuselevõtu kava](AJASTA-WEBSITE-PLAN.md)

Arenduspeatükkides olevad vanad testiarvud ja seisukirjeldused käivad oma kuupäeva kohta. Praeguse tegemata töö ulatus tuleb võtta uuemast kuupäevastatud protokollist ja allesjäänud tööde registrist.

- [Kujunduse, primitiivide ja komponentide failikorraldus](FRONTEND-STRUCTURE.md)
- [Halduse struktuuri lähteplaan: põhimenüü, töövaated ja konto/ettevõtte/platvormi eraldamine](ADMIN-STRUCTURE-PLAN.md) — dokumenteeritud suund; kujundus ja teostus on ootel.
- [Ajasta veebilehe HTTPS-i ja avalehe suunamise paigaldus](DEPLOYMENT-AJASTA-2026-09-12.md)
