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

## Timeline, reflection and thematic scripture search — 9 November 2026

The religion menus now include Timeline and Reflection challenge; Search by topic is a global view. The user explicitly requested a dedicated reflection feature, overriding the earlier information-only restriction for this new section. Existing information dossiers stay free of exercises. New editorial content is Dutch and explicitly identified as such when the interface language differs.

explore-features.js/.css provide virtualized, grouped chronological events, keyboard/pointer/touch zoom and horizontal navigation, year/text/type filtering, a position slider, contextual sources and undated traditions. timeline-events.json contains101 dated events (35 Catholic,34 Jewish,32 Islamic) and6 undated narratives. Signed historical years have no year0; never manufacture dates for scriptural creation or merge tradition into established history. See docs/timeline-sources.md for source policy and audit.

reflection-challenges.json contains42 editorial prompts (18 Catholic:6 per Sant’Egidio pillar prayer/poor/peace;12 Jewish;12 Islamic), each with context,3 open reflection questions and an edition-specific passage. scripture-topics.json contains30 themes and185 ranges. All247 internal ranges across these files and the timeline have been corpus-validated. Quotes must never be invented; these prompts are labelled editorial statements.

scripture-search-core.js and scripture-search-worker.js search offline-built word postings in a Worker. scripts/build-scripture-search.cjs regenerates the3 search-index-*.json files and the55KB scripture-topic-preview.json. Run with --check to verify reproducibility. Theme-only queries require only the small preview index; combined queries show thematic results before the full text indexes arrive. Full-text indexes load only for selected religions and are cached within the worker. Literal search uses AND across meaningful words; themes use explicit curated synonyms and passage ranges. Paging round-robins selected religions and works past300 results.

Search covers all35510 Catholic Dutch source records, all23145 Dutch Tanakh translation-aid records plus234 distinct Hebrew thematic verse records, and all6236 Dutch Quran ayahs. The Dutch Tanakh aid remains explicitly identified as the Christian Statenvertaling; thematic Jewish references use Hebrew WLC coordinates. Do not align their verse numbers by assumption. Previews retain exact source wording and source metadata; the full readers preserve notes, editions and ranges.

app.js routes new passage actions into the existing edition-aware readers with cancellation guards and a return button that retains the original exploration religion/query/filter/selection. New suites explore-features.cjs and scripture-search.cjs verify content, virtualization, corpus preservation, edition isolation, word/theme search, paging, Worker cache and stale responses. interfaith-app.cjs includes --exploration for cross-religion return and race checks. Browser QA includes320/390px phones and desktop; reset temporary viewport overrides after testing.

## Live interaction and context fixes — 9 November 2026

All107 timeline items (101 dated,6undated) now describe what happened, stakeholders with named roles, religious/practical impact and interpretive nuance. Authoring context lives in docs/timeline-context-{christianity,judaism,islam}.json. scripts/enrich-timeline-context.cjs merges these into runtime data without changing dates or passage coordinates; --check verifies reproducibility. Keep political institutions distinct from a whole religion and distinguish religious narratives from empirically dated events. Every item retains its original sources and any added institutional references.

Timeline dragging starts on cards as well as whitespace, suppresses accidental click after a drag, preserves ordinary taps and vertical page touch travel, supports2D pinch and line/page wheel deltas, and releases vertical wheel travel at the overview and edges. Cards/ticks no longer create unintended overview overflow; card stems remain on the true event coordinate. Pan/zoom limits disable inactive buttons. Resize retains the visible historical period, unchanged paints retain card DOM/focus, and selecting an offscreen context reveals/focuses it. A back-to-timeline button preserves zoom/position. A calm focus outline replaces the browser default on the scroller.

