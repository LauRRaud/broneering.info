# Esimese tehnilise katse kontroll 7. september 2026

## Kujunduse eemaldamise kontroll

Omaniku soovil eemaldati avalehe turunduskomponent, mõlemad CSS-failid, ikoon ning demo-, haldus-, vea- ja 404-vaadete kujundus. Alles on brauseri vaikimisi HTML-elemendid. Varasemad allpool kirjeldatud kujunduse ja mobiilimenüü kontrollid käivad eemaldatud versiooni kohta.

`npm test`: 16 testi läbitud. `npm run build`: edukas. Kohalikus brauseris läbiti kujunduseta voog: Meeste lõikus → töötaja pole oluline → 8. september 2026 → Kertu kell 09.00 → väljamõeldud nimi ja `.invalid` e-post → kinnitus `BR-7CF554EC7B18` (30 minutit, 25 €). Brauseri vealogi oli tühi. Ekraanipilt kinnitas brauseri vaikimisi välimust. Broneerimise serveriloogikat ega andmebaasiskeemi ei muudetud.

## Läbitud

- `npm run typecheck`: tüübikontroll läbitud.
- `npm test`: 12 testi läbitud päris PostgreSQL-i vastu.
- 50 konkureerivat sama töötaja sama aja kinnitust: üks õnnestunud broneering, üks teavitusülesanne.
- 12 sama võtmega samaaegset korduspäringut: üks broneering ja kõigile sama tulemus.
- Ettevõtete andmete eraldatus, konteksti puudumisel tühi privaatne päring, RLS-i kirjutamiskeeld vale ettevõttega.
- Võõra töötaja/teenuse valik, hinnamuutus, etteteatamine, puhvrid, pausid, graafikuerandid, tundmatu domeen ja reserveeritud `haldus` nimi.
- PostgreSQL ise lükkab tagasi kattuva hõivamise ka otse SQL-i kaudu.
- Europe/Tallinn kevadine olematu ja sügisene kahetähenduslik kellaaeg.
- `npm audit`: 0 teadaolevat haavatavust kontrolli hetkel; see ei asenda rakenduse turvaülevaatust.
- Linuxi `docker build -t broneering-info:pilot .`: edukas Next.js tootmisehitus.
- Ehitatud konteineri `/api/health` ja Ilutegu `/api/catalog` päringud töötasid; protsess käitus UID 1001-ga.

## Brauseris läbitud

Playwright CLI Chromiumiga kohalikus keskkonnas: Ilutegu teenuse valik → „Töötaja pole oluline” → sama algusajaga erineva hinnaga konkreetsed Mari/Kertu pakkumised → kliendi enda valitud pakkumine → nimi ja test-e-post → serveris salvestatud kinnitus. Ekraan näitas 35,00 € ning andmebaasile saadeti 3500 senti. ICS-fail laaditi alla ja selle algus/lõpp vastasid valitud ajale.

Kontrollitud 1280-pikslist broneerimisvaadet, 390 × 844 mobiili kinnitusvaadet, 1440-pikslist avalehte ja mobiilset avalehte. Mobiilimenüü avanes, „Logi sisse” teade avanes native dialog’is ning Escape sulges selle. Ekraanipildid on kohalikus ignoreeritud `output/playwright/` kaustas.

## Kontrollimata või veel teostamata

Automaatne juurutus, uute ettevõtete wildcard-HTTPS, Safari/Firefox maatriks, ekraanilugeja põhjalik kontroll, kadunud kinnituse järel lehe taasavamise taastamine, pikaajaline koormus, kuritarvituskaitse mitme protsessi vahel, varukoopia taastamine, halduse õigused/MFA, SMTP ja arveldus. Ülaltoodud testid katavad osa lähteplaani AT-nõuetest, mitte kõiki 48 testi ega kogu nimetatud nõude võimalikku ulatust.

## VPS-i avaldamise kontroll samal päeval

Ubuntu 24.04.4 LTS serveris ehitati GitHubi commit `4c5cd0d` Dockeriga, käivitati migratsioon ja loodi kaks demoettevõtet. Rakendus ja andmebaas käivad eraldi konteinerites. Nginxi uus projektipõhine konfiguratsioon läbis `nginx -t`; olemasolevad hoiatusteated olid olemas juba enne muudatust.

HTTPS GET tagastas 200 aadressidel broneering.info, www.broneering.info, haldus.broneering.info, demo.broneering.info ja demo2.broneering.info. Let’s Encrypti sertifikaat väljastati kõigile viiele hostile, `certbot.timer` on aktiivne ning uuenduse Nginxi laadimishaak on paigaldatud. Serveri `.env.server` õigused on 600 ja fail ei kuulu Giti. Serveri GitHubi võti on ainult selle repo lugemisõigusega. Kõigi uute ettevõtete automaatne HTTPS ei ole selle viie domeeni kontrolliga tõendatud.

