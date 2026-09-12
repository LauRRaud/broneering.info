# Ettevõtte kujundusseaded

12.09.2026: kujundusredaktor on teostatud **kohalikus versioonis**. Serverit ei uuendatud. Lõplik visuaalne disain jääb omaniku otsustada; praegune kujundus on tagasihoidlik funktsionaalne alus.

## Kasutamine

Halduses ava oma ettevõtte „Broneerimislehe kujundus”. Omanik või theme.publish õigusega vastuvõtutöötaja saab valida kummalegi režiimile 16 värvi ja eraldi põhiteksti- ning pealkirjafondi. HEX-koodi saab sisestada ka käsitsi. Kaasasolevad veebifondid laaditakse meie serverist; täpsem hilisem laiendus on kirjas allpool.

1. Vali „Ettevõtte tähis päises” all nimi või logo ning muuda soovi korral heleda ja tumeda vaate värve ja fonti. Eelvaade muutub kohe.
2. Salvesta mustand. Avalik leht jääb endiseks.
3. Lisa või eemalda logo, kontrolli faili eelvaadet ja salvesta see mustandisse. Logo muutmise ajal peavad värvide ja fondi muudatused olema salvestatud.
4. Kontrolli heledat, tumedat ja kõrge kontrastiga eelvaadet ning modaalinäidist. Salvesta ning ava soovi korral päris broneerimissammude eelvaade: selles ei saa kinnitada broneeringut.
5. Paranda kontrastikontrolli näidatud paarid ja avalda. Uuesti laaditud broneerimisleht ja manustatud vaade kasutavad sama versiooni.
6. Varasema avaldatud versiooni saab taastada mustandisse. See asendab olemasoleva mustandi; avaldamine on eraldi samm.

Ühine kasutusjuhend asub /juhend#kujundus ja selle allikas on src/content/user-guide.ts.

## Logo

PNG, WebP ja JPG; algfail kuni 10 MB ja 40 megapikslit. **Taustaga logo on lubatud.** Läbipaistvus on soovitus, mitte nõue. Tausta ei eemaldata ega värve pöörata ümber. Töötlus säilitab alfa, eemaldab metaandmed ja salvestab kuni 800 × 400 piirdesse mahtuva WebP-pildi (kuni 512 KiB). Proportsioonid säilivad. SVG ja animeeritud failid ei ole toetatud.

Heleda ja tumeda tausta jaoks saab salvestada eraldi logo; ühe puudumisel kasutatakse teist. Kõrge kontrastiga režiim eelistab tumeda tausta varianti. Päises saab kuvada ainult ettevõtte nime või ainult logo. Nime valimine säilitab logo failid ning nimeallikas on ettevõtte profiil. Logo puudumisel või vastava variandi laadimisveal kuvatakse nimi. Logo kasutamisel säilib ettevõtte nimi ekraanilugejale pealkirjana, kuid seda ei korrata visuaalselt. Logo visuaalset loetavust kontrollib kasutaja eelvaates.

Valik salvestub kujunduse JSON-seadistusse `brandDisplay` väärtusena `name` või `logo`, mistõttu eraldi andmebaasimigratsiooni pole vaja. Mustandi, avaldamise ja taastamise reeglid kehtivad ka sellele väljale. Vanem ilma selle väljata kujundus näitab olemasolevat logo või selle puudumisel nime. Uue kujunduse vaikevalik on nimi. `BrandIdentity` ning `BrandLogo` kasutavad oma CSS Module faile; globaalset CSS-i ei laiendata.

## Õigused ja andmed

- Kõik seadistused kuuluvad ettevõttele. Tema teema ei muuda teisi ettevõtteid, Ajasta kodulehte ega halduse brändivärve.
- Haldus-API nõuab täpset haldusdomeeni, autentimist, värsket liikmesust ja theme.publish õigust. Kirjutamine kontrollib ka Origin päist ja päringusagedust.
- Mustandi versioon, revisjon ja praegune avaldatud versioon kontrollitakse tenant-luku all. Aegunud salvestus saab 409 ja peab värske seisu laadima.
- Avalik kataloog ja logo-API väljastavad ainult selle domeeni ettevõtte avaldatud kujunduse. Mustand ja arhiivi logod on avalikult kättesaamatud.
- Kujunduse eelvaatel on eraldi GET-only API. See lubab theme.publish õigusega lugeda kataloogi ja aegu ka aktiivse päriskliendi puhul; broneeringu loomist selle kaudu ei ole.
- theme_configs kasutab olemasolevat FORCE RLS-i ja avaldatud versiooni muutmatuse päästikut. Logo baidid on versiooni juures; seetõttu on salvestus, avaldamine ja taastamine atomaarne ning andmebaasi varukoopia sisaldab pilte.
- Migratsioonid 050 ja 051 lisavad revisjoni, kaks piiratud bytea logo välja ning INSERT/UPDATE õigused booking_app rollile. Varasem logo_media_id skeem jääb alles; see teostus ei loo väliseid meediafaile.
- Andmeeksport sisaldab kujunduse versioone, seadistusi ning logode WebP base64-kuju. Avaldamine ja logo muutmine jätavad auditikirje.

## Komponendid ja ligipääsetavus

Teemamuutujad on src/styles/theme.module.css failis. Jagatud teemakomponendid paiknevad src/components/ui/theme all, redaktor src/components/admin/theme all ja broneerimisvaate stiilid src/components/booking all. Suurt globals.css faili ei lisatud.

