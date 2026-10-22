const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'dist', name), 'utf8'));
const data = read('person-comparisons.json');
const bible = read('bible-data.json');
const tanakh = read('tanakh-data.json').editions.en;
const quran = read('quran-data.json');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/data.js'), 'utf8'), context);
const bibleIds = new Set(context.window.BIBLE_DATA.people.map(p => p.id));
const quranIds = new Set(read('quran-people.json').people.map(p => p.id));
const torahIds = new Set(read('torah-people.json').people.map(p => p.id));
const locales = ['nl', 'en', 'fr'];
const traditions = ['christianity', 'judaism', 'islam'];
const sourceIds = new Set(data.meta.sources.map(source => source.id));
const byKey = new Map(data.people.map(p => [p.key, p]));

function localized(value, label) {
  for (const locale of locales) {
    assert.equal(typeof value?.[locale], 'string', `${label}.${locale}`);
    assert.ok(value[locale].trim().length > 1, `${label}.${locale} is empty`);
    assert.ok(!/<[^>]+>/.test(value[locale]), `${label} must be plain text`);
  }
}

assert.equal(data.people.length, 24, 'The curated comparison set has 24 distinct figures');
assert.equal(byKey.size, data.people.length, 'Comparison keys are unique');
assert.equal(data.meta.complete, false, 'Coverage is explicitly selected, not exhaustive');
localized(data.meta.scope, 'meta.scope');
localized(data.meta.methodology, 'meta.methodology');
let references = 0;
for (const person of data.people) {
  assert.match(person.key, /^[a-z][a-z0-9-]*$/);
  localized(person.names, `${person.key}.names`);
  localized(person.theme, `${person.key}.theme`);
  assert.deepEqual(Object.keys(person.traditions).sort(), [...traditions].sort());
  for (const tradition of traditions) {
    const panel = person.traditions[tradition];
    const label = `${person.key}.${tradition}`;
    for (const field of ['name', 'role', 'summary', 'scope']) localized(panel[field], `${label}.${field}`);
    assert.ok(['attested', 'outside-corpus', 'not-named', 'not-attested'].includes(panel.status), `${label} status`);
    assert.ok(Array.isArray(panel.refs));
    if (['attested', 'not-named'].includes(panel.status)) assert.ok(panel.refs.length, `${label} needs direct evidence`);
    assert.deepEqual([...new Set(panel.refs.map(ref => ref.corpus))], panel.sourceIds, `${label} source provenance`);
    for (const sourceId of panel.sourceIds) assert.ok(sourceIds.has(sourceId));
    if (panel.indexId) {
      const expected = { christianity: bibleIds, judaism: torahIds, islam: quranIds }[tradition];
      assert.ok(expected.has(panel.indexId), `${label}: unresolved index identity ${panel.indexId}`);
      if (tradition === 'judaism') assert.ok(panel.indexId.startsWith('torah:'));
      if (tradition === 'islam') assert.ok(panel.indexId.startsWith('quran:'));
    }
    for (const ref of panel.refs) {
      references++;
      const url = new URL(ref.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(['www.biblegateway.com', 'www.sefaria.org', 'quran.com', 'sunnah.com'].includes(url.hostname));
      assert.ok(ref.label.length > 2);
      if (ref.corpus === 'bible' || ref.corpus === 'tanakh') {
        const collection = ref.corpus === 'bible' ? bible : tanakh;
        const book = collection.books.find(book => book.id === ref.book);
        assert.ok(book, `${label}: missing ${ref.book}`);
        const chapter = book.chapters.find(chapter => chapter.number === ref.chapter);
        assert.ok(chapter, `${label}: missing chapter ${ref.chapter}`);
        for (let verse = ref.verse; verse <= ref.endVerse; verse++) {
          assert.ok(chapter.verses.some(v => v.number === verse), `${label}: missing verse ${ref.book} ${ref.chapter}:${verse}`);
        }
        assert.equal(url.hostname, ref.corpus === 'bible' ? 'www.biblegateway.com' : 'www.sefaria.org');
        if (ref.corpus === 'tanakh') assert.ok(!/^\/[12]_/.test(url.pathname), 'Sefaria numbered books use canonical Roman numerals');
      } else if (ref.corpus === 'quran') {
        const surah = quran.surahs.find(surah => surah.number === ref.surah);
        assert.ok(surah, `${label}: missing surah`);
        for (let ayah = ref.ayah; ayah <= ref.endAyah; ayah++) assert.ok(surah.ayahs.some(v => v.number === ayah), `${label}: missing ayah ${ref.surah}:${ayah}`);
        assert.equal(url.hostname, 'quran.com');
        assert.equal(url.pathname, `/${ref.surah}/${ref.ayah}`, 'Link to the verified first ayah endpoint; retain the range in the label');
        assert.equal(tradition, 'islam');
      } else {
        assert.equal(ref.corpus, 'hadith');
        assert.equal(person.key, 'hagar');
        assert.equal(panel.status, 'outside-corpus');
        assert.equal(url.href, 'https://sunnah.com/bukhari:3364');
      }
    }
  }
}

// Prevent theological harmonization and accidental namesake linking.
const jesus = byKey.get('jesus').traditions;
assert.ok(jesus.christianity.refs.some(r => r.book === 'JHN' && r.chapter === 1));
assert.ok(jesus.islam.refs.some(r => r.surah === 4 && r.ayah === 171));
assert.equal(jesus.judaism.status, 'outside-corpus');
assert.match(jesus.islam.summary.en, /rejects divine sonship/);
const miriam = byKey.get('miriam').traditions;
const mary = byKey.get('mary').traditions;
assert.equal(miriam.judaism.indexId, 'torah:miriam');
assert.equal(miriam.islam.indexId, 'quran:moses-sister');
assert.equal(miriam.islam.status, 'not-named');
assert.equal(mary.islam.indexId, 'quran:mary');
assert.notEqual(miriam.islam.indexId, mary.islam.indexId);
assert.equal(byKey.get('zechariah').traditions.christianity.indexId, 'zechariah');
assert.equal(byKey.get('zechariah').traditions.judaism.status, 'outside-corpus');
assert.equal(byKey.get('jonah').traditions.christianity.indexId, 'step-H3124', 'Jonah the prophet is not Peter’s father');
assert.equal(byKey.get('joseph').traditions.christianity.indexId, 'joseph', 'Joseph son of Jacob is not Mary’s husband');
for (const key of ['david', 'solomon', 'job', 'jonah', 'elijah']) {
  const jewish = byKey.get(key).traditions.judaism;
  assert.match(jewish.scope.en, /outside the Torah/);
  assert.equal(jewish.indexId, undefined, `${key} must not be inserted in the Torah index`);
}
for (const key of ['eve', 'sarah']) assert.equal(byKey.get(key).traditions.islam.status, 'not-named');
assert.equal(byKey.get('hagar').traditions.islam.indexId, undefined);
assert.match(byKey.get('hagar').traditions.islam.scope.en, /hadith/);
for (const key of ['ishmael', 'isaac']) assert.match(byKey.get(key).traditions.islam.summary.en, /not named|unstated/, 'Do not silently name the sacrificial son');
assert.equal(byKey.get('muhammad').traditions.christianity.indexId, undefined);
assert.equal(byKey.get('muhammad').traditions.judaism.indexId, undefined);
assert.equal(byKey.get('muhammad').traditions.islam.indexId, 'quran:muhammad');
console.log(`Person comparisons passed: ${data.people.length} figures, 72 localized panels, ${references} validated source references, separate identities and scoped claims.`);
