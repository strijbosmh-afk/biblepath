'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { build, parseRef, loadSource } = require('../scripts/build-torah-people.cjs');
const root = path.resolve(__dirname, '..');
const savedText = fs.readFileSync(path.join(root, 'dist/torah-people.json'), 'utf8');
const saved = JSON.parse(savedText);
const { data, translations } = loadSource();
const tanakh = JSON.parse(fs.readFileSync(path.join(root, 'dist/tanakh-data.json'), 'utf8'));
const expected = data.people.filter(person => person.refs.some(ref => parseRef(ref.label)));
const bibleById = new Map(data.people.map(person => [person.id, person]));
const peopleById = new Map(saved.people.map(person => [person.id, person]));
const sourceIds = new Set(saved.meta.sources.map(source => source.id));
assert.equal(saved.meta.tradition, 'judaism');
assert.equal(saved.meta.personCount, 481);
assert.equal(saved.meta.indexReferenceCount, 4325);
assert.equal(saved.people.length, expected.length);
assert.equal(peopleById.size, saved.people.length, 'No identity collisions');
assert.deepEqual(saved.people.map(person => person.bibleId).sort(), expected.map(person => person.id).sort(), 'Every indexed Torah identity is included, with no imported non-Torah identities');
assert.deepEqual(saved.meta.bookIds, ['GEN', 'EXO', 'LEV', 'NUM', 'DEU']);
assert.equal(savedText, JSON.stringify(build(), null, 2) + '\n', 'Generator reproduces the entire saved asset');
for (const file of ['data.js', 'entity-locales.js']) {
  assert.equal(saved.meta.sourceHashes[file], crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dist', file))).digest('hex'));
}
let indexedReferenceCount = 0;
for (const person of saved.people) {
  assert.equal(person.id, `torah:${person.bibleId}`);
  assert.equal(person.key, person.bibleId);
  assert(!bibleById.has(person.id), 'Torah IDs never overwrite the Bible index');
  assert(!Object.hasOwn(person, 'relationships'), 'No inherited graph links');
  const original = bibleById.get(person.bibleId);
  const indexedRefs = person.refs.filter(ref => ref.provenance !== 'curated-torah-role');
  indexedReferenceCount += indexedRefs.length;
  assert.deepEqual(indexedRefs.map(ref => [ref.label, ref.url]), original.refs.filter(ref => parseRef(ref.label)).map(ref => [ref.label, ref.url]), 'Exact source passage associations and source-edition URLs are preserved');
  assert.notEqual(person.summary.en, original.description, 'Independent Torah summaries, no imported Bible biography');
  assert(!/Jesus|Christ|New Testament|Jezus|Christus|Nouveau Testament|Jésus/.test(Object.values(person.summary).join(' ')), 'Torah summaries contain no imported Christian role claims');
  for (const locale of ['nl', 'en', 'fr']) {
    assert(person.names[locale]?.trim(), `${person.id}: localized name`);
    assert(person.summary[locale]?.trim(), `${person.id}: localized summary`);
    assert(person.roles[locale]?.length, `${person.id}: localized role`);
    assert(person.disambiguation[locale]?.trim(), `${person.id}: namesake locator`);
    const patch = translations[locale]?.people?.[person.bibleId];
    assert.equal(person.names[locale], patch?.name || original.name);
  }
  assert(person.aliases.includes(original.name));
  assert(person.sourceIds.length && person.sourceIds.every(id => sourceIds.has(id)));
  for (const ref of person.refs) {
    assert(saved.meta.bookIds.includes(ref.book), `${person.id}: first five books only`);
    assert(sourceIds.has(ref.sourceId));
    assert.match(ref.url, /^https:\/\/(?:www\.biblegateway\.com|ebible\.org)\//);
    assert(ref.numbering.startsWith('English'), 'No assumed Hebrew numbering');
    const chapter = tanakh.editions.en.books.find(book => book.id === ref.book)?.chapters.find(chapter => chapter.number === ref.chapter);
    assert(chapter?.verses.some(verse => verse.number === ref.verse), `${person.id}: ${ref.label} start exists in JPS English numbering`);
    assert(chapter.verses.some(verse => verse.number === (ref.endVerse || ref.verse)), `${person.id}: ${ref.label} end exists`);
    assert((ref.endVerse || ref.verse) >= ref.verse);
    if (ref.provenance === 'curated-torah-role') {
      assert.equal(ref.sourceId, 'jps1917');
      assert.equal(ref.sourceEdition, 'JPS 1917');
      assert.equal(ref.url, `https://ebible.org/engjps/${ref.book}${String(ref.chapter).padStart(2, '0')}.htm`);
    }
  }
}
assert.equal(indexedReferenceCount, saved.meta.indexReferenceCount);
assert.equal(saved.meta.curatedProfileCount, saved.people.filter(person => person.profileKind === 'curated-torah-role').length);
assert(saved.meta.curatedProfileCount >= 25);
assert.equal(peopleById.get('torah:moses').names.nl, 'Mozes');
assert.equal(peopleById.get('torah:moses').names.fr, 'Moïse');
assert.equal(peopleById.get('torah:moses').comparisonKey, 'moses');
assert.equal(peopleById.get('torah:step-H3091G').comparisonKey, 'joshua');
assert(!peopleById.has('torah:step-G2424K'), 'Luke’s Joshua is not confused with Joshua son of Nun');
assert(!peopleById.has('torah:jesus'));
assert(!peopleById.has('torah:david'), 'Tanakh beyond Torah is not silently included');
assert(!peopleById.has('torah:solomon'));
assert.deepEqual(saved.people.filter(person => /^step-H6547/.test(person.bibleId)).map(person => person.bibleId).sort(), ['step-H6547G', 'step-H6547H', 'step-H6547I', 'step-H6547J'], 'Separate Pharaoh identities stay separate');
assert.equal(saved.people.filter(person => /^step-H7141/.test(person.bibleId)).length, 3, 'Distinct Korah namesakes retained');
assert.equal(saved.people.filter(person => person.comparisonKey === 'korah').length, 1, 'Only Korah son of Izhar is tagged for that comparison');
assert.equal(parseRef('John 3:16'), null);
assert.equal(parseRef('Psalms 23:1'), null);
const jacobRef = peopleById.get('torah:jacob').refs.find(ref => ref.provenance === 'curated-torah-role' && ref.label === 'Genesis 32:28');
assert.equal(jacobRef.numbering, 'English JPS 1917');
assert.match(tanakh.editions.en.books[0].chapters.find(chapter => chapter.number === 32).verses.find(verse => verse.number === 28).text, /no more Jacob, but Israel/);
for (const locale of ['nl', 'en', 'fr']) {
  assert(saved.meta.scope[locale]?.trim());
  assert(saved.meta.referenceNote[locale]?.trim());
}
console.log(`Torah people: ${saved.people.length} distinct identities, ${indexedReferenceCount} source associations, ${saved.meta.curatedProfileCount} independent Torah profiles verified.`);
