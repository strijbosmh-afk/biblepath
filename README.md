# BiblePath

A dependency-free web app for reading Scripture and exploring its people and cities. Family maps offer three interactive SVG layouts: Constellation, Family tree, and Ancestry rings.

Live app: https://biblepath-people-atlas.glossy-chord-2394.chatgpt.site/ · [Development handover](RESUME_BUILDING.md)

English, Dutch, and French are available throughout the app. The reader uses the World English Bible, Statenvertaling, and Louis Segond 1910 respectively, with localized person/city profiles and source metadata. The language selector preserves reading and explorer state. Navigation starts with the Bible reader, followed by People index, Relationship map, and Cities explorer; the scoped People filter appears only in the two people views.

## Run locally

From this directory, run `python -m http.server 5173 --directory dist` and open http://localhost:5173.

There is no build step. `dist/` contains the editable source and deployable app. The expanded index contains 2,987 distinct people, 1,803 family relationships, and over 20,000 reference links across the 66-book Protestant canon. It combines the 157 original curated profiles with a pinned STEP Bible TIPNR snapshot under CC BY 4.0. This is broad coverage, not a claim of an exhaustive or universally agreed genealogy.

## Interactions

- Choose two people and find their connecting path across the entire collection. Bible-cited links are the default; indexed links can be included explicitly. Directed ancestry takes priority, then shortest family paths. Gold path highlights persist across zoom, selection, and layouts. Every step retains its source and notes. Adam → Jesus has 63 connections and includes legal parenthood.
- Read the complete public-domain World English Bible: 66 books, 1,189 chapters, 31,103 numbered verses. Navigate by book/chapter/reference, search all Scripture or a testament/book, and follow annotated names to family maps or cities. Exact-verse identities take priority; uncertain matches and namesakes use a chooser. Psalm headings and source footnotes are retained.
- Browse 604 cities and towns with 4,125 verse references. Search/filter the index, open sourced place profiles, read their passages, and explore people indexed in the same verses. These shared passages do not imply residence or physical presence.
- Switch among three layouts over the same data.
- Adaptive zoom starts with immediate family. Zooming out reveals wider branches (up to eight family steps); zooming in near a visible person reveals their immediate relatives. Already revealed branches remain until reset or a new family is chosen.
- Scene expansion preserves existing node positions and the camera. Circles have at least 126 world units between centers, and obstacle-aware routes avoid unrelated circles. Close zoom adds selective relationship labels.
- Pan, pinch, wheel zoom, keyboard pan/zoom, fit, and expanded map.
- Hover or focus a person for a biography and source; select to inspect their family.
- Search by names, aliases, summaries, and references; browse the people index.
- Filter by testament or choose a fixed relationship distance. Large scenes show up to 180 people with an explicit remaining count; all people remain searchable in the paginated index.
- Read notes for legal parenthood and differing genealogical accounts.

## Extending the index

The repeatable people import is `node scripts/import-tipnr.cjs`. It downloads a pinned source into ignored `.cache/`, applies explicit identity mappings, source corrections, and relationship exclusions, then regenerates `dist/data.js` and the import report. Source identity suffixes are case-sensitive. Do not lowercase them or merge namesakes by display name. `python scripts/import-bible.py` imports the official eBible.org WEB USFX snapshot, and `node scripts/import-places.cjs` creates the settlement index from pinned STEP and OpenBible data. Download checksums and attribution are stored with the datasets. The Bible and city JSON files load only when needed.

Every person has `name`, `gender`, `testament`, `era`, `description`, `refs`, and identity/source context. Relationships use `source`, `target`, `type` (`parent` or `spouse`), `ref`, `evidence`, and an optional `note`. Parent arrows point from parent to child. Do not silently merge different genealogical accounts or infer missing biological relatives.

Imported relationships cite the exact STEP index record rather than an arbitrary Bible verse. Name references are labeled as indexed and can include descendant/group usages of an ancestral name. Original curated references retain KJV links; imported name references use ESV. New descriptions use structured identity and role fields, not the source's AI-generated biographies. Full attribution and editorial changes appear in `dist/data-notes.html`.

## Validation

Run `node validate-data.cjs`, `node scripts/validate-import.cjs`, `node tests/discovery.cjs`, `node tests/paths.cjs`, `node tests/graph-highlights.cjs`, `node tests/graph-geometry.cjs`, `node tests/scripture.cjs`, and `node tests/places.cjs`. Checks cover identity uniqueness, source provenance, genealogy exclusions, paths, persistent highlights, progressive discovery, circle/arrow clearance, scripture completeness, annotation boundaries, namesakes, search, and city references.

Google Fonts provides typography with system fallbacks. The application needs no external runtime library or data service after its static assets load.
