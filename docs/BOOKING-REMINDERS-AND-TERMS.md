# Kliendi meeldetuletusvalik ja ettevõtte tingimused

Viimases sammus saab broneerija valida e-posti meeldetuletuse. Valik on algul märkimata. Seda näidatakse, kui ettevõttel on `reminder_minutes` määratud ning valitud aja meeldetuletuse hetk on tulevikus. SMS-i hilisem demovalik ja saatmise piirangud on kirjeldatud allpool. Ilutegu kohalikus demos kasutatakse 1440 minuti näidisseadistust; demo ei saada päriskirju.

Uus avalik vorm saadab alati `emailReminder: true/false`. Migratsioon `053_booking_reminder_preference.sql` lisab eraldi `bookings.customer_reminders` välja. Selle vaikeväärtus säilitab varasemate broneeringute ja vana API-kliendi ning halduse käsitsi lisamise käitumise. `customer_notifications` juhib endiselt kinnituse, muudatuse ja tühistamise kirju; meeldetuletusest loobumine seda ei muuda.

Eelistus säilib broneeringu muudatustel, sündmuste hetkeseisus ja ekspordis. Järjekorda lisamine, ettevõtte teavitusaja muutmine, impordi meeldetuletuste lubamine ning saatja kontrollivad meeldetuletuse eelistust. Kinnitamise korduskatse säilitab sama päringu sisu; ebaselge saatmistulemuse ajal on ka linnuke lukus.

Tingimuste lause enne kinnitamisnuppu avab ettevõtte teksti natiivses dialoogis. Sisu allikas on senine `booking_terms`, mida omanik haldab ettevõtte seadistamise vormis. Teksti kuvatakse turvalise lihttekstina. Sulgemisnupp, Escape, natiivne fookuse hoidmine ja käivitajale naasmine säilitavad vormi sisu. Kinnitus kasutab olemasolevat `expectedRulesVersion` kontrolli; vanade reeglite järgi uut broneeringut ei kinnitata. Eraldi tingimuste linnukest ei lisatud.

Komponendid: `booking/booking-reminder`, `booking/booking-terms`, `ui/dialog`, kõigil oma CSS Module. Globaalset CSS-i ei muudetud. Ühine kasutusjuhend kirjeldab nii broneerija valikut kui ka ettevõtte seadistamist.

Migratsioon ja demo seadistus on rakendatud kohalikult. Serveripaigalduseks tuleb migratsioon rakendada enne veebirakenduse, teavitustöötaja ja eksporditöötaja uuendamist.

## SMS-i demovalik ja kujunduse jätk — 12.09.2026

Hilisem muudatus täiendab ülal kirjeldatud esialgset e-posti teostust. Migratsioon 054_sms_demo_preference.sql lisab customer_sms_reminders välja, vaikimisi false. Demobroneeringu smsReminder eelistus säilib andmebaasis, sündmuse hetkeseisus ja ekspordis. SMS-i valimine nõuab rahvusvahelise suunakoodiga telefoninumbrit. Valik on algul märkimata ja ebaselge kinnitamise ajal lukus. Mõlema meeldetuletuse aeg kuvatakse väiksema ning tuhmima tekstina eraldi real.

SMS-i valik ilmub ainult demoettevõttel ja tulevase meeldetuletushetke korral. Server lükkab pärisettevõtte SMS-taotluse tagasi. SMS-i saatmisjärjekorda ega teenusepakkuja ühendust ei loodud. Päristeenuse lubamine nõuab teenusepakkujat, saatmist ja tõrgete käsitlemist. Migratsioon 054 on rakendatud ainult kohalikule andmebaasile.

Tingimuste dialoog on ümardatud ning ristiga paremas ülanurgas. Rist ja Escape sulgevad ainult tingimused ka siis, kui broneerimine ise on modaalis. Fookus naaseb lingile ja vorm säilib.
