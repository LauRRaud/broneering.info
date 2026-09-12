# Broneerimise kompaktsed sammud

Omaniku 12.09.2026 nõue: nii eraldi lehel kui ka modaalis on korraga nähtav üks valikusamm. Pikk ettevõtte tutvustus, tulevaste sammude nupuloend ja kõigi teenuste kirjeldused ei täida algvaadet.

## Käitumine

1. Mitme teenusegrupi puhul valib klient esmalt kategooria. Kategooriata teenused on „Muud teenused” all. Ühe grupi puhul algab voog teenustest.
2. Teenusevaade näitab ainult valitud grupi teenuseid, kestust ja hinda. Pikem kirjeldus avaneb „Teenuse lisainfo” alt. Üle kaheksa teenusega grupis on otsing.
3. Teenuse valimine asendab loendi töötajavalikuga. Ühe sobiva töötaja või töötaja otselingi puhul minnakse ajavalikusse.
4. Töötaja järel valitakse kuupäev ja konkreetne aeg. Aja järel avaneb kontaktandmete ning lõpliku kokkuvõtte vaade.
5. „Tagasi” säilitab olemasolevad valikud ja sisestatud kontaktandmed. Uue kategooria valimine tühjendab sellega mittesobiva teenuse-, töötaja- ja ajavaliku.

Ettevõtte nimi ja demo tähistus säilivad. Aadress, tutvustus ja tingimused on valikusammudes avatava lisainfo all. Tingimused kuvatakse enne lõplikku kinnitamist ka avatult. Fookus liigub uue sammu pealkirjale. Kujunduse teeb endiselt omanik.

## Failid ja kontrollid

[BookingFlow](../src/components/booking-flow.tsx) juhib olekut ning serveripäringuid; [teenuse- ja kategooriavalik](../src/components/booking/service-selection.tsx) ja [kompaktne päis](../src/components/booking/booking-header.tsx) on eraldi komponendid. Väikesed paigutusreeglid asuvad [CSS Module'is](../src/components/booking/selection.module.css). Globaalseid kujundusreegleid ei lisatud.

Eraldi leht, `/embed` ja administraatori eelvaade kasutavad sama BookingFlow komponenti. Manustamise päritolukontroll ning vidina sõnumileping ei muutu.

12 seotud testi läbisid: [sammud ja tagasiliikumine](../tests/booking-steps.test.ts), [ebakindla kinnituse kordus](../tests/booking-challenge-retry.test.ts), [manustamisleping](../tests/embed.test.ts). Kohalik tootmisehitus läbis. Playwrighti kohalikus katses kasutati päris vidinat, EmbedFrame'i ja BookingFlow'd koos loetava demokataloogi ja saadavus-API-ga: kategooria → teenus → töötaja → aeg → andmed ning Escape sulgemine koos fookuse taastumisega töötasid. Katse ei muutnud serveri lubatud manustamisaadresse ega loonud broneeringut.

Kohaliku brauserikatse failid ja kuvatõmmis asuvad ignoreeritud `output/playwright/booking-steps/` kaustas. Muudatus ei ole serverisse avaldatud: automaatne heakskiidukontroll peatas põhiharusse saatmise kuni selge avaldamisloani. Enne serveri uuendamist säilitada eelmine veebipilt, ehitada ja taasluua ainult web ning kontrollida valmisolekut, mõlemat demot ja olemasolevaid aadresse. Migratsioone see muudatus ei vaja.

Jätk 12.09: avalik kategooriavalik kasutab nüüd teenusegruppide tegelikku puuteed (mitte kaldkriipsu järgi jagatud nimesid). [Ilutegu demo](ILUTEGU-DEMO.md) ja [graafikute kasutus ning ajasoovituste ettepanek](SCHEDULE-EXPERIENCE.md). Omanik andis hiljem selge loa selle töö avaldamiseks.