Avalikus demos läbiti Chromiumiga broneerimine: Meeste lõikus, Mari, 7. september 2026 kell 17.15, 30 minutit, 25 €. Server tagastas kinnituse `BR-4AF211021676`. Kasutati väljamõeldud nime ja `.invalid` e-posti. Brauseri konsoolis oli 0 viga ja 0 hoiatust. Tegemist oli demoandmebaasi proovibroneeringuga, mitte salongi päris ajaga.

## Peatükk 05 — 07.09.2026
46 rakenduse testi ja eraldi 1 tegeliku vidinaskripti test läbisid; 3 Pythoni testi ning kohalik ja VPS-i tootmisbuild läbisid. Brauseri CSP, iframe/modaal, Escape/fookus ning päris alamdomeeni sertifikaadi väljastamine, uuendamise proov ja sulgemine on kirjeldatud [CHAPTER-05](CHAPTER-05.md). Laiem brauserimaatriks jääb avatuks.

## Peatükk 06 — 07.09.2026
Kõik 59 rakenduse testi, tüübikontroll ja kohalik tootmisbuild läbisid. Kaksteist uut testi katavad hinnakirja õigusi, pärimist, erisusi, ajaloo säilitamist, versioone, broneeringu samaaegsust, hierarhiat ja RLS-i. Brauseris läbiti ajutise MFA omaniku grupi/alamgrupi, teenuse, töötaja ja seose loomine ning kontrolliti avalikku hinda ja profiili. Testandmed eemaldati. Serveri commit f51fd68, migratsioonid 005/006 ja HTTPS kontrollid on [CHAPTER-06](CHAPTER-06.md).

## Peatükk 07 — 07.09.2026
Kõik 74 rakenduse testi ning kohalik ja serveri tootmisbuild läbisid. Uued kontrollid katavad nädalagraafikuid, erandeid, õigusi, versioone, olemasolevate broneeringute konflikte, samaaegset kinnitamist ning reeglite ja tühistamistähtaja hetkeseisu. Kohalikus MFA omaniku ja kliendi brauserivoos kontrolliti graafiku muutmist, reeglimuutuse järel uuesti valimist koos kontaktandmete säilimisega, broneeringu kinnitamist ning puhkuse konflikti ja edukat sulgemist. Ajutised testandmed eemaldati. Serveris avaldati commit 1751646 ja migratsioon 007 pärast varukoopiat; välised tervise-, kataloogi-, saadavuse- ja autentimata halduse HTTPS kontrollid läbisid. Täpne tõendus ja piirid on [CHAPTER-07](CHAPTER-07.md).

## Peatükk 08 — 08.09.2026

Koodi väljalase `5cad56e`: 77 testi läbivad, kohalik ja serveri tootmisbuild läbivad. Töötaja isiklik kataloog filtreerib teenused ning töötajapõhise hinna/kestuse; järgmise päeva otsing on 31 päeva kaupa jätkatav ja broneerimisakna piires. PostgreSQL-i kolm uut testi katavad eraldatust, suletud töötajat, erandpäeva ja otsingupiire.

Brauseris kontrolliti isiklikku linki, töötaja muutmist, ühe töötaja sammu vahelejätmist, tühjalt päevalt järgmise vaba päeva leidmist, kontaktide säilimist, töötaja sulgemist enne kinnitust ning ICS-i. Katkestatud serverivastuse korduskatse järel jäi täpselt üks broneering ja üks outbox-sündmus. 390 px vaates kontrolliti ülevoolu puudumist ja kokkuvõtte järel oleva nupu kaudu kinnitamist. Testandmed eemaldati kohalikust baasist.

Serveri avalik HTTPS: health=ok; isiklik leht 200, õige töötajapiirang ja järgmise vaba päeva vastus; anonüümne haldus ei väljasta kasutajat. Täpne ulatus ning halduslingi ja kasutatavuse sõltuvused on [CHAPTER-08.md](CHAPTER-08.md). Peatükk ei ole tervikuna vastu võetud.

## Peatükk 09 — 08.09.2026

Väljalase `f886a7c`: 81 rakenduse testi ning kohalik ja serveri tootmisbuild läbivad. Neli uut PostgreSQL-i testi katavad koondsaadavuse täpset ühendit, võrdseid ja erinevaid pakkumisi, hõivatud või muutunud pakkumise automaatse asendamise keeldu ning teenusesobivuse eristamist ajapuudusest.

