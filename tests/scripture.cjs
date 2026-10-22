const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),context={window:{}};vm.createContext(context);
for(const file of ['data.js','scripture.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const data=JSON.parse(fs.readFileSync(path.join(root,'dist/bible-data.json'),'utf8'));
const places=JSON.parse(fs.readFileSync(path.join(root,'dist/places-data.json'),'utf8'));
const Model=context.window.BibleScripture,people=context.window.BIBLE_DATA,model=new Model(data,people,places);
const plain=value=>JSON.parse(JSON.stringify(value));
const chapterCounts=[50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
assert.equal(model.books().length,66);assert.deepEqual(plain(model.books().map(book=>book.chapterCount)),chapterCounts);
assert.equal(model.books().filter(book=>book.testament==='OT').length,39);assert.equal(model.books().filter(book=>book.testament==='NT').length,27);
assert.equal(data.meta.chapterCount,1189);assert.equal(data.meta.verseCount,31103);
assert.equal(data.meta.license,'Public domain');assert.match(data.meta.sourceUrl,/^https:\/\/ebible\.org\//);assert.match(data.meta.sourceSha256,/^[a-f0-9]{64}$/);
const canonical=data.books.flatMap(book=>book.chapters.flatMap(ch=>ch.verses.map(v=>`${book.id}.${ch.number}.${v.number}\t${v.text}`))).join('\n');
assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'),data.meta.textSha256,'Full-text artifact integrity');
assert.equal(model.verse('Genesis',1,1).text,'In the beginning, God created the heavens and the earth.');
assert.match(model.verse('Revelation',22,21).text,/grace.*Jesus/i);
assert.equal(model.chapter('Psalms',23).headings.find(h=>h.kind==='superscription').text,'A Psalm by David.');
assert.ok(model.chapter('Psalms',23).headings.some(h=>h.annotations.some(a=>a.personIds.includes('david'))));
assert.equal(model.verse('Luke',17,36).text,'');assert.ok(model.verse('Luke',17,36).notes.length,'Numbered textual variants retain the source explanation');
assert.match(model.verse('Song of Solomon',1,4).text,/Friends.*Beloved/,'Mid-verse source speaker labels remain in position');
assert.equal(model.chapter('unknown',1),null);assert.equal(model.chapter('Genesis',51),null);assert.equal(model.verse('Genesis',1,100),null);
assert.deepEqual(plain(model.reference('1 John 2:1-3')),{bookId:'1JN',chapter:2,verse:1,endVerse:3});
assert.deepEqual(plain(model.reference('Psalm 23')),{bookId:'PSA',chapter:23,verse:1,endVerse:1});
assert.equal(model.reference('Genesis 0:1'),null);assert.equal(model.reference('Unknown 1:1'),null);
for(const label of ['John 3:999','John 3:16-999','John 3:20-16','John 99:1','John 3:0'])assert.equal(model.reference(label),null,'Reject nonexistent verses and invalid ranges');
assert.equal(model.reference({book:'Jhn',chapter:3,verse:999}),null);
assert.equal(model.search('FOR GOD, SO LOVED THE WORLD!!!').results[0].verse,16);
assert.equal(model.search('FOR GOD, SO LOVED THE WORLD!!!').results[0].bookId,'JHN');
assert.equal(model.search('for God so loved the world',{testament:'OT'}).total,0);
assert.ok(model.search('A Psalm by David',{bookId:'PSA'}).total>0,'Superscriptions are searchable');
assert.equal(model.search('   ').total,0);assert.equal(model.search('God',{bookId:'missing'}).total,0);
const page1=model.search('Jesus',{limit:5}),page2=model.search('Jesus',{limit:5,offset:5});
assert.ok(page1.total>10);assert.equal(page1.results.length,5);assert.equal(page1.total,page2.total);
assert.notDeepEqual(plain(page1.results),plain(page2.results));
assert.deepEqual(plain(model.annotate('MAT',1,16).find(a=>a.text==='Joseph').personIds),['joseph-nt']);
assert.deepEqual(plain(model.annotate('GEN',37,2).find(a=>a.text==='Joseph').personIds),['joseph']);
assert.ok(model.annotate('MAT',2,1).find(a=>a.text==='Bethlehem').placeIds.length);
assert.equal(model.annotate('MAT',2,1).find(a=>a.text==='Bethlehem').match,'verse');
assert.ok(!model.annotate('MAT',2,2).some(a=>a.text==='Jews'),'A demonym must not become an individual-person link');

const fixture={meta:{},books:[{id:'GEN',name:'Genesis',testament:'OT',chapters:[{number:1,headings:[],verses:[
  {number:1,text:'Mary met Mary Magdalene beside Bethlehem. Mary’s son was named Mark.'},
  {number:2,text:'On that day, So said to Mark: Do this job. Asha met Ash and a mark.'},
  {number:3,text:'Mara and Jerusalem.'},
  {number:4,text:'Haran waited in Haran.'},
  {number:5,text:'Anna went to Salem.'},
  {number:6,text:'Mary Magdalene met Mary.'}
]}]}]};
const p=(id,name,refs=[],aliases=[])=>({id,name,refs:refs.map(verse=>({label:`Genesis 1:${verse}`})),aliases});
const fixturePeople={people:[p('mary-a','Mary',[1,3,6],['Mara']),p('mary-b','Mary',[1]),p('magdalene','Mary Magdalene',[1]),p('mark','Mark',[1]),p('on','On'),p('so','So'),p('job','Job'),p('ash','Ash'),p('haran','Haran',[4]),p('anna-a','Anna'),p('anna-b','Anna')]};
const fixturePlaces={places:[p('bethlehem','Bethlehem',[1]),p('city-haran','Haran',[4]),{...p('jerusalem','Jerusalem',[3,5],['Salem']),nameForms:[{name:'Jerusalem',refs:['Genesis 1:3']},{name:'Salem',refs:['Genesis 1:5']}]}]};
const sample=new Model(fixture,fixturePeople,fixturePlaces),first=sample.annotate('GEN',1,1);
assert.deepEqual(plain(first.find(a=>a.text==='Mary').personIds),['mary-a','mary-b']);assert.equal(first.find(a=>a.text==='Mary').ambiguous,true);
assert.deepEqual(plain(first.find(a=>a.text==='Mary Magdalene').personIds),['magdalene'],'Prefer a complete indexed proper name');
assert.ok(first.find(a=>a.text==='Mark'));assert.equal(first.find(a=>a.text==='Bethlehem').kind,'place');
assert.deepEqual(plain(sample.annotate('GEN',1,2).map(a=>a.text)),['Ash'],'No substring, lowercase, or ordinary-word fallback links');
assert.deepEqual(plain(sample.annotate('GEN',1,3).find(a=>a.text==='Mara').personIds),['mary-a'],'Translation aliases retain verse identity');
const mixed=sample.annotate('GEN',1,4)[0];assert.equal(mixed.kind,'entity');assert.deepEqual(plain(mixed.personIds),['haran']);assert.deepEqual(plain(mixed.placeIds),['city-haran']);
const possible=sample.annotate('GEN',1,5).find(a=>a.text==='Anna');assert.equal(possible.match,'name');assert.equal(possible.ambiguous,true);assert.equal(possible.personIds.length,2);
assert.equal(sample.annotate('GEN',1,5).find(a=>a.text==='Salem').match,'verse');
assert.equal(sample.annotate('GEN',1,6)[0].text,'Mary','A longer spelling-only alias must not override an indexed identity');

const bridge=new Model({meta:{language:'nl',editionId:'catholic-nl'},books:[{id:'PSA',name:'Psalmen',testament:'OT',chapters:[{number:84,verses:[
  {number:8,text:'Voorafgaande tekst.'},
  {number:9,endNumber:10,numberLabel:'9–10',text:'Maria in een samengevoegd bronvers.'},
  {number:11,text:'Volgende tekst.'}
]}]}]},{people:[{id:'bridge-person',name:'Maria',refs:[{edition:'catholic-nl',book:'PSA',chapter:84,verse:10}]}]});
assert.equal(bridge.verse('PSA',84,10),bridge.verse('PSA',84,9),'Both verse numbers resolve to one source text');
assert.deepEqual(plain(bridge.reference('Psalmen 84:10')),{bookId:'PSA',chapter:84,verse:9,endVerse:10});
assert.deepEqual(plain(bridge.reference({book:'PSA',chapter:84,verse:10,endVerse:11})),{bookId:'PSA',chapter:84,verse:9,endVerse:11});
assert.equal(bridge.reference('Psalmen 84:12'),null);
assert.equal(bridge.search('samengevoegd').total,1,'A verse bridge is searched once');
assert.equal(bridge.search('samengevoegd').results[0].numberLabel,'9–10');
assert.equal(bridge.chapter('PSA',84).verses.length,3,'Do not duplicate the bridge in chapter rendering');
assert.equal(bridge.annotate('PSA',84,9)[0].match,'verse','Explicit edition references to the second bridge number annotate the displayed row');

const personIds=new Set(people.people.map(p=>p.id)),placeIds=new Set(places.places.map(p=>p.id));
let total=0,annotations=0;
for(const book of data.books)for(const chapter of book.chapters)for(const verse of chapter.verses){
  total++;const spans=model.annotate(book.id,chapter.number,verse.number);let cursor=0,rebuilt='';
  for(const span of spans){
    annotations++;assert.ok(span.start>=cursor && span.end>span.start && span.end<=verse.text.length);
    assert.equal(verse.text.slice(span.start,span.end),span.text);
    assert.ok(span.personIds.every(id=>personIds.has(id)));assert.ok(span.placeIds.every(id=>placeIds.has(id)));
    assert.ok(span.personIds.length+span.placeIds.length>0);
    rebuilt+=verse.text.slice(cursor,span.start)+span.text;cursor=span.end;
  }
  rebuilt+=verse.text.slice(cursor);assert.equal(rebuilt,verse.text,'Annotations must never alter or drop the text');
  assert.ok(verse.text || verse.notes?.length,'Every numbered verse retains text or its source textual-variant note');
}
assert.equal(total,31103);
console.log(`Scripture passed: 66 books, 1,189 chapters, ${total.toLocaleString()} verse records, ${annotations.toLocaleString()} exact annotation spans; source hash, full-text reconstruction, aliases, ambiguity, places, and search verified.`);
