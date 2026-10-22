'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'dist/catholic-bible-data-nl.json'), 'utf8'));
const supplementBytes = fs.readFileSync(path.join(root, 'scripts/catholic-dutch-supplement.json'));
const supplement = JSON.parse(supplementBytes);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const expectedOrder = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH TOB JDT EST 1MA 2MA JOB PSA PRO ECC SNG WIS SIR ISA JER LAM BAR EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ');
assert.deepEqual(data.books.map(b => b.id), expectedOrder);
assert.equal(data.meta.editionId, 'catholic-nl');
assert.equal(data.meta.language, 'nl');
assert.equal(data.meta.canon, 'catholic');
assert.equal(data.meta.canonComplete, true);
assert.equal(data.meta.bookCount, 73);
assert.equal(data.books.filter(b => b.testament === 'OT').length, 46);
assert.equal(data.books.filter(b => b.testament === 'NT').length, 27);
assert.match(data.meta.credit, /Canisius.*van Oers/);
assert.equal(data.meta.sources.length, 3);
assert.equal(data.meta.sources[2].transcriptionSha256, hash(supplementBytes));
assert.ok(data.meta.sources[2].rightsEvidence.length >= 2);
const books = new Map(data.books.map(b => [b.id, b]));
const verses = new Map();
let chapters = 0;
const lines = [];
for (const book of data.books) {
  chapters += book.chapters.length;
  assert.deepEqual(book.chapters.map(c => c.number), Array.from({length: book.chapters.length}, (_, i) => i + 1));
  for (const chapter of book.chapters) {
    assert.ok(chapter.verses.length > 0);
    let previous = 0;
    for (const verse of chapter.verses) {
      assert.ok(verse.number > previous);
      previous = verse.number;
      assert.equal(typeof verse.text, 'string');
      assert.ok(verse.text.length > 0 || verse.notes?.length);
      assert.ok(!verse.text.includes('\uFFFD'), 'No replacement characters from incorrect decoding');
      const key = `${book.id}.${chapter.number}.${verse.number}`;
      assert.ok(!verses.has(key));
      verses.set(key, verse);
      lines.push(`${key}\t${verse.text}`);
    }
  }
}
assert.equal(chapters, data.meta.chapterCount);
assert.equal(verses.size, 35510);
assert.equal(verses.size, data.meta.verseCount);
assert.equal(hash(lines.join('\n')), data.meta.textSha256);
const verse = key => { assert.ok(verses.has(key), `Missing ${key}`); return verses.get(key); };
// All seven books and all six Esther additions, with the canonical Daniel
// passages, must contain real Dutch scripture rather than a link or summary.
for (const id of ['TOB', 'JDT', 'WIS', 'SIR', 'BAR', '1MA', '2MA']) {
  assert.ok(books.get(id).chapters.every(c => c.verses.length));
  assert.ok(verse(`${id}.1.1`).text.length > 25);
}
assert.match(verse('EST.11.2').text, /Mordokai.*droom/); // A: dream and conspiracy
assert.match(verse('EST.13.1').text, /afschrift.*brief/); // B: first decree
assert.match(verse('EST.13.8').text, /bad Mordokai/); // C: prayers
assert.match(verse('EST.14.1').text, /Ester.*toevlucht/);
assert.match(verse('EST.15.4').text, /derde dag.*bidden/); // D: royal audience
assert.ok(verse('EST.16.1').text.length > 60); // E: counter-decree
assert.match(verse('EST.10.4').text, /werk van God/); // F: dream interpreted
assert.match(verse('DAN.3.24').text, /vlammen.*loofden God/);
assert.match(verse('DAN.3.90').text, /barmhartig voor eeuwig/);
assert.match(verse('DAN.13.1').text, /Joakim/);
assert.match(books.get('DAN').chapters[12].headings[0].text, /Daniël en Susanna/);
assert.match(books.get('JDT').chapters[0].headings[0].text, /^Eerste deel/);
assert.match(verse('JDT.1.1').text, /^Toen Arpaksad,/);
assert.match(verse('DAN.14.41').text, /leeuwenkuil/);
assert.match(verse('BAR.6.1').text, /brief.*Jeremias/);
assert.equal(books.get('EST').chapters.length, 16);
assert.equal(books.get('EST').chapters[15].verses.length, 24);
assert.equal(books.get('DAN').chapters.length, 14);
assert.equal(books.get('DAN').chapters[2].verses.length, 100);
assert.equal(books.get('DAN').chapters[3].verses.length, 34);
assert.equal(verse('PSA.84.9').numberLabel, '9–10');
assert.equal(verse('PSA.84.9').endNumber, 10);
assert.ok(!verses.has('PSA.84.10'), 'A source verse bridge must not duplicate the scripture text');
assert.equal(verse('WIS.16.16').endNumber, undefined);
assert.match(verse('WIS.16.16').notes.join(' '), /bronnummering/);
assert.match(verse('WIS.16.16').text, /Ja, nog wonderlijker/);
assert.ok(!verses.has('WIS.16.17'));
const dashVariants = [...verses.values()].filter(v => v.text === '-');
assert.equal(dashVariants.length, 23);
assert.ok(dashVariants.every(v => v.notes?.some(n => n.includes('geen laadfout'))));
assert.match(verse('GEN.49.18').notes.join(' '), /Op uw hulp/);
assert.match(verse('1MA.9.33').notes.join(' '), /9:34.*9:43/);
for (const sourceVerse of supplement.verses) {
  const item = verse(`${sourceVerse.book}.${sourceVerse.chapter}.${sourceVerse.number}`);
  assert.equal(item.text, sourceVerse.text);
  assert.equal(item.sourceEdition, 'van-oers-1933');
  assert.equal(item.sourceUrl, sourceVerse.sourceUrl);
  assert.match(item.notes.join(' '), /van Oers.*Canisius/);
}
assert.equal([...verses.values()].filter(v => v.sourceEdition === 'van-oers-1933').length, 25);
for (const shortcut of data.meta.catholicNavigation) verse(`${shortcut.book}.${shortcut.chapter}.${shortcut.verse}`);
console.log('Dutch Catholic data passed: 73 books, all additions, 35,510 Dutch verses, provenance and checksum consistency.');
