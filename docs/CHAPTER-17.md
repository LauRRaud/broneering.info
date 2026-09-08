# Peatükk 17: e-kirjad ja oma saatmislahendus

## Teostatud töövoog

Broneeringu loomise, aja/töötaja muutmise ja tühistamise kliendikirjad on versioonitud outbox'is. Omanik saab halduses määrata ettevõtte koopiate aadressi ja meeldetuletuse minutites. Tühi aadress ei saada ettevõttekoopiaid; tühi ajastus ei loo meeldetuletusi. Käsitsi broneerimisel saab kliendikirjad välja lülitada. E-postita kirjele ei leiutata aadressi. Demo päris SMTP-saatmine on keelatud; kohalik capture on eraldi proovirežiim.

Halduses kuvatakse töö liik/saaja ulatus, järjekorra seisund, katsed ja järgmine katse, SMTP-le edastamise aeg ning kättesaadav kohaletoimetamise tagasiside. Omanik saab põhjendusega lubada nurjunud töö uue katseseeria ning märkida vaadeldud tagasipõrke/kohaletoimetamise. Kõik toimingud kontrollivad MFA-ga omanikku, ettevõtet ja versiooni ning kirjutavad auditi. Võõras ettevõte ei näe töid ega katseajalugu. API ei väljasta sõnumi sisu, halduslinki, krüpteeritud tunnust ega SMTP saladusi.

Kirjad on tekstivormis, et/en/ru kataloogidega, broneeringu hetktõmmise ning ettevõtte IANA ajavööndiga. Kliendikirja halduslink kasutab olemasolevat kehtivat tunnust ega tühista veebikinnitusel saadud linki. Saatmiseks vajalik tunnuse koopia on kontekstiga seotud AES-GCM ümbrikus; avalikud päringud seda välja ei loe. Vanad kirjed, millel krüpteeritud koopiat ei ole, säilitavad kontaktandmetega kokkuvõtte. Ettevõttekoopia ei sisalda kliendi Bearer-ligipääsu. From on omaniku SMTP_FROM, Reply-To ettevõtte avalik aadress.

## Järjekorra protokoll

1. Broneeringu tehing loob outbox-kirje koos booking_version ja keelega. Ettevõttekoopia on eraldi kind/recipient_kind. Tulevane reminder tekib ainult seadistatud ajastusega; juba möödunud meeldetuletushetkel ei tekitata kohe täiendavat kirjalaineid.
2. Eraldi töötaja valib ettevõtteid UUID võtmelehekülgedega ja töötleb ühe ettevõtte kohta ühe töö tsüklis. Valik kasutab FOR UPDATE SKIP LOCKED lukku ning annab 90-sekundilise claim_token-iga rendi. Katse algus salvestatakse notification_attempts tabelis.
3. Saatmisel võetakse ettevõtte FOR SHARE ja outbox/broneeringu lukud. Kontrollitakse uuesti versiooni, seisundit, tähelepanuvajadust, demo/saatmisõigust, saajat ja meeldetuletuse sobivust. Broneeringu muutmise eksklusiivne ettevõttelukk järjestab saatmise ja muutmise.
4. SMTP adapteril on piiratud ühenduse/tervituse/sokli ooteajad. Väliskõne ümber ei kasutata automaatset tehingu kordamist. Õnnestumine märgib `sent` alles SMTP vastuvõtu järel. Capture märgib `skipped` koos captured_at-ga, mitte sent/delivered.
5. Ajutisel veal on kuni kaheksa kogukatset: ooteaeg algab minutist, kasvab kahekordseks ja peatub tunnil. Püsiv SMTP 5xx/auth/headeri viga peatab automaatsed katsed. Omaniku põhjendatud uus seeria võib ülempiiri tõsta, kuid ühe töö absoluutne piir on 80 katset.
6. Protsessi kadumise järel saab aegunud rendi üle võtta. Vana renditunnus ei saada kirja. Katkenud katse jääb ajaloos nähtavaks. Stabiilne Message-ID vähendab duplikaate, kuid SMTP vastuvõttu ja DB COMMIT-i ei saa muuta üheks aatomiliseks toiminguks: absoluutset ühekordset kohaletoimetamist ei lubata.

Lühike SMTP ootus hoiab ettevõtte jagatud lukku, nii et samal ajal tehtav haldusmuudatus võib oodata või saada olemasoleva 503 korduskontrolli vastuse. Avalik loomine kasutab samuti jagatud ettevõttelukku. See on teadlik kooskõlalisuse valik; saatmisprotsess ei tühista kinnitatud broneeringut. Pikalt mittetöötav SMTP ei hoia broneeringute tehinguid kogu korduskatsete aja lukus.

