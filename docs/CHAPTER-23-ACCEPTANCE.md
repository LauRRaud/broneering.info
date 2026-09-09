# Peatükk 23 — AT-01–AT-48 tõendite maatriks

**23-G03 uuendus 09.09.2026:** [esimene automaatne põhimatriks](ACCEPTANCE-G03.md) lisab AT-02/05/19/22/23/24/32/35 piiratud uue HTTP- ja kolme brauserimootori tõendi. 241 kontrolli, 12 haldusrolli/mootori kombinatsiooni ja kolm klaviatuuriga avalikku broneerimist läbisid. WebKiti põhisisulingi viga parandatud. Allpoolsete ridade laiem vastuvõtt jääb avatuks vastavalt uue protokolli piiridele.

**Uuendus 09.09.2026:** 23-G09 piiratud auditeeritud kalendri- ja kliendikontaktide tugivaade on API/andmebaasi/brauseriga kontrollitud ning serverisse paigaldatud. [Teostus, õiguste piirid ja tõendid](SUPPORT-G09.md). Allpool olevad 08.09 kirjeldused säilitavad oma ajaloolise kontrolliseisu.

**Hilisem serveriuuendus 08.09.2026:** parandused, migratsioon 048 ja Nginxi impordipiir on paigaldatud. [Täpne paigaldusprotokoll ja allesjäänud piirid](DEPLOYMENT-2026-09-08.md). Allpool kirjeldatud kohalik kontroll eelnes sellele paigaldusele.

08.09.2026 auditeeritud tööpuu ja ühised keskkonnaandmed: [auditi põhiosa](CHAPTER-23.md). Katsete pealkirjad pärinevad lähteplaani peatükkidest 24–26. Kõik allpool viidatud automaattestid läbisid selle auditi käivituses; [JSON-raport](audits/chapter23-20260908/vitest.json) sisaldab täpseid testinimesid ja tulemusi.

08.09 paranduste järel on F-01–F-05 mõjutatud read allpool ajakohastatud. [Järelraport](CHAPTER-23-FIXES.md) eristab uut kohalikku tõendit kogu toote ja omaniku vastuvõtust.

- **Tehniline tõend**: nimetatud automaatkatse tõendab kirjeldatud piiri kohalikus keskkonnas. See ei ole omaniku allkirjastatud vastuvõtt ega kogu seotud kasutajaliidese katse.
- **Osaline**: olemas on kood, kitsam automaatkatse või varasem protokoll; terviktingimuse värske tõend puudub.
- **Viga**: auditis kinnitatud vastunäide takistab kirjeldatud teekonna vastuvõttu. Kitsamad olemasolevad testid võivad samal ajal läbida.
- **Puudub/ootel**: nõutav teostus või katseprotokoll puudub; edasilükkamise põhjus on märgitud.

Testija: Codex, kohalik koodi- ja käitumisaudit. Kõigi ridade omaniku kinnitaja ja vastuvõtu kuupäev: **märkimata**. Ajaloolised peatükkide brauseritõendid on taust; neid ei esitata selles voorus uuesti käivitatuna.

## Broneerimise õigsus

