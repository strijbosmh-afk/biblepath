# Beslissingen — BiblePath / ReligieAtlas

## 2026-11-13 — Native opslagbewijs vastleggen

- De native opslagtest is geslaagd voor queue `q-4120b9a03f86b11aca2c0f0fe618f0f3`: 13 bestanden zijn teruggelezen via de privé-Driveverbinding en met `download-sha256` gecontroleerd. `acknowledge` heeft het ontvangstbewijs geaccepteerd.
- Bewaar een ongewijzigde kopie van het geaccepteerde ontvangstbewijs onder `docs/storage-receipts/`, met een verwijzing in `PROJECT.json` en `STATUS.md`. Zo blijven de Drive-ID's en gemeten hashes ook vanuit Git beschikbaar.
- Dit bewijs blijft gekoppeld aan de oorspronkelijke sessie, queue en snapshotcommit `44a2809`. Een latere documentatiecommit verandert dat bereik niet; de gedeeltelijke gespreksexport is geen native hervatbare chat.

## 2026-11-13 — Actieve repository buiten zakelijke OneDrive

- Op expliciet verzoek van de gebruiker is `C:\Users\Michiel Strijbos\Projects\BiblePath` de actieve lokale Git-root. De lokale projectregistratie verwijst met zowel `localPath` als `workspacePath` naar deze map.
- Alle 836 gekopieerde bestanden zijn met SHA256 tegen het origineel gecontroleerd. Bestaande codewijzigingen en Git-geschiedenis zijn behouden. Na een beleidsblokkade op verwijdering zijn de oorspronkelijke bestanden zonder verwijdering verplaatst naar `C:\Users\Michiel Strijbos\Projects\BiblePath-recovery-20261113`. Deze herstelkopie staat ook buiten OneDrive. Op de oorspronkelijke repositorylocatie blijven alleen lege mappen over.
- De vaste privé-Google Drive-bestemmingen blijven gelden. Alleen een native Stop, automatische vervolgbeurt en geverifieerde Drive-readback bewijzen automatische opslag. De verhuizing verandert de hookdefinities en hooktrust niet.

## 2026-11-13 — Projectregistratie en bronrepository

- Gebruik de vaste project-ID `biblepath` en de naam BiblePath; ReligieAtlas is de naam van de app.
- De bronrepository is `https://github.com/strijbosmh-afk/biblepath.git`, met de bestaande werkbranch `main`. Op deze pc staat zij in `BiblePath\repository`. De bovenliggende lege Git-repository en losse bestanden blijven intact, zodat registratie geen eerder werk verwijdert of verplaatst.
- `dist/` blijft bewerkbare broncode en publicatie-inhoud. De bestaande statische architectuur heeft geen frameworkmigratie, Rust-toolchain of buildstap nodig.

## 2026-11-13 — Bestaand onaf werk behouden

Vóór de inrichting waren deze vijf bestanden lokaal gewijzigd:

- `dist/explore-features.css`
- `dist/explore-features.js`
- `dist/index.html`
- `dist/reflection-challenges.json`
- `tests/explore-features.cjs`

Deze wijzigingen blijven behouden en buiten de registratiecommit. De inrichting is geen inhoudelijke beoordeling of publicatie van dit eerdere werk. De startcommit was `1722f8d10ea06b7813bc3426a1b841f702d0529d`; de actuele commit- en opslagstatus staan in `STATUS.md` en het sessieverslag.

## 2026-11-13 — Git, Drive en bewijs van overdracht

Git is leidend voor code, configuratie zonder geheimen en technische Markdown-documentatie. Drive is leidend voor de standaardprompt en het centrale projectregister. Technische documenten op Drive zijn publicatiekopieën met een commit-ID. Deze verdeling voorkomt dat bestandsdatums of losse exports de codeversie bepalen.

Gebruik uitsluitend `strijbosmh@gmail.com` als uploadaccount én eigenaar van de Drive-bestemmingen. Leg de werkelijk geverifieerde map-ID's vast in `PROJECT.json`; gebruik bij meerdere verbindingen voor alle bijbehorende Drive-aanroepen dezelfde geadverteerde accountselector. Controleer eigenaar, oudermap, grootte en remote checksum of opnieuw gedownloade bytes voordat een upload wordt bevestigd.

De projectindeling is `01_Context`, `02_Chats/<sessie-id>`, `03_Sessies/<sessie-id>`, `04_Momentopnamen` en `99_Archief`. De logische sleutels `Chatexports`, `Sessies` en `Momentopnamen` blijven naar de overeenkomstige vaste map-ID's verwijzen.

Een volledige pc-overdracht mag pas als gecontroleerd worden gemeld als de bedoelde Git-commit op de remote staat en de relevante Drive-export is teruggelezen. Bestaande ongecommitte code blijft expliciet onaf werk. Automatische opslag is pas bewezen met een echte native Stop-aanroep, de bijbehorende export en een geaccepteerd Drive-ontvangstbewijs; registratie, een handmatige helperaanroep of een lege wachtrij zijn daarvoor onvoldoende.

## 2026-11-13 — Reflecties op onderwerp

Koppel zoektermen en synoniemen aan redactioneel voorbereide reflecties. Elke reflectie gebruikt een gecontroleerde passage uit de Nederlandse katholieke leeseditie. Zo blijven tekst en reflectiepunt aan elkaar gekoppeld en kan de gebruiker de bron openen. De zoekopdracht wordt in de browser verwerkt. De afdrukopmaak gebruikt het gekozen overzicht op de pagina.
