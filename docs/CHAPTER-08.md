# Peatükk 08 — kliendi broneerimisteekond

Alus: arendusplaani peatükk 08, D-09, valikute sõltuvused peatükist 09 ning AT-01–04 ja AT-12/13. Kujundus jääb omaniku korraldusel ootele; kasutatakse tavalisi HTML-elemente.

## Teostus

| Nõue | Tulemus |
| --- | --- |
| Teenus | Nimi, kirjeldus, grupp, hind ja kestus. Üldkataloogi minimaalsed väärtused on märgitud „alates”; lõplik hind ja kestus tulevad konkreetsest pakkumisest. Üle kaheksa teenuse korral lisanduvad otsing ja grupifilter. |
| Töötaja | Ainult teenust pakkuvad aktiivsed ja veebis broneeritavad töötajad. „Töötaja pole oluline” on esimene valik koos selgitusega; üks sobiv töötaja jätab sammu vahele. |
| Isiklik link | Ettevõtte avaliku lehe `/?staff=<töötaja UUID>` filtreerib serveris teenused, hinna ja kestuse selle töötaja järgi. Sama parameeter töötab lubatud `/embed?parent=...&staff=...` vaates. Kataloogi API kasutab `?staff=...`. „Muuda töötajat” taastab ettevõtte kataloogi ja eemaldab lingi piirangu, säilitades kontaktid. Vigane, teise ettevõtte või veebis peidetud töötaja link näitab selget teadet ning üldvaate linki. |
| Vaba päev | Tühja päeva nupp otsib järgmist vaba päeva, kuni 31 päeva ühe päringuga. Pikema tühja perioodi korral näidatakse kontrollitud piiri ja jätkamisnuppu. Broneerimisakna lõpus otsing lõpeb. Server kasutab värskeid reegleid; ei vali kellaaega ega loo broneeringut. |
| Valikute muutmine | Teenuse, töötaja ja päeva muutmine eemaldab vana ajapakkumise; aegunud saadavuspäring katkestatakse ja selle vastust ignoreeritakse. Kontaktid säilivad komponendi mälus. |
| Kontaktid | Teenuse saaja nimi, kontaktisiku e-post ja vabatahtlik telefon. Konto ei ole nõutud. Väljade pikkused ja telefonimärgid kontrollitakse; server jääb lõplikuks kontrollijaks. |
| Kokkuvõte | Ettevõte, aadress, teenus, konkreetne töötaja, kuupäev, algus/lõpp, kestus, hind, muutmise/tühistamise etteteatamine ning selgitus, et veebis teenuse eest ei maksta. Kinnitusnupp asub pärast kokkuvõtet. |
| Kinnitus ja korduskatse | Serveri terviklik kinnitus avab tulemuse. Katkenud või ebakindel vastus lukustab andmed; korduskatse saadab sama päringutunnuse ja sisu. Reeglite või töötaja kadumise korral värskendatakse kataloogi, kontaktid jäävad alles. Hinna/kestuse või aja muutus nõuab uut pakkumise valikut. |
| Tulemus ja ICS | Number, aadress, ajavahemik, töötaja, hind, kestus ja salvestatud etteteatamistähtaeg. ICS sisaldab üht UTC alguse/lõpuga sündmust, püsivat UID-d, teenust/töötajat, kohta ja broneeringunumbrit. Kinnitus ei sõltu kirja kohaletoimetamisest. |

## Kontrollid 08.09.2026

**77 rakenduse testi** läbisid. Kolm uut PostgreSQL-i testi katavad isikliku lingi teenuste ja töötajapõhiste hindade/kestuste filtreerimist, võõrast ja suletud töötajat, erandpäeva vahelejätmist, broneeringu mitteloomist otsingul, 31-päevase otsingu jätkamist, viimast päeva, vigast kuupäeva ning värskelt muudetud broneerimisakent. Varasemad konkurentsi-, korduspäringu-, graafiku- ja õiguste testid läbivad.

Brauseris kontrollitud eraldi kohalikul testettevõttel:

- Mari otselink näitas ainult tema lõikust: 45 min / 35 €, üldkataloogis oli sama teenus alates 30 min / 20 € ja lisaks Karli teenus. Ühe töötaja vaade jättis valikusammu vahele.
- Suletud 8. septembrilt leiti 9. september; kellaaja valik jäi tegemata kuni kliendi klõpsuni.
- Tagasiliikumine säilitas nime ja e-posti.
- Server salvestas broneeringu, seejärel katkestas test vastuse. Vaade jäi kontrollimise seisundisse ning lukustas kontaktid ja tagasiliikumise. Korduskatse näitas kinnitust; andmebaasis oli täpselt üks broneering ja üks outbox-sündmus.
- ICS-fail laaditi alla; UID, number, asukoht ning 09:00–09:45 Tallinnas vastasid kinnitatud sündmusele 06:00–06:45 UTC.
- „Muuda töötajat” taastas mõlemad teenused ja eemaldas URL-i töötajaparameetri.
- Mari veebibroneerimine suleti pärast ajavalikut. Kinnitus näitas vastavat teadet, eemaldas vana pakkumise ja värskendas kataloogi. Karli uue pakkumise valimisel olid kontaktid alles. Suletud töötaja otselink näitas üldvaate varulinki.
- 390 px laiuses Chromiumi vaates ei olnud horisontaalset ülevoolu. Kokkuvõte ja kontaktid olid loetavad. Kinnitusnupp paikneb kokkuvõtte järel ning vormi saatmine on brauseris kontrollitud.

Kohalik tootmisbuild läbis. Ajutised brauseritesti ettevõte ja broneeringud eemaldati pärast kontrolli; tootmisse testbroneeringuid ei tehta.

## Sõltuvused ja vastuvõtu piir

Peatükk jääb registris **osaliseks**. Turvaline halduslink, selle aegumise/uuendamise poliitika ning muutmine/tühistamine vajavad peatükkide 10 ja 16 teostust. Praegu tulemusvaates halduslinki ei ole. Broneeringukirjade tegelik saatmine on peatüki 17 töö; outbox salvestub juba broneeringuga samas tehingus. Teenuse saaja eraldi kontaktisiku nimi/kliendikirje vajab hilisemat kliendimudelit; praegu eristatakse saaja nime ja kontaktisiku e-posti/telefoni.

Kontaktide ja poolelioleva taotluse mälu kestab avatud vaate eluaja; lehe taaslaadimise järel taastamist ei ole veel teostatud. Võrdsete pakkumiste koondamise reegel jääb peatükki 09. Päriskasutajatega prototüübitest, suured puutealad, täielik klaviatuuri/ekraanilugeja kontroll ning brauserimaatriks jäävad peatükkide 12 ja 25 vastuvõttu. Üks mobiilimõõdus Chromiumi kontroll ei tõenda kogu kasutatavuse vastuvõttu.

Serveri avaldamise tõend lisatakse pärast paigaldamist.