Search resumes pending/partial queries when returning from another view. Worker generations drop replaced queries before expensive corpus work. Thematic ordering is stable within each religion; the combined merge puts all themes first and round-robins literal hits separately, preserving the entire partial preview as a prefix even when traditions have unequal theme counts. The UI appends extra rows without replacing existing matching cards. Form submission no longer issues duplicate requests. Worker/core URLs have a release cache version. Status DOM data-first-result-ms/data-final-result-ms allow local QA measurements without publishing queries or adding visible developer controls.

New tests/explore-interaction.cjs exercises card dragging/tap protection, vertical gesture/page travel,2-axis pinch, wheel units/edges, keyboard, zoom anchor, resize, stable DOM,107 complete contexts and pending-search return. Scripture-search tests all30 mixed-religion preview/final prefixes and superseded worker requests. All40 test files passed. Browser checks covered1280px desktop,390px and320px mobile layouts, actual card dragging, overview wheel release, exact reader ranges and context/reader return paths. Local first-query test:285ms to theme previews,1219ms to all word hits; cached query6ms to previews/18ms total. These are measured test-environment timings, not a network/device guarantee.

## Parallel comparative timeline — 9 November 2026

Each timeline offers “Eén religie” and “Vergelijk de drie religies”. Comparison uses three religious lanes with one shared horizontal camera, year scale, zoom, drag/pinch/wheel/keyboard controls and position slider. One scroll area preserves alignment on phones. Religion labels remain visible while panning; mobile tick density adapts to width. Events and clusters retain their religious identities. Per-lane clustering avoids card overlap, including clamped overview cards. Same-date groups offer explicit event buttons so users can reach every item without endless zooming.

Comparison has its own retained query, camera and selection, independent of each single-religion timeline. Search zooms to matching events while retaining other religions’ events for the same period. Details list other religions’ events that overlap or are within25years, explicitly distinguishing chronological proximity from contact or causation. All6 undated narratives stay outside the dated scale with religion labels. Edition-specific passage actions and return routing preserve the comparison mode, original religion, query and camera.

docs/timeline-connections.json and its identical dist copy contain7 reviewed cross-religion connections. Each links existing event IDs and cites institutional/primary HTTPS sources, distinguishing influence from shared context. A top button opens the dossiers; “Bekijk deze gebeurtenissen samen” fits the linked events to the common scale. Do not infer influence merely from simultaneous dates, merge religious identities, or treat an absent event in the curated selection as absence of historical activity.

tests/timeline-comparison.cjs checks all101 dated identities, exact shared-date coordinates, non-overlapping cards, bounded rendering at60000events, mobile year-label spacing, independent cameras, nearby-event rules, all7 connections, edition-safe passages and same-date group selection. interfaith-app.cjs additionally verifies cross-religion timeline passage/return for Hebrew and Catholic Dutch. All41 test files passed; relevant suites rerun after final mobile tick adjustments. Browser QA covered1280px desktop and390/320px phone widths, real card dragging, shared zoom, sticky labels, source ranges, mode/reader return, influence jump and no horizontal page overflow.

## Clickable timeline connections — 9 November 2026

The comparative timeline now draws the7 reviewed historical connections as clickable SVG segments. Solid green means historical contact/throughwerking; dashed brown means shared context. No arrowheads or inferred direction: the existing source dossiers determine the claim. Each segment joins exact event years across distinct religious lanes, including events inside grouped cards. Multi-event dossiers connect the cross-religion pairs without merging identities. Do not substitute a cluster's first year for a linked event's own date.

The SVG is viewport-sized (not the full zoomed track), and segments are clipped mathematically before rendering. Crossing connections remain visible even when real endpoints are outside the viewport, with explicit partial-visibility text and a fit-whole-connection action. Scroll/zoom/resize recalculate bounded geometry in the existing animation-frame pass; unchanged frames retain DOM. Keep explicit SVG dimensions and reset inherited icon strokes on hit circles/text: global svg icon styles otherwise shrink or thicken the diagram.

