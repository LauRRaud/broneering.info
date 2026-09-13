# Ajasta avalehe ja halduse kujunduse QA

**Source visual truth**

- Haldusvaate põhireferents: `C:\Users\rauds\AppData\Local\Temp\codex-clipboard-091a9878-4368-4ca8-a788-044ad6fc8271.png` (1700 × 921 px).
- Ilutegu visuaalne keel ja kompaktne broneerimisvoog: `http://ilutegu.localhost:3117/`.
- Kasutaja märgitud võrdlusdetailid: `Kuvatõmmis 2026-09-13 120430.png`, `codex-clipboard-1c94e183-aeca-472d-8ead-52cfec2af8c6.png`, `codex-clipboard-fc6631d0-2aa9-472e-8478-5a87ed701748.png`, `codex-clipboard-6417139d-481c-49eb-9ffd-947c40d5051a.png`, `codex-clipboard-bf76ef67-f7e1-482d-a4ca-9685749f443b.png` ja `Kuvatõmmis 2026-09-13 120922.png`.

**Rendered implementation**

- Avaleht: `http://localhost:3117/`.
- Haldus: `http://haldus.localhost:3117/?login=1`.
- Broneerimisvoog: `http://ilutegu.localhost:3117/`.
- Rakenduse ekraanipildid jäädvustati Codexi rakenduses avatud brauseris. Töölauavaade oli 1280 × 720 CSS px, DPR 1.25; kitsas kontrollvaade 707 × 698 CSS px, DPR 1.25. Tööriista inline-kuvatõmmis oli sama brauserirenderduse väljund ning seda ei salvestatud eraldi rasterfailina.
- Põhireferents oli 1700 × 921 px. Kompositsiooni võrreldi proportsioonide ja komponentide kaupa; pikslitäpset ülekattetesti ei kasutatud, sest referentsi näidisandmed ja kontrollitud rakenduse sünteetilised andmed ei olnud samad.

**State**

- Hele haldusvaade, sisselogitud omanik, broneeringute päevavaade.
- Hele ja tume Ilutegu broneerimisvaade, rippmenüü avatud olek ning ühe spetsialisti valik.
- Avalehe tume režiim, hero pildiala teadlikult tühi kuni omanik annab foto.
- Kitsas haldusvaade klientide, teenuste, meeskonna ja ettevõtte seadete osas.

**Full-view comparison evidence**

- Töölaua haldus säilitab referentsi põhilise hierarhia: vasakul Ajasta ja ettevõte, keskel peamenüü, paremal abi/eelistused/profiil; sisu algab pealkirja, filtrite ja kalendriga.
- Ajasta avaleht on hõre ja kompaktne. Peamine sõnum, kaks tegevusnuppu ning tulevase hero foto raam mahuvad 1280 × 720 vaates esimesele ekraanile.
- Haldus muutub kitsas vaates horisontaalseks kahe reaga päiseks ning tabelipõhised liikmed kaartideks. Püsivad toimingud ei kattu ega jää vaate serva taha.

**Focused region comparison evidence**

- Broneeringute tööriistariba: kuupäev ja töötaja on sama laiuse ja kõrgusega; vaadete segment ning lahendamist vajavate broneeringute filter on eristatavad.
- Kuupäevavalik: kasutab sama `MonthCalendar` komponenti ja samu valiku-, tänase päeva ning navigeerimise olekuid nagu avalik broneerimisvoog.
- Rippmenüüd: Ilutegu kuva menüü ja halduse töötajafilter kasutavad sama pehmet pinda, brändivärvi valikuolekut, fookusrõngast ja kontrollitud vahesid.
- Kliendid: otsing, kliendikaardid, CSV-toiming ja lehekülgede juhtimine on eraldi rütmiga plokkides.
- Teenused: avatud teenusegrupi vorm joondab väljad ja tegevuse, selgitav aktiivsuse märkeruut on eraldi real.
- Meeskond: kitsas vaates on iga liige sildistatud kaart; roll, töötaja, õigused ja toimingud ei murdu kitsasteks tabeliveergudeks.
- Ettevõtte seaded: väljad, kontrollnimekiri, avaldamise toimingud ja kuutasu osa kasutavad ühtset vertikaalset rütmi ning pehmet fookusolekut.

