# Kujunduse ja komponentide korraldus

**Omaniku nõue 12.09.2026:** avalik veeb, broneerimine ja haldus peavad olema kujundatavad väikeste eraldi hallatavate failidega. Suurt `globals.css` faili ei looda. Visuaalse kujunduse annab omanik.

## Jaotus

| Asukoht | Vastutus |
| --- | --- |
| `src/styles/tokens.css` | Ühised CSS-muutujad: värvid, kirjatüübid, vahed, raadiused ja kihid. Lisada kujunduse saabudes |
| `src/styles/themes/` | Teemade muutujate väärtused; komponentide selektoreid siia ei koondata |
| `src/components/ui/button/`, `input/`, `dialog/` jne | Üks taaskasutatav primitiiv kausta kohta, oma TSX ja `*.module.css`; puudub äriloogika |
| `src/components/marketing/` | Ajasta avalehe ja hilisemate sisulehtede osad |
| `src/components/booking/` | Broneerimise vaated ja osad; kasutavad ühiseid primitiive |
| `src/components/admin/` | Ettevõtte ja platvormi halduse vaated ning osad |
| `src/app/` | Marsruudid, paigutused, serveri andmete laadimine ja metaandmed |

Näiteks nupu teostus elab failides `ui/button/button.tsx` ja `ui/button/button.module.css`. Avalehe jaotisel on oma komponent ja stiilimoodul. Primitiivid ei impordi neid kasutavaid lehti ega funktsionaalsust. Kujundusväärtusi võetakse ühistest muutujatest; erandid jäävad vastava komponendi stiilimoodulisse.

Globaalsed reeglid piirduvad reset'i, dokumendi vaikeväärtuste, ligipääsetavuse ja muutujatega. Lehe välimust ei kujundata globaalsete `button`, `h1` või kõiki `main` elemente muutvate selektoritega. Olemasolevad ligipääsetavuse miinimumreeglid, fookus ja vähendatud liikumise tugi säilivad.

## Praegune seis ja üleminek

Ajasta lihtne avaleht on [eraldi komponendis](../src/components/marketing/ajasta-home.tsx); sellel puudub visuaalne stiilimoodul. [Marsruut](../src/app/page.tsx) valib hosti järgi avalehe, halduse või ettevõtte broneerimisvoo. Praegu laaditakse [ligipääsetavuse baasreegleid](../src/app/accessibility.css).

Ülejäänud broneerimis- ja halduskomponentide jaotust ei ole selle muudatusega tervikuna ümber tehtud. Kujunduse rakendamisel jaotatakse muudetav vaade vastutuste järgi ning tõstetakse korduvad elemendid primitiivideks. Olemasolevat toimivat äriloogikat ei kirjutata pelgalt stiilimise pärast ümber. Uusi tühje kaustu ega kasutamata primitiive ette ei looda.

Kontrollida tuleb tõlkeid, mobiilivaadet, klaviatuuri, fookust, veaseisundeid ja kõiki muudetud kasutusvooge. Kujundusreeglid kehtivad ka järgmistele arendajatele [AGENTS.md kaudu](../AGENTS.md).

12.09 jätk: broneerimise kompaktne päis ning kategooria- ja teenusevalik on nüüd eraldi komponentides. [Sammupõhise voo kirjeldus](BOOKING-STEPS.md).
