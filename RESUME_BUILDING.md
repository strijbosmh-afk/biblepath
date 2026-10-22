# Resume building ReligieAtlas

Last updated: 22 October 2026.

## Start here

ReligieAtlas is a working static web app for reading the Bible, Tanakh and Qur’an, and exploring biblical people, genealogy and cities. Continue from the files in this repository; there is no framework migration or build step to perform.

- Repository: https://github.com/strijbosmh-afk/biblepath
- Primary published app: https://www.religieatlas.com/.
- Existing private Sites publication: https://biblepath-people-atlas.glossy-chord-2394.chatgpt.site/.
- Local preview: run `python -m http.server 5173 --bind 127.0.0.1 --directory dist`, then open http://127.0.0.1:5173/.
- Runtime: vanilla JavaScript, HTML, CSS, SVG, and local JSON. Node.js and Python are needed only for import scripts and validation.
- Changed shell asset URLs in `dist/index.html` carry a short SHA-256 query version so returning browsers load current navigation, styling and labels. Refresh the version when changing those assets.
- `dist/` is both editable application source and deployable output. Serve it over HTTP; do not open `index.html` using a `file:` URL because the app fetches local JSON.

## What the user requested and what exists

1. Circles for people, sourced biographies, parent/child and spouse links, extensive zooming, and three layouts: Constellation, Family tree, Ancestry rings.
2. Wider circle spacing, lines routed around unrelated circles, and adaptive zoom that reveals more family branches. Layout switches preserve discovered branches and selection. Family-tree expansion keeps existing positions when possible; if a new parental chain needs extra generation rows, it rearranges around the same anchor while retaining the camera. The map loads at most 180 people at once; all people remain searchable.
3. A two-person connection finder. It prioritizes a parent-to-child path, then a reverse ancestral path, then a shortest family path. Gold highlights survive zoom, selection, and layout changes. Each connection has a source. Bible-cited links are the default; indexed links require opting in. Adam → Jesus has 63 steps and includes Joseph's legal parenthood.
4. A full searchable Bible reader with links from identified names to people or cities, plus a searchable cities explorer.
5. English, Dutch, and French language choices, localized profiles and controls. Dutch is the first-visit interface default; an explicitly saved supported language wins. The first-visit Catholic edition is the Dutch collection (`catholic-nl`), based on Canisius 1939 with separately attributed historical Catholic supplements; English Douay-Rheims 1899 (`catholic`) remains available; the existing 66-book WEB, Dutch Statenvertaling and French Louis Segond editions remain available. Interface language and text edition are distinct. Language persists in local storage; reader location and city state survive a language change.
6. Student-facing navigation is religion-first: Christianity (Roman Catholic), Judaism, Islam. Each group contains Holy books (Dutch: Heilige boeken), People and Festivals & rituals (Dutch: Feestdagen & rituelen); Relationship map and Cities explorer are Christian subviews. Comparing traditions remains global. Religion selection synchronizes the reader and person collection; parent selection retains a compatible current subview, while selecting a child closes the mobile menu. The reader is the landing view. “People filter” is visible only in the Bible index and family map; Torah and Qur’an indexes have separate searches. The reader and cities have their own filters.
7. Publish the source here with this handover file.
8. A Roman Catholic Christianity / Judaism / Islam navigation hierarchy and full Tanakh and Qur’an readers. Tanakh follows Torah, Prophets and Writings, with 24 canonical books represented by 39 navigation components. Four independently numbered editions are available: Hebrew WLC, Jewish JPS 1917, Dutch Statenvertaling and French Segond. The latter two are prominently identified as Christian translation aids. The Qur’an has all 114 surahs and 6,236 numbered ayahs, Arabic original text and Dutch/English/French translations. Readers include search, references, navigation, edition credits and local notes. External Jewish commentary and tafsir links are separate from scripture.

