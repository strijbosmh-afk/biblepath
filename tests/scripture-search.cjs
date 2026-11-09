'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,'dist',name),'utf8'));
const C=require('../dist/scripture-search-core.js'),{build,previews}=require('../scripts/build-scripture-search.cjs'),topics=read('scripture-topics.json').topics;
const data={christianity:read('catholic-bible-data-nl.json'),judaism:read('tanakh-data.json'),islam:read('quran-data.json')},indexes={};
for(const tradition of Object.keys(data)){
 const corpus=data[tradition],index=indexes[tradition]=build(tradition,topics),expected=[];
 if(tradition==='islam')for(const s of corpus.surahs)for(const v of s.ayahs)expected.push([String(s.number),1,v.number,v.translations.nl]);
 else for(const b of (tradition==='judaism'?corpus.editions.nl.books:corpus.books))for(const ch of b.chapters)for(const v of ch.verses)expected.push([b.id,ch.number,v.number,v.text]);
 const full=index.rows.filter(r=>r[4]===index.edition);assert.equal(full.length,expected.length,'Every original numbered text record is searchable');
 for(let i=0;i<expected.length;i++)assert.deepEqual(full[i].slice(0,4),expected[i],'The search preview must preserve source wording exactly');
 assert(index.credits&&index.sourceSha256.length===64);assert(C.search(index,'zzzz-no-such-word',topics).total===0);assert(C.search(index,'',topics).total===0);
 const t=topics.find(t=>t.passages.some(p=>p.tradition===tradition)),p=t.passages.find(p=>p.tradition===tradition),thematic=C.search(index,t.label,topics,{mode:'theme',topicId:t.id});assert(thematic.results.some(r=>r.book===p.book&&r.chapter===p.chapter&&r.verse===p.verse&&r.edition===p.edition));assert(thematic.results.every(r=>r.tradition===tradition&&r.topics.length));
 for(const t of topics)for(const p of t.passages.filter(p=>p.tradition===tradition))assert(index.locations[C.key(p)]!==undefined,`Missing themed range ${t.id} ${JSON.stringify(p)}`);
}
assert(indexes.judaism.rows.some(r=>r[4]==='he'),'Hebrew curated passages remain separate from Dutch translation-aid text');assert(indexes.judaism.rows.some(r=>r[4]==='nl'));
assert.equal(indexes.islam.rows.length,6236);assert.equal(indexes.christianity.rows.length,35510);
assert.equal(C.fold('ÉÉN'),'een');assert.deepEqual(C.terms('De VREDE, één en barmhartigheid!'),['vrede','barmhartigheid']);
assert.doesNotThrow(()=>C.search(indexes.christianity,'constructor',topics),'User words cannot access inherited posting properties');
const small={tradition:'christianity',edition:'catholic-nl',rows:[['MAT',1,1,'Vrede en hoop','catholic-nl'],['MAT',1,2,'Vrede alleen','catholic-nl'],['MAT',1,3,'Hoop alleen','catholic-nl']],locations:{},postings:{vrede:[0,1],hoop:[0,2],alleen:[1,2]}};
assert.deepEqual(C.search(small,'VREDE hoop',[],{mode:'text'}).results.map(r=>r.id),[0],'All meaningful query words must occur in a literal hit');assert(C.search(small,'vrede afwezig',[],{mode:'text'}).total===0);
// The real worker is executed against in-memory corpus indexes, exercising pagination and caching.
const requests=[],pending=[],messages=[];let deliver;
const quick=previews(indexes,topics);
for(const theme of topics)for(const faith of Object.keys(indexes)){
 const identity=r=>`${r.edition}:${r.book}:${r.chapter}:${r.verse}:${r.endVerse}`;
 const preview=C.search(quick.traditions[faith],theme.label,topics,{mode:'theme',topicId:theme.id,limit:1000});
 const complete=C.search(indexes[faith],theme.label,topics,{mode:'all',topicId:theme.id,limit:1000});
 assert.deepEqual(complete.results.slice(0,preview.results.length).map(identity),preview.results.map(identity),'Thematic cards must not change order when slower text indexes arrive');
}
const context={console,URL,Map,Set,Math,Promise,ScriptureSearchCore:C,importScripts(){},fetch:async file=>{requests.push(file);return {ok:true,json:async()=>file==='scripture-topics.json'?{topics}:file==='scripture-topic-preview.json'?quick:indexes[file.match(/^search-index-(.+)\.json$/)[1]]};},self:{postMessage(message){messages.push(message);if(deliver){const done=deliver;deliver=null;done(message)}}}};
context.self.self=context.self;vm.runInNewContext(fs.readFileSync(path.join(root,'dist/scripture-search-worker.js'),'utf8'),context);
async function ask(message){return new Promise(resolve=>{deliver=resolve;context.self.onmessage({data:message})});}
(async()=>{
 const theme=topics[0],early=await ask({id:0,query:theme.label,topicId:theme.id,traditions:['christianity','judaism','islam'],page:0,mode:'theme'});assert(early.results.length>=6);assert.equal(early.partial,false);assert(!requests.some(f=>f.startsWith('search-index-')),'Thematic-only search must work without any full-text index download');
 const query='god',all=C.search(indexes.christianity,query,topics,{mode:'text',limit:100000});assert(all.total>330,'Pagination regression needs more than eleven pages');
 const page=await ask({id:1,query,traditions:['christianity'],page:10,mode:'text'});assert.equal(page.total,all.total);assert.deepEqual(Array.from(page.results,r=>r.id),all.results.slice(300,330).map(r=>r.id),'Page eleven must return results beyond the former 300-row cap');
 const first=await ask({id:2,query,traditions:['christianity','judaism','islam'],page:0,mode:'text'});assert(first.results.some(r=>r.tradition==='judaism'));assert(first.results.some(r=>r.tradition==='islam'));assert.equal(first.total,Object.values(first.totals).reduce((a,b)=>a+b,0));
 const next=await ask({id:3,query,traditions:['christianity','judaism','islam'],page:1,mode:'text'});const identity=r=>`${r.tradition}:${r.edition}:${r.id}`;assert(!next.results.some(r=>first.results.some(a=>identity(a)===identity(r))),'Mixed-religion pages cannot repeat results');
 const fetched=requests.length;await ask({id:4,query:'vrede',traditions:['christianity','judaism','islam'],page:0,mode:'text'});assert.equal(requests.length,fetched,'Changing a query reuses already loaded indexes');
 const empty=await ask({id:5,query,traditions:[],page:0,mode:'text'});assert.equal(empty.total,0);assert.equal(empty.results.length,0);
 for(let i=0;i<topics.length;i++){
  const t=topics[i],before=messages.length;
  await context.self.onmessage({data:{id:100+i,query:t.label,topicId:t.id,traditions:['christianity','judaism','islam'],page:0,mode:'all'}});
  const pair=messages.slice(before),identity=r=>`${r.tradition}:${r.edition}:${r.book}:${r.chapter}:${r.verse}:${r.endVerse}`;
  assert.equal(pair.length,2);assert.equal(pair[0].partial,true);assert.equal(pair[1].partial,false);
  assert.deepEqual(pair[1].results.slice(0,pair[0].results.length).map(identity),pair[0].results.map(identity),`Mixed-religion theme cards must stay in place: ${t.label}`);
 }
 // A combined query must deliver themes even when full-text downloads never finish.
 const earlyContext={console,URL,Map,Set,Math,Promise,ScriptureSearchCore:C,importScripts(){},fetch:async file=>file.startsWith('search-index-')?new Promise(()=>{}):{ok:true,json:async()=>file==='scripture-topics.json'?{topics}:quick},self:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'dist/scripture-search-worker.js'),'utf8'),earlyContext);
 const immediate=await new Promise(resolve=>{earlyContext.self.postMessage=resolve;earlyContext.self.onmessage({data:{id:6,query:theme.label,topicId:theme.id,traditions:['christianity','judaism','islam'],page:0,mode:'all'}})});
 assert.equal(immediate.partial,true);assert(immediate.results.length>=6,'Curated previews must not wait for slow corpus indexes');
 const completed=[],computed=[],coalesced={console,URL,Map,Set,Math,Promise,ScriptureSearchCore:{...C,search(...args){computed.push(args[1]);return C.search(...args)}},importScripts(){},fetch:context.fetch,self:{postMessage:d=>completed.push(d)}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'dist/scripture-search-worker.js'),'utf8'),coalesced);
 await Promise.all([coalesced.self.onmessage({data:{id:20,query:'god',traditions:['christianity'],page:0,mode:'text'}}),coalesced.self.onmessage({data:{id:21,query:'vrede',traditions:['christianity'],page:0,mode:'text'}})]);
 assert.deepEqual(completed.map(d=>d.id),[21]);assert.deepEqual(computed,['vrede'],'A replaced query must not consume CPU after its pending download finishes');
 const view=require('../dist/explore-features.js').AtlasExplore.prototype,stale={id:9,error:'late'};assert.doesNotThrow(()=>view.searchResponse.call({searchId:10,view:'topics',el:{hidden:false}},stale),'A late worker response must be discarded before touching the DOM');
 const counts=Object.fromEntries(Object.entries(indexes).map(([k,v])=>[k,v.rows.length]));console.log('Scripture search passed: '+JSON.stringify(counts)+' preserved verse records; themed Hebrew/Dutch separation, AND matching, no-hits, page 11+, mixed-religion pagination, cache reuse, selection and stale-response guards.');
})().catch(error=>{console.error(error);process.exitCode=1});