Lines have32px transparent hit strokes on desktop,44px on phones, numbered badges when space permits, and equivalent HTML buttons for every visible dossier. Cards and religious lane labels remain above the lines so drawing/hit areas do not obscure or intercept card actions. Enter/Space activate SVG groups; pan/zoom keys remain supported. Dragging from a line pans without opening a dossier; a stationary tap opens context with event buttons and the original sources, focuses its heading, and preserves the shared camera. Closing or returning to the lines keeps position. A checkbox toggles lines without clearing selection, and the type filter removes connections whose endpoints no longer both qualify.

tests/timeline-connection-lines.cjs covers all7 dossiers, identity/date anchoring, phone/desktop/max-zoom geometry, offscreen crossings, filtered endpoints, SVG activation/context/source routing, unchanged camera, keyboard and drag/tap distinction, bounded/stable rendering and reversible visibility. All42 test files passed. Browser checks include native line clicks outside badges, Enter activation, line dragging, zoom/return, full-connection fitting,44px mobile hit strokes, source panels and no horizontal overflow at390/320px.

## Comparative line filters — 9 November 2026

“Soort verband” selects all, historical influence/contact or shared context; “Betrokken religies” provides three independent checkboxes. Both endpoints of a drawn segment must belong to selected religions. Fewer than two selected religions deliberately yields no interreligious lines with a clear message. All three historical lanes/events remain visible, and changing these line filters never moves the camera or clears the timeline query.

TimelineModel.connectionEntries is the common eligibility rule for drawn segments, numbered fallback buttons, the dossier catalogue and selected-event outlines. This prevents hidden connections from returning via a stale button. In a future three-religion dossier only eligible pairs are drawn. Source/context text remains intact. A selected dossier that no longer qualifies is closed; eligible selection remains. Fitting a connection respects active line filters. Counts distinguish eligible dossiers, viewport-visible dossiers, hidden lines and empty/filter-incomplete states; stable original numbering is preserved.

The shared comparison state retains type/religion filters through navigation, mode changes and reader return. “Lijnfilters herstellen” resets type and religion selection while retaining camera/query and the visibility toggle. Mobile controls wrap to readable full rows with44px labels/buttons and16px selects. The existing event-kind filter still applies alongside the line filters.

tests/timeline-link-filters.cjs checks every type/religion combination at273/343/931px drawing widths, exact religious-pair membership, three-religion segment isolation, consistent catalogue/counts, stale-selection guards, retained camera/query, navigation/mode persistence, reset and distinct empty/hidden states. All43 test files passed, with affected suites rerun after the final outline eligibility adjustment. Browser checks covered1280px desktop,390/320px phone widths, live filter changes, unchanged pan position, context/source access, incomplete selections, reset and Hebrew reader/mode return with filters intact.

## Shareable comparative timeline — 9 November 2026

“Vergelijking delen” generates a stable snapshot link and exposes “Link kopiëren” plus a readonly, selectable URL for browsers that deny clipboard access. No account, backend save or native message sending is required. Existing links retain their snapshot when the author later changes the view. Current query parameters/credentials are removed from the base URL; the comparison state is kept in its fragment.

TimelineShare in explore-features.js owns version1 of the #vergelijking=1 fragment protocol. It stores absolute numeric start/end years (six decimal places), line type, selected religions, event-kind filter, line visibility, selected connection, selected moment and query. Keep existing key/version semantics compatible. Empty explicit religion selection remains empty; omitted optional filters default to all. Parser limits total/query lengths and validates finite bounded dates, enums, IDs and duplicate keys. Unknown/invalid versions open a comparison overview with a notice. Missing or filter-incompatible connection IDs are not selected, while valid period/filter state still opens. Unknown IDs never become arbitrary reader actions.

