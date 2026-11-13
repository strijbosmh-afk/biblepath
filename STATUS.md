# Status — BiblePath / ReligieAtlas

Bijgewerkt: 2026-11-13. Project-ID: `biblepath`.

## Inrichting

De canonieke projectbestanden staan in `C:\Users\Michiel Strijbos\Projects\BiblePath`, buiten de zakelijke OneDrive. `localPath` en `workspacePath` in de lokale registratie gebruiken deze map. Alle 836 bestanden, inclusief Git-geschiedenis en bestaand lokaal werk, zijn vóór verdere documentatiewijzigingen met SHA256 vergeleken. De oorspronkelijke repository is zonder verwijdering van bestanden verplaatst naar `C:\Users\Michiel Strijbos\Projects\BiblePath-recovery-20261113` als herstelkopie. Op de oude repositorylocatie binnen OneDrive staan alleen lege mappen.

- Centrale standaardprompt v2.0.0 van 2026-11-13 opgehaald en lokaal gecachet.
- Privéaccount, Drive-hoofdmap, projectmap en alle vijf submappen op eigenaar en ouders gecontroleerd.
- Vaste Drive-ID's staan in PROJECT.json. Het centrale projectregister en de Drive-indeling zijn bijgewerkt; eigenaar, parent, grootte en SHA256 van opnieuw gedownloade bytes zijn geverifieerd. De zeven eerdere registraties zijn behouden.
- De gebruiker heeft de twee Softwareprojecten-hooks beoordeeld en vertrouwd. Hookdefinities en hooktrust zijn tijdens de verhuizing niet gewijzigd. Native Stop, automatische vervolgbeurt en geaccepteerde Drive-readback vanuit de nieuwe locatie zijn op 2026-11-13 aangetoond: 13 bestanden, status `cloud-readback-verified`. `lastVerifiedHandoff` blijft null: het bewijs hoort bij de export op commit `44a2809` en bevestigt geen volledige pc-overdracht van latere documentatiecommits.

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

Gebruik in de desktopapp het project met pad `C:\Users\Michiel Strijbos\Projects\BiblePath` (app-project-ID `b2472d3a-ca0b-42dd-8295-4677c5545d5b`). Tijdens de opslagtest was Git-HEAD `44a28090c46985a59e694b8640646ba0ba704c65`, ook bevestigd op `origin/main`. Tijdens de kopieerfase werd bestaand werk in de oude map in deze commit gepubliceerd. De nieuwe repository is met uitsluitend index- en refaanpassingen bijgewerkt; alle werkbestanden bleven bytegelijk. De daaropvolgende documentatiecommit legt de verhuizing en opslagtest vast in `AGENTS.md`, `BESLISSINGEN.md`, `INSTALLATIE.md`, `PROJECT.json`, `STATUS.md` en de kopie van het ontvangstbewijs onder `docs/storage-receipts/`. Applicatiecode valt buiten deze wijziging.

De eerste nieuwe controlechat (`01a1d523-0f42-7ff0-8ed1-8118c3fa66dc`) stopte correct wegens de oude native startmap. De daaropvolgende sessie `01a1d527-955a-7103-a3e3-b3bab04dbd97`, beurt `01a1d527-9f58-70a0-87e2-0e50fb9b6c2f`, startte aantoonbaar in de Projects-map en kreeg na het normale eindantwoord een native Stop-vervolg. Queue `q-4120b9a03f86b11aca2c0f0fe618f0f3` bevatte 13 bestanden. Alle bestanden zijn via de geadverteerde privéverbinding van `strijbosmh@gmail.com` geverifieerd op eigenaar, parent, grootte en SHA256 van opnieuw gedownloade bytes. `acknowledge` accepteerde het bewijs op `2026-11-13T13:48:56.333Z`; wachtrij en foutenlijst waren daarna leeg. Receipt: `%USERPROFILE%/.codex/softwareprojecten/state/receipts/q-4120b9a03f86b11aca2c0f0fe618f0f3.json`. Het geëxporteerde gesprek is gedeeltelijk. Een gewone update van het Drive-projectregister staat los van dit native bewijs.

De [kopie van het geaccepteerde ontvangstbewijs](docs/storage-receipts/q-4120b9a03f86b11aca2c0f0fe618f0f3.json) bewaart per bestand het Drive-ID, de oudermap, eigenaar, bytegrootte en opnieuw berekende SHA256. De 13 bestanden omvatten samen 132.539 bytes; de verificatiemethode is `download-sha256`, omdat de connector geen remote checksum in de metadata teruggaf. De lokale kopie is bewijsregistratie en vervangt de uitgevoerde cloud-readback niet.

Drive-locaties: [momentopname](https://drive.google.com/drive/folders/1W7UfUAzFUuLmv1ryQlFUFhofW19jSfSm), [gedeeltelijke gespreksexport](https://drive.google.com/drive/folders/1dgkDHGSE8R1EQazN4csAeIPBLz1WoljC) en [sessieverslag](https://drive.google.com/drive/folders/1ejZdCEh4iNklW2oJl68QZHfSteimYmQ7). Voor hervatten op een andere pc: gebruik de actuele `main` uit Git, registreer de lokale clone en controleer daar de native startmap en opslagketen opnieuw.

## Reflecties op onderwerp

Onder Christendom → Reflectie staan 200 katholieke reflecties. De verdeling is 67 bij gebed, 67 bij vriendschap met mensen in armoede en 66 bij vrede. Elke reflectie toont een eigen passage uit de Nederlandse katholieke Bijbel, één reflectiepunt, context en bronnen. De afdrukopmaak toont het gekozen overzicht. De passages zijn gecontroleerd tegen de leeseditie en de 158 verschillende nieuwe hoofdstuklinks bij eBible zijn bereikbaar.

De reflectiezoeker ondersteunt EN, OF, NIET, AND, OR, NOT en haakjes. De gebruikelijke voorrang is NIET, EN, OF. De browsercontrole bevestigde combinaties, ongeldige invoer, passagekoppelingen en herstel van het gekozen resultaat na terugkeer uit de Bijbellezer.

De afdruk gebruikt A4 met groene accenten en een kader voor het reflectiepunt. De paginamarges van de browser staan op nul, zodat Chrome geen automatische kop- of voettekst plaatst. De leesmarge zit in het document en wordt herhaald op vervolgpagina’s. De korte en langste reflectie passen elk op één A4 in de PDF-uitvoer van Chrome 157. Een proef met 48 verzen behield alle tekst en marges op drie pagina’s. Het native afdrukdialoogvenster was niet toegankelijk voor inspectie.