9. The Christian account explicitly follows a Roman Catholic perspective. The 24 comparison figures use Catholic framing and separately attributed references to the Catechism and Church teaching. Jewish and Islamic accounts remain separate. The Dutch Catholic collection and English Douay-Rheims 1899 reader each contain the complete 73-book Catholic canon, including the Esther/Daniel additions. Catholic supplemental person profiles retain their reviewed English Douay-Rheims citations. The original family graph and city atlas retain their existing 66-book scope; a complete scripture corpus does not imply an exhaustive person or relationship index.

## Important files

The people expansion adds a separate Torah index (481 identities from 4,325 original index associations, 29 curated Torah profiles), a curated Qur’an index (60 people, 99 passage ranges), and 24 selected comparisons across Roman Catholic Christianity, Judaism and Islam. IDs are namespaced; no imported family edges or biographies are shared across these collections. Index queries and reading positions remain independent; the top-level selected religion applies to both books and people. Namesakes retain disambiguation; unnamed Qur’an figures retain descriptive labels. The comparison’s Jewish scope can include wider Tanakh figures outside the Torah index. Absence from a corpus is not treated as absence from a religion.

`dist/people-traditions.js` and `.css` render the new indexes and comparison view. JSON data load lazily through `app.js`; failed loads are retryable and stale responses cannot switch the selected index. `dist/torah-people.json`, `dist/quran-people.json` and `dist/person-comparisons.json` contain localized records and source links. The first two have deterministic builders in `scripts/build-torah-people.cjs` and `scripts/build-quran-people.cjs`. Preserve their scope/reference notes: source-index numbering differs from some Hebrew edition coordinates, so profile citations open the actual source edition rather than assuming reader alignment.