| ID ja lähteplaani katse | Seis | Tegelik tõend | Puuduv vastuvõtt / parandus |
| --- | --- | --- | --- |
| AT-01 Teenuse järgi töötajate valik | Tehniline tõend | [booking.test.ts](../tests/booking.test.ts): teenuse sobivus eristub vabade aegade puudumisest; kataloog tagastab lubatud seosed | UI eri teenuste maatriks 23-G03 |
| AT-02 Vigane töötaja otse API-s | Osaline | `booking.test.ts`: võõra/sobimatu seose tagasilükkamine päris mootoris; marsruut läbib sama mootorit | Täielik päris HTTP negatiivne katse 23-G03 |
| AT-03 Teenusel ainult üks töötaja | Osaline | `booking-flow.tsx` jätab ühe töötaja sammu vahele; auditi F-02 brauseris kasutati ühe töötajaga teenust | Eri teenuste sammude ja kokkuvõtte eraldi läbiv protokoll 23-G03 |
| AT-04 Töötaja isiklik otselink | Osaline | `booking.test.ts`: isiklik kataloog sisaldab ainult seotud teenuseid ning konkreetseid hindu/kestusi; lehe parameetrid ja UI loetud | Värske otselingi brauserikatse 23-G03 |
| AT-05 „Töötaja pole oluline” | Osaline | `booking.test.ts`: koondsaadavus on töötajate pakkumiste täpne ühend; `booking-flow.tsx` ei kinnita aega valiku eest | Põhiteekonna brauseri/kasutaja vastuvõtt 23-G03 |
| AT-06 Erinev hind/kestus samal ajal | Osaline | `booking.test.ts`: eraldi pakkumised, muutunud hinna/kestuse korral puudub vaikimisi asendamine; UI kuvab konkreetse pakkumise | Brauseris võrreldavuse ja korduskinnituse protokoll 23-G03 |
| AT-07 Etteteatamine 2 h, praegu 13.00 | Tehniline tõend | `booking.test.ts`, [schedule-management.test.ts](../tests/schedule-management.test.ts): kahe tunni piir saadavusel ja kinnitamisel | Omaniku lõplik vaikeväärtus/katseversioon fikseerida |
| AT-08 Etteteatamispiir möödub vormis | Osaline | Samad testid kontrollivad aega kinnitamisel uuesti; UI säilitab kontaktid vananenud pakkumise korral | Kontaktide säilimise värske brauserikatse 23-G03 |
| AT-09 Teenuse puhver ja kõrvalbroneering | Tehniline tõend | `booking.test.ts`, `schedule-management.test.ts`: puhvrid, pausid ja ainult puhvrit puudutavad konfliktid | Tõend kohaliku mootori/DB piirist |
| AT-10 Tööpaus, puhkus ja erandpäev | Tehniline tõend | `booking.test.ts`, `schedule-management.test.ts`: suletud/asendatud päev, puhkus ning asukoha/töötaja ühisosa | Tõend kohaliku mootori/DB piirist |
| AT-11 50 sama aja samaaegset taotlust | Tehniline tõend | `booking.test.ts`: 50 konkureerivat päris DB toimingut → 1 broneering ja 1 outbox-sündmus | Ei ole 20 HTTP saadavuspäringu/s ega tootmiskoormuse katse; AT-48 eraldi |
| AT-12 Sama päringu kordus | Tehniline ja brauseritõend | F-02 parandatud: päris 201 + kadunud vastus → 429 → HTML 403 → algne kinnitus; üks võti, üks broneering/sündmus. [Järelraport](CHAPTER-23-FIXES.md) | Teiste brauserite/rollide maatriks 23-G03; omaniku vastuvõtt märkimata |
| AT-13 Sama tunnus, erinev sisu | Tehniline tõend | `booking.test.ts`: muutunud sisu konflikt; [booking-management.test.ts](../tests/booking-management.test.ts): muutmiskäskude kordused | Invariant säilib F-02 paranduse järel |
| AT-14 Graafiku sulgemine ja broneerimine | Tehniline tõend | `schedule-management.test.ts`: ühine lukustus sulgemise/kinnitamise võistluses; `booking.test.ts`: päris ummikust taastumine | Lähtekoormuse pikk katse 23-G06 |
| AT-15 Aja muutmine ebaõnnestub | Tehniline tõend | `booking-management.test.ts`: vana hõivamine ja teavitused säilivad aegunud hinna/reegli/saadavuse korral | Kasutajale nähtav veateekond 23-G03 |
| AT-16 Kaks administraatorit muudavad | Tehniline tõend | `booking-management.test.ts`: samast versioonist võidab üks; teine ei kirjuta üle | Kahe brauseri tervikteekond ja värskendus 23-G03/G06 |
| AT-17 Kellakeeramine ja ajavöönd | Tehniline tõend | `booking.test.ts`: Tallinna kevadine puuduv ja sügisene mitmetähenduslik kellaaeg; kalendri nädalapiirid; [import-fields.test.ts](../tests/import-fields.test.ts): eksplitsiitse nihkega import | Teised kasutusele võetavad ajavööndid fikseerida katsemaatriksis |
| AT-18 Teenuse või töötaja arhiveerimine | Tehniline tõend | `service-management.test.ts`, `booking-management.test.ts`: valikud, ajalugu ja tulevased ajad; F-03 uued kutse-/taasaktiveerimis-/migratsioonikatsed läbivad | Tervikliku rolli/UI lahkumise vastuvõtt 23-G03 |

