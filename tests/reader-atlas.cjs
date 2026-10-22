'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context={window:{},URL};
vm.createContext(context);
for(const file of ['scripture.js','reader-ui.js','cities-ui.js','library-locales.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const Model=context.window.BibleScripture,Reader=context.window.BibleReader;
const read=filename=>JSON.parse(fs.readFileSync(path.join(root,'dist',filename),'utf8'));
const models={en:new Model(read('bible-data.json')),nl:new Model(read('bible-data-nl.json')),fr:new Model(read('bible-data-fr.json'))};
const places=read('places-data.json'),jerusalem=places.places.find(place=>place.id==='place-H3389');
const psalmIndex=jerusalem.refs.findIndex(ref=>ref.label==='Psalms 51:18');
assert(psalmIndex>=0);
class TestReader extends Reader {
  render(){this.displayedText=this.location.verse?this.model.verse(this.location.bookId,this.location.chapter,this.location.verse)?.text:'';}
  q(){return null;}
}
const reader=new TestReader({},models.fr,{people:[]},{places:[]});
reader.open('Jean 3:16');reader.showLinks=false;reader.query='amour';
const previous=JSON.stringify(reader.getState());
// Exercise the real city click handler, not just a hand-written reader call.
const city=Object.create(context.window.BibleCities.prototype);
city.state={cityId:jerusalem.id};city.byId=new Map([[jerusalem.id,jerusalem]]);
city.container={contains:()=>true};city.callbacks={onPassage:ref=>assert(reader.openAtlas(ref,models.en))};
const button={dataset:{cityAction:'passage',cityRef:String(psalmIndex)}};
city.handleClick({target:{closest:()=>button}});
assert.strictEqual(reader.model,models.en,'Unaligned French city references must use the atlas-compatible edition');
assert.match(reader.displayedText,/Jerusalem/,'The opened passage must actually mention the indexed city');
assert.doesNotMatch(models.fr.verse('PSA',51,18).text,/Jérusalem/,'The same French verse number is a different passage');
assert.match(models.fr.verse('PSA',51,20).text,/Jérusalem/);
assert.equal(reader.getState().atlasReference,'Psalms 51:18');
assert.equal(reader.query,'','Source-edition reading must not reuse a search in another language');
reader.move(1);
const fallbackState=reader.getState();
const restored=new TestReader({},models.fr,{people:[]},{places:[]});
restored.setState(fallbackState,models.en);
assert.strictEqual(restored.model,models.en,'Recreating the UI retains the correct edition and source numbering');
assert.equal(restored.location.chapter,52);
assert.equal(restored.getState().atlasReference,'Psalms 51:18');
for(const locale of ['en','nl']){
  const alignedReader=new TestReader({},models[locale],{people:[]},{places:[]});
  alignedReader.setState(fallbackState,models.en);
  assert.strictEqual(alignedReader.model,models[locale],'A language change resumes the selected edition when its numbering aligns');
  assert.equal(alignedReader.atlasContext,null,'Aligned editions do not retain a temporary-English notice');
  assert.equal(alignedReader.location.bookId,'PSA');assert.equal(alignedReader.location.chapter,52);
}
restored.restoreSelectedEdition();
assert.strictEqual(restored.model,models.fr);
assert.equal(JSON.stringify(restored.getState()),previous,'Return restores the selected edition and its prior reading/search state');
assert(reader.openAtlas('Matthew 2:1',models.en));
assert.strictEqual(reader.model,models.fr,'Aligned books continue to use the selected French edition');
assert.match(reader.displayedText,/Jérusalem/);
assert.equal(reader.atlasContext,null);
assert(reader.open('Psalms 51:18'));
assert.strictEqual(reader.model,models.fr,'A reference typed in the French reader still uses French numbering');
assert.equal(reader.location.verse,18);
assert.equal(reader.openAtlas('Psalms 51:18'),false,'Missing source data must never silently open the wrong French passage');
assert.equal(reader.openAtlas('Psalms 999:1',models.en),false);
assert.strictEqual(reader.model,models.fr,'Invalid references leave the current edition unchanged');
for(const locale of ['en','nl','fr']){
  const model=models[locale];let supported=0,fallback=0;
  for(const place of places.places)for(const ref of place.refs){
    const aligned=model.atlasReference(ref.label);
    const resolved=aligned||models.en.reference(ref.label);
    assert(resolved,`${locale}: city reference cannot be opened: ${ref.label}`);
    if(aligned)supported++;else fallback++;
  }
  if(locale==='fr')assert(fallback>0);else assert.equal(fallback,0);
  console.log(`${locale}: ${supported} city references use the selected edition; ${fallback} safely use WEB.`);
}
// Render the actual notice and wire its real button with a minimal DOM surface.
const elements=new Map();
const el={innerHTML:'',querySelector(selector){if(!elements.has(selector))elements.set(selector,{value:'',listeners:{},addEventListener(name,callback){this.listeners[name]=callback;}});return elements.get(selector);},querySelectorAll(){return [];}};
context.window.BibleI18n={language:'fr',reference:text=>text,bookName:()=>null,t(text,params){return (context.window.BibleLibraryLocales.fr[text]||text).replace(/\{(\w+)\}/g,(match,key)=>params?.[key]??match);}};
const display=Object.create(Reader.prototype);
Object.assign(display,{el,model:models.en,selectedModel:models.fr,atlasContext:{reference:'Psalms 51:18',selectedState:JSON.parse(previous)},books:models.en.books(),location:{bookId:'PSA',chapter:51,verse:18},scope:'all',query:'',showLinks:true,renderContent(){}});
display.render();
assert.match(el.innerHTML,/World English Bible en anglais/,'The French UI explains why the text is in English');
assert.match(el.innerHTML,/Revenir à Louis Segond 1910/);
elements.get('#reader-selected-edition').listeners.click();
assert.strictEqual(display.model,models.fr);
assert.equal(display.location.bookId,'JHN');assert.equal(display.location.verse,16);
assert.doesNotMatch(el.innerHTML,/reader-edition-notice/,'The temporary-edition notice disappears on return');
console.log('City passage accuracy, selected-edition return, fallback state, and French notice passed.');

// Catholic framing must never rebrand the bundled editions or claim a full canon.
const catholicRows={en:{},nl:{},fr:{}};
context.window.BibleI18n.registerRows=rows=>rows.forEach(([en,nl,fr])=>{catholicRows.nl[en]=nl;catholicRows.fr[en]=fr;});
for(const file of ['interfaith-locales.js','catholic-locales.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
for(const [locale,focus,missing] of [['en','Roman Catholic perspective','66 shared books'],['nl','Rooms-katholiek perspectief','66 gedeelde boeken'],['fr','Perspective catholique romaine','66 livres communs']]){
  const I=context.window.BibleI18n;I.language=locale;
  I.t=(text,params)=>(catholicRows[locale][text]||context.window.BibleLibraryLocales[locale]?.[text]||text).replace(/\{(\w+)\}/g,(match,key)=>params?.[key]??match);
  display.model=models[locale];display.books=display.model.books();display.render();
  assert.match(el.innerHTML,new RegExp(focus));assert.match(el.innerHTML,new RegExp(missing));
  assert.match(el.innerHTML,/66/);assert.match(el.innerHTML,/73/);
  assert.match(el.innerHTML,/vatican\.va\/content\/catechism\/.*iv_the_canon_of_scripture\.html/);
  assert.ok(el.innerHTML.includes(models[locale].meta.title),'Published edition identity remains visible');
  assert.doesNotMatch(el.innerHTML,/THE COMPLETE SCRIPTURES/,'The reader must not imply complete Catholic coverage');
}
console.log('Catholic reader context passed in EN/NL/FR: actual edition retained and 66-book alternative distinguished from the complete Catholic edition.');
