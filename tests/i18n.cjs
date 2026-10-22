const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

// A new visit uses Dutch independently of browser locale. Only a supported
// saved choice overrides it; unavailable storage must not break startup.
const localeSource=fs.readFileSync(path.join(root,'dist/i18n.js'),'utf8');
function startupLanguage(saved,{blocked=false,browserLanguage='en-US'}={}){
  const startup={window:{},navigator:{language:browserLanguage,languages:[browserLanguage]},localStorage:{getItem(key){assert.equal(key,'biblepath-language');if(blocked)throw new Error('Storage unavailable');return saved;},setItem(){throw new Error('Startup must not overwrite a saved preference');}}};
  vm.runInNewContext(localeSource,startup);
  return startup.window.BibleI18n.language;
}
for(const browserLanguage of ['en-US','fr-BE','nl-BE'])assert.equal(startupLanguage(null,{browserLanguage}),'nl');
for(const saved of ['en','nl','fr'])assert.equal(startupLanguage(saved),saved,'An explicit saved language must survive reload');
for(const saved of [undefined,'','de','EN','null'])assert.equal(startupLanguage(saved),'nl');
assert.equal(startupLanguage(null,{blocked:true}),'nl');

// A small observable DOM exercises the translator's mutation contract without
// a browser dependency. Setters queue records just as native DOM setters do.
const observers=[];
let writes=0;
function emit(record){for(const observer of observers)if(observer.active&&record.target.isConnected&&(!record.attributeName||observer.options.attributeFilter.includes(record.attributeName)))observer.records.push(record);}
class Node {
  constructor(type){this.nodeType=type;this.parentNode=null;this.childNodes=[];}
  get parentElement(){return this.parentNode?.nodeType===1?this.parentNode:null;}
  get isConnected(){let node=this;while(node.parentNode)node=node.parentNode;return node===document.documentElement;}
  appendChild(child){child.parentNode=this;this.childNodes.push(child);emit({type:'childList',target:this,addedNodes:[child]});return child;}
}
class Text extends Node {
  constructor(value){super(3);this.value=value;}
  get nodeValue(){return this.value;}
  set nodeValue(value){this.value=value;writes++;emit({type:'characterData',target:this});}
}
class Element extends Node {
  constructor(tag,attrs={}){super(1);this.tag=tag;this.attrs={...attrs};}
  hasAttribute(name){return Object.hasOwn(this.attrs,name);}
  getAttribute(name){return this.attrs[name]??null;}
  setAttribute(name,value){this.attrs[name]=String(value);writes++;emit({type:'attributes',target:this,attributeName:name});}
  matches(selector){return selector.split(',').some(part=>{part=part.trim();if(part.startsWith('#'))return this.attrs.id===part.slice(1);if(part==='[translate="no"]')return this.attrs.translate==='no';if(part==='.graph-node text')return this.tag==='text'&&this.parentElement?.attrs.class==='graph-node';return this.tag===part;});}
  closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
}
class MutationObserver {
  constructor(callback){this.callback=callback;this.records=[];this.active=false;observers.push(this);}
  observe(target,options){this.active=true;this.options=options;}
  disconnect(){this.active=false;this.records=[];}
  takeRecords(){return this.records.splice(0);}
}
const document={documentElement:new Element('html'),body:new Element('body')};
document.documentElement.appendChild(document.body);
function append(tag,text,attrs={},parent=document.body){const element=parent.appendChild(new Element(tag,attrs));if(text!==null)element.appendChild(new Text(text));return element;}
function flush(){let rounds=0;while(observers.some(o=>o.records.length)){assert(++rounds<10,'Translator entered a mutation feedback loop');for(const o of observers){const records=o.takeRecords();if(records.length)o.callback(records);}}return rounds;}
const storage=new Map();
const context={window:{},document,MutationObserver,localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}};
vm.createContext(context);
function load(file){vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);}
load('i18n.js');load('library-locales.js');
const I=context.window.BibleI18n;
assert.equal(I.language,'nl','The app starts in Dutch before any language switch');
I.register({nl:{'Relationship map':'Relatiekaart','Find a person':'Zoek een persoon','1 family step':'1 familiestap'},fr:{'Relationship map':'Carte des liens','Find a person':'Trouver une personne','1 family step':'1 lien familial'}});
I.pattern(/^(\d+) family steps$/g,'$1 familiestappen','$1 liens familiaux');
const nav=append('button','  Relationship map  ',{'aria-label':'Find a person'});
const reference=append('span','Read John 3:16; 1 Kings 2:3 (Psalm 4:1)');
const reader=append('section',null,{id:'reader-view','aria-label':'Bible reader'});
const verse=append('p','Relationship map',{title:'Find a person'},reader);
const city=append('section',null,{id:'cities-view','aria-label':'Biblical cities explorer'});
const cityText=append('button','Relationship map',{title:'Find a person'},city);
const protectedText=append('span','Relationship map',{translate:'no'});
const svg=append('svg',null),graphNode=append('g',null,{class:'graph-node'},svg),name=append('text','John 3:16',{},graphNode);
I.observe();I.setLanguage('nl');
assert.equal(nav.childNodes[0].nodeValue,'  Relatiekaart  ');
assert.equal(nav.getAttribute('aria-label'),'Zoek een persoon');
assert.equal(reference.childNodes[0].nodeValue,'Read Johannes 3:16; 1 Koningen 2:3 (Psalmen 4:1)');
assert.equal(verse.childNodes[0].nodeValue,'Relationship map');
assert.equal(verse.getAttribute('title'),'Find a person');
assert.equal(reader.getAttribute('aria-label'),'Bijbellezer');
assert.equal(city.getAttribute('aria-label'),'Verkenner van Bijbelse steden');
assert.equal(cityText.getAttribute('title'),'Find a person');
assert.equal(protectedText.childNodes[0].nodeValue,'Relationship map');
assert.equal(name.childNodes[0].nodeValue,'John 3:16');
assert.equal(flush(),0,'Translator writes must not feed back to its observer');

