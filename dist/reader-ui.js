(function () {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bookGroups=[['The Law',0,5],['History',5,17],['Poetry & wisdom',17,22],['Major prophets',22,27],['Minor prophets',27,39],['The Gospels',39,43],['Acts',43,44],['Letters',44,65],['Revelation',65,66]];
  class BibleReader {
    constructor(container,model,people,places,callbacks={}) {
      this.el=container;this.model=model;this.callbacks=callbacks;
      this.people=new Map(people.people.map(p=>[p.id,p]));this.places=new Map((places.places||[]).map(p=>[p.id,p]));
      this.books=model.books();this.location={bookId:this.books[0].id,chapter:1,verse:null};this.scope='all';this.query='';this.page=0;this.mode='read';this.showLinks=true;
      this.render();
    }
    open(reference) {
      const parsed=typeof reference==='string'?this.model.reference(reference):reference;
      if(parsed){const chapter=this.model.chapter(parsed.bookId,parsed.chapter);if(chapter&&(!parsed.verse||chapter.verses.some(v=>v.number===parsed.verse))&&(!parsed.endVerse||chapter.verses.some(v=>v.number===parsed.endVerse))){this.location={bookId:parsed.bookId,chapter:parsed.chapter,verse:parsed.verse||null};this.mode='read';this.render();return true;}}
      return !reference;
    }
    groupFor(book){const index=this.books.findIndex(b=>b.id===book.id);return bookGroups.find(g=>index>=g[1]&&index<g[2])?.[0]||'';}
    render() {
      const book=this.books.find(b=>b.id===this.location.bookId);
      this.el.innerHTML=`<div class="reader-topline"><div><span class="library-kicker">THE COMPLETE SCRIPTURES</span><h2>Read the story.</h2></div><div class="reader-edition">World English Bible<small>66 books · Old & New Testament · Public domain</small></div></div>
        <form class="reader-search" id="reader-search-form"><label class="reader-query-label"><span class="sr-only">Search Scripture or enter a reference</span><input id="reader-query" type="search" placeholder="Search words, a phrase, or John 3:16…" value="${esc(this.query)}" autocomplete="off"></label><select id="reader-scope" aria-label="Search scope"><option value="all">All Scripture</option><option value="OT">Old Testament</option><option value="NT">New Testament</option><option value="book">Current book</option></select><button type="submit">Search</button></form>
        <div class="reader-shell"><aside class="reader-books"><div class="reader-books-heading">THE LIBRARY <span>66</span></div><div class="reader-book-list">${bookGroups.map(([name,start,end])=>`<details ${this.books.slice(start,end).some(b=>b.id===book.id)?'open':''}><summary>${name}</summary>${this.books.slice(start,end).map(b=>`<button data-reader-book="${esc(b.id)}" class="${b.id===book.id?'active':''}" ${b.id===book.id?'aria-current="page"':''}>${esc(b.name)}<span>${b.chapterCount}</span></button>`).join('')}</details>`).join('')}</div></aside>
        <div class="reader-main"><div class="reader-navigation"><label><span>BOOK</span><select id="reader-book" aria-label="Bible book">${this.books.map(b=>`<option value="${esc(b.id)}" ${b.id===book.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label><label><span>CHAPTER</span><select id="reader-chapter" aria-label="Bible chapter">${Array.from({length:book.chapterCount},(_,i)=>`<option value="${i+1}" ${i+1===this.location.chapter?'selected':''}>${i+1}</option>`).join('')}</select></label><div class="reader-chapter-arrows"><button id="reader-previous" aria-label="Previous chapter" ${book.id===this.books[0].id&&this.location.chapter===1?'disabled':''}>←</button><button id="reader-next" aria-label="Next chapter" ${book.id===this.books.at(-1).id&&this.location.chapter===book.chapterCount?'disabled':''}>→</button></div></div>
        <div id="reader-content"></div></div></div>
        <div class="reader-credit">World English Bible (Protestant edition), public domain. <a href="https://ebible.org/engwebp/" target="_blank" rel="noopener noreferrer">Text source ↗</a> · <a href="data-notes.html" target="_blank" rel="noopener noreferrer">Name-link methodology & credits ↗</a></div>
        <dialog class="reader-entity-dialog" id="reader-entity-dialog" aria-labelledby="reader-entity-title"><button class="reader-dialog-close" aria-label="Close name choices">×</button><div id="reader-entity-content"></div></dialog>`;
      this.q('#reader-scope').value=this.scope;
      this.q('#reader-search-form').addEventListener('submit',e=>{e.preventDefault();this.query=this.q('#reader-query').value.trim();this.scope=this.q('#reader-scope').value;this.page=0;const ref=this.model.reference(this.query);if(ref&&this.open(ref))return;this.mode=this.query?'search':'read';this.renderContent();});
      this.q('#reader-scope').addEventListener('change',()=>{this.scope=this.q('#reader-scope').value;if(this.mode==='search'){this.page=0;this.renderContent();}});
      this.q('#reader-book').addEventListener('change',e=>this.changeBook(e.target.value));
      this.q('#reader-chapter').addEventListener('change',e=>{this.location.chapter=Number(e.target.value);this.location.verse=null;this.mode='read';this.render();});
      this.qa('[data-reader-book]').forEach(b=>b.addEventListener('click',()=>this.changeBook(b.dataset.readerBook)));
      this.q('#reader-previous').addEventListener('click',()=>this.move(-1));this.q('#reader-next').addEventListener('click',()=>this.move(1));
      this.q('.reader-dialog-close').addEventListener('click',()=>this.q('#reader-entity-dialog').close());
      this.renderContent();
    }
    q(selector){return this.el.querySelector(selector);}qa(selector){return [...this.el.querySelectorAll(selector)];}
    changeBook(bookId){this.location={bookId,chapter:1,verse:null};this.mode='read';this.render();}
    move(delta){let i=this.books.findIndex(b=>b.id===this.location.bookId),chapter=this.location.chapter+delta;if(chapter<1&&i>0){i--;chapter=this.books[i].chapterCount;}else if(chapter>this.books[i].chapterCount&&i<this.books.length-1){i++;chapter=1;}if(chapter<1||chapter>this.books[i].chapterCount)return;this.location={bookId:this.books[i].id,chapter,verse:null};this.mode='read';this.render();}
    renderContent(){
      if(this.mode==='search'){this.renderSearch();return;}
      const chapter=this.model.chapter(this.location.bookId,this.location.chapter),book=this.books.find(b=>b.id===this.location.bookId);
      this.annotations=[];
      this.q('#reader-content').innerHTML=`<div class="reader-chapter-heading"><span class="library-kicker">${book.testament==='OT'?'OLD TESTAMENT':'NEW TESTAMENT'} / ${esc(this.groupFor(book)).toUpperCase()}</span><h3>${esc(chapter.bookName)} <span>${chapter.number}</span></h3><div class="reader-link-legend"><label><input type="checkbox" id="reader-show-links" ${this.showLinks?'checked':''}> Link names</label><span><i class="person"></i>People & genealogies</span><span><i class="place"></i>Cities</span></div></div><p class="reader-name-hint">Select an underlined name to explore. Dotted names are possible matches or namesakes; choose the identity that fits the passage.</p>
        <article class="reader-verses" aria-label="${esc(chapter.bookName)} chapter ${chapter.number}">${chapter.verses.map(v=>`${(chapter.headings||[]).filter(h=>h.beforeVerse===v.number).map(h=>`<p class="reader-superscription">${this.renderVerse(h)}</p>`).join('')}<div class="reader-verse ${v.number===this.location.verse?'is-target':''}" id="reader-verse-${v.number}" data-verse="${v.number}"><span class="verse-number" aria-label="Verse ${v.number}">${v.number}</span><div><p class="verse-text">${this.renderVerse(v)||'<span class="verse-variant-placeholder">See the textual note for this verse.</span>'}</p>${v.notes?.length?`<details class="verse-notes" ${!v.text?'open':''}><summary>Textual ${v.notes.length===1?'note':'notes'}</summary>${v.notes.map(note=>`<p>${esc(note)}</p>`).join('')}</details>`:''}</div></div>`).join('')}</article><div class="reader-bottom-nav"><button data-reader-move="-1">← Previous chapter</button><span>${esc(book.name)} ${chapter.number}</span><button data-reader-move="1">Next chapter →</button></div>`;
      this.q('#reader-show-links').addEventListener('change',e=>{this.showLinks=e.target.checked;this.renderContent();});
      this.qa('[data-annotation]').forEach(b=>b.addEventListener('click',()=>this.openEntity(this.annotations[Number(b.dataset.annotation)])));
      this.qa('[data-reader-move]').forEach(b=>{const delta=Number(b.dataset.readerMove);b.disabled=delta<0?book.id===this.books[0].id&&chapter.number===1:book.id===this.books.at(-1).id&&chapter.number===book.chapterCount;b.addEventListener('click',()=>this.move(delta));});
      const target=this.location.verse?this.q(`#reader-verse-${this.location.verse}`):null;
      if(target)requestAnimationFrame(()=>{if(!this.el.hidden)target.scrollIntoView({block:'center'});});
    }
    renderVerse(verse){
      if(!this.showLinks)return esc(verse.text);
      let output='',cursor=0;
      for(const span of verse.annotations||[]){
        if(span.start<cursor||span.end>verse.text.length||span.end<=span.start)continue;
        output+=esc(verse.text.slice(cursor,span.start));
        const index=this.annotations.push(span)-1, place=!(span.personIds?.length)&&span.placeIds?.length, uncertain=span.ambiguous||span.match!=='verse'||(span.personIds?.length||0)+(span.placeIds?.length||0)>1;
        output+=`<button class="verse-entity ${place?'place':'person'} ${uncertain?'possible':''}" data-annotation="${index}" aria-label="Explore ${esc(span.text)}${uncertain?' — possible identities':''}">${esc(verse.text.slice(span.start,span.end))}</button>`;cursor=span.end;
      }
      return output+esc(verse.text.slice(cursor));
    }
    openEntity(span){
      const candidates=[...(span.personIds||[]).map(id=>({kind:'person',item:this.people.get(id)})),...(span.placeIds||[]).map(id=>({kind:'place',item:this.places.get(id)}))].filter(c=>c.item);
      if(candidates.length===1&&span.match==='verse'&&!span.ambiguous){const c=candidates[0];this.callbacks[c.kind==='person'?'onPerson':'onPlace']?.(c.item.id);return;}
      const content=this.q('#reader-entity-content');
      content.innerHTML=`<span class="library-kicker">FOLLOW A NAME</span><h3 id="reader-entity-title">${esc(span.text)}</h3><p>${span.note?esc(span.note):span.match==='verse'?'More than one indexed identity may fit this passage.':'This spelling matches the collection, but the exact identity is not verified for this verse.'} Choose a person or city to explore.</p><div class="reader-entity-choices">${candidates.map((c,i)=>`<button data-entity-choice="${i}"><span class="entity-kind">${c.kind==='person'?'PERSON':'CITY'}</span><strong>${esc(c.item.name)}</strong><small>${esc(c.item.disambiguation||c.item.description||c.item.refs?.[0]?.label||'')}</small></button>`).join('')}</div>`;
      content.querySelectorAll('[data-entity-choice]').forEach(b=>b.addEventListener('click',()=>{const c=candidates[Number(b.dataset.entityChoice)];this.q('#reader-entity-dialog').close();this.callbacks[c.kind==='person'?'onPerson':'onPlace']?.(c.item.id);}));
      this.q('#reader-entity-dialog').showModal();
    }
    renderSearch(){
      const result=this.model.search(this.query,{testament:['OT','NT'].includes(this.scope)?this.scope:'all',bookId:this.scope==='book'?this.location.bookId:null,limit:40,offset:this.page*40});
      this.q('#reader-content').innerHTML=`<div class="reader-search-heading"><div><span class="library-kicker">SEARCH THE SCRIPTURES</span><h3>${result.total.toLocaleString()} ${result.total===1?'verse':'verses'} found</h3><p>Results for “${esc(this.query)}” in canonical book order.</p></div><button id="reader-return">Back to chapter</button></div><div class="reader-search-results">${result.results.map((v,i)=>`<button class="reader-search-result" data-reader-result="${i}"><strong>${esc(v.bookName)} ${v.chapter}:${v.verse}</strong><span>${esc(v.text)}</span><small>Read this chapter →</small></button>`).join('')||'<div class="library-empty">No verses match. Try a shorter phrase or a different search scope.</div>'}</div><div class="reader-results-pagination"><button id="reader-results-prev" ${this.page===0?'disabled':''}>← Previous</button><span>${result.total?`${this.page*40+1}–${Math.min((this.page+1)*40,result.total)} of ${result.total.toLocaleString()}`:'0 results'}</span><button id="reader-results-next" ${(this.page+1)*40>=result.total?'disabled':''}>Next →</button></div>`;
      this.q('#reader-return').addEventListener('click',()=>{this.mode='read';this.renderContent();});
      this.qa('[data-reader-result]').forEach(b=>b.addEventListener('click',()=>{const v=result.results[Number(b.dataset.readerResult)];this.open({bookId:v.bookId,chapter:v.chapter,verse:v.verse});}));
      this.q('#reader-results-prev').addEventListener('click',()=>{this.page--;this.renderContent();this.q('#reader-content').scrollIntoView({block:'start'});});
      this.q('#reader-results-next').addEventListener('click',()=>{this.page++;this.renderContent();this.q('#reader-content').scrollIntoView({block:'start'});});
    }
  }
  window.BibleReader=BibleReader;
})();
