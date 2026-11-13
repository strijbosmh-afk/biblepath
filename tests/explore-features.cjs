'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,'dist',name),'utf8'));
const {TimelineModel,AtlasExplore,date,findReflections}=require('../dist/explore-features.js');
const timeline=read('timeline-events.json'),challenges=read('reflection-challenges.json'),topics=read('scripture-topics.json');
const catholic=read('catholic-bible-data-nl.json'),tanakh=read('tanakh-data.json'),quran=read('quran-data.json');
function validatePassage(p,tradition){
 assert.equal(p.tradition,tradition);assert(Number.isInteger(p.chapter)&&p.chapter>0);assert(Number.isInteger(p.verse)&&p.verse>0);assert((p.endVerse||p.verse)>=p.verse);
 let verses;if(tradition==='islam'){assert.equal(p.edition,'nl');assert.equal(p.chapter,1);verses=quran.surahs.find(s=>String(s.number)===p.book)?.ayahs;}
 else {assert.equal(p.edition,tradition==='christianity'?'catholic-nl':'he');const books=tradition==='christianity'?catholic.books:tanakh.editions.he.books;verses=books.find(b=>b.id===p.book)?.chapters.find(c=>c.number===p.chapter)?.verses;}
 assert(verses?.some(v=>v.number===p.verse),`Missing passage start ${JSON.stringify(p)}`);assert(verses.some(v=>v.number===(p.endVerse||p.verse)),`Missing passage end ${JSON.stringify(p)}`);
}
function sources(entries){assert(entries.length,'A source is required');for(const s of entries){assert(s.title?.trim());const u=new URL(s.url);assert.equal(u.protocol,'https:');assert(!u.username&&!u.password);}}
const ids=new Set();let passages=0,totalEvents=0,totalChallenges=0;
for(const tradition of ['christianity','judaism','islam']){
 const events=timeline.traditions[tradition];assert(events.length>=30,`${tradition} requires a substantial historical selection`);
 for(const e of events){assert(!ids.has(e.id));ids.add(e.id);assert(e.id.startsWith(tradition+':'));assert(Number.isInteger(e.start)&&e.start!==0);if(e.end!==undefined)assert(e.end>=e.start&&e.end!==0);assert(['history','tradition','text'].includes(e.kind));assert(e.title?.trim()&&e.summary?.trim()&&e.context?.trim()&&e.dateLabel?.trim());sources(e.sources);if(e.passage){validatePassage(e.passage,tradition);passages++;}totalEvents++;}
 for(const e of timeline.undated[tradition]){assert(!('start' in e));assert.equal(e.kind,'tradition');sources(e.sources);if(e.passage){validatePassage(e.passage,tradition);passages++;}}
 const model=new TimelineModel(events),overview=model.visible({width:900}),visibleIds=new Set(overview.flatMap(c=>c.events.map(e=>e.id)));
 assert.equal(visibleIds.size,events.length,'Overview retains every dated event, grouped rather than dropped');
 const expected=events.filter(e=>e.kind==='text').map(e=>e.id).sort();assert.deepEqual(model.visible({width:900,kind:'text'}).flatMap(c=>c.events.map(e=>e.id)).sort(),expected);
 const needle=events[events.length-1].title;assert(model.visible({width:900,filter:needle.toUpperCase()}).some(c=>c.events.some(e=>e.title===needle)),'Search finds offscreen chronological events in overview');
 const entries=challenges.traditions[tradition];assert(entries.length>=(tradition==='christianity'?18:12));assert.equal(new Set(entries.map(e=>e.statement)).size,entries.length,'Challenges need distinct reflection prompts');
 for(const e of entries){assert(e.statementType==='editorial','An editorial prompt must not masquerade as a scripture quotation');assert(e.title?.trim()&&e.context.length>80);assert.equal(e.questions.length,3);assert(e.questions.every(q=>q.length>15));sources(e.sources);validatePassage(e.passage,tradition);passages++;totalChallenges++;}
}
const catholicChallenges=challenges.traditions.christianity;for(const pillar of ['prayer','poor','peace'])assert(catholicChallenges.filter(e=>e.pillar===pillar).length>=6);
for(const entry of catholicChallenges){
 const {book,chapter,verse,endVerse}=entry.passage;
 const corpus=catholic.books.find(b=>b.id===book).chapters.find(c=>c.number===chapter).verses;
 const expected=corpus.filter(v=>v.number>=verse&&v.number<=endVerse).map(({number,text})=>({number,text}));
 assert.deepEqual(entry.verses,expected,'The reflection sheet quotes the exact reader edition');
}
assert.equal(findReflections(catholicChallenges,'Ik voel me eenzaam')[0].id,'christianity:eenzaamheid');
assert.equal(findReflections(catholicChallenges,'VERGÉVING')[0].id,'christianity:vergeven');
assert.equal(findReflections(catholicChallenges,'vergeven')[0].id,'christianity:vergeven');
assert(findReflections(catholicChallenges,'vrede').length>1,'Related reflections remain selectable');
assert.deepEqual(findReflections(catholicChallenges,'astrofysica'),[]);
assert.deepEqual(findReflections(catholicChallenges,'Ik zoek een reflectie'),[]);
const matchingTopics=query=>findReflections(catholicChallenges,query).map(entry=>entry.topic);
assert.deepEqual(matchingTopics('hoop OF rouw'),['Hoop','Rouw']);
assert.deepEqual(matchingTopics('HOOP or rouw AND NOT verdriet'),['Hoop'],'NOT and AND bind before OR');
assert.deepEqual(matchingTopics('(hoop OF rouw) EN NIET verdriet'),['Hoop']);
assert.deepEqual(matchingTopics('vrede EN oorlog'),['Vrede']);
assert.deepEqual(matchingTopics('vrede EN NIET oorlog'),['Verzoening']);
assert.deepEqual(matchingTopics('NIET (hoop OR rouw)').filter(topic=>['Hoop','Rouw'].includes(topic)),[]);
assert.deepEqual(matchingTopics('Ik voel me eenzaam OF ik zoek hoop'),['Eenzaamheid','Hoop']);
for(const invalid of ['hoop EN','OF hoop','(vrede OF hoop','hoop)','hoop OF OF vrede','NIET','()']){
 assert.throws(()=>findReflections(catholicChallenges,invalid),SyntaxError,invalid);
}
assert.equal(date(-586),'586 v.Chr.');assert.equal(date(622),'622 n.Chr.');
assert(topics.topics.length>=25);assert.equal(new Set(topics.topics.map(t=>t.id)).size,topics.topics.length);
for(const topic of topics.topics){assert(topic.label&&topic.synonyms.length);for(const tradition of ['christianity','judaism','islam'])assert(topic.passages.some(p=>p.tradition===tradition));for(const p of topic.passages){validatePassage(p,p.tradition);passages++;}}
// A dense history should render only a bounded number of cards, independently of data size.
const dense=new TimelineModel(Array.from({length:50000},(_,i)=>({id:String(i),start:i-25000,title:'Moment '+i,summary:'',context:'',category:'',kind:'history'})));
for(const scroll of [0,120000,499000]){const clusters=dense.visible({width:1000,zoom:500,scroll});assert(clusters.length<=12,'Only viewport clusters should be materialized');assert(clusters.every(c=>c.x>=scroll-250&&c.x<=scroll+1250));}
const sample={id:'bce',start:-586,title:'Één geschiedenis',kind:'history',summary:'',context:'',category:''};assert.equal(new TimelineModel([sample]).visible({width:390,filter:'EEN'})[0].events[0].id,'bce');
const view=Object.create(AtlasExplore.prototype);view.states=new Map();view.view='challenge';view.tradition='christianity';view.data=challenges;view.state.pillar='peace';assert(view.challenges().every(e=>e.pillar==='peace'));
view.tradition='judaism';assert.equal(view.state.pillar,'all','Religion state remains separate');view.state.topic=challenges.traditions.judaism[0].topic;assert(view.challenges().every(e=>e.topic===view.state.topic));view.tradition='christianity';assert.equal(view.state.pillar,'peace');
const printButton={dataset:{action:'print-reflection'}};
const status={focus(){}};
view.el={innerHTML:'',hidden:false,contains:()=>true,querySelector(selector){return selector==='#reflection-result'?status:selector==='#reflection-sheet'&&this.innerHTML.includes('id="reflection-sheet"')?{}:null;}};
let printed=0;
global.print=()=>printed++;
const clickPrint=()=>view.click({target:{closest:()=>printButton}});
view.submit({target:{id:'reflection-form',elements:{namedItem:()=>({value:'eenzaam'})}},preventDefault(){}});
assert.match(view.el.innerHTML,/Iemand bijstaan/);
assert.match(view.el.innerHTML,/Bij mijn eerste verdediging/);
assert.equal(view.passages[0].edition,'catholic-nl');
clickPrint();
assert.equal(printed,1);
view.selectReflection('<img src=x onerror=alert(1)>');
assert(!view.el.innerHTML.includes('<img'));
assert(!view.el.innerHTML.includes('id="reflection-sheet"'));
clickPrint();
assert.equal(printed,1,'An empty search result cannot print a previous reflection');
view.selectReflection('hoop OF');
assert.match(view.el.innerHTML,/aria-invalid="true"/);
assert.match(view.el.innerHTML,/Voeg een zoekwoord toe na de operator/);
assert(!view.el.innerHTML.includes('id="reflection-sheet"'));
delete global.print;
const malicious='<img src=x onerror=alert(1)> Vrede & hoop';assert(!view.highlight(malicious,'vrede').includes('<img'));assert(view.highlight(malicious,'vrede').includes('<mark>Vrede</mark>'));assert(view.highlight(malicious,'vrede').includes('&amp;'));
assert(!view.sources([{title:'attack',url:'javascript:alert(1)'}]).includes('javascript:'));assert(view.sources([{title:'<script>',url:'https://example.org/'}]).includes('&lt;script&gt;'));
console.log(`Exploration passed: ${totalEvents} dated events, ${totalChallenges} distinct sourced challenges, ${topics.topics.length} themes, ${passages} corpus-validated passage ranges, BCE dates, separate religion state, safe rendering and bounded timeline virtualization.`);
