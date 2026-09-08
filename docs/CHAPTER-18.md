# Peatükk 18: liitumine, import, eksport ja lahkumine

## Seadistamine: kohalik teostus

Platvormihaldur loob ettevõtte ja esimese omaniku 48-tunnise kutse. Server kontrollib värsket platvormiõigust ja MFA-d; kutselink tagastatakse privaatselt, automaatset kirja see toiming ei saada. Kutse vastuvõtt kasutab olemasolevat kinnitatud e-posti ja omaniku MFA töövoogu. Päringu UUID ja krüpteeritud vastus väldivad kaotatud vastuse kordamisel topeltettevõtet. Vana domeeni püsiv reserveering jääb kehtima.

Uus ettevõte on `draft`, `demo=true`, domeen `ready=false`. HTTPS-i valmidust ei teeselda. Avalik kataloog, saadavus ja kinnitus kontrollivad värsket avaldamisseisundit. Omanik saab haldushostil kasutada `/preview?tenantId=…`: teenuse, töötaja, aja ja kontaktide valik kasutab sama BookingFlow'd ning broneerimismootorit, kuid iga päring kontrollib omaniku õigust ja avaldamata testrežiimi. Testkirju päris SMTP-le ei saadeta ka siis, kui ettevõtte testilipp hiljem muutub.

Omaniku seadistusnimekiri ühendab ettevõtte andmed, avaliku kontakti, teenuse–töötaja seose, graafiku, tingimused, halduslingi poliitika, proovibroneeringu, kasutusõiguse ja domeeni. Kujundus jääb kasutaja juhisel ootele. Kontaktid ja lingipoliitika kasutavad olemasolevaid broneeringuseadeid. Ettevõtte broneerimistingimused kuvatakse kliendile lihttekstina; tingimuste muutus tõstab reeglite versiooni. Kasutaja sisestatud tingimusi ei peeta õiguslikult kontrollitud lepinguks.

Avaldamise tehing kontrollib eeltingimusi uuesti, sealhulgas vähemalt ühe tulevase testbroneeringu aja, hinna ja kestuse sobivust värske graafikuga. Kehtiv trial või tasutud aktiivne tellimus ning töötajate paketipiir on vajalikud; päris hinnakirja ega prooviperioodi kestust pole omaniku eest määratud. Avaldamisel tühistatakse testbroneeringud, suletakse nende lingid ja ootel kirjad ning vabastatakse ajad. Pärisbroneeringuid ei tühistata.

Uute broneeringute peatamine nõuab omaniku õigust, versiooni ja põhjust. Avalikul lehel näidatakse neutraalset teadet koos kontaktiga; olemasolevad broneeringud ja nende halduslingid säilivad. Uus avalik või käsitsi broneering on peatatud ettevõttes keelatud. Tellimuse lõpp ja hilisem kustutamine on eraldi, veel lisanduvad töövood.

## Kontrollid

- Kolm ettevõtte loomise integratsioonitesti: viis samaaegset sama UUID päringut annavad ühe ettevõtte/kutse, erineva sisu kordus lükatakse tagasi, värsked õigused/MFA/konto seisund, krüpteeritud vastus, RLS ja reserveeritud domeeni tehingu tagasipööre.
- Neli seadistuse integratsioonitesti: avaldamise eeltingimused, päris proovibroneering, testide sulgemine, peatamise korral olemasoleva lingi säilimine ja uute broneeringute keeld, omaniku õigused/versioonid ning testikirja saatmise tõkestamine.
- Kõik 168 testi 22 failis läbisid; tootmise ehitus läbis 94 lähtefaili arhitektuurikontrolliga. Migratsioonid 019 ja 020 rakendatud kohalikult, skeemiaruanne uuendatud.
- Playwright: omaniku tingimuste salvestamine, puuduvate eeltingimuste tõttu keelatud avaldamine, kogu proovibroneerimise teekond kuni kinnitamiseni ja 390-pikslisel vaatel dokumendi ülevoolu puudumine. Inglise vormis leitud puuduva „Kirjeldus” tõlge parandatud. Brauseri teadaolev faviconi 404 pole selle tööga parandatud.

## Privaatne taustaeksport: kohalik teostus

