# Ettevõtte kujundusseaded

Omaniku nõue 12.09.2026, esimese kliendina Ilutegu. See kirjeldab teostatavat haldusfunktsiooni; valmis logo- ja värviredaktorit praegu rakenduses ei ole. Andmebaasis on juba `theme_configs` mustandi/avaldatud versiooni mudel ja logo meediaseos ning õigustes `theme.publish`.

## Ettevõtte halduses

„Broneerimisvaate kujundus” kuulub sisselogitud ettevõtte omaniku haldusse. Omaniku volitatud roll võib avaldada kujundust ainult vastava õigusega. Ühe ettevõtte teema ei muuda teiste ettevõtete ega Ajasta turunduslehe välimust.

| Seade | Kus tulemus nähtav on |
| --- | --- |
| Logo üleslaadimine, asendamine ja eemaldamine | Oma broneerimislehe ja modaalivaate päises; ilma logota ettevõtte nimi |
| Brändi põhivärv ja valitud oleku värvid | Nupud, valitud teenus ja töötaja, edenemine |
| Tausta-, teksti- ja piirde toonid | Oma avalikus broneerimisvaates |
| Kalendri valitud päeva, tänase päeva ja vaba kellaaja toonid | Avalikus aja valimise sammus; puuduvat aega ei näidata broneeritavana |
| Kategooria ilma visuaalita, ikooniga või pildiga | Vastava kategooria valik; nimi jääb alati nähtavaks |
| Mustand, eelvaade, avaldamine ja eelmise versiooni taastamine | Muudatus jõuab külastajani alles avaldamisel |

Broneeriv külastaja näeb avaldatud tulemust. Tema ei pääse kujunduse seadistustesse. Ettevõtte sisemise halduskalendri töötaja- ja olekuvärvid on eraldi seadistus: neid ei tohi segi ajada avaliku kalendri kujundusega ega avaldada külastajale teiste broneeringute infot.

Värve hallatakse ühiste CSS-muutujatena, primitiivid ja komponendid kasutavad neid oma CSS Module'ites. Ühtset pikka `globals.css` faili ei looda. Värv ei ole ainus valiku või vea tähis; fookus, valituse tähis ja tekstiline selgitus säilivad. Eelvaates tuleb kontrollida kontrasti, telefoni, modaali ja lehevaadet. Värviredaktoris peab olema ka täpse HEX-koodi sisestamine, et sobitada olemasoleva kodulehe toonidega.

Logo ja kategooriavisuaalide lisamisel peab omanik nägema faili eelvaadet, saama seda asendada/eemaldada ning kinnitama kasutusõiguse. Logo ei ole kategooriapilt: nende seaded ja failid jäävad eraldi. Kategooriate pildi või ikooni stiil on veel valimata; selles töös pilte ei genereeritud ning ühtegi konkreetset pildimudelit ei eeldatud.

## Vastuvõtt

Ilutegu omanik muudab oma bränditooni ja logo, vaatab tulemust lehe- ja modaalieelvaates ning avaldab. Pärast lehe värskendamist on avaldatud teema mõlemas sama; teise ettevõtte kujundus ei muutu. Avaldamata mustand pole külastajale nähtav ning eelmine avaldatud versioon on taastatav. Omaniku lõplik disain, värvikoodid ja logo tuleb veel saada.
