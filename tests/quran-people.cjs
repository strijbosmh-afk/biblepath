'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'dist/quran-people.json'), 'utf8'));
const scripture = JSON.parse(fs.readFileSync(path.join(root, 'dist/quran-data.json'), 'utf8'));
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/data.js'), 'utf8'), context);
const bibleIds = new Set(context.window.BIBLE_DATA.people.map(person => person.id));
const byKey = new Map(data.people.map(person => [person.key, person]));
const locales = ['nl', 'en', 'fr'];
const knownSources = new Set(data.meta.sources.map(source => source.id));
assert.equal(data.meta.tradition, 'islam');
assert.equal(data.meta.count, data.people.length);
assert.ok(data.people.length >= 50, 'Broad coverage beyond only the most familiar shared figures');
assert.equal(byKey.size, data.people.length);
assert.equal(new Set(data.people.map(person => person.id)).size, data.people.length);
for (const locale of locales) {
  assert.ok(data.meta.scope[locale]);
  assert.ok(data.meta.referenceNote[locale]);
}
assert.match(data.meta.scope.en, /Not an exhaustive/);
assert.match(data.meta.scope.en, /angels, jinn and groups/);
let references = 0;
for (const person of data.people) {
  assert.equal(person.id, `quran:${person.key}`);
  assert.ok(!bibleIds.has(person.id), 'Qur’an identities must never reuse a Bible identity');
  assert.equal(person.bibleId, undefined, 'No unreviewed automatic identity equivalence');
  assert.equal(person.parents, undefined, 'No inferred Bible family relationships');
  assert.equal(person.spouses, undefined, 'No inferred Bible family relationships');
  assert.ok(Array.isArray(person.aliases));
  assert.equal(new Set(person.aliases).size, person.aliases.length);
  for (const locale of locales) {
    assert.ok(person.names[locale]?.trim(), `${person.id} ${locale} name`);
    assert.ok(person.summary[locale]?.trim().length > 40, `${person.id} ${locale} summary`);
    assert.ok(person.roles[locale]?.length, `${person.id} ${locale} roles`);
    for (const value of [person.names[locale], person.summary[locale], ...person.roles[locale]]) {
      assert.doesNotMatch(value, /<[^>]+>|\uFFFD|undefined|\[object Object\]/, `${person.id} ${locale} plain text`);
    }
  }
  assert.notEqual(person.summary.nl, person.summary.en, `${person.id}: Dutch is translated`);
  assert.notEqual(person.summary.fr, person.summary.en, `${person.id}: French is translated`);
  assert.ok(person.sourceIds.length && person.sourceIds.every(id => knownSources.has(id)));
  assert.ok(person.refs.length, `${person.id}: source passages are required`);
  assert.equal(new Set(person.refs.map(ref => ref.label)).size, person.refs.length);
  for (const ref of person.refs) {
    references++;
    assert.ok(Number.isInteger(ref.surah) && ref.surah >= 1 && ref.surah <= 114, `${person.id} surah`);
    const surah = scripture.surahs[ref.surah - 1];
    assert.ok(Number.isInteger(ref.ayah) && ref.ayah >= 1 && ref.ayah <= surah.ayahs.length, `${person.id} ${ref.label}`);
    const end = ref.endAyah || ref.ayah;
    assert.ok(Number.isInteger(end) && end >= ref.ayah && end <= surah.ayahs.length, `${person.id} ${ref.label} end`);
    assert.equal(ref.label, `${ref.surah}:${ref.ayah}${end !== ref.ayah ? `–${end}` : ''}`);
    assert.equal(ref.url, `https://quran.com/${ref.surah}/${ref.ayah}`);
    for (let ayah = ref.ayah; ayah <= end; ayah++) {
      assert.ok(surah.ayahs[ayah - 1].arabic);
      for (const locale of locales) assert.ok(surah.ayahs[ayah - 1].translations[locale], `${person.id} source exists in ${locale}`);
    }
  }
}

// The 25 names conventionally listed as Qur'anic prophets must all be represented.
// Dhul-Kifl is included with a textual caveat rather than an unsupported direct title.
const prophetKeys = ['adam','idris','noah','hud','salih','abraham','lot','ishmael','isaac','jacob','joseph','shuayb','job','dhul-kifl','moses','aaron','david','solomon','elijah','elisha','jonah','zechariah','john-baptist','jesus','muhammad'];
assert.equal(prophetKeys.length, 25);
for (const key of prophetKeys) assert.ok(byKey.has(key), `Missing conventionally listed prophet: ${key}`);
assert.equal(byKey.get('dhul-kifl').classification, 'conventionally-counted-prophet');
assert.match(byKey.get('dhul-kifl').summary.en, /not explicitly called a prophet/);
for (const key of ['mary','imran','azar','luqman','uzayr','talut','jalut','qarun','haman','pharaoh','samiri','dhul-qarnayn','abu-lahab','zayd']) {
  assert.ok(byKey.has(key), `Named figure or title missing: ${key}`);
}
assert.ok(!byKey.get('luqman').roles.en.includes('Prophet'));

// Guard against common cross-scripture conflations and silently naming anonymous people.
assert.notEqual(byKey.get('mary').id, byKey.get('moses-sister').id);
assert.match(byKey.get('moses-sister').summary.en, /not Maryam/);
assert.match(byKey.get('haman').summary.en, /separate from Haman in the book of Esther/);
assert.match(byKey.get('azar').summary.en, /does not automatically merge/);
assert.match(byKey.get('midian-elder').summary.en, /does not name him Shuayb/);
assert.match(byKey.get('dhul-qarnayn').summary.en, /without selecting a disputed historical identification/);
assert.match(byKey.get('uzayr').summary.en, /not be treated as a description of what all Jews believe/);
for (const key of ['adam-wife','abraham-wife','queen-sheba','pharaoh-wife','moses-mother','moses-sister','mary-mother','lot-wife','noah-wife','noah-son','adam-son-killed','adam-son-killer','moses-guide','joseph-master-wife','moses-companion']) {
  const person = byKey.get(key);
  assert.equal(person.naming, 'descriptive', key);
  assert.equal(person.comparisonKey, undefined, `${key}: an explicit comparison may link a record without equating the identities`);
}
for (const key of ['adam-wife','abraham-wife','queen-sheba','pharaoh-wife','moses-sister','mary-mother','moses-guide','joseph-master-wife','moses-companion']) {
  assert.doesNotMatch(Object.values(byKey.get(key).names).join(' '), /Eve|Sarah|Bilqis|Asiya|Miriam|Hannah|Khidr|Zulaikha|Joshua/, key);
}
for (const key of ['adam','noah','abraham','lot','ishmael','isaac','jacob','joseph','moses','aaron','david','solomon','job','jonah','zechariah','john-baptist','jesus','mary','muhammad']) {
  assert.equal(byKey.get(key).comparisonKey, key, `${key}: explicit comparison key remains stable`);
}
const check = spawnSync(process.execPath, [path.join(root, 'scripts/build-quran-people.cjs'), '--check'], { encoding: 'utf8' });
assert.equal(check.status, 0, check.stderr || check.stdout);
console.log(`Qur’an people checks passed: ${data.people.length} distinct profiles, 25 conventionally listed prophets, ${references} valid passage ranges, NL/EN/FR and identity safeguards.`);
