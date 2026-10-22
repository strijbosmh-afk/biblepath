'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'dist/catholic-bible-data.json'),'utf8'));
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'dist/scripture.js'),'utf8'),context);
const model=new context.window.BibleScripture(data),plain=value=>JSON.parse(JSON.stringify(value));
const expected='GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH TOB JDT EST 1MA 2MA JOB PSA PRO ECC SNG WIS SIR ISA JER LAM BAR EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ');
assert.deepEqual(data.books.map(book=>book.id),expected,'Exactly the Catholic canon in its declared navigation order');
assert.equal(data.meta.editionId,'catholic');assert.equal(data.meta.canon,'catholic');assert.equal(data.meta.canonComplete,true);
assert.equal(data.meta.language,'en','The Douay-Rheims text must never be advertised as Dutch');
assert.equal(data.meta.sourceEdition,'engDRA');assert.equal(data.meta.license,'Public domain');
assert.equal(data.meta.sourceUrl,'https://ebible.org/Scriptures/engDRA_usfx.zip');
assert.equal(data.meta.licenseUrl,'https://ebible.org/engDRA/copyright.htm');
assert.match(data.meta.sourceSha256,/^[a-f0-9]{64}$/);assert.match(data.meta.sourceXmlSha256,/^[a-f0-9]{64}$/);
assert.equal(data.books.filter(b=>b.testament==='OT').length,46);assert.equal(data.books.filter(b=>b.testament==='NT').length,27);
assert.equal(data.meta.bookCount,73);assert.equal(data.meta.chapterCount,1334);assert.equal(data.meta.verseCount,35811);
const extraChapters={TOB:14,JDT:16,WIS:19,SIR:51,BAR:6,'1MA':16,'2MA':15,EST:16,DAN:14};
for(const [id,count] of Object.entries(extraChapters))assert.equal(model.book(id).chapters.length,count,id);
let chapters=0,verses=0;
for(const book of data.books){
  assert.equal(new Set(book.chapters.map(c=>c.number)).size,book.chapters.length);
  assert.deepEqual(book.chapters.map(c=>c.number),Array.from({length:book.chapters.length},(_,i)=>i+1));
  for(const chapter of book.chapters){
    chapters++;const numbers=chapter.verses.map(v=>v.number);
    assert.deepEqual(numbers,[...new Set(numbers)].sort((a,b)=>a-b));
    for(const verse of chapter.verses){
      verses++;assert.ok(verse.text.length>0||verse.notes?.length,`${book.id} ${chapter.number}:${verse.number}`);
      assert.doesNotMatch(verse.text,/<[^>]+>|\ufffd/,'Source text must contain no XML markup or encoding damage');
      assert.ok(model.reference(`${book.id} ${chapter.number}:${verse.number}`));
    }
  }
}
assert.equal(chapters,1334);assert.equal(verses,35811);
const canonical=data.books.flatMap(book=>book.chapters.flatMap(ch=>ch.verses.map(v=>`${book.id}.${ch.number}.${v.number}\t${v.text}`))).join('\n');
assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'),data.meta.textSha256,'Integrity covers every verse in all73 books');
assert.equal(model.verse('GEN',1,1).text,'In the beginning God created heaven, and earth.');
assert.match(model.verse('TOB',1,1).text,/Tobias/);assert.match(model.verse('JDT',1,1).text,/Arphaxad/);
assert.match(model.verse('WIS',1,1).text,/Love justice/);assert.match(model.verse('SIR',1,1).text,/All wisdom is from the Lord/);
assert.match(model.verse('BAR',6,1).text,/Babylon/);assert.match(model.verse('BAR',6,72).text,/idols/);
assert.match(model.verse('1MA',1,1).text,/Alexander/);assert.match(model.verse('2MA',15,40).text,/ended/);
assert.match(model.verse('EST',10,4).text,/Mardochai/);assert.match(model.verse('EST',14,1).text,/Esther/);
assert.match(model.verse('EST',16,24).text,/province and city/);
assert.match(model.verse('DAN',3,25).text,/Azarias/);assert.match(model.verse('DAN',3,90).text,/mercy endureth for ever/);
assert.match(model.verse('DAN',13,2).text,/Susanna/);assert.match(model.verse('DAN',14,3).text,/Bel/);
assert.match(model.verse('DAN',14,42).text,/God of Daniel/);
assert.match(model.verse('REV',22,21).text,/grace.*Jesus/i);
for(const [label,id] of [['Tobie 1:1','TOB'],['Wijsheid 1:1','WIS'],['Siracide 1:1','SIR'],['1 Makkabeeën 1:1','1MA'],['2 Maccabées 1:1','2MA']])assert.equal(model.reference(label).bookId,id);
assert.deepEqual(plain(model.reference('Esther 16:24')),{bookId:'EST',chapter:16,verse:24,endVerse:24});
assert.equal(model.reference('Esther 17:1'),null);assert.equal(model.reference('Daniel 15:1'),null);
assert.equal(model.reference('Baruch 7:1'),null);assert.equal(model.reference('Tobit 14:18'),null);
assert.equal(model.search('Susanna',{bookId:'DAN'}).results[0].chapter,13);
assert.ok(model.search('Judas',{bookId:'1MA'}).total>0,'New books participate in full-text search');
assert.ok(model.search('idol',{bookId:'BAR'}).results.some(r=>r.chapter===6),'Letter of Jeremiah is searchable');
assert.equal(model.atlasReference('Psalms 23:1'),null,'Legacy atlas locators must not silently use Vulgate numbering');
assert.equal(model.atlasReference('Daniel 3:25'),null,'Equal numbers in the furnace chapter are not alignment');
assert.match(data.meta.versificationNote,/Baruch 6/);
for(const addition of data.meta.additions){
  assert.ok(model.verse(addition.book,addition.chapter,addition.verse));
  assert.ok(model.verse(addition.book,addition.endChapter,addition.endVerse));
}
console.log(`Catholic Bible passed: 73 books, ${chapters} chapters, ${verses} verses; seven deuterocanonical books, all Esther/Daniel additions, Baruch6, source integrity, edition-safe references and search.`);
