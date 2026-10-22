# Resume building BiblePath

Last updated: 22 October 2026.

## Start here

BiblePath is a working static web app for reading the Bible and exploring its people, genealogy, and cities. Continue from the files in this repository; there is no framework migration or build step to perform.

- Repository: https://github.com/strijbosmh-afk/biblepath
- Published app: https://biblepath-people-atlas.glossy-chord-2394.chatgpt.site/
- Local preview: run `python -m http.server 5173 --bind 127.0.0.1 --directory dist`, then open http://127.0.0.1:5173/.
- Runtime: vanilla JavaScript, HTML, CSS, SVG, and local JSON. Node.js and Python are needed only for import scripts and validation.
- `dist/` is both editable application source and deployable output. Serve it over HTTP; do not open `index.html` using a `file:` URL because the app fetches local JSON.

## What the user requested and what exists

1. Circles for people, sourced biographies, parent/child and spouse links, extensive zooming, and three layouts: Constellation, Family tree, Ancestry rings.
2. Wider circle spacing, lines routed around unrelated circles, and adaptive zoom that reveals more family branches. The map loads at most 180 people at once; all people remain searchable.
3. A two-person connection finder. It prioritizes a parent-to-child path, then a reverse ancestral path, then a shortest family path. Gold highlights survive zoom, selection, and layout changes. Each connection has a source. Bible-cited links are the default; indexed links require opting in. Adam → Jesus has 63 steps and includes Joseph's legal parenthood.
4. A full searchable Bible reader with links from identified names to people or cities, plus a searchable cities explorer.
5. English, Dutch, and French language choices, localized profiles and controls, and a corresponding full Bible edition. Language persists in local storage; reader location and city state survive a language change.
6. Navigation order: Bible reader, People index, Relationship map, Cities explorer. The reader is the landing view. The old ambiguous “Scripture” sidebar heading is now “People filter,” visible only in the people index and family map, with explicit scope text. The reader and cities have their own filters.
7. Publish the source here with this handover file.

## Important files

