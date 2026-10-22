'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const { build } = require('../scripts/build-catholic-people.cjs');
const beforeBible = fs.readFileSync(path.join(root, 'dist/data.js'), 'utf8');
const beforeTorah = fs.readFileSync(path.join(root, 'dist/torah-people.json'), 'utf8');
const beforeQuran = fs.readFileSync(path.join(root, 'dist/quran-people.json'), 'utf8');
const actual = JSON.parse(fs.readFileSync(path.join(root, 'dist/catholic-people.json'), 'utf8'));
assert.deepEqual(actual, build(), 'Committed Catholic asset must reproduce exactly from reviewed copy');
assert.equal(fs.readFileSync(path.join(root, 'dist/data.js'), 'utf8'), beforeBible);
assert.equal(fs.readFileSync(path.join(root, 'dist/torah-people.json'), 'utf8'), beforeTorah);
assert.equal(fs.readFileSync(path.join(root, 'dist/quran-people.json'), 'utf8'), beforeQuran);
const context = { window: {} };
vm.runInNewContext(beforeBible, context);
const base = context.window.BIBLE_DATA;
assert.equal(base.people.length, 2987, 'Original 2,987 Bible identities are retained');
assert.equal(base.relationships.length, 1803, 'Existing genealogy remains intact');
const baseIds = new Set(base.people.map(person => person.id));
const scripture = JSON.parse(fs.readFileSync(path.join(root, 'dist/catholic-bible-data.json'), 'utf8'));
const byKey = new Map(actual.people.map(person => [person.key, person]));
const p = key => { assert(byKey.has(key), `Missing person ${key}`); return byKey.get(key); };
const mapped = actual.people.filter(person => person.bibleId);
assert.equal(new Set(actual.people.map(person => person.id)).size, actual.people.length);
assert.equal(new Set(mapped.map(person => person.bibleId)).size, mapped.length, 'One supplement per existing identity');
assert.equal(actual.meta.personCount, actual.people.length);
assert.equal(actual.meta.mappedPersonCount, mapped.length);
assert.equal(actual.meta.newPersonCount, actual.people.length - mapped.length);
assert(actual.meta.newPersonCount >= 70, 'Broad supplemental coverage is retained');
assert.equal(actual.meta.complete, false, 'Curated supplement must not claim exhaustive indexing');
assert.equal(actual.meta.tradition, 'bible');
assert.equal(actual.meta.sourceHashes.sourceXmlSha256, scripture.meta.sourceXmlSha256);
assert.equal(actual.meta.sourceHashes.scriptureTextSha256, scripture.meta.textSha256);
for (const locale of ['nl', 'en', 'fr']) {
  assert(actual.meta.scope[locale].length > 100);
  assert(actual.meta.referenceNote[locale].includes('1899'));
}
let refsChecked = 0;
for (const person of actual.people) {
  assert.match(person.id, /^catholic:/);
  assert.equal(person.entityType, 'human');
  assert.equal(person.profileKind, 'curated-catholic-role');
  assert.deepEqual(person.sourceIds, ['douay-rheims']);
  assert(!Object.hasOwn(person, 'relationships'), 'Supplement does not invent genealogical edges');
  if (person.bibleId) assert(baseIds.has(person.bibleId));
  else assert(!baseIds.has(person.id));
  for (const locale of ['nl', 'en', 'fr']) {
    assert(person.names[locale].trim());
    assert(person.roles[locale].length && person.roles[locale].every(role => role.trim()));
    assert(person.summary[locale].length > 35);
    assert(person.disambiguation[locale].trim());
  }
  assert(person.refs.length);
  for (const ref of person.refs) {
    refsChecked++;
    assert.equal(ref.edition, 'catholic', 'Never open Catholic/Vulgate references in another edition');
    assert.equal(ref.sourceId, 'douay-rheims');
    assert.equal(ref.url, `https://ebible.org/engDRA/${ref.book}${String(ref.chapter).padStart(2, '0')}.htm#V${ref.verse - 1}`);
    const chapter = scripture.books.find(book => book.id === ref.book)?.chapters.find(chapter => chapter.number === ref.chapter);
    assert(chapter, `${person.id}: source chapter exists`);
    assert(Number.isInteger(ref.verse) && Number.isInteger(ref.endVerse) && ref.verse <= ref.endVerse);
    for (let verse = ref.verse; verse <= ref.endVerse; verse++) assert(chapter.verses.some(item => item.number === verse && item.text.trim()), `${person.id}: source verse ${verse} exists`);
  }
}
for (const book of ['TOB', 'JDT', 'WIS', 'SIR', 'BAR', '1MA', '2MA', 'EST', 'DAN']) {
  assert(actual.people.some(person => person.refs.some(ref => ref.book === book)), `${book} receives person-index coverage`);
  assert.equal(actual.meta.byBook[book], actual.people.filter(person => person.refs.some(ref => ref.book === book)).length);
}
for (const [book, chapter] of [['EST', 14], ['EST', 15], ['DAN', 3], ['DAN', 13], ['DAN', 14], ['BAR', 6]]) {
  assert(actual.people.some(person => person.refs.some(ref => ref.book === book && ref.chapter === chapter)), `${book} ${chapter} additions receive coverage`);
}

