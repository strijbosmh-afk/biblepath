(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t=(s,p)=>window.BibleI18n.t(s,p),tr=(s,p)=>esc(t(s,p));
  const url=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
  class SacredReader {
    constructor(el,model){
      this.el=el;this.model=model;this.language=window.BibleI18n.language;this.key=`biblepath-reader-${model.tradition}`;
      let saved={};try{saved=JSON.parse(localStorage.getItem(this.key)||'{}')||{};}catch{}
      this.positions=saved.positions&&typeof saved.positions==='object'?saved.positions:{};
      this.edition=model.editions[saved.edition]?saved.edition:model.defaultEdition(this.language);
      this.location=model.location(this.edition,this.positions[this.edition]);this.tab='read';this.query='';this.scope='all';this.page=0;this.showOriginal=saved.showOriginal!==false;
      this.handlers={click:e=>this.click(e),change:e=>this.change(e),submit:e=>this.submit(e),input:e=>this.input(e)};
      for(const [event,handler] of Object.entries(this.handlers))el.addEventListener(event,handler);
      this.render();
    }
    destroy(){this.save();for(const [event,handler] of Object.entries(this.handlers))this.el.removeEventListener(event,handler);}
    getState(){return {edition:this.edition,location:{...this.location},tab:this.tab,query:this.query,scope:this.scope};}
    save(){this.positions[this.edition]={...this.location};try{localStorage.setItem(this.key,JSON.stringify({edition:this.edition,positions:this.positions,showOriginal:this.showOriginal}));}catch{}}
    changeLanguage(){const previous=this.language;if(previous===window.BibleI18n.language)return;this.language=window.BibleI18n.language;if(this.edition===previous&&this.model.editions[this.language])this.selectEdition(this.language);else this.render();}
    selectEdition(edition){if(!this.model.editions[edition])return;this.save();this.edition=edition;this.location=this.model.location(edition,this.positions[edition]);this.query='';this.page=0;this.tab='read';this.render();}
    open(location){this.location=this.model.location(this.edition,location);this.tab='read';this.render();}
    format(location){const u=this.model.units(this.language).find(u=>u.id===location.unit),range=location.verse&&location.endVerse>location.verse?`–${location.endVerse}`:'';return (this.model.tradition==='islam'?`${u.name}${location.verse?` · ${location.unit}:${location.verse}`:''}`:`${u.name} ${location.chapter}${location.verse?`:${location.verse}`:''}`)+range;}
    noteKey(){return `${this.key}-note-${this.edition}-${this.location.unit}-${this.location.chapter}`;}
    input(e){if(e.target.id==='sacred-query')this.query=e.target.value;if(e.target.id==='sacred-note')this.noteDraft=e.target.value;}
    click(e){
      const b=e.target.closest('button');if(!b||!this.el.contains(b))return;
      if(b.dataset.unit)this.open({unit:b.dataset.unit,chapter:1});
      if(b.dataset.tab){this.tab=b.dataset.tab;this.render();}
      if(b.dataset.move){const next=this.model.move(this.edition,this.location,Number(b.dataset.move));if(next)this.open(next);}
      if(b.dataset.result!==undefined){const result=this.results?.[Number(b.dataset.result)];if(result)this.open({unit:result.unit,chapter:result.chapter,verse:result.verse});}
      if(b.dataset.page){this.page=Math.max(0,this.page+Number(b.dataset.page));this.render();}
      if(b.id==='sacred-save-note'){
        const text=this.el.querySelector('#sacred-note').value;let message='Note saved.';
        try{localStorage.setItem(this.noteKey(),text);}catch{message='This browser could not save your note. Copy it before leaving this page.';}
        this.el.querySelector('#sacred-note-status').textContent=t(message);
      }
    }
    change(e){
      const {id,value}=e.target;
      if(id==='sacred-edition')this.selectEdition(value);
      if(id==='sacred-unit')this.open({unit:value,chapter:1});
      if(id==='sacred-chapter')this.open({...this.location,chapter:Number(value),verse:null});
      if(id==='sacred-verse')this.open({...this.location,verse:Number(value),endVerse:null});
      if(id==='sacred-scope'){this.scope=value;this.page=0;if(this.tab==='search')this.render();}
      if(id==='sacred-original'){this.showOriginal=e.target.checked;this.render();}
    }
    submit(e){if(e.target.id!=='sacred-search')return;e.preventDefault();this.query=this.el.querySelector('#sacred-query').value.trim();this.page=0;
      const reference=this.model.reference(this.query,this.edition,this.language);if(reference){this.open(reference);return;}
      this.invalidReference=/\d\s*:\s*\d/.test(this.query);this.tab=this.query?'search':'read';this.render();
    }
    render(){
      const m=this.model,meta=m.edition(this.edition),units=m.units(this.language),unit=units.find(u=>u.id===this.location.unit),quran=m.tradition==='islam';
      const chapters=m.chapters(this.edition,unit.id),verses=m.verses(this.edition,unit.id,this.location.chapter),title=quran?'Qur’an':'Tanakh';
      const groups=quran?[['surahs','Surahs']]:[['torah','Torah'],['prophets','Prophets'],['writings','Writings']];
      const editionLabels={he:'Hebrew original',ar:'Arabic original',nl:'Dutch translation',en:'English translation',fr:'French translation'};
      const note=typeof meta.contextNote==='object'?meta.contextNote[this.language]:meta.contextNote;
      this.el.innerHTML=`<div class="reader-topline"><div><span class="library-kicker">${tr(quran?'Islam':'Judaism')}</span><h2>${tr(title)}</h2><p class="sacred-summary">${tr(quran?'114 surahs · 6,236 ayahs':'24 canonical books · 39 navigation sections')}</p></div><label class="sacred-edition"><span>${tr('Text edition')}</span><select id="sacred-edition" aria-label="${tr('Text edition')}">${Object.keys(m.editions).map(id=>`<option value="${esc(id)}" ${id===this.edition?'selected':''}>${tr(editionLabels[id]||id)} · ${esc(m.edition(id).title)}</option>`).join('')}</select></label></div>
      <div class="sacred-edition-context"><strong>${esc(meta.title)}</strong>${note?`<p>${esc(note)}</p>`:''}<p>${tr('Each edition has its own numbering and saved reading position.')}</p></div>
      <form class="reader-search" id="sacred-search"><label class="reader-query-label"><span class="sr-only">${tr('Search this edition or enter a reference')}</span><input id="sacred-query" type="search" value="${esc(this.query)}" placeholder="${tr('Words or {example}…',{example:quran?'2:255':`${units[0].name} 1:1`})}"></label><select id="sacred-scope" aria-label="${tr('Search scope')}"><option value="all">${tr('Entire edition')}</option><option value="unit" ${this.scope==='unit'?'selected':''}>${tr('Current book or surah')}</option></select><button>${tr('Search')}</button></form>
      <div class="reader-shell"><aside class="reader-books"><div class="reader-book-list">${groups.map(([key,label])=>`<details ${unit.group===key?'open':''}><summary>${tr(label)}</summary>${units.filter(u=>u.group===key).map(u=>`<button data-unit="${esc(u.id)}" class="${u.id===unit.id?'active':''}" ${u.id===unit.id?'aria-current="page"':''}>${esc(u.name)}</button>`).join('')}</details>`).join('')}</div></aside><div class="reader-main">
      <div class="reader-navigation sacred-navigation"><label><span>${tr(quran?'Surah':'Book')}</span><select id="sacred-unit" aria-label="${tr('Book or surah')}">${units.map(u=>`<option value="${esc(u.id)}" ${unit.id===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></label>${quran?'':`<label><span>${tr('Chapter')}</span><select id="sacred-chapter" aria-label="${tr('Chapter')}">${chapters.map(c=>`<option ${c===this.location.chapter?'selected':''}>${c}</option>`).join('')}</select></label>`}<label><span>${tr(quran?'Ayah':'Verse')}</span><select id="sacred-verse" aria-label="${tr(quran?'Ayah':'Verse')}"><option value="">—</option>${verses.map(v=>`<option ${v.number===this.location.verse?'selected':''}>${v.number}</option>`).join('')}</select></label></div>
      <div class="sacred-tabs" role="group" aria-label="${tr('Read passage')}">${[['read','Scripture'],['commentary','Commentary & sources'],['notes','My notes']].map(([key,label])=>`<button data-tab="${key}" aria-pressed="${this.tab===key}">${tr(label)}</button>`).join('')}</div>
      <div class="sacred-content">${this.tab==='search'?this.renderSearch():this.tab==='commentary'?this.renderSources():this.tab==='notes'?this.renderNotes():this.renderPassage(verses)}</div>
      <div class="reader-bottom-nav"><button data-move="-1" ${m.move(this.edition,this.location,-1)?'':'disabled'}>← ${tr('Previous reading')}</button><span>${esc(this.format(this.location))}</span><button data-move="1" ${m.move(this.edition,this.location,1)?'':'disabled'}>${tr('Next reading')} →</button></div></div></div><div class="reader-credit">${this.credit(meta)}${quran&&this.edition!=='ar'?`<br>${tr('Original text')}: ${this.credit(m.edition('ar'))}`:''}</div>`;
      this.save();if(this.location.verse&&this.tab==='read')requestAnimationFrame(()=>{if(!this.el.hidden)this.el.querySelector('.sacred-verse.is-target')?.scrollIntoView({block:'center'});});
    }
    renderPassage(verses){
      const headings=this.model.headings(this.edition,this.location.unit,this.location.chapter);
      const quran=this.model.tradition==='islam',meta=this.model.edition(this.edition),rtl=['he','ar'].includes(this.edition),surah=quran?this.model.data.surahs.find(s=>String(s.number)===this.location.unit):null;
      return `<h3 class="sacred-heading">${esc(this.format({...this.location,verse:null}))}</h3>${quran&&this.edition!=='ar'?`<label class="sacred-original-control"><input id="sacred-original" type="checkbox" ${this.showOriginal?'checked':''}> ${tr('Show Arabic original')}</label>`:''}${surah?.bismillah&&(this.showOriginal||this.edition==='ar')?`<div class="sacred-bismillah"><small>${tr('Unnumbered opening formula')}</small><p lang="ar" dir="rtl">${esc(surah.bismillah)}</p></div>`:''}<article class="sacred-verses" aria-label="${esc(this.format(this.location))}">${verses.map(v=>`${headings.filter(h=>h.beforeVerse===v.number).map(h=>`<p class="reader-superscription" lang="${esc(meta.language)}">${esc(h.text)}</p>`).join('' )}<div class="sacred-verse ${this.location.verse&&v.number>=this.location.verse&&v.number<=(this.location.endVerse||this.location.verse)?'is-target':''}"><span class="verse-number">${v.number}</span><div>${v.original&&this.showOriginal?`<p class="sacred-original" dir="rtl" lang="ar" translate="no">${esc(v.original)}</p>`:''}<p class="verse-text ${rtl?'sacred-original':''}" lang="${esc(meta.language||this.edition)}" dir="${rtl?'rtl':'ltr'}" translate="no">${esc(v.text)}</p>${v.notes?.length?`<details class="verse-notes"><summary>${tr('Translation note')}</summary>${(Array.isArray(v.notes)?v.notes:[v.notes]).map(n=>`<p>${esc(n)}</p>`).join('')}</details>`:''}</div></div>`).join('')}</article>`;
    }
    renderSearch(){
      if(this.invalidReference)return `<p class="sacred-message" role="status">${tr('This reference does not exist in the selected edition.')}</p>`;
      const result=this.model.search(this.query,this.edition,{unit:this.scope==='unit'?this.location.unit:null,offset:this.page*40});this.results=result.results;
      return `<div class="reader-search-heading"><h3>${tr('{count} results',{count:result.total.toLocaleString(this.language)})}</h3><button data-tab="read">${tr('Back to chapter')}</button></div><div class="reader-search-results">${result.results.map((v,i)=>`<button class="reader-search-result" data-result="${i}"><strong>${esc(this.format({...v,verse:v.verse}))}</strong><span dir="${['ar','he'].includes(this.edition)?'rtl':'ltr'}">${esc(v.text)}</span><small>${tr('Read')} →</small></button>`).join('')||`<p>${tr('No matches in this edition.')}</p>`}</div><div class="reader-results-pagination"><button data-page="-1" ${this.page?'':'disabled'}>${tr('Previous')}</button><span>${this.page+1} / ${Math.max(1,Math.ceil(result.total/40))}</span><button data-page="1" ${(this.page+1)*40>=result.total?'disabled':''}>${tr('Next')}</button></div>`;
    }
    credit(meta){const source=url(meta.sourcePage||meta.sourceUrl),license=url(meta.licenseUrl);return `${esc(meta.credit||meta.title)}${meta.publisher?` · ${esc(meta.publisher)}`:''}${meta.version?` · ${tr('Version')} ${esc(meta.version)}`:''} · ${license?`<a href="${esc(license)}" target="_blank" rel="noopener noreferrer">${esc(meta.license)}</a>`:esc(meta.license)}${source?` · <a href="${esc(source)}" target="_blank" rel="noopener noreferrer">${tr('Source')} ↗</a>`:''}`;}
    renderSources(){const quran=this.model.tradition==='islam';return `<div class="sacred-panel"><h3>${tr('Commentary & sources')}</h3><p>${tr('Scripture and commentary are shown separately.')}</p><a class="sacred-source-link" href="${quran?`https://quran.com/${encodeURIComponent(this.location.unit)}/${this.location.verse||1}/tafsirs`:'https://www.sefaria.org/texts/Tanakh'}" target="_blank" rel="noopener noreferrer">${tr(quran?'Explore tafsir on Quran.com':'Explore Jewish commentary on Sefaria')} ↗</a><p>${tr('Commentary opens on the source website. Its authors and editions may differ from this reader.')}</p><h4>${tr('Edition and attribution')}</h4><p>${this.credit(this.model.edition(this.edition))}</p></div>`;}
    renderNotes(){let note='';try{note=localStorage.getItem(this.noteKey())||'';}catch{}return `<div class="sacred-panel"><h3>${tr('My notes')}</h3><p>${esc(this.format({...this.location,verse:null}))} · ${esc(this.model.edition(this.edition).title)}</p><label for="sacred-note">${tr('Your reflection on this reading')}</label><textarea id="sacred-note" rows="8">${esc(note)}</textarea><p>${tr('Notes stay in this browser on this device.')}</p><button class="solid-button" id="sacred-save-note">${tr('Save note')}</button><p id="sacred-note-status" role="status"></p></div>`;}
  }
  window.SacredReader=SacredReader;
})();
