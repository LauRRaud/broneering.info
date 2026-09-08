# Peatükk 22 — taristu, käitamine ja taastamine

Kohalik teostus on kontrollitud 08.09.2026. Tootmise varundust ega seireteenust ei ole aktiveeritud. Omanik kinnitas, et eraldi varukoopia asukohta veel pole. Peatükki 23 ei ole alustatud.

## Omaniku otsus: tootmise varundus hiljem (08.09.2026)

Omanik otsustas jätta välise varunduskoha ja tootmise varunduse seadistamise hilisemaks. Arutatud lahendus on teine VPS varukoopiate ja võimaliku välise seire jaoks; teenusepakkujat ega serverit pole veel valitud või tellitud.

Hilisemad tööd:

- Valida eraldi varundus-VPS või muu põhiserverist sõltumatu hoiukoht.
- Seadistada andmebaasi/WAL-i, privaatfailide, eemaldamisregistri ja vajaliku konfiguratsiooni kaitstud koopiad ning võtmete sõltumatu hoidmine.
- Määrata hoiatuste vastutaja, asendaja ja teavituskanal ning katsetada hoiatuse kättesaamist.
- Teha välisest koopiast taastamisharjutus ja mõõta tegelik RPO/RTO enne tootmise vastuvõttu.

Need tööd jäävad avatuks; praegune otsus ei käivita serveri tellimist ega tootmise seadistamist.

## Teostus

- `/api/health` näitab protsessi elusolekut. `/api/ready` kontrollib kuni viie sekundi jooksul andmebaasi ühendust, rakenduserolli piiranguid ja kõigi pildis olevate migratsioonide rakendamist. Vastus on ainult `ready`/`unavailable`, HTTP 200/503, ilma ühenduse detailideta. Migratsioon 047 lubab rakendusel lugeda migratsioonide nimesid.
- Kõik neli taustatööd kirjutavad atomaarse südamelöögi pärast töötsüklit. Puuduv, vigane, tulevikuline, üle viie minuti vana või ebaõnnestunud tsükli kirje ei läbi tervisekontrolli. Järgmine edukas tsükkel taastab tervise; pikemalt ootel ülesandeid jälgib eraldi järjekorrakontroll. Docker Compose kontrollib veebi ja töötajaid. Docker ise ei taaskäivita pelgalt `unhealthy` konteinerit: hooldaja peab põhjuse lahendama.
- Valikuline `compose.backup.yaml` kasutab pgBackRestiga PostgreSQL 18 pilti, sünkroonset WAL-i arhiveerimist, 300 sekundi arhiivitaimerit ja krüptitud varundushoidlat. Näidissäilitus on kaks täis- ja seitse diferentsiaalkoopiat; tootmise poliitika vajab kinnitamist. Arhiveerimise nurjumisel võib WAL täita andmebaasi ketta, seetõttu kuuluvad arhiivi- ja kettakontroll samasse protseduuri.
- Privaatfailid krüptitakse AES-256-GCM-iga, igal failil on eraldi nonce, autentimissilt, suurus ja SHA-256. Ka manifest ja eemaldamisregister on krüptitud. Keskkonna UUID välistab teise keskkonna manifesti kasutamise. Faili muutumine kopeerimise ajal, vigane silt, puuduv fail või vale räsi peatab käsu. Failide kirjutused sünkroonitakse enne avaldamist; hoidla enda kestvus ja teise serveri koopia tuleb eraldi tagada.
- Hilisem eemaldamisregister eksporditakse sõltumatult vanemast failikoopiast. Taastamise käsk nõuab operaatori antud minimaalset registri aega, võrreldavat keskkonda, täieliku registri lugemiseks privilegeeritud ühendust, selgesõnalist isolatsiooni ja nimega `recovery_<32 väiketähelist hex-märki>` andmebaasi.
- Eemaldamised rakendatakse UUID-dega ja ettevõtte piires uuesti. Teised kontaktid ja arvelduskirjed säilivad. Sessioonid tühistatakse, eemaldatud kontaktide halduslingid ja saatmata teavitused suletakse. Kõik vanad ekspordid tühistatakse, impordi lähteandmed puhastatakse ning taastatud impordi-/ekspordifailid ja orvud eemaldatakse uuest privaatsest kaustast. Arvelduskirjete säilitamiskohustus jääb peatüki 21 piiriks.

## Käsud ja taastamise juhend

Kõik teed ja identifikaatorid tuleb seadistada operaatori kaitstud keskkonnafailis; seda faili ei lisata Git-i ega Docker build-konteksti. Vajalikud on Node 24 koos lukustatud sõltuvustega ning Docker; seire jaoks Python 3. Tootmise, katse ja arenduse projektinimed, võrgud, mahud, andmebaasid ning võtmed peavad olema erinevad.

