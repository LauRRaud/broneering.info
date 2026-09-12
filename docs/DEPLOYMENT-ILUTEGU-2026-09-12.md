# Ilutegu demo avaldamine 12.09.2026

Omaniku loa alusel avaldati rakendus `95903eb` (sisaldab ka `97b122b` kompaktset broneerimisvoogu). Serveri checkout `/srv/broneering.info` uuendati puhtalt `88cbf85` versioonilt. Ehitati web- ja demoandmete tööriistapilt; taasloodi ainult web. Skeemimigratsioone ei käivitatud ning andmebaasi ja töötajate konteinereid ei taasloodud.

- Eelmise veebipildi märgend: `broneeringinfo-web:before-ilutegu-20260912`.
- Andmebaasi varukoopia serveris: `/srv/broneering.info/output/ilutegu-20260912/before-ilutegu.dump`, loodud `umask 077` tingimustes.
- Avaldatud veebipildi ID: `sha256:e2bc659d64a6ffa30de9255788f18bd2ea14b89fd5ccfdabf9bfdf9ad81fc549`.
- Demoandmete `--check` läbis tehingu tagasipööramisega, seejärel `--apply`: 34 teenust, 12 gruppi, 26 näidiskestust; neli vana teenust peideti avalikust valikust. Olemasolevate broneeringute arv enne ja pärast oli kolm.
- Ehituse arhitektuuri- ja TypeScripti kontrollid läbisid. Vahetult konteineri vahetuse ajal readiness-ühendus katkes; piiratud korduskontroll läbis enne demoandmete salvestamist.
- Avaliku kataloogi 34 teenust ning neli põhikategooriat kontrolliti API ja brauseriga. Kohaliku ning avaliku kataloogi teenuste nimed, grupiteed, hinnad ja kestused kattusid. Avalikku proovibroneeringut ei loodud.

Küünehoolduse all on kaks pediküüriteenust. Maniküür on halduses tühi alamgrupp kuni päristeenuste ja hindade saamiseni. Tühja gruppi broneerijale ei näidata. Logo-/värviredaktor ja järjestikuste aegade soovitus ei kuulu sellesse avaldamisse.

Veebiversiooni saab tagasi pöörata, märgendades säilitatud pildi uuesti `broneeringinfo-web:latest` ning taasluues ainult web teenuse. See ei pööra demoandmeid tagasi. Kogu andmebaasi taastamine varukoopiast vajab vahepeal lisatud andmete eraldi hindamist; seda ei tehta veebitagasipöörde automaatse osana.

Omanik täpsustas pärast seda avaldamist, et edasised muudatused valmistatakse kohalikus eelvaates valmis ja avaldatakse alles pärast ülevaatamist. Ühise kasutusjuhendi uus leht on seetõttu **kohalik, serverisse avaldamata**. [Kohaliku eelvaate töökorraldus](LOCAL-PREVIEW.md).
