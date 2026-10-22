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
  close(){this.open=false;}showModal(){this.open=true;}scrollIntoView(){}focus(){}
}
const controls=new Map(),control=selector=>{if(!controls.has(selector))controls.set(selector,new Control());return controls.get(selector);};
const religions=['christianity','judaism','islam'].map(religion=>new Control({religion}));
const religionMenus=['christianity','judaism','islam'].map(religionMenu=>new Control({religionMenu}));
const nav=['christianity','judaism','islam'].flatMap(navTradition=>['reader','index','festivals','map','cities'].map(view=>new Control({view,navTradition}))).concat(new Control({view:'compare'}));
const traditions=['christianity','judaism','islam'].map(tradition=>new Control({tradition}));
const peopleTraditions=['christianity','judaism','islam'].map(peopleTradition=>new Control({peopleTradition}));
const groups=new Map([
  ['.nav-item',nav],['[data-religion]',religions],['[data-religion-menu]',religionMenus],['[data-tradition]',traditions],['[data-people-tradition]',peopleTraditions],
  ['.layout-option',['constellation','lineage','radial'].map(layout=>new Control({layout}))],
  ['.journey',['abraham','david','jesus'].map(person=>new Control({person}))],
  ['.testament',['all','OT','NT'].map(testament=>new Control({testament}))]
]);
context.document.querySelector=control;context.document.querySelectorAll=selector=>groups.get(selector)||[];
context.document.addEventListener=()=>{};context.document.documentElement={lang:'nl'};
context.window.matchMedia=()=>({matches:false});context.window.addEventListener=()=>{};
const I=context.window.BibleI18n={language:'nl',reference:text=>text,t:(text,params={})=>text.replace(/\{(\w+)\}/g,(_,key)=>params[key]??`{${key}}`),localizePeople(){},localizePlaces:data=>data,setLanguage(next){this.language=next;},translateDOM(){},observe(){}};
context.structuredClone=structuredClone;context.URL=URL;
context.requestAnimationFrame=callback=>callback();
const storage=new Map();context.localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,String(value))};
if(process.argv.includes('--pending-passage-race'))storage.set('biblepath-bible-edition','locale');
if(process.argv.includes('--saved-catholic'))storage.set('biblepath-bible-edition','catholic');
if(process.argv.includes('--saved-religion')){storage.set('biblepath-tradition','islam');storage.set('biblepath-people-tradition','judaism');}
const timers=new Map();let nextTimer=0;
context.setTimeout=callback=>{timers.set(++nextTimer,callback);return nextTimer;};context.clearTimeout=id=>timers.delete(id);
const requests=[];
context.fetch=file=>new Promise((resolve,reject)=>requests.push({file,resolve,reject,done:false}));
const pending=file=>requests.find(request=>request.file===file&&!request.done);
function respond(file,data,{ok=true}={}){const request=pending(file);assert(request,`Expected a request for ${file}`);request.done=true;request.resolve({ok,json:async()=>data});}
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
const bibleReaders=[],sacredReaders=[],cityReaders=[],peopleIndexes=[],comparisonViews=[];
context.window.BibleScripture=class {constructor(data){this.meta=data.meta;}atlasReference(){return true;}reference(ref){return {...ref,bookId:ref.book};}};
context.window.BibleReader=class {
  constructor(el,model,people,places,callbacks){this.el=el;this.model=model;this.selectedModel=model;this.callbacks=callbacks;this.state={location:{bookId:'GEN',chapter:1,verse:null}};el.rendered=`bible:${model.meta.language}`;bibleReaders.push(this);}
  getState(){return structuredClone(this.state);}setState(value){this.state=structuredClone(value);}
  openAtlas(reference){this.state.atlasReference=reference;return true;}
  open(reference){this.state.location=reference;delete this.state.atlasReference;return true;}
  openPersonPassage(passage){this.personPassage=passage;this.state.personPassage=structuredClone(passage);const target=passage.targets[0];if(target)this.open({...target,bookId:target.book});}
  render(){if(!this.personPassage)delete this.state.personPassage;}
  restoreSelectedEdition(){this.model=this.selectedModel;}
};
context.window.BibleCities=class {constructor(el,places,people,callbacks){this.callbacks=callbacks;this.state={cityId:'jerusalem'};cityReaders.push(this);}getState(){return structuredClone(this.state);}setState(value){this.state=structuredClone(value);}open(id){this.state.cityId=id;}};
context.window.SacredReader=class {
  constructor(el,model){this.el=el;this.model=model;this.state={edition:model.defaultEdition(I.language),location:{unit:model.units()[0].id,chapter:1,verse:null}};this.render();sacredReaders.push(this);}
  render(){this.el.rendered=`${this.model.tradition}:${I.language}`;this.el.innerHTML=`<article>${this.el.rendered}</article>`;}
  getState(){return structuredClone(this.state);}destroy(){this.destroyed=true;}changeLanguage(){this.render();}
  selectEdition(edition){this.state.edition=edition;this.render();}open(location){this.state.location=structuredClone(location);this.render();}
};
let atlasView;
context.window.TraditionAtlasView=class {
  constructor(el,callbacks){this.el=el;this.callbacks=callbacks;this.saved=new Map();atlasView=this;}
  setCollection(data,mode){this.tradition=data.meta.tradition;this.setMode(mode);}
  setMode(mode){this.mode=mode;this.changeLanguage();}
  openPlace(id){this.placeId=id;this.mode='cities';}
  changeLanguage(){this.el.rendered=`atlas:${this.tradition}:${this.mode}:${I.language}`;}
};
let geographicView;
context.window.PlacesMapView=class {
  constructor(el,callbacks){this.el=el;this.callbacks=callbacks;this.filterCalls=[];this.state={filter:'all',query:'',selected:null};geographicView=this;}
  setData(data,collections){if(data.invalid)throw new Error('Invalid map data');this.data=data;this.collections=collections;this.changeLanguage();}
  setTradition(tradition){this.state.filter=tradition;this.filterCalls.push(tradition);}
  changeLanguage(){this.el.rendered=`geography:${I.language}`;}
  resize(){this.resized=true;}getState(){return structuredClone(this.state);}destroy(){this.destroyed=true;}
};
let festivalView;
context.window.FestivalView=class {
  constructor(el,callbacks){this.el=el;this.callbacks=callbacks;festivalView=this;}
  setCollection(data){this.tradition=data.meta.tradition;this.changeLanguage();}
  changeLanguage(){this.el.rendered=`festivals:${this.tradition}:${I.language}`;}
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
const catholicPeople={meta:{referenceNote:{en:'Source edition'}},people:[{id:'catholic:judith',names:{nl:'Judit',en:'Judith',fr:'Judith'},roles:{nl:['Heldin'],en:['Heroine'],fr:['Héroïne']},summary:{nl:'Heldin in Judit.',en:'Heroine in Judith.',fr:'Héroïne dans Judith.'},disambiguation:{nl:'De heldin',en:'The heroine',fr:'L’héroïne'},refs:[{book:'JDT',chapter:8,verse:1,label:'Judith 8:1',edition:'catholic',url:'https://ebible.org/engDRA/JDT08.htm'}]}]};
// Synthetic reviewed boundaries deliberately change the coordinates: the app
// must use the resolver's target instead of copying the source verse number.
const personPassages={meta:{targetEdition:'catholic-nl'},references:{'catholic|Judith 8:1':{status:'mapped',targets:[{book:'JDT',chapter:8,verse:2,endVerse:3,edition:'catholic-nl'}]}}};
const abrahamRef=context.window.BIBLE_DATA.people.find(person=>person.id==='abraham').refs[0];
personPassages.references[`${abrahamRef.translation?'atlas-'+abrahamRef.translation:'atlas'}|${abrahamRef.label}`]={status:'mapped',targets:[{book:'GEN',chapter:12,verse:2,endVerse:4,edition:'catholic-nl'}]};
function initialCatholic(edition='catholic-nl'){respond(edition==='catholic-nl'?'catholic-bible-data-nl.json':'catholic-bible-data.json',{meta:{language:edition==='catholic-nl'?'nl':'en',editionId:edition,canon:'catholic'}});respond('catholic-people.json',catholicPeople);respond('places-data.json',{places:[]});}
for(const file of ['discovery.js','paths.js','sacred-library.js','catholic-people-ui.js','person-passage-map.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const snapshot=()=>context.window.biblePath.getState(),selectTradition=name=>traditions.find(button=>button.dataset.tradition===name).click(),selectView=(name,tradition='christianity')=>{nav.find(button=>button.dataset.view===name&&(!button.dataset.navTradition||button.dataset.navTradition===tradition)).click();if(name==='cities')control('#cities-show-list').click();},selectPeople=name=>peopleTraditions.find(button=>button.dataset.peopleTradition===name).click();

const selectReligion=name=>religions.find(button=>button.dataset.religion===name).click();
const activeNav=()=>nav.filter(button=>button.attrs['aria-current']==='page');
async function religionNavigationRegression(){
  initialCatholic();await settle();
  assert.equal(snapshot().tradition,'christianity');assert.equal(snapshot().peopleTradition,'christianity');
  assert.equal(control('#religion-crumb').textContent,'Roman Catholic Christianity');
  assert.equal(control('.breadcrumb strong').textContent,'Holy books');
  assert.equal(control('#index-count').textContent,(snapshot().peopleCount+1).toLocaleString('nl'),'The Catholic submenu counts people, not traditions');
  assert.equal(activeNav().length,1);assert.equal(activeNav()[0].dataset.navTradition,'christianity');
  assert.deepEqual(religionMenus.map(menu=>menu.hidden),[false,true,true]);
  bibleReaders[0].state.location={bookId:'JHN',chapter:3,verse:16};
  context.window.matchMedia=()=>({matches:true});
  control('#sidebar').classList.add('open');control('#sidebar-shade').classList.add('open');
  selectReligion('judaism');
  assert.equal(snapshot().view,'reader');assert.equal(snapshot().tradition,'judaism');assert.equal(snapshot().peopleTradition,'judaism');
  assert(control('#sidebar').classList.contains('open'),'Selecting a religion keeps the mobile submenu open');
  assert.equal(control('#search-trigger').hidden,true);assert.equal(control('.journeys').hidden,true);assert.equal(control('.journey-label').hidden,true);assert.equal(control('.sidebar-bottom .edition').hidden,true);
  assert.equal(control('#tradition-controls').hidden,true);assert.equal(control('#people-collection-controls').hidden,true);
  assert.deepEqual(religionMenus.map(menu=>menu.hidden),[true,false,true]);
  assert.equal(religions[1].attrs['aria-expanded'],'true');
  assert.equal(activeNav().length,1);assert.equal(activeNav()[0].dataset.navTradition,'judaism');
  assert.equal(control('#religion-crumb').textContent,'Judaism');
  selectView('index','judaism');
  assert(!control('#sidebar').classList.contains('open'),'Selecting a child destination closes the mobile menu');
  assert.equal(snapshot().view,'index');assert.equal(control('#people-testament-filters').hidden,true);
  respond('torah-people.json',torahPeople);respond('tanakh-data.json',tanakh);await settle();
  assert.equal(peopleIndexes.at(-1).tradition,'judaism');
  assert.equal(snapshot().view,'index','A late book load cannot move away from the selected people section');
  selectReligion('islam');assert.equal(snapshot().view,'index','Switching religion keeps a shared subview');
  respond('quran-people.json',quranPeople);await settle();
  assert.equal(peopleIndexes.at(-1).tradition,'islam');
  selectView('reader','islam');respond('quran-data.json',quran);await settle();
  const quranReader=sacredReaders.at(-1);quranReader.state.location={unit:'1',chapter:1,verse:4};
  selectView('index','islam');await settle();selectView('reader','islam');await settle();
  assert.equal(sacredReaders.at(-1),quranReader,'Books and people within a religion retain the current reader');
  assert.equal(quranReader.state.location.verse,4);
  assert.equal(storage.get('biblepath-tradition'),'islam');assert.equal(storage.get('biblepath-people-tradition'),'islam');
  selectView('compare');respond('person-comparisons.json',comparisons);await settle();
  assert.deepEqual(religionMenus.map(menu=>menu.hidden),[true,true,true],'Comparison is outside the individual religions');
  assert.equal(activeNav().length,1);assert.equal(activeNav()[0].dataset.view,'compare');
  assert.equal(control('#search-trigger').hidden,true);
  comparisonViews[0].callbacks.onPerson('christianity','moses');await settle();
  assert.equal(snapshot().view,'map');assert.equal(snapshot().tradition,'christianity');assert.equal(snapshot().peopleTradition,'christianity');
  assert.equal(control('#search-trigger').hidden,false);assert.equal(control('.journeys').hidden,false);assert.equal(control('.sidebar-bottom .edition').hidden,false);
  assert.equal(control('#religion-crumb').textContent,'Roman Catholic Christianity');
  assert.equal(activeNav().length,1);assert.equal(activeNav()[0].dataset.view,'map');
  selectReligion('judaism');assert.equal(snapshot().view,'map','The family map stays selected in another religion');respond('tradition-atlas-judaism.json',{meta:{tradition:'judaism'}});
  await settle();selectView('reader','christianity');await settle();
  assert.deepEqual(bibleReaders.at(-1).state.location,{bookId:'JHN',chapter:3,verse:16},'Religion changes retain the Catholic reading position');
}
async function savedReligionRegression(){
  assert.equal(snapshot().tradition,'islam');assert.equal(snapshot().peopleTradition,'islam','The saved religion is authoritative for both sections');
  assert.equal(storage.get('biblepath-people-tradition'),'islam','The older independent people selection is reconciled');
  assert(pending('quran-data.json'));assert(!pending('catholic-bible-data-nl.json'));
  respond('quran-data.json',quran);await settle();
  assert.equal(control('#religion-crumb').textContent,'Islam');
  assert.equal(activeNav().length,1);assert.equal(activeNav()[0].dataset.navTradition,'islam');
}

async function pendingProfileLanguageRegression(){
  // A fresh app is essential: the destination collection must still be loading
  // when the language picker refreshes the current view.
  initialCatholic();await settle();
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

async function pendingPassageEditionRegression(){
  // Start with the Dutch edition so Catholic text is still an uncached load.
  respond('bible-data-nl.json',{meta:{language:'nl'}});respond('places-data.json',{places:[]});await settle();
  const personButton=new Control({person:'catholic:judith'}),passageButton=new Control({catholicPassage:'0'});
  groups.set('#index-grid [data-person]',[personButton]);groups.set('#catholic-profile-content [data-catholic-passage]',[passageButton]);
  selectView('index');respond('catholic-people.json',catholicPeople);await settle();
  selectView('cities');await settle();
  bibleReaders.at(-1).selectedModel.atlasReference=()=>null;
  cityReaders.at(-1).callbacks.onPassage({label:'Psalms 51:18'});await settle();
  assert(pending('bible-data.json'),'A source-edition city passage remains in flight');
  selectView('index');personButton.click();assert.equal(control('#catholic-profile-dialog').open,true);
  passageButton.click();assert(pending('catholic-bible-data-nl.json'));assert.equal(snapshot().reader,null,'The Catholic replacement reader is still loading');
  const respondCatholic=()=>respond('catholic-bible-data-nl.json',{meta:{language:'nl',editionId:'catholic-nl',canon:'catholic'}});
  const respondSource=()=>respond('bible-data.json',{meta:{language:'en'}});
  const order=process.argv.at(-1);
  if(order==='reader-first'){respondCatholic();await settle();respondSource();}
  else if(order==='same-turn'){respondSource();respondCatholic();}
  else {respondSource();await settle();assert.equal(snapshot().reader,null);respondCatholic();}
  await settle();
  respond('person-passage-map.json',personPassages);await settle();
  assert.equal(snapshot().bibleEdition,'catholic-nl');
  assert.equal(bibleReaders.at(-1).selectedModel.meta.editionId,'catholic-nl');
  assert.equal(bibleReaders.at(-1).state.location.bookId,'JDT','A new Catholic passage must survive an older source-edition lookup');
  assert.equal(bibleReaders.at(-1).state.location.chapter,8);assert.equal(bibleReaders.at(-1).state.location.verse,2);assert.equal(bibleReaders.at(-1).state.location.endVerse,3);
  assert.equal(bibleReaders.at(-1).state.atlasReference,undefined,'The old city reference cannot overwrite the new Catholic request');
  assert.doesNotMatch(control('#toast').textContent||'',/could not load|could not be located/,'A queued passage must not be consumed while its reader is null');
}

async function main(){
  assert.equal(snapshot().language,'nl');assert.equal(snapshot().tradition,'christianity');
  assert.equal(snapshot().peopleTradition,'christianity');
  assert(!requests.some(request=>/torah-people|quran-people|comparisons/.test(request.file)),'Other collections remain lazy');
  assert.equal(snapshot().bibleEdition,'catholic-nl');assert(pending('catholic-bible-data-nl.json'),'The complete Dutch Catholic edition is the default, with Dutch controls');
  initialCatholic();await settle();
  assert.equal(bibleReaders.at(-1).model.meta.language,'nl');assert.equal(bibleReaders.at(-1).model.meta.editionId,'catholic-nl');
  assert.deepEqual(Array.from(bibleReaders.at(-1).callbacks.editionOptions,option=>option.id),['catholic-nl','catholic','locale']);
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
  assert.equal(requests.filter(r=>r.file==='catholic-bible-data-nl.json').length,1,'A tradition switch must not reload the Bible unnecessarily');

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
  assert.equal(control('#people-collection-controls').hidden,true);assert.equal(control('#tradition-controls').hidden,true,'Religion selection has a single place in the main navigation');

  selectPeople('judaism');assert.equal(snapshot().peopleTradition,'judaism');assert(pending('torah-people.json'));
  assert.equal(control('#people-testament-filters').hidden,true,'Torah collection must not inherit Old/New Testament filters');
  assert.equal(snapshot().tradition,'judaism','Selecting Torah people also selects the Jewish context for books');
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
  assert.equal(storage.get('biblepath-people-tradition'),'judaism');assert.equal(storage.get('biblepath-tradition'),'judaism','Books and people persist the same selected religion');

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
  assert.equal(snapshot().tradition,'judaism','A linked Torah identity selects the Jewish context');
  assert.deepEqual(peopleIndexes[0].comparisonKeys,['moses','abraham']);
  await control('#language-select').change('nl');await settle();
  assert.equal(peopleIndexes[0].selected,'torah:moses','Language changes retain selected people profiles');
  assert.equal(control('#tradition-people-view').rendered,'people:judaism:nl');
  selectView('compare');await settle();
  assert.equal(control('#comparison-view').rendered,'compare:nl');assert.equal(comparisonViews[0].selected,'moses');
  comparisonViews[0].callbacks.onPerson('christianity','moses');await settle();
  assert.equal(snapshot().view,'map');assert.equal(snapshot().focus,'moses','Christianity comparison routes to the existing Bible person');
  assert.equal(control('#people-testament-filters').hidden,false,'Bible relationship map keeps its own testament filters');
  assert.equal(snapshot().tradition,'christianity','Exploring a Bible comparison selects the Catholic context');
  selectPeople('christianity');await settle();
  assert.equal(control('#index-view').hidden,false);assert.equal(control('#tradition-people-view').hidden,true);
  assert.equal(control('#people-testament-filters').hidden,false);
  selectView('reader');await settle();
  assert.equal(control('#reader-view').hidden,false);assert.equal(control('#sacred-reader-view').hidden,true);assert.equal(control('#people-testament-filters').hidden,true);
  assert.equal(snapshot().peopleCount,originalPeopleCount);assert.equal(snapshot().relationshipCount,originalRelationships,'Separate index data never mutates Bible graph identities or edges');
  selectTradition('christianity');await settle();
  if(pending('bible-data.json')){respond('bible-data.json',{meta:{language:'en'}});await settle();}
  const catholicLocation=structuredClone(bibleReaders.at(-1).state.location);
  bibleReaders.at(-1).callbacks.onEditionChange('locale');assert(pending('bible-data-nl.json'));
  respond('bible-data-nl.json',{meta:{language:'nl'}});await settle();
  assert.equal(snapshot().bibleEdition,'locale');assert.equal(bibleReaders.at(-1).model.meta.language,'nl');
  bibleReaders.at(-1).state.location={bookId:'EXO',chapter:3,verse:2};
  bibleReaders.at(-1).callbacks.onEditionChange('catholic-nl');await settle();
  assert.deepEqual(bibleReaders.at(-1).state.location,catholicLocation,'Each edition preserves its own reading position');
  const passageButton=new Control({catholicPassage:'0'});groups.set('#catholic-profile-content [data-catholic-passage]',[passageButton]);
  bibleReaders.at(-1).callbacks.onPerson('catholic:judith');
  assert.equal(control('#catholic-profile-dialog').open,true);assert.match(control('#catholic-profile-content').innerHTML,/Judit/);
  passageButton.click();assert(pending('person-passage-map.json'),'The first person passage lazily loads its reviewed correspondence');
  assert(!pending('catholic-bible-data.json'),'An English source citation defaults to its Dutch Catholic correspondence');
  respond('person-passage-map.json',personPassages);await settle();assert.equal(control('#catholic-profile-dialog').open,false);
  assert.equal(snapshot().bibleEdition,'catholic-nl');assert.equal(bibleReaders.at(-1).model.meta.language,'nl');
  assert.equal(bibleReaders.at(-1).state.location.bookId,'JDT');assert.equal(bibleReaders.at(-1).state.location.chapter,8);
  assert.equal(bibleReaders.at(-1).state.location.verse,2);assert.equal(bibleReaders.at(-1).state.location.endVerse,3);
  assert.equal(bibleReaders.at(-1).state.personPassage.sourceLabel,'Judith 8:1','Original source coordinates remain attributable');
  assert.equal(bibleReaders.at(-1).state.atlasReference,undefined,'Catholic references exit legacy edition detours');
  bibleReaders.at(-1).callbacks.onPerson('catholic:judith');
  bibleReaders.at(-1).model={reference(){throw Error('Wrong edition: a legacy city reference temporarily selected WEB');}};
  passageButton.click();await settle();assert.equal(bibleReaders.at(-1).model.meta.editionId,'catholic-nl','The person passage exits a temporary WEB detour first');
  assert.equal(snapshot().peopleCount,originalPeopleCount);assert.equal(snapshot().relationshipCount,originalRelationships);
  const mappedLocation=structuredClone(bibleReaders.at(-1).state.location);
  bibleReaders.at(-1).callbacks.onEditionChange('catholic');respond('catholic-bible-data.json',{meta:{language:'en',editionId:'catholic',canon:'catholic'}});await settle();
  bibleReaders.at(-1).state.location={bookId:'DAN',chapter:13,verse:45};
  bibleReaders.at(-1).callbacks.onEditionChange('catholic-nl');await settle();
  assert.deepEqual(bibleReaders.at(-1).state.location,mappedLocation,'Returning from the English edition restores the mapped Dutch reading position');
  await control('#language-select').change('fr');await settle();
  assert.equal(bibleReaders.at(-1).model.meta.language,'nl','Changing the interface does not translate or replace a fixed Dutch text edition');
  assert.equal(requests.filter(request=>request.file==='catholic-bible-data-nl.json').length,1);
  await control('#language-select').change('nl');await settle();
  bibleReaders.at(-1).callbacks.onEditionChange('locale');await settle();
  assert.equal(bibleReaders.at(-1).state.location.bookId,'EXO');
  await control('#language-select').change('fr');await settle();
  respond('bible-data-fr.json',{meta:{language:'fr'}});await settle();
  assert.equal(bibleReaders.at(-1).state.location.bookId,'GEN','A different text edition does not inherit unaligned verse numbers');
  bibleReaders.at(-1).state.location={bookId:'PSA',chapter:23,verse:1};
  await control('#language-select').change('nl');await settle();
  assert.equal(bibleReaders.at(-1).state.location.bookId,'EXO','Returning to Dutch restores the Dutch edition position');
  const atlasButton=new Control({personPassage:'0'});groups.set('#inspector [data-person-passage]',[atlasButton]);
  groups.get('.journey')[0].click();assert.match(control('#inspector').innerHTML,/Original source/);
  atlasButton.click();await settle();
  assert.equal(snapshot().bibleEdition,'catholic-nl','Legacy atlas person actions also select the complete Dutch Catholic edition');
  assert.equal(bibleReaders.at(-1).state.location.bookId,'GEN');assert.equal(bibleReaders.at(-1).state.location.verse,2);
  assert.equal(bibleReaders.at(-1).state.personPassage.originalReference.translation,abrahamRef.translation,'Source translation metadata reaches the resolver');
  assert.equal(requests.filter(request=>request.file==='person-passage-map.json').length,1,'Both person collections share a successful map download');
  for(const scenario of ['--religion-navigation','--saved-religion','--festivals','--tradition-atlas','--geography']){const check=spawnSync(process.execPath,[__filename,scenario],{encoding:'utf8'});assert.equal(check.status,0,check.stderr||check.stdout);}
  const pendingProfileCheck=spawnSync(process.execPath,[__filename,'--pending-profile-language'],{encoding:'utf8'});
  assert.equal(pendingProfileCheck.status,0,pendingProfileCheck.stderr||pendingProfileCheck.stdout);
  const dutchRetryCheck=spawnSync(process.execPath,[__filename,'--dutch-edition-retry'],{encoding:'utf8'});
  assert.equal(dutchRetryCheck.status,0,dutchRetryCheck.stderr||dutchRetryCheck.stdout);
  const savedEditionCheck=spawnSync(process.execPath,[__filename,'--saved-catholic'],{encoding:'utf8'});
  assert.equal(savedEditionCheck.status,0,savedEditionCheck.stderr||savedEditionCheck.stdout);
  const passageRetryCheck=spawnSync(process.execPath,[__filename,'--person-passage-retry'],{encoding:'utf8'});
  assert.equal(passageRetryCheck.status,0,passageRetryCheck.stderr||passageRetryCheck.stdout);
  const passageCancelCheck=spawnSync(process.execPath,[__filename,'--person-passage-cancel'],{encoding:'utf8'});
  assert.equal(passageCancelCheck.status,0,passageCancelCheck.stderr||passageCancelCheck.stdout);
  for(const order of ['source-first','reader-first','same-turn']){
    const pendingPassageCheck=spawnSync(process.execPath,[__filename,'--pending-passage-race',order],{encoding:'utf8'});
    assert.equal(pendingPassageCheck.status,0,`${order}: ${pendingPassageCheck.stderr||pendingPassageCheck.stdout}`);
  }
  console.log('Interfaith app passed: religion-first navigation, mobile submenu behavior, shared religion persistence, independent readers and people collections, lazy caches, retries, late-response guards, filters, comparison routing and language changes.');
}
async function dutchEditionRetryRegression(){
  respond('catholic-bible-data-nl.json',null,{ok:false});respond('catholic-people.json',catholicPeople);respond('places-data.json',{places:[]});await settle();
  assert.equal(snapshot().reader,null);assert.match(control('#reader-view').innerHTML,/library-retry/);
  control('#reader-view').querySelector('button').click();assert(pending('catholic-bible-data-nl.json'),'A failed Dutch download can be retried');
  const personButton=new Control({person:'catholic:judith'}),passageButton=new Control({catholicPassage:'0'});
  groups.set('#index-grid [data-person]',[personButton]);groups.set('#catholic-profile-content [data-catholic-passage]',[passageButton]);
  selectView('index');personButton.click();passageButton.click();
  respond('catholic-bible-data-nl.json',{meta:{language:'nl',editionId:'catholic-nl',canon:'catholic'}});await settle();
  respond('person-passage-map.json',personPassages);await settle();
  assert.equal(snapshot().bibleEdition,'catholic-nl');assert.equal(bibleReaders.at(-1).model.meta.editionId,'catholic-nl');
  assert.equal(bibleReaders.at(-1).state.location.bookId,'JDT');
  assert.equal(bibleReaders.at(-1).state.location.verse,2,'The queued person citation opens its Dutch mapping when a text retry succeeds');
  assert.equal(requests.filter(request=>request.file==='catholic-bible-data-nl.json').length,2,'The completed retry stays cached when the Dutch reader is selected again');
  assert.equal(requests.filter(request=>request.file==='catholic-people.json').length,1,'Both Catholic editions share the separately sourced people collection');
}
async function personPassageRetryRegression(){
  initialCatholic();await settle();
  const passageButton=new Control({catholicPassage:'0'});groups.set('#catholic-profile-content [data-catholic-passage]',[passageButton]);
  bibleReaders.at(-1).callbacks.onPerson('catholic:judith');passageButton.click();
  respond('person-passage-map.json',null,{ok:false});await settle();
  assert.equal(bibleReaders.at(-1).state.personPassage.status,'error','A failed mapping request exposes its retry state');
  const retryRef=bibleReaders.at(-1).state.personPassage.originalReference;
  bibleReaders.at(-1).callbacks.onPersonPassageRetry(retryRef);assert(pending('person-passage-map.json'));
  bibleReaders.at(-1).callbacks.onEditionChange('catholic');respond('catholic-bible-data.json',{meta:{language:'en',editionId:'catholic',canon:'catholic'}});await settle();
  respond('person-passage-map.json',personPassages);await settle();
  assert.equal(snapshot().bibleEdition,'catholic');assert.equal(bibleReaders.at(-1).state.location.bookId,'GEN','A late mapping result cannot override a manual edition choice');
  bibleReaders.at(-1).callbacks.onPerson('catholic:judith');passageButton.click();await settle();
  assert.equal(snapshot().bibleEdition,'catholic-nl');assert.equal(bibleReaders.at(-1).state.location.verse,2,'A fresh person action overrides the saved English edition and reuses the recovered map');
  assert.equal(requests.filter(request=>request.file==='person-passage-map.json').length,2);
}
async function personPassageCancelRegression(){
  initialCatholic();await settle();
  const passageButton=new Control({catholicPassage:'0'});groups.set('#catholic-profile-content [data-catholic-passage]',[passageButton]);
  bibleReaders.at(-1).callbacks.onPerson('catholic:judith');passageButton.click();
  assert.equal(bibleReaders.at(-1).state.personPassage.status,'loading');
  bibleReaders.at(-1).callbacks.onPersonPassageCancel();bibleReaders.at(-1).state.location={bookId:'EXO',chapter:2,verse:null};
  respond('person-passage-map.json',personPassages);await settle();
  assert.equal(bibleReaders.at(-1).state.location.bookId,'EXO','A manual reader navigation cancels a pending mapping result');
  assert.equal(bibleReaders.at(-1).state.personPassage,undefined,'Cancellation removes the stale loading state');
}
async function savedCatholicRegression(){assert.equal(snapshot().bibleEdition,'catholic');assert(!pending('catholic-bible-data-nl.json'));initialCatholic('catholic');await settle();assert.equal(bibleReaders.at(-1).model.meta.language,'en','An explicitly saved English edition remains selected');}

async function festivalRegression(){
  initialCatholic();await settle();
  assert(!requests.some(r=>r.file.startsWith('festivals-')),'Dossiers load only when opened');
  selectView('festivals');assert(pending('festivals-christianity.json'));
  selectReligion('judaism');assert.equal(snapshot().view,'festivals');assert(pending('festivals-judaism.json'));
  selectReligion('islam');respond('festivals-islam.json',{meta:{tradition:'islam'}});await settle();
  assert.equal(festivalView.tradition,'islam');assert.equal(control('#festivals-view').hidden,false);
  respond('festivals-christianity.json',null,{ok:false});respond('festivals-judaism.json',{meta:{tradition:'judaism'}});await settle();
  assert.equal(festivalView.tradition,'islam','Late dossier downloads cannot replace the selected religion');
  await control('#language-select').change('fr');assert.equal(control('#festivals-view').rendered,'festivals:islam:fr');
  assert.equal(activeNav().length,1);assert.equal(activeNav()[0].dataset.navTradition,'islam');
  const qref={tradition:'islam',surah:1,verse:1,endVerse:1,edition:'nl'};
  const opening=festivalView.callbacks.onPassage(qref,'islam:salat');respond('quran-data.json',quran);await opening;await settle();
  assert.equal(snapshot().view,'reader');assert.equal(sacredReaders.at(-1).state.edition,'nl','Study links choose the explicitly documented edition');
  assert.equal(sacredReaders.at(-1).state.location.unit,'1');assert.equal(sacredReaders.at(-1).state.location.verse,1);
  assert.equal(control('#return-to-festivals').hidden,false);control('#return-to-festivals').click();await settle();assert.equal(snapshot().view,'festivals');
  selectReligion('judaism');await settle();assert.equal(festivalView.tradition,'judaism');
  const he=structuredClone(tanakh);he.editions.he=structuredClone(he.editions.en);he.editions.he.books[0].chapters[0].verses.push({number:2,text:'Hebrew fixture'});
  const jref={tradition:'judaism',book:'GEN',chapter:1,verse:1,endVerse:2,edition:'he'};
  const jopening=festivalView.callbacks.onPassage(jref,'judaism:shabbat');respond('tanakh-data.json',he);await jopening;
  assert.equal(sacredReaders.at(-1).state.edition,'he');assert.equal(sacredReaders.at(-1).state.location.endVerse,2);
  control('#return-to-festivals').click();await settle();selectReligion('christianity');
  respond('festivals-christianity.json',null,{ok:false});await settle();assert.match(control('#festivals-view').innerHTML,/library-retry/);
  control('#festivals-view').querySelector('button').click();respond('festivals-christianity.json',{meta:{tradition:'christianity'}});await settle();assert.equal(festivalView.tradition,'christianity');
  const cref={tradition:'christianity',book:'JHN',chapter:20,verse:1,endVerse:18,edition:'catholic-nl'};
  await festivalView.callbacks.onPassage(cref,'christianity:easter');await settle();assert.equal(snapshot().bibleEdition,'catholic-nl');assert.equal(bibleReaders.at(-1).state.location.endVerse,18);
  control('#return-to-festivals').click();await settle();
  const prior=structuredClone(bibleReaders.at(-1).state.location),cancelled=festivalView.callbacks.onPassage({...cref,chapter:21},'christianity:easter');selectView('index');await cancelled;
  assert.deepEqual(structuredClone(bibleReaders.at(-1).state.location),prior,'Leaving the reader cancels a pending festival passage');assert.equal(control('#festivals-view').hidden,true);
  console.log('Festival app regression passed: lazy separate collections, religion-first navigation, late responses, retry, language, edition-specific ranges and return routing.');
}

async function atlasRegression(){
  initialCatholic();await settle();
  assert(!requests.some(r=>r.file.startsWith('tradition-atlas-')),'Atlas data is lazy');
  selectView('map','judaism');assert(pending('tradition-atlas-judaism.json'));
  assert.equal(snapshot().tradition,'judaism');assert.equal(control('#map-view').hidden,true);
  assert.equal(control('#path-finder').hidden,true);assert.equal(control('#people-testament-filters').hidden,true);
  selectReligion('islam');assert.equal(snapshot().view,'map');
  respond('tradition-atlas-islam.json',{meta:{tradition:'islam'}});await settle();
  respond('tradition-atlas-judaism.json',null,{ok:false});await settle();
  assert.equal(atlasView.tradition,'islam','A late failed download does not replace the active religion');
  assert.equal(control('#tradition-atlas-view').hidden,false);
  await control('#language-select').change('fr');assert.equal(control('#tradition-atlas-view').rendered,'atlas:islam:map:fr');
  selectView('cities','islam');await settle();assert.equal(atlasView.mode,'cities');assert.equal(control('#cities-view').hidden,true);
  assert.equal(requests.filter(r=>r.file==='tradition-atlas-islam.json').length,1,'Family maps and places share one downloaded collection');
  const qref={tradition:'islam',surah:1,verse:1,endVerse:1,edition:'nl'};
  const opening=atlasView.callbacks.onPassage(qref);respond('quran-data.json',quran);await opening;await settle();
  assert.equal(snapshot().view,'reader');assert.equal(sacredReaders.at(-1).state.edition,'nl');assert.equal(sacredReaders.at(-1).state.location.unit,'1');
  assert.equal(control('#return-to-atlas').hidden,false);assert.equal(control('#return-to-festivals').hidden,true);
  control('#return-to-atlas').click();await settle();assert.equal(snapshot().view,'cities');assert.equal(atlasView.mode,'cities');
  atlasView.callbacks.onModeChange('map');await settle();assert.equal(snapshot().view,'map');assert.equal(atlasView.mode,'map');
  selectReligion('judaism');respond('tradition-atlas-judaism.json',null,{ok:false});await settle();
  assert.match(control('#tradition-atlas-view').innerHTML,/library-retry/);
  control('#tradition-atlas-view').querySelector('button').click();respond('tradition-atlas-judaism.json',{meta:{tradition:'judaism'}});await settle();
  assert.equal(atlasView.tradition,'judaism');assert.equal(snapshot().view,'map');
  const he=structuredClone(tanakh);he.editions.he=structuredClone(he.editions.en);he.editions.he.books[0].chapters[0].verses.push({number:2,text:'Hebrew fixture'});
  const jref={tradition:'judaism',book:'GEN',chapter:1,verse:1,endVerse:2,edition:'he'};
  const jopening=atlasView.callbacks.onPassage(jref);respond('tanakh-data.json',he);await jopening;await settle();
  assert.equal(sacredReaders.at(-1).state.edition,'he');assert.equal(sacredReaders.at(-1).state.location.endVerse,2);
  control('#return-to-atlas').click();await settle();assert.equal(snapshot().view,'map');
  const prior=structuredClone(sacredReaders.at(-1).state.location),cancelled=atlasView.callbacks.onPassage({...jref,verse:2});selectView('cities','christianity');await cancelled;
  assert.deepEqual(sacredReaders.at(-1).state.location,prior,'Leaving cancels a pending passage action');
  assert.equal(snapshot().tradition,'christianity');assert.equal(control('#tradition-atlas-view').hidden,true);assert.equal(control('#cities-view').hidden,false);assert.equal(control('#return-to-atlas').hidden,true);
  selectView('map','judaism');await settle();atlasView.callbacks.onPerson('torah:moses');respond('torah-people.json',torahPeople);await settle();
  assert.equal(snapshot().view,'index');assert.equal(peopleIndexes.at(-1).selected,'torah:moses');assert.equal(control('#return-to-atlas').hidden,false);
  control('#return-to-atlas').click();await settle();assert.equal(snapshot().view,'map');assert.equal(snapshot().tradition,'judaism');
  selectView('cities','judaism');selectReligion('islam');await settle();assert.equal(snapshot().view,'cities');assert.equal(atlasView.tradition,'islam');
  console.log('Tradition atlas navigation passed: separate views, lazy cache, stale downloads, retry, source ranges, index links, language and return paths.');
}

async function geographyRegression(){
  initialCatholic();await settle();
  const openMap=tradition=>nav.find(b=>b.dataset.view==='cities'&&b.dataset.navTradition===tradition).click();
  assert(!pending('place-geography.json'),'Geography data loads on demand');
  openMap('judaism');assert.equal(snapshot().view,'geography');assert.equal(control('#places-map-view').hidden,false);assert.equal(control('#tradition-atlas-view').hidden,true);
  assert.equal(activeNav()[0].dataset.view,'cities');assert.equal(control('#cities-show-map').attrs['aria-pressed'],'true');
  selectView('map','judaism');respond('place-geography.json',null,{ok:false});respond('tradition-atlas-judaism.json',{meta:{tradition:'judaism'}});respond('tradition-atlas-islam.json',{meta:{tradition:'islam'}});await settle();
  assert.equal(snapshot().view,'map');assert.equal(atlasView.tradition,'judaism');assert.equal(geographicView,undefined,'Late geography response cannot replace another view');
  openMap('islam');respond('place-geography.json',null,{ok:false});await settle();assert.match(control('#places-map-view').innerHTML,/library-retry/);
  control('#places-map-view').querySelector('button').click();respond('place-geography.json',{invalid:true});await settle();assert.equal(geographicView.destroyed,true,'Invalid initialization destroys its partial map instance');assert.match(control('#places-map-view').innerHTML,/library-retry/);
  control('#places-map-view').querySelector('button').click();respond('place-geography.json',{places:[]});await settle();
  assert.equal(geographicView.state.filter,'islam');assert.equal(geographicView.collections.judaism.meta.tradition,'judaism');
  const filterCalls=geographicView.filterCalls.length;geographicView.state={filter:'all',query:'Jeruzalem',selected:'judaism:place-jerusalem',center:[31.8,35.2],zoom:9};
  control('#cities-show-list').click();await settle();control('#cities-show-map').click();await settle();assert.equal(geographicView.filterCalls.length,filterCalls,'Map/List switching retains custom filters');assert.equal(geographicView.state.query,'Jeruzalem');
  geographicView.callbacks.onPlace({tradition:'judaism',id:'judaism:place-jerusalem'});await settle();
  assert.equal(snapshot().view,'cities');assert.equal(snapshot().tradition,'judaism');assert.equal(atlasView.placeId,'judaism:place-jerusalem');assert.equal(control('#return-to-geography').hidden,false);
  const he=structuredClone(tanakh);he.editions.he=structuredClone(he.editions.en);
  const reading=atlasView.callbacks.onPassage({tradition:'judaism',book:'GEN',chapter:1,verse:1,endVerse:1,edition:'he'});respond('tanakh-data.json',he);await reading;await settle();
  assert.equal(snapshot().view,'reader');assert.equal(sacredReaders.at(-1).state.edition,'he');assert.equal(control('#return-to-geography').hidden,false);
  control('#return-to-geography').click();await settle();assert.equal(snapshot().view,'geography');assert.equal(geographicView.filterCalls.length,filterCalls,'Returning keeps custom religion filters');assert.equal(geographicView.state.query,'Jeruzalem');assert.equal(geographicView.state.zoom,9);
  await control('#language-select').change('fr');assert.equal(control('#places-map-view').rendered,'geography:fr');assert.equal(geographicView.state.query,'Jeruzalem');assert.equal(geographicView.filterCalls.length,filterCalls);
  geographicView.callbacks.onPlace({tradition:'christianity',id:'place-H3389'});await settle();assert.equal(snapshot().tradition,'christianity');assert.equal(snapshot().view,'cities');assert.equal(cityReaders.at(-1).state.cityId,'place-H3389');
  control('#return-to-geography').click();await settle();assert.equal(snapshot().view,'geography');
  selectReligion('judaism');await settle();assert.equal(snapshot().view,'geography');assert.equal(geographicView.state.filter,'judaism','Explicit religion navigation resets to that tradition');
  selectView('reader','islam');assert.equal(control('#return-to-geography').hidden,true,'Explicit navigation ends the return chain');
  assert.equal(requests.filter(r=>r.file==='tradition-atlas-judaism.json').length,1,'Map and existing profiles share their data download');
  console.log('Geography navigation passed: default city map, lazy shared data, failure/retry, stale responses, separate religious profiles, scripture links, preserved filters/viewport and language.');
}

(process.argv.includes('--geography')?geographyRegression():process.argv.includes('--tradition-atlas')?atlasRegression():process.argv.includes('--festivals')?festivalRegression():process.argv.includes('--religion-navigation')?religionNavigationRegression():process.argv.includes('--saved-religion')?savedReligionRegression():process.argv.includes('--pending-profile-language')?pendingProfileLanguageRegression():process.argv.includes('--pending-passage-race')?pendingPassageEditionRegression():process.argv.includes('--saved-catholic')?savedCatholicRegression():process.argv.includes('--dutch-edition-retry')?dutchEditionRetryRegression():process.argv.includes('--person-passage-retry')?personPassageRetryRegression():process.argv.includes('--person-passage-cancel')?personPassageCancelRegression():main()).catch(error=>{console.error(error);process.exitCode=1;});
