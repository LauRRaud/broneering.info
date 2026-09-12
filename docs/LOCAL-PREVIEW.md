# Kohalik eelvaade enne serveri uuendamist

Omaniku töökorraldus 12.09.2026: demo ja veebilehe muudatused tehakse esmalt kohalikult valmis. Omanik vaatab eelvaate üle; serverisse avaldatakse kokkulepitud tervik. Iga väikese muudatuse järel ei ehitata serverit uuesti ega küsita avaldamisluba. Uut avaldamist ei eeldata kohaliku kujundustöö alustamisest.

## Aadressid

- Ajasta avaleht: `http://localhost:3117/`
- Ilutegu demo: `http://ilutegu.localhost:3117/`
- Ühine kasutusjuhend: `http://localhost:3117/juhend`
- Haldus: `http://haldus.localhost:3117/`

Käivitamine projekti kaustas PowerShelliga:

```powershell
$env:AUTH_BASE_URL='http://haldus.localhost:3117'
npx next dev --hostname 127.0.0.1 --port 3117
```

Kohalik andmebaas peab olema käivitatud vastavalt projekti README-le. `.env.local` andmebaasiühendused peavad viitama kohalikule baasile, mitte serverile. Praegune kohalik demo kasutab kohalikku PostgreSQL-i aadressil `127.0.0.1:55433`; serveri broneeringuid ega kontosid ei kopeeritud siia. Ülaltoodud haldusaadressi protsessipõhine seadistus on vajalik, sest halduse hosti kontroll hõlmab ka porti.

## Koodi ja andmete vahe

Kohalik lähtekood sisaldab serveris avaldatud versiooni `95903eb`. Ilutegu 34 teenuse nimed, grupiteed, hinnad ja kestused võrreldi 12.09 avaliku serveri kataloogiga: kattuvad. Demoandmete sisestamine on juba tehtud mõlemas keskkonnas. Demo lähteandmete fail ja ühekordne sisestusskript on kirjeldatud [Ilutegu demo juhises](ILUTEGU-DEMO.md).

Reacti/Nexti/TypeScripti ja kujunduse muudatused lähevad serverisse rakenduse ehitusega. Teenused, hinnad, kestused, töötajad ja graafikud on andmebaasis ning neid muudetakse tavaliselt haldusest. Kohalikku andmebaasi ei kirjutata serveri andmebaasi asemele: see kaotaks vahepeal lisatud andmed. Vajalik andmemuudatus avaldatakse eraldi piiratud toiminguna varukoopia ja eelkontrolliga.

## Ühine kasutusjuhend

Üks sisuallikas: `src/content/user-guide.ts`. Renderdus: `src/components/help/user-guide.tsx`; ligipääs ja kanooniline aadress: `src/app/juhend/page.tsx`; jagatud link: `src/components/help/guide-link.tsx`. Teemaankrud jäävad püsivaks, näiteks `/juhend#veebilehele-lisamine`. Haldus avab juhendi uuel vahelehel, säilitades olemasoleva vormi.

Esmane juhend on eesti keeles ning märgitud vastava keele ja versioonina; navigatsioonilink on tõlgitud ka inglise ja vene keelde. Puuduvate funktsioonide peatükid eristavad kavandatut kasutatavast. Uut visuaalset kujundust ega globaalset CSS-i ei lisatud.

Seis: juhend on kohalikus eelvaates, serverisse avaldamata. Tootmisehitus ja hilisem TypeScripti kontroll läbisid. Brauseris kontrolliti sisukorra ankrut, 390 px vaadet ning juhendi avanemist haldusest eraldi vahelehel. Kasutajavastuvõtt ja lõpliku kujunduse ekraanipildid on ootel. Import/eksport, arveldus ja andmetaotlused vajavad veel oma kasutajapeatükke samas juhendis.

Omaniku toodud ülesehituse võrdlus: [SmartBroni juhendid](https://smartbron.ee/juhendid/) (vaadatud 12.09.2026). Kasutame üldpõhimõtet üks leht + teemade sisukord + sammhaaval peatükid. Teksti, kuvatõmmiseid, kujundust ega konkurendi funktsioonilubadusi ei kopeerita.

Töötaja foto saab nüüd kohalikult üles laadida või valida telefonikaamerast; [teostus ja kontrollid](STAFF-PHOTOS.md). Serveris on jätkuvalt varasem HTTPS-aadressi väli, kuni kohalik muudatus on üle vaadatud ja avaldatud.

Kujundusredaktor on nüüd samuti kohalikult teostatud: [kasutamine, arhitektuur ja piirid](THEME-SETTINGS-REQUIREMENTS.md). Migratsioonid 050–051 lisavad logo- ja versioonitoe. Serverisse neid muudatusi ei avaldatud.
