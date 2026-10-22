(function () {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t=(s,p)=>window.BibleI18n?.t(s,p)??String(s).replace(/\{(\w+)\}/g,(match,key)=>p?.[key]??match);
  const tr=(s,p)=>esc(t(s,p));
  const language=()=>window.BibleI18n?.language||'en';
  const number=value=>Number(value).toLocaleString(language());
  const bookName=book=>window.BibleI18n?.bookName(book.id)||book.name;
  const containsVerse=(verse,number)=>verse.number<=number&&number<=(verse.endNumber||verse.number);
  const rangeLabel=range=>`${bookName({id:range.book||range.bookId,name:range.book||range.bookId})} ${range.chapter}:${range.verse}${range.endVerse>range.verse?'–'+range.endVerse:''}`;
  const reference=value=>window.BibleI18n?.reference(String(value??''))||String(value??'');
  const safeUrl=value=>{try{const url=new URL(value);return /^https?:$/.test(url.protocol)?url.href:'';}catch{return '';}};
  const bookGroups=[['The Law','GEN EXO LEV NUM DEU'],['History','JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH TOB JDT EST 1MA 2MA'],['Poetry & wisdom','JOB PSA PRO ECC SNG WIS SIR'],['Major prophets','ISA JER LAM BAR EZK DAN'],['Minor prophets','HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL'],['The Gospels','MAT MRK LUK JHN'],['Acts','ACT'],['Letters','ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD'],['Revelation','REV']].map(([name,ids])=>[name,new Set(ids.split(' '))]);
  class BibleReader {
    constructor(container,model,people,places,callbacks={}) {
      this.el=container;this.model=model;this.selectedModel=model;this.atlasContext=null;this.personPassage=null;this.callbacks=callbacks;
      this.people=new Map(people.people.map(p=>[p.id,p]));this.places=new Map((places.places||[]).map(p=>[p.id,p]));
      this.books=model.books();this.location={bookId:this.books[0].id,chapter:1,verse:null};this.scope='all';this.query='';this.page=0;this.mode='read';this.showLinks=true;
      this.render();
    }
    open(reference,{preservePersonPassage=false}={}) {
      const parsed=typeof reference==='string'?this.model.reference(reference):reference;
      if(parsed){const chapter=this.model.chapter(parsed.bookId,parsed.chapter);if(chapter&&(!parsed.verse||chapter.verses.some(v=>containsVerse(v,parsed.verse)))&&(!parsed.endVerse||parsed.endVerse>=parsed.verse&&chapter.verses.some(v=>containsVerse(v,parsed.endVerse)))){if(!preservePersonPassage)this.personPassage=null;this.location={bookId:parsed.bookId,chapter:parsed.chapter,verse:parsed.verse||null,...(parsed.endVerse>parsed.verse?{endVerse:parsed.endVerse}:{})};this.mode='read';this.render();return true;}}
      return !reference;
    }
    openPersonPassage(passage){
      if(this.selectedModel.meta?.editionId!=='catholic-nl')return false;
      this.model=this.selectedModel;this.books=this.model.books();this.atlasContext=null;
      const targets=(passage.targets||[]).map(target=>this.model.reference(target)).filter(Boolean).map(target=>({book:target.bookId,chapter:target.chapter,verse:target.verse,endVerse:target.endVerse,edition:'catholic-nl'}));
      const status=targets.length?(targets.length===(passage.targets||[]).length?passage.status:'partial'):(['error','loading'].includes(passage.status)?passage.status:'unavailable');
      this.personPassage={...passage,status,targets,selectedTarget:0};this.query='';this.page=0;this.mode='read';
      if(targets.length)return this.openPersonTarget(0);
      this.render();return true;
    }
    openPersonTarget(index){
      const target=this.personPassage?.targets[index];if(!target)return false;
      this.personPassage.selectedTarget=index;
      return this.open(this.model.reference(target),{preservePersonPassage:true});
    }
    cancelPersonPassage(){if(this.personPassage)this.callbacks.onPersonPassageCancel?.();this.personPassage=null;}
    renderPersonPassage(){
      const passage=this.personPassage;if(!passage)return '';
      const message={loading:'Loading the corresponding Dutch passage…',mapped:'Reading the corresponding passage in the Dutch Catholic Bible.',partial:'Only part of this source reference has a verified Dutch correspondence. Unmapped verses are not silently substituted.',unavailable:'This source reference has no verified passage in this Dutch edition. Use the original source below.',error:'The passage links could not load. Try again.'}[passage.status];
      const source=safeUrl(passage.sourceUrl);
      const note=typeof passage.note==='object'?passage.note?.[language()]||passage.note?.en:passage.note;
      return `<aside class="reader-edition-notice person-passage-notice" role="note"><strong>${tr('Passage from the people index')}</strong><p>${tr(message)}</p>${note?`<p>${tr(note)}</p>`:''}<p>${tr('Original reference: {reference}',{reference:reference(passage.sourceLabel)})}${source?` · <a href="${esc(source)}" target="_blank" rel="noopener noreferrer">${tr('Original source')} ↗</a>`:''}</p>${passage.targets.length?`<nav class="person-passage-targets" aria-label="${tr('Corresponding Dutch passages')}">${passage.targets.map((target,index)=>`<button type="button" data-person-target="${index}" ${index===passage.selectedTarget?'aria-current="true"':''}>${esc(rangeLabel(target))}</button>`).join('')}</nav>`:''}${passage.status==='error'?`<button type="button" id="person-passage-retry">${tr('Try again')}</button>`:''}</aside>`;
    }
    openAtlas(reference,sourceModel) {
      const aligned=this.selectedModel.atlasReference(reference);
      if(aligned){
        if(this.atlasContext)this.restoreSelectedEdition();
        return this.open(aligned);
      }
      const sourceReference=sourceModel?.reference(reference);
      if(!sourceReference)return false;
      const selectedState=this.atlasContext?.selectedState||this.getState();
      this.atlasContext={reference:typeof reference==='string'?reference:reference.label,selectedState};
      this.model=sourceModel;this.sourceModel=sourceModel;this.books=sourceModel.books();
      this.query='';this.page=0;
      return this.open(sourceReference);
    }
    restoreSelectedEdition() {
      const state=this.atlasContext?.selectedState;
      this.model=this.selectedModel;this.books=this.model.books();this.atlasContext=null;
      if(state)this.setState(state);else this.render();
    }
    groupFor(book){return bookGroups.find(([,ids])=>ids.has(book.id))?.[0]||'';}
    getState(){return {location:{...this.location},scope:this.scope,query:this.q('#reader-query')?.value??this.query,page:this.page,mode:this.mode,showLinks:this.showLinks,...(this.personPassage?{personPassage:{...this.personPassage,targets:this.personPassage.targets.map(target=>({...target}))}}:{}),...(this.atlasContext?{atlasReference:this.atlasContext.reference,selectedEditionState:this.atlasContext.selectedState}:{})};}
    setState(state={},sourceModel){
      this.model=this.selectedModel;this.books=this.model.books();this.atlasContext=null;this.personPassage=null;
      const currentReference=state.location?`${state.location.bookId} ${state.location.chapter}:${state.location.verse||1}`:'';
      if(state.atlasReference&&!this.selectedModel.atlasReference(currentReference)){
        if(!sourceModel)return this.setState(state.selectedEditionState||{});
        this.model=sourceModel;this.sourceModel=sourceModel;this.books=sourceModel.books();
        this.atlasContext={reference:state.atlasReference,selectedState:state.selectedEditionState||{}};
      }
      const book=this.books.find(item=>item.id===state.location?.bookId)||this.books[0];
      const chapter=Math.max(1,Math.min(book.chapterCount,Number(state.location?.chapter)||1));
      const verses=this.model.chapter(book.id,chapter)?.verses||[];
      this.location={bookId:book.id,chapter,verse:verses.some(v=>containsVerse(v,state.location?.verse))?state.location.verse:null};
      if(this.location.verse&&state.location?.endVerse>this.location.verse&&verses.some(v=>containsVerse(v,state.location.endVerse)))this.location.endVerse=state.location.endVerse;
      if(!this.atlasContext&&this.model.meta?.editionId==='catholic-nl'&&state.personPassage){
        const targets=(state.personPassage.targets||[]).filter(target=>this.model.reference(target));
        this.personPassage={...state.personPassage,targets:targets.map(target=>({...target})),selectedTarget:Math.max(0,Math.min(targets.length-1,state.personPassage.selectedTarget||0))};
      }
      this.scope=['all','OT','NT','book'].includes(state.scope)?state.scope:'all';
      this.query=String(state.query??'');this.page=Math.max(0,Math.floor(Number(state.page)||0));
      this.mode=state.mode==='search'&&this.query?'search':'read';this.showLinks=state.showLinks!==false;
      this.render();return this;
    }
    render() {
      const book=this.books.find(b=>b.id===this.location.bookId);
      const meta=this.model.meta||{},edition=meta.title||meta.abbreviation||t('Bible'),license=t(meta.license||'Public domain'),source=meta.sourcePage==='data-notes.html#dutch-catholic'?meta.sourcePage:safeUrl(meta.sourcePage||meta.sourceUrl);
      const completeCatholic=meta.canon==='catholic'&&this.books.length===73;
      const editionOptions=this.callbacks?.editionOptions||[];
      const englishAdditions=[{book:'EST',chapter:10,verse:4,label:'Esther additions'},{book:'DAN',chapter:3,verse:24,label:'Prayer and song in Daniel'},{book:'DAN',chapter:13,verse:1,label:'Susanna'},{book:'DAN',chapter:14,verse:1,label:'Bel and the dragon'},{book:'BAR',chapter:6,verse:1,label:'Letter of Jeremiah'}];
      // Addition coordinates belong to the text edition. In particular, the
      // Dutch Esther additions must not inherit Douay-Rheims coordinates.
      const additionLinks=meta.catholicNavigation||(meta.editionId==='catholic'?englishAdditions:[]);
      const canonicalLinks=[...['TOB','JDT','WIS','SIR','BAR','1MA','2MA'].map(id=>({book:id,chapter:1,verse:1,label:bookName({id,name:id})})),...additionLinks.map(link=>({...link,label:t(link.label)}))].filter(link=>this.model.reference(link));
      const textLanguage=t({nl:'Dutch',en:'English',fr:'French'}[meta.language]||meta.language||'');
      this.el.innerHTML=`<div class="reader-topline"><div><span class="library-kicker">${tr('Roman Catholic perspective')}</span><h2>${tr('Read the story.')}</h2></div><div class="reader-edition">${editionOptions.length?`<label class="reader-edition-picker"><span>${tr('Bible text edition')}</span><select id="reader-edition" aria-label="${tr('Bible text edition')}">${editionOptions.map(option=>`<option value="${esc(option.id)}" ${option.id===this.callbacks.editionId?'selected':''}>${tr(option.label)}</option>`).join('')}</select></label>`:esc(edition)}<small>${tr('{count} books · Old & New Testament · {license}',{count:number(this.books.length),license})}</small></div></div>
        <aside class="catholic-context"><p>${tr(completeCatholic?'Complete Catholic Bible: 73 books, including the additions to Esther and Daniel.':'This selected edition contains 66 shared books. Choose the Dutch Catholic Bible or Douay-Rheims for all 73 books.')} ${completeCatholic?tr('The scripture text is in {language}.',{language:textLanguage}):''}</p><details><summary>${tr(completeCatholic?'Deuterocanonical books and additions':'Text edition and Catholic canon')}</summary><p>${tr(completeCatholic?'The Dutch Catholic Bible and English Douay-Rheims each preserve their own text, verse numbering and reading position. Sources and supplements are credited below. Person references open their verified Dutch correspondence; the original source stays available separately.':'The World English Bible, Statenvertaling and Louis Segond are additional 66-book editions. Complete Catholic editions are available in Dutch and English (Douay-Rheims).')}</p>${completeCatholic?`<nav class="reader-catholic-links" aria-label="${tr('Deuterocanonical books and additions')}">${canonicalLinks.map(link=>`<button type="button" data-catholic-book="${esc(link.book)}" data-catholic-chapter="${link.chapter}" data-catholic-verse="${link.verse}">${esc(link.label)}</button>`).join('')}</nav>`:''}<a href="https://www.vatican.va/content/catechism/en/part_one/section_one/chapter_two/article_3/iv_the_canon_of_scripture.html" target="_blank" rel="noopener noreferrer">${tr('Catholic canon · Catechism §120')} ↗</a></details></aside>
        ${this.atlasContext?`<div class="reader-edition-notice" role="note"><p>${tr('This city reference uses atlas verse numbering. Reading the English World English Bible so the cited passage is accurate; numbering in your selected edition may differ.')}</p><button type="button" id="reader-selected-edition">${tr('Return to {edition}',{edition:this.selectedModel.meta.title})}</button></div>`:''}
        ${this.renderPersonPassage()}
        <form class="reader-search" id="reader-search-form"><label class="reader-query-label"><span class="sr-only">${tr('Search Scripture or enter a reference')}</span><input id="reader-query" type="search" placeholder="${tr('Search words, a phrase, or {reference}…',{reference:reference('John 3:16')})}" value="${esc(this.query)}" autocomplete="off"></label><select id="reader-scope" aria-label="${tr('Search scope')}"><option value="all">${tr('All Scripture')}</option><option value="OT">${tr('Old Testament')}</option><option value="NT">${tr('New Testament')}</option><option value="book">${tr('Current book')}</option></select><button type="submit">${tr('Search')}</button></form>
        <div class="reader-shell"><aside class="reader-books"><div class="reader-books-heading">${tr('THE LIBRARY')} <span>${this.books.length}</span></div><div class="reader-book-list">${bookGroups.map(([name,ids])=>`<details ${ids.has(book.id)?'open':''}><summary>${tr(name)}</summary>${this.books.filter(b=>ids.has(b.id)).map(b=>`<button data-reader-book="${esc(b.id)}" class="${b.id===book.id?'active':''}" ${b.id===book.id?'aria-current="page"':''}>${esc(bookName(b))}<span>${b.chapterCount}</span></button>`).join('')}</details>`).join('')}</div></aside>
        <div class="reader-main"><div class="reader-navigation"><label><span>${tr('BOOK')}</span><select id="reader-book" aria-label="${tr('Bible book')}">${this.books.map(b=>`<option value="${esc(b.id)}" ${b.id===book.id?'selected':''}>${esc(bookName(b))}</option>`).join('')}</select></label><label><span>${tr('CHAPTER')}</span><select id="reader-chapter" aria-label="${tr('Bible chapter')}">${Array.from({length:book.chapterCount},(_,i)=>`<option value="${i+1}" ${i+1===this.location.chapter?'selected':''}>${i+1}</option>`).join('')}</select></label><div class="reader-chapter-arrows"><button id="reader-previous" aria-label="${tr('Previous chapter')}" ${book.id===this.books[0].id&&this.location.chapter===1?'disabled':''}>←</button><button id="reader-next" aria-label="${tr('Next chapter')}" ${book.id===this.books.at(-1).id&&this.location.chapter===book.chapterCount?'disabled':''}>→</button></div></div>
        <div id="reader-content"></div></div></div>
        <div class="reader-credit">${meta.credit?tr(meta.credit):tr('{edition}, {license}.',{edition,license})} ${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">${tr('Text source')} ↗</a> · `:''}<a href="data-notes.html" target="_blank" rel="noopener noreferrer">${tr('Name-link methodology & credits')} ↗</a>${meta.versificationNote?`<br>${tr(meta.versificationNote)}`:''}</div>
        <dialog class="reader-entity-dialog" id="reader-entity-dialog" aria-labelledby="reader-entity-title"><button class="reader-dialog-close" aria-label="${tr('Close name choices')}">×</button><div id="reader-entity-content"></div></dialog>`;
      this.q('#reader-scope').value=this.scope;
      this.q('#reader-edition')?.addEventListener('change',event=>this.callbacks?.onEditionChange?.(event.target.value));
      this.qa('[data-catholic-book]').forEach(button=>button.addEventListener('click',()=>{this.cancelPersonPassage();this.open({bookId:button.dataset.catholicBook,chapter:Number(button.dataset.catholicChapter),verse:Number(button.dataset.catholicVerse)});}));
      this.q('#reader-selected-edition')?.addEventListener('click',()=>this.restoreSelectedEdition());
      this.qa('[data-person-target]').forEach(button=>button.addEventListener('click',()=>this.openPersonTarget(Number(button.dataset.personTarget))));
      this.q('#person-passage-retry')?.addEventListener('click',()=>this.callbacks.onPersonPassageRetry?.(this.personPassage.originalReference));
      this.q('#reader-search-form').addEventListener('submit',e=>{e.preventDefault();this.cancelPersonPassage();this.query=this.q('#reader-query').value.trim();this.scope=this.q('#reader-scope').value;this.page=0;const ref=this.model.reference(this.query);if(ref&&this.open(ref))return;this.mode=this.query?'search':'read';this.render();});
      this.q('#reader-scope').addEventListener('change',()=>{this.scope=this.q('#reader-scope').value;if(this.mode==='search'){this.page=0;this.renderContent();}});
      this.q('#reader-book').addEventListener('change',e=>this.changeBook(e.target.value));
      this.q('#reader-chapter').addEventListener('change',e=>{this.cancelPersonPassage();this.location={bookId:this.location.bookId,chapter:Number(e.target.value),verse:null};this.mode='read';this.render();});
      this.qa('[data-reader-book]').forEach(b=>b.addEventListener('click',()=>this.changeBook(b.dataset.readerBook)));
      this.q('#reader-previous').addEventListener('click',()=>this.move(-1));this.q('#reader-next').addEventListener('click',()=>this.move(1));
      this.q('.reader-dialog-close').addEventListener('click',()=>this.q('#reader-entity-dialog').close());
      this.renderContent();
    }
    q(selector){return this.el.querySelector(selector);}qa(selector){return [...this.el.querySelectorAll(selector)];}
    changeBook(bookId){this.cancelPersonPassage();this.location={bookId,chapter:1,verse:null};this.mode='read';this.render();}
    move(delta){let i=this.books.findIndex(b=>b.id===this.location.bookId),chapter=this.location.chapter+delta;if(chapter<1&&i>0){i--;chapter=this.books[i].chapterCount;}else if(chapter>this.books[i].chapterCount&&i<this.books.length-1){i++;chapter=1;}if(chapter<1||chapter>this.books[i].chapterCount)return;this.cancelPersonPassage();this.location={bookId:this.books[i].id,chapter,verse:null};this.mode='read';this.render();}
    renderContent(){
      if(this.personPassage&&!this.personPassage.targets.length){this.q('#reader-content').innerHTML=`<div class="library-empty" ${this.personPassage.status==='loading'?'role="status"':''}>${tr(this.personPassage.status==='loading'?'Loading the corresponding Dutch passage…':this.personPassage.status==='error'?'Retry the passage lookup above or choose a book to continue reading.':'Choose a book to continue reading, or consult the original source above.')}</div>`;return;}
      if(this.mode==='search'){this.renderSearch();return;}
      const chapter=this.model.chapter(this.location.bookId,this.location.chapter),book=this.books.find(b=>b.id===this.location.bookId);
      const numberingNote=this.model.meta?.verseIdentityUncertainBooks?.includes(book.id)?this.model.meta.versificationNote:null;
      const annotationNotice=this.model.meta?.editionId==='catholic-nl'?'Name links in the text are editorial suggestions; they do not by themselves establish a person’s identity in a verse. Reading buttons in person profiles use separately reviewed Dutch passage correspondences.':this.model.meta.annotationNotice;
      this.annotations=[];
      this.q('#reader-content').innerHTML=`<div class="reader-chapter-heading"><span class="library-kicker">${tr(book.testament==='OT'?'Old Testament':'New Testament').toLocaleUpperCase(language())} / ${tr(this.groupFor(book)).toLocaleUpperCase(language())}</span><h3>${esc(bookName(book))} <span>${chapter.number}</span></h3><div class="reader-link-legend"><label><input type="checkbox" id="reader-show-links" ${this.showLinks?'checked':''}> ${tr('Link names')}</label><span><i class="person"></i>${tr('People & genealogies')}</span><span><i class="place"></i>${tr('Cities')}</span></div></div><p class="reader-name-hint">${tr('Select an underlined name to explore. Dotted names are possible matches or namesakes; choose the identity that fits the passage.')}</p>${numberingNote?`<details class="reader-versification-note"><summary>${tr('About verse numbering')}</summary><p>${tr(numberingNote)}</p></details>`:''}${annotationNotice?`<p class="reader-name-hint" role="note">${tr(annotationNotice)}</p>`:''}
        <article class="reader-verses" aria-label="${tr('{book} chapter {chapter}',{book:bookName(book),chapter:chapter.number})}">${chapter.verses.map(v=>`${(chapter.headings||[]).filter(h=>h.beforeVerse===v.number).map(h=>`<p class="reader-superscription">${this.renderVerse(h)}</p>`).join('')}<div class="reader-verse ${this.location.verse&&v.number<=(this.location.endVerse||this.location.verse)&&(v.endNumber||v.number)>=this.location.verse?'is-target':''}" id="reader-verse-${v.number}" data-verse="${v.number}"><span class="verse-number" aria-label="${tr('Verse {verse}',{verse:v.numberLabel||v.number})}">${esc(v.numberLabel||v.number)}</span><div><p class="verse-text">${this.renderVerse(v)||`<span class="verse-variant-placeholder">${tr('See the textual note for this verse.')}</span>`}</p>${v.notes?.length?`<details class="verse-notes" ${!v.text||/^[–-]+$/.test(v.text.trim())&&this.location.verse&&v.number<=(this.location.endVerse||this.location.verse)&&(v.endNumber||v.number)>=this.location.verse?'open':''}><summary>${tr(v.notes.length===1?'Textual note':'Textual notes')}</summary>${v.notes.map(note=>`<p>${esc(note)}</p>`).join('')}${safeUrl(v.sourceUrl)?`<a href="${esc(safeUrl(v.sourceUrl))}" target="_blank" rel="noopener noreferrer">${tr('Verse source')} ↗</a>`:''}</details>`:''}</div></div>`).join('')}</article><div class="reader-bottom-nav"><button data-reader-move="-1">← ${tr('Previous chapter')}</button><span>${esc(bookName(book))} ${chapter.number}</span><button data-reader-move="1">${tr('Next chapter')} →</button></div>`;
      this.q('#reader-show-links').addEventListener('change',e=>{this.showLinks=e.target.checked;this.renderContent();});
      this.qa('[data-annotation]').forEach(b=>b.addEventListener('click',()=>this.openEntity(this.annotations[Number(b.dataset.annotation)])));
      this.qa('[data-reader-move]').forEach(b=>{const delta=Number(b.dataset.readerMove);b.disabled=delta<0?book.id===this.books[0].id&&chapter.number===1:book.id===this.books.at(-1).id&&chapter.number===book.chapterCount;b.addEventListener('click',()=>this.move(delta));});
      const targetVerse=chapter.verses.find(v=>containsVerse(v,this.location.verse));
      const target=targetVerse?this.q(`#reader-verse-${targetVerse.number}`):null;
      if(target)requestAnimationFrame(()=>{if(!this.el.hidden)target.scrollIntoView({block:'center'});});
    }
    renderVerse(verse){
      if(!this.showLinks)return esc(verse.text);
      let output='',cursor=0;
      for(const span of verse.annotations||[]){
        if(span.start<cursor||span.end>verse.text.length||span.end<=span.start)continue;
        output+=esc(verse.text.slice(cursor,span.start));
        const index=this.annotations.push(span)-1, place=!(span.personIds?.length)&&span.placeIds?.length, uncertain=span.ambiguous||span.match!=='verse'||(span.personIds?.length||0)+(span.placeIds?.length||0)>1;
        output+=`<button class="verse-entity ${place?'place':'person'} ${uncertain?'possible':''}" data-annotation="${index}" aria-label="${tr(uncertain?'Explore {name} — possible identities':'Explore {name}',{name:span.text})}">${esc(verse.text.slice(span.start,span.end))}</button>`;cursor=span.end;
      }
      return output+esc(verse.text.slice(cursor));
    }
    openEntity(span){
      const candidates=[...(span.personIds||[]).map(id=>({kind:'person',item:this.people.get(id)})),...(span.placeIds||[]).map(id=>({kind:'place',item:this.places.get(id)}))].filter(c=>c.item);
      if(candidates.length===1&&span.match==='verse'&&!span.ambiguous){const c=candidates[0];this.callbacks[c.kind==='person'?'onPerson':'onPlace']?.(c.item.id);return;}
      const content=this.q('#reader-entity-content');
      content.innerHTML=`<span class="library-kicker">${tr('FOLLOW A NAME')}</span><h3 id="reader-entity-title">${esc(span.text)}</h3><p>${tr(span.note||(span.match==='verse'?'More than one indexed identity may fit this passage.':'This spelling matches the collection, but the exact identity is not verified for this verse.'))} ${tr('Choose a person or city to explore.')}</p><div class="reader-entity-choices">${candidates.map((c,i)=>`<button data-entity-choice="${i}"><span class="entity-kind">${tr(c.kind==='person'?'PERSON':'CITY')}</span><strong>${esc(c.item.name)}</strong><small>${esc(c.item.disambiguation||c.item.description||reference(c.item.refs?.[0]?.label||''))}</small></button>`).join('')}</div>`;
      content.querySelectorAll('[data-entity-choice]').forEach(b=>b.addEventListener('click',()=>{const c=candidates[Number(b.dataset.entityChoice)];this.q('#reader-entity-dialog').close();this.callbacks[c.kind==='person'?'onPerson':'onPlace']?.(c.item.id);}));
      this.q('#reader-entity-dialog').showModal();
    }
    renderSearch(){
      const options={testament:['OT','NT'].includes(this.scope)?this.scope:'all',bookId:this.scope==='book'?this.location.bookId:null,limit:40};
      let result=this.model.search(this.query,{...options,offset:this.page*40});
      const lastPage=Math.max(0,Math.ceil(result.total/40)-1);if(this.page>lastPage){this.page=lastPage;result=this.model.search(this.query,{...options,offset:this.page*40});}
      this.q('#reader-content').innerHTML=`<div class="reader-search-heading"><div><span class="library-kicker">${tr('SEARCH THE SCRIPTURES')}</span><h3>${tr(result.total===1?'{count} verse found':'{count} verses found',{count:number(result.total)})}</h3><p>${tr('Results for “{query}” in canonical book order.',{query:this.query})}</p></div><button id="reader-return">${tr('Back to chapter')}</button></div><div class="reader-search-results">${result.results.map((v,i)=>`<button class="reader-search-result" data-reader-result="${i}"><strong>${esc(bookName({id:v.bookId,name:v.bookName}))} ${v.chapter}:${esc(v.numberLabel||v.verse)}</strong><span>${esc(v.text)}</span><small>${tr('Read this chapter')} →</small></button>`).join('')||`<div class="library-empty">${tr('No verses match. Try a shorter phrase or a different search scope.')}</div>`}</div><div class="reader-results-pagination"><button id="reader-results-prev" ${this.page===0?'disabled':''}>← ${tr('Previous')}</button><span>${result.total?tr('{start}–{end} of {total}',{start:number(this.page*40+1),end:number(Math.min((this.page+1)*40,result.total)),total:number(result.total)}):tr('0 results')}</span><button id="reader-results-next" ${(this.page+1)*40>=result.total?'disabled':''}>${tr('Next')} →</button></div>`;
      this.q('#reader-return').addEventListener('click',()=>{this.mode='read';this.renderContent();});
      this.qa('[data-reader-result]').forEach(b=>b.addEventListener('click',()=>{const v=result.results[Number(b.dataset.readerResult)];this.open({bookId:v.bookId,chapter:v.chapter,verse:v.verse});}));
      this.q('#reader-results-prev').addEventListener('click',()=>{this.page--;this.renderContent();this.q('#reader-content').scrollIntoView({block:'start'});});
      this.q('#reader-results-next').addEventListener('click',()=>{this.page++;this.renderContent();this.q('#reader-content').scrollIntoView({block:'start'});});
    }
  }
  window.BibleReader=BibleReader;
})();