## Turve ja kasutatavus

| ID ja lähteplaani katse | Seis | Tegelik tõend | Puuduv vastuvõtt / parandus |
| --- | --- | --- | --- |
| AT-19 Teise ettevõtte ID API-päringus | Osaline | `booking.test.ts`, `access.test.ts`, `data-model.test.ts`, teenuste/graafikute/impordi testid: päris RLS, liitvälisvõtmed ja rollipiirid; HTTP-valvurite testid | Kõigi praeguste marsruutide tegelik HTTP lugemise/muutmise/kustutamise negatiivne maatriks 23-G03 |
| AT-20 Teise ettevõtte eksport või fail | Tehniline tõend | [exports.test.ts](../tests/exports.test.ts): teise ettevõtte ja tühistatud omaniku ligipääs keelatud, aegumine enne koristust; `private-files.ts` loetud | Päris allalaadimise brauseri/proksi vastuvõtt 23-G03 |
| AT-21 Ettevõttekontekst ühenduste puulis | Tehniline tõend | `booking.test.ts`: eri kontekstid/ühendused; `data-model.test.ts`: kontekstita read varjatud; `db.test.ts`: rikutud ühendus kõrvaldatakse | Kontrollitud rakenduseroll ei ole superuser/BYPASSRLS |
| AT-22 Avalik saadavuse päring | Tehniline tõend | `booking.test.ts` AT-19/21/22; `availability.ts` ja avalike API-de DTO-d: kliendikontaktid ei kuulu saadavusvastusesse | Üldine turva-/logimaatriks 23-G03 |
| AT-23 Rolli piirang ja peidetud nupp | Osaline | [access.test.ts](../tests/access.test.ts), `admin-http.test.ts` ja valdkonnatestid kontrollivad värskeid õigusi serveris | Kõigi praeguste rollide/API-de laiem maatriks jääb 23-G03; 23-G09 piiratud tugivaate API/andmebaasi/brauseri õigused kontrollitud 09.09 ([tõendid](SUPPORT-G09.md)); F-03 parandatud |
| AT-24 Lahkunud töötaja sessioon | Tehniline tõend | Olemasolev sessioonitühistus ja F-03 parandatud kutse elutsükkel, samaaegne vastuvõtt/arhiveerimine ning legacy-migratsioon läbivad | Tootmises tuleb rakendada migratsioon 048; rolli/UI maatriks 23-G03 |
| AT-25 Aegunud, tühistatud või võõras link | Osaline | `booking-management.test.ts`: tokenite piirid ja aegumine luku ootamisel; `booking-management-http.test.ts`: 410 koos kontakti juhisega | Kõigi vigade brauseris loetavus 23-G03 |
| AT-26 Meiliskanner avab halduslingi | Tehniline tõend | `booking-management-http.test.ts`: GET kutsub ainult lugemist; `booking-management.test.ts`: kõrvaltoimeta lugemine | Kliendi kirjutus nõuab eraldi kinnitust ja kaitstud päringut |
| AT-27 Tundmatu alamdomeen | Tehniline tõend | `booking.test.ts`: täpne host ja tundmatud/reserveeritud nimed; `embed.test.ts`: mittevalmis domeen jääb suletuks | Tegelik DNS/TLS vastuvõtt pärast juurutust eraldi |
| AT-28 Võltsitud postMessage | Tehniline tõend | [widget.test.ts](../tests/widget.test.ts) kontrollib tegelikku väljastatavat `public/widget/v1.js`: aken, päritolu, kanal, skeem; `embed.test.ts` skeemipiirid | Päris mitme päritoluga brauserikatse 23-G03 |
| AT-29 Iframe lubamata kodulehel | Osaline | `embed.test.ts`: hostipõhine CSP ja loa eemaldamine; `proxy.ts` ja `embed.ts` loetud | Päris brauseri CSP jõustamise maatriks 23-G03 |
| AT-30 Piiratud kolmanda osapoole küpsised | Osaline | Avalik broneerimine ei kasuta haldussessiooni; manustamise ja sõnumite teostus loetud | Küpsisepiirangutega Safari/Chrome/Firefoxi katse puudub, 23-G03 |
| AT-31 JavaScripti paigaldusskripti rike | Osaline | `embed.test.ts`: snippet säilitab algse lingi; tegelik widget jätab varulingi alles | Skripti blokeerimise ja laadimistõrke brauserikatse 23-G03 |
| AT-32 Klaviatuur ja ekraanilugeja | Osaline | Väljade nimed, vigade piirkonnad, fookus ja `accessibility.css` loetud; varasem ptk 12 Chromiumi kontroll | Ekraanilugeja ja kogu põhiteekonna käsitsi/automaatne vastuvõtt puudub; 23-G03 |
| AT-33 Modaali fookus ja sulgemine | Osaline | Widget kasutab native `dialog`-i; Escape/postMessage ja avaja fookuse taastamine koodis | Klaviatuuri/ekraanitööriista ja iframe'i eri brauserite katse 23-G03 |
| AT-34 Kujunduse halb kontrast ja mustand | **Puudub/ootel** | `data-model.test.ts` kontrollib mustandi/avaldatu DB eraldust; kasutatav teema-, meedia- ja kontrastihaldus puudub | Kujundus omaniku otsusel ootel; **23-G04**, DB tabel pole funktsiooni vastuvõtt |
| AT-35 Mobiil ja brauserid | Osaline | Olemasolevad Chromiumi tõendid ja auditi kaks kitsast brauserikatset | Kokkulepitud versioonidega Safari/Chrome/Firefox, mobiil ja vaadete maatriks **23-G03** |

