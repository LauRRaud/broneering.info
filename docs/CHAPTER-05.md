# Peatükk 05 — domeenid ja kodulehele lisamine

Alus: arendusplaani peatükk 05, D-01/D-04/D-13 ning AT-27/28/29/31/33. Üks ühine rakendus, omaniku soovil kujundus ootel. Tööd tehakse ühe agendiga.

| Töö | Teostus ja vastuvõtu piir |
| --- | --- |
| P05-01 Domeeniseos | Ettevõte ja domeen tekivad ühes tehingus. Domeeni omanik salvestatakse püsivasse reservatsiooni; kustutatud aadress ei lähe teisele ettevõttele. Tundmatu või pooleli domeen ei ava ettevõtet. |
| P05-02 HTTPS | Olemasolev wildcard-DNS, Nginx ja Certbot HTTP-01. Üks käitaja käsk kontrollib DNS-i, väljastab sertifikaadi, valideerib Nginxi, kontrollib HTTPS-i ja alles siis aktiveerib domeeni. Certboti timer ja projektipõhine deploy hook uuendavad sertifikaate. |
| P05-03 Kodulehed | MFA-ga omanik määrab kuni kümme täpset HTTPS-päritolu. Vastuvõtt/töötaja ei saa lubatud kodulehti muuta. Tootmises puuduvad HTTP, metamärgid ja suvalised teekonnad. |
| P05-04 Link ja iframe | Tavaline link jääb varuvariandiks. `/embed` kasutab sama broneerimisvoogu; ainult sellel teekonnal on ettevõtte lubatud `frame-ancestors`. Halduse ja põhivaadete raamistamine jääb keelatuks. |
| P05-05 Modaal ja sõnumid | Oma `/widget/v1.js`, natiivne dialoog, sulgemine ja fookuse taastamine. Kontrollitakse akent, päritolu, versiooni, kanalit ja täpset sõnumiskeemi. Sõnumid sisaldavad ainult paigutust; kliendiandmeid ja broneeringutunnuseid ei saadeta vanemale. |

## Valitud taristu

V1 käitamine kasutab iga ettevõtte eraldi sertifikaati olemasolevas serveris. Wildcard-sertifikaati ei ole vaja: DNS API saladust ega uut tasulist teenust ei lisata. Käitaja uus ettevõte/domeen:

```bash
cd /srv/broneering.info
sudo python3 infra/provision-domain.py salonginimi --name 'Salongi nimi' --address 'Aadress' --apply
```

Ilma `--apply` parameetrita näidatakse plaani. Prooviettevõttele lisa `--demo`. Olemasoleva ettevõtte puhul võib nime ja aadressi ära jätta; neid vaikimisi ei muudeta. Käsk on korratav, pending-seis säilib vea korral ning juba töötavat domeeni ei tõsteta uue väljastuse vea pärast maha. Reserveeritud nimed hõlmavad ka `haldus`, `app`, `api`, `admin`, `cdn`, `www`, `mail`, `demo`, `demo2`.

Kasutaja peab käivitama käsu omaniku VPS-is root-õigusega. Veebikonteinerile ei anta Dockeri/Nginxi/Certboti haldusõigust. Ettevõtte liitumisviisard ja esimese omaniku konto on peatükkide 18 ning 04 tööd; see käsk ei loo sisselogimiskontot ega saada kirju. Kohandatud kliendidomeenid jäävad järgnevasse versiooni.

Domeeni sulgemiseks kasuta sama käsu `--retire --apply` valikut. Domeeniseos märgitakse mittevalmiks; ettevõtte andmeid ega püsivat aadressireservatsiooni ei kustutata. Nginxi ja sertifikaadi säilitamine võimaldab vanal lingil tagastada neutraalse 404 vastuse.

Certboti väljastamise piirangud kehtivad. Suure liitumismahu korral tuleb taristu üle viia automatiseeritud DNS-01 wildcard-sertifikaadile; massväljastust ei lubata selle käsu omadusena. Tundmatu HTTPS-domeeni jaoks pole sertifikaati väljastatud, mistõttu brauser võib peatuda TLS-is; see ei anna ligipääsu teisele ettevõttele.

## Paigaldamine kodulehele

Omaniku halduses on lubatud kodulehtede vorm ja kopeeritavad lingi/iframe-i/modaali näited. Näiteks `https://salong.ee` ning `https://www.salong.ee` on eraldi päritolud. Iframe-i `parent` väärtus peab vastama tegelikule kodulehele. Üldisele veebisaidile ei anta wildcard-luba.

Skripti serveerib meie enda `https://broneering.info/widget/v1.js`; `cdn` oli dokumendis näidisaadress, mitte väline teenusenõue. V1 sõnumi kuju ja paigaldusatribuudid hoitakse tagasiühilduvana. Uus murranguline protokoll peab saama uue versiooniaadressi. Sisu kasutatakse küpsiste ja haldusseansita.

Kui veebiehitaja keelab skripti või iframe-i, kasutatakse tavalist linki. Kui modaal ei avane, jääb lingi algne navigatsioon toimima; kui iframe ei vasta, kuvatakse eraldi avamise link. Kõigi veebiehitajate piiranguteta ühilduvust ei lubata.

## Kontrollid

07.09.2026: 46 rakenduse testi ning eraldi uus tegeliku vidinaskripti võltssõnumite test läbisid; domeenikäsu 3 Pythoni testi ja tootmisbuild läbisid. Andmebaasitestid kontrollivad pooleli domeeni, aadressi püsivat omanikku, MFA/rollipiire, RLS-i, päritolude muutmist ja dünaamilist CSP-d. Vidinaskripti test kontrollib valet akent, päritolu, kanalit, lisavälju ja lubamatut kõrgust.

Chromiumi brauseris avanesid lubatud kodulehel lehesisene vaade ja modaal. Escape töötas iframe'i seest ning fookus taastus avamislingile. Teine, loata päritolu blokeeriti brauseri CSP-ga; eraldi broneerimislink jäi nähtavaks. Safari/iOS-i ja kõigi veebiehitajate maatriks ning eraldi kolmanda osapoole küpsiste keelamise brauserikatse jäävad peatükkide 12/25 vastuvõtuks.

Tootmises avaldati rakendus `df7fbbd`, domeenikäsu Nginxi rakendumise korduskatse `b2e63d3` ning migratsioon 004. Enne migratsiooni tehti `backups/before-chapter05.dump`. Avaleht, demo ja haldus tagastasid HTTPS 200; `/widget/v1.js` samuti. Demo `/embed` keelas ilma lubatud päritoluta raamistamise.

Käsk lõi prooviettevõtte `p05-kontroll`, väljastas kehtiva sertifikaadi ja aktiveeris domeeni. Esimene TLS-kontroll tabas Nginxi vana protsessi; domeen jäi suletuks. Lisatud piiratud korduskatse säilitab TLS valideerimise. Korduskäivitus kasutas olemasolevat sertifikaati ning sama ettevõtet. Avalik proovileht tagastas 200 ja `noindex`. Ainult selle sertifikaadi `certbot renew --dry-run --cert-name broneering-tenant-p05-kontroll --no-random-sleep-on-renew` läbis; timer oli aktiivne ja projekti deploy hook läbis. Proovidomeen suleti käsuga `--retire --apply`: HTTPS vastus 404, ettevõtte nimi vastusest puudus. Reservatsioon ja sertifikaat säilisid. Kohalik ajutine lubatud päritolu eemaldati pärast brauserikatseid.

Allikad: [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), [Certbot webroot ja uuendamine](https://eff-certbot.readthedocs.io/en/stable/using.html).