// Identity regression tests: these cannot be resolved by matching names alone.
const separate = groups => {
  for (const keys of groups) {
    assert.equal(new Set(keys.map(key => p(key).bibleId || p(key).id)).size, keys.length, `Keep namesakes separate: ${keys}`);
  }
};
separate([
  ['tobit', 'tobias'], ['anna-tobit', 'anna-raguel'], ['achior-tobit', 'achior-judith'],
  ['eleazar-avaran', 'eleazar-martyr'], ['jason-envoy', 'jason-high-priest', 'jason-cyrene'],
  ['dositheus-esther', 'dositheus-captain'], ['lysimachus-esther', 'lysimachus-menelaus'],
  ['joakim-baruch', 'joakim-susanna'], ['nebuchadnezzar', 'nebuchadnezzar-judith'],
  ['ptolemy-dositheus', 'ptolemy-dorymenes', 'ptolemy-abubus'],
  ['apollonius-samaria', 'apollonius-tharseas'], ['simon-son-onias', 'simon-maccabeus', 'simon-temple'],
  ['antiochus-iv', 'antiochus-v', 'antiochus-vi', 'antiochus-vii'], ['demetrius-i', 'demetrius-ii'],
  ['ben-sira', 'joshua-high-priest'], ['wisdom-narrator', 'solomon']
]);
assert(!p('judith').bibleId, 'Judith the heroine is not Esau’s wife');
assert(!p('sarah-tobit').bibleId, 'Sarah daughter of Raguel is not Abraham’s wife');
assert(!p('mother-seven-sons').bibleId, 'Unnamed mother is not silently identified with Hannah');
assert(!p('wisdom-narrator').bibleId, 'Unnamed Wisdom narrator is not explicitly named Solomon');
assert(!p('ben-sira').bibleId, 'Jesus ben Sira is not Jesus Christ');
assert.equal(p('nathan').bibleId, 'step-H5416H', 'Sirach names the prophet Nathan, not David’s son');
assert.equal(p('azariah').bibleId, 'step-H5838Z');
assert.equal(p('hananiah').bibleId, 'step-H2608T');
assert.equal(p('mishael').bibleId, 'step-H4332I');
assert.equal(p('joshua-high-priest').bibleId, 'step-H3091J');
assert.equal(p('susanna').refs[0].chapter, 13, 'Susanna uses DRA Daniel 13');
assert.match(p('susanna').disambiguation.nl, /Daniël 13/);
assert.match(p('judas-maccabeus').disambiguation.nl, /1 Makkabeeën/);
assert.match(p('wisdom-narrator').disambiguation.fr, /Sagesse/);
assert(p('habakkuk').refs.some(ref => ref.book === 'DAN' && ref.chapter === 14));
assert(p('cyrus').refs.some(ref => ref.book === 'DAN' && ref.chapter === 14));
assert(!actual.people.some(person => /raphael|asmodeus/i.test(person.key)), 'Nonhuman figures are outside this declared human index');

