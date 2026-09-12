# Platvormihalduri kasutusjuhend

See juhend aitab broneering.info haldajal luua ettevõtteid, korraldada kuutasu arveldust ning kasutada ajutist tugiligipääsu. Platvormihaldur tähendab siin kogu teenuse haldajat. Ettevõtte omanik haldab enda ettevõtte teenuseid, töötajaid ja broneeringuid.

**Juhendi esmane versioon 12.09.2026.** Toimingud ja nimetused on võrreldud praeguse lähtekoodiga. Juhendi järgi tehtav omaniku kasutuskatse ja lõpliku kujunduse kontroll on veel tegemata. SMTP ja Maksekeskus on seadistamata; kirjade ja veebimaksete päris toimimist ei ole vastu võetud.

## Sisselogimine ja õige ettevõtte valimine

Ava [haldus.broneering.info](https://haldus.broneering.info) ning logi sisse oma platvormihalduri kontoga. Kaitstud sisu kasutamiseks peab e-post olema kinnitatud ja kaheastmeline autentimine tehtud. Autentimisrakenduse seadistamisel salvesta varukoodid turvalisse kohta.

Praegusel halduslehel on eraldi jaotised **Loo ettevõte**, **Esimese omaniku kutse taastamine**, **Kuutasu ja tellimus**, **Arve väljastaja ja maksuseaded** ning **Platvorm**. Need ei ole veel lõpliku kujunduse menüü.

Ettevõtte valik toimub praegu mitmes jaotises eraldi. Enne toimingut kontrolli selle vormi ettevõtte nime; arvelduse ettevõtte valimine ei vali automaatselt tugivaate ettevõtet. Jaotis **Minu ettevõtted** näitab sinu tegelikke ettevõtteliikmesusi. Platvormihalduri roll ei tee sind kõigi ettevõtete omanikuks.

## Ettevõtte loomine ja omaniku kutse

1. Täida jaotises **Loo ettevõte** ettevõtte nimi, aadress, soovitud alamdomeen ja omaniku e-post.
2. Vali **Loo ettevõte ja omaniku kutse**.
3. Edukas tulemus näitab loodud veebiaadressi, privaatset kutselinki ja kutse aegumist. Kutset ei ole selle toiminguga automaatselt e-postiga saadetud. Anna link õigele omanikule kokkulepitud privaatses kanalis.
4. Omanik võtab kutse vastu ning seadistab konto ja kaheastmelise autentimise. Uus ettevõte alustab avaldamata testrežiimis. Domeeni/HTTPS-i valmiduse korraldab käitaja; omanik täidab ettevõtte seadistamise eeltingimused enne avaldamist.

Ettevõtte loomise õnnestumine ei tähenda veel, et avalik broneerimisleht on kasutusvalmis. SMTP puudumine takistab kontoga seotud päriskirjade tavapärast kasutuselevõttu; seda kontrollitakse ühenduse vastuvõtus.

Kui esimese omaniku kutse kaob või aegub enne liitumist, ava **Esimese omaniku kutse taastamine**, vali ettevõte, kontrolli saaja e-posti, sisesta põhjus ja kinnita uue lingi loomine. Vali **Loo uus omaniku kutselink**. Saaja jääb samaks ning vanad lingid tühistatakse. Kui omanik on juba liitunud, ei saa seda toimingut kasutada tema konto või omaniku asendamiseks.

## Tellimus ja broneerimise piirang

Ava **Kuutasu ja tellimus** ning vali ettevõte. Näed paketti, hinda, töötajate arvu piiri, tellimuse seisundit, arveldusperioodi, tasutud perioodi lõppu, arve saajat ja makseviisi.

Kui tellimust pole, sisesta ettevõttega kokku lepitud alguspäev, arve saaja ja arvelduse e-post. Kinnita tingimuste kokkulepe ning vali **Loo tellimus**. Tingimused on 35 € kuus lõpphinnana, piiramatu töötajate arv, prooviperioodita, seitsmepäevane maksetähtaeg ja lisaaeg 0 päeva.

| Mida näed | Tähendus ja järgmine tegevus |
| --- | --- |
| Arve ootab tasumist; uued broneeringud lubatud kuni tähtajani | Kontrolli arve saajat, summat ja maksetähtaega. Tasumise ooteaeg ei ole prooviperiood |
| Maksetähtaeg ületatud; uued broneeringud peatatud | Vaata ettevõtte tasumata arveid ja tegelikke laekumisi. Piirang algab maksetähtajale järgneval päeval ettevõtte ajavööndis |
| Arve on tasutud, aga ettevõte ei võta endiselt uusi broneeringuid vastu | Kontrolli varasemat võlga või puuduvat arveperioodi. Ettevõtte omaniku seatud paus või lahkumiskava võib jääda eraldi jõusse; tasumine neid ei tühista |
| Arveldusperioodi lõpp-päev | Kuvatud lõpp-päev on perioodist välja arvatud: näiteks 08.09–08.10 tähendab teenuse perioodi kuni 07.10 lõpuni |

Tasumata arve piirang säilitab olemasolevad broneeringud ning nende halduse ja ekspordi. Kuuarved jätkuvad kuni tellimuse lõpetamiseni ka siis, kui uued broneeringud on võlgnevuse tõttu peatatud. Ettevõtte lahkumiskava võib andmeligipääsu hiljem eraldi lõpetada.

## Arve väljastamine

Enne pärisarvet peavad **Arve väljastaja ja maksuseaded** olema raamatupidamisega kinnitatud. Jaotis kirjeldab sinu kui teenuse müüja andmeid; **Arve saaja andmed** kuuluvad valitud klientettevõttele. Uued väljastajaseaded rakenduvad järgmistele arvetele, varasemad dokumendid säilitavad oma andmed.

1. Vali ettevõte jaotises **Kuutasu ja tellimus**.
2. Kontrolli **Arved → Arve saaja andmed** ning vajaduse korral salvesta parandused.
3. Vali **Vaata perioodi arve eelvaadet**. Kontrolli saajat, perioodi, 35 € lõpphinda ja kinnitatud maksukäsitlust.
4. Märgi kontrolli kinnitus ning vali **Väljasta arve**. Eelvaate avamine üksi arvet ei väljasta.
5. Ava loendis arve number. Kontrolli dokumenti ja vajaduse korral vali **Ava prinditav arve**.

Kui andmed muutusid eelvaate ja kinnitamise vahel, ava uus eelvaade ning kontrolli seda uuesti. Väljastatud arve andmeid ei muudeta saaja profiili tagantjärele parandamisega.

## Laekumise märkimine ja eksliku kirje parandamine

Ava õige arve ning selle **Laekumised** jaotis. Näed eraldi laekunud ja tasumata summat.

Pangaülekande käsitsi märkimiseks vali **Lisa laekumine**, sisesta tegelik summa, laekumise kuupäev ja pangaväljavõtte kande tunnus. Kontrolli andmeid pangaväljavõttelt, märgi kinnitus ning vali **Salvesta laekumine**. Ära märgi raha saabunuks üksnes kliendi makselubaduse põhjal. Maksekeskuse kinnitatud laekumist ei lisata uuesti käsitsi.

Osamakse vähendab tasumata jääki. Enammakse vajab eraldi kinnitust ja ei kandu automaatselt järgmisele arvele. Laekumise salvestamise järel kontrolli nii arvejääki kui ka tellimuse kasutusõigust.

Kui käsitsi lisatud kirje on ekslik, vali selle juures **Paranda laekumiskirje**, sisesta põhjus, kinnita ja vali **Pööra laekumiskirje tagasi**. Algne kirje ja paranduse ajalugu säilivad; seejärel saad lisada õige kande. Parandus eemaldab summa arve laekumistest ega liiguta raha pangas. Maksekeskuse laekumistele see käsitsi parandamise nupp ei laiene.

## Kreeditarve ja parandatud arve

Kui kogu arve tuleb tühistada, ava arve juures **Krediteeri kogu arve**, sisesta põhjus, kontrolli mõju ja kinnita **Väljasta kreeditarve**. Algne arve ning laekumised jäävad alles. Krediteerimine võib eemaldada selle perioodi kasutusõiguse.

Kreeditarve ei tee pangas tagasimakset. Kui algarvel oli laekumine, tuleb selle edasine arveldamine lahendada eraldi. Täielikult krediteeritud arve asendamiseks vali **Vaata parandatud arve eelvaadet**, kontrolli uue dokumendi andmeid ja väljasta see kinnituse järel. Algdokumendi laekumised ei kandu uuele arvele automaatselt.

## Veebimakse seisund ja saatmistõrge

Arve **Veebimakse** jaotis näitab maksekatsete ajalugu. Praegu on Maksekeskus seadistamata ja veebimaksete pärisvastuvõtt ootel. Kaardi sidumise ja korduvmakse nõusoleku annab ettevõtte omanik enda halduses; platvormihaldur seda tema eest ei anna.

| Teade | Jätkamine |
| --- | --- |
| Veebimaksed pole praegu saadaval | Ühendus pole kasutusvalmis. Seadistus on edasi lükatud; nuppude korduv vajutamine seda ei aktiveeri |
| Makse kinnitus on ootel / tulemus on kontrollimisel | Vali **Värskenda makse seisundit**. See laadib rakenduses oleva seisu uuesti; nupu olemasolu ei kinnita raha saabumist ega käivita uut makset |
| Makse vajab kontrolli | Anna käitajale ettevõtte nimi, arve number, aeg ja nähtav teade. Pakkuja ning kohaliku arve seis tuleb võrrelda enne makse lõplikku käsitlemist |
| Makse ebaõnnestus, katkestati või aegus | Vaata arve tegelikku jääki. Edasine makse tehakse omaniku maksevoo kaudu pärast ühenduse kasutuselevõttu; algne maksetähtaeg ei pikene automaatselt |
| Makse kinnitatud | Kontrolli arve laekumist ja jääki. Testkeskkonna makse ei tasu pärisarvet |

Arve detailis on **Arve e-post** ja vajaduse korral **Arve meeldetuletus**, mõlemal saatmisolek ning katsete arv. **Ootel** ei tähenda saadetud kirja. **Kohalik katsekiri** tähendab testkeskkonna väljundit. SMTP on praegu seadistamata.

Pärast SMTP kasutuselevõttu lase käitajal kõrvaldada saatmistõrke põhjus. Ebaõnnestunud kehtiva arve kirja saad seejärel nupuga **Proovi arvekirja uuesti** uuesti järjekorda panna. Sama nupp võib olla eraldi meeldetuletuse juures: kontrolli, kumba kirja kordad. Saadetud kirja see toiming uuesti ei saada. Saatmisolek ei tõenda üksinda adressaadi postkasti jõudmist.

## Ettevõtte aitamine tugivaates

1. Ava **Platvorm**, vali ettevõte ja kirjuta toe alustamise põhjus.
2. Vali **Alusta tuge**. Kontrolli ettevõtte nime, põhjust ja loa aegumist.
3. Vaata lubatud kalendripäeva või otsi kliendikontakti. Luba kehtib kuni 30 minutit ja on ainult lugemiseks.
4. Vajaduse korral ava kehtiv luba uuesti jaotises **Minu aktiivsed tugiload → Ava tugivaade**.
5. Kui abi on lõpetatud, vali **Lõpeta tugi**.

Lugemised auditeeritakse. Tugiluba ei võimalda muuta broneeringut, eksportida ettevõtte andmeid ega saada ettevõtte omaniku õigusi. Loa aegumisel või tühistamisel tuleb edasiseks tööks järgida kehtivat ligipääsukorda. Täpsem kirjeldus: [tugiligipääsu juhend](SUPPORT-G09.md).

## Ettevõtte sulgemine ja käitaja abi

Erista uute broneeringute pausi, maksepiirangut, tellimuse lõppu, andmeligipääsu lõppu ja andmete eemaldamist. Need on erineva mõjuga toimingud. Ükski neist ei tähenda vaikimisi kõigi andmete kustutamist.

Praegune **Teenusest lahkumine** vorm kuulub ettevõtte omaniku rollile. Platvormihalduri õigus või tugiluba seda rolli ei asenda. Platvormihalduri enda sulgemise/taasavamise täielik töökorraldus vajab veel kooskõlastust ja vastuvõttu; juhend ei luba praegu olematut ühe nupuga toimingut.

Lahkumistähtajad, eksport ja säilitamine peavad vastama kinnitatud kokkuleppele. Automaatne säilitamispoliitika on kinnitamata. Lõppenud teenuse taasavamise või ligipääsu pikendamise pöördumine antakse määratud käitajale; selle töö vastutaja ja kinnitatud protseduur jäävad üleandmises avatuks.

Serveri, SMTP, makseühenduse, varukoopia või taastamise tõrke korral kirjelda käitajale ettevõtet, arve/broneeringu viidet, toimingu aega, nähtavat teadet ning seda, mida proovisid. Paroolid, kutselingid, kaardiandmed ja varukoodid ei kuulu veateatesse. Käitaja ning asendaja kontaktid ja toeajad on veel määramata; [tehnilised juhised](README.md) on arendajale/käitajale olemas.

## Juhendi lõpetamine

Pärast lõplikku kujundust kontrollitakse jaotiste/nuppude nimetused ning lisatakse vajalikud ekraanipildid. Platvormi omanik teeb [platvormihalduse vastuvõtuülesanded](CHAPTER-25.md#platvormihalduri-arusaadavuse-vastuvõtt) kokkulepitud testkeskkonnas. Kasutajaliidese ebaselgust ei märgita lahendatuks ainult juhendi täiendamisega.

Juhendi tehniline alus: [ettevõtte loomine](../src/components/company-provisioning.tsx), [kutse taastamine](../src/components/owner-invitation-recovery.tsx), [tellimus](../src/components/subscription-management.tsx), [arved](../src/components/billing-invoices.tsx), [laekumised](../src/components/billing-payments.tsx), [veebimaksed](../src/components/billing-checkout.tsx), [haldusrollide vaated](../src/components/admin-app.tsx), [lahkumise serveriõigus](../src/lib/company-exit.ts) ning [ptk 19](CHAPTER-19.md). See võrdlus ei ole uus brauseri- ega omaniku vastuvõtukatse.
