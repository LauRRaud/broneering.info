# Peatükk 19: kuutasu ja arveldus

**Uuendus 09.09.2026:** 23-G09 piiratud auditeeritud kalendri- ja kliendikontaktide tugivaade on API/andmebaasi/brauseriga kontrollitud ning serverisse paigaldatud. [Teostus, õiguste piirid ja tõendid](SUPPORT-G09.md). Allpool olevad 08.09 kirjeldused säilitavad oma ajaloolise kontrolliseisu.

## Omaniku kinnitatud tingimused

08.09.2026 vestluses kinnitatud: üks pakett, **35 € lõpphind kuus**, piiramatu töötajate arv ja **prooviperioodita**. Maksu olemasolul eraldatakse see lõpphinnast; käibemaksu ei lisata 35 eurole. Maksukäsitlus ja väljastaja andmed vajavad enne pärisarve väljastamist raamatupidamise kinnitatud seadistust.

Arve **maksetähtaeg on 7 kalendripäeva väljastamisest**. Maksetähtaja ületamisel lisaaega ei ole (**0 päeva**). See omaniku viimane täpsustus asendab varasemad üleminekuaja vastused. Maksetähtpäev lubab uusi broneeringuid; tasumata arve piirang algab järgmisel päeval ettevõtte ajavööndis. Olemasolevaid broneeringuid ei kustutata ning ligipääs andmetele säilib. Näide: 8. septembril väljastatud arve tähtaeg on 15. september ja piirang algab 16. septembril.

## Maksekeskuse kaks makseviisi

08.09.2026 kasutaja täpsustus: tellimisel tuleb valida **igakuine arve makselingiga** või **automaatne kaardi püsimakse**. Mõlema puhul väljastatakse 35 € arve. Püsimakse ebaõnnestumisel jääb arve tasumiseks makselink; seitsmepäevast algset maksetähtaega ei pikendata automaatselt. Püsimakse nõusolek, lõpetamine, kaardi uuendamine ja tõrked peavad olema halduses nähtavad.

