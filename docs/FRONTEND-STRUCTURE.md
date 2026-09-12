# Stiilide ja komponentide korraldus

12.09.2026: omaniku soovil eemaldati ajutine visuaalne kujundus. Alles on neutraalne HTML-i põhine vaade, funktsionaalne paigutus ja teemaseaded. Ei ole kujunduskaartide, ümarduste, suurte vahede ega rohelise vaikestiili kihti. Olemasolevaid ettevõtte salvestatud seadistusi ei kustutatud.

## Vastutused

| Asukoht | Vastutus |
| --- | --- |
| src/app/accessibility.css | Ainus globaalne baasfail: reset, dokumendi vaikeväärtused, fookus, vähendatud liikumine ja ligipääsetavuse miinimumid. Praegu 11 rida. |
| src/styles/theme.module.css | Hele/tume/kõrge kontrast/süsteemi sundvärvid: ainult CSS-muutujad ja color-scheme. Ei sisalda komponentide kujundust ega lehe paigutust. |
| src/lib/theme-contracts.ts | Salvestatava teema skeem, neutraalsed vaikeväärtused, lubatud fondid ja kontrastikontroll. |
| src/components/ui/button/, input/, select/, heading/, text-link/ | Iga kasutusele võetud primitiivi oma TSX ja CSS Module. Natiivsed props, ref, sündmused ning ligipääsetavuse atribuudid säilivad. |
| src/components/ui/calendar-surface/ | Kalendripinna semantiliste värvide sidumine; kuupäeva-, saadavuse- ja broneerimisloogikat siin pole. |
| src/components/ui/theme/ | Teemakonteiner, vaate-eelistus, režiimivalik ja logo. Logo ning vaatevaliku stiilid on oma failides. Teemakonteiner ei kujunda enda sees kõiki nuppe ega pealkirju. |
| src/components/ui/scroll-region/ | Jagatud keritava ala primitiiv; kasutusel halduse tabelite ümber. |
| src/components/admin/theme/ | Redaktor, värviväljad, logoväljad ja eelvaade: igal oma CSS Module. |
| src/components/booking/ ja src/components/booking-flow.module.css | Broneerimise komponentide kohalikud reeglid, nt mitmerealised tingimused ja hinna eraldi rida. |
| src/app/layout.module.css | Dokumendi paigutus. Lehe paigutus ei kuulu teemafaili. |
| src/components/marketing/, help/ | Praegu lihtne semantiline HTML. Oma stiilimoodul lisatakse siis, kui selle komponendi kujundus luuakse. Tühje mooduleid ette ei tehta. |

## Arendamise reegel

Teema annab väärtuse; primitiiv kasutab väärtust; komponent paigutab primitiivid; leht paigutab komponendid. Näiteks nupu värv tuleb muutujast --button, kuid nupu raam ja olekud elavad button.module.css failis. Teemamuutus ei muuda struktuuri ega teise ettevõtte kujundust.

Ära koonda reegleid ümbernimetatud globaalsesse faili: ka teemakonteineri all olevad kõiki button/input/h1 elemente kujundavad selektorid on keelatud. Kasuta komponendis otseselt sobivat primitiivi. Vana halduse veel ümbertegemata natiivsed elemendid säilitavad brauseri põhivälimuse; uusi stiile lisades liiguvad need vastava primitiivi või komponendi moodulisse, mitte globaalsesse faili.

Värviredaktori ja broneerimisvoo uued elemendid kasutavad nüüd primitiive. Säilisid CSS-muutujate kaudu kohandatavad värvid, font, logo, mustand, avaldamine, taastamine ja külastaja vaate-eelistused. Neutraalse nupu eristatavuse tagab kontrastne piirjoon; nupu täitevärv ei pea eraldi lehe taustast 3 : 1 erinema. Teksti ja valitud oleku kontrastikontrollid jäävad alles.

## Kontroll

npm run architecture:check (ka tootmisehituse alguses) keelab uute globaalsete CSS-failide importimise; erand on ainult juurpaigutuse accessibility.css. src/styles/ failides lubatakse vaid muutujate deklaratsioone ja color-scheme väärtust. Komponentide stiilide täpset kvaliteeti ja baasfaili kasvamist kontrollitakse ka koodiülevaatuses.

Visuaalne kujundus valmib hiljem omaniku juhiste järgi. Seda reeglit tuleb järgida ühtmoodi avalehel, broneerimises ja halduses.