The app checks a shared fragment before choosing its initial view, so a recipient opens the comparison directly without initializing a scripture reader. Hash changes restore another snapshot in the same tab; unrelated fragments do not override current navigation. AtlasExplore applies the state after its timeline data has loaded, validates IDs against actual data, clamps the period to supported data/zoom limits, and opens the selected dossier. Restoration uses year bounds rather than pixel scroll offsets, so phone and desktop show the same period. A canonical restored range prevents browser scroll-pixel rounding from accumulating when a recipient simply copies the same link again; a real pan/zoom creates a new snapshot.

tests/timeline-sharing.cjs covers URL round trips, BCE dates, filter/visibility combinations, malformed/oversized/unsafe input, fresh273/343/931px restoration with integer scroll rounding, unavailable/filter-incompatible dossier selection, camera bounds, immutable links, successful clipboard copying and manual fallback. interfaith-app.cjs adds the --exploration --shared-timeline scenario for direct startup, saved religion independence, no reader download, same-tab changes and invalid/unrelated fragments. All44 test files passed; affected suites rerun after the final canonical-range and parser refinements. Browser QA includes real clipboard equality, a new recipient tab,390/320px direct reopening, exact recopy, preserved selected dossier/sources and malformed-link recovery.

## Downloadable comparison QR codes — 9 November 2026

The share panel now includes a QR preview of the exact snapshot URL and PNG/SVG download links. All encoding/rendering runs locally with the pinned, unmodified MIT-licensed Nayuki1.8.0 ES6 release under dist/vendor/qrcodegen; source URL and LF-normalized SHA-256 are documented there. timeline-qr.js wraps the encoder at medium error correction, with a four-module white quiet zone, pure black modules, an SVG vector preview/export and an integer-scaled PNG of at least768px. The preview is an image element, avoiding inherited20px SVG icon rules.

The app converts generated files to local Blob URLs, which support actual browser download events and keep large encoded images out of DOM attributes. Preview and both downloads refresh together whenever a new share snapshot is generated. Previous Blob URLs are revoked on replacement, view re-render or destruction, but retained through a temporary reader visit while the same cached panel is kept. QR/PNG generation errors preserve the ordinary link-copy flow; a PNG-only failure retains the SVG download. No external QR service or new account/backend is involved.

tests/timeline-qr.cjs verifies the pinned encoder, safe URL handling, quiet zones, real SVG/PNG output, refresh synchronization and generation/PNG fallback. It decodes exported files and256px previews independently with ZXing-C++3.1.1, including BCE, Unicode and long-query snapshots. Test-only dependencies: install tests/qr-requirements.txt into .cache/qr-test-tools with Python if needed; Pillow is bundled with the current runtime. scripts/verify-timeline-qr.py also checks actual downloaded files or screenshots against a manifest of expected URLs. Decoder dependencies are never served to the browser.

All45 test files passed. Native browser PNG/SVG download events produced correctly named files; independent scans of those files, the390px screenshot and the320px screenshot returned the exact current snapshot URL. Mobile downloads also passed, with44px controls, a256px preview on390px and a237px preview on320px, without page overflow. Preserve exact URL equality between link, QR, downloaded files and recipient restoration when changing this feature.


## Compact mobile workspace, central search and canonical profiles — 9 November 2026

The persistent header search button and sidebar search entry open a new central search view; slash also opens it outside form fields. The existing Bible-only dialog remains the picker for relationship-path endpoints. Central search covers independently identified people, places, the 30 existing topics, all dated timeline entries, festival/ritual dossiers and full scripture text. Religion and information-type filters stay separate. Atlas records are indexed once per religion/interface language and in small chunks to avoid long main-thread work; corpus queries use the existing on-demand Worker with stale-response guards and thematic previews. Source previews retain their exact wording and label the Dutch Christian Tanakh translation aid. Direct Dutch/English Bible locators and numerical Qur’an locators resolve against real rows in the selected corpus, retaining its own edition and range. Paging preserves all results.