| File | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/styles.css` | App shell, navigation, language control, general styles |
| `dist/app.js` | Shared state, graph/reader/city integration, search, profiles, connection-finder UI |
| `dist/graph.js` | SVG layout, circle separation, obstacle-aware routing, camera, path highlights |
| `dist/discovery.js` | Adaptive neighborhood selection |
| `dist/paths.js` | Source-aware graph path search |
| `dist/scripture.js` | Bible model, references, search, person/place annotations |
| `dist/reader-ui.js`, `dist/reader.css` | Reader UI and state snapshots |
| `dist/sacred-library.js` | Tanakh/Qur’an model, edition-aware references, search and navigation |
| `dist/sacred-reader.js`, `dist/sacred-reader.css` | Tradition reader UI, edition positions, local notes and external commentary links |
| `dist/cities-ui.js`, `dist/cities.css` | City index, filters, profiles, shared-reference people |
| `dist/i18n.js` | Locale state, dictionaries, reference/book localization, shell translation |
| `dist/app-locales.js`, `dist/library-locales.js` | Shell and reader/city translations |
| `dist/info-locales.js`, `dist/notes-locales.js` | Translated help, about, and methodology |
| `dist/entity-locales.js` | Generated NL/FR per-identity profile patches |
| `dist/data.js` | People and family relationships |
| `dist/bible-data.json`, `dist/bible-data-nl.json`, `dist/bible-data-fr.json` | Existing 66-book WEB, Statenvertaling and Segond text and source metadata |
| `dist/person-passage-map.js`, `dist/person-passage-map.json`, `scripts/build-person-passage-map.cjs` | Reviewed source-to-Dutch person passage navigation and deterministic builder |
| `dist/catholic-bible-data-nl.json`, `scripts/import-catholic-dutch.py` | Dutch Catholic collection, source-specific supplements, attribution and deterministic importer |
| `dist/catholic-bible-data.json` | Complete 73-book English Douay-Rheims text, additions, Vulgate numbering and source metadata |
| `scripts/import-catholic-bible.py` | Checksum-pinned Catholic import and deterministic `--check` reproduction |
| `dist/catholic-people.json`, `dist/catholic-people-ui.js` | Sourced Catholic supplemental profiles and their index/profile UI |
| `scripts/catholic-people-copy.cjs`, `scripts/build-catholic-people.cjs` | Authored NL/EN/FR Catholic profiles and deterministic builder |
| `dist/tanakh-data.json`, `dist/quran-data.json` | Complete tradition-specific editions, native text, provenance and licenses |
| `scripts/import-tanakh.py`, `scripts/import-quran.py` | Pinned imports and deterministic `--check` reproduction |
| `dist/places-data.json` | Settlement identities and references |
| `dist/data-notes.html` | Public source credits, editorial choices, and limits |

## Data and sources

- Base atlas: 2,987 distinct identities, 1,803 relationships, over 20,000 indexed references. This includes 157 original curated profiles and 203 relationships with direct biblical citations; 1,600 relationships cite the STEP editorial index. Catholic supplemental profiles add independently sourced coverage without altering this graph or inferring new family edges.
- Cities: 604 settlements, 4,125 verse references.
- Dutch Catholic Bible: fixed edition ID `catholic-nl`; first-visit default, independent of interface language. Public-domain Canisius 1939 plus clearly attributed historical Catholic supplements. All source hashes and processing rules are in the asset metadata and importer. Never substitute the incomplete eBible Canisius export on its own. Preserve source notes, original wording and independent numbering.
- English Catholic Bible: English Douay-Rheims American Edition of 1899, official public-domain eBible `engDRA` USFX source; 73 books (46 OT + 27 NT), 1,334 chapters, 35,811 numbered verses. Download SHA-256: `def7a79a4fd11a9489ea7d25579658b70f0727a8dcf7f71c3ca1c9e5cca2d5db`. Complete text is retained with source punctuation and Vulgate numbering, apart from documented whitespace normalization. This is an English text even when the interface is Dutch or French.
- English: World English Bible, eBible.org Protestant/American edition; 66 books, 1,189 chapters, 31,103 numbered verses. Public domain. Preserve the trademark/source credit.
- Dutch: Statenvertaling, 1888 text transcription from Isidore-Guild; 66 books, 1,189 chapters, 31,102 numbered verses. Public-domain text, CC0 transcription.
- French: Louis Segond 1910 from eBible.org; 66 books, 1,189 chapters, 31,170 numbered verses. Public domain; numbered Psalm superscriptions are preserved.
- Tanakh: 24 canonical books / 39 navigation components, each edition containing 929 chapters. Hebrew WLC has 23,213 numbered verses; JPS 1917 has 23,145; Dutch has 23,145; French has 23,211. Hebrew WLC and JPS 1917 come from checksum-pinned public-domain eBible USFX snapshots. Dutch/French reuse their existing edition text and attribution, with explicit Christian-translation-aid labels. Each source’s chapter/verse numbering is retained independently.
- Qur’an: 114 surahs, 6,236 numbered ayahs. Arabic is Tanzil Uthmani 1.1 (CC BY 3.0 with verbatim-text terms); preserve the exact text, copyright block and Tanzil link. QuranEnc supplies Dutch Rowwad 2.0.10, English Rowwad 1.0.20 and French Rachid Maach 1.0.3 under its republication terms. Keep publisher/source/version/transcript information and translator notes; review `checkUpdatesUrl` before each release. Unnumbered opening formulas remain separate from numbered ayahs.
- People source: STEP Bible TIPNR, CC BY 4.0, pinned at `ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d`.
- Settlement classification: OpenBible.info geography, CC BY 4.0, pinned at `7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f`.
- Dutch text snapshot: Isidore-Guild/statenvertaling commit `d39d8ee01ca51f27e3e9c50291a96fc32f49b4d2`.

Exact source URLs, hashes, retrieval dates, processing decisions, and edition metadata are in the datasets and import scripts. Unmodified downloads go in ignored `.cache/`. Keep all attribution when redistributing the data. This repository does not replace the upstream data licenses or assign a new license to third-party text.

The English Catholic reader includes Tobit, Judith, Wisdom, Sirach, Baruch, 1 and 2 Maccabees, Esther 10:4–16:24, Daniel 3:24–90 and chapters 13–14, and the Letter of Jeremiah in Baruch 6. These locators follow the Douay-Rheims/Vulgate source and must not be silently aligned with WEB, Hebrew or other edition coordinates. The canon is 46 Old Testament books plus 27 New Testament books ([Catechism §120](https://www.vatican.va/content/catechism/en/part_one/section_one/chapter_two/article_3/iv_the_canon_of_scripture.html)). Do not label the existing 66-book WEB, Statenvertaling or Louis Segond files as complete Catholic editions. The comparison’s Catholic doctrinal sources are editorial context, distinct from biblical verses; its existing WEB citations retain their own source locators.

## Rebuild data deliberately

```sh
node scripts/import-tipnr.cjs
python scripts/import-bible.py
python scripts/import-bible-locales.py
python scripts/import-catholic-bible.py
python scripts/import-catholic-dutch.py
node scripts/build-catholic-people.cjs
python scripts/import-tanakh.py
python scripts/import-quran.py
node scripts/import-places.cjs
node scripts/build-entity-locales.cjs
```

Inspect importer arguments before running. Sources are pinned and cached; do not casually upgrade them and overwrite reviewed identity mappings. Entity translations are authored in `scripts/entity-locale-copy.cjs` and generated by `scripts/build-entity-locales.cjs`. Edit the source of generated data, then regenerate and validate.

`python scripts/import-catholic-dutch.py --check`, `python scripts/import-catholic-bible.py --check`, `python scripts/import-tanakh.py --check` and `python scripts/import-quran.py --check` compare deterministic rebuilds with the saved assets without modifying them. Tanakh translation aids depend on the existing Dutch/French Bible assets. Cached reproducibility is separate from checking upstream updates: follow Tanzil and QuranEnc update links, review changed text and source terms, then deliberately update pins and rerun validation. QuranEnc requires unchanged republication, retained attribution and transcript information, following updates, reporting translation issues to the source, and avoiding inappropriate advertising alongside the text.

## Rules that protect accuracy

- Keep identity IDs stable and case-sensitive. Namesakes must remain distinct; do not merge people or cities by display name.
- Do not infer biological parenthood from legal parenthood. Joseph → Jesus remains explicitly legal. Heli is not assigned as Mary's biological father.
- A name index reference is not proof that a verse establishes a relationship. Imported family links cite the STEP relationship record, not an arbitrary verse mentioning the name.
- Genealogical lists can omit generations. The Adam–Jesus route combines selected accounts and is not presented as a verbatim reproduction of Luke's genealogy.
- Preserve original Bible text exactly, apart from documented whitespace normalization. Do not translate the WEB with an automatic translator. Load the selected published edition.
- Preserve both fixed Catholic edition identities and their independent numbering. Use reviewed `meta.catholicNavigation` coordinates for the Dutch additions, not English coordinates. Keep separate reading states for `catholic-nl`, `catholic` and each legacy locale edition. Changing interface language does not change a fixed Catholic text. Saved explicit edition preferences win over the first-visit Dutch default. All shared 66 books are conservatively marked as uncertain for legacy atlas exact-verse identity in Douay-Rheims. Catholic supplement references explicitly cite `edition: catholic` and the source book/chapter/verse; named profiles are curated evidence, not exhaustive text concordances or automatically inferred relationships.
- Preserve the Tanakh edition boundary: JPS 1917 is a Jewish translation; Statenvertaling and Segond are Christian reading aids. Do not present the latter as Jewish translations. Canonical-book identities and navigation components are separate concepts.
- Do not align Tanakh passages merely because chapter/verse numbers match. Hebrew Joel has four chapters and Malachi three, while the translation sources use three and four respectively. Keep reading positions per edition. Hebrew and Arabic search normalization must never modify the displayed or saved source text.
- Keep Qur’an translation, original Arabic and translator notes distinguishable. No biblical people/genealogy links are inferred in either new reader. External Sefaria/Quran.com commentary may have different authors and editions and must remain separately attributed.
- French versification differs from English in several books. The model conservatively marks name candidates as uncertain in affected books rather than asserting exact-verse identity. City citations in those books open a clearly labeled English WEB reader view, retaining the interface language and offering a return to the previous selected-edition reading state. Full cross-edition verse alignment remains a future improvement.
- Collective names such as Israel and namesakes need a chooser. A name-only match must not silently resolve to one person. Place/person ambiguity also needs a chooser.
- Shared city/person verse references do not establish residence or physical presence.
- Localized proper names include conventional spellings and edition variants. Original aliases remain searchable. Obscure names may retain their source transliteration; an exhaustive multilingual scholarly onomasticon is not claimed.
- External source links can remain in their original language. Distinguish source provenance from the selected reader edition.
- The original biblical family graph and city atlas cover the 66 shared books. The Catholic people supplement adds sourced profiles for the deuterocanonical books and additions, while retaining distinct identities, source locators and limits. The Tanakh and Qur’an readers do not expand the base atlas’s identity or relationship claims. Other canons and interpretations are not claimed to be exhaustive.

## Localization architecture

`BibleI18n.t(source, params)` translates stable English source keys, using `{parameter}` interpolation. Library components translate explicitly. A reversible DOM translation layer handles static and dynamic shell text; it excludes Bible reading content so it cannot rewrite Scripture. `reference()` localizes book names for display while IDs and canonical source labels remain stable.

Do not directly translate graph relationship notes in the stored data: legal-parent detection currently reads the original note. Translate presentation. Data identity patches preserve original aliases and reference labels. Recreate reader/city instances on a language switch using their `getState()`/`setState()` interfaces; account for in-flight initialization.

The tradition readers translate their own UI inside a protected `translate="no"` root. `SacredReader.changeLanguage()` preserves an explicitly chosen Hebrew/Arabic edition; a translation following the prior UI language follows the new one. Separate edition positions persist under `biblepath-reader-judaism` / `biblepath-reader-islam`. Notes are keyed by tradition, edition and chapter/surah and stay in the current browser. They are not synchronized to an account. Tradition-specific JSON loads lazily; request guards prevent a late response replacing the currently selected tradition. Biblical city links explicitly select Christianity before opening their passage.

## Validate before publishing

Core checks:

```sh
node validate-data.cjs
node scripts/validate-import.cjs
node tests/discovery.cjs
node tests/paths.cjs
node tests/graph-highlights.cjs
node tests/graph-geometry.cjs
node tests/app-map-state.cjs
node tests/reader-atlas.cjs
node tests/scripture.cjs
node tests/places.cjs
node tests/entity-locales.cjs
node tests/i18n.cjs
node tests/scripture-locales.cjs
node tests/catholic-bible-data.cjs
node tests/catholic-dutch-data.cjs
node tests/catholic-reader.cjs
node tests/person-passage-map.cjs
node tests/person-passage-resolver.cjs
node tests/catholic-people-ui.cjs
node tests/catholic-people.cjs
node tests/interfaith-app.cjs
node tests/sacred-library.cjs
node tests/sacred-reader.cjs
node tests/tanakh-data.cjs
node tests/quran-data.cjs
node tests/torah-people.cjs
node tests/quran-people.cjs
node tests/person-comparisons.cjs
node tests/people-traditions.cjs
node tests/festivals-data.cjs
node tests/festivals-ui.cjs
python tests/import-bible.py
python tests/import-bible-locales.py
python tests/import-catholic-bible.py
python tests/import-catholic-dutch.py
python scripts/import-catholic-bible.py --check
python scripts/import-catholic-dutch.py --check
node scripts/build-catholic-people.cjs --check
node scripts/build-person-passage-map.cjs --check
python scripts/import-tanakh.py --check
python scripts/import-quran.py --check
node scripts/build-torah-people.cjs --check
node scripts/build-quran-people.cjs --check
```

Run any additional Catholic people/reader suites in `tests/` and the supplemental people builder’s `--check` alongside these checks. Run locale tests when changing translations or edition importers. Syntax-check edited JavaScript with `node --check`. Browser verification should cover:

- EN → NL → FR → EN, including a reload to verify stored language.
- A fresh browser defaults to Dutch, while an existing explicit language preference is retained.
- A fresh visit starts with Dutch controls and Dutch Catholic scripture. Open all seven deuterocanonical books, Baruch 6, Esther additions including chapter 16, Daniel’s prayer/song and chapters 13–14; verify actual Dutch text, source notes, search, final verses and links. Test the English edition separately. Switch interface language without replacing the fixed edition, then switch Dutch/English editions and verify separate reading positions. Switch to a 66-book edition from an added book/chapter without leaving an invalid location. Bible person references use the reviewed Dutch passage map regardless of the saved reader edition. Original source links remain separate. Check moved verses, whole-range highlighting, multiple target passages, variant notes, unavailable mappings and retries. City references retain their separate source-edition fallback.
- Bible → Torah → Qur’an people indexes preserve separate queries and profiles; Torah has no New Testament entries or copied Christian biographies. Arabic aliases work in the Qur’an index. Bible testament controls are hidden for the other collections.
- Across traditions shows a Roman Catholic account alongside separate Jewish and Islamic accounts, with biblical passages distinct from Catechism/Church-teaching sources; profile comparison buttons and return links route to the correct collection. Compare Moses, Jesus and Mary/Miriam, then switch languages without losing selection.
- Christianity → Judaism → Islam → Christianity, preserving separate edition positions, including a reload. Verify failed-download retry and switching traditions during a pending download.
- All three Tanakh groups, Hebrew RTL reading/search, authentic JPS text, clearly labeled Dutch/French aids and independent numbering (Hebrew Joel 4 versus translation Joel 3).
- Qur’an Arabic alongside NL/EN/FR translations, diacritic-insensitive Arabic search, surah/ayah references, final surah navigation and source/translation notes.
- Save and reopen local notes; external commentary/tafsir links stay separate from scripture and show the relevant source.
- Canonical and localized references (John / Johannes / Jean 3:16), text search, chapter navigation, and the final chapter of Revelation.
- A linked person in Matthew 1 and a linked city in Matthew 2; namesake chooser behavior.
- Reader → family map → return, retaining the chapter and verse.
- Adam → Jesus in all three map layouts and across a language switch, with 63 cited steps and legal-parent explanation.
- City filters/detail/reference navigation and same-named settlements.
- French Jerusalem → Psalms 51:18 opens the English passage about Jerusalem, with a translated explanation and return to the prior LSG reading position.
- Adaptive discoveries and the selected person survive all three layout changes; Reset returns to immediate family. Family tree keeps parents above children even when spouse chains cross generations.
- Desktop and narrow mobile layouts, keyboard labels, no horizontal page overflow, and no console errors.
- Feestdagen & rituelen under each religion: separate topic lists, search/filter/selection, all three languages, cited historical and interpretive context, and no exercises or study questions. Test internal passage actions for Catholic Dutch, Hebrew Tanakh and Dutch Qur’an, complete range highlights, return to the dossier, and original-source links. A late or failed download must not overwrite another religion or trap the user without retry.

Do not add a test that merely repeats implementation constants; assert user-visible behavior, identity correctness, preserved text, or meaningful geometric constraints.

## Festival dossier maintenance

The three `dist/festivals-*.json` assets contain 22 information dossiers in NL/EN/FR. Maintain distinct scripture, tradition/interpretation and historical/contemporary source labels. Each calendar and section cites local reference IDs. The app is strictly an information source; do not reintroduce study questions or exercises. Internal passage coordinates are edition-specific (`catholic-nl`, Hebrew `he`, QuranEnc Dutch `nl`); validate them against the real corpora, rather than inferring equivalence. Calendars give recurring rules and diversity, not generated dates. Search/filter/selection stay scoped to the religion. `festivals.js` owns the model/view/locales; `app.js` lazy-loads it and routes reading actions with cancellation guards.

## Publishing and Git

The primary host is Vercel: team `personalprojectsmichiel`, existing project `biblepath` (`prj_uwFc2dLb1zKwjNTttXWYzboaAeQg`). `vercel.json` serves only `dist/`, with no install/build step. GitHub `main` is connected for production deployments. The primary domain is `www.religieatlas.com`; verify the matching commit is ready and the HTTPS page serves the current app after a push. Local `.vercel/` linking state and `.env*` are ignored; never publish them.

The original Sites project is recorded in `.openai/hosting.json`. Reuse that project ID for updates; do not create a second Site. Preserve its private audience. Use the installed Sites workflow to open source, validate, commit/push/package that exact state, and publish. A pushed GitHub commit by itself does not deploy the Sites app.

GitHub is a separate source destination. Push reviewed work to this repository without force-pushing or discarding remote changes. Never commit credentials, cache downloads, private account metadata, or deployment tokens. No secrets are required to run the static app.

## Three suggested next features

These are proposals, not implemented features:

1. **Bookmarks and study collections:** extend the existing Tanakh/Qur’an local reading notes to saved passages, people, cities and connection paths; add export/import before introducing accounts.
2. **Historical timeline:** show people and events by era alongside the family map, with explicitly approximate or disputed dates and sources.
3. **Geographic journeys map:** plot cities and routes such as the Exodus and Paul's travels, with geographic uncertainty clearly marked and source links for every route segment.

Other known improvements include licensed modern Dutch/French Catholic translations, expanded reviewed Catholic person and place coverage, reviewed cross-edition verse alignment, wider proper-name alias coverage, further editorial verification of imported relationships, and offline asset caching. Preserve the current working app while adding them incrementally.

## Jewish and Islamic family maps and places

Both religions now have map/cities navigation alongside books, people and festivals. `dist/tradition-atlas.js` and `.css` render independent curated datasets `tradition-atlas-judaism.json` and `tradition-atlas-islam.json`. Preserve each collection’s own identities, sources and relation types. A missing relation is not proof of no kinship. Never infer Muhammad’s ancestry from Biblical records, or merge Maryam’s Quranic kinship language into Moses’s family. Place associations do not establish residence; keep historical and location caveats.

The atlas component keeps per-religion family/person/query/zoom and city/filter state. `app.js` routes map/cities according to the selected religion; explicit Bible actions restore Christianity. Reader actions retain `he` Hebrew Tanakh or `nl` Dutch Quran coordinates and support return to the originating map/place. Validate every cited range against the real source editions and every optional index ID against its collection. Use the new data/UI tests plus interfaith app regression before publication. Do not add study questions.

## Geographic map and calm family-map update

Cities navigation defaults to `geography`; the Kaart/Lijst switch retains existing city profiles. `PlacesMapView` is created lazily from canonical raw Christian places, both separate tradition atlases and `place-geography.json`. Programmatic religion navigation applies that religion; returning from a profile or passage retains user filters, query, selected place and viewport. Do not guess coordinates or merge religious identities. Preserve OSM/Leaflet/OpenBible attribution, pinned sources, unknown places and alternative identifications.

Jewish/Islamic families reuse `BibleGraph` with a direct-family default and expandable evidence. Parent arrows remain distinct from spouses, siblings, guardianship and adoption. Test all existing suites plus place-geography, places-map, updated tradition-atlas-ui and interfaith-app; run the geography builder --check. Browser QA must cover tiles, filter/search, overlapping identities, a no-coordinate place, each religion’s profile/passage/return, family layouts, mobile and language changes.

The reader's detailed verse-numbering guidance is retained in a neutral, initially collapsed disclosure. Map selection reveals offscreen place details without scrolling an already visible desktop panel; silent programmatic selection remains silent. Family layout buttons wrap by their text width on small screens. Regression coverage includes collapsed translated numbering guidance and offscreen map selections. Reset temporary browser viewport overrides after responsive QA.

## Readability and responsive typography

Shared type tokens in styles.css set 15px general text (16px on mobile), 14px controls/labels, 13px supporting copy (14px on mobile), and 12px compact metadata. Secondary text uses darker muted greens; calm serif headings and soft backgrounds remain. Component overrides cover readers, person collections/comparisons, festivals, cities, the geographic map and all family-map controls. Preserve 44px mobile touch targets and 16px input/select text.

Reader search fields take a full row on phones so the scope selector cannot collapse. Sacred-reader edition controls reset flex sizing at the existing 850px column breakpoint. Sidebar/topbar, layout pickers, legends, sources and profile actions wrap at narrow widths. Recheck 320px, 390px, 800px and desktop widths, including long French labels, after typography changes. Browser checks confirmed no horizontal page overflow, functioning search/passages/filtering/layout switches and readable supporting copy. All 37 test files passed.
