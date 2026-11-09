(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fold=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[ٱأإآ]/g,'ا').toLowerCase();
 const local=v=>typeof v==='string'?v:v?.[root.BibleI18n?.language||'nl']??v?.en??'';
 const flatten=v=>typeof v==='string'?v:Array.isArray(v)?v.map(flatten).join(' '):v&&typeof v==='object'?Object.values(v).map(flatten).join(' '):'';
 const names={christianity:'Christendom · rooms-katholiek',judaism:'Jodendom',islam:'Islam'};
 const kinds={people:'Personen',places:'Plaatsen',topics:'Onderwerpen',events:'Tijdslijn',festivals:'Feestdagen & rituelen',texts:'Tekstpassages'};
 root.BibleI18n?.registerRows([['Search ReligieAtlas','Doorzoek ReligieAtlas','Rechercher dans ReligieAtlas'],['Find people, places, topics and scripture passages.','Vind personen, plaatsen, onderwerpen en tekstpassages.','Trouvez des personnes, lieux, thèmes et passages.'],['All religions','Alle religies','Toutes les religions'],['← Back to search results','← Terug naar zoekresultaten','← Retour aux résultats'],['This profile is not available.','Dit profiel is niet beschikbaar.','Ce profil est indisponible.'],['The profile could not load. Try again.','Het profiel kon niet worden geladen. Probeer opnieuw.','Le profil n’a pas pu être chargé. Réessayez.']]);
 class AtlasSearchModel{
  constructor(){this.records=new Map();}
  add(tradition,type,id,title,summary,extra='',action={}){
   const key=`${tradition}:${type}:${id}`,text=fold(flatten([title,summary,extra]));
   this.records.set(key,{key,tradition,type,id,title,summary,text,action});
  }
  search(query,{traditions=Object.keys(names),type='all'}={}){
   const terms=fold(query).trim().split(/\s+/).filter(Boolean),q=fold(query.trim());if(!terms.length)return [];
   const rank=r=>fold(local(r.title))===q?0:fold(local(r.title)).includes(q)?1:2;
   return [...this.records.values()].filter(r=>traditions.includes(r.tradition)&&(type==='all'||r.type===type)&&terms.every(t=>r.text.includes(t))).sort((a,b)=>rank(a)-rank(b)||local(a.title).localeCompare(local(b.title))||a.key.localeCompare(b.key));
  }
 }
 class AtlasSearchView{
  constructor(el,{load,onResult=()=>{},onPassage=()=>{}}={}){
   Object.assign(this,{el,load,onResult,onPassage});this.model=new AtlasSearchModel();this.state={query:'',traditions:Object.keys(names),type:'all',page:0,limit:6};this.generation=0;this.request=0;this.active=false;this.structured=[];this.texts=[];this.totalTexts=0;
   el.addEventListener('submit',e=>{e.preventDefault();this.state.query=el.querySelector('#atlas-search-query').value.trim().slice(0,200);this.state.page=0;this.state.limit=6;this.run();});
   el.addEventListener('change',e=>{if(e.target.matches('[data-search-religion]'))this.state.traditions=[...el.querySelectorAll('[data-search-religion]:checked')].map(c=>c.value);else if(e.target.id==='atlas-search-kind')this.state.type=e.target.value;else return;this.state.page=0;this.state.limit=6;this.run();});
   el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(d.searchResult!==undefined)this.onResult(this.structured[Number(d.searchResult)]);else if(d.searchText!==undefined){const r=this.texts[Number(d.searchText)];if(r)this.onPassage(r);}else if(d.searchPage){this.state.page+=Number(d.searchPage);this.run();}else if(d.searchMore){this.state.limit+=12;this.renderResults();}else if(d.searchRetry)this.run();else if(d.searchExample){this.state.query=d.searchExample;el.querySelector('#atlas-search-query').value=d.searchExample;this.run();}});
  }
  open(){this.active=true;this.render();return this.state.query?this.run():Promise.resolve();}
  leave(){this.active=false;this.generation++;this.request++;}
  render(){const s=this.state;this.el.innerHTML=`<form class="atlas-search-form"><label for="atlas-search-query">Doorzoek ReligieAtlas</label><div class="atlas-search-query-row"><input id="atlas-search-query" type="search" maxlength="200" placeholder="Naam, plaats, thema of verwijzing…" value="${esc(s.query)}"><button class="workspace-primary">Zoeken</button></div><div class="atlas-search-filters"><fieldset><legend>Religies</legend>${Object.entries(names).map(([id,label])=>`<label><input type="checkbox" data-search-religion value="${id}" ${s.traditions.includes(id)?'checked':''}> ${esc(label)}</label>`).join('')}</fieldset><label>Soort informatie<select id="atlas-search-kind">${[['all','Alles'],...Object.entries(kinds)].map(([id,label])=>`<option value="${id}" ${s.type===id?'selected':''}>${label}</option>`).join('')}</select></label></div></form><p class="atlas-search-status" role="status" aria-live="polite"></p><div class="atlas-search-results"></div>`;if(!s.query)this.el.querySelector('.atlas-search-results').innerHTML=`<p>Zoek binnen één of meer religies. De collecties blijven gescheiden.</p><div class="atlas-search-examples">${['Abraham','Jeruzalem','vrede','Ramadan','Johannes 3:16'].map(q=>`<button data-search-example="${q}">${q}</button>`).join('')}</div>`;}
  async run(){
   const generation=++this.generation,s=this.state;this.request++;this.structured=[];this.texts=[];this.totalTexts=0;this.textError='';this.loadError='';this.partial=false;this.textPending=false;this.pendingCollections=s.type==='texts'?0:s.traditions.length;this.started=Date.now();
   const status=this.el.querySelector('.atlas-search-status');delete status.dataset.firstResultMs;delete status.dataset.finalResultMs;
   if(!s.traditions.length){this.status('Kies minstens één religie.');this.el.querySelector('.atlas-search-results').innerHTML='';return;}
   if(!s.query.trim()){this.status('Voer een zoekterm in.');this.el.querySelector('.atlas-search-results').innerHTML='';return;}
   this.status('Zoeken…');this.el.querySelector('.atlas-search-results').innerHTML='';
   if(['all','texts'].includes(s.type))this.runTexts();
   if(s.type==='texts'){this.structured=[];return;}
   const jobs=s.traditions.map(async tradition=>{try{await this.load(tradition,this.model);}catch{if(this.generation===generation)this.loadError='Een collectie kon niet worden geladen. Andere resultaten blijven beschikbaar.';}if(generation===this.generation&&this.active){this.pendingCollections--;this.structured=this.model.search(s.query,s);this.renderResults();}});
   await Promise.all(jobs);if(generation===this.generation&&this.active){this.structured=this.model.search(s.query,s);this.renderResults();}
  }
  runTexts(){
   const id=++this.request;this.textPending=true;
   if(!this.worker){try{this.worker=new root.Worker('scripture-search-worker.js?v=20261109-workspace');this.worker.onmessage=e=>{const d=e.data;if(d.id!==this.request||!this.active)return;this.textPending=Boolean(d.partial);this.partial=Boolean(d.partial);if(d.error)this.textError=d.error;else{this.texts=d.results;this.totalTexts=d.total;}this.renderResults();};this.worker.onerror=()=>{this.worker?.terminate();this.worker=null;if(!this.active)return;this.textPending=false;this.textError='Tekstzoeken kon niet starten. Gebruik de zoekvelden in Heilige boeken of probeer opnieuw.';this.renderResults();};}catch{this.textPending=false;this.textError='Gebruik voor tekstzoeken de zoekvelden in Heilige boeken.';this.renderResults();return;}}
   this.worker.postMessage({id,query:this.state.query,traditions:[...this.state.traditions],page:this.state.page,mode:'all',topicId:''});
  }
  status(message){const status=this.el.querySelector('.atlas-search-status');if(status)status.textContent=message;}
  renderResults(){
   if(!this.active)return;const s=this.state,groups=Object.keys(kinds).filter(k=>k!=='texts').map(type=>[type,this.structured.filter(r=>r.type===type)]).filter(([,rows])=>rows.length);
   this.status(`${this.structured.length} ${this.structured.length===1?'resultaat':'resultaten'} in de atlas${this.pendingCollections?' · collecties worden geladen…':''}${['all','texts'].includes(s.type)?` · ${this.totalTexts} ${this.totalTexts===1?'tekstpassage':'tekstpassages'}${this.textPending?' · tekstzoeken loopt…':''}`:''}${this.loadError?' · '+this.loadError:''}`);
   const status=this.el.querySelector('.atlas-search-status');if((this.structured.length||this.texts.length)&&status.dataset.firstResultMs===undefined)status.dataset.firstResultMs=String(Date.now()-this.started);if(!this.pendingCollections&&!this.textPending)status.dataset.finalResultMs=String(Date.now()-this.started);
   const rawReference=r=>r.tradition==='islam'?`Koran ${r.book}:${r.verse}${r.endVerse>r.verse?'–'+r.endVerse:''}`:`${r.bookName||r.book} ${r.chapter}:${r.verse}${r.endVerse>r.verse?'–'+r.endVerse:''}`;
   const reference=r=>root.BibleI18n?.reference(rawReference(r))||rawReference(r);
   this.el.querySelector('.atlas-search-results').innerHTML=`${groups.map(([type,rows])=>`<section class="atlas-search-group"><h2>${kinds[type]} <small>${rows.length}</small></h2>${rows.slice(0,s.limit).map(r=>`<button class="atlas-search-hit" data-search-result="${this.structured.indexOf(r)}"><span class="library-kicker">${names[r.tradition]}</span><strong>${esc(local(r.title))}</strong><span>${esc(local(r.summary)).slice(0,240)}</span><span class="search-hit-action">Openen →</span></button>`).join('')}${rows.length>s.limit?'<button data-search-more="true">Meer resultaten tonen</button>':''}</section>`).join('')}${['all','texts'].includes(s.type)?`<section class="atlas-search-group"><h2>Tekstpassages <small>${this.totalTexts}</small></h2>${this.texts.map((r,i)=>`<article class="atlas-text-hit"><span class="library-kicker">${names[r.tradition]}</span><h3>${esc(reference(r))}</h3><p class="workspace-note">${r.topics?.length?'Thematische verwijzing · '+esc(r.topics.join(', ')):'Woorden in de tekst'}</p><p ${r.edition==='he'?'dir="rtl" lang="he"':''}>${esc(r.text)}</p><p class="workspace-note">${r.edition==='he'?'Hebreeuwse WLC':r.tradition==='judaism'?'Statenvertaling · christelijke Nederlandse vertaalhulp':r.tradition==='christianity'?'Nederlandse katholieke leeseditie · Canisius / Van Oers':'Nederlandse Koranvertaling · Dutch Islamic Center / Rowwad, QuranEnc'}${r.endVerse>r.verse?' · eerste vers van de passage':''}</p><button data-search-text="${i}">Lees passage →</button></article>`).join('')}${this.textError?`<p>${esc(this.textError)}</p><button data-search-retry="true">Opnieuw proberen</button>`:''}${this.totalTexts>30?`<div class="atlas-search-pagination"><button data-search-page="-1" ${s.page===0?'disabled':''}>← Vorige</button><span>Pagina ${s.page+1} van ${Math.ceil(this.totalTexts/30)}</span><button data-search-page="1" ${(s.page+1)*30>=this.totalTexts?'disabled':''}>Volgende →</button></div>`:''}</section>`:''}${!this.structured.length&&!this.totalTexts&&!this.textPending&&!this.pendingCollections?'<p>Geen resultaten. Probeer een andere schrijfwijze, een korter woord of een extra religie.</p>':''}`;
  }
 }
 root.AtlasSearchModel=AtlasSearchModel;root.AtlasSearchView=AtlasSearchView;
 if(typeof module!=='undefined')module.exports={AtlasSearchModel,fold};
})(typeof window!=='undefined'?window:globalThis);
