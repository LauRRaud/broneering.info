# Broneerimisvaate kohalik klaasikujunduse katse

14.09.2026. Omaniku näited: Beyondframesi poolläbipaistev menüü, kahekihiline kiirusevalik ning Ilutegu broneerimisvoo ekraanipildid. Soov: viimistleda olemasolevaid kaarte, nuppe, fonte, värve ja hover-olekuid. Uut sisu ega ikoone ei lisatud. **Kohalik kujunduskatse; omaniku visuaalne vastuvõtt ja serverisse avaldamine on tegemata.**

## Muudatus

- Broneerimisvoog kasutab eraldi `src/styles/booking-material.module.css` materjalitokeneid. Fail sisaldab ainult CSS-muutujaid; paigutus ja elementide stiilid jäävad komponentide CSS Modules failidesse.
- Kategooria-, teenuse-, töötaja-, kalendri- ja kinnituskaardid kasutavad poolläbipaistvat pinda, tausta hägustamist, valgusserva ning mitut pehmet varju. Kaardi hover tõstab pinda 2 px ja tugevdab varju.
- Kiirmenüü on kahekihiline: suitsutooni välimine pind ja heledam aktiivne pill. Sammude nimetused kuvatakse tavapärases kirjapildis. Sammude sisu, õigused ja navigeerimine säilivad.
- Päevaosa valik, kellaajanupud, päise kuvavalik ja rippmenüüd järgivad sama materjali. Päisele lisati alumine vari. Kinnitusnupu ja valitud päeva põhivärv säilib läbipaistmatuna.
- Pealkirja kaal on 600 ning tähevahe veidi avaram. Vormiväljade sildid kasutavad põhifonti. Cormorant Garamond ja Manrope olid projektis juba kohalikult majutatud ja haldusest valitavad; uusi fondifaile ega välist fonditeenust ei lisatud.
- Kohaliku Ilutegu demo hele palett muutus neutraalseks halliks ja rõhuvärvid hallikassiniseks; tume palett on suitsuhall. `scripts/local-ilutegu-theme.ts` avaldas kohalikus andmebaasis versiooni 5, säilitades versiooni 4 ja logod. Serveri teemaversiooni ei muudetud.
- Teiste ettevõtete värve ja fonte ei kirjutata üle. Klaasimaterjalid tuletatakse valitud teemast ning rakenduvad broneerimisvaatele. Ühised UI-primitivid kasutavad materjali ainult siis, kui ümbritsev komponent vastavad muutujad annab.

## Kontroll

- `npm run typecheck` ja `npm run architecture:check` läbisid (231 lähtefaili).
- `npm test -- tests/themes.test.ts`: 10/10.
- `npm test -- tests/booking-design-controls.test.ts tests/booking-final-step.test.ts tests/booking-steps.test.ts tests/month-calendar.test.ts`: 22/22.
- `npm run build` läbis.
- Kohalik brauser: kategooria → teenus → töötaja → aeg → andmed. Kinnituspäringut ei saadetud.
- Visuaalselt vaadatud hele, tume ja suure kontrastsusega kategooriavaade; heleda vaate kalender ja kinnitusvorm. Töölauakontroll 1440 × 900, mobiili kinnitusvaade 390 × 844. Mobiilivaates dokument 390 px lai, horisontaalset ülevoolu ei olnud. Kontrollitud e-posti välja klaviatuurifookus.

Suure kontrastsusega režiim eemaldab läbipaistvuse, hägustuse ja dekoratiivvarjud. Vähendatud liikumise, vähendatud läbipaistvuse, forced-colors ja puuduva backdrop-filter toe jaoks on CSS-is alternatiivid; neid brauseri emulatsiooniga selles voorus eraldi ei kontrollitud. Automaatne teemakontrasti kontroll hindab paleti põhivärve, mitte kõiki võimalikke läbipaistvate kihtide kombinatsioone. Erinevate ettevõtete kohandatud teemad vajavad visuaalset eelvaadet. Pärisseadmete, ekraanilugeja ja omaniku vastuvõttu see katse ei asenda.

## Omaniku täpsustus samal päeval