Parooli taastamise, MFA/varukoodide ja sessiooni sulgemise päris handler'i katse läbis (`auth-flow.test.ts`). See on väärtuslik lisatõend, kuid ei asenda ptk 25 kogu ASVS-i, väärkasutuse, logide ega failiüleslaadimise vastuvõttu. Uut CVE-inventuuri selles voorus ei tehtud.

## Käitamine ja kuutasu

| ID ja lähteplaani katse | Seis | Tegelik tõend | Puuduv vastuvõtt / parandus |
| --- | --- | --- | --- |
| AT-36 Meiliserver on maas | Osaline | [notifications.test.ts](../tests/notifications.test.ts): ajutine SMTP saatmisviga, sama Message-ID, korduskatsed ja privaatsete vigade varjamine; outbox on broneeringutehingus | Päris oma SMTP katkestamise ja taastamise katse **23-G05** |
| AT-37 Broneering muutub enne meeldetuletust | Tehniline tõend | `booking-management.test.ts`, `notifications.test.ts`: vanad ülesanded asendatakse; saatja kontrollib värsket versiooni lukus | Päris saatmisvastuvõtt 23-G05 |
| AT-38 Tühistatud broneeringu taustatöö | Tehniline tõend | `notifications.test.ts`: juba võetud kinnitus/meeldetuletus tühistatakse, kui tühistamine jõustub enne saatmist | SMTP-le juba üle antud kirja tagasikutsumist ei lubata |
| AT-39 CSV-impordi kordus ja vead | Osaline; tuvastatud viga parandatud | Parseri ja impordi teenusetestid läbivad; F-05 päris Nginx lubab 5 MiB ja keelab 5 MiB + 1 baidi. [Järelraport](CHAPTER-23-FIXES.md) | Autentitud import läbi paigaldatud proksi ja brauseri 23-G03; Nginxi muudatus pole tootmises |
| AT-40 Import või testrežiim | Tehniline tõend | `import-management.test.ts`: algset kirjalainet ei teki; `onboarding.test.ts`, `notifications.test.ts`: demo/testi teavitused summutatud | Kontrollida pärast SMTP ühendamist sünteetiliste adressaatidega 23-G05 |
| AT-41 Sama kuu arveldustöö kordus | Tehniline tõend | [invoices.test.ts](../tests/invoices.test.ts): üks perioodiarve, automaatne tasumata kuude töö, ankurpäev, lõpetamine ja paralleelsed kordused | Välise pakkuja/worker'i pärisvastuvõtt 23-G05; F-01 maksekatse piir on kohalikult parandatud |
| AT-42 Makse märkimine ja tähtaja ületamine | Tehniline tõend | `payments.test.ts`, `invoices.test.ts` ja `payment-checkout-freshness.test.ts`: F-01 parandatud, kõik tagastusteed, osaline/täielik tasumine, kreedit, võistlus ja tegeliku laekumise säilitamine läbivad | Päris maksepakkuja/SMTP tervikvastuvõtt 23-G05 |
| AT-43 Varukoopiast taastamine | Osaline; tuvastatud viga parandatud | Taastamisartefakti/lepituskatse läbivad; F-04 puhastatud kuju ja vana tühja ajaloo brauserivaade kontrollitud. [Järelraport](CHAPTER-23-FIXES.md) | Täielik DB + failide + eemaldamiste + rakenduse taastamine, tootmismahu RPO/RTO 23-G08; väline hoiukoht edasi lükatud |
| AT-44 Puhas uus server ja teine arendaja | Osaline | Auditis tühja DB 47 migratsiooni, `runner` build ja readiness läbivad; paigaldusjuhend olemas | Sõltumatu teise arendaja paigaldus ja broneerimine uuel serveril **23-G08** |
| AT-45 Lähtekoodi ja õiguste üleandmine | Osaline | Kohalik kood/lukufail/juhendid, ptk 20 varasem privaatsuse ja litsentside inventuur | Omaniku ligipääsude ning lepingulise õiguste ahela ja puuduvate litsentsitekstide kinnitus **23-G01** |
| AT-46 Ettevõtte lahkumine | Osaline | [company-exit.test.ts](../tests/company-exit.test.ts), `exports.test.ts`, `embed.test.ts`: tähtajad, õiguste lõpp, eksport, broneeringute säilimine, domeeni reserveerimine | Kokkulepitud tähtaegade, failide üleandmise ja täieliku säilituse tervikvastuvõtt **23-G07/G08** |
| AT-47 Kalendri taustavärskendus | Osaline | `booking-management.tsx` küsib aktiivses vaates perioodiliselt uut seisu, kalender ja ühenduse hoiatus loetud | Kahe eraldi kasutaja muudatuse tegeliku nähtavusaja mõõtmine kuni 10 s tavakoormusel **23-G06** |
| AT-48 Koormuskatse | **Puudub** | 50 sama hõivamise kinnituse test tõendab õigsuse üht piiri | 100 ettevõtet, 100 000 ajaloolist broneeringut, 20 saadavuspäringut/s, p95 < 1 s, taristu/jaotuse/külma-sooja seisu/kestuse protokoll **23-G06** |

Ühtegi osalist või vigast rida ei saa sulgeda lihtsalt olemasoleva testikomplekti uuesti käivitamisega. Paranduse juurde tuleb lisada puuduvat piiri läbiv katse ja uus versioonitud tõend. Lahtiste tööde täielikud sisendid, vastutaja roll, sõltuvused ja hinnangud: [tööregister](CHAPTER-23-WORK.md).
