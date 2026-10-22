'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),storage=new Map();
let blocked=false;
const context={window:{},URL,document:{documentElement:{},body:null},requestAnimationFrame:callback=>callback(),localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>{if(blocked)throw new Error('Storage unavailable');storage.set(key,String(value));}}};
vm.createContext(context);
for(const file of ['i18n.js','library-locales.js','interfaith-locales.js','sacred-library.js','sacred-reader.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const I=context.window.BibleI18n,Library=context.window.SacredLibrary,Reader=context.window.SacredReader;
const plain=value=>JSON.parse(JSON.stringify(value));
class Root {
  constructor(){this.innerHTML='';this.handlers=new Map();this.controls=new Map();this.hidden=false;}
  addEventListener(event,handler){this.handlers.set(event,handler);}
  removeEventListener(event,handler){if(this.handlers.get(event)===handler)this.handlers.delete(event);}
  querySelector(selector){if(!this.controls.has(selector))this.controls.set(selector,{id:selector.slice(1),value:'',textContent:'',scrollIntoView(){}});return this.controls.get(selector);}
  contains(){return true;}
  click(dataset={},id=''){const button={dataset,id};button.closest=()=>button;this.handlers.get('click')({target:button});}
  change(id,value,checked){this.handlers.get('change')({target:{id,value,checked}});}
  search(value){this.querySelector('#sacred-query').value=value;let prevented=false;this.handlers.get('submit')({target:{id:'sacred-search'},preventDefault(){prevented=true;}});assert(prevented);}
}
const published=name=>JSON.parse(fs.readFileSync(path.join(root,'dist',`${name}-data.json`),'utf8'));
const tanakh=new Library('judaism',published('tanakh')),quran=new Library('islam',published('quran'));
const el=new Root(),reader=new Reader(el,tanakh);
assert.equal(reader.edition,'nl');assert.equal(el.handlers.size,4);
assert.match(el.innerHTML,/Statenvertaling/);assert.match(el.innerHTML,/christelijke vertaling/,'The Dutch reading aid must not be represented as a Jewish translation');
assert.match(el.innerHTML,/<summary>Tora<\/summary>/);assert.match(el.innerHTML,/Profeten/);assert.match(el.innerHTML,/Geschriften/);
el.search('Psalmen 51:18');assert.deepEqual(plain(reader.location),{unit:'PSA',chapter:51,verse:18});
el.change('sacred-edition','he');assert.equal(reader.location.unit,'GEN','Switching editions must not assume shared verse numbering');
el.search('Psalmen 51:20');assert.equal(reader.location.verse,20);assert.match(el.innerHTML,/lang="he" dir="rtl"/);
el.change('sacred-edition','nl');assert.deepEqual(plain(reader.location),{unit:'PSA',chapter:51,verse:18},'The Dutch edition restores its own position');
el.change('sacred-edition','he');assert.equal(reader.location.verse,20);
I.setLanguage('fr');reader.changeLanguage();assert.equal(reader.edition,'he','A manually selected original remains selected when UI language changes');
el.change('sacred-edition','fr');I.setLanguage('nl');reader.changeLanguage();assert.equal(reader.edition,'nl');assert.equal(reader.location.verse,18);
el.search('Psalmen 999:999');assert.equal(reader.tab,'search');assert.match(el.innerHTML,/Deze verwijzing|verwijzing.*bestaat|reference/i);assert.equal(reader.location.verse,18,'An invalid reference leaves the current reading intact');
el.search('Mozes');assert(reader.results.length);assert.match(el.innerHTML,/data-result="0"/);
const first=reader.results[0];el.click({result:'0'});assert.deepEqual(plain(reader.location),{unit:first.unit,chapter:first.chapter,verse:first.verse});
el.change('sacred-unit','GEN');el.click({move:'1'});assert.equal(reader.location.chapter,2);el.click({move:'-1'});assert.equal(reader.location.chapter,1);
el.click({tab:'commentary'});assert.match(el.innerHTML,/https:\/\/www\.sefaria\.org\/texts\/Tanakh/);assert.doesNotMatch(el.innerHTML,/<article class="sacred-verses"/,'Commentary must have its own panel');
el.click({tab:'notes'});const reflection='Een gedachte <b>voor later</b> & een vraag.';el.querySelector('#sacred-note').value=reflection;el.click({},'sacred-save-note');assert.equal(storage.get(reader.noteKey()),reflection);reader.render();assert.match(el.innerHTML,/Een gedachte &lt;b&gt;voor later&lt;\/b&gt; &amp; een vraag\./,'Notes must be escaped when displayed');
const prior=reader.noteKey();el.change('sacred-chapter','2');el.click({tab:'notes'});assert.notEqual(reader.noteKey(),prior);assert.doesNotMatch(el.innerHTML,/Een gedachte/,'Notes belong to their edition and reading');
blocked=true;el.querySelector('#sacred-note').value='Do not lose this';el.click({},'sacred-save-note');assert.match(el.querySelector('#sacred-note-status').textContent,/niet opslaan|could not save|enregistrer/);blocked=false;
reader.destroy();assert.equal(el.handlers.size,0,'Destroy must detach all delegated event handlers');
const restored=new Reader(new Root(),tanakh);assert.equal(restored.edition,'nl');assert.equal(restored.location.unit,'GEN');assert.equal(restored.location.chapter,2);

const qEl=new Root(),qReader=new Reader(qEl,quran);
assert.equal(qReader.edition,'nl');assert.match(qEl.innerHTML,/lang="ar" translate="no"/);assert.match(qEl.innerHTML,/lang="nl" dir="ltr" translate="no"/);
qEl.search('2:255');assert.equal(qReader.location.unit,'2');assert.equal(qReader.location.verse,255);
qEl.search('2:183-185');assert.equal(qReader.location.endVerse,185);assert.equal((qEl.innerHTML.match(/sacred-verse is-target/g)||[]).length,3,'All verses in a study passage must be highlighted');assert.match(qEl.innerHTML,/2:183–185/);
qEl.change('sacred-verse','186');assert.equal(qReader.location.endVerse,undefined);assert.equal((qEl.innerHTML.match(/sacred-verse is-target/g)||[]).length,1,'Manual verse selection clears the old range');
assert.match(qEl.innerHTML,/sacred-bismillah/,'Unnumbered opening formula remains separate from numbered ayahs');
qEl.change('sacred-original','',false);assert.doesNotMatch(qEl.innerHTML,/<p class="sacred-original" dir="rtl" lang="ar"/);
qEl.change('sacred-edition','ar');assert.match(qEl.innerHTML,/lang="ar" dir="rtl"/);qEl.search('الحمد');assert(qReader.results.some(result=>result.unit==='1'&&result.verse===2));
qEl.search('114:6');assert.equal(qReader.location.unit,'114');assert.equal(qReader.location.verse,6);assert.match(qEl.innerHTML,/data-move="1" disabled/);
qEl.click({tab:'commentary'});assert.match(qEl.innerHTML,/https:\/\/quran\.com\/114\/6\/tafsirs/);
qEl.click({tab:'notes'});assert.doesNotMatch(qEl.innerHTML,/Een gedachte/,'Notes must not leak between traditions');
qReader.destroy();assert.equal(qEl.handlers.size,0);
storage.set('biblepath-reader-islam','{"edition":"missing","positions":null}');
const recovered=new Reader(new Root(),quran);assert.equal(recovered.edition,'nl');assert.equal(recovered.location.unit,'1');
storage.set('biblepath-reader-islam','invalid JSON');assert.doesNotThrow(()=>new Reader(new Root(),quran));
console.log('Sacred reader passed: real UI handlers, Dutch editions, RTL, per-edition positions, language changes, search/reference navigation, source panels, private notes and listener cleanup.');
