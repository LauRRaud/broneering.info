# Peatükk 13 — andmemudel ja põhiinvariandid

08.09.2026, kohalik teostus. Alus on arendusplaani peatüki 13 objektide loend ja ühised andmereeglid. Nõuete tõlgendamisel kontrolliti ka peatükkide 17–19 ja 21 tulevasi andmevajadusi. Nende ärilisi töövooge ei loeta tabelite olemasolu tõttu valmis.

## Tulemus

- [DATA-MODEL.md](DATA-MODEL.md) seob kõik lähteplaani objektid tabelite või V1 teadlike lugemisvaadetega, selgitab kardinaalsust, ettevõttepiire, raha, ajamudelit, versioone ja API lepinguid.
- [SCHEMA.md](SCHEMA.md) dokumenteerib 43 tabelit/vaadet koos tegelike väljade, võtmete, indeksite, piirangute, RLS-i ja õigustega. `npm run db:schema` loob selle skeemi metaandmetest, lugemata ettevõtete andmeridu.
- Migratsioon 014 tugevdab olemasoleva mudeli invarianti: teenindusaja/kestuse ja hõivamise/puhvrite täpne kooskõla, positiivsed versioonid, valuuta, kehtiv ajavöönd ning kattumatu ja korrektne kohalik graafik. Lisatud on ainult lugemiseks `locations` ja `booking_allocations` vaated ning teavituskatsete metaandmed.
- Migratsioonid 015/016 lisavad paketiversiooni, tellimuse, arve, laekumise, faili, teemaversiooni, impordipartii/-rea, eksporditöö ja säilituspoliitika skeemi. Ei loodud pakette, hindu, arveid ega ettevõtete kasutusõigusi. Rakendusrolli kirjutusõigused jäävad vastava hilisema töövoo lisamiseni suletuks.
- Väljastatud arve hetktõmmise, paketiversiooni ja avaldatud teemaversiooni ülekirjutamine on keelatud. Laekumise parandamine nõuab tühistava märkega algkirje säilitamist ja uut kirjet. Tingimuslikud põhjendused kontrollivad ka NULL-väärtust.

Üks asukoht ja üks töötaja jaotus on V1 teadlik mudelivalik: nende jaoks ei loodud duplikaatandmeid. Mitut asukohta ega üldist ressursiplaneerimist ei avatud. Kontaktisik eristub teenuse saajast olemasolevas lepingus: `name` on saaja, e-post/telefon võivad olla tema eest broneeriva inimese omad. Isikusamasust ei tuletata e-postist.

## Vastuvõtu seosed

| Nõue / AT | Teostus ja tõend | Alles jääv sõltuvus |
| --- | --- | --- |
| Ettevõttepõhised seosed; AT-19/20/21 | Ühendvälisvõtmed ja FORCE RLS uutes tabelites, rakendusrolli katsed ning vaadete kontekstikaitse. Senised HTTP/puuli testid läbivad. | Uute faili/ekspordi API-de õigusekontroll lisatakse koos nende peatükiga. |
| Ajad/puhvrid; AT-09/10/11/17 | Täpne CHECK, GiST kattumiskaitse, kohalikud minutid ja ajavööndi kontroll; senised konkurentsi- ja DST-testid läbivad. | Täielik tootmiskoormuskatse jääb AT-48 juurde. |
| Versioonid/ajalugu; AT-12/13/16/18 | Oodatud versioonid olemasolevates käskudes, ajaloolised hetktõmmised, muutmatu arve/pakett/makse ning teenuse arhiivi senised testid. | Hilisema API oodatud versioon ja audit tuleb ühendada vastava kirjutuskäsuga. |
| Outbox; AT-36/37/38 | Seotud broneeringu versioon, keele säilimine, kordustunnus ja katsete metaandmed. | SMTP saatja ja päris korduskatsete protsess on peatükk 17. |
| Import/eksport; AT-39/40 | Partii ja rea kordustunnus, veaaruanne, ühendvälisvõtmed, vaikimisi keelatud meeldetuletused ja ekspordi aegumine. | CSV lugemine, eelvaade, taustatöö ja allalaadimine on peatükk 18. |
| Arveldus; AT-41/42 | Sama tellimuse/perioodi unikaalsus, arve hetktõmmise ja laekumise parandamise piirangud. | Hinnad, maksud, numbrireeglid, õigustega maksekinnitus ja kasutusõigus on peatükk 19. |
| Säilitamine/lahkumine; AT-46 | Retentsiooni andmeliigid, kinnituse alus, üldise kustutamisõiguse puudumine, domeeniajalugu. | Tähtajad, anonüümimine ja koristus on peatükid 18/21. |

## Kontrollid

136 testi 16 failis. Peatüki 13 seitse PostgreSQL-i testi kontrollivad võltsitud kestust/puhvrit/valuutat/versiooni, vigast ajavööndit/graafikut, kõigi uute tenant-tabelite ja vaadete RLS-i, võõra faili/arve/impordirea sidumise keeldu, arveperioodi kordust, muutmatuid hetktõmmiseid, makse parandamise põhjendust, impordi kinnitust, ekspordi aegumist ning failivõtme teekonnapiirangut. Katsed töötavad tehingutes ja lõpetavad ROLLBACK-iga.

Enne piirangute lisamist leiti kohalikust andmebaasist null ajageomeetria või ajavööndi rikkumist. Migratsioonid 014–016 rakendusid. Tüübikontroll ja tootmisbuild läbisid. Peatükk 13 ei muuda kasutajaliidest; peatüki 12 sisutõlgete brauseritõendid on [CHAPTER-12.md](CHAPTER-12.md).

Tootmise migratsiooni ei tehtud. Kujundussuund on jätkuvalt omaniku korraldusel ootel. Täpseid arveldushindu, makse-/säilitustähtaegu ega õiguskäsitlust pole oletatud. Järgmine sisuline peatükk on 14: tarkvara arhitektuur ja komponendid.
