# Peatükk 15: broneerimismootor ja samaaegsus

## Tulemus ja tehingupiir

Saadavuse vaatamine ei reserveeri aega. Veebist loomine, käsitsi loomine ja muutmine kasutavad serveri pakkumisi ning kontrollivad uuesti ettevõtet, teenust, töötajat, hinda, kestust, graafikut, etteteatamist ja reeglite versiooni. Broneeringu hetkeseis, hõivamine, sündmus, teavitusülesanne ning korduspäringu tulemus salvestatakse sama PostgreSQL-i tehinguga. Vastus väljastatakse pärast COMMIT-i. Välja saadetud kirja olemasolu ei ole kinnituse eeltingimus.

V1 kasutab READ COMMITTED taset koos selgesõnaliste lukkudega. Üleminek SERIALIZABLE tasemele ei ole selle peatüki muudatus. GiST välistuspiirang kaitseb sama ettevõtte töötaja kõiki tühistamata hõivamisi, ka teenindatud/no-show kirjete järelpuhvrit. Hõivamine on `[algus – eelpuhver, lõpp + järelpuhver)`. Kõrvutised piirid on lubatud; andmebaas keelab kattumise ka rakendusest möödudes.

## Lukustusprotokoll

| Kirjutamistee | Järjekord ja mõju |
| --- | --- |
| Avalik loomine | Ettevõtte ja loomise võtmega advisory xact lock → ettevõte FOR SHARE → konkreetne töötaja FOR UPDATE → värske pakkumine → INSERT-id |
| Käsitsi loomine / broneeringukäsk | Ettevõtte ja käsuvõtmega advisory xact lock → ettevõte FOR UPDATE → värske liikmesus või kehtiv halduslink → olemasolev broneering FOR UPDATE → kontrollid ja kirjutused |
| Graafik, teenus, töötaja, reeglid | Ettevõte FOR UPDATE enne mõjutatud töötaja-/teenuseandmete muutmist; graafik kontrollib olemasolevaid hõivamisi |
| Kataloog/saadavus | Ettevõte FOR SHARE → sama tehingu lugemised; ei loo hõivamist |

Ettevõtte eksklusiivne lukk välistab sama ettevõtte avalikud kinnitused ja teised halduskirjutused. Seetõttu ei vaja halduse ümbertõstmine eraldi kahe töötaja lukku. Kui seda ettevõttelukku tulevikus kitsendatakse, tuleb kõik mõjutatud töötajad lukustada stabiilses ID järjekorras enne saadavuse lugemist. Mitme ettevõtte ühiskirjutusi praegune API ei paku. Andmebaasi hoolduskäsud ei tohi töötava teenuse ajal seda protokolli eirata.

Vana hõivamise asendamine toimub sama broneeringurea uuendusega. Uue aja konflikt veeretab tagasi ka ajaloo, versiooni ja outbox'i. Kliendile jääb vana aeg alles. Sulgemise ja kinnituse võistluses kas võidab kooskõlaline broneering või sulgemine; olemasolevat broneeringut mõjutav kinnitatud erand märgib tähelepanuvajaduse ega liiguta klienti ise.

## Korduspäringud ja tõrgetest taastumine

Loomise UUID-võti on ettevõttepõhises `booking_requests` tabelis; käsud kasutavad `booking_commands` tabelit ja lisaks toimingu teostaja identiteeti. Valideeritud sisust arvutatud räsi välistab sama võtme teise sisuga kasutamise. Muutmiskäsu liik ja versioon kuuluvad räsi sisse. Sama võtme sama sisu tagastab salvestatud tulemuse. Kui broneering on hiljem muutunud, lisatakse praegune versioon/seisund ning algset tulemust ei esitata vaikimisi uue hetkeolukorrana.

`withTenantRetry` teeb ainult loomise ja broneeringukäskude andmebaasitehingutele kuni kolm kogukatset. PostgreSQL-i `40001` ja `40P01` korral alustatakse kogu tehingut uuesti: kontekst, õigused, lukud, kellaaeg ja ärireeglid loetakse uuesti. Katsete vahel on lühike juhusliku lisaga paus. Kõrvalmõjud peavad olema samas andmebaasitehingus; seda abifunktsiooni ei tohi kasutada SMTP, failikirjutuse ega välise tõlke-API ümber.

Luku-/päringu timeout'e (`55P03`, `57014`) automaatselt ei korrata. Korduskatsete ammendumine annab HTTP 503 `RETRY_SAME_REQUEST`. Tundmatu ühenduse/COMMIT-i tulemus ei käivita serveris uut tehingut; klient säilitab sama võtme ja kontrollib tulemust korduspäringuga. ROLLBACK-i ebaõnnestumine ei varja algset viga ning katkine ühendus eemaldatakse puulist. Korduskatsed ei muuda 409 ärikonflikti automaatselt uueks klienditoiminguks.