### PostgreSQL

1. Ehita `docker build -t broneering-backup:chapter22 infra/backup`. Paigaldamisel kasuta testitud pilti digestiga. Kohaliku katse pgBackRest oli **2.59.1**, PostgreSQL **18.6**; paketi versioon ja PostgreSQL alusdigest on Dockerfile'is lukustatud. Transitiivsete OS-pakettide täpse kordamise alus on säilitatud lõplik pildidigest.
2. Loo eraldi kaitstud hoidla ja mount; määra `BACKUP_REPOSITORY`, `BACKUP_CONFIG_FILE`, `BACKUP_DATABASE_IMAGE`. Kopeeri `infra/backup/pgbackrest.conf.example` kaitstud konfiguratsiooniks ja lisa tugev `repo1-cipher-pass`. Fail peab olema loetav konteineri postgres-kasutajale, teistele keelatud. Võtme sõltumatu turvaline koopia on taastamise eeltingimus.
3. Kavandatud hooldusaknas käivita projekt koos `-f compose.server.yaml -f compose.backup.yaml`; olemasoleva andmeketta säilitamine ja DB sama põhiversioon kontrollitakse enne restarti. Ära kasuta `down -v`.
4. Käivita samade Compose faili- ja projektiparameetritega `exec -T --user postgres db pgbackrest --stanza=booking stanza-create`, seejärel `check` ja `--type=full backup`. Enne ajastamist peab esimene täiskoopia õnnestuma.
5. `infra/backup/run.sh full|diff|check` on ajastatav käsk. Näidisunitid teevad pühapäeval täis-, teistel päevadel diferentsiaalkoopia ning iga viie minuti järel WAL-i kontrolli. pgBackResti lukk välistab sama hoidla kattuvad varundused; nurjunud ajastusi tuleb jälgida.
6. Taasta uude tühja mahtu, eraldi Docker võrgus, avaldamata porte. Hoidla mount olgu taastamisel võimalusel kirjutuskaitstud. `restore-empty` nõuab `RECOVERY_ISOLATED=1` ning keeldub mittetühjast PGDATA-st; käivita postgres-kasutajana. Taastatud serveril jäta arhiveerimine välja, et see ei kirjutaks lähtekeskkonna arhiivi. Taastepunkt ja vajalik WAL valitakse intsidendi järgi; puuduva WAL-iga ei kuulutata taastamist õnnestunuks.
7. Enne allolevat rakenduse lepitust nimeta taastatud `booking` andmebaas ümber `recovery_<uuid ilma sidekriipsudeta>` kujule, ühendudes hooldusandmebaasi. Rakenda vajalikud migratsioonid ainult isoleeritud koopiale. Ära ühenda avalikku veebi, töötajaid, SMTP-d ega makseteenuse pärisühendusi.

### Failid ja kustutamisregister

Kaitstud seadistus sisaldab `RECOVERY_KEY_FILE` (64 hex-märgiga juhuslik 32-baidine võti), `RECOVERY_ENVIRONMENT_ID` (lähtekeskkonna püsiv UUID), `RECOVERY_ARTIFACT_DIR` (uus, veel puuduv kaust), `MIGRATION_DATABASE_URL` ja `PRIVATE_STORAGE_DIR`. Võti ja keskkonna identifikaator tuleb hoida koos taastamiseks vajalike andmetega sõltumatus kaitstud asukohas. Võtmeid ei kirjutata käsureale ega logisse.