Omanik tellib `JSONL v1` ekspordi haldusest. Fail sisaldab ettevõtte seadeid, teenuseid/tõlkeid/gruppe, töötajaid/seoseid, graafikuid/erandeid, kliente, broneeringuid/sündmusi ning ettevõtte enda tellimuse, paketi, arvete ja laekumiste andmeid. Tunnused säilitavad seosed; summad on euro sentides ning kestused minutites. Testbroneeringud on selgelt `is_test` märgisega. Autentimise andmeid, halduslinkide saladusi, teiste ettevõtete andmeid ega lähtekoodi ei ekspordita.

UUID korduspäring ei loo uut tööd. Korraga lubatakse kaks aktiivset tööd. Omanik valib faili kehtivuse 1–168 tundi alates tellimisest (vaikimisi 24); see on tehnilise allalaadimisfaili eluiga, mitte kliendiandmete lepinguline säilitustähtaeg. Faili piir on 512 MiB. Töötaja kasutab 15-minutilist renditunnust, kuni viit katset ja kuni kümneminutilist koostamist. Ühtne PostgreSQL REPEATABLE READ READ ONLY hetkeseis loetakse 500 rea kaupa kursoritega ning kirjutatakse voona privaatsesse faili.

Omaniku värsked õigused/MFA kontrollitakse tellimisel, koostamisel, avaldamisel ja allalaadimisel. Allalaadimine nõuab haldussessiooni; anonüümset faili- ega Bearer-linki pole. Vastus on voogedastatav attachment, no-store ja nosniff. Rakenduseroll saab faili metaandmetest muuta ainult staatust ja versiooni, mitte räsi, mahtu, võtit ega aegumist. Kataloogi/avaliku kausta ning läbimise kontrollid hoiavad failid privaatse juure sees.

`npm run worker:exports` töötleb järjekorda ning kustutab aegunud failid. `--once` teeb ühe partii. Tehingu teadmata lõpptulemuse järel ei kustutata potentsiaalselt avaldatud faili; üle kaheksa päeva vanad viitamata failid koristatakse eraldi. Vanuse piir ületab allalaadimisfaili maksimaalse eluea. Tootmises on vajalik `PRIVATE_STORAGE_DIR`; kohalik vaikimisi juur `.private/storage` on Gitist ja Docker-ehitusest välistatud. Käitusfailidele on Nexti ehituses sõnaselgelt jälgimise keeld, et need ei satuks serveri koodipakki.

Serveri compose-mall sisaldab `export-worker` teenust ja veebiga ühist `private_files` köidet. Mõlemad töötavad failide jaoks UID 1001 õigustes. Linuxi töötajapilt ehitus edukalt; UID 1001 privaatse faili loomise/lugemise/eemaldamise proov läbis. See ei asenda tootmise köite varundust ega paigaldust.

Kuus uut ekspordi integratsioonitesti kontrollivad 1501 kirje voogeksporti ja samaaegse muudatuse eelset ühtset hetkeseisu, ettevõtete eraldatust, topeltpäringut/töötajaid, värskeid õigusi, aegumist, rendi ülevõtmist, lubamatut failiteed ning vanade viitamata failide koristust. Kõik **174 testi 23 failis läbisid**. Playwrightis telliti eksport, päris kohalik töötaja koostas 30 kirjet ja brauser laadis 7127-baidise JSONL-faili alla. Faili rühmad kontrolliti; 390-pikslisel haldusvaatel ei tekkinud ülevoolu. Isolatsiooniks loodud ettevõte, konto, sessioon ja privaatne ekspordifail eemaldati.

## Jätkuv töö

CSV-impordi server ja esmane haldusvaade on nüüd lisatud (migratsioonid 023–026). UTF-8 fail on piiratud 5 MiB, 10 000 rea ja 64 veeruga. Mallid hõlmavad teenuseid, töötajaid, kliente ja tulevasi broneeringuid; hinnad on sentides. Vastendus kasutab veeruindekseid ja nõuab eri väljadele eri veerge. Eelvaade säilitab reavead, märgib täiskirje duplikaadid ning vana süsteemi tunnuse kordused. Sama e-postiga eri inimesi ei ühendata. Broneeringu ISO aeg nõuab selget nihet ja ettevõtte ajavööndiga vastavust; kellakeeramise korduv tund on eristatav. Eelvaade kontrollib aktiivset töötaja–teenuse seost ning puhvritega kattuvusi.