person-profile.js provides one canonical profile per explicit religious identity with Overview, Texts, Family and Places tabs. All original references survive; curated and Catholic supplemental citations precede the long indexed-name concordance. Catholic records merge only through reviewed bibleId mappings; Torah/Qur’an map records use their explicit indexId mappings. Atlas-only identities remain distinct. Namesakes and different religions never merge by name. Christian family links stay in the unchanged base graph. Shared verse references to places are labeled as associations, not proof of residence. All original source links, notes, comparison accounts, relationship evidence and collection attribution remain accessible. Index, comparison, reader/city links and full-profile actions on maps use the same dialog. The originating view stays behind it; passage return restores the profile/tab. Jewish JPS citations open JPS (en), while explicitly Hebrew atlas coordinates open WLC (he); legacy KJV/ESV index links remain attributed external sources rather than guessed Hebrew alignments. Catholic reads continue through the existing reviewed Dutch correspondence resolver.

compact-layout.js moves the original controls into native details on phones instead of duplicating/rebinding them. Editions/context, reading search/help, timeline line filters/legend, map filters and secondary family controls collapse at <=760px. Desktop expands them; mobile choices persist for rerenders/reader visits. Hidden static family/path controls hide their wrapper too. Dutch remains the default interface; explicit saved language, edition and reading choices remain. The header search and help remain reachable at320px without horizontal page overflow. No scripture files, source identities, graph edges, geographical data or historical claims were edited.

All47 test files passed (43 CJS and4 Python). The expanded interfaith integration suite retains original late-response/edition/mapping/return regressions and verifies the canonical profile callbacks. workspace-models.cjs verifies every Torah/Qur’an index and atlas identity, every Catholic supplement citation, no data mutation, religious scope and direct edition-bound locators. workspace-ui.cjs exercises real profile tabs, original-reference callbacks, pagination, keyboard, safe markup, independent search filters, stale worker/collection responses and error recovery. Browser QA covers1280px desktop and390/320px phones: Catholic Genesis+Sirach in one profile, reviewed Sirach44:20–23 → Dutch44:19–21 correspondence, JPSGenesis12:1–7, Dutch Qur’an2:124–129, tab-preserving return, layouts, collapsed line filters, zoom, sharing and QR exports. Reset temporary viewport overrides and stop the owned preview server after publication.


## Consistent navigation, contextual return and readable timeline periods — 9 November 2026

navigation-trail.js registers final consistent locale labels and exports AtlasNavigationTrail. It retains at most40 compact UI snapshots, one per synchronous action, with retryable restoration and generation guards for canceled asynchronous work. app.js captures the origin before profile/reader/place/comparison/search transitions, restores the source controller and then focus/scroll, and clears the trail on explicit root navigation. Profile return restores the canonical religious identity, tab, reference pagination and dialog scroll; original source numbering stays unchanged. Family/place switches capture before the atlas mutates its mode. Leaflet restores the exact saved center/zoom without animation. The profile return/header/tabs share one sticky wrapper. The contextual app trail is session memory, not URL state or native browser Back.

The religion menus share labels with page headings. Plaatsen includes map/list; Reflectie replaces the less clear Uitdaging label. A direct Tijdslijnen vergelijken entry is under Vergelijken. Comparison mode synchronizes the breadcrumb, heading and active navigation; returning to a single religion restores its menu.

Timeline controls expose full/100/500/1,000-year spans, plus positive year fields with separate v.Chr./n.Chr. choices. Strict custom validation rejects year0, reversed/equal endpoints and ranges outside the source timeline. Presets clamp at the model edges. Both use the existing camera and canonical absolute shared range, preserving filters, selected dossiers, sharing and QR behavior despite integer scroll rounding on phones. The zoom output shows years instead of percentage. Mobile selectors occupy two columns and the expanded custom form uses the full width. No scripture, historical datasets, identities or graph relationships were changed.


