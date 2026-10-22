'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../dist/quran-data.json'), 'utf8'));

// Hafs/Cairo numbering as provided by the source, including the basmala at 1:1.
const counts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
assert.equal(data.meta.defaultTranslation, 'nl');
assert.equal(data.meta.surahCount, 114);
assert.equal(data.meta.ayahCount, 6236);
assert.equal(data.surahs.length, 114);
assert.deepEqual(data.surahs.map(surah => surah.ayahs.length), counts);
assert.equal(data.surahs.reduce((sum, surah) => sum + surah.ayahs.length, 0), 6236);

for (const [index, surah] of data.surahs.entries()) {
  assert.equal(surah.number, index + 1);
  assert.match(surah.name, /\p{Script=Arabic}/u);
  assert.ok(surah.transliteration);
  assert.equal(Boolean(surah.bismillah), ![1,9].includes(surah.number));
  // Source basmalas can carry a contextual shadda; keep those exact marks in
  // the dataset rather than rewriting all openings to the spelling at 1:1.
  if (surah.bismillah) assert.equal(surah.bismillah.normalize('NFD').replace(/\p{M}/gu, ''), data.surahs[0].ayahs[0].arabic.normalize('NFD').replace(/\p{M}/gu, ''));
  for (const [verseIndex, ayah] of surah.ayahs.entries()) {
    const reference = `${surah.number}:${verseIndex + 1}`;
    assert.equal(ayah.number, verseIndex + 1, reference);
    assert.match(ayah.arabic, /\p{Script=Arabic}/u, reference);
    for (const language of ['nl', 'en', 'fr']) {
      assert.equal(typeof ayah.translations[language], 'string', `${reference} ${language}`);
      assert.ok(ayah.translations[language].trim(), `${reference} ${language}`);
      assert.doesNotMatch(ayah.translations[language], /<\/?[a-z][^>]*>/i, `${reference} ${language}`);
      if (ayah.notes?.[language]) {
        assert.equal(typeof ayah.notes[language], 'string');
        assert.doesNotMatch(ayah.notes[language], /<\/?[a-z][^>]*>/i);
      }
    }
    assert.equal(ayah.annotations, undefined, 'No Bible atlas identities may be inferred for Quran ayahs');
  }
}

// The opening verse is not shifted by an extra, unnumbered basmala. Notes stay
// outside translation wording, and the long and short final chapters are intact.
assert.equal(data.surahs[0].ayahs[0].translations.nl, 'In de naam van Allah, de meest Barmhartige, de meest Genadevolle.');
assert.equal(data.surahs[0].ayahs[5].translations.nl, 'Leid ons naar het rechte pad.');
assert.match(data.surahs[0].ayahs[1].translations.nl, /\[1\]/);
assert.match(data.surahs[0].ayahs[1].notes.nl, /zowel de mensen/);
assert.ok(!data.surahs[0].ayahs[1].translations.nl.includes('zowel de mensen'));
assert.equal(data.surahs[1].ayahs[0].translations.nl, 'Alief, Lam, Miem.[1]');
assert.equal(data.surahs[1].ayahs.at(-1).number, 286);
assert.equal(data.surahs.at(-1).ayahs.at(-1).number, 6);

assert.match(data.editions.ar.sourceUrl, /^https:\/\/tanzil.net/);
assert.match(data.editions.ar.copyrightNotice, /CHANGING IT IS NOT ALLOWED/);
assert.equal(data.editions.ar.version, '1.1');
for (const [language, version] of Object.entries({nl:'2.0.10', en:'1.0.20', fr:'1.0.3'})) {
  const edition = data.editions[language];
  assert.equal(edition.language, language);
  assert.equal(edition.version, version);
  assert.ok(edition.credit && edition.title && edition.rightsNotice);
  assert.match(edition.sourceUrl, /^https:\/\/quranenc.com\/en\/browse\//);
  assert.ok(edition.transcript.updated_at.includes(`v${version}-xml.1`));
  assert.equal(edition.checkUpdatesUrl, edition.transcript.check_updates);
}
assert.equal(data.meta.sources.length, 5);
for (const source of data.meta.sources) assert.match(source.sha256, /^[a-f0-9]{64}$/);
console.log('Quran data checks passed: 114 surahs, 6,236 ayahs, three complete translations, source attribution and separate notes.');
