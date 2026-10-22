'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {context,Element}=require('./graph-geometry.cjs');
const root=path.resolve(__dirname,'..');

// Exercise real app navigation and asynchronous loading against a small DOM
// adapter. The rendering classes are boundary doubles; the app's event handlers,
// fetch cache, selected tradition and language sequencing remain real.
class Control extends Element {
  constructor(dataset={}){super('control');this.dataset=dataset;this.handlers=new Map();this.value='';this.hidden=false;this.innerHTML='';this.nodes=new Map();this.classList.add=name=>this.classes.add(name);this.classList.remove=name=>this.classes.delete(name);}
  addEventListener(type,handler){this.handlers.set(type,handler);}
  click(){return this.handlers.get('click')?.({target:this,preventDefault(){}});}
  change(value){this.value=value;return this.handlers.get('change')?.({target:this,preventDefault(){}});}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Control());return this.nodes.get(selector);}
  querySelectorAll(){return [];}
  replaceChildren(...children){super.replaceChildren(...children);this.innerHTML='';}
  close(){}scrollIntoView(){}focus(){}
}
const controls=new Map(),control=selector=>{if(!controls.has(selector))controls.set(selector,new Control());return controls.get(selector);};
const nav=['reader','map','index','compare','cities'].map(view=>new Control({view}));
const traditions=['christianity','judaism','islam'].map(tradition=>new Control({tradition}));
const peopleTraditions=['christianity','judaism','islam'].map(peopleTradition=>new Control({peopleTradition}));
const groups=new Map([
  ['.nav-item',nav],['[data-tradition]',traditions],['[data-people-tradition]',peopleTraditions],
  ['.layout-option',['constellation','lineage','radial'].map(layout=>new Control({layout}))],
  ['.journey',['abraham','david','jesus'].map(person=>new Control({person}))],
  ['.testament',['all','OT','NT'].map(testament=>new Control({testament}))]
]);
context.document.querySelector=control;context.document.querySelectorAll=selector=>groups.get(selector)||[];
context.document.addEventListener=()=>{};context.document.documentElement={lang:'nl'};
context.window.matchMedia=()=>({matches:false});context.window.addEventListener=()=>{};
const I=context.window.BibleI18n={language:'nl',reference:text=>text,t:(text,params={})=>text.replace(/\{(\w+)\}/g,(_,key)=>params[key]??`{${key}}`),localizePeople(){},localizePlaces:data=>data,setLanguage(next){this.language=next;},translateDOM(){},observe(){}};
context.structuredClone=structuredClone;context.URL=URL;
const storage=new Map();context.localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,String(value))};
const timers=new Map();let nextTimer=0;
context.setTimeout=callback=>{timers.set(++nextTimer,callback);return nextTimer;};context.clearTimeout=id=>timers.delete(id);
const requests=[];
context.fetch=file=>new Promise((resolve,reject)=>requests.push({file,resolve,reject,done:false}));
const pending=file=>requests.find(request=>request.file===file&&!request.done);
function respond(file,data,{ok=true}={}){const request=pending(file);assert(request,`Expected a request for ${file}`);request.done=true;request.resolve({ok,json:async()=>data});}
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
const bibleReaders=[],sacredReaders=[],cityReaders=[],peopleIndexes=[],comparisonViews=[];
context.window.BibleScripture=class {constructor(data){this.meta=data.meta;}atlasReference(){return true;}};
context.window.BibleReader=class {
  constructor(el,model,people,places,callbacks){this.el=el;this.model=model;this.selectedModel=model;this.callbacks=callbacks;this.state={location:{bookId:'GEN',chapter:1,verse:null}};el.rendered=`bible:${model.meta.language}`;bibleReaders.push(this);}
  getState(){return structuredClone(this.state);}setState(value){this.state=structuredClone(value);}
  openAtlas(reference){this.state.atlasReference=reference;return true;}
};
context.window.BibleCities=class {constructor(el,places,people,callbacks){this.callbacks=callbacks;this.state={cityId:'jerusalem'};cityReaders.push(this);}getState(){return structuredClone(this.state);}setState(value){this.state=structuredClone(value);}open(id){this.state.cityId=id;}};
context.window.SacredReader=class {
  constructor(el,model){this.el=el;this.model=model;this.state={edition:model.defaultEdition(I.language),location:{unit:model.units()[0].id,chapter:1,verse:null}};this.render();sacredReaders.push(this);}
  render(){this.el.rendered=`${this.model.tradition}:${I.language}`;this.el.innerHTML=`<article>${this.el.rendered}</article>`;}
  getState(){return structuredClone(this.state);}destroy(){this.destroyed=true;}changeLanguage(){this.render();}
};
context.window.PeopleIndexView=class {
  constructor(el,callbacks){this.el=el;this.callbacks=callbacks;this.collectionHistory=[];this.comparisonKeys=[];this.selected=null;this.languageChanges=0;peopleIndexes.push(this);}
  setCollection(data,tradition){this.data=data;this.tradition=tradition;this.collectionHistory.push(tradition);this.selected=null;this.render();}
  setComparisonKeys(keys){this.comparisonKeys=[...keys];}
  open(id){assert(this.data.people.some(person=>person.id===id),`Person ${id} must belong to selected ${this.tradition} collection`);this.selected=id;this.render();}
  changeLanguage(){this.languageChanges++;this.render();}
  render(){this.el.rendered=`people:${this.tradition}:${I.language}`;this.el.innerHTML=`<article>${this.el.rendered}</article>`;}
};
context.window.PeopleComparisonView=class {
  constructor(el,data,callbacks){this.el=el;this.data=data;this.callbacks=callbacks;this.selected=null;this.languageChanges=0;this.render();comparisonViews.push(this);}
  open(key){assert(this.data.people.some(person=>person.key===key),`Comparison ${key} must exist`);this.selected=key;this.render();}
  changeLanguage(){this.languageChanges++;this.render();}
  render(){this.el.rendered=`compare:${I.language}`;this.el.innerHTML=`<article>${this.el.rendered}</article>`;}
};
const tanakh={books:[{id:'GEN',names:{nl:'Genesis',en:'Genesis'},group:'torah',canonicalBook:'Genesis'}],editions:{en:{meta:{language:'en'},books:[{id:'GEN',chapters:[{number:1,verses:[{number:1,text:'In the beginning.'}]}]}]}}};
const quran={editions:{ar:{language:'ar'},nl:{language:'nl'}},surahs:[{number:1,name:'الفاتحة',transliteration:'Al-Fatiha',ayahs:[{number:1,arabic:'بِسْمِ اللَّهِ',translations:{nl:'In naam van God.'}}]}]};
const torahPeople={meta:{tradition:'judaism'},people:[{id:'torah:moses',comparisonKey:'moses'},{id:'torah:abraham',comparisonKey:'abraham'}]};
const quranPeople={meta:{tradition:'islam'},people:[{id:'quran:moses',comparisonKey:'moses'},{id:'quran:abraham',comparisonKey:'abraham'}]};
const comparisons={people:[{key:'moses'},{key:'abraham'}]};
for(const file of ['discovery.js','paths.js','sacred-library.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const snapshot=()=>context.window.biblePath.getState(),selectTradition=name=>traditions.find(button=>button.dataset.tradition===name).click(),selectView=name=>nav.find(button=>button.dataset.view===name).click(),selectPeople=name=>peopleTraditions.find(button=>button.dataset.peopleTradition===name).click();

async function pendingProfileLanguageRegression(){
  // A fresh app is essential: the destination collection must still be loading
  // when the language picker refreshes the current view.
  respond('bible-data-nl.json',{meta:{language:'nl'}});respond('places-data.json',{places:[]});await settle();
  selectView('compare');respond('person-comparisons.json',comparisons);await settle();
  comparisonViews[0].callbacks.onPerson('judaism','torah:moses');
  assert(pending('torah-people.json'),'The linked collection is still loading');
  assert.equal(peopleIndexes.length,0);
  await control('#language-select').change('fr');await settle();
  respond('torah-people.json',torahPeople);await settle();
  assert.equal(snapshot().view,'index');assert.equal(snapshot().peopleTradition,'judaism');
  assert.equal(peopleIndexes[0].selected,'torah:moses','Changing language during the download must retain the requested comparison identity');
  assert.equal(control('#tradition-people-view').rendered,'people:judaism:fr');
  assert.equal(requests.filter(request=>request.file==='torah-people.json').length,1,'Language refresh shares the pending collection download');
}

async function main(){
  assert.equal(snapshot().language,'nl');assert.equal(snapshot().tradition,'christianity');
  assert.equal(snapshot().peopleTradition,'christianity');
  assert(!requests.some(request=>/people|comparisons/.test(request.file)),'People assets are lazy, not downloaded on scripture startup');
  assert(pending('bible-data-nl.json'),'Initial scripture request must use Dutch');
  respond('bible-data-nl.json',{meta:{language:'nl'}});respond('places-data.json',{places:[]});await settle();
  assert.equal(control('#reader-view').hidden,false);assert.equal(control('#sacred-reader-view').hidden,true);
  bibleReaders[0].state.location={bookId:'JHN',chapter:3,verse:16};

  selectTradition('judaism');assert.equal(snapshot().tradition,'judaism');assert(pending('tanakh-data.json'));
  respond('tanakh-data.json',null,{ok:false});await settle();
  assert.match(control('#sacred-reader-view').innerHTML,/library-retry/,'A failed collection exposes a retry control');
  control('#sacred-reader-view').querySelector('button').click();assert(pending('tanakh-data.json'),'Retry must issue a fresh request after a failed download');
  selectTradition('islam');assert.equal(snapshot().tradition,'islam');assert(pending('quran-data.json'));
  respond('quran-data.json',quran);await settle();
  assert.equal(control('#reader-view').hidden,true);assert.equal(control('#sacred-reader-view').hidden,false);
  assert.equal(control('#sacred-reader-view').rendered,'islam:nl');
  respond('tanakh-data.json',tanakh);await settle();
  assert.equal(snapshot().tradition,'islam');assert.equal(control('#sacred-reader-view').rendered,'islam:nl','A late Tanakh response must not replace the selected Qur’an');

  selectTradition('christianity');await settle();
  assert.equal(control('#reader-view').hidden,false);assert.equal(control('#sacred-reader-view').hidden,true);
  assert.deepEqual(bibleReaders.at(-1).getState().location,{bookId:'JHN',chapter:3,verse:16},'Returning to Bible preserves the reading position');
  assert.equal(requests.filter(r=>r.file==='bible-data-nl.json').length,1,'A tradition switch must not reload the Bible unnecessarily');

  selectTradition('judaism');await settle();assert.equal(control('#sacred-reader-view').rendered,'judaism:nl');
  selectView('cities');await settle();assert.equal(control('#sacred-reader-view').hidden,true);assert.equal(control('#cities-view').hidden,false);
  cityReaders.at(-1).callbacks.onPassage('Psalms 51:18');await settle();
  assert.equal(snapshot().tradition,'christianity','A biblical city reference must explicitly select the Bible');
  assert.equal(snapshot().view,'reader');assert.equal(bibleReaders.at(-1).getState().atlasReference,'Psalms 51:18');

  selectTradition('islam');await settle();
  const changed=control('#language-select').change('fr');await settle();
  await changed;await settle();
  assert.equal(snapshot().language,'fr');assert.equal(snapshot().tradition,'islam');assert.equal(control('#sacred-reader-view').rendered,'islam:fr');
  assert.equal(control('#language-select').disabled,false,'Language changes must re-enable the language picker');
  const originalPeopleCount=snapshot().peopleCount,originalRelationships=snapshot().relationshipCount;
  selectView('index');await settle();
  assert.equal(control('#index-view').hidden,false);assert.equal(control('#tradition-people-view').hidden,true);
  assert.equal(control('#people-testament-filters').hidden,false,'Testament filter belongs to the Bible index');
  assert.equal(control('#people-collection-controls').hidden,false);assert.equal(control('#tradition-controls').hidden,true);

  selectPeople('judaism');assert.equal(snapshot().peopleTradition,'judaism');assert(pending('torah-people.json'));
  assert.equal(control('#people-testament-filters').hidden,true,'Torah collection must not inherit Old/New Testament filters');
  assert.equal(snapshot().tradition,'islam','Selecting Torah people must not change the independent scripture tradition');
  selectPeople('islam');assert(pending('quran-people.json'));
  respond('quran-people.json',null,{ok:false});await settle();
  assert.match(control('#tradition-people-view').innerHTML,/library-retry/,'Failed people data offers a retry');
  control('#tradition-people-view').querySelector('button').click();assert(pending('quran-people.json'));
  respond('quran-people.json',quranPeople);await settle();
  assert.equal(peopleIndexes.length,1);assert.equal(peopleIndexes[0].tradition,'islam');
  assert.equal(control('#tradition-people-view').rendered,'people:islam:fr');
  assert.equal(control('#index-view').hidden,true);assert.equal(control('#tradition-people-view').hidden,false);
  assert.equal(control('#people-testament-filters').hidden,true);
  assert(pending('person-comparisons.json'),'Comparison availability loads independently after a people collection');
  respond('torah-people.json',torahPeople);await settle();
  assert.equal(snapshot().peopleTradition,'islam');assert.equal(peopleIndexes[0].tradition,'islam','Late Torah people cannot replace the selected Qur’an index');
  assert.deepEqual(peopleIndexes[0].collectionHistory,['islam']);
  respond('person-comparisons.json',null,{ok:false});await settle();
  assert.equal(control('#tradition-people-view').rendered,'people:islam:fr','Unavailable comparisons must not block or replace a loaded collection');

  selectPeople('judaism');await settle();
  assert.equal(peopleIndexes[0].tradition,'judaism');assert.equal(control('#tradition-people-view').rendered,'people:judaism:fr');
  assert.equal(requests.filter(request=>request.file==='torah-people.json').length,1,'A safely ignored late response remains reusable in its own cache');
  assert.equal(requests.filter(request=>request.file==='quran-people.json').length,2,'Only the failed Quran people request is retried');
  assert.equal(requests.filter(request=>request.file==='quran-data.json').length,1,'People data does not reload or replace scripture data');
  assert.equal(storage.get('biblepath-people-tradition'),'judaism');assert.equal(storage.get('biblepath-tradition'),'islam','Separate selections have separate persisted keys');

  selectView('compare');assert.equal(control('#comparison-view').hidden,false);assert.equal(control('#people-testament-filters').hidden,true);
  assert.equal(control('#people-collection-controls').hidden,true);assert.equal(control('#tradition-people-view').hidden,true);
  assert.equal(requests.filter(request=>request.file==='person-comparisons.json').length,2,'People enhancement and comparison navigation share one in-flight fetch');
  respond('person-comparisons.json',null,{ok:false});await settle();
  assert.match(control('#comparison-view').innerHTML,/library-retry/,'The comparison view can retry a failed source load');
  control('#comparison-view').querySelector('button').click();assert(pending('person-comparisons.json'));
  selectView('cities');await settle();
  respond('person-comparisons.json',comparisons);await settle();
  assert.equal(snapshot().view,'cities');assert.equal(control('#comparison-view').hidden,true,'A late comparison response does not navigate away from another view');
  assert.equal(comparisonViews.length,1);
  selectView('compare');await settle();
  assert.equal(control('#comparison-view').rendered,'compare:fr');assert.equal(comparisonViews.length,1,'Re-entering comparison reuses its renderer and data');
  assert.equal(requests.filter(request=>request.file==='person-comparisons.json').length,3);

  comparisonViews[0].callbacks.onPerson('islam','quran:moses');await settle();
  assert.equal(snapshot().view,'index');assert.equal(snapshot().peopleTradition,'islam');
  assert.equal(peopleIndexes[0].selected,'quran:moses','Islam comparison opens the Quran identity in its own collection');
  assert.equal(control('#people-testament-filters').hidden,true);
  peopleIndexes[0].callbacks.onCompare('moses');await settle();
  assert.equal(snapshot().view,'compare');assert.equal(comparisonViews[0].selected,'moses','Profile comparison callback opens the matching comparison');
  comparisonViews[0].callbacks.onPerson('judaism','torah:moses');await settle();
  assert.equal(snapshot().view,'index');assert.equal(snapshot().peopleTradition,'judaism');
  assert.equal(peopleIndexes[0].selected,'torah:moses','Jewish comparison opens the independent Torah identity');
  assert.equal(snapshot().tradition,'islam');
  assert.deepEqual(peopleIndexes[0].comparisonKeys,['moses','abraham']);
  await control('#language-select').change('nl');await settle();
  assert.equal(peopleIndexes[0].selected,'torah:moses','Language changes retain selected people profiles');
  assert.equal(control('#tradition-people-view').rendered,'people:judaism:nl');
  selectView('compare');await settle();
  assert.equal(control('#comparison-view').rendered,'compare:nl');assert.equal(comparisonViews[0].selected,'moses');
  comparisonViews[0].callbacks.onPerson('christianity','moses');await settle();
  assert.equal(snapshot().view,'map');assert.equal(snapshot().focus,'moses','Christianity comparison routes to the existing Bible person');
  assert.equal(control('#people-testament-filters').hidden,false,'Bible relationship map keeps its own testament filters');
  assert.equal(snapshot().tradition,'islam','Exploring a Bible comparison does not change the reader choice');
  selectPeople('christianity');await settle();
  assert.equal(control('#index-view').hidden,false);assert.equal(control('#tradition-people-view').hidden,true);
  assert.equal(control('#people-testament-filters').hidden,false);
  selectView('reader');await settle();
  assert.equal(control('#sacred-reader-view').rendered,'islam:nl');assert.equal(control('#people-testament-filters').hidden,true);
  assert.equal(snapshot().peopleCount,originalPeopleCount);assert.equal(snapshot().relationshipCount,originalRelationships,'Separate index data never mutates Bible graph identities or edges');
  const pendingProfileCheck=spawnSync(process.execPath,[__filename,'--pending-profile-language'],{encoding:'utf8'});
  assert.equal(pendingProfileCheck.status,0,pendingProfileCheck.stderr||pendingProfileCheck.stdout);
  console.log('Interfaith app passed: Dutch startup, reader and person collection isolation, lazy caches, failed-load retries, late-response guards, independent filters, comparison callbacks, Bible graph routing and language changes.');
}
(process.argv.includes('--pending-profile-language')?pendingProfileLanguageRegression():main()).catch(error=>{console.error(error);process.exitCode=1;});
