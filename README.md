# BiblePath

A dependency-free web app for reading the Bible, Tanakh and Qur’an, and exploring biblical people and cities. Family maps offer three interactive SVG layouts: Constellation, Family tree, and Ancestry rings.

Live app: https://biblepath-people-atlas.glossy-chord-2394.chatgpt.site/ · [Development handover](RESUME_BUILDING.md)

Dutch is the first-visit language; an explicitly saved English, Dutch or French preference is preserved. The Bible reader uses the World English Bible, Statenvertaling and Louis Segond 1910 respectively, with localized person/city profiles and source metadata. The language selector preserves reading and explorer state. Navigation starts with Scripture readers, followed by People index, Across traditions, Relationship map and Cities explorer. Testament filters apply only to the Bible index and family map.

The reader’s tradition selector opens Christianity, Judaism or Islam. The complete Tanakh follows Torah, Prophets and Writings: 24 canonical books represented by 39 navigation components, with Hebrew WLC and Jewish JPS 1917 editions. Dutch Statenvertaling and French Segond are explicitly labeled Christian translation aids. The complete Qur’an includes 114 surahs and 6,236 numbered ayahs, with Tanzil Arabic and named Dutch, English and French translations from QuranEnc. Hebrew and Arabic display right to left. Each edition retains its own numbering and saved reading position; equal verse numbers are not treated as alignment between Tanakh editions.

Tanakh and Qur’an readers support text/reference search, chapter or surah navigation, source credits and notes saved in this browser. Commentary is kept separate through external Sefaria and Quran.com links.

The People index has three separate collections: the existing 2,987 Bible identities, 481 Torah identities drawn from first-five-book name associations (29 with curated Torah role profiles), and 60 curated Qur’an profiles. Torah and Qur’an IDs, searches and selected profiles remain separate; no family relationships are inferred between collections. The new Across traditions view compares 24 selected figures in three sourced panels, distinguishing named, unnamed and outside-corpus accounts. Jewish panels may draw on the wider Tanakh; this does not expand the Torah index beyond its five-book scope.

City references use the atlas's English verse numbering. When the selected edition has unaligned numbering for a book, the reader opens that citation in the English World English Bible with an explanation and a return control. The interface stays in the selected language; returning restores the previous reading position in that edition.

## Run locally

From this directory, run `python -m http.server 5173 --directory dist` and open http://localhost:5173.

There is no build step. `dist/` contains the editable source and deployable app. The expanded index contains 2,987 distinct people, 1,803 family relationships, and over 20,000 reference links across the 66-book Protestant canon. It combines the 157 original curated profiles with a pinned STEP Bible TIPNR snapshot under CC BY 4.0. This is broad coverage, not a claim of an exhaustive or universally agreed genealogy.

## Interactions

- Choose two people and find their connecting path across the entire collection. Bible-cited links are the default; indexed links can be included explicitly. Directed ancestry takes priority, then shortest family paths. Gold path highlights persist across zoom, selection, and layouts. Every step retains its source and notes. Adam → Jesus has 63 connections and includes legal parenthood.
- Read the complete public-domain World English Bible: 66 books, 1,189 chapters, 31,103 numbered verses. Navigate by book/chapter/reference, search all Scripture or a testament/book, and follow annotated names to family maps or cities. Exact-verse identities take priority; uncertain matches and namesakes use a chooser. Psalm headings and source footnotes are retained.
- Switch traditions and text editions without losing their separate reading positions. Search the Tanakh or Qur’an, read original scripts and named translations, and save personal reflections by edition and reading. Notes remain local to the current browser; commentary links open the source website.
- Select Bible, Torah or Qur’an in the people index. Search localized names, aliases, roles and passages; open a profile and follow its sources. The sidebar quick search and family map remain explicitly Bible-scoped.
- Open Across traditions to explore each figure’s role in Christian, Jewish and Islamic accounts. Comparison links open the corresponding collection profile; unnamed figures and differences in textual scope are labeled.
- Browse 604 cities and towns with 4,125 verse references. Search/filter the index, open sourced place profiles, read their passages, and explore people indexed in the same verses. These shared passages do not imply residence or physical presence.
- Switch among three layouts over the same data.
- Adaptive zoom starts with immediate family. Zooming out reveals wider branches (up to eight family steps); zooming in near a visible person reveals their immediate relatives. Already revealed branches remain until reset or a new family is chosen.
- Scene expansion preserves existing node positions and the camera. If a newly revealed family-tree chain cannot fit between existing generations, the tree rearranges around the same anchor to keep parents above children. Circles have at least 126 world units between centers, and obstacle-aware routes avoid unrelated circles. Close zoom adds selective relationship labels.
- Pan, pinch, wheel zoom, keyboard pan/zoom, fit, and expanded map.
- Hover or focus a person for a biography and source; select to inspect their family.
- Search by names, aliases, summaries, and references; browse the people index.
- Filter by testament or choose a fixed relationship distance. Large scenes show up to 180 people with an explicit remaining count; all people remain searchable in the paginated index.
- Read notes for legal parenthood and differing genealogical accounts.