Kiirmenüü vertikaalset sisevahet vähendati 2,4 pikslini mõlemal küljel, säilitades aktiivse nupu mõõdud. Töölauavaate mõõdetud kapslikõrgus on 48,8 px (enne 56 px); nupp on endiselt 42,4 px. Ajasta märk tõsteti fikseeritud navigeerimiskihist tavalisse lehejalusesse. Brauseris 347,2 px kerimisel liikus märk koos dokumendiga sama palju, kiirmenüü asukoht ekraanil jäi samaks. Mobiilis säilib varasem märgi peitmise reegel.

Järgmise tagasiside järel muudeti kõrge kontrasti ja forced-colors režiimi materjalipiirjooned 2 px laiuseks (tavavaates 1 px). Kõrge kontrasti korral eemaldati ka kaartide hover-tõus, üleminekud, sisenemisanimatsioon ning valitud kaardi sisemine vari. Brauseris kontrolliti kõrge kontrasti kaartide ja kiirmenüü välimust ning kinnitati kaardil varju, teisenduse ja ülemineku puudumine. Arhitektuurikontroll läbis. See on kõrge kontrasti esitusparandus, mitte uus tervikvastuvõtt.

Klaasiefekti järgmises viimistluses vähendati kaartide täite läbipaistmatust 44%-ni, kalendril 52%-ni ja väikestel juhtnuppudel 32%-ni; lisati õrn suunatud valguspeegeldus. Kiirmenüü taust on 52% ja aktiivne pill 46% läbipaistmatusega. Pinnad kasutavad 14 px ning väikesed nupud 6 px taustahägustust, pehmemate varjudega. Põhinupp kasutab tugevalt toonitud 94% täidet. Need väärtused rakenduvad ainult hägustust toetavas tavavaates; ligipääsetavusrežiimide läbipaistmatus säilib. Kiirmenüü sisevahed on nüüd vertikaalselt 3,68 px ja horisontaalselt 3,2 px, viimane mitteaktiivne samm on kitsam. Mõõdetud kapslikõrgus 51,35 px, aktiivse nupu kõrgus endiselt 42,4 px.

Fonditäpsustus: kiirmenüü aktiivne nimetus ja kohtspikrid kasutavad nüüd halduses valitud pealkirjafonti (Ilutegul Cormorant Garamond 600); põhitekst jääb Manrope'iks. Kontrolliti WOFF2 failide sisemisi fondinimesid ning brauseri tegelikke renderdusfonte: nii lehe pealkiri kui kiirmenüü kasutasid `CormorantGaramond-SemiBold` veebifonti, kategooria kirjeldus `Manrope` veebifonti. Asendusfonti nende tekstide renderdamisel ei kasutatud. Fondid jäävad haldusest vahetatavaks.


## Hele elevandiluu-beeži palett (14.09.2026)

Kasutaja antud eeskuju põhjal kasutab kohalik Ilutegu demo nüüd radiaalset tausta #F7EDDE → #EADBC3 → #D5C2A6 koos õrna pruunika vinjetiga. Kaardid, päis ja kiirmenüü kasutavad #FFFCF6 30% klaastäidet, blur(5px) saturate(1.08) ning sooje pruunikaid varje. Väikesed nupud kasutavad 22% täidet ja blur(10px), hover 34%; paneelide hover 38%. Põhitekst on #181512; abiteksti jaoks kasutatakse kontrasti hoidvat läbipaistmatut #56514B. Fondid jäävad Cormorant Garamond ja Manrope.

Tausta kesk- ja servatoon on halduse paletis muudetavad valikulised backgroundMid/backgroundEdge väljad; vanadel teemadel kasutatakse nende asemel põhitausta. Kontrastikontroll hõlmab ka uusi gradienditoone. See kontrollib värvipaare, mitte kõiki vinjeti ja läbipaistvate pindade kompositsioone. Tumedal režiimil säilib varasem materjal; kõrge kontrast ja vähendatud läbipaistvus kasutavad läbipaistmatuid pindu.

Kohalik teema versioon 6 avaldati ainult localhost:55433 demoandmebaasis, versioon 5 ja logod säilisid. Serverisse ei avaldatud.

Kontrollid: themes.test.ts 11/11 (sh gradienditoonide salvestamine, avaldamine, varasemate teemade ühilduvus ja loetamatu servatooni tagasilükkamine), locales.test.ts 7/7, tootmisversiooni build koos TypeScripti ja arhitektuurikontrolliga, git diff --check. Brauseris kontrolliti heledat, tumedat ja kõrge kontrasti vaadet; arvutatud CSS kinnitas 30% klaastäite, 5px hägustuse ning mõlemad taustagradiendid. Loomulikus brauserivaates horisontaalset ülevoolu ei olnud. Demo jäeti heledasse režiimi.


