# BiblePath

A dependency-free web app for exploring biblical people in three interactive SVG layouts: Constellation, Family tree, and Ancestry rings.

## Run locally

From this directory, run `python -m http.server 5173 --directory dist` and open http://localhost:5173.

There is no build step. `dist/` contains the editable source and deployable app. `data.js` contains the initial curated people and relationship index. It is intentionally not presented as an exhaustive biblical concordance. Each person has original summary text, aliases, and verse references; each relationship has its own reference and optional interpretive note.

## Interactions

- Switch among three layouts over the same data.
- Pan, pinch, wheel zoom, keyboard pan/zoom, fit, and expanded map.
- Hover or focus a person for a biography and source; select to inspect their family.
- Search by names, aliases, summaries, and references; browse the people index.
- Filter by testament, choose relationship distance, or display the whole collection.
- Read notes for legal parenthood and differing genealogical accounts.

## Extending the index

Add a distinct `id` for each person, including namesakes. Every person requires `name`, `gender`, `testament`, `era`, `description`, and `refs`. Relationships use `source`, `target`, `type` (`parent` or `spouse`), `ref`, and optional `note`. Parent arrows point from parent to child. Do not silently merge different genealogical accounts or infer missing biological relatives.

Descriptions are original paraphrases; references link to Bible Gateway's KJV text. Google Fonts is used for typography, with system fallbacks. No data or runtime library is fetched to render the graph.
