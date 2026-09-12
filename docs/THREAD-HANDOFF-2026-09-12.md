# Ajasta arenduse jätkamine — 12.09.2026

> Praegust kohalikku seisu kirjeldab lõpus „Broneerimissammude kujundus”. Varasemad kujunduse ja SMS-i märkmed on ajaloolised.

Kasutaja palus pika vestluse järel jätkata uues ülesandes. Uut funktsiooni pole veel tellitud. Loe esmalt seda märkust ja AGENTS.md ning oota kasutaja järgmist soovi. Suhtle eesti keeles.

## Töökoht ja piirid

- Salvestatud projekt on `C:/Users/rauds/Desktop/Projektid/Broneerimise SaaS`; tegelik Git-repo selle all `broneering.info`.
- Jätka olemasolevas kohalikus repos: seal on palju selle vestluse salvestamata/commit'imata muudatusi. Ära lähtesta, puhasta ega kirjuta neid üle.
- Kasutaja eelistab ehitada demo arvutis valmis ja alles hiljem uuendada serverit. All kirjeldatud muudatusi pole serverisse paigaldatud.
- Kohalik Nexti demo: `http://ilutegu.localhost:3117/`, haldus `http://haldus.localhost:3117/`, ühine juhend `http://localhost:3117/juhend`.
- Kohalik DB kontrolliti: 127.0.0.1:55433, andmebaas booking. Enne migratsioone kontrolli ühenduse hosti, ära kuva paroole ega kogu .env.local faili.
- Dev server käivitati `AUTH_BASE_URL=http://haldus.localhost:3117` keskkonnamuutujaga, käsuga `npx next dev --hostname 127.0.0.1 --port 3117`. Eelmise ülesande exec session oli 79018; uues ülesandes kontrolli protsessi enne teise käivitamist.
- Build'i ajal peatati dev server, seejärel käivitati uuesti. Next dev muudab next-env.d.ts viiteid; seda faili on taastatud HEAD-i sisule, et kõrvalmuudatusi mitte jätta.

## Olulised kasutajakokkulepped

- Toote nimi on Ajasta. Tulevikus ajasta.ee on tooteleht, broneering.info juurdomeen suunab sinna ning kliendid jäävad nimi.broneering.info aadressidele. Ära väida, et DNS või serveri restart on selle märkuse alusel kontrollitud.
- Visuaalse kujunduse teeb kasutaja. Praegu neutraalne funktsionaalne alus, mitte uus brändidisain.
- Ei mingit pikka globals.css-i: primitiivid `src/components/ui/`, funktsioonikomponendid oma kaustades, eraldi CSS Modules. Teemad muudavad tokeneid. Globaalne accessibility.css on väike reset/ligipääsetavuse alus. AGENTS.md ja architecture-check jõustavad struktuuri.
- Hele, tume ja kõrge kontrast, klaviatuur ning ekraanilugeja tugi on olulised. WCAG 2.2 AA on siht, mitte saavutatud sertifikaat või tehtud täisaudit.
- Ilutegu on tulevane esimene klient. Kategooriad: Juuksur, Massaaž, Ripsmed, Küünehooldus (maniküür/pediküür). Osa demos olevaid kestusi on kasutaja loal näidisandmed; töötajad samuti näidisandmed. Ära mõtle välja päriskontakte.
- Üks ühine kasutusjuhend, millele viidatakse haldusest ja tootelehelt: `src/content/user-guide.ts`, `/juhend`.
- Ära lisa uuesti viimase sammu teksti „Kontot pole vaja. Broneeringu võid teha ka teisele inimesele.” Kasutaja palus selle eemaldada. Lühike andmekasutuse lause jäi alles.

## Valmis kohalikud funktsioonid

### Töötajad

- Töötaja täisnimi on alati olemas; pilt või automaatsed initsiaalid. Foto laadimisviga kasutab initsiaale.
- Töötaja foto üleslaadimine ja telefoni kaameravalik olid varem lisatud. Vana HTTPS-pildiaadress toimib samuti. Vaata `docs/STAFF-PHOTOS.md`.
- Valikuline `publicPhone` halduses. Tegelik Ilutegu telefon puudub, numbreid ei lisatud välja mõeldes.
- Infoikoon avab töötaja tutvustuse ja valikulise numbri koos tel-lingiga. Ei vali töötajat ega alusta kõnet automaatselt. Kui kumbagi pole, ikoon puudub.
- „Töötajad ja kontaktid” avaneb juba esimeses sammus, nii et helistamiseks ei pea teenust valima.
- Failid: `booking/staff-card`, `staff-info`, `staff-contacts`, `ui/avatar`, `lib/public-phone.ts`. Migratsioon 052 kohalikult rakendatud.

### Kalender