Halduslingi aegumine kontrollitakse pärast ettevõtteluku saamist `clock_timestamp()` järgi. Tehingu algushetke `now()` ei kasutata siin, sest lukuootuse kestel võib ligipääs aeguda. [PostgreSQL-i ajafunktsioonid](https://www.postgresql.org/docs/17/functions-datetime.html) ja [terve tehingu kordamise juhis](https://www.postgresql.org/docs/16/mvcc-serialization-failure-handling.html) on valiku alused.

## API leping

Kõik vastused on `no-store`. Kirjutus nõuab JSON-i (kuni 8 KiB), õiget hosti/Origin-i ja UUID `Idempotency-Key` päist. Avalik host määrab ettevõtte; halduse tenantId ei anna õigust ilma värske liikmesuseta.

| Liides | Sisend ja vastus |
| --- | --- |
| GET `/api/catalog` | Ainult avalikud teenused/töötajad, ettevõtte tingimused ning rulesVersion; kliendikontakte ei väljastata |
| GET `/api/availability` | serviceId, kuupäev ja valikuline staffId; konkreetsed töötaja/hinna/kestusega pakkumised |
| POST `/api/bookings` | `bookingSchema` failis `bookings.ts`: teenus/töötaja/algus, expectedPrice/Duration/RulesVersion, nimi/e-post, valikuline telefon/keel; 201 BookingResult |
| GET/POST `/api/booking/manage` | Bearer-tunnus; GET seis või päeva pakkumised, POST `publicBookingCommandSchema`; 200 BookingResult |
| GET/POST `/api/admin/bookings` | Haldushost + sessioon; GET list/offers/history, POST `adminBookingCommandSchema`; käsitsi loomine, muutmine, tühistamine, seisund või link; 200 BookingResult |

Täpsed masinkontrollitavad väljad ja lubatud väärtused on `contracts.ts`, `booking-management-contracts.ts` ning route handler'ite Zod-skeemides. Raha on täisarv sentides, valuuta EUR; ajad on nihkega ISO-hetked, kalender tõlgendab neid ettevõtte IANA ajavööndis. BookingResult sisaldab ID-d, viitenumbrit, hetktõmmise välju, seisundit ja versiooni; lingi väljastamisel lisanduvad managementUrl/managementExpiresAt. See ei ole avalik kliendiregistri vastus.

Viga on `{error, code}`: 400 sisend, 401 autentimine, 403 õigus/tähtaeg, 404 tundmatu objekt, 410 halduslink, 409 `SLOT_UNAVAILABLE` / `OFFER_CHANGED` / `RULES_CHANGED` / `VERSION_CONFLICT` / `IDEMPOTENCY_CONFLICT`, 429 mahupiirang ja 503 korduskontroll. Toores SQL ega kontaktandmed ei lähe veateatesse. Võrguvea või 5xx korral jääb kliendile sama päringutunnus; aeg ei ole kinnitatud enne edukat serverivastust.

## Testitõendid ja piir

8. septembril 2026 läbis kogu testikomplekt: **146 testi / 18 faili**, kestus 35,39 sekundit. Tüübikontroll, arhitektuurikontroll (74 lähtekoodifaili) ja tootmise ehitus läbisid. Muudatused on kohalikud; tootmise paigaldust ei tehtud.

- Olemasolev 50 paralleelse kinnituse katse: üks broneering ja üks outbox-sündmus; sama võtmega võistlevad päringud tagastavad sama tulemuse.
- Päris PostgreSQL-i ummik kahe ühendusega: kaotav tehing kordub ning kumbki muudatus salvestub ühe korra.
- Kontrollitult tekitatud 40001/40P01 pärast broneeringu kirjutamist: tagasi veeretatud broneeringud, sündmused ja outbox ei dubleeru; kolmas katse salvestab ühe tulemuse.
- Korduskatsete ülempiir ja timeout'i/ärivea kordamata jätmine; tundmatu COMMIT koos nurjuva rollback'iga ei põhjusta uut käsku.
- Kaks ümbertõstmist ühte aega, käsitsi ja avalik loomine samasse aega, kaks haldajat samal versioonil, graafiku sulgemine koos kinnitusega.
- Päriselt luku taga ootav halduslink aegub enne luku vabanemist: käsk lükatakse tagasi, broneering/sündmused säilivad.

Need on kohaliku PostgreSQL-i korrektsus- ja piiratud konkurentsikatsed. Tootmise läbilaskevõime, p95/p99 latentsus ja pikaajaline mitme ettevõtte koormus vajavad peatüki 26 taristupõhist protokolli. SMTP saatmishetke versioonikontroll jääb peatükki 17. Järgmine peatükk on 16: ettevõtete eraldatus ja turvanõuded.
