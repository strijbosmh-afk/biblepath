# Status — BiblePath / ReligieAtlas

Bijgewerkt: 2026-11-13. Project-ID: `biblepath`.

## Inrichting

De canonieke projectbestanden staan in deze Git-root (`BiblePath/repository`). De lokale registratie gebruikt dezelfde map. De buitenste werkmap blijft intact en krijgt alleen een verwijzing in AGENTS.md.

- Centrale standaardprompt v2.0.0 van 2026-11-13 opgehaald en lokaal gecachet.
- Privéaccount, Drive-hoofdmap, projectmap en alle vijf submappen op eigenaar en ouders gecontroleerd.
- Vaste Drive-ID's staan in PROJECT.json. Het centrale projectregister en de Drive-indeling zijn bijgewerkt; eigenaar, parent, grootte en SHA256 van opnieuw gedownloade bytes zijn geverifieerd. De zeven eerdere registraties zijn behouden.
- Lokale exporthelper en twee hookdefinities zijn voorbereid. Hookreview en een echte native Stop/export/ontvangst zijn nog niet aangetoond. `lastVerifiedHandoff` blijft null.

## Code en bestaand werk

Startcommit: `1722f8d10ea06b7813bc3426a1b841f702d0529d` op `main`, gelijk aan opgehaalde `origin/main` bij de start.
Tijdens de inrichting ontstond buiten deze beurt commit `e8f0566e1598bfbd73bd3ff3f47ef41281bf8d91` (Update Site source) met de vijf al aanwezige wijzigingen:

- dist/explore-features.css
- dist/explore-features.js
- dist/index.html
- dist/reflection-challenges.json
- tests/explore-features.cjs

Deze commit is ook op origin/main teruggevonden. Hun SHA256 bleef gelijk aan de begincontrole. Deze inrichting verandert hun inhoud niet. De registratie krijgt een eigen commit; nieuwe wijzigingen van ander werk worden niet meegenomen.

## Controles en volgende stap

Alleen registratie-, JSON-, Git- en integriteitscontroles horen bij deze opdracht. De applicatiesuite is hiervoor niet opnieuw uitgevoerd. Eerdere resultaten in RESUME_BUILDING.md zijn historisch.

Open `BiblePath/repository` als werkmap en beoordeel de nieuwe Softwareprojecten-hooks via Codex Settings > Hooks. Daarna moet een normale beurt de native Stop/export/Drive-readback aantonen. Een volledig gecontroleerde pc-overdracht is tot dat bewijs niet bevestigd.

## Reflecties op onderwerp

Onder Christendom → Reflectie staan 27 katholieke reflecties die aansluiten bij gebed, vriendschap met mensen in armoede en vrede. Een gekozen reflectie toont de verzen uit de Nederlandse katholieke Bijbel, één reflectiepunt, context en bronnen. De afdrukopmaak toont het gekozen overzicht.

De reflectiezoeker ondersteunt EN, OF, NIET, AND, OR, NOT en haakjes. De gebruikelijke voorrang is NIET, EN, OF. De browsercontrole bevestigde combinaties, ongeldige invoer, passagekoppelingen en herstel van het gekozen resultaat na terugkeer uit de Bijbellezer. Het native afdrukvoorbeeld blijft een afzonderlijke controle, omdat het venster in de ingebouwde browser niet beschikbaar was voor inspectie.
