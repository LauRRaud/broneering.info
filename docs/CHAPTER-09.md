# Peatükk 09 — „Töötaja pole oluline” täpne loogika

Alus: arendusplaani peatükk 09, AT-01/05/06 ja konkurentsikontroll AT-11. Peatükk täpsustab ja kontrollib peatükkides 06–08 kasutusele võetud konkreetsete pakkumiste voogu. Kujundus jääb ootele.

## Käitumine

- Teenuse järel kuvatakse ainult aktiivse teenuseseosega, aktiivsed ja veebis broneeritavad töötajad. „Töötaja pole oluline” on esimene valik koos plaanis nõutud abitekstiga.
- See valik jätab kuupäeva samaks ja eemaldab varasema kellaaja. Serveri koondsaadavus on üksikute sobivate töötajate pakkumiste ühend; saadavuse lugemine ei loo broneeringuid.
- Sama algusajaga pakkumised jäävad eraldi nuppudeks. Iga nupp näitab töötajat, hinda ja kestust; ka võrdse hinna/kestusega töötajaid ei määrata automaatselt. Lisatud selgitus ütleb, miks samal ajal võib olla mitu pakkumist.
- Sobiv töötaja, kellel valitud päeval vabu aegu pole, jääb töötajate kataloogi. Kõigi töötajate ajavaates kuvatakse tema kohta kuupäevaga piiratud teade „sel päeval vabu aegu pole”. Teade ilmub alles pärast õnnestunud saadavuspäringut; laadimist või viga ei nimetata ajapuuduseks.
- Valitud pakkumine seob enne kinnitamist konkreetse töötaja, hinna, kestuse ning alguse/lõpu. Klient saab valida ainult praeguses edukalt laetud pakkumiste nimekirjas oleva pakkumise.
- Teenuse, töötaja või päeva muutmisel tuleb kellaaeg uuesti valida. Kontaktid säilivad avatud vaate mälus. Katkestatud/aegunud saadavusvastus ei kirjuta uut valikut üle.
- Kui valitud aeg hõivatakse või hind/kestus muutub, lükkab server vana pakkumise tagasi. Teise töötaja vaba aeg ei muutu automaatselt broneeringuks ega kinnituseks. Uus valik vajab kliendi tegevust.

## Kontrollid 08.09.2026

**81 rakenduse testi läbivad** ja kohalik tootmisbuild läbib. Neli uut PostgreSQL-i testi:

1. Koondsaadavus võrdub täpselt kolme töötaja üksikpakkumiste ühendiga. Ühel algusajal säilivad kaks võrdset 30 min / 25 € pakkumist ja erinev 45 min / 40 € pakkumine. Korduv lugemine annab sama järjekorra ega loo broneeringut.
2. Valitud töötaja hõivatud pakkumine saab SLOT_UNAVAILABLE ka siis, kui kolleegi sama kellaaeg on vaba; andmebaasi ei teki teist broneeringut.
3. Valitud töötaja hinna/kestuse muutus saab OFFER_CHANGED, kuigi kolleeg pakub endiselt vana hinda/kestust; automaatset asendust ei tehta.
4. Töötaja teenusesobivus ja vabade tundide puudumine on erinevad: graafikuta töötaja jääb kataloogi, seoseta või suletud seosega töötaja ei kuulu selle teenuse valikusse.

Brauseris kasutati ajutist kohalikku ettevõtet. Karl pakkus lõikust 30 min / 20 €, Mari 45 min / 35 € ja Viivi pakkus teenust ilma vabade töötundideta. Kontrolliti:

- „Töötaja pole oluline” jättis päeva muutmata ja andmete sammu lukustatuks kuni kellaaja valimiseni. Samal kellaajal olid Karl ja Mari eraldi nähtavad; Viivi juures oli valitud päeva ajapuuduse teade.
- Päeva, töötaja ja teenuse muutmine eemaldas ajavaliku; nimi ja e-post jäid alles. Teenuse vahetamine ühe töötaja teenusele kohandas sammude arvu.
- Enne esimest kinnitamist oli andmebaasis null broneeringut, kuigi valikuid muudeti korduvalt.
- Kinnituse ette lisati sama Mari aja päris konkureeriv broneering. Kliendi kinnitus sai konflikti ja avas uued pakkumised. Karli sama kellaaeg jäi valimata, kuni test klõpsas seda ise. Kontaktid säilisid; andmebaasis oli endiselt ainult üks, algselt Marile tehtud konkureeriv broneering.
- 10. septembri saadavusvastust hoiti tagasi kuni 11. septembri vastuseni. Hilinenud vastus ei muutnud uut päeva ega pakkumist; kokkuvõttes oli 11. september ja kontaktid säilisid.

Ajutine ettevõte ja kõik selle testandmed eemaldati. Tootmises testbroneeringuid ei tehta.

## Avatud vastuvõtt

O-06 võimalik võrdsete pakkumiste automaatse töötajamääramise reegel on endiselt kinnitamata ja teostamata. Praegune voog jätab kõik konkreetsed pakkumised kliendile valida; sortimisjärjekord ei ole töötajamääramine. Selle peatüki töö ei kinnita ärireeglit omaniku eest.

Laiem brauserimaatriks, ligipääsetavuse tervikvastuvõtt ning päriskasutajatega prototüübitest jäävad peatükkidesse 12/25. Järgmine põhiteostus on peatükk 10: muutmine, tühistamine ja erandolukorrad.

08.09.2026 avaldati serverisse kood `f886a7c`. Serveri tootmisbuild läbis ja veebikonteiner käivitati uuesti. Skeemimigratsiooni ei lisatud; enne uuendust tehti `backups/before-chapter09.dump`. Avalik HTTPS-kontroll: health=ok, demo HTTP 200 ning Meeste lõikuse 09.09.2026 koondsaadavuse 56 pakkumist kattusid täpselt kahe töötaja üksikpakkumistega. Avaliku demo brauseris oli uus selgitus nähtav ja andmete samm lukus kuni ajavalikuni. Tootmise testbroneeringuid ei loodud.
