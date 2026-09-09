# 23-G09 — ajutine ainult lugemiseks tugivaade

09.09.2026 teostus ja kohalik kontroll: **valmis**. Seos: ptk 04/19, E9 ja AT-23. Testija ja koodi ülevaataja: Codex. Omaniku ning sõltumatu ülevaataja vastuvõtt on märkimata; see töö ei sulge kogu E9 ega V1 vastuvõttu.

## Kasutamine ja lubatud andmed

MFA-ga platvormihaldur valib halduse „Platvorm” osas ettevõtte ja põhjendab toe alustamist. 30 minuti luba avab kohe valitud ettevõtte tugivaate. Ettevõtte nimi, põhjus, aegumine ja ainult lugemise piir on nähtavad. „Minu aktiivsed tugiload” võimaldab enda kehtiva loa uuesti avada ka pärast lehe värskendamist või teises vahelehes. „Lõpeta tugi” tühistab loa serveris.

- **Kalender:** ettevõtte ajavööndi üks päev; broneeringu viide, teenuse ja töötaja nimi, kliendi nime hetktõmmis, algus/lõpp ning olek. Ka üle kesköö ulatuv broneering kuulub kattuva päeva vaatesse.
- **Kliendid:** peamiste kliendikaartide nimi, e-post ja telefon; teise kaardiga ühendatud lähtekaarte eraldi ei näidata. Otsing ja leheküljed on olemas. Nii kalendris kui kliendiloendis on kuni 50 kirjet vastuses.
- Tugi ei väljasta märkmeid, halduslinke, tokeneid, paranduste ajalugu, arveid, eksporti ega mutatsioonide sisendeid. Konto enda eraldi platvormi- või liikmeõigusi tugiluba ei asenda ega laienda.

## Õigused, tehing ja privaatsus

`GET /api/admin/support` nõuab täpset haldushosti, kehtivat sessiooni ja kinnitatud e-posti. Identiteedi lahendamine nõuab MFA-ga kontol MFA kinnitusega sessiooni. Iga lugemine kontrollib lisaks andmebaasist konto aktiivsust, e-posti/MFA/platvormiõigust ning loa kasutaja, ettevõtte, ulatuse, tühistamise ja aegumise tingimusi. Ettevõtte andmeligipääsu lõpptähtajast ei minda mööda. `withTenant` kontrollib RLS-i rakendusrolli ja määrab tehingu ettevõttekonteksti.

Loa realukk, piiratud andmepäring, auditikirje ja lõplik värske loa/konto kontroll toimuvad samas tehingus. Loa tühistamine kasutab sama realukku: enne tühistamise kinnitamist alanud lugemine saab lõpetada, pärast kinnitatud tühistamist uut lugemist ei lubata. Andmebaasiluku taga oodates aegunud lugemine veeretatakse koos auditikirjega tagasi. Andmeid ei tagastata enne auditi õnnestunud COMMIT-i.

`support.view.read` audit salvestab kasutaja, ettevõtte, loa tunnuse, vaate, lehekülje, kalendripäeva ja väljastatud ridade arvu. Kliendikontakte ega otsingusisu auditisse ei kopeerita. Otsing liigub URI-kodeeritud `X-Support-Search` päises, mitte päringu URL-is; URL-i `search` parameeter lükatakse tagasi. Üldine vea vastus ei logi päringu sisu ega SQL parameetreid. Kõik vastused on `no-store` ja `noindex`; lugemine on kasutaja kaupa sageduspiiratud.

Tugimarsruudi POST/PUT/PATCH/DELETE vastavad 405. Tavapärased liikme- ja kirjutusmarsruudid nõuavad endiselt tegelikku liikmesust; tugiloa tunnus ei loo liikmesust ega anna ühtki rollimaatriksi õigust. Testid proovivad kõiki liikmeõigusi ning tegelikke broneeringu tühistamise ja kliendikaardi muutmise API-sid. Lugemisvoog ei saada kirju, loo outbox-kirjeid ega käivita makseid.

