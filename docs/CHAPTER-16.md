# Peatükk 16: ettevõtete eraldatus ja turvanõuded

Peatüki olemasolevad konto-, broneeringu- ja halduse kontrollid on täiendatud jagatud päringupiirangu ning ohutute turvasignaalidega. See ei tähenda kogu ASVS-i sertifitseerimist: hilisemate failide, ekspordi, SMTP ja tootmistaristu kontrollid võetakse vastu nende teostamisega.

## Andmete ja õiguste piir

Avalik ettevõte tuleb valmis domeeniseosest, halduse ligipääs värskest andmebaasiliikmesusest. Host ega tenantId ei asenda teineteist. Rakendus ei usalda X-Forwarded-Host päist ettevõtte määramisel. Tehing määrab app.tenant_id lokaalselt ning tööandmetel on FORCE RLS ja ettevõtet hõlmavad välisvõtmed. Rakenduse ühendus ei tohi kasutada superkasutaja/BYPASSRLS õigust; migratsioonikonto on eraldi. Peatüki 13 testid katavad ka hilisemate failide/arvelduse tabelite eralduse ja piiratud grandid.

Erandid ettevõttepõhistest sisutabelitest on autentimise globaalne identiteet, domeeniregister, globaalsed paketiversioonid ja infrastruktuuri päringuloendurid. Uus `request_limits` tabel ei sisalda ettevõtte sisu, kontakte, IP-sid ega tunnuseid: võti on serveris määratud ulatuse SHA-256 räsi. booking_app ei saa tabelit otse lugeda ega kirjutada; lubatud on ainult piiratud argumentidega SECURITY DEFINER funktsiooni käivitamine.

Omanik ja platvormihaldur vajavad MFA-d. Better Authi sessioon loetakse andmebaasist; MFA-ga konto vajab kinnitatud teise teguri sessioonimärget. Liikmesuse eemaldamine ja parooli taastamine tühistavad sessioonid. Töötaja broneeringud on seotud tema aktiivse profiiliga. Teise ettevõtte või töötaja ID asendamine ei anna õigust. Toeõigus on põhjendatud, ajaliselt piiratud ja auditeeritud; see ei luba vaikimisi kliendiandmete muutmist.

## Kirjutuspäringud ja kuritarvitus

Avalik kirjutus kontrollib täpset Origin-i koos protokolli ja hostiga; tootmises on lubatud HTTPS. Vigane URL, `null`, kasutajatunnusega URL, teine protokoll ja teine host annavad kontrollitud 403. Haldus/autentimine kasutavad täpselt AUTH_BASE_URL päritolu. JSON on piiratud 8 KiB-ni, Zod-skeemid valideerivad serveris. API-d on no-store, haldus/halduslink noindex, referrer-policy on no-referrer.

`consume_request_limit` rakendab sama minutiakna ülempiiri kõigis veebiprotsessides. Ühe SQL-i UPSERT tagab, et paralleelsed ühendused ei saa ülempiiri mööda lugeda. Piir ületamisel tagastatakse 429 koos Retry-After: 60-ga. Andmebaasivea korral jätkamine on keelatud ja vastus on üldine 503 BUSY. Korduspäringu tunnus jääb kliendile alles. Piiri võtmed tulenevad juba leitud ettevõttest või autentitud kasutajast. Autentimisel kasutab Better Auth oma andmebaasipõhist piirangut; TOTP viie nurjunud katse järel kehtib 15-minutiline lukustus.

Põhilised ülempiirid minutis: avalik kataloog/saadavus koos 600, järgmise päeva otsing 30, avalik loomine 120, halduslingi lugemine 180/kirjutamine 60, halduse broneeringulugemine 240/kirjutamine 60, halduse koondseis 120, tõlkekirjutamine 15. Teiste toimingute piirid on route handler'is selgelt määratud. See kaitseb rakenduse tööd; pöördproksi ühenduse-/mahupiirid ja mahuline DDoS-kaitse kuuluvad taristu juurde.

Loendur säilitab ainult praeguse akna arvu ja tagasilükatud päringute arvu. Iga kutse koristab kuni 64 üle päeva vanust loendurit; rakenduse seismisel ei käivitu eraldi kustutus. See on infrastruktuuri lühiajaline loendur, mitte kliendiandmete säilituspoliitika. Ühenduspuul on protsessi kohta 12 ühendust, ühendumise timeout 5 s, SQL 15 s ning ettevõttetehingu lukuootus 10 s. Täis puul ootab ühendust kuni timeout'ini; piirangute summa tuleb tootmises protsesside arvuga arvestada.

## Audit ja jälgitavus