## Soe tume palett (14.09.2026)

Kasutaja tumeda eeskuju põhjal on demo tumeda tausta radiaalne gradient #191410 → #100D0A → #090807 ning vinjett must 50%, läbipaistev kuni 46%. Tekst #F5EFE5, aktsendid #D1B692 ja #E2C39E. Abitekst kasutab kontrasti hoidvat läbipaistmatut #BDB8B1.

Klaaspaneelid ja menüü kasutavad #3A393C 40% täidet; aktiivne/hover pind #48474A 50%. Väikesed nupud kasutavad #323134 26%, hover #424144 38%. Hover-toonid tuletatakse halduse pindade värvidest suhtelise RGB abil, et värviseaded säiliksid. Menüül ja päisel blur(5px) saturate(1.08); suurtel paneelidel ja väikestel nuppudel blur(10px). Varjud on mustad, paneelide hele serv 14%, väikeste nuppude varjurõngas 10%. Menüühägustusel on eraldi token, mille ligipääsetavusrežiimid lähtestavad.

Kohalikus demoandmebaasis avaldati versioon 7; versioon 6 ja logod säilisid. Hele palett ja fondid ei muutunud. Serverisse ei avaldatud.

Kontrollid: paleti kontrastikontroll, themes.test.ts 11/11, tootmisversiooni build koos TypeScripti ja arhitektuurikontrolliga, git diff --check. Brauseris vaadati heledat ja tumedat vaadet ning kontrolliti tegelikke gradiendi-, täite- ja hägustusväärtusi. Kõrge kontrasti režiimis kinnitati läbipaistmatu must pind, 2px serv ja hägustuse puudumine. Demo jäeti tumedasse režiimi.


## Pealkirjade tähevahe ja ringkursor (14.09.2026)

Pealkirjade ühine tähevahe on nüüd 0.01em (põhipealkirjad, kategooriad, töötajad, kokkuvõte ja kalender). Lisatud on broneerimisvaatesse eraldi cursor CSS-moodul: 32×32 SVG-kursor keskse 16/16 puutepunktiga, väike kuldne ring ning suurem ring klikitavatel elementidel. JavaScripti hiirejälgimist ei kasutata. Tekstiväljadel säilib brauseri tekstikursor. Kursor rakendub ainult hover-toega täpsele osutusseadmele; kõrge kontrasti ja forced-colors režiimis kasutatakse tavalisi kursoreid.

Kontrollid: brauseri arvutatud CSS kinnitas mõlema kursori URL-i ning tekstiväljade auto-kursori; kõrges kontrastis taastusid auto/pointer väärtused. Mõlemad SVG-failid tagastati HTTP 200 ja image/svg+xml tüübiga. Arhitektuurikontroll ja git diff --check läbisid.


## Töötajakaardi kontaktimenüü (14.09.2026)

Eraldi telefoni- ja infonuppude asemel on üks 44px kolme punktiga klaasnupp. Menüüs on olemasoleva tutvustuse korral Info ning kehtiva telefoninumbri korral Helista koos numbriga. Isikliku avaliku numbri puudumisel kasutatakse ettevõtte numbrit selge ettevõttele helistamise sildiga. Puuduvate andmetega tegevusi ei näidata. Info kasutab senist tutvustusdialoogi; töötaja valimine jääb kaardi põhialale. Vana eraldi telefonipopover eemaldati.

Menüü avaneb suurel ekraanil nupust paremale ja korrigeerib oma horisontaalset asendit vastavalt ekraani laiusele. Kaart tuuakse avatud menüüga teiste kaartide ette. Klaviatuur: nooled, Home/End, Escape ning fookuse taastamine pärast tutvustuse sulgemist. Telefonilinkide valideerimine säilis.

Kontrollid: staff-contact.test.ts ja locales.test.ts kokku 11/11; tootmisversiooni build koos TypeScripti ja arhitektuurikontrolliga; git diff --check. Brauseris kontrolliti info avamist ja sulgemist, fookuse taastumist, heledat/tumedat/kõrge kontrasti menüüd ning mobiili 390×844: menüü parem serv oli 382px, jättes 8px ekraanivaru. Helistamist ei käivitatud. Muudatused on kohalikud.