| File | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/styles.css` | App shell, navigation, language control, general styles |
| `dist/app.js` | Shared state, graph/reader/city integration, search, profiles, connection-finder UI |
| `dist/graph.js` | SVG layout, circle separation, obstacle-aware routing, camera, path highlights |
| `dist/discovery.js` | Adaptive neighborhood selection |
| `dist/paths.js` | Source-aware graph path search |
| `dist/scripture.js` | Bible model, references, search, person/place annotations |
| `dist/reader-ui.js`, `dist/reader.css` | Reader UI and state snapshots |
| `dist/cities-ui.js`, `dist/cities.css` | City index, filters, profiles, shared-reference people |
| `dist/i18n.js` | Locale state, dictionaries, reference/book localization, shell translation |
| `dist/app-locales.js`, `dist/library-locales.js` | Shell and reader/city translations |
| `dist/info-locales.js`, `dist/notes-locales.js` | Translated help, about, and methodology |
| `dist/entity-locales.js` | Generated NL/FR per-identity profile patches |
| `dist/data.js` | People and family relationships |
| `dist/bible-data.json`, `dist/bible-data-nl.json`, `dist/bible-data-fr.json` | Complete edition text and source metadata |
| `dist/places-data.json` | Settlement identities and references |
| `dist/data-notes.html` | Public source credits, editorial choices, and limits |

## Data and sources

- People: 2,987 distinct identities, 1,803 relationships, over 20,000 indexed references. This includes 157 original curated profiles and 203 relationships with direct biblical citations; 1,600 relationships cite the STEP editorial index.
- Cities: 604 settlements, 4,125 verse references.
- English: World English Bible, eBible.org Protestant/American edition; 66 books, 1,189 chapters, 31,103 numbered verses. Public domain. Preserve the trademark/source credit.
- Dutch: Statenvertaling, 1888 text transcription from Isidore-Guild; 66 books, 1,189 chapters, 31,102 numbered verses. Public-domain text, CC0 transcription.
- French: Louis Segond 1910 from eBible.org; 66 books, 1,189 chapters, 31,170 numbered verses. Public domain; numbered Psalm superscriptions are preserved.
- People source: STEP Bible TIPNR, CC BY 4.0, pinned at `ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d`.
- Settlement classification: OpenBible.info geography, CC BY 4.0, pinned at `7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f`.
- Dutch text snapshot: Isidore-Guild/statenvertaling commit `d39d8ee01ca51f27e3e9c50291a96fc32f49b4d2`.

Exact source URLs, hashes, retrieval dates, processing decisions, and edition metadata are in the datasets and import scripts. Unmodified downloads go in ignored `.cache/`. Keep all attribution when redistributing the data. This repository does not replace the upstream data licenses or assign a new license to third-party text.

## Rebuild data deliberately

```sh
node scripts/import-tipnr.cjs
python scripts/import-bible.py
python scripts/import-bible-locales.py
node scripts/import-places.cjs
node scripts/build-entity-locales.cjs
```

Inspect importer arguments before running. Sources are pinned and cached; do not casually upgrade them and overwrite reviewed identity mappings. Entity translations are authored in `scripts/entity-locale-copy.cjs` and generated by `scripts/build-entity-locales.cjs`. Edit the source of generated data, then regenerate and validate.

## Rules that protect accuracy

- Keep identity IDs stable and case-sensitive. Namesakes must remain distinct; do not merge people or cities by display name.
- Do not infer biological parenthood from legal parenthood. Joseph → Jesus remains explicitly legal. Heli is not assigned as Mary's biological father.
- A name index reference is not proof that a verse establishes a relationship. Imported family links cite the STEP relationship record, not an arbitrary verse mentioning the name.
- Genealogical lists can omit generations. The Adam–Jesus route combines selected accounts and is not presented as a verbatim reproduction of Luke's genealogy.
- Preserve original Bible text exactly, apart from documented whitespace normalization. Do not translate the WEB with an automatic translator. Load the selected published edition.
- French versification differs from English in several books. The model conservatively marks name candidates as uncertain in affected books rather than asserting exact-verse identity. Full cross-edition verse alignment remains a future improvement.
- Collective names such as Israel and namesakes need a chooser. A name-only match must not silently resolve to one person. Place/person ambiguity also needs a chooser.
- Shared city/person verse references do not establish residence or physical presence.
- Localized proper names include conventional spellings and edition variants. Original aliases remain searchable. Obscure names may retain their source transliteration; an exhaustive multilingual scholarly onomasticon is not claimed.
- External source links can remain in their original language. Distinguish source provenance from the selected reader edition.
- The collection covers the 66-book Protestant canon, not every biblical canon or interpretation.

## Localization architecture

`BibleI18n.t(source, params)` translates stable English source keys, using `{parameter}` interpolation. Library components translate explicitly. A reversible DOM translation layer handles static and dynamic shell text; it excludes Bible reading content so it cannot rewrite Scripture. `reference()` localizes book names for display while IDs and canonical source labels remain stable.

Do not directly translate graph relationship notes in the stored data: legal-parent detection currently reads the original note. Translate presentation. Data identity patches preserve original aliases and reference labels. Recreate reader/city instances on a language switch using their `getState()`/`setState()` interfaces; account for in-flight initialization.

## Validate before publishing

Core checks:

```sh
node validate-data.cjs
node scripts/validate-import.cjs
node tests/discovery.cjs
node tests/paths.cjs
node tests/graph-highlights.cjs
node tests/graph-geometry.cjs
node tests/scripture.cjs
node tests/places.cjs
node tests/entity-locales.cjs
node tests/i18n.cjs
node tests/scripture-locales.cjs
python tests/import-bible.py
python tests/import-bible-locales.py
```

Run additional locale tests in `tests/` when changing translations or edition importers. Syntax-check edited JavaScript with `node --check`. Browser verification should cover:

- EN → NL → FR → EN, including a reload to verify stored language.
- Canonical and localized references (John / Johannes / Jean 3:16), text search, chapter navigation, and the final chapter of Revelation.
- A linked person in Matthew 1 and a linked city in Matthew 2; namesake chooser behavior.
- Reader → family map → return, retaining the chapter and verse.
- Adam → Jesus in all three map layouts and across a language switch, with 63 cited steps and legal-parent explanation.
- City filters/detail/reference navigation and same-named settlements.
- Desktop and narrow mobile layouts, keyboard labels, no horizontal page overflow, and no console errors.

Do not add a test that merely repeats implementation constants; assert user-visible behavior, identity correctness, preserved text, or meaningful geometric constraints.

## Publishing and Git

The existing Sites project is recorded in `.openai/hosting.json`. Reuse that project ID; do not create a second Site. Preserve the current Site audience unless explicitly instructed otherwise. Use the installed Sites workflow to open source, validate, commit/push/package that exact state, and publish. A pushed GitHub commit by itself does not deploy the Sites app.

GitHub is a separate source destination. Push reviewed work to this repository without force-pushing or discarding remote changes. Never commit credentials, cache downloads, private account metadata, or deployment tokens. No secrets are required to run the static app.

## Three suggested next features

These are proposals, not implemented features:

1. **Bookmarks and study notes:** save passages, people, cities, and connection paths in a personal study collection; start with local storage and export/import before introducing accounts.
2. **Historical timeline:** show people and events by era alongside the family map, with explicitly approximate or disputed dates and sources.
3. **Geographic journeys map:** plot cities and routes such as the Exodus and Paul's travels, with geographic uncertainty clearly marked and source links for every route segment.

Other known improvements include reviewed cross-edition verse alignment, wider proper-name alias coverage, further editorial verification of imported relationships, and offline asset caching. Preserve the current working app while adding them incrementally.