## Extending the index

The repeatable people import is `node scripts/import-tipnr.cjs`. It downloads a pinned source into ignored `.cache/`, applies explicit identity mappings, source corrections, and relationship exclusions, then regenerates `dist/data.js` and the import report. Source identity suffixes are case-sensitive. Do not lowercase them or merge namesakes by display name. `python scripts/import-bible.py` imports the official eBible.org WEB USFX snapshot, and `node scripts/import-places.cjs` creates the settlement index from pinned STEP and OpenBible data. Download checksums and attribution are stored with the datasets. Bible, Tanakh, Qur’an and city JSON files load only when needed.

Run `python scripts/import-tanakh.py` and `python scripts/import-quran.py` to rebuild the additional readers. Tanakh’s Dutch/French aids reuse the existing Bible edition assets; regenerate those first if their sources change. Both new importers accept `--check` to reproduce and compare the saved asset without rewriting it. Preserve exact source wording and all attribution: Hebrew WLC and JPS 1917 are public domain; Tanzil requires verbatim Arabic text, its copyright notice and source link; QuranEnc translations retain publisher, version, transcript information and republication terms. Before publishing a new release, review each Qur’an edition’s `checkUpdatesUrl`, then review any changed source before updating checksum pins. A cached reproducibility check does not check for upstream updates.

Every person has `name`, `gender`, `testament`, `era`, `description`, `refs`, and identity/source context. Relationships use `source`, `target`, `type` (`parent` or `spouse`), `ref`, `evidence`, and an optional `note`. Parent arrows point from parent to child. Do not silently merge different genealogical accounts or infer missing biological relatives.

The separate collection assets are `torah-people.json`, `quran-people.json` and `person-comparisons.json`. Their names, roles, summaries and scope notes are authored in NL/EN/FR; IDs are namespaced and comparison links are explicit. `node scripts/build-torah-people.cjs --check` and `node scripts/build-quran-people.cjs --check` verify deterministic regeneration. Torah index links retain the original English ESV/KJV locators, while curated Torah roles cite Jewish JPS 1917. Links do not assume that Hebrew or other edition numbering is identical. Qur’an profiles cite actual passages; later traditional names are not substituted for unnamed people.

Imported relationships cite the exact STEP index record rather than an arbitrary Bible verse. Name references are labeled as indexed and can include descendant/group usages of an ancestral name. Original curated references retain KJV links; imported name references use ESV. New descriptions use structured identity and role fields, not the source's AI-generated biographies. Full attribution and editorial changes appear in `dist/data-notes.html`.

## Validation

The full validation list is in [the handover](RESUME_BUILDING.md#validate-before-publishing): 22 Node suites and two Python importer suites. New people checks are `node tests/torah-people.cjs`, `node tests/quran-people.cjs`, `node tests/person-comparisons.cjs` and `node tests/people-traditions.cjs`. The app integration suite also verifies separate index navigation, asynchronous loading and comparison links. Also run the scripture and people generator `--check` commands for reproducibility.

Checks cover source provenance, complete scripture editions, native-script search, numbering boundaries, saved positions/notes, language and tradition switching, late or failed downloads, namesakes, paths, persistent highlights, progressive discovery, parent/child generation order, circle/arrow clearance and edition-safe city references. The place rebuild check requires the pinned `.cache/TIPNR.txt` and `.cache/OpenBible-ancient.jsonl` inputs used by `scripts/import-places.cjs`.

Google Fonts provides typography with system fallbacks. The application needs no external runtime library or data service after its static assets load.