## Avanevate menüüde hägustus ja ühised kontrastiservad (14.09.2026)

Päise, keele/kuva pilli ning töötajakaardi hägustatud taust viidi eraldi pseudoelemendile. Konteiner ise ei moodusta enam backdrop-filter juurt, mis takistaks tema sees avaneval menüül lehe sisu hägustamist. Keele- ja kuvamenüü kast kasutab 10px hägustust; pill kasutab menüü klaastäidet, oma taustakihi hägustust ja menüüvarju. Kõrges kontrastis jäävad pinnad läbipaistmatuks.

Ühine --ui-border-width on tavarežiimis 1px ja kõrges kontrastis/forced-colors režiimis 2px. Komponentide fikseeritud ühepikslised CSS-piirjooned asendati selle tokeniga ka halduse, turunduslehtede, juhendi ja broneeringu muutmise vaadetes. Klaasmaterjali servatoken kasutab sama vaikimisi väärtust. DropdownMenu väline serv on kõrges kontrastis puhas valge, ilma varasema läbipaistva värviseguta.

Kontrollid: 18 testi (booking-design-controls, staff-contact, booking-final-step, month-calendar), build koos TypeScripti ja arhitektuurikontrolliga. Brauseris kinnitati keelemenüü blur(10px) ja hägustatud eellaskonteinerite puudumine. Kõrge kontrasti menüüserva 2px teemaväärtus ja valge värv kinnitati nii Ilutegu demos kui Ajasta avalehel (brauseri suumi tõttu arvutatud CSS-serv 1.6px). Avalehe testieelne režiim taastati. CSS-otsing ei leidnud komponentidest enam fikseeritud 1px border-deklaratsioone. Muudatused kohalikud.


## Teenuseridade lihtsustamine (14.09.2026)

Üldise Button-primitivi automaatne backdrop-filter eemaldati: see tekitas klaasja konteineri sees läbipaistvatele nuppudele teise heleda kasti, kalendripäevadele ja kiirmenüü väikestele nuppudele üleliigse klaasikihi. Klaas on nüüd nende komponentide enda pinnal, mis seda selgelt vajavad (kaardid, menüüd, aktiivne samm ja töötaja menüü avaja).

Teenuseread kasutavad ühte klaaspinda, väiksema ulatusega varju, rahulikku hover-olekut ilma ülesnihketa ning sisemise kasti asemel läbipaistvat valimisala. Infonupu ikoon on 21px ja puuteala 44px; hover on kerge läbipaistev toon, mitte läbipaistmatu valge ketas. Säilisid valitud rea ja klaviatuurifookuse märgistus ning kõrge kontrasti tugevad servad.

Kontrollid: booking-design-controls ja month-calendar testid 9/9, build koos TypeScripti/arhitektuurikontrolliga. Brauseris vaadati heledat töölauavaadet ning 390×844 heledat, tumedat ja kõrge kontrasti režiimi. Valimisnupu arvutatud taust oli läbipaistev, backdrop-filter none; horisontaalset ülevoolu ei olnud. Vaade taastati heledaks ja brauseri mõõdupiirang eemaldati. Muudatused kohalikud.


## Ülejäänud avanevate akende ja nuppude ülevaatus (14.09.2026)

Ühtlustati ettevõtte, teenuse, töötaja, muutmispoliitika ja tingimuste dialoogide materjal ning sulgemisnupud. Dialoogi ühine klaas on 82% teemavärvi täitega ja 18px hägustusega, et pikem tekst säiliks loetavana. Kõrge kontrasti ja vähendatud läbipaistvuse režiimis on täide läbipaistmatu ning blur/vari puuduvad. Infoakende pealkirjad järgivad ühist tähevahet.

Korrastati kinnituse Muuda-valikute pillnupud, meeldetuletuse valikud, jagatud kuupäevavalija materjal (klaasteemasse kaasatud vaates) ja eduka broneeringu tegevusnuppude materjal. Läbipaistvatele nuppudele ei lisatud automaatset lisahägustust.