// Newly inserted descendants of excluded roots must remain untouched, even
// when the mutation record targets a descendant rather than the excluded root.
const lateVerse=append('span','Relationship map',{title:'Find a person'},verse);
const lateCity=append('span','Relationship map',{title:'Find a person'},cityText);
flush();assert.equal(lateVerse.getAttribute('title'),'Find a person');assert.equal(lateCity.childNodes[0].nodeValue,'Relationship map');
const dynamic=append('button','Search',{'aria-label':'Find a person'});
assert.equal(flush(),1);assert.equal(dynamic.childNodes[0].nodeValue,'Zoeken');
dynamic.childNodes[0].nodeValue='3 family steps';
dynamic.setAttribute('aria-label','Previous chapter');
assert.equal(flush(),1);assert.equal(dynamic.childNodes[0].nodeValue,'3 familiestappen');assert.equal(dynamic.getAttribute('aria-label'),'Vorig hoofdstuk');
I.setLanguage('fr');assert.equal(nav.childNodes[0].nodeValue,'  Carte des liens  ');assert.equal(dynamic.childNodes[0].nodeValue,'3 liens familiaux');
I.setLanguage('en');assert.equal(nav.childNodes[0].nodeValue,'  Relationship map  ');assert.equal(dynamic.childNodes[0].nodeValue,'3 family steps');assert.equal(dynamic.getAttribute('aria-label'),'Previous chapter');
for(let i=0;i<15;i++){I.setLanguage(['nl','fr','en'][i%3]);assert.equal(flush(),0);}
I.setLanguage('fr');const before=writes;I.translateDOM();assert.equal(writes,before,'Stable translations should not rewrite the DOM');

// Translation registrations invalidate cached misses. Global patterns must
// work repeatedly rather than depending on RegExp.lastIndex from prior calls.
assert.equal(I.text('Later label'),'Later label');I.register({fr:{'Later label':'Libellé ajouté'}});assert.equal(I.text('Later label'),'Libellé ajouté');
assert.equal(I.text('4 family steps'),'4 liens familiaux');assert.equal(I.text('5 family steps'),'5 liens familiaux');
assert.equal(I.reference('John 3:16; 1 John 4:8 (Song of Songs 2:1)'),'Jean 3:16; 1 Jean 4:8 (Cantique des cantiques 2:1)');
assert.equal(I.reference('John met Mark.'),'John met Mark.');
assert.equal(I.reference('notJohn 3:16'),'notJohn 3:16');
for(const from of ['en','nl','fr'])for(const to of ['en','nl','fr']){I.setLanguage(to);context.window.BibleI18n.bookNames[from].forEach((book,i)=>assert.equal(I.reference(`${book} 1:1`),`${I.bookName(I.bookIds[i])} 1:1`));}

