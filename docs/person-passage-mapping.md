# Person-index passages in the Dutch Catholic reader

The index preserves the original citation, URL and edition. The reader uses an
explicit crosswalk keyed by `atlas-ESV|label`, `atlas-KJV|label` or
`catholic|label`. Equal numbers alone are not treated as evidence of alignment.
Unknown editions and references are not guessed by the runtime.

The checked dataset covers all 20,531 legacy reference occurrences and all 176
Catholic supplement occurrences: 11,443 distinct edition-specific references.
11,424 are mapped and 19 are marked partial, with Dutch, English and French
explanations. None of the current index references lacks a Dutch destination.
A partial destination is the corresponding passage or source note; it does not
claim that a source sentence omitted by Canisius exists in the Dutch text.

## Sources and method

- The Dutch Catholic text is the pinned Canisius/eBible composite described in
  `scripts/import-catholic-dutch.py`. Its eBible base already uses English-style
  coordinates for the 66 shared books. The original Canisius OSIS numbering must
  therefore **not** be applied indiscriminately to this assembled edition.
- The versification review uses [STEP TVTMS — Translators’ Versification
  Traditions](https://github.com/STEPBible/STEPBible-Data/blob/ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d/Versification/TVTMS%20-%20Translators%20Versification%20Traditions%20with%20Methodology%20for%20Standardisation%20for%20Eng%2BHeb%2BLat%2BGrk%2BOthers%20-%20STEPBible.org%20CC%20BY.txt),
  pinned to commit `ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d`.
  Attribution: STEPBible.org, Tyndale House, Cambridge;
  [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
  Changes: selected applicable conditional rows, inverted source-to-standard
  coordinates to obtain Dutch destinations, and added explicit Canisius
  exceptions and bounded context mappings. No scripture wording is generated.
- `scripts/atlas-versification-rules.json` retains the source hashes, 1,275
  applicable TVTMS rows with their conditions and line numbers, the set of
  potentially sensitive standard locators, 121 explicit reviewed exceptions,
  and 101 Psalm superscriptions. The target asset and complete sequence of
  edition-specific index references are pinned by SHA-256.
- `scripts/atlas-ot-review.json` records direct passage comparisons for 85
  sensitive Old Testament locations. It explicitly flags three textual
  differences: Hosea 6:7 does not name Adam; 1 Kings 4:4 omits the Zadok/Abiathar
  statement; 1 Kings 11:25 has a different second clause.
- `scripts/catholic-person-passage-map.json` records direct parallel review of
  the actual bundled Douay–Rheims and Dutch passages for all 153 distinct
  Catholic ranges. 28 destination ranges differ; six remain partial because
  Canisius omits or differs in a source statement. Both source text hashes and
  all current supplement references are checked by the builder.

TVTMS conditional tests are evidence for a numbering scheme, not an automatic
semantic oracle. Its word-count heuristic misclassifies the Dutch wording of
Philippians 1:16–17; an explicit semantic rule takes precedence. ESV and Canisius
put love in verse 16 and selfish ambition in 17; KJV reverses those clauses.
The Psalm discriminator `Psa.9:30=NotExist` means that verse 30 is absent from
the 20-verse English-numbered chapter. Esther additions appended by the Dutch
importer do not renumber the Hebrew base story.

## Representative corrections

| Original index citation | Dutch destination | Reason |
| --- | --- | --- |
| Daniel 3:24 | Daniel 3:91 | Prayer and song inserted before the furnace narrative resumes |
| Daniel 4:1 | Daniel 3:98 | Different chapter boundary |
| Daniel 4:8 | Daniel 4:5 | Same narrative, offset by three verses |
| Psalms 3:0 | Psalms 3:1 | David/Absalom superscription is included in verse 1 |
| Acts 13:39 | Acts 13:38–39 | The clause about the law of Moses crosses the verse boundary |
| Sirach 50:29–31 | Sirach 50:27–29 | Different DRA/Canisius numbering |
| 1 Maccabees 1:43–57 | 1 Maccabees 1:41–54 | Different verse division |

Whole adjoining verses are used where editions divide a sentence differently.
No synthetic subverse identifiers or rewritten scripture are created. The
original source remains available separately. Source dash placeholders open
their original Dutch locator and explanatory source note, marked partial.
Reviewed exceptional rules also retain the missing Mark 9:44 row and the Psalm
84:9–10 bridge, even though those exact verses are not currently cited by the
person index. The bridge's numeric coverage must not imply that the missing
shield/anointed clause is present.

## Build and verification

```sh
node scripts/build-person-passage-map.cjs
node scripts/build-person-passage-map.cjs --check
node tests/person-passage-map.cjs
node tests/person-passage-resolver.cjs
```

The build is offline and deterministic. It fails if the pinned Dutch text,
the original index references, the Catholic source text pins, or Catholic
reference coverage changes. A sensitive locator without an explicit review
also fails. New source editions require a new reviewed key family.

`dist/person-passage-map.json` is the browser artifact. Repeated evidence is
interned in its top-level `evidence` dictionary; a record's `evidence` value
is the corresponding dictionary key. This reduces download size without
changing passage data. Tests check all 20,707 source occurrences, every target
row, reproducibility, explicit source-edition distinctions, Psalm titles,
chapter shifts, sentence boundaries, and source omissions.
