const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),context={window:{}};vm.createContext(context);
for(const file of ['data.js','entity-locales.js','scripture.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const base=context.window.BIBLE_DATA,places=JSON.parse(fs.readFileSync(path.join(root,'dist/places-data.json'),'utf8'));
const english=JSON.parse(fs.readFileSync(path.join(root,'dist/bible-data.json'),'utf8')),Model=context.window.BibleScripture;
const plain=value=>JSON.parse(JSON.stringify(value));
for(const locale of ['nl','fr']){
  const data=JSON.parse(fs.readFileSync(path.join(root,`dist/bible-data-${locale}.json`),'utf8'));
  const patches=context.window.BIBLE_ENTITY_LOCALES[locale];
  const people={people:base.people.map(person=>({...person,...patches.people[person.id]}))};
  const cities={places:places.places.map(place=>({...place,...patches.places[place.id]}))};
  const model=new Model(data,people,cities);
  assert.equal(data.meta.language,locale);assert.equal(data.meta.bookCount,66);assert.equal(data.meta.chapterCount,1189);
  assert.equal(data.meta.verseCount,locale==='nl'?31102:31170);
  assert.deepEqual(data.books.map(book=>book.id),english.books.map(book=>book.id),'Canonical book identities are stable across languages');
  assert.equal(model.books().filter(book=>book.testament==='OT').length,39);assert.equal(model.books().filter(book=>book.testament==='NT').length,27);
  assert.match(data.meta.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(data.meta.sourcePage.startsWith('https://'));assert.ok(data.meta.licenseUrl.startsWith('https://'));
  const canonical=data.books.flatMap(book=>book.chapters.flatMap(ch=>ch.verses.map(v=>`${book.id}.${ch.number}.${v.number}\t${v.text}`))).join('\n');
  assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'),data.meta.textSha256);
  assert.equal(model.book('John').id,'JHN');assert.equal(model.book('Johannes').id,'JHN');assert.equal(model.book('Jean').id,'JHN');
  for(const label of ['John 3:16','Johannes 3:16','Jean 3:16'])assert.deepEqual(plain(model.reference(label)),{bookId:'JHN',chapter:3,verse:16,endVerse:16});
  assert.equal(model.reference('Jean 3:999'),null);assert.equal(model.reference('Johannes 3:16-999'),null);
  for(let i=0;i<data.books.length;i++){
    const book=data.books[i];assert.equal(model.reference(`${book.name} 1:1`).bookId,book.id);
    assert.equal(model.reference(`${english.books[i].name} 1:1`).bookId,book.id);
  }
  const joseph=model.annotate('MAT',1,16).find(a=>a.personIds.includes('joseph-nt'));
  assert.ok(joseph);assert.equal(joseph.match,'verse');assert.deepEqual(plain(joseph.personIds),['joseph-nt']);
  assert.ok(model.annotate('GEN',37,2).some(a=>a.personIds.includes('joseph')&&a.match==='verse'));
  assert.ok(model.annotate('MAT',1,16).some(a=>a.personIds.includes('jesus')));
  assert.ok(model.annotate('MAT',2,1).some(a=>a.placeIds.includes('place-H3389')&&a.match==='verse'));
  assert.ok(model.annotate('MAT',2,1).some(a=>a.placeIds.includes('place-H1035G')&&a.match==='verse'));
  assert.ok(!model.annotate('MAT',2,2).some(a=>['Jews','Joden','Juifs'].includes(a.text)));
  const query=locale==='nl'?'WANT ALZO LIEF HEEFT GOD DE WERELD GEHAD!!!':'CAR DIEU A TANT AIME LE MONDE!!!';
  const hits=model.search(query);assert.equal(hits.total,1);assert.equal(hits.results[0].bookId,'JHN');assert.equal(hits.results[0].chapter,3);assert.equal(hits.results[0].verse,16);
  if(locale==='fr'){
    assert.ok(data.meta.verseIdentityUncertainBooks.includes('PSA'));
    assert.ok(model.annotate('PSA',3,1).some(a=>a.personIds.includes('david')&&a.match==='name'&&a.ambiguous));
    assert.ok(model.annotate('EXO',3,1).every(a=>a.match!=='verse'),'Never assume equal verse numbers establish the same identity in differing numbering schemes');
    assert.ok(!model.annotate('GEN',15,15).some(a=>a.text==='Toi'),'French pronoun Toi is not an unreferenced person');
  }else{
    assert.deepEqual(data.meta.verseIdentityUncertainBooks,[]);
    assert.ok(!model.annotate('GEN',1,1,'Dan sprak hij verder.').some(a=>a.text==='Dan'),'Dutch sentence-start Dan is not an unreferenced person');
    assert.ok(model.verse('JHN',3,18).text.includes('Naam'));
    assert.ok(!model.annotate('JHN',3,18).some(a=>a.text==='Naam'),'Dutch Naam in John 3:18 means name, not a person');
    assert.ok(!model.annotate('GEN',2,23).some(a=>a.text==='Men'),'Dutch pronoun Men is not an unreferenced person');
  }
  const homographs=locale==='nl'?['Dan','Naam','Men']:['Toi'];
  const fixture={meta:{language:locale},books:[{id:'GEN',name:'Genesis',testament:'OT',chapters:[{number:1,headings:[],verses:[{number:1,text:homographs.join(' ')},{number:2,text:homographs.join(' ')}]}]}]};
  const fixturePeople={people:homographs.map(name=>({id:name,name,refs:[{label:'Genesis 1:2'}]}))};
  const fixtureModel=new Model(fixture,fixturePeople);
  assert.deepEqual(plain(fixtureModel.annotate('GEN',1,1)),[],'Local common words cannot create spelling-only links');
  assert.deepEqual(plain(fixtureModel.annotate('GEN',1,2).map(a=>a.text)),homographs,'The same spellings retain indexed-verse identity links');
  assert.ok(fixtureModel.annotate('GEN',1,2).every(a=>a.match==='verse'));
  let count=0,spansCount=0;
  const ids=new Set(people.people.map(p=>p.id)),cityIds=new Set(cities.places.map(p=>p.id));
  for(const book of data.books)for(const chapter of book.chapters)for(const verse of chapter.verses){
    count++;const spans=model.annotate(book.id,chapter.number,verse.number);let cursor=0,rebuilt='';
    for(const span of spans){
      spansCount++;assert.ok(span.start>=cursor&&span.end>span.start&&span.end<=verse.text.length);assert.equal(verse.text.slice(span.start,span.end),span.text);
      assert.ok(span.personIds.every(id=>ids.has(id)));assert.ok(span.placeIds.every(id=>cityIds.has(id)));
      if(span.match==='name')assert.ok(span.ambiguous,'Spelling-only matches never silently resolve a namesake');
      rebuilt+=verse.text.slice(cursor,span.start)+span.text;cursor=span.end;
    }
    rebuilt+=verse.text.slice(cursor);assert.equal(rebuilt,verse.text);
  }
  assert.equal(count,data.meta.verseCount);
  console.log(`${locale}: ${count} verses and ${spansCount} annotation spans passed; complete canon, text hash, localized references, search, namesakes, cities, and versification safeguards.`);
}
const enModel=new Model(english,base,places);
assert.equal(enModel.reference('Jean 3:16').bookId,'JHN');assert.equal(enModel.reference('Johannes 3:16').bookId,'JHN');
console.log('Multilingual scripture passed.');
