# Peatükk 21 — andmekaitse ja säilitamine

Seis 2026-09-08: kohalik andmetaotluse, kontaktide eemaldamise, impordi algandmete koristamise ja säilituskava halduse teostus. Automaatne säilitustöö, tootmise dokumentide kinnitamine ning varukoopiast taastamise tervikvastuvõtt on avatud. Omanik palus pärast käimasolevat etappi pausi; peatükki 22 selle töö käigus ei alustatud.

## Omaniku töövood

- **Kliendid → kliendikaart → Kliendi andmetaotlus:** pärast isikusamasuse kontrolli kinnitamist saab JSON-paketi kliendikaardi, teadlikult ühendatud kaartide ja broneeringute kontaktikoopiatega. Ühine e-post ei seo erinevaid inimesi. Fail tuleb enne väljastamist üle vaadata. See pakett ei sisalda automaatselt kõiki auditi-, impordi- ega väliste töötlejate andmeid; taotluse täielik vastus vajab nende eraldi läbivaatust. Pakett ei välju rakendusest automaatse kirjaga.
- **Kliendikontaktide eemaldamine:** eelvaade näitab kaarte, broneeringute ja suletavate eksportide arvu ning takistusi. Omanik kinnitab isikusamasuse ja eemaldamise ulatuse. Server kontrollib eelvaate sõrmejälge uuesti; vahepealne muudatus nõuab uut eelvaadet. Tulevane aktiivne broneering, säilitamiskeeld või alles olev kliendi-/broneeringuimpordi algallikas peatab toimingu.
- **Import → lõpetatud/tühistatud import → Impordi algandmete eemaldamine:** eraldi kinnitusega eemaldatakse kogu selle partii CSV-fail, veerupäised ja eelvaate sisud. Loodud teenused, töötajad, kliendid ja broneeringud säilivad. Vana süsteemi tunnusest säiliv räsi toetab kordusimpordi kontrolli. See on pseudonüümne tehniline tunnus, mitte anonüümsuse tõend.
- **Kliendikontaktide säilituskava:** ainult omanik saab kinnitada päevade arvu või tühja tähtaja ning säilitamiskohustusest tuleneva eemaldamiskeelu. Muudatused on versioonitud ja auditeeritud. Tähtaega ei ole vaikimisi määratud. Automaatne eemaldamine on välja lülitatud ka kava salvestamise järel; selle töötaja teostus ja vastuvõtt on veel vajalikud. Arvete tähtaega see seade ei määra.

Kõik uued HTTP-töövood kasutavad haldusdomeeni, elavat sessiooni, omanikuõigust, mahupiiri ja vahemällu salvestamise keeldu. Kirjutused nõuavad täpset Origin-vastet. Omaniku tavapärane MFA nõue jääb kehtima. Kasutajaliidese tekstid on et/en/ru kataloogides.

## Eemaldamise täpne ulatus

Ühes ettevõtte lukuga andmebaasitehingus eemaldatakse valitud isiku kaartide ja seotud broneeringute nimi, e-post ja telefon. Ka algseid kontakte sisaldav `customers.source_key` asendatakse. Kliendiparanduste/ühendamiste auditikoopiad puhastatakse, broneeringusündmuste vabad põhjendused ja tähelepanumärkused eemaldatakse. Ajaloo sündmus, tegija ja aeg säilivad. Halduslingid tühistatakse, salvestatud lingikoopiad eemaldatakse ja ootel teavitused suletakse. Vanade kontaktide taastamist takistab andmebaasi päästik; kliendikaardi parandamine ja ühendamine ning broneeringu muutmine annavad ka rakenduses selge vea.

Broneeringu aeg, teenus, hind, staatus ja püsiv tunnus säilivad. Seetõttu nimetatakse toimingut **kontaktide eemaldamiseks**, mitte täielikuks anonüümimiseks ega kõigi isikuandmete kustutamiseks. Arved, maksed, ettevõttekonto ja töötajaprofiilid ei kuulu sellesse toimingusse.

Kõik ettevõtte varasemad kasutatavad ekspordid suletakse, sest nende failid võivad sisaldada eemaldatavat inimest. Valmis failide õigused aeguvad enne füüsilist koristust; ebaõnnestunud koristust kordab eksporditöötaja. Juba käimasoleva ekspordi vana hetkeseis ei saa avalduda, sest avaldamine kontrollib uuesti töö kehtivust. Kinnitatud privaatsustühistuse avaldamata fail eemaldatakse töötaja lõpetamisel; ebaõnnestunud failikoristuse viimane kaitse on olemasolev orbude koristus. Üldise teadmata COMMIT-tulemuse korral ei kustutata võimalikku avaldatud faili pimesi.

`contact_removals` jätab kontaktideta eemaldamisregistrisse ettevõtte, kaartide ja broneeringute tunnused, aja ja taotleva omaniku. Register on vajalik hilisema taastamiskaitse alusena. **Praegu ei ole eraldi varundatud eemaldamisregistrit ega automaatset taastamisjärgset kordusrakendamist.** Vanast varukoopiast taastatud andmeid ei tohi enne eemaldamiste võrdlust aktiivsesse kasutusse avada. Selle teostus ja taastamisproov kuuluvad peatükki 22.

Varem alla laaditud failid, enne eemaldamist alustatud allalaadimised, adressaadile juba saadetud kirjad, kohalik meilide katsepüük ja varukoopiad vajavad eraldi käitamise töövoogu. Rakendus ei väida nende kaugkustutamist.

## Andmevoogude tehniline register