// Verify selected identity evidence against source text, not just verse bounds.
const sourceText = key => p(key).refs.flatMap(ref => scripture.books.find(book => book.id === ref.book).chapters.find(chapter => chapter.number === ref.chapter).verses.filter(verse => verse.number >= ref.verse && verse.number <= ref.endVerse).map(verse => verse.text)).join(' ');
for (const [key, expected] of [
  ['anna-raguel', /Anna his wife/], ['achior-tobit', /Achior and Nabath/],
  ['judith', /Judith a widow/], ['ben-sira', /Jesus the son of Sirach/],
  ['joshua-high-priest', /Jesus the son of Josedec/], ['nathan', /Nathan the prophet/],
  ['susanna', /Susanna/], ['joakim-susanna', /Joakim/], ['habakkuk', /Habacuc/],
  ['azariah', /Azarias/], ['hananiah', /Ananias/], ['mishael', /Misael/],
  ['dositheus-esther', /Dositheus/], ['jason-cyrene', /Jason of Cyrene/],
  ['jason-envoy', /Jason the son of Eleazar/], ['jason-high-priest', /Jason the brother of Onias/]
]) assert.match(sourceText(key), expected, `${key}: cited source supports identity`);
// Exercise the actual reader model and merged index: display labels alone must
// not hide the edition's short names or select a different namesake.
const { CatholicPeople } = require('../dist/catholic-people-ui.js');
vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/scripture.js'), 'utf8'), context);
const catholicIndex = new CatholicPeople(actual, base.people);
const readerModel = new context.window.BibleScripture(scripture, catholicIndex.readerPeople('nl'));
const sourceAnnotation = (book, chapter, verse, name) => readerModel.annotate(book, chapter, verse).find(item => item.text === name);
const expectPerson = (book, chapter, verse, name, key) => {
  const annotation = sourceAnnotation(book, chapter, verse, name);
  assert(annotation, `${book} ${chapter}:${verse}: ${name} is linked`);
  assert.equal(annotation.match, 'verse', `${name}: cited source identity, not spelling-only fallback`);
  assert.deepEqual(Array.from(annotation.personIds), [p(key).bibleId || p(key).id], `${book} ${chapter}:${verse}: ${name} resolves to ${key}`);
};
expectPerson('TOB', 1, 1, 'Tobias', 'tobit');
expectPerson('TOB', 7, 10, 'Tobias', 'tobias');
// 1:9 names Anna but refers to father and son by pronouns. Both profiles retain
// that source reference; the model must not fabricate a name occurrence.
assert(!sourceAnnotation('TOB', 1, 9, 'Tobias'));
assert(p('tobit').refs.some(ref => ref.book === 'TOB' && ref.chapter === 1 && ref.verse <= 9 && ref.endVerse >= 9));
assert(p('tobias').refs.some(ref => ref.book === 'TOB' && ref.chapter === 1 && ref.verse === 9));
expectPerson('TOB', 1, 9, 'Anna', 'anna-tobit');
expectPerson('TOB', 7, 2, 'Anna', 'anna-raguel');
expectPerson('TOB', 7, 10, 'Sara', 'sarah-tobit');
expectPerson('TOB', 9, 3, 'Gabelus', 'gabael');
expectPerson('BAR', 1, 7, 'Joakim', 'joakim-baruch');
expectPerson('DAN', 13, 1, 'Joakim', 'joakim-susanna');
expectPerson('1MA', 2, 2, 'John', 'john-gaddi');
expectPerson('1MA', 2, 4, 'Judas', 'judas-maccabeus');
expectPerson('1MA', 2, 5, 'Eleazar', 'eleazar-avaran');
expectPerson('2MA', 6, 18, 'Eleazar', 'eleazar-martyr');
expectPerson('2MA', 2, 24, 'Jason of Cyrene', 'jason-cyrene');
expectPerson('2MA', 4, 7, 'Jason', 'jason-high-priest');
expectPerson('1MA', 8, 17, 'Jason', 'jason-envoy');
assert(!readerModel.annotate('1MA', 2, 1).some(item => item.match === 'verse' && item.personIds.includes('catholic:john-gaddi')), 'John Gaddi is not his namesake ancestor in the preceding verse');
assert(!readerModel.annotate('1MA', 1, 11).some(item => item.text === 'Antiochus' && item.match === 'verse' && item.personIds.length === 1), 'Verse-level evidence cannot assign both Antiochus occurrences to the son');
assert(!readerModel.annotate('1MA', 10, 67).some(item => item.text === 'Demetrius' && item.match === 'verse' && item.personIds.length === 1), 'Verse-level evidence cannot assign both Demetrius occurrences to the son');
console.log(`Catholic people: ${actual.people.length} profiles (${actual.meta.newPersonCount} new, ${mapped.length} mapped), ${refsChecked} source references, identities, inline source aliases and canon coverage verified.`);
