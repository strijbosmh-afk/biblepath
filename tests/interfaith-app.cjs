'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
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
const nav=['reader','map','index','cities'].map(view=>new Control({view}));
const traditions=['christianity','judaism','islam'].map(tradition=>new Control({tradition}));
const groups=new Map([
  ['.nav-item',nav],['[data-tradition]',traditions],
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
const bibleReaders=[],sacredReaders=[],cityReaders=[];
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
const tanakh={books:[{id:'GEN',names:{nl:'Genesis',en:'Genesis'},group:'torah',canonicalBook:'Genesis'}],editions:{en:{meta:{language:'en'},books:[{id:'GEN',chapters:[{number:1,verses:[{number:1,text:'In the beginning.'}]}]}]}}};
const quran={editions:{ar:{language:'ar'},nl:{language:'nl'}},surahs:[{number:1,name:'الفاتحة',transliteration:'Al-Fatiha',ayahs:[{number:1,arabic:'بِسْمِ اللَّهِ',translations:{nl:'In naam van God.'}}]}]};
for(const file of ['discovery.js','paths.js','sacred-library.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const snapshot=()=>context.window.biblePath.getState(),selectTradition=name=>traditions.find(button=>button.dataset.tradition===name).click(),selectView=name=>nav.find(button=>button.dataset.view===name).click();

async function main(){
  assert.equal(snapshot().language,'nl');assert.equal(snapshot().tradition,'christianity');
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
  console.log('Interfaith app passed: Dutch startup, tradition switching, failed-load retry, late-response isolation, Bible reading state, city routing and language changes.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
