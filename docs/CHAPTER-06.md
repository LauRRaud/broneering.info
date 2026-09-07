# Peatükk 06 — teenused ja töötajate seosed

Alus: arendusplaani peatükk 06, D-05–08, ajaloo säilitamine ning kinnituse värske pakkumise kontroll. Omaniku 07.09.2026 täpsustus lisab teenusegruppide hierarhia. Kujundus on ootel.

## Teostus

| Osa | Tulemus |
| --- | --- |
| Grupid | Põhikategooriad ja alamgrupid, nimetamine, ümbertõstmine ja arhiveerimine. Sama nimi on lubatud eri ülemgruppides. Tsüklid ja teise ettevõtte ülemgrupp keelatakse. Arhiveeritud ülemgrupp peidab ka oma alampuu. |
| Teenused | Nimi, lühikirjeldus, grupp, vaikehind sentides (EUR), kestus, ettevalmistus- ja lõpetamispuhver, aktiivsus ja veebis nähtavus. |
| Töötajad | Kontota avalik profiil: nimi, amet, lühitutvustus ja valikuline HTTPS-foto aadress. Aktiivsus ja veebis nähtavus. Fotot ei laadita serverisse ega proksita; brauser küsib selle määratud aadressilt ilma referrer-päiseta. |
| Seosed | Iga töötaja-teenuse seose hind, kestus ja mõlemad puhvrid saavad eraldi pärida teenuse vaikeväärtust või kasutada erandit. Tühi väli tähendab pärimist. Haldus kuvab tegeliku väärtuse ja pärimise/erisuse. Arhiveeritud seos ei sobi uueks broneeringuks. |
| Õigused | Omanik koos MFA-ga haldab struktuuri ja profiile. Vastuvõtt saab ainult omaniku antud services.manage loaga muuta hindu ja kestusi. Töötaja ega liikmesuseta platvormitugi ei saa hinnakirja muuta. |
| Samaaegsus | Hinnakirja kirjutus lukustab ettevõtte enne värsket õiguskontrolli. Broneeringu kinnituse jagatud ettevõttelukk ei saa kirjutusega kattuda. Igal muudetaval objektil on versioon; vana vorm saab 409. |
| Ajalugu | Arhiveerimine ei kustuta ridu ega muuda olemasolevate broneeringute nime, töötajat, hinda, kestust ja puhvrite hetkeseisu. Uue broneeringu aegunud hind/kestus nõuab uut pakkumise kinnitust. Toiming salvestatakse auditisse. |

Migratsioon 005 säilitab kõik senised töötaja hinnad/kestused eraldi määratud väärtustena. Teenuse esialgne vaikeväärtus võetakse ühelt olemasolevalt seoselt; seniste pakkumiste väärtused ei muutu. Uue seose tühjad erandiväljad pärivad vaikeväärtusi. Migratsioon 006 lisab hierarhia ja RLS-i järgiva grupipuu vaate. Vanade SQL-seemenduste grupita teenus kasutab senist category välja; haldusvormis on grupivalik kohustuslik.

## Ilutegu struktuuri näide

Omaniku esitatud kategooriad on **Juuksur, Massaaž, Ripsmed ja Pediküür**. Need ei määra automaatselt hinda ega kestust.

- Juuksuri alamgruppideks sobivad Salgutamine + lõikus + föönisoeng, Põhi + salk + föön, Värvimine + lõikus + föönisoeng ning Lõikused ja soengud. Nende alla kuuluvad konkreetsed hinnastatud teenused.
- Massaaži teenused võivad kuuluda otse põhikategooriasse: Megamõnnatamine, Klassikaline massaaž, Aroomimassaaž, Reflektoorne jalalabateraapia, Selg / turi / kael, Laste massaaž ja Jalad.
- Ripsmed → Klassikalised ripsmepikendused või Hübriidripsmepikendused → Paigaldus / teise tehniku hooldus ning Hooldus.
- Pediküür → Spa-pediküür + geellakk või Spa-pediküür geellakita.

Need on struktuurinäited, mitte päris hinnakirja import. Ilutegu demoteenuste hinnad jäävad näidisandmeteks.

## Vastuvõtt ja piirid

Kõik 59 rakenduse testi, tüübikontroll ning kohalik tootmisbuild läbisid. Nende hulgas on kümme uut andmebaasitesti: pärimine/erisused, õigused/MFA, RLS ja ettevõttepiirid, vigased väärtused, paralleelsed versioonid, ajalugu, aegunud pakkumine, arhiveerimine ja avaliku profiili andmepiir. Lisaks läbisid kaks hierarhiatesti: eri harude samanimelised grupid, ülemgrupi arhiveerimine, tsüklikeeld, võõras ülemgrupp ning grupipuu RLS. Serveri tulemus lisatakse pärast avaldamist.

Kohalikus brauseris läbiti päris sisselogimine koos MFA-ga ning loodi ajutises ettevõttes grupp, 27,50 € / 45 min teenus, töötajaprofiil ja vaikeväärtusi päriv seos. Avalik kataloog näitas sama teenust ja hinda. Seose erihinna muutmine 29,50 eurole jõudis avalikku vaatesse; ainsa teenindaja tutvustus oli nähtav. Brauseris lisati ka alamgrupp ning haldus kuvas täieliku grupitee. Ajutine testettevõte, konto, kohalikud testkirjad ning hinnakirjaandmed eemaldati pärast katset.

Veebis peidetud teenuste õigustatud käsitsi broneerimine vajab peatüki 11 kalendrit. Graafiku haldus tuleb peatükis 07. Maksude kuvamise lõpliku korra otsustab omanik. Foto üleslaadimise failitöötlus ning täielik brauserite/ligipääsetavuse vastuvõtt ei ole selle peatüki osana tõendatud. Tühistamistingimuste iseteenindus tuleb peatükis 10.
