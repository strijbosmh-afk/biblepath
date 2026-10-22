'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,'dist',name),'utf8'));
const context={window:{},URL,document:{documentElement:{},body:null},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:callback=>callback()};
vm.createContext(context);
for(const file of ['i18n.js','library-locales.js','interfaith-locales.js','catholic-locales.js','scripture.js','reader-ui.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const Model=context.window.BibleScripture,Reader=context.window.BibleReader,I=context.window.BibleI18n;
const catholicData=read('catholic-bible-data.json'),catholic=new Model(catholicData),web=new Model(read('bible-data.json'));
const plain=value=>JSON.parse(JSON.stringify(value));
assert.equal(I.language,'nl','The complete Catholic reader keeps Dutch as the first-visit interface language');
const added=[['TOB','Tobit','Tobit','Tobie'],['JDT','Judith','Judit','Judith'],['WIS','Wisdom','Wijsheid','Sagesse'],['SIR','Sirach','Sirach','Siracide'],['BAR','Baruch','Baruch','Baruch'],['1MA','1 Maccabees','1 Makkabeeën','1 Maccabées'],['2MA','2 Maccabees','2 Makkabeeën','2 Maccabées']];
for(const [id,...names] of added){
  for(const name of names)assert.equal(catholic.reference(`${name} 1:1`).bookId,id);
  assert.equal(web.reference(`${id} 1:1`),null,'Additional books must not be invented in the unchanged 66-book editions');
}
for(const [alias,id] of [['Tobias','TOB'],['Ecclesiasticus','SIR'],['Wisdom of Solomon','WIS'],['Ester','EST'],['1 Kings','1KI'],['2 Kings','2KI'],['1 Samuel','1SA'],['2 Samuel','2SA']])assert.equal(catholic.book(alias).id,id,'Modern canonical book names cannot be confused with archaic Douay-Rheims names');
for(const [locale,index] of [['en',1],['nl',2],['fr',3]]){
  I.setLanguage(locale);
  for(const row of added){assert.equal(I.bookName(row[0]),row[index]);assert.equal(I.reference(`${row[1]} 1:1`),`${row[index]} 1:1`);}
  if(locale!=='en')for(const field of ['versificationNote','credit'])assert.notEqual(I.t(catholicData.meta[field]),catholicData.meta[field],`The Catholic ${field} must be localized in ${locale}`);
}
I.setLanguage('nl');

// Minimal observable DOM: execute the reader's actual rendering and event
// handlers, including content/search rendering, without replacing its methods.
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
class Element{
  constructor(attrs={}){this.attrs=attrs;this.value=attrs.value||'';this.listeners={};this.children=[];this.dataset={};this.hidden=false;for(const [key,value]of Object.entries(attrs))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;}
  set innerHTML(html){this.html=html;this.children=[];for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){const attrs={};for(const attr of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[attr[1]]=decode(attr[2]||'');this.children.push(new Element(attrs));}}
  get innerHTML(){return this.html||'';}
  matches(selector){if(selector.startsWith('#'))return this.attrs.id===selector.slice(1);if(selector.startsWith('.'))return (this.attrs.class||'').split(' ').includes(selector.slice(1));if(selector.startsWith('['))return Object.hasOwn(this.attrs,selector.slice(1,-1));return false;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(name,callback){this.listeners[name]=callback;}
  fire(name,event={}){assert(this.listeners[name],`Missing ${name} handler on ${JSON.stringify(this.attrs)}`);this.listeners[name]({target:this,preventDefault(){},...event});}
  scrollIntoView(){}close(){}showModal(){}
}
const el=new Element(),changes=[];
const reader=new Reader(el,catholic,{people:[]},{places:[]},{editionId:'catholic',editionOptions:[{id:'catholic',label:'Douay-Rheims · English · 73 books'},{id:'nl',label:'Statenvertaling · Dutch · 66 books'}],onEditionChange:id=>changes.push(id)});
assert.match(el.innerHTML,/Volledige katholieke Bijbel: 73 boeken/);
assert.match(el.innerHTML,/De Bijbeltekst is in het Engels/,'The Dutch interface must make the English text language explicit');
assert.match(reader.q('#reader-content').innerHTML,/De Douay-Rheims volgt haar eigen Vulgaatnummering/,'Numbering guidance is Dutch while the source text remains English');
assert.match(reader.q('#reader-content').innerHTML,/<details class="reader-versification-note"><summary>Over de versnummering<\/summary><p>/,'Numbering guidance is available in a compact, initially closed native disclosure');
assert.match(el.innerHTML,/value="catholic" selected/);
const sidebar=reader.qa('[data-reader-book]').map(button=>button.dataset.readerBook);
assert.equal(sidebar.length,73);assert.equal(new Set(sidebar).size,73);
assert.deepEqual([...sidebar].sort(),catholicData.books.map(book=>book.id).sort(),'Every Catholic book is reachable exactly once in the grouped library');
assert.equal(sidebar.at(-1),'REV','Adding OT books must not truncate or displace the Revelation group');
assert.equal(reader.groupFor(catholic.books().find(book=>book.id==='MAT')),'The Gospels');
assert.equal(reader.groupFor(catholic.books().find(book=>book.id==='BAR')),'Major prophets');
reader.q('#reader-edition').fire('change',{target:{value:'nl'}});
assert.deepEqual(changes,['nl'],'Changing the edition selector reaches the parent application callback');

// Actual book-button -> scoped search -> result-button -> chapter flow for
// every additional book; searches use published text rather than test strings.
for(const [id]of added){
  reader.qa('[data-reader-book]').find(button=>button.dataset.readerBook===id).fire('click');
  assert.equal(reader.location.bookId,id);
  const firstVerse=catholic.verse(id,1,1),needle=firstVerse.text;
  reader.q('#reader-query').value=needle;reader.q('#reader-scope').value='book';
  reader.q('#reader-search-form').fire('submit');
  assert.equal(reader.mode,'search');assert(catholic.search(needle,{bookId:id}).total>0);
  const result=reader.qa('[data-reader-result]')[0];assert(result,`${id} search must render a clickable result`);result.fire('click');
  assert.equal(reader.mode,'read');assert.equal(reader.location.bookId,id);assert.equal(reader.location.chapter,1);assert.equal(reader.location.verse,1);
  assert(reader.q('#reader-content').innerHTML.includes(firstVerse.text.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;')));
}
const quicklinks=reader.qa('[data-catholic-book]');
assert.equal(quicklinks.length,12,'All seven books and five addition entry points have shortcuts');
for(const button of quicklinks){button.fire('click');assert.deepEqual(plain(reader.location),{bookId:button.dataset.catholicBook,chapter:Number(button.dataset.catholicChapter),verse:Number(button.dataset.catholicVerse)});}
for(const reference of ['Ester 10:4','Esther 16:24','Daniël 3:90','Daniël 13:65','Daniel 14:42','Baruch 6:72'])assert(reader.open(reference),reference);
assert.equal(reader.open('Esther 16:25'),false);assert.equal(reader.open('Daniël 14:43'),false);
reader.open('Tobit 1:1');reader.move(-1);assert.equal(reader.location.bookId,'NEH');assert.equal(reader.location.chapter,13);
reader.move(1);assert.equal(reader.location.bookId,'TOB');assert.equal(reader.location.chapter,1);
reader.open('Apocalypse 22:21');reader.move(1);assert.equal(reader.location.bookId,'REV');assert.equal(reader.location.chapter,22);

// Source-aware annotations: Catholic ranges may establish an exact identity;
// an equal WEB verse number must not do so in the Vulgate-based edition.
const identity={id:'daniel',name:'Daniel',refs:[{label:'Daniel 13:45-46',edition:'catholic'},{label:'Daniel 3:24'}]};
const annotated=new Model(catholicData,{people:[identity]});
assert.deepEqual([...annotated.referenceKeys(identity.refs)],['DAN.13.45','DAN.13.46']);
assert.deepEqual([...annotated.referenceKeys([{book:'Daniel',chapter:13,verse:45,endVerse:46,edition:'catholic'}])],['DAN.13.45','DAN.13.46']);
assert.equal(annotated.reference({book:'Daniel',chapter:13,verse:45,endVerse:999}),null);
const exact=annotated.annotate('DAN',13,45).find(span=>span.personIds.includes('daniel'));
assert(exact);assert.equal(exact.match,'verse');assert.equal(exact.ambiguous,false);assert.doesNotMatch(exact.note,/possible matches/i);
const spelling=annotated.annotate('DAN',3,24,'Daniel');assert.equal(spelling[0].match,'name');assert.equal(spelling[0].ambiguous,true);
assert.equal(new Model(read('bible-data.json'),{people:[identity]}).referenceKeys([{label:'Daniel 3:24',edition:'catholic'}]).size,0);
assert.equal(catholic.atlasReference('Psalms 51:18'),null,'Legacy atlas citations require a verified source edition');

// A source-edition detour and re-created reader preserve the Catholic edition
// and its own chapter/search position when the user returns.
reader.open('Daniël 13:45');reader.q('#reader-query').value='Susanna';reader.showLinks=false;
const previous=plain(reader.getState());assert(reader.openAtlas('Psalms 51:18',web));
assert.equal(reader.model,web);assert.match(reader.q('#reader-content').innerHTML,/Jerusalem/);
const recreated=new Reader(new Element(),catholic,{people:[]},{places:[]});recreated.setState(reader.getState(),web);
assert.equal(recreated.model,web);recreated.restoreSelectedEdition();
assert.equal(recreated.model,catholic);assert.deepEqual(plain(recreated.getState()),previous);
assert.equal(recreated.location.bookId,'DAN');assert.equal(recreated.location.chapter,13);
const dutchData=read('catholic-bible-data-nl.json'),dutch=new Model(dutchData,{people:[identity]});
assert.equal(dutchData.meta.editionId,'catholic-nl');assert.equal(dutchData.meta.language,'nl');assert.equal(dutch.books().length,73);
const dutchEl=new Element(),dutchReader=new Reader(dutchEl,dutch,{people:[identity]},{places:[]},{editionId:'catholic-nl',editionOptions:[{id:'catholic-nl',label:'Catholic Bible · Dutch · 73 books'},{id:'catholic',label:'Douay-Rheims · English · 73 books'}]});
assert.match(dutchEl.innerHTML,/Katholieke Bijbel · Nederlands · 73 boeken/);assert.match(dutchEl.innerHTML,/De Bijbeltekst is in het Nederlands/);
assert.doesNotMatch(dutchEl.innerHTML,/Douay-Rheims-tekst is Engelstalig|complete Catholic edition is available separately in English/);
assert.equal(dutchReader.qa('[data-reader-book]').length,73);
for(const [id]of added){
  const verse=dutch.verse(id,1,1);assert(verse?.text,`${id} has Dutch text`);assert.notEqual(verse.text,catholic.verse(id,1,1).text,'Dutch text is not the English fallback');
  dutchReader.qa('[data-reader-book]').find(button=>button.dataset.readerBook===id).fire('click');
  dutchReader.q('#reader-query').value=verse.text;dutchReader.q('#reader-scope').value='book';dutchReader.q('#reader-search-form').fire('submit');
  const result=dutchReader.qa('[data-reader-result]')[0];assert(result,`${id} Dutch full-text search has a real result`);result.fire('click');
  assert.deepEqual(plain(dutchReader.location),{bookId:id,chapter:1,verse:1});
}
const dutchLinks=dutchReader.qa('[data-catholic-book]');
assert(Array.isArray(dutchData.meta.catholicNavigation),'The Dutch edition provides its reviewed addition coordinates');
assert.equal(dutchLinks.length,7+dutchData.meta.catholicNavigation.length);
for(const sourceLink of dutchData.meta.catholicNavigation){
  assert(dutch.reference(sourceLink),'Each edition-specific shortcut resolves');
  const button=dutchLinks.find(item=>item.dataset.catholicBook===sourceLink.book&&Number(item.dataset.catholicChapter)===sourceLink.chapter&&Number(item.dataset.catholicVerse)===sourceLink.verse);
  assert(button,`The Dutch shortcut ${sourceLink.label} uses its source coordinates`);button.fire('click');
  assert.deepEqual(plain(dutchReader.location),{bookId:sourceLink.book,chapter:sourceLink.chapter,verse:sourceLink.verse});
}
assert.equal(dutch.referenceKeys(identity.refs.filter(ref=>ref.edition==='catholic')).size,0,'DRA person references cannot establish exact Dutch verse identity');
// Preserve the source's bridged verse as one displayed text, reachable under
// either source number and labeled accurately in full-text search.
const bridge=dutch.verse('PSA',84,9);
assert.equal(bridge.endNumber,10);assert.equal(bridge.numberLabel,'9–10');
assert(dutchReader.open('Psalmen 84:10'),'The second number in a source bridge remains reachable');
assert.equal(dutchReader.location.verse,9,'The normalized bridge opens its single displayed row');
assert.match(dutchReader.q('#reader-content').innerHTML,/aria-label="Vers 9–10">9–10<\/span>/);
assert.match(dutchReader.q('#reader-content').innerHTML,/class="reader-verse is-target" id="reader-verse-9"/);
const bridgeState=plain(dutchReader.getState());dutchReader.setState(bridgeState);assert.deepEqual(plain(dutchReader.getState()),bridgeState);
dutchReader.q('#reader-query').value=bridge.text;dutchReader.q('#reader-scope').value='book';dutchReader.q('#reader-search-form').fire('submit');
assert.match(dutchReader.q('#reader-content').innerHTML,/Psalmen 84:9–10/);
assert.equal(dutch.search(bridge.text,{bookId:'PSA'}).total,1,'A bridged text is indexed once');
dutchReader.qa('[data-reader-result]')[0].fire('click');assert.equal(dutchReader.location.verse,9);
// The historical supplement remains visible as a sourced supplement.
for(const passage of ['Esther 15:1','Esther 16:1']){
  assert(dutchReader.open(passage));const verse=dutch.verse('EST',dutchReader.location.chapter,dutchReader.location.verse);
  assert(verse.sourceEdition);assert(verse.sourceUrl);assert(verse.notes?.length);
  assert.match(dutchReader.q('#reader-content').innerHTML,/Bron van dit vers/);
}

const dutchState=plain(dutchReader.getState());
for(const locale of ['en','fr','nl']){
  I.setLanguage(locale);dutchReader.render();assert.equal(dutchReader.model.meta.language,'nl');assert.deepEqual(plain(dutchReader.getState()),dutchState);
  assert.match(dutchReader.q('#reader-content').innerHTML,{en:/<summary>About verse numbering<\/summary>/,nl:/<summary>Over de versnummering<\/summary>/,fr:/<summary>À propos de la numérotation des versets<\/summary>/}[locale],'The numbering disclosure label follows the interface language');
  assert(dutchReader.q('#reader-content').innerHTML.includes(I.t(dutchData.meta.versificationNote)),'Collapsing the note must preserve the full source-specific numbering guidance');
  assert.match(dutchReader.q('#reader-content').innerHTML,{en:/separately reviewed Dutch passage correspondences/,nl:/afzonderlijk gecontroleerde Nederlandse passagekoppelingen/,fr:/correspondances néerlandaises vérifiées séparément/}[locale]);
  assert(!dutchReader.q('#reader-content').innerHTML.includes(I.t(dutchData.meta.annotationNotice)),'The displayed identity guidance distinguishes reviewed person navigation from inline editorial name links');
  if(locale!=='en')for(const field of ['credit','versificationNote','annotationNotice','license'])assert.notEqual(I.t(dutchData.meta[field]),dutchData.meta[field],`Dutch edition ${field} must be localized in ${locale}`);
}
assert.match(dutchEl.innerHTML,/href="data-notes.html#dutch-catholic"/,'The composite edition links to its detailed source record');
// Reviewed mappings can reorder or split a source range across Dutch chapters.
// The reader displays the Dutch coordinates and keeps the original citation.
const mappedPassage={status:'mapped',sourceLabel:'Daniel 3:98-100; 4:1-3',sourceUrl:'https://ebible.org/engDRA/DAN03.htm',originalReference:{label:'Daniel 3:98-100; 4:1-3',edition:'catholic'},note:{nl:'De nummering verschilt per uitgave.',en:'The editions use different numbering.',fr:'La numérotation varie selon l’édition.'},targets:[{book:'DAN',chapter:3,verse:98,endVerse:100,edition:'catholic-nl'},{book:'DAN',chapter:4,verse:1,endVerse:3,edition:'catholic-nl'}]};
assert(dutchReader.openPersonPassage(mappedPassage));
assert.match(dutchEl.innerHTML,/Daniël 3:98–100/);assert.match(dutchEl.innerHTML,/Daniël 4:1–3/);
assert.match(dutchEl.innerHTML,/Oorspronkelijke verwijzing/);assert.match(dutchEl.innerHTML,/href="https:\/\/ebible.org\/engDRA\/DAN03.htm"/);
assert.match(dutchEl.innerHTML,/De nummering verschilt per uitgave/);
const highlighted=()=>Array.from(dutchReader.q('#reader-content').innerHTML.matchAll(/class="reader-verse is-target" id="reader-verse-(\d+)"/g),match=>Number(match[1]));
assert.deepEqual(highlighted(),[98,99,100],'Every verse in the target range is highlighted');
assert.equal(dutchReader.qa('[data-person-target]').length,2);
dutchReader.qa('[data-person-target]')[1].fire('click');
assert.deepEqual(plain(dutchReader.location),{bookId:'DAN',chapter:4,verse:1,endVerse:3});assert.deepEqual(highlighted(),[1,2,3]);
assert.equal(dutchReader.personPassage.selectedTarget,1);
const passageState=plain(dutchReader.getState());dutchReader.setState(passageState);assert.deepEqual(plain(dutchReader.getState()),passageState);
I.setLanguage('fr');dutchReader.render();assert.match(dutchEl.innerHTML,/La numérotation varie selon l/);assert.deepEqual(plain(dutchReader.getState()),passageState);I.setLanguage('nl');
dutchReader.openPersonPassage({...mappedPassage,status:'partial'});assert.match(dutchEl.innerHTML,/slechts gedeeltelijk/,'Partial correspondences are explicit');
dutchReader.q('#reader-chapter').fire('change',{target:{value:'4'}});assert.equal(dutchReader.personPassage,null);assert.equal(dutchReader.location.endVerse,undefined);
dutchReader.openPersonPassage({...mappedPassage,status:'unavailable',targets:[]});
assert.match(dutchEl.innerHTML,/geen gecontroleerde passage/);assert.doesNotMatch(dutchReader.q('#reader-content').innerHTML,/reader-verse/,'An unmapped citation must not leave an unrelated chapter visible as its result');
let retried=null;dutchReader.callbacks.onPersonPassageRetry=ref=>{retried=ref;};
dutchReader.openPersonPassage({...mappedPassage,status:'error',targets:[]});dutchReader.q('#person-passage-retry').fire('click');assert.deepEqual(plain(retried),mappedPassage.originalReference);
dutchReader.changeBook('GEN');assert.equal(dutchReader.personPassage,null);assert.match(dutchReader.q('#reader-content').innerHTML,/reader-verse/);
const variant=dutchData.books.flatMap(book=>book.chapters.flatMap(chapter=>chapter.verses.filter(verse=>/^[–-]+$/.test(verse.text.trim())&&verse.notes?.length).map(verse=>({book:book.id,chapter:chapter.number,verse:verse.number,endVerse:verse.number,edition:'catholic-nl'}))))[0];
assert(variant,'The edition includes explicit dash markers with textual notes');
assert(dutchReader.openPersonPassage({...mappedPassage,targets:[variant]}));
assert.match(dutchReader.q('#reader-content').innerHTML,/class="verse-notes" open/,'A targeted textual omission expands its explanation');
let cancelled=0;dutchReader.callbacks.onPersonPassageCancel=()=>{cancelled++;};
dutchReader.openPersonPassage({...mappedPassage,status:'loading',targets:[]});assert.match(dutchReader.q('#reader-content').innerHTML,/role="status"/);assert.doesNotMatch(dutchReader.q('#reader-content').innerHTML,/reader-verse/);
dutchReader.qa('[data-reader-book]')[0].fire('click');assert.equal(cancelled,1,'Manual book navigation cancels the in-flight person lookup');assert.equal(dutchReader.personPassage,null);
console.log('Catholic reader passed: Dutch/English 73-book editions, multilingual grouping, real added-book search, source-specific additions, edition callbacks, reference isolation and source-edition restoration.');
