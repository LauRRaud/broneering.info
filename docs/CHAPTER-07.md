# Peatükk 07 — töögraafik ja vabade aegade reeglid

Alus: arendusplaani peatükk 07, peatüki 15 ühine lukustusprotokoll ning AT-07/08/09/14. Üks asukoht ettevõtte kohta; kujundus jääb omaniku soovil ootele.

## Teostus

| Nõue | Tulemus |
| --- | --- |
| Nädalagraafik | Asukoha ja iga töötaja seitse nädalapäeva, kuni kaheksa töövahemikku päevas. Tühi päev on suletud; pausid on vahemike vahed. Kattuvad vahemikud keelatakse, kõrvutised ühendatakse. Üle südaöö töö sisestatakse kahe päeva kaupa. |
| Kuupäeva erandid | Üks päev või kuni 366-päevane periood: puhkus, haigus, lisatööpäev või muu erand. Erand asendab nädalapäeva; taastamine eemaldab erandi. Puudumine ei tekita võltsbroneeringut. |
| Saadavus | Asukoha ja töötaja tööaja ühisosa, millesse peab mahtuma kogu hõivamine koos puhvritega. Nii asukoha kui ka töötaja erandeid arvestatakse. Avalik vastus ei sisalda puudumise põhjust ega kliendiandmeid. |
| Reeglid | Omanik muudab etteteatamist minutites, ettebroneerimise päevi, algusaegade sammu, muutmise/tühistamise tähtaega ja IANA ajavööndit. Praegused demo väärtused ei ole kinnitatud universaalsed ärireeglid. |
| Õigused | Omanik koos MFA-ga muudab kõiki graafikuid ja reegleid. Vastuvõtt vajab graafiku muutmiseks schedules.manage luba. Töötaja näeb oma aktiivse profiili graafikut ning muudab seda ainult schedules.own loaga. Reeglite muutmine jääb omanikule. |
| Versioonid | Nädalagraafikul ja eranditel on ühine asukoha/töötaja versioon. Aegunud vorm saab 409. Teise vormi salvestamine ei kirjuta salvestamata nädalagraafiku mustandit üle; mustandi alusversioon säilib. |
| Broneeringukonfliktid | Kirjutus võtab ettevõtte eksklusiivse luku, kontrollib värskeid õigusi ning vajadusel töötajalukku. Broneeringu kinnitus kasutab sama järjekorda jagatud ettevõttelukuga. Olemasoleva jätkuva/tulevase broneeringu tööajast väljajätmine blokeerib kogu muudatuse; graafik, versioon ja audit jäävad muutmata. |
| Konflikti kuvamine | 409 vastus näitab kuni 30 mõjutatud broneeringu viidet, töötajanime ja aega ning koguarvu. Kliendi kontaktandmeid ei tagastata. Broneeringuid ei liigutata ega tühistata automaatselt. |
| Reeglite muutus kliendi vormis | Kataloog sisaldab rulesVersion väärtust; kinnitus vajab sama expectedRulesVersion väärtust. Muudatuse korral värskendab klient kataloogi ja küsib uue ajavaliku, hoides kontaktandmed alles. Ka vana versiooni klient ilma selle väljata saab RULES_CHANGED, mitte vaikimisi nõustumise. |
| Tingimuste hetkeseis | Uuele broneeringule salvestatakse kinnitatud cancellation_hours. Varasematele broneeringutele jäetakse teadmata hetkeseis NULL-iks; tänaseid tingimusi neile tagantjärele ei omistata. Korduspäring tagastab algse broneeringu ka pärast reeglite muutmist. |
| Ajavöönd | Kellakeeramisel olematud ja kahetähenduslikud kohalikud ajad jäetakse pakkumata. Ajavööndi muutmine ei liiguta kinnitatud UTC hetki ning on keelatud, kui olemasolev hõivamine ei mahu uude kohalikku graafikusse. |

Migratsioon 007 lisab graafikuversioonid, reeglite versiooni, erandi liigi ning tühistamistähtaja hetkeseisu. Graafikuversioonidel on tenant-põhine FORCE RLS. Kõik muudatused kirjutavad auditisse tegija, toimingu ja versiooni; nädalagraafiku puhul ka vahemikud, erandi puhul perioodi.

## Kontrollid 07.09.2026

Kõik **74 rakenduse testi** ja kohalik tootmisbuild läbisid. 13 uut andmebaasitesti katavad tööaja ühisosa, pause/puhvreid, erandeid ja taastamist, enda/võõra töötaja piire, õiguste tühistamist, RLS-i, konfliktide täielikku tagasipööramist, paralleelseid versioone, sulgemise ja kinnituse samaaegsust, tingimuste hetkeseisu, ajavööndi vahetust ning serverikella etteteatamise korduskontrolli. Kaks uut HTTP testi katavad MFA seadistamise ajal kaitstud sisu peitmist ja konfliktivastuse kuju. Senised kellakeeramise testid läbivad.

Kohaliku ajutise MFA omaniku brauserikatse:

- Etteteatamine 60 min, samm 30 min ja tähtaeg 48 h salvestusid.
- Töötaja teisipäev muudeti 10–17; kliendile pakuti aegu 10:00–16:30.
- Poolelioleva kliendivormi ajal muudeti tähtaeg 72 tunnile. Esimene kinnitus palus uut valikut; nimi ja e-post säilisid, kokkuvõte näitas 72 h.
- Kohalik proovibroneering BR-C19AFC99DE84 kinnitati 08.09.2026 kell 10:00–10:30; andmebaasi hetkeseis oli 72 h.
- Selle päeva puhkuseks sulgemine sai konfliktiteate sama broneeringu viitega. Järgmise päeva puhkus salvestus ning avalik saadavus tagastas null pakkumist.
- Brauseris leitud graafiku- ja hinnakirjakomponendi võtmete konflikt parandati; korduvat vormivaadet enam ei esinenud.

Ajutine kohalik testettevõte, MFA konto, testkirjad, graafikud ja proovibroneering eemaldati pärast kontrolli. Serveri avaldamise tulemus lisatakse pärast paigaldamist.

## Piirid ja järgnev töö

Broneeringute ümbertõstmine ja tühistamine vajavad peatükke 10/11; graafiku konfliktiteade neid toiminguid ei asenda. Käsitsi broneerimise etteteatamise erandit ei lisatud. Meenutused ja ajavööndi kasutamine päris e-kirjades vajavad peatükki 17. Kõigi brauserite ja ekraanilugejate vastuvõtt kuulub peatükkidesse 12/25. Järgmine põhiteostus on peatükk 08: kliendi broneerimisteekond.