Kontrollid: booking-design-controls, booking-final-step ja staff-contact 15/15; build koos TypeScripti ja arhitektuurikontrolliga; git diff --check. Brauseris avati teenuse info, kinnituse muutmisvalikud ja 390×844 tingimuste aken; kontrolliti poliitikadialoogi kõrges kontrastis (must läbipaistmatu pind, blur none, shadow none, 2px servatoken). Eduka broneeringu vaadet ega eraldi admini kuupäevavalijat selle vooru brauserikontrollis ei avatud. Broneeringut ei esitatud. Muudatused kohalikud.
### Interactive-state refinement

Removed hover shadow rings and unified color/shadow transitions. Selected booking cards and time controls retain glass fill with a restrained lower selection mark. Form fields use neutral borders and a single focus border; reminder checkboxes use a custom checkmark. Confirmation and success actions use the glass primary treatment. Staff initials use a translucent disc; restored the action menu anchor in the upper corner. Local Ilutegu theme version 8 replaces remaining light-theme brown action colors with neutral tones.

Validation: 29 tests passed across booking-design-controls, booking-final-step, month-calendar, staff-contact and themes; production build and architecture check (231 source files) passed. Browser checks covered light staff/confirmation fields, dark confirmation and high-contrast calendar. Reminder checkboxes and success view were source-reviewed, not exercised in the demo because reminders are not shown and no booking was submitted. Changes are local.

### Company contact dialog refinement

Company info now uses a warm, softly blurred backdrop, quieter contact links, a glass map action and grouped contact labels (two columns on wider screens, stacked on mobile). Corrected demo email and its mailto destination to terts75@gmail.com in seed data and the local demo database. Verified the open dialog at default and 390px widths. Company-info test and architecture check passed. No production data changed.

### Button visibility, calendar and compact header

Added a shared neutral control border for modal actions, close buttons, staff actions, confirmation and time controls. Dialogs now use a warmer surface/background blend. Calendar and time selections use a complete border and soft shadow rather than the lower inset mark. Staff initials use the same active glass fill as the quick-menu label. Compact company info is now a separate glass button adjacent to preferences; the header was checked at 390px. Added theme-colored input autofill handling (native saved-entry popup is browser-controlled; actual saved autofill was not exercised).

Validation: 19 tests passed (company-info, booking-design-controls, month-calendar, booking-final-step, staff-contact), production build and architecture check passed. Browser visual checks covered company modal, selected date, staff initial and compact header. Local changes only.

### Borderless controls and arrow cursor

Replaced visible normal-theme action and dialog borders with transparent borders and stronger soft shadows. Removed the lower selection stripe from cards, removed telephone/email underlines, and added tail-free arrow cursor assets with a precise tip hotspot. Normal/focused booking fields now use the same opaque theme fill as autofill, avoiding the previous normal-versus-autofill color difference. High-contrast borders remain available. Browser checked the company dialog, header, selected category and focused confirmation inputs; native saved autofill preview was not exercised. Ten related tests passed; production compilation/type checking was run (the final calendar-only border adjustment followed compilation).

### Progress, staff profile and tenant cursor settings

Raised the fixed progress menu by 8px and removed competing intrinsic-width/text-width transitions that clipped labels during step changes. Increased staff-card and avatar sizes. Unified shared dialog backdrops with the warm blurred company dialog. Softened booking field outlines with inset depth; strengthened today's calendar outline and display-menu heading.

Added optional cursor, cursorHover and cursorOutline palette fields to the existing tenant theme editor, localized in ET/EN/RU. Both mode palettes flow through the existing versioned save/publish system. Existing themes resolve light ivory/light gold defaults. Cursor SVG data URLs are generated from validated hex colors with defensive fallback; high-contrast/native-pointer behavior remains. No database migration or publication required for old themes.

Validation: 31 tests passed including cursor config round-trip, old-theme defaults and invalid-value protection; production build and architecture check (232 source files) passed. Browser checked step changes, enlarged staff card, staff profile modal and generated cursor styles. Admin save/publish interaction was not exercised in the browser. Local changes only.

### Confirmation detail refinements

Removed the service-dialog border override. Reminder checks now use a centered inline SVG above the semantic input. Contact fields keep a 2px inset edge in both idle and focus states, with a darker focus tone; autofill keeps the same edge. Moved price from the metadata list to the confirm action row and removed the former last-row price CSS. Removed remaining progress-label and tooltip transitions. Browser checked confirmation layout and checked/unchecked reminders; 11 related tests passed after final edits.
