'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,'dist',name+'.json'),'utf8'));
const {FestivalCollection}=require('../dist/festivals.js');
const context={window:{}};for(const file of ['scripture.js','sacred-library.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const models={christianity:new context.window.BibleScripture(read('catholic-bible-data-nl')),judaism:new context.window.SacredLibrary('judaism',read('tanakh-data')),islam:new context.window.SacredLibrary('islam',read('quran-data'))};
const expected={christianity:7,judaism:8,islam:7},ids=new Set();let references=0,passages=0;
const localized=(obj,label)=>{for(const lang of ['nl','en','fr'])assert(typeof obj?.[lang]==='string'&&obj[lang].trim().length>0,`${label}: missing ${lang}`);};
for(const [tradition,count] of Object.entries(expected)){
  const data=read('festivals-'+tradition),collection=new FestivalCollection(data);
  assert.equal(collection.entries.length,count);assert.equal(collection.tradition,tradition);localized(data.meta.scope,tradition+' scope');
  for(const e of collection.entries){
    assert(!ids.has(e.id));ids.add(e.id);assert(Number.isInteger(e.order));
    localized(e.title,e.id+' title');localized(e.summary,e.id+' summary');localized(e.calendar.text,e.id+' calendar');
    assert.deepEqual(e.sections.map(s=>s.id).sort(),['diversity','history','meaning','practice']);assert.equal(e.questions.length,3);
    for(const s of e.sections)localized(s.text,e.id+' '+s.id);
    for(const q of e.questions)localized(q.question,e.id+' question');
    for(const s of [e.calendar,...e.sections,...e.questions]){assert(s.sourceIds.length>0,`${e.id} has unsourced material`);assert.equal(new Set(s.sourceIds).size,s.sourceIds.length);}
    assert(e.references.some(r=>r.kind==='scripture'||r.kind==='tradition'),e.id+' must have textual sources');
    for(const r of e.references){
      references++;localized(r.label,e.id+' source label');localized(r.context,e.id+' source context');assert.equal(new URL(r.url).protocol,'https:');
      if(!r.passage)continue;
      passages++;const p=r.passage;assert.equal(p.tradition,tradition,`${e.id} internal reader must retain religious context`);
      assert.equal(p.edition,{christianity:'catholic-nl',judaism:'he',islam:'nl'}[tradition]);
      assert(Number.isInteger(p.verse)&&p.verse>0);assert(Number.isInteger(p.endVerse)&&p.endVerse>=p.verse);
      const model=models[tradition];
      if(tradition==='christianity'){
        const ref=model.reference(p);assert(ref,`${e.id} ${r.id} start must exist`);
        const book=read('catholic-bible-data-nl').books.find(b=>b.id===p.book),chapter=book?.chapters.find(c=>c.number===p.chapter);
        for(let n=p.verse;n<=p.endVerse;n++)assert(chapter?.verses.some(v=>v.number===n||v.locators?.includes(n)),`${e.id} ${r.id}: missing Dutch Catholic verse ${n}`);
      }else{
        const label=tradition==='judaism'?`${p.book} ${p.chapter}:${p.verse}-${p.endVerse}`:`${p.surah}:${p.verse}-${p.endVerse}`;
        assert(model.reference(label,p.edition,'nl'),`${e.id} ${r.id}: invalid edition-specific passage ${label}`);
      }
    }
  }
}
const jewish=read('festivals-judaism'),islam=read('festivals-islam');
const hanukkah=jewish.entries.find(e=>/hanukkah|chanuk/i.test(e.id));assert(hanukkah,'Hanukkah dossier');
assert(hanukkah.references.some(r=>r.kind!=='scripture'),'Hanukkah needs sources beyond the Hebrew Bible');
const maw = islam.entries.find(e=>e.id.includes('mawlid'));assert(maw,'Mawlid dossier');assert(maw.sections.find(s=>s.id==='diversity').sourceIds.length>=2,'Mawlid diversity needs differing sourced perspectives');
console.log(`Festival data passed: ${ids.size} distinct dossiers, 66 trilingual critical questions, ${references} attributed sources, ${passages} edition-validated internal passages.`);