Kinnitus on üks omanikuõigusi ja versiooni kontrolliv tehing. Vead või duplikaadikahtlused nõuavad sõnaselget vahelejätmise valikut; ootamatu hilisem konflikt pöörab kogu tehingu tagasi. Korduskinnitus tagastab sama tulemuse. Teenused ja töötajad lisatakse veebis peidetuna, kontosid ei looda. Broneeringud säilitavad imporditud hinnad/kestused, saavad allikaks `import` ning ei ole testbroneeringud. Esialgseid kliendi- ega ettevõttekirju ei looda. Eraldi omaniku kinnitus lubab edasised klienditeavitused ja ainult tulevase saatmisajaga meeldetuletused, eeldades seadistatud meeldetuletuse ja halduslingi poliitikat. Lõpetamata impordi tühistamine tühjendab rea kontaktandmed ja kustutab privaatse lähtefaili; kordus lõpetab pooleli jäänud failikoristuse.

Impordi 14 sihitud testi kontrollivad CSV piire, vigast UTF-8/tsiteerimist, malle, kellakeeramist, 601 rea lehekülgi, õigusi/RLS-i, samaaegseid üleslaadimisi ja kinnitusi, kõiki nelja kirjeliiki, vaikset loomist, kinnituse tagasipööramist, hilist kattuvust, korduvat meeldetuletuskinnitust ja tühistamise failikoristust. Eesti/inglise/vene tekstid ja kogu partii vea-/hoiatuskokkuvõte on lisatud. Tootmise ehitus läbib 106 lähtefaili arhitektuurikontrolliga.

Chromiumi brauseris laaditi neljarealine kliendifail, eelvaade näitas ühte vigast ja ühte korduvat rida, kinnituse sõnaselgete vahelejätmisvalikutega lisandus kaks eri sama e-postiga klienti. See tulemus kontrolliti andmebaasis. Mall laaditi brauseriga alla. Keelevahetus kontrolliti inglise ja vene keeles; 390-pikslisel mobiilivaatel dokumendi laius oli 375 pikslit. Partiivaliku tunnust lühendati ja eduteade muudeti keelevahetusega kaasnevaks. Pildid on `output/playwright/chapter18-import.png` ja `chapter18-import-mobile.png`. Katseettevõte, konto, sessioon, impordiread ja privaatne lähtefail eemaldati.

## Lepinguline lahkumine: kohalik teostus

Omaniku MFA-ga vorm ja API salvestavad lepingu viite, kinnituse ning neli eraldi ajatemplit: uute broneeringute peatamine, tellimuse lõpp, ajutise andmeligipääsu lõpp ja varaseim kustutamine. Vaiketähtaegu ei ole. Migratsiooni 027 tervik- ja järjestuspiirang välistab pooliku kava. Olemasoleva tellimuse `ends_at` seotakse kavaga; arvelduse ülejäänud olekusiirded jäävad peatükki 19.

Avaliku, käsitsi ja imporditud uue broneeringu keeldu ning liikmesuse andmeligipääsu kontrollitakse päringu hetkel. Nii ei sõltu piiride jõustumine taustatöö õigeaegsusest. Avalik leht näitab neutraalset teadet ja ettevõtte kontakti. Domeenireservatsiooni, kliendikirjeid ega tulevasi broneeringuid lahkumistoiming ei kustuta. Ekspordi tellimine, koostamine ja allalaadimine jäävad omaniku kehtiva ajutise ligipääsu piiridesse. Teenuse lõpu järel ei saadeta ootel broneeringukirju. Omanik näeb ka pärast ligipääsu lõppu enda konto- ja lahkumiskava teavet, kuid ettevõtte andmevaated ei avane.

Kava tühistamine enne teenuse lõppu jätab juba peatatud avaliku lehe pausile; avaldamine nõuab uuesti seadistusvaate kontrolli. Lõppenud teenust omanik selle vormiga ise ei pikenda. Varaseim kustutamisaeg on säilituskava sisend, mitte automaatne kustutuskäsk: peatükk 21 peab arvestama andmeliike, säilitustähtaegu ja kustutuskeelde.