| Voog / asukoht | Andmed ja eesmärk | Käivitamise eel vajalik täpsustus |
| --- | --- | --- |
| Salongi broneerimisvaade → rakendus → PostgreSQL | Teenus, aeg, nimi, e-post, valikuline telefon; broneerimine ja teavitamine | Salongi privaatsusteave, põhjendatud tähtaeg ja taotluse kontakt |
| Halduskonto / sessioonid | Konto e-post, õigused, sessioonid, MFA; ligipääsu kontroll | Platvormi roll, konto säilitamine ja aegunud tunnuste koristuse vastuvõtt |
| CSV-import ja JSONL-eksport → privaatne failiala | Üleminek, andmete tagastamine, omaniku allalaadimine | Tootmise failiala, varundus ja koristuse seire |
| Teavitustöötaja → SMTP → adressaat | Vajalik broneeringu- või arvesisu | Tegelik SMTP käitaja, meiliserveri logide/järjekorra tähtaeg ja asukoht |
| Arveldus → Maksekeskus | Arve/makse tunnused ja pakkujale vajalik arveldusinfo | Päris lepingu, andmevoogude ja keskkonna vastuvõtt; kohalike testide edu ei tõenda seda |
| Valikuline teenuste sisutõlge | Teenuse nimi ja kirjeldus, mitte kliendikontaktide töövoog | Tegelikult kasutatava tõlkepakkuja leping ja lubatud sisu |
| Käitaja / arendaja tugi | Õigustega tehniline ligipääs, audit | Isikud, juurdepääsu asukohad, konfidentsiaalsus, alltöötlejad |
| Varundus ja taastamine | Andmebaas, vajalikud failid, eemaldamisregister | Väline kaitstud asukoht, rotatsioon ja eemaldamiste taastamiskaitse |

## Taotluse ja intsidendi käsitlemise tööjuhis

Taotluse saaja tuvastab ettevõtte ja isiku sobival viisil, fikseerib saabumise aja, taotluse ulatuse ning vastutava käsitleja. Ühist e-posti ei loeta isikusamasuse tõendiks. Omanik kontrollib valitud kaarte, väljastatavat faili ja võimalikku teiste inimeste teavet; vajadusel korrigeerib kaardid senise auditeeritud töövooga. Eemaldamise erandid ja säilitamiskohustused hinnatakse enne kinnitamist. Vastuse saatmine, isiku tuvastamise tõendus ning väliste koopiate lahendamine dokumenteeritakse ettevõtte kokkulepitud kanalis; rakendusse ei lisatud isikut tõendavate dokumentide üleslaadimist.

Intsidendi kahtluse korral määratakse vastutav käsitleja, piiratakse mõjutatud ligipääs, säilitatakse vajalik tehniline tõend ning dokumenteeritakse tuvastamise aeg, ulatus, mõjutatud andmed, leevendus ja otsused. Rakenduse logidesse ei kopeerita paroole, halduslinke ega tervet kliendikirjet. Vastutav töötleja hindab teavitamiskohustuse ja tähtaja; platvormi ning salongi teavituskanalid ja tegelikud kontaktisikud tuleb enne tootmist kinnitada.

Õiguslike teemade alus on [isikuandmete kaitse üldmäärus](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng): säilitamise ja minimaalsuse põhimõtted (art 5), andmesubjekti õiguste käsitlemine (art 12–22), töötlemise kokkulepped (art 28), turvalisus ning rikkumised (art 32–34). Siinne tehniline register ei ole valmis leping ega õigusliku vastavuse kinnitus.

Enne päris käivitamist on endiselt vaja kinnitada ettevõtete kasutustingimused, töötlemise kokkulepe, platvormi ja salongi privaatsusteave, tegelike alltöötlejate register, kõikide andmeliikide säilituskava ning intsidendi vastutajad/kontaktid. Broneerimistingimused, platvormi kuutasu tingimused ja võimalik turundusnõusolek jäävad eri eesmärkidega dokumentideks.

## Kontrollitõendid

- `tests/customer-merge.test.ts`: 6 testi; lisandusid isikupõhine väljastus, omanikuõigus, isikusamasuse kinnitus, sama e-posti eraldatus, kinnitatud aliaste ulatus, säilituskava konkurents, eemaldamise takistused, auditikoopiate puhastus, linkide/eksportide sulgemine ja taastamise keeld.
- `tests/import-management.test.ts`: 9 testi; lisandusid algandmete eemaldamine koos ärikirjete säilimise ja duplikaaditunnuse kontrolliga ning impordikoopiate eemaldamise eeltingimus.
- `tests/customer-privacy-http.test.ts`: 2 testi; host, sessioon, Origin, vahemälu keeld, faili päis ja GET-i eemaldamiskõrvalmõju puudumine.
- `tests/exports.test.ts`: 7 testi; lisandus vana hetktõmmise avaldamise võistluse ja valmis faili eemaldamise kontroll.
- Lõplik täielik komplekt: **241 testi, 34 faili**, kõik läbisid. Tootmise ehitus ja 147 lähtefaili arhitektuurikontroll läbisid. Skeemiregister uuendati: 56 tabelit/vaadet ja 46 migratsiooni.
- Kohaliku halduse brauseris kinnitati tühja tähtajaga säilituskava, eemaldamise eelvaade ja kinnitamata eemaldamisnupu keelatus. Andmepaketi nupust jõudis päring serverisse ja auditi sündmus tekkis; rakendusesisese brauseri allalaadimissündmust ei õnnestunud jälgijaga kinnitada. HTTP-paketi päiseid ja sisu kontrollivad testid. Sünteetiline konto, sessioon ja ettevõte eemaldati pärast kontrolli.

Migratsioonid 043–046 rakendati kohalikus arendusandmebaasis. Sünteetiliste testide eemaldamine ei tähenda päris kliendiandmete kustutamist. Tootmises neid muudatusi selle etapi käigus ei paigaldatud.
