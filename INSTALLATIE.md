# BiblePath / ReligieAtlas installeren en controleren

Bijgewerkt: 2026-11-13. Project-ID: `biblepath`.

## Omgeving

Dit is een statische webapp met HTML, CSS, JavaScript, SVG en JSON. `dist/` bevat de bewerkbare broncode én de publiceerbare app. Er is geen buildstap, npm-installatie, Rust-toolchain of database nodig om de app lokaal te openen. Node.js en Python worden gebruikt voor controles en gegevensimport.

Op de huidige Windows-pc zijn deze versies vastgesteld; hiermee is tijdens de registratie geen volledige applicatietest uitgevoerd:

| Onderdeel | Vastgestelde versie |
| --- | --- |
| Git | `2.56.0.windows.4` |
| Node.js | `v24.22.1` |
| Python | `3.15.1` |

Dit zijn waargenomen versies, geen vastgestelde minimumvereisten. Gebruik op een nieuwe pc Git, Node.js, Python, PowerShell en een actuele browser. Controleer beschikbaarheid met `git --version`, `node --version` en `python --version`. De browser heeft geen Node-runtime nodig.

## Code op een nieuwe pc

Kies een lokale ontwikkelmap. Clone daar de vastgelegde repository:

```powershell
git clone --branch main https://github.com/strijbosmh-afk/biblepath.git
Set-Location -LiteralPath .\biblepath
git status --short --branch
git rev-parse HEAD
```

Vergelijk de commit met de laatste geverifieerde overdracht voordat je verderwerkt. De vijf bij de start aangetroffen wijzigingen zijn tijdens de inrichting extern vastgelegd in commit `e8f0566` en op `origin/main` teruggevonden. Zie `STATUS.md` voor onaf werk en `PROJECT.json` voor de vaste project- en Drive-ID's. Registreer de nieuwe lokale map apart; lokale absolute paden mogen per pc verschillen.

Op de huidige pc is de werkelijke Git-root `C:\Users\Michiel Strijbos\Projects\BiblePath`, buiten de zakelijke OneDrive. Open deze map als codeproject. De oorspronkelijke repository is als herstelkopie bewaard in `C:\Users\Michiel Strijbos\Projects\BiblePath-recovery-20261113`; gebruik die niet voor actief werk. Op de oude repositorylocatie binnen OneDrive staan alleen lege mappen. De overige bestanden in de buitenste OneDrive-werkmap vallen buiten deze verhuizing.

## Lokaal starten

Voer vanuit de werkelijke Git-root uit:

```powershell
python -m http.server 5173 --bind 127.0.0.1 --directory dist
```

Open daarna <http://127.0.0.1:5173/>. Stop de eigen server met `Ctrl+C`. Open `dist/index.html` niet rechtstreeks via `file:`: de app haalt JSON-bestanden via HTTP op. Voor de lokale app zijn geen `.env`-bestanden of accounts nodig. Externe bronlinks en kaarttegels vereisen wel netwerktoegang; persoonlijke notities blijven in de gebruikte browser.

## Controles

Voer controles uit die passen bij de wijziging. Bestaande basiscontroles zijn:

```powershell
node validate-data.cjs
node scripts/validate-import.cjs
node tests/interfaith-app.cjs
```

Controleer aangepast JavaScript aanvullend met `node --check <bestand>`. De bron- en importcontroles kunnen de in de importers vastgelegde bestanden in `.cache/` nodig hebben. Gebruik de bestaande importinstructies en `--check`-commando's in `RESUME_BUILDING.md`; wijzig bronpins of bijbeltekst niet om een ontbrekende cache te omzeilen. Een cachecontrole bewijst niet dat externe bronnen sinds de vastgelegde versie ongewijzigd zijn.

Voor de onafhankelijke QR-controle zijn extra Python-pakketten nodig. De vereisten staan in `tests/qr-requirements.txt`. Gebruik bijvoorbeeld een lokale, genegeerde testomgeving:

```powershell
python -m venv .cache/test-venv
.\.cache\test-venv\Scripts\python.exe -m pip install -r tests/qr-requirements.txt
$env:PYTHON = (Resolve-Path -LiteralPath .\.cache\test-venv\Scripts\python.exe).Path
node tests/timeline-qr.cjs
```

De beschikbaarheid van deze pakketten voor Python 3.15.1 is bij registratie niet getest. `PYTHON` wijst de QR-test expliciet naar de omgeving waarin de decoder is geïnstalleerd.

Voor een release omvat de bestaande controle ook alle CJS- en Python-tests, de relevante generatorcontroles en browsercontroles uit `RESUME_BUILDING.md`. De testbestanden kunnen in PowerShell zo worden uitgevoerd; fouten stoppen de reeks:

```powershell
Get-ChildItem -LiteralPath tests -Filter *.cjs -File | Sort-Object Name | ForEach-Object {
    node $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Test mislukt: $($_.Name)" }
}
Get-ChildItem -LiteralPath tests -Filter *.py -File | Sort-Object Name | ForEach-Object {
    python $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Test mislukt: $($_.Name)" }
}
```

Controleer de getroffen gebruikersstromen ook op desktop en smalle mobiele weergave. Een eerdere succesvolle test in de overdrachtsdocumentatie geldt niet als een test van nieuwe lokale wijzigingen.

## Opslag en overdracht

Git bewaart code, configuratie zonder geheimen en technische documentatie. Drive bewaart de centrale standaardprompt, het projectregister en geverifieerde publicatiekopieën met commit-ID. Gebruik uitsluitend de in `PROJECT.json` vastgelegde bestemmingen en het account `strijbosmh@gmail.com`.

Commit en push alleen taakgerelateerde bestanden naar de geverifieerde remote en afgesproken branch. Controleer daarna de remote commit. Exporteer geen `.env*`, sleutels, tokens, browserprofielen, authenticatiebestanden, actieve `.git`-map of afhankelijkheidscaches. `.cache/`, `.vercel/` en `.env*` zijn lokaal genegeerd. `dist/` moet juist in Git blijven omdat het de broncode bevat.

Registratie of een handmatige controle bewijst geen werkende automatische opslag. Daarvoor zijn de native Stop-aanroep, de bijbehorende lokale export en een geaccepteerd ontvangstbewijs na Drive-readback nodig. Meld Git-publicatie, Drive-verificatie en resterend onaf werk afzonderlijk.

## Softwareprojecten op deze pc

De lokale registratie staat in `%USERPROFILE%/.codex/softwareprojecten/config.json`; helper en promptcache staan ernaast. `localPath` en `workspacePath` wijzen beide naar `C:\Users\Michiel Strijbos\Projects\BiblePath`. De gebruiker heeft de twee globale Softwareprojecten-hooks beoordeeld en vertrouwd; tijdens de verhuizing zijn hookdefinities en hooktrust niet aangepast. Volgens de [officiële hookdocumentatie](https://learn.chatgpt.com/docs/hooks) moeten gewijzigde hookdefinities opnieuw worden beoordeeld. Start voor de opslagtest een nieuwe chat met deze repository als echte native startmap en laat een normale beurt eindigen. Controleer native Stop, export en Drive-ontvangst afzonderlijk. Alleen het aanpassen van een shellwerkmap bewijst dit niet.

Deze opslagtest is op deze pc geslaagd op 2026-11-13. `PROJECT.json` en `STATUS.md` verwijzen naar de geteste sessie, Drive-locaties en het geaccepteerde ontvangstbewijs onder `docs/storage-receipts/`. Dit bewijs geldt voor die export; op een nieuwe pc moet de keten opnieuw worden gecontroleerd.

Op een andere pc: gebruik het bestaande installatiepakket van Softwareprojecten of de centrale beheerrepository en registreer de clone met `node archive.mjs --config <configpad> register --cwd <clonepad> --project-id biblepath --name BiblePath`. Neem daarna de vaste Drive-ID's uit PROJECT.json over in de lokale registratie (driveFolderId en folders); behoud bestaande registraties. Controleer opnieuw de geadverteerde privéverbinding.
