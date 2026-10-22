/* Complete canon, source integrity, translation identity and independent numbering. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=file=>JSON.parse(fs.readFileSync(path.join(root,'dist',file),'utf8'));
const data=read('tanakh-data.json');
const ids='GEN EXO LEV NUM DEU JOS JDG 1SA 2SA 1KI 2KI ISA JER EZK HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL PSA PRO JOB SNG LAM ECC EST RUT DAN EZR NEH 1CH 2CH'.split(' ');
assert.equal(data.meta.tradition,'judaism');assert.equal(data.meta.canonicalBookCount,24);assert.equal(data.meta.navigationBookCount,39);
assert.deepEqual(data.books.map(b=>b.id),ids);
assert.equal(new Set(data.books.map(b=>b.canonicalBook)).size,24);
for(const [group,navigation,canonical] of [['torah',5,5],['prophets',21,8],['writings',13,11]]){
  const books=data.books.filter(b=>b.group===group);
  assert.equal(books.length,navigation);assert.equal(new Set(books.map(b=>b.canonicalBook)).size,canonical);
}
for(const book of data.books)for(const locale of ['nl','en','fr','he'])assert.ok(book.names[locale],`${book.id}: missing ${locale} name`);
assert.equal(data.books.find(b=>b.id==='JOL').canonicalBook,'TWELVE');
assert.equal(data.books.find(b=>b.id==='NEH').canonicalBook,data.books.find(b=>b.id==='EZR').canonicalBook);
assert.deepEqual(Object.keys(data.editions).sort(),['en','fr','he','nl']);
const counts={nl:23145,fr:23211,he:23213,en:23145};
for(const [locale,edition] of Object.entries(data.editions)){
  assert.equal(edition.meta.language,locale);assert.equal(edition.meta.direction,locale==='he'?'rtl':'ltr');
  assert.equal(edition.meta.bookCount,39);assert.equal(edition.meta.chapterCount,929);assert.equal(edition.meta.verseCount,counts[locale]);
  assert.deepEqual(edition.books.map(b=>b.id),ids);
  for(const property of ['sourceUrl','sourcePage','licenseUrl'])assert.match(edition.meta[property],/^https:\/\//);
  assert.match(edition.meta.sourceSha256,/^[a-f\d]{64}$/);assert.ok(edition.meta.credit);assert.ok(edition.meta.license);
  for(const lang of ['nl','en','fr'])assert.ok(edition.meta.contextNote[lang]);
  let chapters=0,verses=0;const rows=[];
  for(const book of edition.books){
    assert.deepEqual(book.chapters.map(c=>c.number),Array.from({length:book.chapters.length},(_,i)=>i+1));
    chapters+=book.chapters.length;
    for(const chapter of book.chapters){
      assert.ok(chapter.verses.length>0);
      const numbers=chapter.verses.map(v=>v.number);
      assert.equal(new Set(numbers).size,numbers.length);assert.deepEqual(numbers,[...numbers].sort((a,b)=>a-b));
      for(const verse of chapter.verses){
        verses++;assert.ok(verse.number>0);assert.equal(typeof verse.text,'string');
        assert.ok(verse.text||verse.notes?.length,`${locale} ${book.id} ${chapter.number}:${verse.number}`);
        assert.doesNotMatch(verse.text,/<\/?(?:w|v|p|c|book)\b/i,'Scripture contains no unrendered source XML');
        if(locale==='he')assert.match(verse.text,/\p{Script=Hebrew}/u);
        rows.push(`${book.id}.${chapter.number}.${verse.number}\t${verse.text}`);
      }
      for(const heading of chapter.headings||[]){assert.ok(heading.text);assert.ok(numbers.includes(heading.beforeVerse));}
    }
  }
  assert.equal(chapters,929);assert.equal(verses,counts[locale]);
  assert.equal(crypto.createHash('sha256').update(rows.join('\n')).digest('hex'),edition.meta.textSha256);
}
const book=(locale,id)=>data.editions[locale].books.find(b=>b.id===id);
const verse=(locale,id,chapter,number)=>book(locale,id).chapters.find(c=>c.number===chapter).verses.find(v=>v.number===number).text;
assert.equal(data.editions.he.meta.sourceSha256,'ee9a3f713368636ff7417ed23abc1a724706c1e9b84d2d5d8044c8e7f60cf5f0');
assert.equal(data.editions.en.meta.sourceSha256,'a608ffc7436c2051baad63244e08e993a372f6713f9a39a41d1c14a8ea3a9f6c');
assert.equal(data.editions.he.meta.tradition,'judaism');assert.equal(data.editions.en.meta.tradition,'judaism');
assert.match(data.editions.en.meta.title,/JPS.*1917/);
assert.equal(verse('en','GEN',1,1),'IN THE beginning God created the heaven and the earth.');
assert.match(verse('en','GEN',1,2),/unformed and void/,'JPS source must not be substituted with the existing Christian translation');
assert.equal(verse('he','GEN',1,1),'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃');
assert.equal(book('he','JOL').chapters.length,4);assert.equal(book('nl','JOL').chapters.length,3);
assert.equal(book('he','MAL').chapters.length,3);assert.equal(book('en','MAL').chapters.length,4);
assert.match(verse('en','PSA',51,18),/^\(51-20\).*Jerusalem/);
assert.match(verse('nl','PSA',51,18),/Jeruzalem/);assert.match(verse('fr','PSA',51,20),/Jérusalem/);
assert.match(verse('he','PSA',51,20),/יְרוּשָׁלָ/);
for(const locale of ['nl','fr']){
  const source=read(`bible-data-${locale}.json`);
  assert.equal(data.editions[locale].meta.tradition,'christian');assert.equal(data.editions[locale].meta.kind,'translation-aid');
  assert.match(data.editions[locale].meta.contextNote.nl,/christelijke vertaling.*geen joodse vertaling/);
  for(const item of data.editions[locale].books)assert.deepEqual(item.chapters,source.books.find(b=>b.id===item.id).chapters,'Translation aids retain exact edition wording, notes and numbering');
}
console.log('Tanakh data passed: 24 canonical books / 39 navigation components; complete Hebrew, JPS1917, Dutch and French editions; source hashes, attribution, original text, and independent verse numbering.');