Maksekeskuse ametlik juhend, kontrollitud 08.09.2026: [makselingid](https://developer.makecommerce.net/guides/custom-api/paymentLinks/), [makse töövoog](https://developer.makecommerce.net/guides/custom-api/RegularPaymentFlow/), [püsimaksed](https://developer.makecommerce.net/guides/custom-api/recurringPayments/). Arve link peab läbima meie serveri värske jäägikontrolli. Edukas brauserisse tagasitulek üksi ei kinnita tasumist; teade vajab MAC-kontrolli ning poe, tehingu, summa ja valuuta vastavust. Korduste töötlemine peab lisama laekumise ainult üks kord. Püsimakse esmane kaardi sidumine toimub pakkuja iframe'i kaudu nõusolekuga; järgnev makse kasutab pakkuja tokenit. Toorkaardinumbreid rakendusse ei salvestata.

Liidestus on veel teostamata. Poe loomine ja teenuste aktiveerimine toimuvad kasutaja Maksekeskuse kontol; tegelikke API võtmeid ei ole seadistatud ega pärismakseid tehtud.

## Teostuse seis

`billing-rules.ts` sisaldab kinnitatud paketi alust, täissentide ja selgelt antud maksumäära põhist maksueraldust, kuuperioodi arvutust ning piirangu alguspäeva. Periood on alguspäeva kaasav ja lõpp-päeva välistav. Tellimuse algne kalendripäev säilitatakse eraldi: 31. jaanuar → 28. veebruar → 31. märts. Maksueraldus ümardab netosumma poole sendi korral üles; maks on lõpphinna ja netosumma vahe, seega summa ei muutu.

Kuus ühiktesti katavad hinna/tingimused, liigaasta ja kuu lõpu, vigased kuupäevad, sendiümarduse, seitsmepäevase maksetähtaja ning piirangu alguse. Arvutusmoodul ei väljasta arveid ega muuda veel kasutusõigusi.

Migratsioon 029 salvestab kinnitatud Standard-paketi esimese versiooni ja lisab tellimuse algse kalendripäeva ning ettevõttepõhise korduspäringute tabeli. Sama Standard-paketi prooviperiood on andmebaasis keelatud. Platvormi värske MFA-õigusega `POST /api/admin/subscription` loob ühe ootel tellimuse; sama UUID ja sama sisu kordus tagastab sama vastuse, muutunud sisu on konflikt. Ettevõtte lukustamine välistab kaks tellimust. Loomise audit on samas tehingus. Alguspäev ei saa olla minevikus ja lõpetamiskavaga ettevõttele uut tellimust ei looda. Loomine ei lisa tasutud perioodi ega anna tasutud kasutusõigust.

GET nõuab omaniku õigust või selgelt valitud platvormivaates värsket platvormiõigust. Halduse platvormivorm võimaldab valida ettevõtte, alguspäeva, arve saaja ja kinnitada kokkuleppe. Omanik näeb oma tellimuse hinda, töötajate piiri, perioodi ja tasutud perioodi lõppu. Eesti, inglise ja vene tekstid on kataloogides.

Kogu kohalik testikomplekt: **205 testi 30 failis läbivad**. Kaks uut PostgreSQL-i testi katavad samaaegse korduse, hinna/tingimuste salvestuse, rolli ja teise ettevõtte ligipääsu, muutunud korduspäringu, värske platvormiõiguse, vigased kuupäevad ja prooviperioodi keelu. Tootmise ehitus läbib 115 lähtefaili arhitektuurikontrolliga. Chromiumis loodi eraldi katseettevõttele tellimus, kontrolliti tulemust ning 390 piksli mobiilivaadet (dokumendi laius 390). Andmebaasis kontrolliti ootel seisundit ja algset päeva; katseettevõte, tellimus ning sessioon eemaldati.

Ehitusel avastatud testikirjade failijälitus parandati `next.config.ts` välistustega: `output`, `.private` ja `.env*` ei kuulu standalone-paketti. Kordusehitus läbis hoiatuseta ja paketis ei leitud testikirjade, brauserikatsete ega keskkonnafaile.

## Arve väljastamine ja dokument

Migratsioon 030 lisab versioonitud väljastajaseaded, globaalse arvenumbri jada, saaja andmed tellimusele ning arve väljastamispäeva ja seaded tuvastavad väljad. Platvormihaldur kinnitab juriidilise nime, registrikoodi, aadressi, riigi, e-posti, IBAN-i, käibemaksukohustuse, maksumäära, maksukäsitluse märkuse, nummerduse eesliite ja raamatupidamise kinnituse viite. Vaikimisi kinnitatud väljastajat ega maksumäära ei looda. IBAN-i kontrollsumma ja maksuandmete omavaheline kooskõla kontrollitakse serveris. Arve andmeväljade alus on [MTA: arvele märgitavad andmed](https://www.emta.ee/ariklient/maksud-ja-tasumine/kaibemaks/kaibemaksuarvestus-ja-arved/arvele-margitavad-andmed), kontrollitud 08.09.2026. Maksukäsitlust ei tuletata automaatselt ettevõtte riigist ega registrikoodist; valitud käsitluse kinnitab platvormihaldur raamatupidamise kokkuleppe järgi.

Omanik või platvormihaldur saab salvestada arve saaja profiili tellimuse versiooni ja korduspäringu kontrolliga. Arve eelvaade ei salvesta arvet. Väljastamine kontrollib eelvaate räsi värske saaja, paketi, väljastajaversiooni ja kohaliku kuupäeva vastu ning küsib muutuse korral uut eelvaadet. Väljastaja kinnitamine ja arve koopia võtmine kasutavad sama tehingulukku. Arvenumber on `EESLIIDE-AASTA-JADA`; jada ei nullitu ning tehingu tagasipööramine võib jätta numbrivahe. Sama perioodi topeltarvet takistab andmebaasipiirang, sama päringu kordus tagastab sama arve. Loomine, korduspäringu kinnitus ja audit on üks tehing. Teenuse lõpetamise kuupäeva ületav osaperiood vajab eraldi kokkuleppe lahendamist, seda ei arveldata automaatselt täiskuuna.

Väljastatud arve number, kuupäevad, väljastaja, saaja, read ja summad on muutumatud. Uus väljastajaseadistus ega saaja muudatus ei kirjuta neid üle. Arvete loend ja üksikarve nõuavad omaniku või värsket platvormiõigust. Prinditav HTML-dokument avatakse haldusest samade õigustega, ilma skriptideta ja no-store/noindex päistega; dokumendi andmed on HTML-escaped. Teenuse perioodi viimane kaasatud päev näidatakse dokumendis eraldi arvutatult. Arveldusandmed sisalduvad ettevõtte ekspordis. E-posti saatmine, laekumised ja arve parandamise töövoog on veel järgmine etapp.

**209 testi 31 failis läbivad** ning tootmise ehitus läbib 122 lähtefaili arhitektuurikontrolliga. Neli uut PostgreSQL-i testi kontrollivad seadeid ja õigusi, samaaegset kordust, saaja muutmist, lugemise kõrvaltoimete puudumist, 35 € lõpphinda koos maksuga, seitsmepäevast tähtaega, arve koopia muutumatust, tenant-eraldust ja HTML-sisestuse ohutust. Chromiumis kinnitati eraldi katseandmetega väljastaja, täideti saaja, kontrolliti eelvaadet, väljastati üks arve ja avati prinditav dokument. Inglise ja vene tekstid kontrolliti brauseris. Mobiilivaade oli 390 pikslit ning dokumendi laius 390. Katsearve, tellimus, väljastajaversioon, ettevõte ja sessioon eemaldati; päriskirja ei saadetud.

## Laekumised ja kasutusõigus

Migratsioon 031 lisab tellimuse algse alguspäeva ja pangaväljavõtte kande tunnuse. Platvormihaldur saab märkida tegeliku laekunud summa, kuupäeva ja pangakande, kinnitades võrdluse pangaväljavõttega. Osamaksed liidetakse. Sama pangakande korduv aktiivne märkimine samale arvele on andmebaasis keelatud. Enammakse vajab eraldi kinnitust; see säilib tegeliku laekunud summana ega kandu automaatselt teisele arvele. Tuleviku laekumiskuupäeva ei saa sisestada. Sama UUID kordus on idempotentne, muutunud andmed või vananenud arve versioon annavad konflikti.

Ekslik kirje pööratakse põhjendusega tagasi. Algne summa, sisestaja ja aeg säilivad; juurde tulevad parandaja, paranduse aeg ja põhjus. Parandus ei tee pangas ülekannet. Parandatud kande tunnusega saab lisada õige kirje. Arve versioon, tasutud periood, seisund, korduspäringu tulemus ja audit uuenevad samas tehingus. Omanik näeb oma laekumiste ajalugu, töötaja mitte. Platvormiõigust kontrollitakse värskelt ka korduspäringul.

`billing-access.ts` arvutab kasutusõiguse iga kontrolli ajal arvetest ja aktiivsetest laekumistest. Tasutud periood ulatub ainult katkematu täielikult tasutud perioodide rea lõpuni; hilisema arve tasumine ei varja varasemat võlga ega puuduvat perioodi. Väljastatud arve maksetähtpäev kuulub lubatud aega ettevõtte ajavööndis, järgmise päeva algusest lisaaega ei ole. Arvega kaetud maksetähtaja ooteaeg on arveldustingimus, mitte tasuta prooviperiood. Vahemällu salvestatud `active` või `paid_through` ei anna arvetega vastuolus olevat Standard-paketi kasutusõigust. Vana mitte-Standard paketi ajalooline periood ilma arvete registrita jääb varasema mudeli järgi loetavaks; uut prooviperioodi müügivoog ei loo.

Päris ettevõtte uus avalik, käsitsi või imporditud broneering kontrollib arveldust värske tenant-lukuga tehingus. Piirangu ajal on avalik leht neutraalne ega avalda võla põhjust; olemasoleva broneeringu isiklik link, muutmine, haldus ja eksport töötavad edasi. Piirang ei kustuta broneeringuid ega tühista neid. Laekumise märkimine taastab arveldusõiguse kohe; omaniku eraldi paus või lõpetamiskava jääb endiselt jõusse. Avaldatud näidiskeskkonnad ja avaldamata omaniku seadistuskatse on selges `demo`-režiimis; ettevõtte päris avaldamine lülitab selle välja ning nõuab kehtivat arveldusõigust.

Halduse maksevorm, paranduse kinnitus, tegija/aeg/põhjus, tasumata jääk ja enammakse on ET/EN/RU kataloogidega ühendatud. Sama ettevõtte mitu avatud arveldusplokki värskenevad koos ja laekumistoiming ei sulge valitud arvet. Ettevõtte eksport sisaldab ka algset tellimuspäeva ja laekumiste parandamisajalugu.

**216 testi 32 failis läbivad**; tootmise ehitus läbib 125 lähtefaili kontrolliga. Seitse uut PostgreSQL-i testi katavad kohaliku kesköö piiri, vananenud puhverstaatuse, osamaksed, samaaegse korduse, pangakande duplikaadi, paranduse ja selle korduse, enammakse, tulevikukuupäeva, varasema võla/puuduva perioodi ning avaliku/käsitsi/impordi keelu koos olemasoleva broneeringu muutmise ja ekspordi säilimisega. Teavituste testikeskkonnad said päris ettevõtte nõude täitmiseks tasutud tellimuse; nende kontrollide ulatus jäi alles. Täiskontrollis leitud lõpetatud avaliku seisundi ülekirjutamine arvelduspausiga parandati.

Chromiumis märgiti eraldi tasumata katsearvele 35 € laekumine: piiratud seisund muutus aktiivseks ja tasutud perioodi lõpp uuenes. Seejärel pöörati kanne põhjendusega tagasi: tasumata jääk ja piirang taastusid, algne kanne koos parandaja ja põhjusega jäi nähtavale ning nii platvormi- kui omanikuvade uuenesid. Mobiilivaade ja dokumendi laius olid 390 pikslit. Andmebaasist kontrolliti kirje säilimist, paranduse aega, nullitud tasutud perioodi ja piiratud seisundit. Katseandmed ning sessioon eemaldati.

Järgmisena: arve parandamine; teavitused ja korduv periooditöö; järgmise kuuperioodi ning hinnamuudatuse jõustumise reeglid. Peatükk pole valmis ning tootmisesse pole arveldust paigaldatud.


## Kreeditarve töövoog (kohalik teostus, brauserikontroll ootel)

Migratsioonid 032–033 lisavad arve liigi, algdokumendi viite, põhjuse ja ühe täieliku kreeditarve piirangu. Platvorm saab kogu väljastatud arve põhjendusega krediteerida. Algne arve muutub tühistatuks, summad ja andmed säilivad; eraldi nummerdatud kreeditarve kopeerib algse saaja/väljastaja/maksukäsitluse ning pöörab summad ümber. Andmebaas kontrollib dokumendi seost ja täielikku vastassummat. Korduspäringu vastus, audit ja kasutusõiguse värskendus on üks tehing.

Tegelikud laekumised jäävad algarvele ning neid ei kanta automaatselt uuele arvele ega tagastata pangas. Haldus näitab krediteeritud arve laekumist eraldi arveldamist vajava summana. Kreeditarve ei anna kasutusõigust ja sellele ei saa lisada laekumist. Sama tellimuse praeguse perioodi parandatud arve saab väljastada uue eelvaatega. Ajaloolise perioodi asendus, osaline krediteerimine ja laekumise ümberarveldamine/tagastuste töövoog vajavad veel teostust.

Prinditav kreeditarve sisaldab algarve numbrit ja põhjendust ning ei esita maksenõuet. Dokumendid on loetavad omaniku/platvormi õigusega ja sisalduvad ekspordis. Uus PostgreSQL-i kontroll läbib: konkurentsed kordused, roll/tenant, vananenud versioon, maksude koopia, säiliv pärislaekumine, kasutusõiguse eemaldamine, negatiivne dokument, muutumatuse piirang, uue arve väljastamine ning värskelt tühistatud platvormiõigus. Kogu 217 testi 32 failis läbivad; tootmise ehitus läbib 126 lähtefaili arhitektuurikontrolliga. Brauserikontroll on ootel.


Maksekeskuse serveri ühendusmoodul `makecommerce.ts` on lisatud (veel arve maksenupuga ühendamata). Vaikimisi väljalülitatud seaded eraldavad test- ja päriskeskkonna. HTTPS-põhiaadress, poe ID, salajane võti ja iframe'i avalik võti peavad olema selgesõnaliselt seadistatud. Moodul loob tehinguid, pärib seisundit, algatab tokeniga makse ja kontrollib makseteate täpsete baitide MAC-i. Tagasisuunamise aadress peab kuuluma valitud keskkonna maksehostile ja samale tehingule. Ebaselge võrguvastus ei käivita automaatset kordusmakset. Kuus mooduli testi läbivad; need kasutavad kontrollitud HTTP-vastuseid, mitte päris Maksekeskuse tehinguid.

## Maksekeskuse liidestus ja automaatne arveldus: kohalik teostus

Ülal olev „liidestus on veel teostamata” on asendatud järgmise teostusseisuga. Makselingiga tasumine, allkirjastatud tagasiside, serveripoolne tehingu võrdlus, kaardi sidumise nõusolek, püsimakse töötlus ja kaardi lõpetamine on rakendatud. API testid kasutavad matkitud pakkujavastuseid. Tegelikke Maksekeskuse võtmeid pole seadistatud ning pakkuja test- või päriskeskkonna läbivat makset pole kinnitatud.

Makselingi saladus on URL-i fragmendis ja andmebaasis krüpteeritud; tasumise eel kontrollitakse värsket arvejääki. Testkeskkonna makse ei anna päris laekumist. Korduv makseteade ei dubleeri laekumist. Tagastuse puhul kontrollitakse pakkuja API-st algvaluutas tagastatud kogusummat ning lisatakse ainult kasvav vahe eraldi tagastuste registrisse. Osaline tagastus vähendab tasutud summat ja täielik tagastus viib selle nulli. Algne laekumine säilib. Hilinenud osaline või COMPLETED teade ei taasta täielikult tagastatud arve tasutust.

Omaniku kinnitatud lisareegel: **kuuarveid väljastatakse kuni tellimuse lõpetamiseni ka siis, kui uute broneeringute vastuvõtmine on võlgnevuse tõttu peatatud**. `worker:billing` koostab korraga ühe saabunud perioodi arve ettevõtte kohta ja liigub kalendrikuu kaupa edasi. Perioodi lukustamine välistab duplikaadi; vahele jäänud kuud taastatakse järgnevates voorudes. Tulevast perioodi ei arveldata. Demoettevõttele automaatarvet ei tehta ning kokkulepitud teenuse lõppu ületavat tervikperioodi ei arveldata. Osalise lõpp-perioodi arvestus vajab eraldi kokkulepet.

Migratsioonid 039–040 lisavad perioodi edasiliikumise õigused ja arvete e-posti järjekorra. Arve või kreeditarve ning saatmisülesanne tekivad samas andmebaasitehingus. Saatmine kontrollib uuesti arve kehtivust ja demoolekut. Kirjas on ettevõtte valitud keeles arve põhiandmed, prinditav HTML-arve manus ning tavalise arve korral makselink. Kreeditarve ei kinnita raha tagastamist.

`BILLING_MAIL_MODE=disabled` jätab kirjad ootele, `capture` salvestab ainult kohalikult privaatsesse kataloogi ja `smtp` kasutab SMTP seadeid. Saatmisviga proovib kuni kaheksa korda kasvava viivitusega (kuni tund). Andmebaas salvestab ainult üldise veakoodi. Rea lukk välistab samaaegse topeltsaatmise; SMTP kinnituse ja andmebaasi COMMIT-i vahelise katkestuse korral on korduskiri võimalik, sama Message-ID vähendab dubleerimist. Täpselt üks kord tarnimist ei väideta.

Kontrollid katavad automaatarvete konkurentsi ja võlgnevusega jätkumise, lõpetamise piiri, saatmisjärjekorra ettevõtteeraldatuse, keelatud transpordi, korduskatsed, samaaegsed saatjad, krediteeritud arve vahelejätmise ning kreeditarve kirja. Päris e-kirju nende testidega ei saadeta. Käivituskäsk: `npm run worker:billing`; serverikonteineri siht on `billing-worker` ja see kuulub `workers` profiili.

Arve detailis näeb omanik ja platvormihaldur saatmisolekut ning katsete arvu. Platvormihaldur saab ebaõnnestunud kehtiva arve saatmise uuesti järjekorda panna; toiming kontrollib värskeid õigusi, on korduskindel ja auditeeritud. Saadetud kirja see nupp uuesti ei saada.

Migratsioon 041 lisab ühe tähtajaületuse meeldetuletuse arve kohta. Töötaja leiab ettevõtte kohaliku päeva järgi tähtaja ületanud tasumata arved; tähtaeg ise ei ole hilinenud päev. Enne saatmist kontrollitakse uuesti arve kehtivust ja laekumisi. Vahepeal tasutud arve teade jäetakse vahele. Meeldetuletus ei muuda maksetähtaega, ei anna lisaaega ega lõpeta tellimust. Selle olek ja ebaõnnestunud saatmise korduskatse on arve detailis eraldi nähtavad.

## Varasema perioodi parandatud arve

Migratsioon 042 ja arve eelvaate lisavalik võimaldavad täielikult krediteeritud kuuarve asendada ka pärast tellimuse järgmisse perioodi liikumist. Algne periood ja lõpphind säilivad; saaja ning maksukäsitlus tulevad praegusest kinnitatud seadistusest ja on enne väljastamist eelvaates. Uus dokument saab uue numbri, väljastamispäeva, seitsmepäevase maksetähtaja ja püsiva viite asendatud arvele. Muutunud eelvaade vajab uut kinnitamist. Tellimuse perioodikursor ei liigu tagasi.

Andmebaas nõuab sama ettevõtte täielikult krediteeritud algarvet ning sama tellimust, perioodi, valuutat ja lõpphinda. Sama perioodi kohta jääb kehtima ainult üks arve. Algdokumendi laekumised jäävad sinna alles; neid ei kopeerita ega tagastata automaatselt. Asendusseos sisaldub prinditavas dokumendis ja ekspordis. Kontroll läbib ajaloolise kuu, õiguste/ettevõtte eraldatuse, samaaegse korduse, duplikaadi keelu, muutmata perioodikursori, säiliva laekumise ja andmebaasi vastassumma piirangu.