- „Vali aeg” sammus on püsiv kuukalender ja valitud päeva vabad ajad koos. Vähemalt 42rem laiuses konteineris kõrvuti, telefonis/kitsas iframe'is üksteise all.
- Valitud päeval linnuke, vabadeta päev läbikriipsutatud. Vabade aegadeta päeva saab valida, et saadavust värskelt kontrollida. Minevik/broneerimisaknast väljas on keelatud.
- Nooled, Home/End, Page Up/Down, Shiftiga aasta, Enter/tühik. Fookuse või kuu vahetamine ei vali kuupäeva.
- `ui/month-calendar/` sisaldab primitiivi ja UTC kuupäevaarvutust; `booking/time-picker` kompositsiooni ja kuu päringut.
- Avaliku ning mõlema admin-eelvaate availability API toetab `month=1`. `monthAvailability` kasutab sama pakkumiste mootorit (kestused, puhvrid, graafik, erandid, broneeringud), kuni 31 päeva. Päeva otsing lõpeb esimese pakkumise juures. Piiratud päringusagedus, olemasolevad ligipääsureeglid.
- Päeva valik ja lõplik kinnitus kontrollivad saadavust uuesti. Kuu ülevaate tõrge ei blokeeri päeva valikut. Hilinenud vastused jäetakse kõrvale.
- 49 seotud testi läbisid selle muudatuse järel. Brauseris kontrollitud 320/390 px, arvuti paigutus, klaviatuur ja forced-colors. Forced-colors valiku loetavus parandati lokaalses kalendri CSS-is. `docs/BOOKING-STEPS.md` uuendatud.

### Viimane samm, meeldetuletus ja tingimused

- Nimi ja e-post kohustuslikud, telefon valikuline. Kokkuvõttes ettevõte/aadress, teenus, töötaja, kuupäev, algus/lõpp, hind/kestus, tühistamise etteteatamisaeg.
- Uus märkimata valik „Soovin meeldetuletust e-postiga”. Ilmub ainult siis, kui ettevõttel on reminder_minutes määratud ning saatmishetk veel tulevikus.
- Kohalik Ilutegu demo seadistati 1440 minutile (24 h). Päriskirju ei saadeta; demo saatmiskaitse jäi alles. SMS ei ole teostatud.
- Uus avalik vorm saadab alati `emailReminder` boolean'i. `bookings.customer_reminders` on eraldi `customer_notifications` väljast; kinnitus, muudatus ja tühistus jäävad alles ka meeldetuletusest loobumisel.
- Migratsioon 053 kohalikult rakendatud. Vana API/vanad ja käsitsi lisatud broneeringud säilitavad varasema vaikekäitumise.
- Järjekord, teavituste seadete muutmine, impordi meeldetuletuste lubamine ja saatja austavad meeldetuletuse valikut. Eelistus on sündmuse hetkeseisus ja ekspordis. Ebaselge kinnituse korral sama idempotentne sisu, linnuke lukus.
- Kinnitusnupu eel lause „Broneeringu kinnitamisega nõustud broneerimistingimustega”. Allajoonitud linknupp avab ettevõtte `booking_terms` lihtteksti natiivses dialoogis.
- Ettevõte muudab teksti halduses „Ettevõtte seadistamine ja avaldamine” → „Broneerimistingimused”. Olemasolev expectedRulesVersion kontroll peatab vananenud tingimustega kinnituse.
- Natiivne dialog, sulgemisnupp/Escape ja fookuse tagastus kontrollitud päris brauseris, sisestatud väljad/linnuke säilivad. 320 px dialoog ei tekita külgkerimist.
- Failid: `booking/booking-reminder`, `booking/booking-terms`, `ui/dialog`, `docs/BOOKING-REMINDERS-AND-TERMS.md`. Selle muudatuse 97 seotud testi läbisid.

### Kujundus ja viimane tehtud muudatus: logo või nimi

- Teemaredaktor oli varem valmis: heleda/tumeda paletid, fondid, logod, mustand/avaldamine/taastamine, versioonikontroll, õigused, kontrastikontroll. Logod lubavad nii läbipaistvat kui ka taustaga pilti. Migratsioonid 049–051 kohalikult rakendatud.
- Viimane soov: haldaja valib päise vasakusse ossa ettevõtte logo VÕI tekstilise nime. See on nüüd tehtud.
- Haldus → „Broneerimislehe kujundus” → „Ettevõtte tähis päises” → „Näita päises”: Ettevõtte nimi / Logo.
- `ThemeConfig.brandDisplay` on valikuline `name|logo`, salvestub olemasolevasse JSON-i, eraldi migratsiooni ei vajanud. Uue teema vaikevalik `name`; vanem väljapuudumisega teema kasutab olemasolevat logo või nime.
- `ui/theme/brand-identity` hoiab h1 nime ekraanilugejale alles ka logo korral; visuaalselt nime ei korrata logo kõrval. `brand-logo` näitab ühe variandi vea korral nime, uus logo-URL proovib uuesti laadida. Nime valik ei kustuta logosid.
- Päis ja halduse näidise eelvaade kasutavad sama identiteedikomponenti. CSS-failid eraldi, globals ei kasvanud. Juhend ja `docs/THEME-SETTINGS-REQUIREMENTS.md` uuendatud.
- Kasutaja lisatud ILUTEGU logo kuvatõmmis oli näide soovitud võimalusest; seda ei laaditud automaatselt ettevõtte logoks.

