# Järgmised arendustööd

**Peatükk 26, 12.09.2026:** [serveri tehniline vastuvõtt](CHAPTER-26.md) läbis: 12 000 päringut p95 19,2 ms, 30/30 kalendrimuudatust kuni 5,006 s, konkurents, import/eksport, sisemine arveldus, lahkumistähtajad ning 53 tabeli ja privaatfailide taastamine. SMTP, Maksekeskus ja väline varukoopia on omaniku juhisel hilisemaks; inimvastuvõtt ja päris säilitusleping jäävad eraldi.

**Peatükk 24 lõpetatud 10.09.2026:** [AT-01–18 tehniline vastuvõtt ja viis lisakontrolli](CHAPTER-24.md) läbisid. Värske tulemus: 290/290 automaattesti, 9/9 brauserifaasi ja build. Parandatud on nurjunud ajamuutuse järel kadunud vorm/põhjendus. Peatükkide 25–26 ja kogu V1 omaniku vastuvõtt jääb eraldi.

**23-G03 lõppvoor 10.09.2026:** [laiendatud tehnilise testimise aruanne](ACCEPTANCE-G03-COMPLETION.md): 505 HTTP-päringut ja üks andmebaasi räsivõrdlus (506/506), 14/14 brauserifaasi (356 kontrolli), 287/287 automaattesti ja tootmisbuild läbisid. Hilinenud modaali ning makselingi õiguskontrolli vead parandatud. Pärisseadmete, ekraanilugejate ja sõltumatu kasutaja vastuvõtt jääb avatuks; allpool on varasemate voorude ajalooline seis.

**23-G03 uuendus 09.09.2026:** [esimene HTTP-, brauseri- ja klaviatuurimaatriks](ACCEPTANCE-G03.md) on kontrollitud ning leitud WebKiti põhisisulingi viga parandatud. Edasi jääb protokollis nimetatud ülejäänud API/veateekondade, pärisseadmete ja ekraanilugejate vastuvõtt; G03 tervikuna jääb avatuks.

**Uuendus 09.09.2026:** 23-G09 piiratud auditeeritud kalendri- ja kliendikontaktide tugivaade on API/andmebaasi/brauseriga kontrollitud ning serverisse paigaldatud. [Teostus, õiguste piirid ja tõendid](SUPPORT-G09.md). Allpool olevad 08.09 kirjeldused säilitavad oma ajaloolise kontrolliseisu.

**Hilisem serveriuuendus 08.09.2026:** parandused, migratsioon 048 ja Nginxi impordipiir on paigaldatud. [Täpne paigaldusprotokoll ja allesjäänud piirid](DEPLOYMENT-2026-09-08.md). Allpool kirjeldatud kohalik kontroll eelnes sellele paigaldusele.

08.09.2026 ajakohane alus on [peatüki 23 koodi- ja vastuvõtuaudit](CHAPTER-23.md), [AT-01–48 maatriks](CHAPTER-23-ACCEPTANCE.md) ning [hinnatud tööregister](CHAPTER-23-WORK.md). Dokumendi peatükkide järjekord säilib [PROGRESS.md](PROGRESS.md) registris. Auditi valmimine ei tähenda V1 vastuvõttu.

## Auditi parandused

**23-F01–F05 on kohalikult parandatud ja kontrollitud.** [Järelraport](CHAPTER-23-FIXES.md) sisaldab 261 testi, brauseri ja Nginxi tõendeid ning kasutuselevõtu samme: migratsioon 048, rakenduse/taastamistööriista pilt ja Nginxi uuendus. Tootmise paigaldust selles voorus ei tehtud.

## Puuduv teostus ja vastuvõtt

Kohalikult on olemas kontod/õigused, teenused/graafikud, avalik broneerimine ja halduslingid, oma päeva-/nädalakalender, kliendid, teavitustöö, ettevõtte loomine/seadistamine, import/eksport/lahkumine, arveldus ja taastamistööriistad. Piiratud auditeeritud tugivaade on 09.09 teostatud ([tõendid](SUPPORT-G09.md)); säilituskava automaatne täitmine on veel tegemata.

Järgmised vastuvõtud: päris SMTP ja Maksekeskuse ühendus, brauserite/klaviatuuri/ekraanilugeja ja rollide maatriks, lähtekoormus ja kalendri nähtavuse mõõtmine, piloot, sõltumatu paigaldus/taastamine ning õiguste/litsentside üleandmine. Iga töö täpsed eeltingimused ja tõend on tööregistris.

Kuutasu kokkulepe: **35 € lõpphind kuus, piiramatu töötajate arv, prooviperioodita, maksetähtaeg 7 päeva, hilinemise lisaaeg 0**. Maksekeskuse kuutasu arve makselink/püsimakse on omaniku lubatud täpsustus. Broneeriva lõppkliendi teenuse ettemaks ei kuulu V1-sse.

Kujundus jääb omaniku suuna kokkuleppeni ootele. Väline varunduskoht, tootmise varunduse aktiveerimine ning hoiatuskanal jäävad omaniku 08.09.2026 otsusel hilisemaks. Need piirid jäävad V1 vastuvõtus nähtavaks.

SMS, väliskalendrite sünkroonimine, mitu asukohta ja suvalise kodulehe ehitaja jäävad eraldi hilisemasse ulatusse.

## Toote suund — omaniku täpsustus 07.09.2026

broneering.info on paindlik broneerimissüsteem teenusepakkujatele. V1 fookus on ilu ja heaolu, konsultatsioonid ning lihtsad teenindusettevõtted, kus üks broneering hõivab ühe teenindaja aja. Avaleht ja otsingumetaandmed kasutavad seda laiemat positsioneerimist.

Järgmine suur laiendus on ressursipõhine broneerimine: inimene, ruum, pesuboks, seade või nende kombinatsioon. See vajab eraldi ressursinõudeid, saadavuse ühisosa, kõigi vajalike ressursside atomaarset hõivamist ja vabastamist ning ressursipõhist haldust. Olemasolev staff tabel tähendab V1-s inimest; ruume ei esitata varjatult töötajatena. Rühmatundide kohtade arv, korduvad ajad, sõiduaeg ja valdkondlikud kliendiandmed on eraldi laiendused. Lai turupositsioon ei tähenda nende funktsioonide ega meditsiinivaldkonna nõuete täidetust.
