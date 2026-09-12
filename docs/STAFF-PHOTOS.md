# Töötaja foto failist või telefonikaamerast

## Avalik nimi, initsiaalid ja kontakttelefon

Töötajakaardil on alati nimi. Foto puudumisel või laadimise veal näitab eraldi Avatar-primitiiv initsiaale; dekoratiivset fotot/initsiaale ekraanilugejale ei korrata. Valikuline „Avalik telefon” on ettevõtte omaniku sisestatav kliendikontakt, mitte halduse kasutajakonto telefon. Infoikoon avab töötaja tutvustuse ja olemasoleva numbri; helistamislink kasutab `tel:` aadressi. Nupul on töötaja nime sisaldav ligipääsetav nimi, see töötab klaviatuuriga ja teatab avatud/suletud oleku. Info avamine ei vali töötajat ega alusta kõnet. Telefon ja tutvustus on eraldi valikulised; mõlema puudumisel infoikooni ei kuvata. Ikooni taha peitmine ei muuda numbrit privaatseks.

„Töötajad ja kontaktid” on kättesaadav kõigil broneerimissammudel ja kinnituses. See kasutab sama avaliku kataloogi töötajate nähtavust: aktiivne, veebis lubatud ning seotud avaliku teenusega. Tühjendatud number eemaldab ikooni. Ilutegu numbreid ei ole välja mõeldud. Migratsioon `052_staff_public_phone.sql` on rakendatud ainult kohalikult; serveri tulevane uuendus vajab seda enne rakenduse käivitamist. Vanema kliendi päringus puuduva välja korral olemasolev number säilib. Eksport sisaldab avalikku numbrit.

12.09.2026: teostatud ainult kohalikus versioonis. Serverit ei uuendatud.

Ettevõtte omanik avab salvestatud töötaja jaotise „Töötaja foto”. „Vali pilt” avab failivaliku; „Tee foto” kasutab `accept="image/*" capture="environment"` kaameravihjet. Valitud foto ilmub eelvaatesse, kuid saadetakse alles „Salvesta foto” nupuga. Kaamera avanemise otsustab telefon/brauser; arvutis võib avaneda failivalik. [MDN capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture). Päris Androidi/iPhone'i kaamerakatse on ootel.

JPG, PNG ja WebP, kuni 10 MB ja 40 megapikslit. HEIC vajab esmalt JPG-ks teisendamist. Server kontrollib tegelikku pildivormingut, pöörab pildi orientatsiooni õigeks, vähendab kuni 768 × 768 piiridesse proportsioone säilitades ning kodeerib JPEG-ks. Algfaili ega EXIF/GPS metaandmeid ei säilitata. [Sharp väljundi kirjeldus](https://sharp.pixelplumbing.com/api-output/). Salvestatud failipiir on 512 KiB.

Väike töödeldud pilt hoitakse `staff.photo_image` veerus koos olemasoleva ettevõttepõhise RLS-kaitsega. See kuulub andmebaasi varukoopiasse ja ettevõtte täielikku eksporti (`photo_jpeg_base64`). Foto vahetamine/eemaldamine on üks versioonitud andmebaasitoiming koos auditiga; vanu failikoopiaid ega orbusid ei teki. Foto avalik aadress kontrollib tegelikku ettevõttedomeeni ning töötaja ja ettevõtte avalikkust. Omaniku eelvaade nõuab halduse autentimist ja õigusi. Foto vastus ei ole vahemällu salvestatav.

Vana HTTPS-aadressi tugi säilib. Üles laaditud foto säilib töötaja teiste väljade salvestamisel; käsitsi ei saa omistada teise töötaja sisemist fotoaadressi. Pooleliolevad töötaja vormimuudatused blokeerivad fototoimingud kuni salvestamiseni, et foto tõttu tehtud värskendus ei kaotaks sisestust.

## Kontrollid

- Teenuste halduse 24 testi, sh neli uut foto andmebaasitesti: salvestamine, orientatsioon, mõõtmed, metaandmete eemaldamine, kustutamine, võõras ettevõte, omanikuõigus, versioonikonflikt ja avaliku nähtavuse piirid.
- Kuus üleslaadimise ja komponendi testi: vigane/SVG sisu, voogedastuse suurusepiir, normaliseeritud vastus, eelvaade enne salvestamist, ebaõnnestunud saatmise järel pildi säilimine ning kaameravihje ja muutmata vormi nõue.
- Tegelik kohalik Nexti haldus ajutise katseomanikuga: failivalik, eelvaade, salvestamine, 390 px vaade, salvestamata töötajaandmete kaitse, profiili uuendamisel foto säilimine ning eemaldamine. Avalik foto õige ettevõtte hostil 200/JPEG; teise ettevõtte hostil 404; autentimata halduse fotopäring 401. Ajutine ettevõte, konto ja seanss eemaldati pärast katset.
- Tootmisehitus, TypeScript ning arhitektuurikontroll läbisid. Telefoni kaamera füüsilist kasutamist arvutibrauseri katse ei tõenda.

## Hilisem avaldamine

Kohalikult rakendati migratsioon 049; migratsioonikäsk rakendas ka varem ootel olnud 048. Tulevane serveripaigaldus vajab enne uut rakendust migratsiooni `049_staff_photos.sql`, uuendatud veebipilti ja fotot sisaldava ekspordi jaoks ka eksporditöötaja pilti. Broneeringu Nginxi projektifailis on ette valmistatud ainult `/api/admin/staff-photo` üleslaadimise 10 MB erand; teised JSON-päringud jäävad senise piiriga. Neid serverimuudatusi ei ole tehtud. Käivitamisel tuleb andmebaasiskeem, rakendus ja Nginxi piir omavahel kooskõlla viia.