Vaade → seadme järgi / hele / tume; kõrge kontrast on eraldi valik. Eelistus salvestub samal domeenil küpsisesse. Keelatud kolmanda osapoole küpsise korral toimib valik avatud aknas. Kõrge kontrast kasutab kindlat musta/valge/kollase paletti; operatsioonisüsteemi forced-colors režiimi ei blokeerita. Valik on tähistatud ka aria-pressed ja allajoonimisega, mitte ainult värviga.

Avaldamise serverikontroll nõuab põhiteksti, pealkirja, lingi, nupu ja kalendri tekstipaaridel vähemalt 4,5 : 1 ning kontrollitud piirete, nuppude ja valiku eristusel vähemalt 3 : 1. Tulemusi ei ümardata enne võrdlemist. Madala kontrastiga mustand on lubatud, avaldamine keelatud; kasutaja saab taastada kontrollitud vaikevärvid. Kujundusvärve ei muudeta salaja.

See ei ole kogu süsteemi WCAG 2.2 AA ega EN 301 549 vastavustunnistus. Ekraanilugeja käsikatse ja sõltumatu kasutajavastuvõtt on veel vajalikud.

## Piirid

Kategooriapiltide ja ikoonide redaktor, oma fondifaili üleslaadimine ning sisemise halduskalendri töötajate/olekute värviseaded ei kuulu sellesse valminud redaktorisse. Avalikus kalendris saab muuta tausta, teksti ja valitud aja värve; tänase päeva jaoks eraldi värviväli puudub. Nuppude hover-olek ei kasuta uut kontrollimata värvi. Lõplik Ilutegu logo, brändivärvid ja kujunduse kasutajavastuvõtt on ootel.

## Kontrollid 12.09.2026

Kogu automaattestide komplekt: 49 faili, 318 testi läbisid. Uued katsed hõlmavad kontrasti, avaldamise piirangut, värsket õiguskontrolli, ettevõtete eraldatust, paralleelset mustandi loomist, muutmatuid versioone ja taastamist, läbipaistvat ning taustaga logo ja aktiivse päriskliendi lugemise eelvaadet.

Kohaliku ajutise omaniku kontoga tehti brauseris värvi ja fondi muutmine, mustandi salvestamine, logo üleslaadimine ning avaldamine. Kontrolliti 390 px redaktorit, avalikku lehte, tumedat ja kõrge kontrastiga vaadet, küpsise abil säilivat režiimi, lehesisest vaadet ning päris widgeti modaali. Modaali Escape ja fookuse taastumine läbisid; akna kõrgus arvestab ka keele- ja vaatevalikut. Kujunduse eelvaates on kinnitamisnupp keelatud ja selle API POST vastas 405. Ajutine katseettevõte, konto, sessioon ja HTML-katseleht eemaldati; kliendiandmeid ei muudetud.

Tootmisehitus ja TypeScripti kontroll läbisid. Kohalik eelvaade jääb pordile 3117. Serverisse ei avaldatud.

## Kujunduse eemaldamine 12.09.2026

Omaniku järgneval soovil eemaldati ajutine visuaalne kujundus. Teemafunktsioonid säilivad; uus vaikekomplekt on neutraalne. Teemakonteineri üldselektorid asendati eraldi primitiividega ja redaktori alamosad said oma CSS-moodulid. Nupu eristus kontrollitakse nähtava piirjoone kaudu; tekst ja valitud olek peavad jätkuvalt kontrastinõuded täitma. Vt FRONTEND-STRUCTURE.md.

## Hilisem broneerimissammude kujundus — 12.09.2026

Omanik andis loa avaliku broneerimisvoo kujundamiseks. See lõik täiendab ülal dokumenteeritud varasemat neutraalset alust. Halduse ümberkujundamise plaan on eraldi.

Kummaski režiimis saab valida 16 värvi ning eraldi põhiteksti- ja pealkirjafondi. Lisandusid icons, navigation, cardBorder ja mutedText ning headingFont. Vanemad teemad kasutavad puuduvate väärtuste korral seniseid värve ja põhifonti. Ikooni ja navigeerimise kontrast nõuab vähemalt 3 : 1, abitekst 4,5 : 1. Dekoratiivne kaardipiir ei asenda interaktiivse elemendi kontrastikontrolli.

Lisaks kolmele seadmefontide komplektile on valikus kaasasolevad Manrope ja Cormorant Garamond. Fontide lähtekohad ja OFL-litsentsid: src/styles/fonts/README.md. Veebifondid laaditakse rakenduse enda domeenilt. Redaktori näidis sisaldab pealkirjafondi, abiteksti, ikooni, kaardipiiri ja tagasinuppu.

Ilutegu kohalik versioon 3 kasutab kasutaja lisatud logo ja kuldset paletti. Varasemad versioonid säilivad arhiivis; teiste ettevõtete vaikevärvid ei muutu. Avaliku päise menüüs tähistavad valikut linnuke ja menuitemradio/menuitemcheckbox olek.

Ikoonide värve saab muuta; SVG sisu üleslaadimise redaktorit ega vabalt programmeeritavat paigutust ei lisatud. Kujunduse kasutajavastuvõtt jätkub. Serveripaigaldust ei tehtud.
