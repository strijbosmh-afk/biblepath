'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const {PersonProfileModel,safe}=require('../dist/person-profile.js'),{AtlasSearchModel}=require('../dist/atlas-search.js'),core=require('../dist/scripture-search-core.js');
const read=f=>JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../dist',f+'.json'),'utf8'));
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/data.js'),'utf8'),ctx);const data=ctx.window.BIBLE_DATA;
const original=JSON.stringify(data),supplement=read('catholic-people'),comparisons=read('person-comparisons');
const catholic=new PersonProfileModel('christianity',{base:data.people,supplement,comparisons,places:read('places-data')});catholic.relationships=data.relationships;
const abraham=catholic.get('abraham');assert(abraham.refs.some(r=>r.label.startsWith('Genesis ')));assert(abraham.refs.some(r=>r.book==='SIR'));assert(abraham.refs.slice(0,24).some(r=>r.book==='SIR'),'Supplement appears before the long concordance');assert(abraham.summaries.length>=2);assert(abraham.relations.length);assert(abraham.places.length);assert(abraham.account);
assert.equal(catholic.get('catholic:abraham').id,'abraham');assert.equal(catholic.get('quran:ibrahim'),null);assert.equal(catholic.get('torah:abraham'),null);
for(const p of supplement.people){const merged=catholic.get(p.id);assert(merged,p.id);for(const r of p.refs)assert(merged.refs.includes(r),'Every supplemental citation survives');if(p.bibleId){assert.equal(merged.id,p.bibleId);const base=data.people.find(b=>b.id===p.bibleId);for(const r of base.refs)assert(merged.refs.includes(r));}}
for(const religion of ['judaism','islam']){
 const collection=read(religion==='judaism'?'torah-people':'quran-people'),atlas=read('tradition-atlas-'+religion),model=new PersonProfileModel(religion,{collection,atlas,comparisons});
 for(const p of collection.people){const profile=model.get(p.id);assert.equal(profile.id,p.id);assert.equal(profile.tradition,religion);for(const r of p.refs)assert(profile.refs.includes(r));}
 for(const p of atlas.people){const profile=model.get(p.id);assert(profile);assert.equal(profile.id,p.indexId||p.id);for(const r of p.refs)assert(profile.refs.includes(r));for(const r of profile.relations)assert(model.get(r.otherId),'Related identity remains inside the same collection');}
 assert.equal(model.get('abraham'),null,'No implicit cross-religion merging');
}
assert.equal(JSON.stringify(data),original,'Profile consolidation never mutates the graph or its source citations');assert.equal(safe('javascript:alert(1)'),'#');assert.equal(safe('https://example.org/a'),'https://example.org/a');
const index=new AtlasSearchModel();index.add('christianity','people','abraham','Abraham','Sirach en Genesis',['Abram']);index.add('judaism','people','torah:abraham','Avraham','Verbond',['Abraham']);index.add('islam','people','quran:ibrahim','Ibrahim','Profeet',['Abraham','إبراهيم']);index.add('judaism','places','jerusalem','Jeruzalem','Stad');index.add('islam','topics','peace','Vrede','Vrede',['salaam']);
assert.equal(index.search('ABRAHAM').length,3);assert.equal(index.search('abraham',{traditions:['islam']})[0].id,'quran:ibrahim');assert.equal(index.search('abraham',{traditions:[]}).length,0);assert.equal(index.search('abraham',{type:'places'}).length,0);assert.equal(index.search('Jeruzalem',{type:'places'}).length,1);assert.equal(index.search('salaam')[0].type,'topics');index.add('christianity','people','abraham','Abraham','Updated');assert.equal(index.search('Abraham').length,3,'Reindexing preserves a single identity');assert.deepEqual(index.search('   '),[]);
for(const [id,query,book,chapter,verse,endVerse] of [['christianity','Johannes 3:16','JHN',3,16,16],['christianity','Daniël 13:1–3','DAN',13,1,3],['judaism','Genesis 1:1','GEN',1,1,1],['islam','Koran 2:255','2',1,255,255],['islam','2:255-256','2',1,255,256]]){
 const corpus=read('search-index-'+id),result=core.search(corpus,query,[]);assert.equal(result.total,1,query);assert.deepEqual([result.results[0].book,result.results[0].chapter,result.results[0].verse,result.results[0].endVerse],[book,chapter,verse,endVerse]);assert.equal(result.results[0].edition,corpus.edition);
 assert.equal(core.search(corpus,query,[],{offset:1}).results.length,0,'Reference search honors pagination');
}
const start=performance.now();for(let i=0;i<500;i++)index.search('abraham');console.log('Workspace models passed: explicit identities, Catholic consolidation, all religious profiles and original references, safe sources, independent search filters and exact edition-bound reference search.');
