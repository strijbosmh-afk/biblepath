/* Timeline, reflection and indexed scripture search. Data load only on navigation. */
(function(root){
 'use strict';
 const I=()=>root.BibleI18n;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={christianity:'Christendom · rooms-katholiek',judaism:'Jodendom',islam:'Islam'};
 const rows=[
  ['Timeline','Tijdslijn','Chronologie'],
  ['Reflection challenge','Uitdaging','Défi de réflexion'],
  ['Search by topic','Zoeken op thema','Recherche thématique'],
  ['Explore major moments, with sources and historical context.','Verken belangrijke momenten, met bronnen en historische context.','Explorez les grands moments, leurs sources et leur contexte historique.'],
  ['Read, pause and reflect in the context of each tradition.','Lees, vertraag en reflecteer binnen de context van elke traditie.','Lisez, prenez le temps et réfléchissez dans le contexte de chaque tradition.'],
  ['Find themes and passages in one or more religions.','Vind thema’s en passages binnen één of meerdere religies.','Trouvez des thèmes et des passages dans une ou plusieurs religions.'],
  ['← Back to exploration','← Terug naar verkennen','← Retour à l’exploration']
 ];
 I()?.registerRows(rows);
 const date=y=>y<0?`${Math.abs(y)} v.Chr.`:`${y} n.Chr.`;
 const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
 const fold=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const cache=new Map();
 function load(file){
  if(!cache.has(file))cache.set(file,fetch(file).then(r=>{if(!r.ok)throw Error(file);return r.json()}).catch(e=>{cache.delete(file);throw e}));
  return cache.get(file);
 }
 class TimelineModel{
  constructor(events){
   this.events=events.filter(e=>Number.isFinite(e.start)).slice().sort((a,b)=>a.start-b.start);
   this.min=Math.min(...this.events.map(e=>e.start))-30;
   this.max=Math.max(...this.events.map(e=>e.end||e.start))+30;
  }
  matches(filter='',kind='all'){
   return this.events.filter(e=>(kind==='all'||e.kind===kind)&&fold([e.title,e.summary,e.context,e.what,e.faithImpact,e.category,e.dateLabel,e.start,e.end,...(e.stakeholders||[]).flatMap(s=>[s.name,s.role])].join(' ')).includes(fold(filter)));
  }
  visible({width,scroll=0,zoom=1,filter='',kind='all'}){
   const scale=width*zoom/(this.max-this.min),matches=this.matches(filter,kind);
   const buckets=new Map();
   for(const e of matches){
    const x=(e.start-this.min)*scale;
    if(x<scroll-250||x>scroll+width+250)continue;
    const key=Math.floor(x/190);
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(e);
   }
   return [...buckets.values()].map(entries=>({events:entries,x:(entries[0].start-this.min)*scale}));
  }
 }
 class AtlasExplore{
  constructor(container,{onPassage=()=>{}}={}){
   this.el=container;this.onPassage=onPassage;this.states=new Map();this.request=0;
   this.worker=null;this.searchId=0;this.searchState={query:'',traditions:['christianity'],page:0,mode:'all',topicId:''};
   this.view='';this.tradition='christianity';this.passages=[];
   this.onClick=e=>this.click(e);this.onInput=e=>this.input(e);this.onChange=e=>this.change(e);
   this.el.addEventListener('click',this.onClick);this.el.addEventListener('input',this.onInput);this.el.addEventListener('change',this.onChange);
   this.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(this.view==='timeline'&&!this.el.hidden)this.paintTimeline()}):null;
  }
  get state(){
   const key=`${this.view}:${this.tradition}`;
   if(!this.states.has(key))this.states.set(key,{zoom:1,scroll:0,selected:null,filter:'',kind:'all',pillar:'all',topic:'all',challenge:0,seen:[]});
   return this.states.get(key);
  }
  async open(view,tradition){
   const language=I()?.language||'nl';
   const same=this.view===view&&this.tradition===tradition&&this.language===language;
   this.language=language;this.view=view;this.tradition=tradition;
   const req=++this.request;
   this.resizeObserver?.disconnect();clearTimeout(this.debounce);
   if(same&&this.el.childElementCount&&this.loaded){
    if(view==='timeline')this.resizeObserver?.observe(this.el);
    if(view==='topics'&&this.searchPending)this.runSearch({keepResults:true});
    return;
   }
   this.loaded=false;
   this.el.innerHTML='<p class="library-loading" role="status">Dit onderdeel wordt geladen…</p>';
   try{
    const file={timeline:'timeline-events.json',challenge:'reflection-challenges.json',topics:'scripture-topics.json'}[view];
    const data=await load(file);
    if(req!==this.request||this.el.hidden)return;
    this.data=data;this.loaded=true;this.passages=[];
    if(view==='timeline')this.renderTimeline();
    if(view==='challenge')this.renderChallenge();
    if(view==='topics')this.renderSearch();
   }catch(e){
    if(req===this.request&&!this.el.hidden){
     this.el.innerHTML='<p role="alert">Dit onderdeel kon niet worden geladen.</p><button class="explore-btn" data-action="retry">Opnieuw proberen</button>';
     this.loaded=false;
    }
   }
  }
  leave(){this.request++;this.searchId++;clearTimeout(this.debounce);this.resizeObserver?.disconnect()}
  note(){return I()?.language!=='nl'?'<p class="explore-note" lang="nl">De redactionele inhoud van deze nieuwe onderdelen is in het Nederlands.</p>':''}
  sources(sources=[]){
   return `<ul class="explore-sources">${sources.filter(s=>safeUrl(s.url)).map(s=>`<li><a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></li>`).join('')}</ul>`;
  }
  passageButton(p,label='Lees de passage →'){
   if(!p)return '';
   const id=this.passages.push({...p})-1;
   return `<button class="explore-btn" data-passage="${id}">${esc(label)}</button>`;
  }
  renderTimeline(){
   const entries=this.data.traditions[this.tradition]||[];
   this.model=new TimelineModel(entries);
   this.state.selected||=entries.find(e=>e.start>=0)?.id||entries[0]?.id;
   this.el.innerHTML=`${this.note()}
    <div class="explore-panel">
     <div class="explore-toolbar">
      <label class="explore-search-label">Zoek in de tijdslijn<input type="search" id="timeline-query" placeholder="Gebeurtenis, periode of thema…" value="${esc(this.state.filter)}"></label>
      <label>Soort<select id="timeline-kind"><option value="all">Alle gebeurtenissen</option><option value="history">Geschiedenis</option><option value="tradition">Overlevering</option><option value="text">Tekstgeschiedenis</option></select></label>
      <div class="explore-zoom" role="group" aria-label="Tijdslijn zoomen"><button data-action="zoom-out" aria-label="Tijdslijn uitzoomen">−</button><output id="timeline-zoom">100%</output><button data-action="zoom-in" aria-label="Tijdslijn inzoomen">+</button></div>
      <button class="explore-btn" data-action="overview">Hele tijdslijn</button>
     </div>
     <div class="timeline-legend"><span>${entries.length} gebeurtenissen · ${esc(names[this.tradition])}</span><span id="timeline-period"></span></div>
     <div class="atlas-timeline-scroll" tabindex="0" aria-label="Tijdslijn: sleep of scroll horizontaal; gebruik plus, min en de pijltjestoetsen"><div class="atlas-timeline-track"><div class="atlas-timeline-axis"></div><div class="atlas-timeline-items"></div></div></div>
     <div class="timeline-bottom"><div><button class="explore-btn" data-action="pan-left" aria-label="Eerder in de tijdslijn">←</button><button class="explore-btn" data-action="pan-right" aria-label="Later in de tijdslijn">→</button></div><p>Scroll of sleep van links naar rechts. Zoom voor meer detail; selecteer een moment voor de context.</p></div>
     <label class="timeline-range-label">Positie in de geschiedenis<input id="timeline-range" type="range" min="0" max="1000" value="0" aria-label="Positie in de tijdslijn"></label>
     <p class="explore-note">${esc(this.data.meta?.scopeNote||this.data.meta?.selectionNote||this.data.meta?.scope||'Een brede, redactionele selectie. Religieuze verhalen en historische dateringen worden afzonderlijk aangeduid. Een tijdslijn kan niet elke gebeurtenis of interpretatie omvatten.')}</p>
    </div>
    <p id="timeline-match-count" role="status"></p>
    <article class="explore-panel timeline-detail" id="timeline-detail"></article>
    <details class="explore-undated"><summary>Verhalen zonder historische datering</summary><div id="timeline-undated"></div></details>`;
   this.el.querySelector('#timeline-kind').value=this.state.kind;
   const scroll=this.el.querySelector('.atlas-timeline-scroll');
   this.timelineMarkup=null;
   scroll.scrollLeft=this.state.scroll;this.bindTimelineGestures(scroll);
   this.paintTimeline();scroll.scrollLeft=this.state.scroll;this.renderTimelineDetail();
   this.resizeObserver?.observe(this.el);
   const undated=this.data.undated?.[this.tradition]||[];
   this.el.querySelector('#timeline-undated').innerHTML=undated.map(e=>`<article><h3>${esc(e.title)}</h3><p>${esc(e.what||e.context||e.summary)}</p>${this.stakeholders(e)}<h3>Betekenis voor geloof en praktijk</h3><p>${esc(e.faithImpact||e.context)}</p>${e.nuance?`<p class="explore-note">${esc(e.nuance)}</p>`:''}${this.sources(e.sources)}${this.passageButton(e.passage)}</article>`).join('')||'<p>Gedateerde gebeurtenissen staan hierboven. De afwezigheid van een datum zegt niets over de religieuze betekenis van een verhaal.</p>';
  }
  bindTimelineGestures(scroll){
   scroll.onscroll=()=>{this.state.scroll=scroll.scrollLeft;this.queueTimeline()};
   scroll.onwheel=e=>{
    if(e.ctrlKey){e.preventDefault();this.zoomTimeline(e.deltaY<0?1.2:1/1.2,e.clientX-scroll.getBoundingClientRect().left)}
    else if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){
     if(this.state.zoom<=1)return;
     const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?scroll.clientWidth:1),max=scroll.scrollWidth-scroll.clientWidth;
     if((delta>0&&scroll.scrollLeft<max-1)||(delta<0&&scroll.scrollLeft>1)){e.preventDefault();scroll.scrollLeft+=delta;}
    }
   };
   let dragging=false,x=0,y=0,left=0,moved=false;const pointers=new Map();let distance=0;
   const separation=()=>{const p=[...pointers.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};
   scroll.onpointerdown=e=>{
    if(e.button>0)return;
    if(!pointers.size)moved=false;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){distance=separation();dragging=false;moved=true;for(const id of pointers.keys())scroll.setPointerCapture(id);}
    else{dragging=true;x=e.clientX;y=e.clientY;left=scroll.scrollLeft;}
   };
   scroll.onpointermove=e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){
     const vals=[...pointers.values()],next=separation();
     if(distance>5)this.zoomTimeline(next/distance,(vals[0].x+vals[1].x)/2-scroll.getBoundingClientRect().left);
     distance=next;
    }else if(dragging){
     const dx=e.clientX-x,dy=e.clientY-y;
     if(!moved&&Math.abs(dx)>6&&Math.abs(dx)>Math.abs(dy)){moved=true;scroll.setPointerCapture(e.pointerId);}
     if(moved){if(e.cancelable)e.preventDefault();scroll.scrollLeft=left-dx;}
    }
   };
   scroll.onpointerup=scroll.onpointercancel=scroll.onlostpointercapture=e=>{pointers.delete(e.pointerId);dragging=false;distance=0};
   scroll.onclick=e=>{if(moved&&e.detail!==0){e.preventDefault();e.stopPropagation();}};
   scroll.onkeydown=e=>{
    if(e.target!==scroll&&!e.target.closest('.atlas-timeline-event'))return;
    if(['+','=','-','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
     e.preventDefault();
     if(e.key==='+'||e.key==='=')this.zoomTimeline(1.5);
     else if(e.key==='-')this.zoomTimeline(1/1.5);
     else if(e.key==='Home')scroll.scrollLeft=0;
     else if(e.key==='End')scroll.scrollLeft=scroll.scrollWidth;
     else scroll.scrollLeft+=e.key==='ArrowLeft'?-250:250;
    }
   };
  }
  queueTimeline(){
   if(this.raf)return;
   this.raf=requestAnimationFrame(()=>{this.raf=null;if(this.view==='timeline'&&!this.el.hidden)this.paintTimeline()});
  }
  paintTimeline(){
   const scroll=this.el.querySelector('.atlas-timeline-scroll');
   if(!scroll||!this.model)return;
   const width=scroll.clientWidth||800,s=this.state,full=width*s.zoom,scale=full/(this.model.max-this.model.min),resized=s.width&&s.width!==width,position=resized?s.scroll*width/s.width:scroll.scrollLeft;
   this.el.querySelector('.atlas-timeline-track').style.width=`${full}px`;
   if(resized)scroll.scrollLeft=position;
   s.width=width;s.scroll=scroll.scrollLeft;
   const clusters=this.model.visible({width,scroll:scroll.scrollLeft,zoom:s.zoom,filter:s.filter,kind:s.kind});
   let html='';
   const span=(this.model.max-this.model.min)/s.zoom;
   const step=[1,2,5,10,25,50,100,250,500,1000,2500].find(n=>n>=span/8)||5000;
   const first=Math.floor((this.model.min+scroll.scrollLeft/scale)/step)*step;
   for(let y=first;y<Math.min(this.model.max,first+span+step*2);y+=step){
    if(y===0)continue;
    html+=`<span class="atlas-timeline-tick" style="left:${(y-this.model.min)*scale}px">${date(y)}</span>`;
   }
   clusters.forEach(c=>{
    const selected=c.events.some(e=>e.id===s.selected),e=c.events[0];
    const lane=Math.floor(c.x/190)%2;
    const cardLeft=Math.max(0,Math.min(full-183,c.x-8));
    html+=`<button class="atlas-timeline-event ${lane?'below':''} ${selected?'selected':''}" style="left:${cardLeft}px;--timeline-pin:${c.x-cardLeft}px" ${c.events.length>1?`data-cluster="${c.events.map(e=>esc(e.id)).join(',')}"`:`data-event="${esc(e.id)}"`} aria-pressed="${selected}"><span>${esc(e.dateLabel||date(e.start))}${c.events.length>1?' – '+esc(c.events.at(-1).dateLabel||date(c.events.at(-1).start)):''}</span><strong>${c.events.length>1?`${c.events.length} gebeurtenissen`:esc(e.title)}</strong><small>${c.events.length>1?'Zoom om te verkennen +':esc(e.category||{history:'Geschiedenis',text:'Tekst',tradition:'Overlevering'}[e.kind])}</small></button>`;
   });
   const items=this.el.querySelector('.atlas-timeline-items');
   if(this.timelineMarkup!==html){
    const focused=items.contains?.(this.el.ownerDocument?.activeElement);
    items.innerHTML=html;this.timelineMarkup=html;if(focused)scroll.focus({preventScroll:true});
   }
   this.el.querySelector('#timeline-zoom').textContent=`${Math.round(s.zoom*100)}%`;
   const begin=this.model.min+scroll.scrollLeft/scale,end=Math.min(this.model.max,begin+span);
   this.el.querySelector('#timeline-period').textContent=`${date(Math.round(begin)||1)} – ${date(Math.round(end)||1)}`;
   this.el.querySelector('#timeline-range').value=String(full<=width?0:Math.round(scroll.scrollLeft/(full-width)*1000));
   this.el.querySelector('#timeline-range').disabled=s.zoom===1;
   this.el.querySelector('[data-action="zoom-out"]').disabled=s.zoom<=1;
   this.el.querySelector('[data-action="zoom-in"]').disabled=s.zoom>=1000;
   this.el.querySelector('[data-action="pan-left"]').disabled=scroll.scrollLeft<=1;
   this.el.querySelector('[data-action="pan-right"]').disabled=scroll.scrollLeft>=full-width-1;
   this.el.querySelector('#timeline-match-count').textContent=clusters.length?'':this.model.matches(s.filter,s.kind).length?'Geen gebeurtenissen in dit zichtbare tijdvak. Verplaats de tijdslijn of kies het overzicht.':'Geen gebeurtenissen bij deze zoekterm of dit filter.';
  }
  zoomTimeline(factor,anchor){
   const scroll=this.el.querySelector('.atlas-timeline-scroll');if(!scroll)return;
   const s=this.state,w=scroll.clientWidth||800,a=anchor??w/2,pos=(scroll.scrollLeft+a)/s.zoom;
   s.zoom=Math.max(1,Math.min(1000,s.zoom*factor));this.paintTimeline();
   scroll.scrollLeft=pos*s.zoom-a;s.scroll=scroll.scrollLeft;this.paintTimeline();
  }
  renderTimelineDetail(){
   const e=this.model.events.find(e=>e.id===this.state.selected)||this.model.events[0];if(!e)return;
   this.state.selected=e.id;
   // Keep previously issued undated-story buttons valid while selecting other events.
   this.el.querySelector('#timeline-detail').innerHTML=`<div><button class="explore-btn timeline-back" data-action="back-timeline">← Terug naar de tijdslijn</button><span class="library-kicker">GESELECTEERD MOMENT · ${esc({history:'GESCHIEDENIS',tradition:'OVERLEVERING',text:'TEKSTGESCHIEDENIS'}[e.kind]||e.kind)}</span><h2 tabindex="-1">${esc(e.title)}</h2><p class="explore-tag">${esc(e.dateLabel||date(e.start))}</p><h3>Wat gebeurde er?</h3><p>${esc(e.what||e.summary)}</p>${this.stakeholders(e)}</div><div><h3>Betekenis voor geloof en praktijk</h3><p>${esc(e.faithImpact||e.context)}</p><h3>Historische context en nuance</h3><p>${esc(e.nuance||e.context)}</p>${this.passageButton(e.passage)}${this.sources(e.sources)}</div>`;
  }
  stakeholders(e){return e.stakeholders?.length?`<h3>Wie waren betrokken?</h3><ul class="timeline-stakeholders">${e.stakeholders.map(s=>`<li><strong>${esc(s.name)}</strong><span>${esc(s.role)}</span></li>`).join('')}</ul>`:''}
  revealTimelineDetail(){const d=this.el.querySelector('#timeline-detail');if(!d?.getBoundingClientRect)return;const rect=d.getBoundingClientRect();if(rect.top>(root.innerHeight||800)-100||rect.bottom<0){d.scrollIntoView({block:'start',behavior:'auto'});d.querySelector('h2')?.focus({preventScroll:true});}}
  challenges(){
   return (this.data.traditions[this.tradition]||[]).filter(e=>(this.state.pillar==='all'||e.pillar===this.state.pillar)&&(this.state.topic==='all'||e.topic===this.state.topic));
  }
  renderChallenge(){
   const all=this.data.traditions[this.tradition]||[],choices=this.challenges();
   if(!choices.some(e=>e.id===this.state.selected))this.state.selected=choices[0]?.id;
   const e=choices.find(e=>e.id===this.state.selected);this.passages=[];
   this.el.innerHTML=`${this.note()}<div class="challenge-controls">
    ${this.tradition==='christianity'?`<div class="explore-filter-group" role="group" aria-label="De drie P’s van Sant’Egidio">${[['all','Alle drie P’s'],['prayer','Gebed'],['poor','Armen'],['peace','Vrede']].map(([id,title])=>`<button class="explore-btn" data-pillar="${id}" aria-pressed="${id===this.state.pillar}">${title}</button>`).join('')}</div>`:''}
    <label>Onderwerp<select id="challenge-topic"><option value="all">Alle onderwerpen</option>${[...new Set(all.map(x=>x.topic))].map(topic=>`<option value="${esc(topic)}" ${topic===this.state.topic?'selected':''}>${esc(topic)}</option>`).join('')}</select></label>
    <span role="status">${choices.length} uitdagingen</span></div>
    ${e?`<div class="challenge-layout"><article class="explore-panel challenge-body">
     <span class="library-kicker">${esc(e.topic)}${e.pillar?' · '+esc({prayer:'Preghiera · gebed',poor:'Poveri · armen',peace:'Pace · vrede'}[e.pillar]):''}</span>
     <h2>${esc(e.statement||e.title)}</h2><p class="explore-note">Redactionele stelling · een uitnodiging tot eigen reflectie</p>
     <div class="challenge-passage"><h3>Vertrekpunt in de heilige tekst</h3>${this.passageButton(e.passage,this.reference(e.passage)+' · Lees de passage →')}<p class="explore-note">Lees de volledige passage in haar context. De stelling hierboven is geen letterlijk tekstcitaat.</p></div>
     <h3>Context om mee te nemen</h3><p>${esc(e.context)}</p>
     <details><summary>Bronnen en verder lezen</summary>${this.sources(e.sources)}</details>
     <div class="challenge-actions"><button class="explore-btn primary" data-action="next-challenge">Een andere uitdaging ↻</button><span class="explore-note">Neem de tijd. Je hoeft niets in te vullen.</span></div>
    </article><aside class="challenge-reflect"><span class="library-kicker">RUIMTE VOOR REFLECTIE</span><h2>Kijk een laag dieper.</h2><ol>${(e.questions||[]).map(q=>`<li>${esc(q)}</li>`).join('')}</ol><p>Welke aanname van jezelf wil je opnieuw onderzoeken?</p></aside></div>`:'<p role="status">Geen uitdagingen voor deze combinatie. Kies een ander onderwerp of alle drie P’s.</p>'}`;
  }
  reference(p){
   if(!p)return '';
   return p.tradition==='islam'?`Koran ${p.book||p.surah}:${p.verse}${p.endVerse>p.verse?'–'+p.endVerse:''}`:`${I()?.bookName?.(p.book)||p.book} ${p.chapter}:${p.verse}${p.endVerse>p.verse?'–'+p.endVerse:''}`;
  }
  renderSearch(){
   if(!this.searchInitialized){this.searchState.traditions=[this.tradition];this.searchInitialized=true;}
   const s=this.searchState;
   this.el.innerHTML=`${this.note()}<div class="explore-panel topic-search-panel">
    <form id="topic-search-form"><label for="topic-query">Zoek een thema of woorden in de heilige boeken</label><div class="topic-search-field"><input type="search" maxlength="200" id="topic-query" value="${esc(s.query)}" placeholder="Bijvoorbeeld: vrede, zorg voor armen, gastvrijheid…"><button class="explore-btn primary" type="submit">Zoeken →</button></div></form>
    <fieldset class="topic-religions"><legend>Zoeken binnen</legend>${Object.entries(names).map(([id,label])=>`<label><input type="checkbox" data-search-religion="${id}" ${s.traditions.includes(id)?'checked':''}>${label}</label>`).join('')}</fieldset>
    <div class="topic-search-options"><label>Resultaten<select id="topic-mode"><option value="all">Thema’s en teksttreffers</option><option value="theme">Alleen thematische verwijzingen</option><option value="text">Alleen woorden in de tekst</option></select></label><label>Thema<select id="topic-selection"><option value="">Kies een thema</option>${this.data.topics.map(topic=>`<option value="${esc(topic.id)}">${esc(topic.label)}</option>`).join('')}</select></label></div>
    <p class="explore-note">Zoektaal: Nederlands. Joodse themaverwijzingen openen de Hebreeuwse Tenach. Nederlandse teksttreffers in de Tenach gebruiken de Statenvertaling, een christelijke vertaalhulp met eigen nummering.</p>
   </div><div id="topic-search-status" role="status" aria-live="polite"></div><div id="topic-results" class="topic-results"></div>
   <div class="topic-pagination" hidden><button class="explore-btn" data-action="previous-results">← Vorige</button><span id="topic-page"></span><button class="explore-btn" data-action="next-results">Volgende →</button></div>
   <details class="topic-credits"><summary>Tekstedities en bronnen</summary><p>Katholiek: Canisius 1939 met afzonderlijk vermelde Van Oers-aanvullingen. Tenach: Hebreeuwse WLC voor de thematische verwijzingen; Statenvertaling (1888, CC0-transcriptie) als Nederlandse christelijke vertaalhulp voor woordzoeken. Koran: Nederlandse vertaling, Dutch Islamic Center / Rowwad Translation Center, QuranEnc v2.0.10. Tekst, nummering en noten blijven behouden in de lezers.</p><a href="data-notes.html" target="_blank" rel="noopener noreferrer">Volledige bronverantwoording en gebruiksrechten ↗</a></details>`;
   this.el.querySelector('#topic-mode').value=s.mode;
   this.el.querySelector('#topic-selection').value=s.topicId;
   this.el.querySelector('#topic-search-form').onsubmit=e=>{e.preventDefault();s.page=0;this.runSearch()};
   if(s.query||s.topicId)this.runSearch();
   else this.el.querySelector('#topic-search-status').textContent='Kies een thema of typ een zoekopdracht. De zoekindex wordt alleen voor de geselecteerde religies geladen.';
  }
  runSearch({keepResults=false}={}){
   clearTimeout(this.debounce);
   const s=this.searchState,id=++this.searchId,status=this.el.querySelector('#topic-search-status');
   if(!status)return;
   this.searchClock=root.performance?.now?.()||Date.now();delete status.dataset.firstResultMs;delete status.dataset.finalResultMs;
   if(!keepResults){this.el.querySelector('#topic-results').innerHTML='';this.el.querySelector('.topic-pagination').hidden=true;}
   else this.renderedSearchId=id;
   this.searchPending=false;
   if(!s.traditions.length){status.textContent='Selecteer minstens één religie.';return}
   if(!s.query.trim()&&!s.topicId){status.textContent='Voer een zoekterm in of kies een thema.';return}
   this.searchPending=true;
   status.textContent='Zoeken… Bij de eerste zoekopdracht wordt de index geladen.';
   if(!this.worker){
    try{
     this.worker=new Worker('scripture-search-worker.js?v=20261109-context');
     this.worker.onmessage=e=>this.searchResponse(e.data);
     this.worker.onerror=()=>{this.worker?.terminate();this.worker=null;if(this.view==='topics')this.searchResponse({id:this.searchId,error:'De zoekfunctie kon niet starten. Probeer opnieuw.'})};
    }catch{this.searchPending=false;status.textContent='Deze browser ondersteunt de zoekfunctie niet. Gebruik de zoekvelden in Heilige boeken.';return}
   }
   this.worker.postMessage({id,query:s.query,traditions:s.traditions,page:s.page,mode:s.mode,topicId:s.topicId});
  }
  searchResponse(d){
   if(d.id!==this.searchId||this.view!=='topics'||this.el.hidden)return;
   this.searchPending=Boolean(d.partial);
   const status=this.el.querySelector('#topic-search-status');
   if(d.error){status.innerHTML=`${esc(d.error)} <button class="explore-btn" data-action="search">Opnieuw proberen</button>`;return}
   this.searchResult=d;
   status.textContent=`${d.total.toLocaleString('nl')} ${d.total===1?'resultaat':'resultaten'}${d.matchedTopics.length?' · thema: '+d.matchedTopics.join(', '):''}${d.total?' · '+Object.entries(d.totals).map(([f,n])=>`${names[f]}: ${n}`).join(' · '):'. Probeer een korter woord, ander thema of extra religie.'}${d.partial?' · Thematische verwijzingen gereed; teksttreffers worden geladen.':''}`;
   const list=this.el.querySelector('#topic-results'),keys=d.results.map(r=>JSON.stringify([r.tradition,r.edition,r.book,r.chapter,r.verse,r.endVerse,r.text,r.topics]));
   const previous=this.searchResultKeys||[],append=this.renderedSearchId===d.id&&previous.length<=keys.length&&previous.every((key,i)=>key===keys[i]);
   if(!append){this.passages=[];list.innerHTML='';}
   const markup=d.results.slice(append?previous.length:0).map(r=>{
    const p={tradition:r.tradition,edition:r.edition,book:r.book,chapter:r.chapter,verse:r.verse,endVerse:r.endVerse},he=r.edition==='he';
    return `<article class="explore-panel topic-result"><span class="library-kicker">${esc(names[r.tradition])}</span><h2>${esc(this.reference(p))}</h2><p class="explore-result-kind">${r.topics.length?'Thematische verwijzing · '+esc(r.topics.join(', ')):'Woorden in de tekst'}${he?' · Hebreeuws':''}</p><p class="topic-verse" ${he?'lang="he" dir="rtl"':''}>${this.highlight(r.text,he?'':this.searchState.query)}</p><p class="explore-note">${he?'Hebreeuwse WLC · lees de hele passage met context':r.tradition==='judaism'?'Statenvertaling · christelijke Nederlandse vertaalhulp':r.tradition==='christianity'?'Nederlandse katholieke leeseditie · Canisius / Van Oers':'Nederlandse Koranvertaling · Dutch Islamic Center / Rowwad, QuranEnc'}${r.endVerse>r.verse?' · preview van het eerste vers':''}</p>${this.passageButton(p,'Lees de volledige passage →')}</article>`;
   }).join('');
   if(markup)list.insertAdjacentHTML('beforeend',markup);
   this.searchResultKeys=keys;this.renderedSearchId=d.id;
   const page=this.el.querySelector('.topic-pagination');page.hidden=d.total<=30;
   this.el.querySelector('#topic-page').textContent=`Pagina ${this.searchState.page+1} van ${Math.max(1,Math.ceil(d.total/30))}`;
   page.querySelector('[data-action="previous-results"]').disabled=this.searchState.page===0;
   page.querySelector('[data-action="next-results"]').disabled=(this.searchState.page+1)*30>=d.total;
   const elapsed=Math.round((root.performance?.now?.()||Date.now())-this.searchClock);
   if(status.dataset.firstResultMs===undefined)status.dataset.firstResultMs=String(elapsed);
   if(!d.partial)status.dataset.finalResultMs=String(elapsed);
  }
  highlight(text,query){
   const words=fold(query).split(/\s+/).filter(w=>w.length>2);
   return String(text).split(/([\p{L}\p{N}’']+)/gu).map(w=>words.includes(fold(w))?`<mark>${esc(w)}</mark>`:esc(w)).join('');
  }
  click(event){
   const b=event.target.closest('button');if(!b||!this.el.contains(b))return;
   const d=b.dataset;
   if(d.passage!==undefined){const p=this.passages[+d.passage];if(p)this.onPassage({...p},this.view);return}
   if(d.event){this.state.selected=d.event;this.renderTimelineDetail();this.paintTimeline();this.revealTimelineDetail();return}
   if(d.cluster){
    const events=d.cluster.split(',').map(id=>this.model.events.find(e=>e.id===id)).filter(Boolean);
    const scroll=this.el.querySelector('.atlas-timeline-scroll');if(!events.length)return;
    this.state.selected=events[0].id;
    const width=scroll.clientWidth||800,span=Math.max(8,events.at(-1).start-events[0].start+12);
    this.state.zoom=Math.min(1000,Math.max(this.state.zoom*2,(this.model.max-this.model.min)/span));
    this.paintTimeline();
    scroll.scrollLeft=(events[0].start-this.model.min-4)/(this.model.max-this.model.min)*width*this.state.zoom;
    this.renderTimelineDetail();this.paintTimeline();return;
   }
   if(d.pillar){this.state.pillar=d.pillar;this.state.topic='all';this.renderChallenge();this.el.querySelector(`[data-pillar="${d.pillar}"]`)?.focus();return}
   switch(d.action){
    case'back-timeline':{const scroll=this.el.querySelector('.atlas-timeline-scroll');scroll.scrollIntoView({block:'center',behavior:'auto'});scroll.focus({preventScroll:true});break;}
    case'retry':this.loaded=false;this.open(this.view,this.tradition);break;
    case'zoom-in':this.zoomTimeline(1.8);break;
    case'zoom-out':this.zoomTimeline(1/1.8);break;
    case'overview':this.state.zoom=1;this.state.scroll=0;this.el.querySelector('.atlas-timeline-scroll').scrollLeft=0;this.paintTimeline();break;
    case'pan-left':this.el.querySelector('.atlas-timeline-scroll').scrollLeft-=350;break;
    case'pan-right':this.el.querySelector('.atlas-timeline-scroll').scrollLeft+=350;break;
    case'next-challenge':{
     const list=this.challenges();
     if(list.length>1){const i=list.findIndex(e=>e.id===this.state.selected);this.state.selected=list[(i+1)%list.length].id;}
     this.renderChallenge();this.el.querySelector('[data-action="next-challenge"]')?.focus();break;
    }
    case'search':this.runSearch();break;
    case'next-results':this.searchState.page++;this.runSearch();this.el.querySelector('#topic-search-status').scrollIntoView({block:'start'});break;
    case'previous-results':this.searchState.page=Math.max(0,this.searchState.page-1);this.runSearch();break;
   }
  }
  focusTimelineMatches(){
   const s=this.state,scroll=this.el.querySelector('.atlas-timeline-scroll');
   const found=this.model.matches(s.filter,s.kind);
   if(found.length&&s.filter.trim()){
    s.selected=found[0].id;const full=this.model.max-this.model.min,span=Math.max(80,found.at(-1).start-found[0].start+100);
    s.zoom=Math.max(1,Math.min(1000,full/span));this.paintTimeline();scroll.scrollLeft=(found[0].start-this.model.min-40)/full*(scroll.clientWidth||800)*s.zoom;this.renderTimelineDetail();
   }else if(!s.filter.trim()){s.zoom=1;scroll.scrollLeft=0;if(found.length){s.selected=found[0].id;this.renderTimelineDetail();}}
   s.scroll=scroll.scrollLeft;this.queueTimeline();
  }
  input(e){
   if(e.target.id==='timeline-query'){this.state.filter=e.target.value;this.focusTimelineMatches()}
   if(e.target.id==='timeline-range'){const s=this.el.querySelector('.atlas-timeline-scroll');s.scrollLeft=(s.scrollWidth-s.clientWidth)*Number(e.target.value)/1000}
   if(e.target.id==='topic-query'){
    this.searchState.query=e.target.value;this.searchState.topicId='';this.el.querySelector('#topic-selection').value='';this.searchState.page=0;
    clearTimeout(this.debounce);this.debounce=setTimeout(()=>this.runSearch(),180);
   }
  }
  change(e){
   if(e.target.id==='timeline-kind'){this.state.kind=e.target.value;this.focusTimelineMatches()}
   if(e.target.id==='challenge-topic'){this.state.topic=e.target.value;this.renderChallenge()}
   if(e.target.dataset.searchReligion){
    this.searchState.traditions=[...this.el.querySelectorAll('[data-search-religion]:checked')].map(x=>x.dataset.searchReligion);
    this.searchState.page=0;this.runSearch();
   }
   if(e.target.id==='topic-mode'){this.searchState.mode=e.target.value;this.searchState.page=0;this.runSearch()}
   if(e.target.id==='topic-selection'){
    this.searchState.topicId=e.target.value;
    const topic=this.data.topics.find(t=>t.id===e.target.value);
    this.searchState.query=topic?.label||'';this.el.querySelector('#topic-query').value=this.searchState.query;
    this.searchState.page=0;this.runSearch();
   }
  }
  destroy(){
   this.leave();this.worker?.terminate();this.el.removeEventListener('click',this.onClick);
   this.el.removeEventListener('input',this.onInput);this.el.removeEventListener('change',this.onChange);
   if(this.raf)cancelAnimationFrame(this.raf);
  }
 }
 const api={AtlasExplore,TimelineModel,date};Object.assign(root,api);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