- Failikoopia: peata kirjutused, eksporditöö ja failide koristus; sea `BACKUP_WRITES_STOPPED=1` ning käivita `node --import tsx scripts/operations/recovery.ts backup`. Käsk kontrollib kõigi kehtivate `ready` meediakirjete suurust ja räsi. Nurjunud käsu artefakti ei tohi lugeda vastuvõetud varukoopiaks. Koordineeri failikoopia ja DB taastamispunkt samasse hooldusaknasse; suvalise uuema DB ja vanema failikoopia seosed võivad puududa ning taastamiskontroll peab siis ebaõnnestuma. Praegune failikoopia nõuab hooldusakent, automaatne online-failisnapshot pole teostatud.
- Värske register: `node --import tsx scripts/operations/recovery.ts ledger` loob ainult eemaldamisregistri uude kausta ega nõua kirjutuste peatamist. `booking-ledger` näidisunit ja `ledger.sh` ekspordivad iga viie minuti järel ning avaldavad eduka artefakti `latest` sümbollingina Linuxis. Määra `RECOVERY_LEDGER_ROOT` eraldi kaitstud asukohta. Vanade registrite säilitamine/koristus toimub kinnitatud poliitika järgi; skript neid ei kustuta.
- Taastamine: määra `RECOVERY_DATABASE_URL`, `RECOVERY_ISOLATED=1`, `RECOVERY_PRIVATE_DIR` (absoluutne, veel puuduv privaatkaust), vanema failikoopia `RECOVERY_ARTIFACT_DIR`, värske `RECOVERY_LATEST_LEDGER_DIR` ja `RECOVERY_LEDGER_NOT_BEFORE` (intsidendi järgi nõutav ISO-aeg). Käivita `node --import tsx scripts/operations/recovery.ts recover`.
- Käsk valideerib mõlemad manifestid enne DB muudatusi, kontrollib DB failiseoseid, taastab ja kontrollib failid, lepib eemaldamisregistri ning puhastab vanad allikakoopiad. Vea korral jääb keskkond isoleerituks; käsku ei tohi käsitsi poole pealt avaliku keskkonna suunas jätkata. Alusta uuest taastekoopiast või uuri osalise taastamise seisu. Käsu edukus ei ava liiklust automaatselt.
- Registri nõutava värskuse määrab intsidendi juht lähtekeskkonna viimase kinnitatud seisundi järgi. Kui hiljem tehtud eemaldamiste täielikkust ei saa tõendada, ei ole avalikuks avamiseks luba. Vanad krüptitud varukoopiad võivad sisaldada eemaldatud kontakte kuni kinnitatud säilitusaja lõpuni; ligipääs on operaatoripiiranguga.