const base={id:'jesus',name:'Jesus',aliases:['Jesus Christ','Christ'],description:'Base description',refs:[{label:'John 3:16'}]},person={...base},data={people:[person]};
context.window.BIBLE_ENTITY_LOCALES={fr:{people:{jesus:{name:'Jésus',aliases:['Jésus-Christ','Christ','Jesus'],displayAliases:['Jésus-Christ','Christ'],notes:['Note française'],localeOnly:'temporary'}},places:{salem:{name:'Jérusalem',aliases:['Salem'],displayAliases:['Salem']}}},nl:{people:{jesus:{name:'Jezus',aliases:['Jezus Christus'],displayAliases:['Jezus Christus']}}}};
I.setLanguage('fr');I.localizePeople(data,[base]);assert.strictEqual(data.people[0],person);assert.equal(person.name,'Jésus');assert(person.aliases.includes('Jesus Christ'));assert.deepEqual(Array.from(person.displayAliases),['Jésus-Christ','Christ']);assert(person.notes);
I.setLanguage('nl');I.localizePeople(data,[base]);assert(!Object.hasOwn(person,'notes'));assert(!Object.hasOwn(person,'localeOnly'));assert.equal(person.name,'Jezus');assert.deepEqual(Array.from(person.displayAliases),['Jezus Christus']);
I.setLanguage('en');I.localizePeople(data,[base]);assert.equal(person.name,'Jesus');assert.equal(person.description,'Base description');assert.strictEqual(person.refs,base.refs);assert.deepEqual(Array.from(person.aliases),base.aliases);assert(!Object.hasOwn(person,'notes'));
const placeData={places:[{id:'salem',name:'Jerusalem',aliases:['Salem']},{id:'abdon',name:'Abdon',aliases:[]}]};
I.setLanguage('fr');const translatedPlaces=I.localizePlaces(placeData);assert.equal(translatedPlaces.places[0].name,'Jérusalem');assert(translatedPlaces.places[0].aliases.includes('Jerusalem'));assert.deepEqual(Array.from(translatedPlaces.places[0].displayAliases),['Salem']);assert.deepEqual(Array.from(translatedPlaces.places[1].aliases),[]);assert.equal(placeData.places[0].name,'Jerusalem');

// Shell reference translation also runs across all indexed references when
// switching locale. Keep this real-data hot path bounded and verify output.
load('data.js');
const refs=[...new Set(context.window.BIBLE_DATA.people.flatMap(p=>p.refs.map(r=>r.label)))];
I.setLanguage('nl');const start=performance.now();for(const ref of refs){assert.equal(typeof I.reference(ref),'string');I.text(ref);}const elapsed=performance.now()-start;
assert(elapsed<5000,`Reference translation unexpectedly slow: ${Math.round(elapsed)}ms`);
I.observe();I.observe();assert.equal(observers.filter(o=>o.active).length,1,'Repeated observe calls must not stack observers');
load('scripture.js');load('reader-ui.js');
context.requestAnimationFrame=callback=>callback();
const french=JSON.parse(fs.readFileSync(path.join(root,'dist/bible-data-fr.json'),'utf8'));
const model=new context.window.BibleScripture(french),readerPrototype=context.window.BibleReader.prototype,readerNodes=new Map();
const readerStub={model,books:model.books(),location:{bookId:french.meta.verseIdentityUncertainBooks[0],chapter:1,verse:null},showLinks:true,mode:'read',el:{hidden:false},q(selector){if(!readerNodes.has(selector))readerNodes.set(selector,{innerHTML:'',addEventListener(){}});return readerNodes.get(selector);},qa(){return [];},groupFor:readerPrototype.groupFor,renderVerse:readerPrototype.renderVerse};
I.setLanguage('fr');readerPrototype.renderContent.call(readerStub);assert(readerNodes.get('#reader-content').innerHTML.includes('reader-versification-note'),'Affected chapters must show a nearby numbering warning');
readerStub.location.bookId='GEN';readerPrototype.renderContent.call(readerStub);assert(!readerNodes.get('#reader-content').innerHTML.includes('reader-versification-note'),'Unaffected chapters should not show a numbering warning');
console.log(`Localization passed: Dutch startup and saved preferences, reversible EN/NL/FR text/attributes, exclusions, dynamic updates, no observer feedback, canonical references; ${refs.length} unique indexed references in ${Math.round(elapsed)}ms.`);
