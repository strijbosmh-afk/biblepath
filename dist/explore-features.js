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
 const TimelineShare={
  parse(hash){
   if(typeof hash!=='string'||!hash.startsWith('#vergelijking='))return null;
   const invalid={invalid:true};if(hash.length>2000)return invalid;
   const p=new URLSearchParams(hash.slice(1)),keys=['vergelijking','van','tot','rel','type','soort','lijnen','verband','moment','zoek'];
   if(p.get('vergelijking')!=='1'||keys.some(k=>p.getAll(k).length>1))return invalid;
   const numeric=v=>v!==null&&/^-?\d+(?:\.\d{1,6})?$/.test(v)&&Math.abs(Number(v))<=100000;
   if(!numeric(p.get('van'))||!numeric(p.get('tot')))return invalid;
   const start=Number(p.get('van')),end=Number(p.get('tot')),religions=p.has('rel')?p.get('rel').split(',').filter(Boolean):Object.keys(names),linkType=p.get('type')||'all',kind=p.get('soort')||'all',connection=p.get('verband')||null,selected=p.get('moment')||null,filter=p.get('zoek')||'';
   if(end-start<.001||religions.some(r=>!Object.hasOwn(names,r))||new Set(religions).size!==religions.length||!['all','influence','shared-context'].includes(linkType)||!['all','history','tradition','text'].includes(kind)||!['0','1'].includes(p.get('lijnen')||'1')||filter.length>160||connection&&!/^[a-z0-9-]{1,80}$/.test(connection)||selected&&!/^[a-z][a-z0-9:-]{0,79}$/.test(selected))return invalid;
   return {start,end,linkReligions:religions,linkType,kind,connection,selected,filter,showConnections:p.get('lijnen')!=='0'};
  },
  encode(state,base){
   const url=new URL(base);if(!['http:','https:'].includes(url.protocol))throw Error('Geen webadres');
   const p=new URLSearchParams({vergelijking:'1',van:String(Number(state.start.toFixed(6))),tot:String(Number(state.end.toFixed(6))),rel:Object.keys(names).filter(r=>state.linkReligions.includes(r)).join(','),type:state.linkType||'all',soort:state.kind||'all',lijnen:state.showConnections===false?'0':'1'});
   if(state.connection)p.set('verband',state.connection);if(state.selected)p.set('moment',state.selected);if(state.filter)p.set('zoek',state.filter.slice(0,160));
   url.hash=p.toString();url.search='';url.username='';url.password='';return url.href;
  }
 };
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
  visible({width,scroll=0,zoom=1,filter='',kind='all',separateTraditions=false}){
   const scale=width*zoom/(this.max-this.min),matches=this.matches(filter,kind);
   const buckets=new Map(),lastByTradition=new Map();
   for(const e of matches){
    const x=(e.start-this.min)*scale;
    if(x<scroll-250||x>scroll+width+250)continue;
    let key=Math.floor(x/190);
    if(separateTraditions){
     const cardX=Math.max(0,Math.min(width*zoom-183,x-8)),previous=lastByTradition.get(e.tradition);
     if(previous&&cardX-previous.cardX<190)key=previous.key;
     else {key=e.tradition+':'+e.id;lastByTradition.set(e.tradition,{key,cardX});}
    }
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(e);
   }
   return [...buckets.values()].map(entries=>({events:entries,x:(entries[0].start-this.min)*scale}));
  }
  connectionEntries(links,{kind='all',linkType='all',religions=Object.keys(names)}={}){
   const events=new Map(this.events.map(e=>[e.id,e])),selected=new Set(religions);
   return links.filter(link=>linkType==='all'||link.type===linkType).map(link=>({link,events:link.eventIds.map(id=>events.get(id)).filter(e=>e&&selected.has(e.tradition)&&(kind==='all'||e.kind===kind))})).filter(c=>new Set(c.events.map(e=>e.tradition)).size>=2);
  }
  connections(links,{width,scroll=0,zoom=1,kind='all',linkType='all',religions=Object.keys(names)}){
   const order=Object.keys(names),scale=width*zoom/(this.max-this.min);
   return this.connectionEntries(links,{kind,linkType,religions}).map(({link,events:linked})=>{
    const segments=[];
    for(let i=0;i<linked.length;i++)for(let j=i+1;j<linked.length;j++){
     let a=linked[i],b=linked[j];if(a.tradition===b.tradition)continue;
     if(order.indexOf(a.tradition)>order.indexOf(b.tradition))[a,b]=[b,a];
     const ax=(a.start-this.min)*scale-scroll,bx=(b.start-this.min)*scale-scroll;
     const ay=187+order.indexOf(a.tradition)*150,by=77+order.indexOf(b.tradition)*150;
     // Clip in viewport coordinates: SVG size and geometry stay bounded even at maximum zoom.
     const dx=bx-ax;let from=0,to=1;
     if(dx===0){if(ax<0||ax>width)continue;}
     else {const t0=(0-ax)/dx,t1=(width-ax)/dx;from=Math.max(0,Math.min(t0,t1));to=Math.min(1,Math.max(t0,t1));if(from>to)continue;}
     const x1=Math.max(0,Math.min(width,ax+dx*from)),y1=ay+(by-ay)*from,x2=Math.max(0,Math.min(width,ax+dx*to)),y2=ay+(by-ay)*to;
     if(Math.hypot(x2-x1,y2-y1)<1)continue;
     segments.push({x1,y1,x2,y2,fromId:a.id,toId:b.id,clipped:from>0||to<1,startVisible:from===0,endVisible:to===1});
    }
    return {link,segments};
   }).filter(c=>c.segments.length);
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
   const key=`${this.view}:${this.view==='timeline'&&this.timelineComparison?'comparison':this.tradition}`;
   if(!this.states.has(key))this.states.set(key,{zoom:1,scroll:0,selected:null,filter:'',kind:'all',pillar:'all',topic:'all',challenge:0,seen:[],linkType:'all',linkReligions:Object.keys(names)});
   return this.states.get(key);
  }
  setSharedComparison(shared){this.timelineComparison=true;this.sharedComparison=shared;this.loaded=false;}
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
   this.clearShareQR();this.loaded=false;
   this.el.innerHTML='<p class="library-loading" role="status">Dit onderdeel wordt geladen…</p>';
   try{
    const file={timeline:'timeline-events.json',challenge:'reflection-challenges.json',topics:'scripture-topics.json'}[view];
    const data=view==='timeline'?await Promise.all([load(file),load('timeline-connections.json')]).then(([events,links])=>({...events,connections:links.connections})):await load(file);
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
  openEvent(id){const event=this.data?.traditions[this.tradition]?.find(e=>e.id===id);if(!event)return false;this.timelineComparison=false;this.state.filter='';this.state.kind='all';this.state.selected=id;this.renderTimeline();this.focusTimelineEvents([event],{padding:25,minSpan:50});this.renderTimelineDetail();this.paintTimeline();this.revealTimelineDetail();return true;}
  renderTimeline(){
   this.clearShareQR();
   const comparison=!!this.timelineComparison;
   const entries=comparison?Object.entries(this.data.traditions).flatMap(([tradition,events])=>events.map(e=>({...e,tradition}))):this.data.traditions[this.tradition]||[];
   this.model=new TimelineModel(entries);
   let sharedPeriod=null,sharedNotice='';
   if(comparison&&this.sharedComparison){
    const shared=this.sharedComparison;this.sharedComparison=null;
    this.state.sharedRange=null;
    if(shared.invalid){Object.assign(this.state,{zoom:1,scroll:0,width:null,filter:'',kind:'all',linkType:'all',linkReligions:Object.keys(names),connection:null,selected:null,showConnections:true});sharedNotice='Deze deellink is ongeldig of gebruikt een onbekende versie. Je ziet de volledige vergelijking.';}
    else {
     const s=this.state;Object.assign(s,{linkType:shared.linkType,linkReligions:[...shared.linkReligions],kind:shared.kind,showConnections:shared.showConnections,filter:shared.filter,selected:entries.some(e=>e.id===shared.selected)?shared.selected:null,connection:shared.connection});
     const min=this.model.min,max=this.model.max,span=Math.min(max-min,Math.max((max-min)/1000,shared.end-shared.start)),start=Math.max(min,Math.min(max-span,shared.start));
     sharedPeriod={start,end:start+span};s.zoom=(max-min)/span;s.scroll=0;s.width=null;sharedNotice='Gedeelde vergelijking geopend: het tijdvak en de filters zijn overgenomen.';
     if(s.connection&&!this.filteredConnections().some(c=>c.link.id===s.connection)){s.connection=null;sharedNotice='Het gedeelde verband is niet beschikbaar bij deze filters. Het tijdvak en de filters zijn wel geopend.';}
    }
   }
   this.state.selected||=entries.find(e=>e.start>=0)?.id||entries[0]?.id;
   this.el.innerHTML=`${this.note()}
    <div class="timeline-view-switch" role="group" aria-label="Tijdslijnweergave"><button class="explore-btn" data-timeline-mode="single" aria-pressed="${!comparison}">Eén religie</button><button class="explore-btn" data-timeline-mode="comparison" aria-pressed="${comparison}">Vergelijk de drie religies</button>${comparison?'<button class="explore-btn" data-action="share-timeline">Vergelijking delen →</button>':''}</div>
    ${comparison?`<section class="explore-panel timeline-share" id="timeline-share" aria-label="Vergelijking delen" hidden><label>Deellink<input id="timeline-share-url" type="text" readonly></label><button class="explore-btn" data-action="copy-timeline-link">Link kopiëren</button><p>Deze link bewaart het zichtbare tijdvak, de lijnfilters en het geselecteerde verband. Latere wijzigingen veranderen deze link niet; maak dan een nieuwe.</p><div class="timeline-qr" id="timeline-qr" hidden><figure><img id="timeline-qr-image" alt="QR-code om deze gedeelde vergelijking te openen" width="256" height="256"><figcaption>Scan met de camera van je telefoon.</figcaption></figure><div><h3>Open op je telefoon</h3><p>De QR-code opent precies dezelfde vergelijking als de deellink hierboven.</p><div class="timeline-qr-downloads"><a class="explore-btn" id="timeline-qr-png" download="religieatlas-vergelijking-qr.png">Download PNG</a><a class="explore-btn" id="timeline-qr-svg" download="religieatlas-vergelijking-qr.svg">Download SVG</a></div><p class="explore-note">PNG voor een presentatie of document; SVG voor scherp afdrukken op elk formaat.</p></div></div><p id="timeline-qr-status" role="status"></p><p id="timeline-share-status" role="status"></p></section><p class="explore-note" role="status">${esc(sharedNotice)}</p>`:''}
    ${comparison?'<p class="explore-note timeline-explanation">Drie parallelle banen, één tijdschaal in jaren. Zoomen en schuiven bewegen alle religies tegelijk. Gelijke horizontale posities duiden hetzelfde tijdvak aan; gelijktijdigheid bewijst geen onderlinge invloed.</p><button class="explore-btn timeline-connections-jump" data-action="show-connections">Verken contact en onderlinge invloeden →</button>':''}
    <div class="explore-panel ${comparison?'timeline-comparison':''}">
     <div class="explore-toolbar">
      <label class="explore-search-label">Zoek in de tijdslijn<input type="search" id="timeline-query" placeholder="Gebeurtenis, periode of thema…" value="${esc(this.state.filter)}"></label>
      <label>Soort<select id="timeline-kind"><option value="all">Alle gebeurtenissen</option><option value="history">Geschiedenis</option><option value="tradition">Overlevering</option><option value="text">Tekstgeschiedenis</option></select></label>
      <div class="explore-zoom" role="group" aria-label="Tijdslijn zoomen"><button data-action="zoom-out" aria-label="Tijdslijn uitzoomen">−</button><output id="timeline-zoom">100%</output><button data-action="zoom-in" aria-label="Tijdslijn inzoomen">+</button></div>
      <button class="explore-btn" data-action="overview">Hele tijdslijn</button>
     </div>
     <div class="timeline-legend"><span>${entries.length} gebeurtenissen · ${comparison?'drie religies op dezelfde schaal':esc(names[this.tradition])}</span><span id="timeline-period"></span></div>
     ${comparison?`<div class="timeline-link-controls"><label><input type="checkbox" id="timeline-links-toggle" ${this.state.showConnections!==false?'checked':''}> Verbindingslijnen tonen</label><span><i class="line-key"></i> Doorwerking / contact</span><span><i class="line-key shared"></i> Gedeelde context</span><div class="timeline-link-filters"><label class="timeline-link-type">Soort verband<select id="timeline-link-type"><option value="all">Alle soorten verbanden</option><option value="influence">Doorwerking / contact</option><option value="shared-context">Gedeelde context</option></select></label><fieldset><legend>Betrokken religies</legend>${Object.entries(names).map(([id,title])=>`<label><input type="checkbox" data-link-religion="${id}" ${(this.state.linkReligions||Object.keys(names)).includes(id)?'checked':''}> ${esc(title)}</label>`).join('')}</fieldset><button class="explore-btn" data-action="reset-link-filters">Lijnfilters herstellen</button></div><p>Alleen lijnen tussen aangevinkte religies worden getoond. Kies minstens twee religies; de drie tijdsbanen blijven zichtbaar. Tik op een lijn of nummer voor context en bronnen. Lijnen geven geen richting van invloed aan.</p><p id="timeline-link-filter-status" role="status" aria-live="polite" aria-atomic="true"></p></div>`:''}
     <div class="atlas-timeline-scroll" tabindex="0" aria-label="Tijdslijn: sleep of scroll horizontaal; gebruik plus, min en de pijltjestoetsen"><div class="atlas-timeline-track"><div class="atlas-timeline-axis"></div><div class="atlas-timeline-items"></div>${comparison?'<div class="timeline-link-layer"></div>':''}</div></div>
     ${comparison?'<div id="timeline-link-list" class="timeline-link-list" aria-label="Verbanden in het zichtbare tijdvak"></div>':''}
     <div class="timeline-bottom"><div><button class="explore-btn" data-action="pan-left" aria-label="Eerder in de tijdslijn">←</button><button class="explore-btn" data-action="pan-right" aria-label="Later in de tijdslijn">→</button></div><p>Scroll of sleep van links naar rechts. Zoom voor meer detail; selecteer een moment voor de context.</p></div>
     <label class="timeline-range-label">Positie in de geschiedenis<input id="timeline-range" type="range" min="0" max="1000" value="0" aria-label="Positie in de tijdslijn"></label>
     <p class="explore-note">${esc(this.data.meta?.scopeNote||this.data.meta?.selectionNote||this.data.meta?.scope||'Een brede, redactionele selectie. Religieuze verhalen en historische dateringen worden afzonderlijk aangeduid. Een tijdslijn kan niet elke gebeurtenis of interpretatie omvatten.')}</p>
    </div>
    <p id="timeline-match-count" role="status"></p>
    ${comparison?'<section class="explore-panel timeline-link-detail" id="timeline-link-detail" aria-labelledby="timeline-link-title" hidden></section>':''}
    <div id="timeline-cluster-list"></div>
    <article class="explore-panel timeline-detail" id="timeline-detail"></article>
    ${comparison?'<details class="timeline-connections"><summary>Contact en onderlinge invloeden</summary><div id="timeline-connection-catalog"></div></details>':''}
    <details class="explore-undated"><summary>Verhalen zonder historische datering</summary><div id="timeline-undated"></div></details>`;
   this.el.querySelector('#timeline-kind').value=this.state.kind;
   const scroll=this.el.querySelector('.atlas-timeline-scroll');
   this.timelineMarkup=null;this.connectionMarkup=null;this.connectionListMarkup=null;
   scroll.scrollLeft=this.state.scroll;this.bindTimelineGestures(scroll);
   this.paintTimeline();scroll.scrollLeft=this.state.scroll;this.renderTimelineDetail();
   if(sharedPeriod){scroll.scrollLeft=(sharedPeriod.start-this.model.min)/(this.model.max-this.model.min)*(scroll.clientWidth||800)*this.state.zoom;this.state.scroll=scroll.scrollLeft;this.paintTimeline();this.state.sharedRange={...sharedPeriod,zoom:this.state.zoom,scroll:scroll.scrollLeft,width:scroll.clientWidth||800};}
   if(comparison){this.el.querySelector('#timeline-link-type').value=this.state.linkType||'all';this.renderTimelineConnection();this.renderConnectionCatalog();}
   if(sharedPeriod)scroll.scrollIntoView?.({block:'center',behavior:'auto'});
   this.resizeObserver?.observe(this.el);
   const undated=comparison?Object.entries(this.data.undated||{}).flatMap(([tradition,events])=>events.map(e=>({...e,tradition}))):this.data.undated?.[this.tradition]||[];
   this.el.querySelector('#timeline-undated').innerHTML=undated.map(e=>`<article>${e.tradition?`<p class="explore-tag">${esc(names[e.tradition])}</p>`:''}<h3>${esc(e.title)}</h3><p>${esc(e.what||e.context||e.summary)}</p>${this.stakeholders(e)}<h3>Betekenis voor geloof en praktijk</h3><p>${esc(e.faithImpact||e.context)}</p>${e.nuance?`<p class="explore-note">${esc(e.nuance)}</p>`:''}${this.sources(e.sources)}${this.passageButton(e.passage)}</article>`).join('')||'<p>Gedateerde gebeurtenissen staan hierboven. De afwezigheid van een datum zegt niets over de religieuze betekenis van een verhaal.</p>';
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
    const link=e.target.closest?.('[data-timeline-link]');
    if(link&&(e.key==='Enter'||e.key===' ')){e.preventDefault();this.openTimelineConnection(link.dataset.timelineLink);return;}
    if(e.target!==scroll&&!e.target.closest('.atlas-timeline-event')&&!link)return;
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
   const comparison=!!this.timelineComparison,traditions=Object.keys(names);
   // One camera and one scale keep every religion aligned, including on phones.
   const clusters=this.model.visible({width,scroll:scroll.scrollLeft,zoom:s.zoom,filter:comparison?'':s.filter,kind:s.kind,separateTraditions:comparison});
   const matches=new Set(this.model.matches(s.filter,s.kind).map(e=>e.id));
   const linkedIds=new Set(comparison?this.filteredConnections().find(c=>c.link.id===s.connection)?.events.map(e=>e.id):[]);
   let html=comparison?traditions.map((t,i)=>`<div class="timeline-comparison-lane lane-${t}" style="top:${42+i*150}px"><span>${esc(names[t])}</span></div>`).join(''):'';
   const span=(this.model.max-this.model.min)/s.zoom;
   const targetTicks=comparison?Math.max(3,Math.floor(width/120)):8;
   const step=[1,2,5,10,25,50,100,250,500,1000,2500].find(n=>n>=span/targetTicks)||5000;
   const first=Math.floor((this.model.min+scroll.scrollLeft/scale)/step)*step;
   for(let y=first;y<Math.min(this.model.max,first+span+step*2);y+=step){
    if(y===0)continue;
    html+=`<span class="atlas-timeline-tick" style="left:${(y-this.model.min)*scale}px">${date(y)}</span>`;
   }
   clusters.forEach(c=>{
    const selected=c.events.some(e=>e.id===s.selected),e=c.events[0];
    const lane=comparison?traditions.indexOf(e.tradition):Math.floor(c.x/190)%2;
    const cardLeft=Math.max(0,Math.min(full-183,c.x-8));
    html+=`<button class="atlas-timeline-event ${!comparison&&lane?'below':''} ${selected?'selected':''} ${comparison?'comparison-event lane-'+e.tradition:''} ${c.events.some(e=>linkedIds.has(e.id))?'connection-member':''} ${comparison&&s.filter&&c.events.some(e=>matches.has(e.id))?'timeline-search-match':''}" style="left:${cardLeft}px;--timeline-pin:${c.x-cardLeft}px;${comparison?`top:${77+lane*150}px;`:''}" ${c.events.length>1?`data-cluster="${c.events.map(e=>esc(e.id)).join(',')}"`:`data-event="${esc(e.id)}"`} ${comparison?`aria-label="${esc(names[e.tradition])}: ${esc(c.events.length>1?c.events.length+' gebeurtenissen vanaf '+(e.dateLabel||date(e.start)):(e.dateLabel||date(e.start))+' '+e.title)}"`:''} aria-pressed="${selected}"><span>${esc(e.dateLabel||date(e.start))}${c.events.length>1?' – '+esc(c.events.at(-1).dateLabel||date(c.events.at(-1).start)):''}</span><strong>${c.events.length>1?`${c.events.length} gebeurtenissen`:esc(e.title)}</strong><small>${c.events.length>1?'Zoom en bekijk gebeurtenissen +':esc(e.category||{history:'Geschiedenis',text:'Tekst',tradition:'Overlevering'}[e.kind])}</small></button>`;
   });
   const items=this.el.querySelector('.atlas-timeline-items');
   if(this.timelineMarkup!==html){
    const focused=items.contains?.(this.el.ownerDocument?.activeElement);
    items.innerHTML=html;this.timelineMarkup=html;if(focused)scroll.focus({preventScroll:true});
   }
   if(comparison)this.paintTimelineConnections(width,scroll.scrollLeft,clusters);
   this.el.querySelector('#timeline-zoom').textContent=`${Math.round(s.zoom*100)}%`;
   const begin=this.model.min+scroll.scrollLeft/scale,end=Math.min(this.model.max,begin+span);
   this.el.querySelector('#timeline-period').textContent=`${date(Math.round(begin)||1)} – ${date(Math.round(end)||1)}`;
   this.el.querySelector('#timeline-range').value=String(full<=width?0:Math.round(scroll.scrollLeft/(full-width)*1000));
   this.el.querySelector('#timeline-range').disabled=s.zoom===1;
   this.el.querySelector('[data-action="zoom-out"]').disabled=s.zoom<=1;
   this.el.querySelector('[data-action="zoom-in"]').disabled=s.zoom>=1000;
   this.el.querySelector('[data-action="pan-left"]').disabled=scroll.scrollLeft<=1;
   this.el.querySelector('[data-action="pan-right"]').disabled=scroll.scrollLeft>=full-width-1;
   this.el.querySelector('#timeline-match-count').textContent=comparison&&s.filter?`${matches.size} zoektreffers. Andere gebeurtenissen blijven zichtbaar om hetzelfde tijdvak te vergelijken.`:clusters.length?'':matches.size?'Geen gebeurtenissen in dit zichtbare tijdvak. Verplaats de tijdslijn of kies het overzicht.':'Geen gebeurtenissen bij deze zoekterm of dit filter.';
  }
  paintTimelineConnections(width,scroll,clusters){
   const layer=this.el.querySelector('.timeline-link-layer'),list=this.el.querySelector('#timeline-link-list');if(!layer||!list)return;
   const s=this.state,links=this.data?.connections||[],options=this.connectionOptions(),eligible=this.model.connectionEntries(links,options),visible=s.showConnections===false?[]:this.model.connections(links,{width,scroll,zoom:s.zoom,...options});
   const used=[],blocked=clusters.map(c=>({x:Math.max(0,Math.min(width*s.zoom-183,c.x-8))-scroll,y:77+Object.keys(names).indexOf(c.events[0].tradition)*150,w:175,h:110}));
   const buttons=[];
   const groups=visible.map(({link,segments})=>{
    const number=links.indexOf(link)+1,selected=s.connection===link.id,clipped=segments.some(p=>p.clipped),label=`Verband ${number}: ${link.title}${clipped?' (deels buiten beeld)':''}`;
    const candidates=segments.flatMap(p=>[.5,.3,.7,.15,.85].map(t=>({x:p.x1+(p.x2-p.x1)*t,y:p.y1+(p.y2-p.y1)*t})));
    const badge=candidates.find(p=>p.x>=23&&p.x<=width-23&&!used.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<44)&&!blocked.some(r=>p.x>r.x-14&&p.x<r.x+r.w+14&&p.y>r.y-14&&p.y<r.y+r.h+14)&&!Object.keys(names).some((t,i)=>p.y>42+i*150-14&&p.y<72+i*150+14&&p.x<Math.min(width,names[t].length*8+30)));
    if(badge)used.push(badge);
    buttons.push(`<button class="explore-btn" data-timeline-link="${esc(link.id)}" aria-pressed="${selected}"><span class="timeline-link-number">${number}</span><span>${esc(link.title)}${clipped?'<small>Een deel valt buiten beeld</small>':''}</span></button>`);
    return `<g class="timeline-link ${link.type==='shared-context'?'shared':''} ${selected?'active':''}" data-timeline-link="${esc(link.id)}" role="button" tabindex="0" focusable="true" aria-label="${esc(label)}" aria-pressed="${selected}" aria-controls="timeline-link-detail"><title>${esc(label)}</title>${segments.map(p=>`<path class="timeline-link-hit" d="M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}"/><path class="timeline-link-stroke" d="M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}"/>${p.startVisible?`<circle class="timeline-link-end" cx="${p.x1}" cy="${p.y1}" r="4"/>`:''}${p.endVisible?`<circle class="timeline-link-end" cx="${p.x2}" cy="${p.y2}" r="4"/>`:''}`).join('')}${badge?`<circle class="timeline-link-badge-hit" cx="${badge.x}" cy="${badge.y}" r="22"/><circle class="timeline-link-badge" cx="${badge.x}" cy="${badge.y}" r="12"/><text x="${badge.x}" y="${badge.y}" dy=".35em" text-anchor="middle">${number}</text>`:''}</g>`;
   }).join('');
   const html=`<svg width="${width}" height="502" viewBox="0 0 ${width} 502" aria-label="Historische verbanden tussen religies">${groups}</svg>`;
   layer.style.left=`${scroll}px`;layer.style.width=`${width}px`;
   if(this.connectionMarkup!==html){
    const focus=this.el.ownerDocument?.activeElement,focused=layer.contains?.(focus)?focus?.closest?.('[data-timeline-link]')?.dataset.timelineLink:null;
    layer.innerHTML=html;this.connectionMarkup=html;
    if(focused){const target=[...(layer.querySelectorAll?.('[data-timeline-link]')||[])].find(e=>e.dataset.timelineLink===focused);(target||this.el.querySelector('.atlas-timeline-scroll')).focus({preventScroll:true});}
   }
   const message=options.religions.length<2?'Kies minstens twee religies om verbindingslijnen te zien.':!eligible.length?'Geen verbanden voor deze filtercombinatie. Pas de lijnfilters aan of herstel ze.':'Geen verbindingen in dit tijdvak bij deze filters. Verplaats de tijdslijn of bekijk het overzicht.';
   const listHtml=s.showConnections===false?'<p>Verbindingslijnen zijn verborgen.</p>':visible.length?`<p>Verbanden in beeld · kies een nummer of tik op de lijn</p><div>${buttons.join('')}</div>`:`<p>${message}</p>`;
   if(this.connectionListMarkup!==listHtml){list.innerHTML=listHtml;this.connectionListMarkup=listHtml;}
   const status=this.el.querySelector('#timeline-link-filter-status');
   if(status){const text=`${eligible.length} van ${links.length} verbanden passen bij de filters · ${visible.length} in beeld.${s.showConnections===false?' Lijnen zijn verborgen.':''}${options.religions.length<2?' Kies minstens twee religies.':''}`;if(status.textContent!==text)status.textContent=text;}
  }
  connectionOptions(){return {kind:this.state.kind,linkType:this.state.linkType||'all',religions:this.state.linkReligions||Object.keys(names)};}
  filteredConnections(){return this.model.connectionEntries(this.data?.connections||[],this.connectionOptions());}
  renderConnectionCatalog(){
   const catalog=this.el.querySelector('#timeline-connection-catalog');if(!catalog)return;
   const entries=this.filteredConnections(),links=this.data?.connections||[];
   const summary=this.el.querySelector('.timeline-connections summary');if(summary)summary.textContent=`Contact en onderlinge invloeden (${entries.length})`;
   catalog.innerHTML=`<p class="explore-note">Dossiers bij de huidige lijnfilters. Deze onderscheiden aantoonbare contacten van een gedeelde historische context.</p>${entries.map(({link:c})=>`<article class="explore-panel"><h3>${esc(c.title)}</h3><p>${esc(c.context)}</p>${this.sources(c.sources)}<button class="explore-btn" data-connection="${links.indexOf(c)}">Bekijk deze gebeurtenissen samen →</button></article>`).join('')||'<p>Geen dossiers voor deze filtercombinatie. Kies minstens twee religies of herstel de lijnfilters.</p>'}`;
  }
  applyConnectionFilters(){
   if(this.state.connection&&!this.filteredConnections().some(c=>c.link.id===this.state.connection))this.state.connection=null;
   this.renderTimelineConnection();this.renderConnectionCatalog();this.paintTimeline();
  }
  openTimelineConnection(id){
   if(!this.filteredConnections().some(c=>c.link.id===id))return;
   this.state.connection=id;this.renderTimelineConnection();this.paintTimeline();
   const panel=this.el.querySelector('#timeline-link-detail');panel.scrollIntoView({block:'start',behavior:'auto'});panel.querySelector('h2')?.focus({preventScroll:true});
  }
  renderTimelineConnection(){
   const panel=this.el.querySelector('#timeline-link-detail');if(!panel)return;
   const link=(this.data?.connections||[]).find(c=>c.id===this.state.connection);panel.hidden=!link;if(!link)return;
   const events=link.eventIds.map(id=>this.model.events.find(e=>e.id===id)).filter(Boolean);
   panel.innerHTML=`<button class="explore-btn" data-action="back-timeline">← Terug naar de lijnen</button><p class="explore-tag">${link.type==='shared-context'?'Gedeelde historische context':'Historische doorwerking en contact'}</p><h2 id="timeline-link-title" tabindex="-1">${esc(link.title)}</h2><p>${esc(link.context)}</p><h3>Gebeurtenissen in dit verband</h3><div class="timeline-linked-events">${events.map(e=>`<button class="explore-btn" data-related-event="${esc(e.id)}"><span>${esc(names[e.tradition])} · ${esc(e.dateLabel||date(e.start))}<strong>${esc(e.title)}</strong></span></button>`).join('')}</div><h3>Bronnen</h3>${this.sources(link.sources)}<div class="timeline-link-actions"><button class="explore-btn" data-fit-connection="${esc(link.id)}">Toon het hele verband op de tijdslijn →</button><button class="explore-btn" data-action="close-connection">Verband sluiten</button></div>`;
  }
  fitTimelineConnection(id){
   const entry=this.filteredConnections().find(c=>c.link.id===id);if(!entry)return;
   const s=this.state;s.connection=id;s.showConnections=true;s.filter='';
   this.el.querySelector('#timeline-query').value='';this.el.querySelector('#timeline-links-toggle').checked=true;
   this.focusTimelineEvents(entry.events,{padding:1,minSpan:4});this.renderTimelineConnection();
   const scroll=this.el.querySelector('.atlas-timeline-scroll');scroll.scrollIntoView({block:'center',behavior:'auto'});scroll.focus({preventScroll:true});
  }
  sharedTimelineState(){
   const scroll=this.el.querySelector('.atlas-timeline-scroll'),s=this.state,width=scroll.clientWidth||800,scale=width*s.zoom/(this.model.max-this.model.min),exact=s.sharedRange&&s.sharedRange.zoom===s.zoom&&s.sharedRange.width===width&&s.sharedRange.scroll===scroll.scrollLeft?s.sharedRange:null,start=exact?exact.start:this.model.min+scroll.scrollLeft/scale;
   return {start,end:exact?exact.end:Math.min(this.model.max,start+(this.model.max-this.model.min)/s.zoom),linkType:s.linkType||'all',linkReligions:[...(s.linkReligions||Object.keys(names))],kind:s.kind,showConnections:s.showConnections!==false,connection:s.connection||null,selected:s.selected||null,filter:s.filter};
  }
  shareTimeline(){
   const panel=this.el.querySelector('#timeline-share'),input=this.el.querySelector('#timeline-share-url');
   input.value=TimelineShare.encode(this.sharedTimelineState(),root.location.href);panel.hidden=false;
   this.renderShareQR(input.value);
   this.el.querySelector('#timeline-share-status').textContent='De link is klaar. Kies Link kopiëren of kopieer de geselecteerde link.';
   panel.scrollIntoView({block:'start',behavior:'auto'});input.focus({preventScroll:true});input.select();
  }
  renderShareQR(url){
   const box=this.el.querySelector('#timeline-qr'),status=this.el.querySelector('#timeline-qr-status');if(!box)return;
   this.clearShareQR();box.hidden=true;if(status)status.textContent='';
   const png=this.el.querySelector('#timeline-qr-png'),svg=this.el.querySelector('#timeline-qr-svg'),image=this.el.querySelector('#timeline-qr-image');
   png?.removeAttribute?.('href');svg?.removeAttribute?.('href');
   try{
    const code=root.TimelineQR.create(url),svgUrl=this.shareQRAsset(new Blob([code.svg],{type:'image/svg+xml'}));image.src=svgUrl;svg.href=svgUrl;box.hidden=false;
    try{const data=root.atob(root.TimelineQR.png(code).split(',')[1]),bytes=Uint8Array.from(data,c=>c.charCodeAt(0));png.href=this.shareQRAsset(new Blob([bytes],{type:'image/png'}));png.hidden=false;}
    catch{png.hidden=true;if(status)status.textContent='PNG is hier niet beschikbaar. Je kunt de QR-code als SVG downloaden.';}
   }catch{image?.removeAttribute?.('src');if(status)status.textContent='De QR-code kon niet worden gemaakt. Je kunt de deellink wel kopiëren.';}
  }
  shareQRAsset(blob){const url=URL.createObjectURL(blob);(this.qrObjectUrls||=[]).push(url);return url;}
  clearShareQR(){for(const url of this.qrObjectUrls||[])URL.revokeObjectURL(url);this.qrObjectUrls=[];}
  async copyTimelineLink(){
   const input=this.el.querySelector('#timeline-share-url'),status=this.el.querySelector('#timeline-share-status'),value=input.value;
   try{if(!root.navigator?.clipboard?.writeText)throw Error('clipboard');await root.navigator.clipboard.writeText(value);if(this.el.contains(status))status.textContent='Link gekopieerd. Je kunt deze vergelijking nu delen.';}
   catch{if(this.el.contains(status)){input.focus({preventScroll:true});input.select();status.textContent='Automatisch kopiëren lukt hier niet. De link is geselecteerd; kopieer hem handmatig.';}}
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
   this.el.querySelector('#timeline-detail').innerHTML=`<div><button class="explore-btn timeline-back" data-action="back-timeline">← Terug naar de tijdslijn</button><span class="library-kicker">GESELECTEERD MOMENT · ${esc({history:'GESCHIEDENIS',tradition:'OVERLEVERING',text:'TEKSTGESCHIEDENIS'}[e.kind]||e.kind)}</span><h2 tabindex="-1">${esc(e.title)}</h2>${e.tradition?`<p class="explore-tag">${esc(names[e.tradition])}</p> `:''}<p class="explore-tag">${esc(e.dateLabel||date(e.start))}</p><h3>Wat gebeurde er?</h3><p>${esc(e.what||e.summary)}</p>${this.stakeholders(e)}</div><div><h3>Betekenis voor geloof en praktijk</h3><p>${esc(e.faithImpact||e.context)}</p><h3>Historische context en nuance</h3><p>${esc(e.nuance||e.context)}</p>${this.passageButton(e.passage)}${this.sources(e.sources)}${this.timelineComparison?this.comparisonContext(e):''}</div>`;
  }
  contemporaries(event){
   return this.model.events.filter(e=>e.tradition!==event.tradition&&e.start<=(event.end||event.start)+25&&(e.end||e.start)>=event.start-25).sort((a,b)=>Math.abs(a.start-event.start)-Math.abs(b.start-event.start)).slice(0,8);
  }
  comparisonContext(event){
   const nearby=this.contemporaries(event),links=(this.data.connections||[]).filter(c=>c.eventIds.includes(event.id));
   return `<section class="timeline-contemporaries"><h3>In dezelfde periode bij andere religies</h3><p class="explore-note">Overlappende dateringen of gebeurtenissen tot 25 jaar vóór of na dit moment. Dit is geen bewijs van contact of invloed.</p>${nearby.length?nearby.map(e=>`<button class="explore-btn" data-related-event="${esc(e.id)}"><span>${esc(names[e.tradition])} · ${esc(e.dateLabel||date(e.start))}<strong>${esc(e.title)}</strong></span></button>`).join(''):'<p>In deze selectie staat voor de andere religies geen gebeurtenis binnen dit tijdvak. Dat betekent niet dat hun geschiedenis toen stilstond.</p>'}${links.length?`<h3>Contact en gedeelde context</h3>${links.map(c=>`<article><h3>${esc(c.title)}</h3><p>${esc(c.context)}</p>${this.sources(c.sources)}</article>`).join('')}`:''}</section>`;
  }
  focusTimelineEvents(events,{padding=40,minSpan=80}={}){
   if(!events.length)return;
   const scroll=this.el.querySelector('.atlas-timeline-scroll'),s=this.state,full=this.model.max-this.model.min;
   const start=Math.min(...events.map(e=>e.start)),end=Math.max(...events.map(e=>e.end||e.start)),span=Math.max(minSpan,end-start+padding*2);
   s.zoom=Math.max(1,Math.min(1000,full/span));s.selected=events[0].id;this.paintTimeline();
   scroll.scrollLeft=(start-this.model.min-padding)/full*(scroll.clientWidth||800)*s.zoom;s.scroll=scroll.scrollLeft;this.paintTimeline();this.renderTimelineDetail();
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
   const b=event.target.closest('button,[data-timeline-link]');if(!b||!this.el.contains(b))return;
   const d=b.dataset;
   if(d.timelineLink){this.openTimelineConnection(d.timelineLink);return;}
   if(d.fitConnection){this.fitTimelineConnection(d.fitConnection);return;}
   if(d.timelineMode){this.timelineComparison=d.timelineMode==='comparison';this.renderTimeline();this.el.querySelector(`[data-timeline-mode="${d.timelineMode}"]`)?.focus({preventScroll:true});return}
   if(d.connection!==undefined){
    const link=this.data.connections?.[+d.connection];if(!link)return;
    this.fitTimelineConnection(link.id);return;
   }
   if(d.relatedEvent){
    const e=this.model.events.find(e=>e.id===d.relatedEvent);if(!e)return;
    this.state.kind='all';this.el.querySelector('#timeline-kind').value='all';this.focusTimelineEvents([e]);this.revealTimelineDetail();return;
   }
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
    this.el.querySelector('#timeline-cluster-list').innerHTML=`<section class="timeline-cluster-choices explore-panel"><h3>Gebeurtenissen in deze groep</h3><p class="explore-note">Kies een gebeurtenis voor de context, ook wanneer dateringen samenvallen.</p>${events.map(e=>`<button class="explore-btn" data-event="${esc(e.id)}">${esc(e.dateLabel||date(e.start))} · ${esc(e.title)}</button>`).join('')}</section>`;
    this.renderTimelineDetail();this.paintTimeline();return;
   }
   if(d.pillar){this.state.pillar=d.pillar;this.state.topic='all';this.renderChallenge();this.el.querySelector(`[data-pillar="${d.pillar}"]`)?.focus();return}
   switch(d.action){
    case'share-timeline':this.shareTimeline();break;
    case'copy-timeline-link':this.copyTimelineLink();break;
    case'reset-link-filters':{this.state.linkType='all';this.state.linkReligions=Object.keys(names);this.el.querySelector('#timeline-link-type').value='all';this.el.querySelectorAll('[data-link-religion]').forEach(e=>{e.checked=true});this.applyConnectionFilters();break;}
    case'close-connection':{this.state.connection=null;this.renderTimelineConnection();this.paintTimeline();const scroll=this.el.querySelector('.atlas-timeline-scroll');scroll.scrollIntoView({block:'center',behavior:'auto'});scroll.focus({preventScroll:true});break;}
    case'show-connections':{const panel=this.el.querySelector('.timeline-connections');panel.open=true;panel.scrollIntoView({block:'start',behavior:'auto'});panel.querySelector('summary').focus({preventScroll:true});break;}
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
   const choices=this.el.querySelector('#timeline-cluster-list');if(choices)choices.innerHTML='';
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
   if(e.target.id==='timeline-link-type'){this.state.linkType=e.target.value;this.applyConnectionFilters();}
   if(e.target.dataset.linkReligion){this.state.linkReligions=[...this.el.querySelectorAll('[data-link-religion]:checked')].map(x=>x.dataset.linkReligion);this.applyConnectionFilters();}
   if(e.target.id==='timeline-links-toggle'){this.state.showConnections=e.target.checked;this.paintTimeline();}
   if(e.target.id==='timeline-kind'){this.state.kind=e.target.value;this.focusTimelineMatches();if(this.timelineComparison)this.applyConnectionFilters();}
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
   this.leave();this.clearShareQR();this.worker?.terminate();this.el.removeEventListener('click',this.onClick);
   this.el.removeEventListener('input',this.onInput);this.el.removeEventListener('change',this.onChange);
   if(this.raf)cancelAnimationFrame(this.raf);
  }
 }
 const api={AtlasExplore,TimelineModel,TimelineShare,date};Object.assign(root,api);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