Uus broneeringuversioon muudab vanad ootel/nurjunud/üle võetud teated kehtetuks. Saatmiseelne kontroll katab ka võistluse, kus töö oli juba üle võetud. Meeldetuletuse seadistuse muutmine arvutab ümber ainult veel saatmata tulevased tööd; juba saadetud meeldetuletust ei looda sama versiooni jaoks uuesti.

## Käivitamine

- `BOOKING_MAIL_MODE=disabled`: veeb säilitab järjekorra, töötaja ei käivita saatmist.
- `BOOKING_MAIL_MODE=capture`: ainult väljaspool tootmist; privaatne BOOKING_MAIL_CAPTURE_DIR või output/booking-mail. Kataloog peab jääma avalikust veebijuurest välja. Kohalikud lingid kasutavad PUBLIC_LOCAL_PORT-i (vaikimisi 3107).
- `BOOKING_MAIL_MODE=smtp`: vajab samu SMTP_HOST/PORT/SECURE/USER/PASSWORD/FROM seadeid kui kontokirjad. BOOKING_MAIL_MODE ja AUTH_MAIL_MODE on sõltumatud.
- `npm run worker:notifications`: pidev töötaja; `npm run worker:notifications -- --once`: üks piiratud tsükkel. SIGTERM lõpetab käimasoleva töö järel.
- `npm run smtp:verify`: ühenduse, TLS-i ja autentimise proov ilma kirja saatmata. See ei tõenda konkreetse From-aadressi lubamist ega kohaletoimetamist.
- Linuxi Dockerfile'i siht `notification-worker` töötab uid 1000 all. Serveri Compose'i `workers` profiil käivitab selle eraldi veebist: pärast migratsioone ja saatmise seadistamist `docker compose -f compose.server.yaml --profile workers up -d notification-worker`.

Veebil ja töötajal peab olema sama püsiv AUTH_SECRET, sest krüpteeritud halduslingid ja korduspäringu tulemused kasutavad seda. Võti kuulub privaatse taastamiskomplekti juurde. Töötaja ei kasuta migratsioonikontot. SMTP TLS-i kontrolli ei lülitata välja; port 465 kasutab otsest TLS-i, muul juhul on STARTTLS kohustuslik. [Nodemaileri SMTP dokumentatsioon](https://nodemailer.com/smtp) kirjeldab verify ja requireTLS piire.

## Meilitaristu vastuvõtt

Rakenduse katse ei asenda oma meiliserveri avamist. Enne päriskirju tuleb omaniku taristus kontrollida väljamineva SMTP lubatavust, saatja aadressi ja IP mainet, A/PTR vastavust, SPF-i, DKIM-i, DMARC-i ja TLS-i. Saatmis-/tagasipõrkelogid tuleb ühendada käituse seirega. Rakendus saab talletada vaadeldud DSN-i tulemuse, kuid automaatset DSN-postkasti lugejat siin ei ole. [Gmaili ametlikud saatjanõuded](https://support.google.com/mail/answer/81126?hl=en) on vastuvõtjapoolse kontrolli alus; need ei taga põhikausta jõudmist.

Selles etapis puuduvad tegeliku SMTP konto väärtused ja omaniku saatmiskorraldus, mistõttu päriskirju ei saadetud. Arvekirjad ja impordi eraldi lubatud meeldetuletused ühendatakse vastavalt peatükis 19 ja 18; broneeringute töötaja ei saada tundmatut tööliiki.

## Kontrollitõendid

Lõppkontrollis läbisid 161 testi / 20 faili (34,95 s), tüübikontroll ja tootmise ehitus ilma hoiatuseta. Teavituste kümme integratsioonitesti katavad privaatse capture-kirja keelt/linki, SMTP ajutist/püsivat viga, stabiilset Message-ID-d, kaht töötajat, aegunud renti, tühistamise võistlust, demo keeldu, omaniku õigusi/versiooni/auditit, meeldetuletuse seadeid ja käsitsi kliendikirja keeldu. Tegelikku SMTP-võrguedastust need ei väida: saatja vastused on juhitud adapteriga.

Brauseris salvestati seaded ja loodi tulevane meeldetuletus. et/en vaade kontrolliti 390 px laiuses; salvestamata e-posti muudatus säilis taustavärskenduses ja võõras versioon blokeeris salvestamise. Tabel sai klaviatuuriga keritava minimaalse veerulaiuse, et mobiil ei murraks teksti ühe tähe kaupa. See on kasutatavuse parandus, kujundus jääb ootele. Eraldatud prooviettevõte ja sessioon eemaldati.

Linuxi worker-image ehitus ja moodulite laadimine uid 1000 all läbisid. Tootmisesse muudatusi ei paigaldatud. Järgmine peatükk on 18: liitumine, import, eksport ja lahkumine.
