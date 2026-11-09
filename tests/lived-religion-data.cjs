const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {LifeCollection,safe}=require('../dist/lived-religion.js');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/'+n+'.json'),'utf8'));
const context={window:{}};for(const f of ['scripture.js','sacred-library.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/'+f),'utf8'),context);
const corpora={christianity:read('catholic-bible-data-nl'),judaism:read('tanakh-data'),islam:read('quran-data')};
const models={christianity:new context.window.BibleScripture(corpora.christianity),judaism:new context.window.SacredLibrary('judaism',corpora.judaism),islam:new context.window.SacredLibrary('islam',corpora.islam)};
const all=new Set();let refs=0,passages=0;
for(const religion of Object.keys(models)){
 const data=read('lived-'+religion),model=new LifeCollection(data);assert.equal(model.tradition,religion);assert.equal(data.entries.length,9);
 for(const section of ['prayer','dignity','peace']){assert.equal(model.search(section).length,3);assert(data.meta.sections[section].intro.length>70);assert(model.tags(section).length>=2);}
 for(const e of data.entries){
  assert(!all.has(e.id));all.add(e.id);assert(e.id.startsWith(religion+':life:'));assert.equal(e.tradition,religion);assert.equal(e.questions,undefined);assert(e.blocks.length>=3);assert(e.practice.items.length>=3);
  const ids=e.sources.map(s=>s.id);assert.equal(ids.length,new Set(ids).size);assert(ids.length>=2);
  for(const block of [...e.blocks,e.practice,...(e.process||[])]){assert(block.sourceIds.length);for(const id of block.sourceIds)assert(ids.includes(id),e.id+' invalid citation '+id);}
  for(const s of e.sources){refs++;assert(s.label&&s.context);assert.notEqual(safe(s.url),'#');assert(['scripture','tradition','practice','historical'].includes(s.kind));if(!s.passage)continue;passages++;
   const p=s.passage;assert.equal(p.tradition,religion);assert.equal(p.edition,{christianity:'catholic-nl',judaism:'he',islam:'nl'}[religion]);assert(p.endVerse>=p.verse&&p.verse>0);
   if(religion==='christianity'){
    assert(models[religion].reference(p),e.id+' start');const chapter=corpora.christianity.books.find(b=>b.id===p.book)?.chapters.find(c=>c.number===p.chapter);
    for(let n=p.verse;n<=p.endVerse;n++)assert(chapter?.verses.some(v=>v.number===n||v.locators?.includes(n)),e.id+' missing Dutch verse '+n);
   }else{const label=religion==='judaism'?`${p.book} ${p.chapter}:${p.verse}-${p.endVerse}`:`${p.surah}:${p.verse}-${p.endVerse}`;const result=models[religion].reference(label,p.edition,'nl');assert(result,e.id+' missing reference '+label);}
  }
  if(e.eventId){const timeline=read('timeline-events').traditions[religion].find(v=>v.id===e.eventId);assert(timeline,e.id+' timeline event');assert.equal(timeline.lifeEntry?.id,e.id);assert(e.location&&Number.isFinite(e.location.lat)&&Number.isFinite(e.location.lng));}
  if(e.section==='peace'){assert(e.actors.length>=2);assert(e.process.length);assert(e.sources.some(s=>s.kind==='historical'||s.kind==='tradition'||e.id.endsWith('sulh')));}
 }
}
assert.throws(()=>new LifeCollection({meta:{tradition:'judaism'},entries:[read('lived-islam').entries[0]]}),/identity/);
assert.equal(safe('javascript:alert(1)'),'#');assert.equal(safe('https://name:password@example.com'),'#');
const islam=new LifeCollection(read('lived-islam'));assert(islam.search('prayer','dua').some(e=>e.title.includes('Du’a')));assert.equal(islam.search('peace','no-result-word').length,0);
console.log(`Lived religion data passed: ${all.size} separate dossiers, nine collections, ${refs} sourced references, ${passages} edition-validated scripture routes, complete citation targets and scoped search.`);