Kohalikus brauseris kontrolliti automaatse aja puudumist, sama kellaaja erinevaid pakkumisi, päeva/töötaja/teenuse vahetuse sõltuvusi ja kontaktide säilimist, konkureerivat broneeringut ning vana saadavusvastuse hilinemist. Katseettevõte eemaldati. Avaliku demo HTTPS-kontrollis kattusid 56 koondpakkumist kahe töötaja üksikpakkumistega; brauseris kuvati uus selgitus ja automaatset ajavalikut ei tehtud. Tootmisse testbroneeringuid ei lisatud. Tõendi piirid ja O-06 avatud otsus: [CHAPTER-09.md](CHAPTER-09.md).

## Peatükk 10 — 08.09.2026

104 testi 12 failis, tüübikontroll ja kohalik tootmisbuild läbivad. Lisatud on 17 PostgreSQL/kalendri ning 6 HTTP testi: omaniku lingipoliitika, tokenite kaitse, GET-i kõrvaltoimete puudumine, vana aja säilimine, versioonikonfliktid, korduskindel tühistamine, tähtaja põhjendatud erand, töötajapiirang ja ligipääsu sulgemine, e-postita käsitsi broneering, seisundid/ajalugu, puudumine/arhiveerimine ning puhvrikaitse ka pärast teenindatuks märkimist.

Ajutise MFA omaniku ja kliendi Chromiumi voos kontrolliti 12-tunnise poliitika seadistamist, käsitsi e-postita broneeringut, katkenud vastust ja sama UUID-ga kordust, hinnamuutuse uut kinnitamist, muutmise kordust pärast lehe taaslaadimist, puudumise konflikti/eraldikinnitust, vananenud haldaja vormi ning lahendamist ootava loendi tühjenemist pärast kinnitatud ümbertõstmist. Katkestatud tühistamise ja vahepealse 429 järel säilis sama tunnus. Andmebaasis oli lõpuks üks broneering, viis sisulist ajaloosündmust ja neli edukat käsku; duplikaate ei tekkinud. Fragmente vahetades ei lekkinud vana vaate andmed uue tunnuse alla. Aegunud lingi 390 px vaade näitas kontakti ilma horisontaalse ülevooluta. Kohalikud katseandmed eemaldati.

Teavituste tegelik saatmine, täismaatriks ja ASVS-i tervikvastuvõtt jäävad hilisemate peatükkide tööks. Nõuete seosed, migratsioonid ning korduspäringu/lingi säilitamise piirid: [CHAPTER-10](CHAPTER-10.md).

Serverisse avaldati `6cb9516`: tootmisbuild läbis ning migratsioonid 008/009 rakendusid pärast õigustega 600 varukoopiat `before-chapter10.dump`. HTTPS-kontrollid läbisid: health=ok, kataloog neli teenust, saadavus/halduslingi HTML 200, vigane link 410, toimingut sisaldav GET 400, autentimata haldus 401 ja vale haldushost 404. No-store/noindex/no-referrer ning raamistamise keeld kontrollitud. Tootmisele testbroneeringuid ega omaniku poliitika väärtusi ei lisatud.


## Peatükk 11 — 08.09.2026, kohalik tööpuu

113 testi 13 failis, tüübikontroll ja tootmisbuild läbivad. Lisandusid seitse PostgreSQL/kalendri/kliendi ning kaks HTTP-testi: töötajapiirang, graafiku ühisosa/puudumine, suveaja nädal, arhiveeritud töötaja ajalugu, mõõdikute ulatus, kliendiregistri RLS/rollid/eksport, samaaegne auditeeritud parandus, kontaktandmete ajaloo säilimine, kontaktita kliendid, otsing ja CSV-valemikaitse ning teavitusjärjekorra seisund.

Chromiumis kontrolliti päeva/nädala vahetust, filtrite säilimist, 390 px nimekirja, võrgu katkestust/taastumist ning põhjenduse säilimist teise haldaja ajamuudatuse ajal. Uus versioon ilmus 6-sekundilises kontrollaknas koos eraldi avamise nupuga. Kliendikaardi parandus, enne/pärast audit ja CSV allalaadimine läbisid. Kohaliku arendusserveri vananenud moodul kõrvaldati taaskäivitusega ja lõppvaade kontrolliti uuesti. Katseandmed eemaldati.

Migratsioonid 010/011 on rakendatud ainult kohalikult; tootmise paigaldust ei tehtud. Täpne nõuete register, piirid ja tõendid on [CHAPTER-11.md](CHAPTER-11.md). Täielik brauseri/ekraanilugeja maatriks ning koormuskatse jäävad avatuks.


## Peatükk 12 — 08.09.2026, kohalik tööpuu