Kõik **193 testi 27 failis läbivad**, tootmise ehitus läbib 109 lähtefaili arhitektuurikontrolliga. Neli uut PostgreSQL-i testi katavad broneeringu/domeeni säilimist, ajutist eksporti, tähtaja automaatset jõustumist, rollipiiri, kava tühistamist ning kirjade peatamist. HTTP-test kinnitab, et aegunud andmeligipääs jätab konto nähtavaks ettevõtte andmeid laadimata. Chromiumis salvestati kava, kontrolliti avalikku kontaktteadet, aegumist ning ainult konto/kava allesjäämist halduses. Mobiilivaade oli 390 pikslit ja dokument 375 pikslit. Katseandmed ja sessioon eemaldati.

## Kliendiduplikaatide kontrollitud ühendamine

Kliendihalduse õigusega kasutaja valib kaks konkreetset kaarti, säiliva kaardi, põhjuse ja kinnitab sama isiku. Sama e-posti aadress ei põhjusta automaatset ühendamist. Mõlema kaardi versiooni ja värsket õigust kontrollitakse tenant-lukuga tehingus; UUID korduspäring tagastab sama tulemuse. Broneeringute kliendikaardiseos liigub säilivale kaardile, kuid algne nimi, e-post, telefon, hind, aeg ja broneeringu versioon ei muutu. Ühendamine ei tekita teavitusi.

Migratsioon 028 säilitab vana kaardi viitena (`merged_into_id`) ning eraldi ühendamiskirje. Ka järjestikused ühendamised viivad vanad viited otse säilivale kaardile. Tulevane täpselt samade algsete kontaktidega broneering kasutab säilivat kaarti. Otsing leiab selle ka vana kaardi kontaktide järgi. Kliendikaardil kuvatakse ühendamise tegija, aeg, lähte- ja sihtkaart, põhjus ja üle viidud broneeringute arv. Eksport sisaldab kaartide ühendamisseoseid.

Kõik **195 testi 28 failis läbivad**, tootmise ehitus läbib 110 lähtefaili kontrolliga. Kaks uut PostgreSQL-i testi kontrollivad samaaegset kordust, ajalooliste andmete säilimist, järjestikusi ühendamisi, vanade kontaktide otsingut ja hilisema broneeringu sidumist, versiooni-/rolli-/tunnusepiire ning muutunud korduspäringut. Chromiumis läbiti otsing, säiliva kaardi valik, põhjus, kinnitus ja ajaloo kuvamine. Andmebaasist kontrolliti algse broneeringunime säilimist ja uut kaardiseost. Mobiilivaate laius oli 390, dokumendil 375 pikslit. Katseandmed ja sessioon eemaldati.

## Esimese omaniku kutse taastamine

Platvormihaldur saab haldusvormis valida ettevõtte ja taastada selle algse omaniku kutse. Värske platvormiõigus ja MFA on nõutud ka korduspäringul. Saaja aadress võetakse olemasolevast kutsest, seda taastamise vormis muuta ei saa. Vana kutse tühistatakse; uus privaatne link kehtib 48 tundi. Automaatset e-kirja ei saadeta. Vastus talletatakse krüpteeritult ja UUID korduspäring tagastab sama kutse. Kui mõni bootstrap-kutse on vastu võetud, omaniku liikmesus on olemas või ettevõte pole enam mustand, taastamine keelatakse. See vorm ei ole olemasoleva ettevõtte omaniku ülevõtmise viis.

Kaks lisatesti kontrollivad aegunud kutse taastamist, sama saajat, vana lingi keeldu, samaaegset kordust, krüpteeritud vastust, platvormiõigust, vana valiku konflikti ja omaniku liitumise järgset keeldu. Chromiumis taastati eraldi katseettevõtte aegunud kutse, nähti uut 48-tunnist kehtivust ning suleti privaatne link. Andmebaas kinnitas vana kutse tühistamise ja ühe uue kutse. Katseettevõtted, konto ja sessioon eemaldati. Mobiilivaade oli 390 pikslit ja dokumendi laius 375 pikslit.

Peatüki kohalikud töövood on teostatud: **197 testi 28 failis läbivad**, tootmise ehitus läbib 111 lähtefaili arhitektuurikontrolliga. Päris SMTP/HTTPS, arvelduse kasutusõigused ja lõplik säilituskava on vastavate peatükkide sõltuvused. Tootmisesse pole seda etappi paigaldatud.
