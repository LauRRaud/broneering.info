# Ilutegu hinnakirja demo

Ilutegu hinnakirja näidisdemo. Töötajad ja töögraafikud on väljamõeldud. Massaažide kestused pärinevad hinnakirjast; teiste teenuste kestused on ajutised näidisajad. Siin ei tehta Ilutegu pärisbroneeringuid.

Allikad: omaniku 12.09.2026 kuvatõmmised 151113 (põhikategooriad), 151204, 151210 ja 151216 (hinnakiri). Neljas pildis korduv tuka lõikus on lisatud ühe korra. Kokku on 34 teenust ja neli põhikategooriat; Ilutegu demos alamkategooriaid ei kasutata. Massaažide 8 kestust pärinevad hinnakirjast; 26 muud kestust on omaniku loal ajutised näidisajad.

| Kategooria | Teenus | Hind | Kestus | Kestuse alus |
| --- | --- | --- | --- | --- |
| Juuksur | Salgutamine + lõikus + föönisoeng — ülipikad juuksed | 110 € | 210 min | Näidiskestus |
| Juuksur | Salgutamine + lõikus + föönisoeng — pikad juuksed | 90 € | 180 min | Näidiskestus |
| Juuksur | Salgutamine + lõikus + föönisoeng — poolpikad juuksed | 80 € | 150 min | Näidiskestus |
| Juuksur | Salgutamine + lõikus + föönisoeng — lühikesed juuksed | 70 € | 120 min | Näidiskestus |
| Juuksur | Põhi + salk + föön — ülipikad juuksed | 120 € | 240 min | Näidiskestus |
| Juuksur | Põhi + salk + föön — pikad juuksed | 100 € | 210 min | Näidiskestus |
| Juuksur | Põhi + salk + föön — poolpikad juuksed | 90 € | 180 min | Näidiskestus |
| Juuksur | Põhi + salk + föön — lühikesed juuksed | 80 € | 150 min | Näidiskestus |
| Juuksur | Värvimine + lõikus + föönisoeng — ülipikad juuksed | 100 € | 180 min | Näidiskestus |
| Juuksur | Värvimine + lõikus + föönisoeng — pikad juuksed | 90 € | 150 min | Näidiskestus |
| Juuksur | Värvimine + lõikus + föönisoeng — poolpikad juuksed | 80 € | 120 min | Näidiskestus |
| Juuksur | Värvimine + lõikus + föönisoeng — lühikesed juuksed | 70 € | 105 min | Näidiskestus |
| Juuksur | Naiste lõikus | 35 € | 45 min | Näidiskestus |
| Juuksur | Meeste lõikus | 25 € | 30 min | Näidiskestus |
| Juuksur | Masinalõikus | 15 € | 20 min | Näidiskestus |
| Juuksur | Juuste otste tasandamine | 20 € | 30 min | Näidiskestus |
| Juuksur | Tuka lõikus | 10 € | 15 min | Näidiskestus |
| Juuksur | Pesu + föönisoeng | 25 € | 45 min | Näidiskestus |
| Juuksur | Ülespandud soeng | 35 € | 60 min | Näidiskestus |
| Juuksur | Osaliselt ülespandud soeng | 35 € | 45 min | Näidiskestus |
| Massaaž | Megamõnnatamine, 2 h | 80 € | 120 min | Kuvatõmmis |
| Massaaž | Klassikaline massaaž, 1,5 h | 60 € | 90 min | Kuvatõmmis |
| Massaaž | Klassikaline massaaž, 1 h | 45 € | 60 min | Kuvatõmmis |
| Massaaž | Aroomimassaaž, 1,5 h | 55 € | 90 min | Kuvatõmmis |
| Massaaž | Reflektoorne jalabaateraapia, 1,5 h | 40 € | 90 min | Kuvatõmmis |
| Massaaž | Selg / turi / kael, 30 min | 30 € | 30 min | Kuvatõmmis |
| Massaaž | Laste massaaž, 30 min | 25 € | 30 min | Kuvatõmmis |
| Massaaž | Jalad, 30 min | 20 € | 30 min | Kuvatõmmis |
| Ripsmed | Klassikaliste ripsmete paigaldus | 35 € | 120 min | Näidiskestus |
| Ripsmed | Klassikaliste ripsmete hooldus | 30 € | 90 min | Näidiskestus |
| Ripsmed | Hübriidripsmete paigaldus | 45 € | 120 min | Näidiskestus |
| Ripsmed | Hübriidripsmete hooldus | 40 € | 90 min | Näidiskestus |
| Küünehooldus | Spa-pediküür + geellakk | 35 € | 75 min | Näidiskestus |
| Küünehooldus | Spa-pediküür geellakita | 30 € | 60 min | Näidiskestus |

## Paigaldamine

Andmed: [demohinnakiri](../scripts/data/ilutegu-demo.ts). [Paigaldusskript](../scripts/seed-ilutegu.ts) näitab argumentideta kokkuvõtet; --check proovib muudatust tehingus ja pöörab tagasi, --apply salvestab. Mõlemad andmebaasikäsud vajavad ALLOW_DEMO_SEED=true ja MIGRATION_DATABASE_URL. Skript lubab ainult olemasolevat aktiivset demo=true, slug=ilutegu ettevõtet.

Skript lisab neli põhigruppi, loob teenused fikseeritud ID-dega ja seob need fiktiivsete näidistöötajatega. Juuksuriteenuseid pakuvad Doris, Ene ja Terje; massaaže Keili ning ripsme- ja küüneteenuseid Anette. Vanad teenused peidetakse veebivalikust ja varasemad alamgrupid arhiveeritakse; neid ega ajaloolisi broneeringuid ei kustutata. Korduskäivitus lähtestab selle demohinnakirja hinnad/kestused ja töötajate erandid samale näidiskonfiguratsioonile, seega see ei ole päriskliendi andmete importimise tööriist.

Kohalik paigaldus ja tagasipööratav korduskontroll läbisid: 34 teenust, 4 aktiivset gruppi; kordusel lisateenuseid ei tekkinud. Kohalik demo asub ilutegu.localhost aadressil. Avalik server uuendati hiljem samal päeval omaniku loal: [paigalduse protokoll](DEPLOYMENT-ILUTEGU-2026-09-12.md). Edasised muudatused valmivad esmalt kohalikult ja ootavad omaniku ülevaatamist.

## Päriskliendi käivitamine

Ilutegu pärisbroneerimisleht luuakse eraldi ettevõtte/seadistuse vastuvõtuga. Enne seda tuleb kinnitada teenuste kestused, tööjärgsed puhvrid, tegelikud töötajad ja nende teenused, graafikud, broneerimistingimused ning logo/värvid. Demo ei muutu automaatselt päriskliendi kalendriks. [Kujundusseadete nõuded](THEME-SETTINGS-REQUIREMENTS.md).

Ilutegu demos ei ole alamkategooriaid. Juuksuri-, massaaži-, ripsme- ja küünehooldusteenused asuvad otse vastava põhikategooria all.