119 testi 14 failis, tüübikontroll ja tootmisbuild läbisid. Kataloogide terviklikkus, kohatäited, keeleprioriteet, kontaktiväljade vead, keelesätete õigused/ettevõttepiir, teavituskeele säilimine ja vana korduspäring on testitud. Chromiumis kontrolliti inglise/vene keelt, andmete säilimist keelevahetusel, vigase välja fookust, 390 px avalikku/halduse vaadet ning modaali Escape-i/fookuse taastamist ja sammu säilimist. Migratsioon 012 rakendati kohalikult. Täpsed piirid (sh ekraanilugeja, brauserimaatriks, ootel kujundus ja peatüki 17 e-kirjad): [CHAPTER-12](CHAPTER-12.md). Tootmisse ei paigaldatud.

Peatüki 12 jätkutäiendus: teenuste nimede/kirjelduste tõlkemustandid, kinnitamine, vananemine ja ajalugu. 129 testi 15 failis ning tootmisbuild läbisid; avalik kinnitatud tõlge ja konfliktis vormi säilimine on Chromiumis kontrollitud. Migratsioon 013 kohalikult rakendatud. Automaattõlke päris API-katse eeldab veel serverivõtit ja mudeli seadistamist; ühenduse vead/leping on testitud makettidega.


## Peatükk 13 — 08.09.2026, kohalik tööpuu

136 testi 16 failis läbivad. Seitse uut PostgreSQL-i testi katavad aja/puhvri/valuuta/versiooni invariandid, graafiku ja ajavööndi, uute tabelite/vaadete RLS-i, võõra faili/arve/impordirea sidumise, arveperioodi korduse, muutmatud hetktõmmised, põhjendusega makse paranduse, impordi kinnituse ja ekspordi aegumise. Migratsioonid 014–016 on rakendatud kohalikult. `npm run db:schema` dokumenteerib 43 tabelit/vaadet ilma andmeridu lugemata. Nõuete vastendus ja hilisemate peatükkide piirid: [CHAPTER-13](CHAPTER-13.md).

Peatüki 13 lõppkontroll: tüübikontroll ja tootmisbuild läbisid.

## Peatükk 14 — 8. september 2026

Moodulite impordigraafi kontroll: 74 faili; vaikimisi serverimoodulid, kaudsed impordid ja pöördsõltuvused. Kolm arhitektuuritesti sisaldavad teadlikult vigase graafi katset. Kogu komplekt: 139 testi / 17 faili läbisid (27,77 s). Typecheck, build koos architecture:check kontrolliga ja diff --check läbisid. Litsentsiregister uuendati 194 kirjele. Tootmisesse paigaldamist ega SMTP/failitöötaja vastuvõttu see ei tõenda.

## Peatükk 15 — 8. september 2026

146 testi / 18 faili läbisid (35,39 s), tüübikontroll ja build koos 74 faili arhitektuurikontrolliga läbisid. Uued katsed: päris PostgreSQL-i ummik ja kogu kaotava tehingu kordamine; kontrollitud 40001/40P01 pärast broneeringu kirjutamist ilma duplikaatsete kõrvalkirjeteta; kolme katse ülempiir; timeout'ide ja tundmatu COMMIT-i kordamata jätmine; katkise ühenduse eemaldamine; kaks ümbertõstmist ühte aega; käsitsi/avaliku kinnituse võistlus; luku taga aegunud halduslink. Kohalikud korrektsuskatsed ei määra tootmise läbilaskevõimet. VPS-i paigaldust ei tehtud.

## Peatükid 16–17 — 8. september 2026

Peatüki 16 järel 151 testi, tüübikontroll ja ehitus läbisid. Kaks sõltumatut PostgreSQL-i ühenduspuuli jagasid 40 päringu peale täpselt kümmet lubatud katset; RLS/grandid, rikke korral keeldumine, Origin ja ohutud koondlogid testitud. npm audit --omit=dev: 0 teadaolevat haavatavust. Migratsioon 017 rakendatud.

Peatüki 17 lõppkontroll: 161 testi / 20 faili (34,95 s), tüübikontroll ja hoiatuseta build läbisid. Migratsioon 018; skeemiraportis 45 tabelit/vaadet. Worker-image Linuxis ehitatud ja moodulid laetud uid 1000 all. Proovikiri salvestati privaatselt, päris SMTP-võrgukirju ei saadetud. Ettevõtte/versiooni/saaja/saatmisrežiimi kontrollid, katse-/rendi-/veatöövood ja meeldetuletused testitud. Brauseris et/en, seadete salvestus ja 390 px vaade, taustavärskenduse ajal mustandi säilimine ning versioonikonflikti keeld kontrollitud. Prooviandmed ja sessioon kustutatud. Päris SMTP, DNS/maine, DSN-postkasti automaatika ning tootmise paigaldus ei ole nende katsete tulemus.