All49 test files passed (45 CJS and4 Python), including the complete prior regression suite. New navigation-trail.cjs checks one origin per click, bounded history, nested return, failure/retry and canceled restoration; timeline-periods.cjs checks all3 religions and comparison at273/343/931px, presets, BCE/CE, invalid dates, exact shared URLs, retained filters/dossiers and a canceled asynchronous camera restore. interfaith-app.cjs now loads the real trail and adds --navigation for paged index → canonical profile → reviewed Catholic passage → same tab/expanded references/dialog scroll → same index page/page scroll. Sacred-reader and geographic-map tests verify their new navigation restore APIs. Local browser checks cover consistent comparison navigation, nested Abraham/Sara profiles, source passage/tab return, exact custom comparison periods, Mekka query/place retention, Jewish family↔place return with163% camera retained,390px controls and320px custom-date validation without page overflow. Recheck the public domain on desktop/mobile after deployment.


## UX improvements7–10 — 9 November 2026

map-workspace.js mounts the original map pane/detail nodes in a shared workspace for the Christian family graph, the Jewish/Islamic family graphs and Leaflet. A persistent mobile bottom bar opens/collapses selected details and has a full-screen shortcut. The full-screen workspace reserves space for the open sheet so zoom controls remain usable. The workspace stacking level keeps the sheet above later place-list cards while staying below the normal header. No DOM maps or handlers are cloned. Full-screen mode marks its host as a modal region, inerts surrounding content (except native dialogs/toasts), traps Tab, handles Escape and restores inert state, role/label, overflow, focus and page scroll. Root navigation tears it down; the exploration trail restores full-screen/sheet state after profile or passage visits. Resize uses existing graph/Leaflet behavior, preserving the camera. Mobile sidebar opening is immediate to prevent targets moving during fast navigation.

Graph name labels use14 screen pixels independently of zoom, position beneath circles at overview scales and inside at close zoom, and reduce label collisions with selected/hovered identities first. A cached scale/selection key avoids layout work on ordinary pan. Existing geometry, relationship edges, arrow clearance, path highlights and progressive discovery are unchanged. experience.css raises body text/important metadata, darkens secondary text, retains44px controls, adds selected-state symbols and strengthens focus indicators while preserving the palette.

source-context.js registers consistent source-action labels and renders interface language, text language, original text vs translation, named edition and an explanatory disclosure in both reader types. The top language picker is explicitly Interfacetaal. Catholic correspondence messages, source-specific numbering, Tanakh translation-aid attribution, original scripts, editions, credits, commentary and private notes remain. Christian city references offer the internal reading action alongside the original source. Compare/profile sources retain their actual external targets.

related-exploration.js defines explicit within-religion routes for all22 festival/ritual dossiers. Its93 total links include source references already present in each dossier and reviewed person/place/event/dossier IDs. Buttons pass data to existing reader/profile/place/timeline controllers; no matching by name or inferred cross-canon identities is used. The header shortcut jumps to the related block without modifying the share URL. Related actions participate in the existing contextual return trail, preserving dossier selection, query/filter and scroll. Person/place/dossier labels reuse existing NL/EN/FR names; the timeline retains its existing Dutch content. There are no mandatory exercises or newly added study questions.

All52 test files passed (48 CJS,4 Python). The final small CSS stacking correction was browser-verified, and the localized related-label change was rechecked in all affected suites. New tests verify original map nodes, modal focus/inert/scroll cleanup, bottom-sheet state, every target across all22 dossiers, source editions/languages and safe markup. Expanded tests cover14px graph names across zoom scales, unchanged paths/geometry, related-action dispatch and app navigation from dossier to person/place/event/related dossier and back. Local browser QA covers1280px desktop,390/320px phones, Jewish family full-screen→profile→same50% map/panel, Leaflet Mekka→place profile→same full-screen map,320px Christian graph with working zoom, Catholic Christmas→Jesus/reading/timeline, Dutch Catholic source context, and Pesach→Hebrew Exodus12→same Pesach search/dossier. Verify the custom public domain after publication, reset viewport and stop the owned5180 preview server.