Õiguste/andmete haldusmuudatuste audit kirjutatakse samas tehingus. AppError 401/403/410 ning autentimise keelud annavad JSON-kujul `security.rejected` signaali. Selles on ainult kood, staatus, koondarv ja akna lõpp; puuduvad päringu sisu, URL, e-post, IP, halduslink ja saladused. Ühe minutiakna kordusi logitakse eksponentsiaalse sammuga, et keelatud päringute tulv ei tekitaks piiramatut logitulva. Loendur on protsessipõhine koondsignaal; vastuvõtupiirang ise on andmebaasis jagatud. Operatiivne logikogumine, alarmid ja säilitamine kuuluvad peatükki 22/21.

## ASVS-i jälgitavus

Valitud kontrollide versioon on **OWASP ASVS 5.0.0**. Tunnused kontrolliti [ametliku versiooni nõuete loendist](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/docs_en). Allolev on projekti kontrollide seos, mitte väide ASVS L2 tervikvastavusest.

| Nõue | Projekti kontroll/tõend | Seis |
| --- | --- | --- |
| v5.0.0-1.2.4 | Parameetrilised SQL-väärtused; sisendist ei koostata SQL-identifikaatoreid; tests/booking ja haldustestid | Olemasoleva API piires |
| v5.0.0-3.3.2 | Better Authi hostiküpsis/SameSite; tests/auth-flow | Konto teekond testitud |
| v5.0.0-3.5.1 | Origin + JSON + Bearer/sessioon; HTTP piiride ning request-limits testid | Olemasoleva API piires |
| v5.0.0-6.1.1 | Ülal kirjeldatud jagatud mahupiirid ja TOTP lukustus | Kohalikult teostatud; proksi katse hiljem |
| v5.0.0-6.3.3 | Omaniku/platvormihalduri MFA; tests/auth-flow, access | V1 rollinõue; teiste rollide MFA ei ole kohustuslik |
| v5.0.0-6.4.3 | Taastamise järel sessioonide tühistamine; MFA ei eemaldu; tests/auth-flow | Testitud konto teekond |
| v5.0.0-6.4.4 | Kõigi faktorite kaotamise käitusmenetlus allpool | Käitaja identiteedikinnitus vajalik päris juhtumil |
| v5.0.0-7.4.1 | Andmebaasisessioon ja tühistamine; tests/auth/access/auth-flow | Testitud |
| v5.0.0-8.3.1 | requireMembershipInClient ja töötaja ulatus samas töötehingus | Testitud haldustoimingud |
| v5.0.0-8.4.1 | RLS, liit-FK, Host ja õigused; booking/access/data-model testid | Olemasolev mudel/API; failiväljastus hiljem |
| v5.0.0-13.1.2 | Puuli/SQL/luku limiidid ja kontrollitud tõrked | Kohalikult testitud; tootmiskoormus hiljem |
| v5.0.0-16.2.5 | Ohutud koondsignaalid, token URL fragmendis, toore vea logimise keeld | Rakenduses teostatud; proksi/logikoguja kontroll hiljem |
| v5.0.0-16.3.2 | Keelatud ligipääsu koondsignaalid ja turvaline audit | Koondsignaal olemas; individuaalne operatiivne uurimisvaade hiljem |

## Konto taastamise käitusreegel

Kasutaja saab taastada parooli oma kinnitatud e-posti kaudu ning kasutada ühekordset MFA varukoodi; see ei anna uut liikmesust ega eemalda MFA-d. Kui kõik faktorid on kadunud, avalik API ega tugi e-posti/nime põhjal MFA-d välja ei lülita. Käitaja kontrollib isikut ja ettevõtte volitust algse liitumise/kutsete tõendite põhjal väljaspool taastatavat kontot; teise aktiivse omaniku olemasolul saab too teha auditeeritud liikmesustoimingu. Kui tõend puudub, jääb konto suletuks. Pärast kontrollitud taastamist tühistatakse kõik vanad sessioonid/faktorid ja väljastatakse uus liitumisvõimalus uue MFA-ga; käitamise konkreetne administraator ja tõendite hoidmiskoht määratakse enne päriskasutajate avamist. Andmebaasi parooliräsi ega MFA saladust ei saadeta kasutajale.

## Kontrollid ja järgmine töö

Uued testid katavad sõltumatute ühenduspuulide ühist ülempiiri (40 päringut, 10 lubatud), teise ulatuse sõltumatust, loenduri aegumist, Retry-After päist, tabeli otseligipääsu keeldu, rikke ajal suletuks jäämist, Origin-i väärkujusid ja logide piiratud tundliku sisuta kuju. npm audit --omit=dev näitas 8. septembril 2026 null teadaolevat haavatavust; see ei tõenda tundmatute vigade puudumist.

Failide sisu ümbertöötlus ja privaatne väljastus teostatakse failifunktsiooniga, ekspordi/impordi mahupiirid vastavate töövoogudega. Täielik turva- ja tootmisvastuvõtt jääb peatükkidesse 25/26. Järgmine teostus on peatükk 17: e-kirjad ja oma saatmislahendus.
