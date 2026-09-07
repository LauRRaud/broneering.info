# Järgmised arendusetapid

## Valmis esimese tehnilise katse osana

Lihtne avaleht, kaks ettevõttedemot, PostgreSQL-i skeem ja migratsioon, päris saadavus, broneeringu tehing, RLS, kattuvuse piirang, korduspäringud, teavitusülesande salvestamine. Esialgne kujundus eemaldati omaniku soovil; kasutajaliides kasutab brauseri vaikimisi HTML-elemente. Uus kujundussuund tuleb enne teostamist omanikuga kokku leppida. E2 põhikatse on olemas; see ei tähenda kogu arendusplaani V1 valmimist.

## 1. Kontod ja ettevõtte loomine

E-posti kinnitamine, turvalised sessioonid, parooli taastamine ja kutsete voog. Omanikule MFA. Iga sisselogija ettevõtteliikmesus ja roll. `haldus.broneering.info` hostipõhine küpsis. Ettevõtte loomise vorm lisab ettevõtte, omaniku liikmesuse ja kordumatu reserveerimata alamdomeeni ühes kontrollitud töövoos. Kasutatud aadresse ei anta teisele ettevõttele.

## 2. Ettevõtte töölaud

Teenuste hinnad ja kestused, töötajate teenusepõhised erisused, nädalagraafikud ja erandid. Päeva-/nädalakalender, käsitsi broneering, vananenud muudatuste versioonikontroll, audit. Kõik saadavust mõjutavad kirjutused kasutavad broneerimisega sama lukustusprotokolli.

## 3. Broneeringu elutsükkel

Juhusliku räsitud tunnusega aeguv halduslink, muutmine ja tühistamine eraldi kinnitatava toiminguna. GET ei muuda andmeid. Aja muutmine säilitab vana broneeringu, kui uus aeg ei kinnitu. Isiklik töötajalink, järgmise vaba päeva otsing, veaseisundite täiendavad brauseritestid. Piloodi ärireeglid tuleb omanikul kinnitada.

## 4. Liitumine, kujundus ja teavitused

Ettevõtte seadistusviisard, kujunduse mustand/avaldamine, logo kontrollitud üleslaadimine. SMTP, teavituste saatja, korduskatsed ja meeldetuletused. Demo/import ei saada päriskirju. DNS ja HTTPS automatiseerimine. Kodulehe tavaline link, seejärel lubatud päritoluga iframe ja modaal.

## 5. Kuutasu ja käitamine

Paketid, arved, käsitsi laekumiste märkimine, piirangud ja eksport. Hinnad on veel otsustamata. Serveri staging ja tootmiskeskkond, seire, varundus, taastamine, hooldusjuhend. Repo privaatsus ja omaniku ettevõtte andmed. Kõik 48 lähteplaani vastuvõtutesti seotakse tegeliku teostuse ja tõenditega.

SMS, kaardimaksed, Google'i kalendri sünkroonimine, mitu asukohta ja suvalise kodulehe ehitaja jäävad eraldi hilisemasse ulatusse.
