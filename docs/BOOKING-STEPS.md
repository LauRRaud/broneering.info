# Broneerimise sammud ja kujundus

## Praegune kohalik teostus — 12.09.2026

Omanik andis pärast visandite arutelu loa kõigi broneerimissammude kujundamiseks ja iseseisvaks viimistlemiseks. Ilutegu kohalik demo kasutab sooja heledat tausta, kuldseid aktsente, Cormorant Garamondi pealkirju ning Manrope'i põhiteksti. Ajasta kodulehe ja halduse uus kujundus ei kuulu sellesse muudatusse.

1. **Kategooria.** Tegelik kategooriapuu; ainsa kategooria korral jäetakse üleliigne valik vahele. Pealkirja all ei korrata vanemkategooriat. Kaartidel on SVG-ikoonid ja lühikirjeldused.
2. **Teenus.** Ühe teenuse tegelikud kestusevariandid on samal kaardil. Üks variant on kompaktne, mitu kõrvuti ja vajadusel järgmisele reale murduvad. Iga nupp valib oma tegeliku teenuse ID. Hinda või kestust ei tuletata visandist. Kirjeldus selgitab teenuse sisu, pikem tekst avaneb lisainfo alt. Rohkem kui kaheksa teenuse puhul on otsing.
3. **Spetsialist.** Foto või initsiaalid ja nimi. Nurga infonupp avab ametinimetuse, tutvustuse ja olemasoleva avaliku telefoni töötajat valimata. Hinda/kestust korratakse ainult erinevate töötajapakkumiste puhul. „Eelistus puudub” näitab kõigi sobivate töötajate aegu. Ainus sobiv töötaja valitakse automaatselt.
4. **Aeg.** Kuukalender ja pakkumised on vähemalt 46rem laiuses konteineris kõrvuti, kitsamas vaates üksteise all. Valitud kuupäev on täidetud ring, tänane kontuuriga ja vabadeta päev tuhm. Läbikriipsutust ega pisikest linnukest ei ole. Hommik, Päev ja Õhtu on kolm alati nähtavat vahekaarti; tühi päevaosa näitab teadet. Jaotus kasutab ettevõtte ajavööndit, piirid 12:00 ja 17:00.
5. **Kinnitus.** Kontaktandmed, meeldetuletuste eelistused ja muudetav kokkuvõte. Ettevõtte info on kokkuvõttes, tingimused avanevad lingist ümardatud dialoogis. Kinnitusnupp on keskel ja kuni 20rem lai. Telefonis on kokkuvõte enne vormi ning kinnitamise tegevused pärast vormi.

Valimine viib edasi; edasinoolt ei ole. Väike ümar tagasinupp asub progressijoonte vasakul küljel. Sammude arv kohandub vahele jäetud valikutega. Tagasiliikumine säilitab kontaktandmed; varasema valiku muutmine tühjendab sobimatud järgmised valikud. Kaardid ei liigu hover-olekus.

Päises on ettevõtte logo või nimi ning ühine keele- ja kuvamenüü. Valikute juures ei ole ettevõtte info, demo teate ega töötajate kontaktide paneeli. Demo olemasolevaid aadressi- ja tingimuste andmeid ei asendata väljamõeldud pärisandmetega.

## Broneerimisaken ja ligipääsetavus

Sama BookingFlow töötab eraldi lehel, manustatud vaates ja halduse eelvaates. Vidina modaali päises on sulgemisrist. Sulgemine ja uuesti avamine säilitavad vormi. Tingimuste rist ja Escape sulgevad ainult tingimused, taastades fookuse lingile.

Sammu vahetusel liigub fookus pealkirjale. Kuukalender toetab nooli, Home/End, Page Up/Down, Shiftiga aastat ning Enterit/tühikut. Fookuse või kuu liikumine ei vali aega. Päevaosa- ja kuvamenüüd toetavad klaviatuuri. Kõrge kontrast ja forced-colors säilivad.

Kuu ülevaade kasutab sama saadavusmootorit kui päeva pakkumised. Tuhmi päeva võib värskelt kontrollida; minevik ja broneerimisaknast väljas päevad on keelatud. Kuu päringu tõrge ei blokeeri päeva valimist. Kinnitamine kontrollib saadavust uuesti. Ebaselge vastuse korral säilib sama idempotentne päring.

## Failid ja kontrollid

Olek/päringud: src/components/booking-flow.tsx. Vaate osad ja CSS Modules: src/components/booking/. Primitiivid: src/components/ui/. Teemafailid sisaldavad ainult muutujaid. SVG-failid: public/icons/booking/.

Tootmisehitus ja TypeScripti kontroll läbisid. Seotud komponentide, teemade, meeldetuletuste, ekspordi ja broneerimise testid läbisid. Brauseris kontrolliti eraldi lehte, päris vidina modaali, telefonilaiust, tingimuste sulgemist ja vormi säilimist. Katsefixture output/booking-design-qa/ kasutab tegelikke komponente ja ainult loetavaid kohalikke API-sid; POST on keelatud.

See kujundus on **kohalik**: http://ilutegu.localhost:3117/. Varasema funktsionaalse sammumuudatuse paigaldus on eraldi ajalooline sündmus: [paigalduse protokoll](DEPLOYMENT-ILUTEGU-2026-09-12.md). Käesolevat kujundust ega migratsiooni 054 ei ole serverisse paigaldatud.
