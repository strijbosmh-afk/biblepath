'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,'dist',name+'.json'),'utf8'));
const {TraditionAtlasModel}=require('../dist/tradition-atlas.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/sacred-library.js'),'utf8'),context);
const models={judaism:new context.window.SacredLibrary('judaism',read('tanakh-data')),islam:new context.window.SacredLibrary('islam',read('quran-data'))};
const localized=(value,label)=>{for(const lang of ['nl','en','fr'])assert(typeof value?.[lang]==='string'&&value[lang].trim(),`${label}: missing ${lang}`);};
let counts={people:0,relationships:0,families:0,places:0,passages:0};
for(const tradition of ['judaism','islam']){
  const data=read('tradition-atlas-'+tradition);new TraditionAtlasModel(data);
  assert.equal(data.meta.tradition,tradition);localized(data.meta.familyScope,tradition);localized(data.meta.placesScope,tradition);
  const ids=new Set(),people=new Map(data.people.map(p=>[p.id,p]));
  const indexIds=new Set(read(tradition==='judaism'?'torah-people':'quran-people').people.map(p=>p.id));
  const corpus=read(tradition==='judaism'?'tanakh-data':'quran-data');
  for(const field of ['people','relationships','families','places']){
    assert(data[field].length>0,`${tradition} ${field} is populated`);counts[field]+=data[field].length;
    for(const record of data[field]){
      assert(record.id.startsWith(tradition+':'),`${record.id} must retain its tradition`);
      assert(!ids.has(record.id),`${record.id} must be unique`);ids.add(record.id);localized(record.summary,record.id);
      assert(!('questions' in record),'Information collections must not contain study questions');
      if(record.name)localized(record.name,record.id);
      if(record.title)localized(record.title,record.id);
      if(record.personIds){assert.equal(new Set(record.personIds).size,record.personIds.length);record.personIds.forEach(id=>assert(people.has(id),`${record.id}: unknown person ${id}`));}
      if(field==='families')continue;
      assert(record.refs?.length,`${record.id} needs evidence`);
      const refIds=new Set();
      for(const ref of record.refs){
        assert(!refIds.has(ref.id),`${record.id}: duplicate reference`);refIds.add(ref.id);localized(ref.label,record.id);
        assert(['scripture','tradition','historical'].includes(ref.kind));assert.equal(new URL(ref.url).protocol,'https:');
        if(!ref.passage)continue;
        counts.passages++;const p=ref.passage;assert.equal(p.tradition,tradition);assert.equal(p.edition,tradition==='judaism'?'he':'nl');
        assert(p.verse>0&&Number.isInteger(p.verse));assert(Number.isInteger(p.endVerse)&&p.endVerse>=p.verse);
        const label=tradition==='judaism'?`${p.book} ${p.chapter}:${p.verse}-${p.endVerse}`:`${p.surah}:${p.verse}-${p.endVerse}`;
        assert(models[tradition].reference(label,p.edition,'nl'),`${record.id}: invalid ${label}`);
        const verses=tradition==='judaism'?corpus.editions.he.books.find(b=>b.id===p.book)?.chapters.find(c=>c.number===p.chapter)?.verses:corpus.surahs.find(s=>s.number===p.surah)?.ayahs;
        for(let verse=p.verse;verse<=p.endVerse;verse++)assert(verses?.some(v=>v.number===verse),`${record.id}: missing ${label} verse ${verse}`);
      }
      if(record.indexId)assert(indexIds.has(record.indexId),`${record.id} points to a missing profile`);
      if(field==='relationships'){
        assert(people.has(record.source)&&people.has(record.target));assert.notEqual(record.source,record.target);
        assert(['parent','spouse','sibling','guardian','adoptive'].includes(record.type));
      }
      if(field==='places'){
        localized(record.historicalContext,record.id);localized(record.locationNote,record.id);
        assert(['city','settlement','region','mountain','sanctuary'].includes(record.kind));
      }
    }
  }
  const edges=new Set();
  for(const r of data.relationships){const ends=['spouse','sibling'].includes(r.type)?[r.source,r.target].sort():[r.source,r.target];const key=[r.type,...ends].join('|');assert(!edges.has(key),'Duplicate relationship '+key);edges.add(key);}
  // Parent-only edges are directional. Spousal or caring relationships never imply descent.
  const visited=new Set(),visiting=new Set();
  function visit(id){assert(!visiting.has(id),`${tradition}: ancestry cycle at ${id}`);if(visited.has(id))return;visiting.add(id);data.relationships.filter(r=>r.type==='parent'&&r.source===id).forEach(r=>visit(r.target));visiting.delete(id);visited.add(id);}
  data.people.forEach(p=>visit(p.id));
  for(const p of data.people)assert(data.families.some(f=>f.personIds.includes(p.id))||(p.indexId&&data.places.some(place=>place.personIds.includes(p.id))),`${p.id}: must be discoverable in a family or place-linked index profile`);
  for(const family of data.families)assert(data.relationships.some(r=>family.personIds.includes(r.source)&&family.personIds.includes(r.target)),`${family.id}: no visible connections`);
}
console.log(`Tradition atlas data passed: ${counts.families} families, ${counts.people} people, ${counts.relationships} sourced relationships, ${counts.places} places and ${counts.passages} edition-checked reading links.`);