Konfiguratsioon (privaatne pgBackResti fail, keskkonnafailid, võtmed, DNS/pöördproksi seadistus, release'i pildidigestid) tuleb säilitada eraldi krüptitud saladustehoidlas ning taastamiskatses kontrollida. Praegune failikäsk varundab rakenduse privaatfailide vormingut, mitte suvalisi serverikonfiguratsioone. Saladustehoidla ja eraldi serveri koopia puuduvad praegu; kohalik fail ei kaitse serveri kaotsimineku eest.

## Seire ja reageerimine

`python3 infra/operations/check.py /etc/booking/monitor.json` väljastab JSON-i ja väljumiskoodi 0 või 1. Näidisseadistus on `infra/operations/config.example.json`. Kontrollid: HTTP valmisolek, nelja töötaja Docker health, pgBackResti edukus ja koopia vanus (25 tundi), WAL-i viimane edu ning sellest uuem viga, üle 15 minuti viibivad teavitus-/ekspordi-/arvemaili järjekorrad, kettal vähemalt 5 GiB ja 10% vaba ruumi, TLS-i usaldusahel/nimi ja üle 14 päeva kehtivust, eemaldamisregistri faili vanus kuni 15 minutit. Registri seire mõõdab faili aega; autentimine ja sisu täielikkus kontrollitakse taastamisel. Valed või puuduvad seadistused annavad vea, mitte rohelist tulemust.

Unitid `infra/operations/booking-monitor.*` kontrollivad iga minuti järel. Paigalda näidisunitid `/etc/systemd/system`, loo õigustega 0600 `/etc/booking/operations.env` ning tegelik monitori JSON, kontrolli käsitsi, seejärel `systemctl daemon-reload` ja luba soovitud taimerid. Keskkonnafailis on Compose'i nõutud muutujad, `BOOKING_ROOT` ja `BOOKING_PROJECT`. Registri eraldi `/etc/booking/recovery.env` sisaldab eelneva jaotise muutujaid. Need näidised pole kasutaja arvutisse ega tootmisesse paigaldatud.

| Signaal | Esmane tegevus |
| --- | --- |
| readiness / worker | Kontrolli migratsioone, DB ühendust ja redigeeritud teenuseloge; taaskäivita alles põhjuse tuvastamisel |
| queues | Kontrolli transporti, teenuse seadistust ja välist sõltuvust; arvesta väljalülitatud saatmisega, ära kustuta järjekorda |
| backup / WAL / ledger | Taasta hoidla ligipääs ja vaba ruum; tee edukas kontroll/koopia; puuduva registri korral blokeeri taastatud keskkonna avaldamine |
| disk | Piira uusi mahukaid töid, rakenda kinnitatud säilituspoliitikat; WAL-i ega andmeketta faile ei kustutata käsitsi |
| certificate | Paranda sertifikaadi uuendamine ning kontrolli uuesti tegelikku HTTPS vastust |

Hoiatuse vastutaja, asendaja, kanal, toeajad ja kinnitamise aeg tuleb määrata enne tootmist. Seosta teenuse `OnFailure` kokkulepitud saatmisüksusega ja testi sünteetiline rike koos kättesaamise kinnitusega. Praegu väljund on ainult JSON/journal; kellelegi teadet ei saadeta.

Pöördproksi ligipääsulogides tuleb enne avaldamist sisse lülitada koondseire `/api/availability` ja `/api/bookings` 5xx vastustele ning embed-laadimise vigadele. Lävendid ja tegelik logiedastaja pole selles kohalikus keskkonnas seadistatud. Ära logi URL päringuosa, haldustokeneid, päringukehi ega kontaktandmeid. Kohalik seirekäsk ei tõenda veel väljast mõõdetud broneerimise edukust, maksepartneri saadavust ega SLA-d.

## Uuendamine ja tagasipööre

1. Salvesta vana ja uue väljalaske pildidigestid, migratsioonide loend ja taastamiskomplekti viited. Käivita automaattestid, arhitektuuri kontroll ja tootmise build.
2. Katseta uue väljalaske migratsioone isoleeritud taastatud testandmetega; kontrolli kahe ettevõtte eraldatust, saadavust, broneerimise loomist/muutmist/tühistamist ja failiseoseid. Pärisandmete testkasutus nõuab eraldi alust või anonüümimist.
3. Tee hooldusaknas kinnitatud DB-/failikoopia, säilita värske eemaldamisregister, peata vajadusel kirjutused ja töötajad. Käivita migratsioon enne uut rakendust. Kontrolli readiness'i ning käivita töötajad alles sobiva skeemi ja seadistusega.
4. Ava esmalt kokkulepitud pilootettevõtted, kontrolli signaale ja funktsioonilippe, seejärel ülejäänud kliendid. Pilootide nimekirja ja vastu võetud tootmiskatseid praegu pole.
5. Kui skeem jääb vana rakendusega ühilduvaks, taasta eelmine testitud pilt. Destruktiivse/ühildumatu migratsiooni järel ei käivitata pimesi vana rakendust ega automaatset down-migratsiooni: peata kirjutused, vali parandav migratsioon või isoleeritud taastamine, lepita hilisemad eemaldamised ja hinda pärast taastepunkti toimunud tehinguid. Andmekao aktsepteerimise otsus kuulub intsidendi vastutajale.
6. Avalikuks avamisel peavad olema taastamiskäsu edukas tulemus, broneeringute ja säilivate failide sisuline vastuvõtt, andmebaasi terviklikkus, õiged domeenid ja saladused, värske register, SMTP/maksete välise seisundi lepitus ning hooldaja otsus. Alles seejärel muuda DB nimi/ühendus tootmiseks ja ava võrk. Isolatsiooni kinnitav keskkonnamuutuja üksi ei asenda võrgu- ja teenusepiiranguid.

## Kontrollitõendid

- `npm test`: **38 testifaili, 250 testi läbis**. Lisaks uuendatud taastamis-CLI katse: vale keskkond ei muuda kontakti, õige värske register eemaldab vana kontakti ja taastatud privaatse orvu; korduv eemaldamislepitus säilitab teise kontakti.
- `npm run typecheck` läbis; `npm run db:schema` dokumenteeris 56 tabelit/vaadet ja 47 migratsiooni.
- Docker `runner` build koos tootmise Next.js build'i ja arhitektuurikontrolliga läbis. Tegelikust runner-konteinerist vastu kohaliku DB rakenduserolli päring `/api/ready` → **200 ready**; eraldi võrgu ja DB-seadistuseta runner → **503 unavailable**.
- Serveri ja backup-overlay Compose'i valideerimine koos nelja töötaja profiiliga läbis sünteetiliste seadistusväärtustega, teenuseid käivitamata.
- `python infra/backup/prove_recovery.py`: **4,17 s varundus, 4,55 s taastamine**, kaks sünteetilist rida, sh pärast täiskoopiat WAL-ist taastatud kirje; puuduv arhiivifail ja mittetühi taastamissiht lükati tagasi. Katse oli `--network none`, avaldamata portidega ning puhastas oma märgistatud konteinerid/mahud. Tulemus: `output/operations/chapter22-proof-c9e8160125c1/result.json` .
- Kaks eraldi restore-empty kaitsetesti ja seire varukoopia vanuse/vea ühiktest läbisid. Rikutud faili, vale võtme ja vale keskkonna krüptokatsetused läbivad tegelikke kohalikke faile.

Need ajad kirjeldavad kahe reaga kohalikku katset. **RPO 15 minutit ja RTO 4 tundi jäävad sihtideks.** Tootmise vastuvõtuks on veel vaja eraldi kaitstud varunduskohta, saladustehoidlat, kinnitatud säilitust, nimetatud hooldajat/asendajat, testitud hoiatuskanalit, välise liikluse veaseiret ning päris mahu ja failidega asendustaristu taastamisharjutust. Protsentuaalset SLA-d ei ole lubatud.
