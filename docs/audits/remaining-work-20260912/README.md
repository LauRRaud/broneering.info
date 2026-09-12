# Tööde ja otsuste koondi kontroll

12.09.2026, koostaja Codex. Lähtecommit `c1b0d4dbf5d38b5f2b28ee1ef5156752a5d821a5`. See on dokumentatsiooni ja praeguse lähtekoodi võrdlus, mitte uus rakenduse vastuvõtukatse.

- [Algdokumendi nõuded](source-requirements.json): Wordi põhiosa lõigud ja tabeliread algses järjekorras, ptk 03 ja 27–30; algfaili SHA-256. Tabeli lahtrid on eraldatud `|` märgiga. Väljavõte ei väida leheküljenumbreid ega küljenduse kontrolli.
- [Struktuuri ja viidete kontroll](verification.json): D-01–20, O-01–12, G01–09, peatükkide 01–30 ja AT-01–48 säilimine; kohalikud faililingid/ankrud, korduvad pealkirjad ning algdokumendi muutumatu räsi.
- [Failide SHA-256 manifest](source-manifest.json): võrreldud haldusvormid/õigused ja selle töö Markdown-failid. See ei ole kogu rakenduse ega väljalaske manifest.

Platvormihalduri juhendi rolle ja toiminguid võrreldi halduslehe, ettevõtte loomise, omaniku kutse taastamise, tellimuse, arveväljastaja, arvete, laekumiste, veebimakse, tugivaate ning lahkumise UI ja serveriõigusega. Platvormiõigus ei asenda ettevõtte omaniku õigust; lahkumise/taasavamise täieliku töökorra puuduv vastuvõtt jäi avatuks.

Esmane struktuurikontroll luges G06 nii lõpetatud kontrollide kui ka tööregistri tabelist ja peatus loenduse kontrollis. Lõplik kontroll loeb G-ridu ainult tööregistri jaotises. Puuduvat nõuet see ei tuvastanud; lõplik tulemus on ülal viidatud JSON-is.

Olemasolevaid 09.–12.09 tehnilisi tõendeid ei muudeta ega esitata uuesti käivitatuna. Serveri hetkeseisu, SMTP-d, Maksekeskust, välist varundust, uut litsentsiinventuuri, kujundust ega kasutajavastuvõttu selles voorus ei kontrollitud. Algset Wordi faili, rakenduskoodi ja migratsioone ei muudetud.