Brauser peidab andmed päringu vea, peidetud vahelehe ja lokaalse aegumistaimeri korral. Nähtav vaade kontrollib luba 15 sekundi järel ning fookuse/vahelehe nähtavuse muutumisel; vanad päringuvastused tühistatakse. Sama brauseri teisele vahelehele saadetakse lõpetamisel kohe BroadcastChannel-teade. Teisest seadmest tehtud muudatus ilmneb nähtaval, võrku ühendatud lehel hiljemalt järgmise kontrolli vastusega. Serveri uus lugemiskeeld kehtib kohe pärast tühistamise COMMIT-i; varem nähtud andmete tagasivõtmist ei väideta.

## Kontrollid ja kordamine

Lõplik `npm test` käivitus 09.09.2026 kell 09:23 (Europe/Tallinn): **41 testifaili, 286 testi läbis, vahelejätmisi pole**. `npm run build` läbis koos arhitektuuripiiride ja TypeScripti kontrolliga. [Kontrollitud lähtefailide SHA-256 manifest](audits/support-g09-20260909/source-manifest.json).

`npm test -- tests/support-view.test.ts` kontrollib 25 juhtumit: tegelikku GET/API/andmebaasi voogu, haldushosti ja sessiooni, lubatud payload'i, loa ettevõtte/kasutaja seost, kõiki värske konto turvalippe, ettevõtte andmeligipääsu tähtaega, piiratud välju/auditit, lehekülgi, liikmeõiguste ning kirjutuste keeldu, teavituste puudumist, aktiivsete lubade taastamist, tühistamist, aegumist ja andmebaasiluku ajal aegumist. Andmebaasikatsed vajavad kohalikku `DATABASE_URL` ning `MIGRATION_DATABASE_URL`; ilma nendeta osa katseid jäetakse vahele. Lõplikus kontrollis kasutati päris kohalikku PostgreSQL-i, mitte ainult mock-andmeid. HTTP-testides asendab mock ainult sessiooni lahendamise ja sageduspiiraja; allolev brauserikontroll kasutas päris sessiooni.

Playwrighti brauserikontroll tehti kohaliku rakenduse ja sünteetilise MFA kinnitusega sessiooniga. Platvormikontol ei olnud ettevõtte liikmesust. Kontrolliti toe alustamist, kalendrikirjet, kliendikontakti, Unicode-otsingut ilma otsingutekstita URL-is, 390 px mobiilivaadet, loa uuesti avamist pärast lehe värskendamist, sama loa avamist kahes vahelehes ning teises vahelehes lõpetamist. Loa andmebaasitähtaja möödumisel peitis nähtav vaade kontakti automaatselt. API-vastuseid ei asendatud brauseris. Ajutine ettevõte, konto, sessioon, luba ja kliendi/broneeringu andmed eemaldati pärast kontrolli.

Tõendid: [kalender](audits/support-g09-20260909/calendar.png), [mobiili kliendid](audits/support-g09-20260909/customers-mobile.png), [teises vahelehes lõpetamine](audits/support-g09-20260909/revoked-other-tab.png), [aegumine](audits/support-g09-20260909/expired.png), [testilogi](audits/support-g09-20260909/tests.log), [buildilogi](audits/support-g09-20260909/build.log). Kuvade HTML-i vaikevormid järgivad omaniku varasemat kujunduse edasilükkamist.

Koodiülevaatus hõlmas uut marsruuti, tehingu ja rea luku piire, andmeväljade lubatud loendit, loa taastamist haldusolekus, brauseri vana vastuse/aegumise/tühistamise käsitlust ning olemasolevate kirjutusõiguste säilimist. Töö ei lisa migratsiooni; andmebaasi versioon jääb 048. SMTP/Maksekeskuse pärisühendused, laiem brauserite ja abitehnoloogiate maatriks, koormus, sõltumatu üleandmine, piloot ning välise varunduse/hoiatuste aktiveerimine jäävad vastavatesse 23-G01–G08 töödesse.
