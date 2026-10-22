'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build,parseRefs,BOOKS}=require('../scripts/import-places.cjs');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'dist/places-data.json'),'utf8'));
const byName=name=>data.places.filter(place=>place.name===name);
assert(data.places.length>550,'Broad settlement coverage');
assert.equal(new Set(data.places.map(place=>place.id)).size,data.places.length,'IDs preserve distinct identities');
for(const name of ['Jerusalem','Rome','Nazareth','Cana','Kanah','Capernaum','Bethsaida','Jericho','Samaria','Babylon','Nineveh','Haran','Ephesus','Corinth','Athens','Philippi','Thessalonica','Damascus','Tarsus','Joppa','Caesarea','Antipatris'])assert(byName(name).length,`Missing representative city: ${name}`);
for(const name of ['Bethlehem','Antioch','Ai'])assert.equal(byName(name).length,2,`${name} namesakes stay separate`);
assert.equal(byName('Ramah').length,3);
const bethlehems=byName('Bethlehem');
assert(bethlehems.find(p=>p.refs.some(r=>r.label==='Matthew 2:1')));
assert(bethlehems.find(p=>p.refs.length===1 && p.refs[0].label==='Joshua 19:15'));
assert.deepEqual(byName('Cana')[0].refs.map(r=>r.label),['John 2:1','John 2:11','John 4:46','John 21:2']);
assert.deepEqual(byName('Kanah')[0].refs.map(r=>r.label),['Joshua 19:28']);
for(const name of ['Egypt','Galilee','Judea','Jordan','Red Sea','Mount Sinai','Euphrates','Bether Mountain','Jericho Valley'])assert.equal(byName(name).length,0,`Non-city omitted: ${name}`);
assert(byName('Babylon')[0].notes.some(note=>/symbolic/.test(note)));
assert(byName('Samaria')[0].notes.some(note=>/region/.test(note)));
assert(!byName('Jerusalem')[0].aliases.some(alias=>['Forsaken','Desolate','Married'].includes(alias)));
const bibleFile=path.join(root,'dist/bible-data.json');
const bible=fs.existsSync(bibleFile)?JSON.parse(fs.readFileSync(bibleFile,'utf8')):null;
const bibleRefs=new Set(bible?.books.flatMap(book=>book.chapters.flatMap(chapter=>chapter.verses.map(verse=>`${book.name} ${chapter.number}:${verse.number}`)))||[]);
for(const place of data.places){
  assert.equal(place.kind,'settlement');
  assert(place.refs.length>0);
  assert.equal(place.referenceCount,place.refs.length);
  assert.equal(new Set(place.refs.map(ref=>ref.label)).size,place.refs.length);
  assert.match(place.source.url,new RegExp(`#L${place.source.line}$`));
  assert(!/[<>@]/.test(place.name+place.description+place.aliases.join('')),'No source markup in display fields');
  assert(!('lat' in place || 'lng' in place || 'coordinates' in place),'No invented or imported map coordinates');
  assert(place.classification.sources.length>0);
  for(const source of place.classification.sources){
    assert(source.types.includes('settlement'));
    assert(source.types.every(type=>['settlement','settlement and spring','special'].includes(type)));
    assert.match(source.url,/#L\d+$/);
    if(source.types.includes('special'))assert(place.notes.some(note=>/uncertain/.test(note)));
  }
  for(const ref of place.refs){
    assert(ref.book in BOOKS);
    assert(Number.isInteger(ref.chapter)&&ref.chapter>0);
    assert(Number.isInteger(ref.verse)&&ref.verse>0);
    assert.equal(ref.label,`${BOOKS[ref.book]} ${ref.chapter}:${ref.verse}`);
    assert.equal(ref.provenance,'indexed-name');
    if(bible)assert(bibleRefs.has(ref.label),`${place.name}: ${ref.label} is a numbered reader verse`);
  }
  for(const form of place.nameForms)for(const ref of form.refs)assert(place.refs.some(r=>r.label===ref),'Name forms retain exact verse provenance');
}
assert.deepEqual(parseRefs('Gen.1.1a; Gen.1.1b; Exo.2.3,4b; Psa.56.0; Tob.1.1; Gen.0.1'),['Gen.1.1','Exo.2.3','Exo.2.4']);
const rebuilt=build(fs.readFileSync(path.join(root,'.cache/TIPNR.txt'),'utf8'),fs.readFileSync(path.join(root,'.cache/OpenBible-ancient.jsonl'),'utf8')).data;
assert.deepEqual(rebuilt,data,'Import is deterministic and checked-in data is current');
assert.equal(data.meta.placeCount,data.places.length);
assert.equal(data.meta.referenceCount,data.places.reduce((sum,p)=>sum+p.refs.length,0));
assert.equal(data.meta.sources.length,2);
console.log(`places: ${data.places.length} settlements and ${data.meta.referenceCount} verse references verified${bible?' against the full Bible reader':''}`);