**Required fidelity surfaces**

- Fonts and typography: Cormorant kuvapealkirjad ja Manrope'i kasutajaliides vastavad Ilutegu/Ajasta suunale; suurused, raskused ja reavahed on kontrollitud töölaua- ja kitsas vaates.
- Spacing and layout rhythm: peamenüü, filtrid, paneelid, vormid, kaardid ja jalus kasutavad järjepidevaid vahesid, ümardusi ja piirdeid. Kontrollitud vaadetes ei olnud ülekatteid ega peidetud põhitoiminguid.
- Colors and visual tokens: soe hele/tume Ajasta palett, pruun valikuvärv, neutraalsed pinnad ja semantilised olekud kasutavad olemasolevaid teematokeneid. Tekst ja fookusolekud säilitavad loetava kontrasti.
- Image quality and asset fidelity: uut hero pilti ega asendusillustratsiooni ei loodud. Omaniku foto jaoks on õige proportsiooni ja töötluseta tühi meediaraam. Olemasolevad ikoonid on projekti ühised vektorikoonid.
- Copy and content: avaleht ütleb selgelt, mida Ajasta teeb, ning avalik liitumine on märgitud suletuks. Haldus kasutab teenusepakkuja tegevusi ja ettevõtte konteksti; kliendi juhiseid ei esitata halduse juhistena.
- Accessibility and behavior: rippmenüüd ja kalender on klaviatuuriga juhitavad, kasutavad rolle/olekuid, sulguvad Escape'iga ja tagastavad fookuse. Brauseri konsoolis ei olnud avalehe, halduse ega Ilutegu kontrolli ajal vigu.

**Comparison history**

1. Esmane kontroll leidis P2 erinevused: brauseri enda kuupäeva- ja töötajavalikud, raskepärane kuva menüü, ebavõrdsed filtrilaiused, must vaikimisi fookusserv, kokkusurutud kliendiotsing, teenusegrupi vorm, liikmete tabel ja ettevõtte vormid.
2. Parandused: ühine `DatePicker` + `MonthCalendar`, kujundatud `DropdownMenu`, võrdsed filtrid, bränditud `:focus-visible`, kliendivaate oma paigutus, paneelide ühine vormirütm ja liikmete kaartvaade.
3. Järelkontroll samades olekutes ei leidnud allesjäänud P0/P1/P2 kujundus- ega kasutatavusvigu. Omaniku hero foto puudumine on teadlik sisendiootus, mitte asendusgraafikaga peidetud kõrvalekalle.

**Findings**

- P0/P1/P2 leide ei jäänud.
- P3: hero meediaraami lõplik kadreering tuleb üle vaadata pärast omaniku foto lisamist.

**Primary interactions tested**

- Avalehe peamenüü ja tegevusnupud.
- Halduse peajaotiste vahetamine.
- Kuukalendri avamine ja klaviatuurirollide kontroll.
- Töötaja rippmenüü avamine ning valikuolek.
- Klientide, teenuste, meeskonna ja seadete kitsas paigutus.
- Ilutegu teenuseteekond kuni ühe spetsialisti kaardini; kaart on kitsas vaates keskel.

**Implementation checklist**

- [x] Töölaua- ja kitsas vaade renderdatud.
- [x] Olulised avatud, valitud, fookus- ja tühiolekud kontrollitud.
- [x] Avalehe, halduse ja broneerimisvoo konsoolivead kontrollitud.
- [x] Kõik P0/P1/P2 leiud parandatud ja uuesti võrreldud.

**Follow-up polish**

- Lisa omaniku antud hero foto ilma automaatselt loodud asenduspildita ja kontrolli kadreering mõlemas värvirežiimis.

final result: passed
