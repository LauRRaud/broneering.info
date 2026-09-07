# Järgmised arendusetapid

Arendusplaani peatükkide täitmise ja puuduvate tööde esmane register on [PROGRESS.md](PROGRESS.md). See on nõuete jälgimise alus; allolev varasem tehniline tööjaotus ei asenda dokumendi sisukorda ega vastuvõtuteste.

## Valmis esimese tehnilise katse osana

Lihtne avaleht, kaks ettevõttedemot, PostgreSQL-i skeem ja migratsioon, päris saadavus, broneeringu tehing, RLS, kattuvuse piirang, korduspäringud, teavitusülesande salvestamine. Esialgne kujundus eemaldati omaniku soovil; kasutajaliides kasutab brauseri vaikimisi HTML-elemente. Uus kujundussuund tuleb enne teostamist omanikuga kokku leppida. E2 põhikatse on olemas; see ei tähenda kogu arendusplaani V1 valmimist.

## 1. Kontod ja ettevõtte loomine

Kontode, sessioonide, kutsete, rollide ja MFA tehniline alus on lisatud; täpne seis ja SMTP sõltuvus on [peatükis 04](CHAPTER-04.md). Ettevõtte loomise vorm peab hiljem lisama ettevõtte, omaniku liikmesuse ja kordumatu reserveerimata alamdomeeni ühes kontrollitud töövoos. Kasutatud aadresse ei anta teisele ettevõttele.

## 2. Ettevõtte töölaud

Teenuste hinnad ja kestused, töötajate teenusepõhised erisused, nädalagraafikud ja erandid. Päeva-/nädalakalender, käsitsi broneering, vananenud muudatuste versioonikontroll, audit. Kõik saadavust mõjutavad kirjutused kasutavad broneerimisega sama lukustusprotokolli.

## 3. Broneeringu elutsükkel

Juhusliku räsitud tunnusega aeguv halduslink, muutmine ja tühistamine eraldi kinnitatava toiminguna. GET ei muuda andmeid. Aja muutmine säilitab vana broneeringu, kui uus aeg ei kinnitu. Isiklik töötajalink, järgmise vaba päeva otsing, veaseisundite täiendavad brauseritestid. Piloodi ärireeglid tuleb omanikul kinnitada.

## 4. Liitumine, kujundus ja teavitused

Ettevõtte seadistusviisard, kujunduse mustand/avaldamine, logo kontrollitud üleslaadimine. SMTP, teavituste saatja, korduskatsed ja meeldetuletused. Demo/import ei saada päriskirju. DNS ja HTTPS automatiseerimine. Kodulehe tavaline link, seejärel lubatud päritoluga iframe ja modaal.

## 5. Kuutasu ja käitamine

Paketid, arved, käsitsi laekumiste märkimine, piirangud ja eksport. Hinnad on veel otsustamata. Serveri staging ja tootmiskeskkond, seire, varundus, taastamine, hooldusjuhend. Repo privaatsus ja omaniku ettevõtte andmed. Kõik 48 lähteplaani vastuvõtutesti seotakse tegeliku teostuse ja tõenditega.

SMS, kaardimaksed, Google'i kalendri sünkroonimine, mitu asukohta ja suvalise kodulehe ehitaja jäävad eraldi hilisemasse ulatusse.

## Toote suund — omaniku täpsustus 07.09.2026

broneering.info on paindlik broneerimissüsteem teenusepakkujatele. V1 fookus on ilu ja heaolu, konsultatsioonid ning lihtsad teenindusettevõtted, kus üks broneering hõivab ühe teenindaja aja. Avaleht ja otsingumetaandmed kasutavad seda laiemat positsioneerimist.

Järgmine suur laiendus on ressursipõhine broneerimine: inimene, ruum, pesuboks, seade või nende kombinatsioon. See vajab eraldi ressursinõudeid, saadavuse ühisosa, kõigi vajalike ressursside atomaarset hõivamist ja vabastamist ning ressursipõhist haldust. Olemasolev staff tabel tähendab V1-s inimest; ruume ei esitata varjatult töötajatena. Rühmatundide kohtade arv, korduvad ajad, sõiduaeg ja valdkondlikud kliendiandmed on eraldi laiendused. Lai turupositsioon ei tähenda nende funktsioonide ega meditsiinivaldkonna nõuete täidetust.