## Viimane kontrollitud seis

- Logo/nime muudatuse järel: `tests/brand-identity.test.ts`, `tests/themes.test.ts`, `tests/booking-steps.test.ts`: 19 testi läbisid.
- `npm run typecheck`, `npm run build` (sh architecture-check, 201 lähtefaili) läbisid. `git diff --check` ilma vigadeta, ainult tavapärased CRLF/LF hoiatused.
- Dev taaskäivitatud ning Ilutegu kohaliku lehe HTTP vastus 200.
- Ajutised Playwright brauserid on suletud. Browser-testide märkmed/screenshotid on `output/playwright/` all, ajutised skriptid `output/` all. Need pole kasutajajuhendi lisaversioonid.
- Serverisse pole deploy'd tehtud. Järgmine arendussuund tuleb kasutajalt; ära alusta iseseisvalt kujundust, SMS-i integratsiooni, DNS-i muudatusi ega serveripaigaldust.

## Hilisem täpsustus: halduse struktuuri plaan

- Jätkuvestluses arendati välja halduse põhisuund **Broneeringud · Kliendid · Teenused · Meeskond · Seaded**, eraldi kasutajakonto ja Ajasta platvormihalduse kontekstiga.
- Täielik lähteplaan, olemasoleva teostuse piirangud ja veel lahtised kujundusotsused on failis [ADMIN-STRUCTURE-PLAN.md](ADMIN-STRUCTURE-PLAN.md).
- Kasutaja palus ainult plaani kirja panna: **kujundust veel ei tee**. Plaani salvestamine ei tähenda uue halduse teostust ega luba alustada maketti või serveripaigaldust.

## Broneerimissammude kujundus — hilisem 12.09.2026 seis

See lõik asendab varasemad märkmed broneerimisvoo kujundamise keelu, vana kalendri välimuse ja SMS-i täieliku puudumise kohta. Kasutaja andis loa kõigi avalike sammude kujundamiseks ja iseseisvaks viimistlemiseks. Halduse ümberkujundamine on jätkuvalt ootel.

- Viimane eelistus on kuldne, mitte punane. Ilutegu kohalik avaldatud teema on versioon 3, body modern (Manrope), heading editorial (Cormorant Garamond), olemasolev logo säilib. Muud ettevõtted ei muutu.
- Voog: src/components/booking-flow.tsx ja booking/ CSS-moodulid. SVG-d public/icons/booking/. Kaartidel pole hover-liikumist. Üks kestusevariant on kompaktne, mitu kõrvuti; lisahindu/kestusi kataloogi ei mõeldud välja.
- Päise demo-/ettevõtteinfoteade ja varane töötajate kontaktipaneel eemaldati. Töötajainfo avaneb kaardinurga nupust. Teenuse kirjeldus selgitab sisu; 34 kohaliku demo tehnilist kohatäidet asendati pealkirjale vastava tekstiga. Hinnad/kestused säilisid. Skript scripts/local-ilutegu-descriptions.ts, sisu src/content/ilutegu-demo-descriptions.json, varukoopia output/ilutegu-service-descriptions-before-design.json.
- Kalender kasutab ringolekuid. Hommik/Päev/Õhtu on vahekaardid. Valimine viib edasi; tagasinupp on väike ümar vasakmärk progressi kõrval. Kinnitusnupp kuni 20rem, keskel. Meeldetuletuse aeg on väike hall lisarida.
- Tingimuste dialoog on ümardatud ja ristiga. Vidina modaali päise X sulgeb akna; sisemise dialoogi Escape jätab broneerimise avatuks. Sulgemine/uuesti avamine säilitab vormi. Brauserikatse kasutas tegelikku widget/v1.js, EmbedFrame'i ja BookingFlow'd lokaalses POST-keeluga fixtures.
- Migratsioon 054 on kohalikult rakendatud. SMS-i demovalik nõuab telefoni ja salvestub customer_sms_reminders väljale, sündmusse ning eksporti. Pärisettevõttel on see keelatud. Tegelik SMS-i teenusepakkuja/saatmine on tegemata.
- Teemas lisaks icons, navigation, cardBorder, mutedText ja headingFont. Vanemate teemade jaoks ühilduvad vaikeväärtused. Fontide OFL-litsentsid src/styles/fonts/ all.
- Tootmisehitus, TypeScripti ja arhitektuuri kontroll läbisid. Seotud testid läbisid. tests/booking-design-controls.test.ts kontrollib menüü klaviatuuri, päevaosi ja kolme tegeliku ID-ga kestusevarianti. SMS-i testid kontrollivad telefoni, korduspäringut, salvestust, eksporti ja pärisettevõtte tõket.
- Kohalik demo http://ilutegu.localhost:3117/. Kujundust ega migratsiooni 054 ei ole serverisse paigaldatud.

Tumeda vaate kontrollis oli Ilutegu olemasolev tume logofail vähese kontrastiga. Logo värve pole automaatselt ümber pööratud; selle variandi loetavus vajab heledamate tähtedega lähtefaili või omaniku valitud tausta. Heleda vaate logo toimib.
