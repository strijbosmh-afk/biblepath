/* Sourced information about prayer, dignity and peace, kept within each religion. */
(function(root){
 'use strict';
 const sections={prayer:['Prayer & daily life','Gebed & dagelijks leven','Prière et vie quotidienne'],dignity:['Friendship & human dignity','Vriendschap & menselijke waardigheid','Amitié et dignité humaine'],peace:['Peace & reconciliation','Vrede & verzoening','Paix et réconciliation']};
 const rows=[...Object.values(sections),['Texts, interpretation and lived practice.','Teksten, interpretatie en geleefde praktijk.','Textes, interprétation et pratiques vécues.'],['Search these dossiers','Doorzoek deze dossiers','Rechercher dans ces dossiers'],['Topic, practice or source…','Onderwerp, praktijk of bron…','Thème, pratique ou source…'],['All topics','Alle onderwerpen','Tous les thèmes'],['Clear filters','Wis filters','Effacer les filtres'],['Dossiers in Dutch','Dossiers in het Nederlands','Dossiers en néerlandais'],['Sources & context','Bronnen & context','Sources et contexte'],['Read passage','Lees passage','Lire le passage'],['Original source','Oorspronkelijke bron','Source originale'],['No matching dossiers. Clear the filters or try another word.','Geen passende dossiers. Wis de filters of probeer een ander woord.','Aucun dossier. Effacez les filtres ou essayez un autre mot.'],['In this dossier','In dit dossier','Dans ce dossier'],['People and organizations involved','Betrokken personen en organisaties','Personnes et organisations concernées'],['Development over time','Ontwikkeling door de tijd','Évolution dans le temps'],['Meaning and limits','Betekenis en grenzen','Portée et limites'],['Reviewed','Bronnen gecontroleerd','Sources vérifiées']];
 root.BibleI18n?.registerRows(rows);
 const t=s=>root.BibleI18n?.t(s)||s;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fold=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[’‘\']/g,'').toLowerCase();
 const safe=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'#';}catch{return '#';}};
 const kinds={scripture:'Heilige tekst',tradition:'Religieuze uitleg',practice:'Praktijkbron · eigen beschrijving',historical:'Historisch document'};
 class LifeCollection{
  constructor(data){
   if(!['christianity','judaism','islam'].includes(data?.meta?.tradition)||!Array.isArray(data.entries))throw Error('Invalid lived-religion collection');
   this.data=data;this.tradition=data.meta.tradition;this.byId=new Map();
   for(const e of data.entries){if(e.tradition!==this.tradition||!sections[e.section]||this.byId.has(e.id))throw Error('Mixed or duplicate identity');this.byId.set(e.id,e);}
  }
  search(section,query='',tag='all'){
   const terms=fold(query).trim().split(/\s+/).filter(Boolean);
   return this.data.entries.filter(e=>e.section===section&&(tag==='all'||e.tags.includes(tag))&&terms.every(term=>fold(JSON.stringify(e)).includes(term))).sort((a,b)=>a.order-b.order);
  }
  tags(section){return [...new Set(this.search(section).flatMap(e=>e.tags))];}
 }
 class LifeView{
  constructor(container,{onPassage=()=>{},onTimeline=()=>{}}={}){
   this.el=container;this.onPassage=onPassage;this.onTimeline=onTimeline;this.states=new Map();
   container.addEventListener('toggle',e=>{if(e.target.matches?.('.life-map-disclosure')&&e.target.open)this.renderMap();},true);
   container.addEventListener('input',e=>{if(e.target.id==='life-query'){this.state.query=e.target.value;this.renderResults();}});
   container.addEventListener('click',e=>{
    const node=e.target.closest('button');if(!node||!container.contains(node))return;
    if(node.dataset.lifeTag){this.state.tag=node.dataset.lifeTag;this.renderTags();this.renderResults();}
    else if(node.dataset.lifeId){this.state.selected=node.dataset.lifeId;this.renderResults();const title=this.el.querySelector('.life-detail h2');title?.focus({preventScroll:true});title?.scrollIntoView({block:'start',behavior:'auto'});}
    else if(node.dataset.lifeRead){const entry=this.model.byId.get(this.state.selected),source=entry?.sources.find(s=>s.id===node.dataset.lifeRead);if(source?.passage)this.onPassage({...source.passage},this.section);}
    else if(node.dataset.lifeTimeline){const entry=this.model.byId.get(this.state.selected);if(entry?.eventId===node.dataset.lifeTimeline)this.onTimeline(this.tradition,entry.eventId);}
    else if(node.dataset.lifeClear){this.state.query='';this.state.tag='all';this.render();this.el.querySelector('#life-query')?.focus();}
   });
  }
  get state(){return this.states.get(this.tradition+':'+this.section);}
  setCollection(data,section){if(!sections[section])throw Error('Unknown section');this.model=new LifeCollection(data);this.tradition=this.model.tradition;this.section=section;const key=this.tradition+':'+section;if(!this.states.has(key))this.states.set(key,{query:'',tag:'all',selected:this.model.search(section)[0]?.id||null});this.render();}
  getState(){const center=this.map?.getCenter();return {tradition:this.tradition,section:this.section,...this.state,mapOpen:Boolean(this.el.querySelector('.life-map-disclosure')?.open),mapCamera:center?{lat:center.lat,lng:center.lng,zoom:this.map.getZoom()}:null};}
  setState(saved){if(saved?.tradition!==this.tradition||saved.section!==this.section)return false;Object.assign(this.state,{query:String(saved.query||''),tag:saved.tag||'all',selected:saved.selected});this.render();if(saved.mapOpen){const disclosure=this.el.querySelector('.life-map-disclosure');if(disclosure){disclosure.open=true;this.renderMap();if(this.map&&saved.mapCamera)this.map.setView([saved.mapCamera.lat,saved.mapCamera.lng],saved.mapCamera.zoom);}}return true;}
  open(id){const entry=this.model.byId.get(id);if(!entry||entry.section!==this.section)return false;Object.assign(this.state,{query:'',tag:'all',selected:id});this.render();this.el.querySelector('.life-detail h2')?.focus();return true;}
  render(){
   this.map?.remove();this.map=null;this.mapKey=null;
   const meta=this.model.data.meta,guide=meta.sections[this.section];this.el.lang='nl';
   this.el.innerHTML=`<div class="life-guide"><span class="library-kicker">${esc(t('Texts, interpretation and lived practice.'))}</span><p>${esc(guide.intro)}</p><details><summary>${esc(t('Sources & context'))}</summary><p>${esc(meta.scope)}</p><p>${esc(guide.note)}</p><small>${esc(t('Reviewed'))}: ${esc(meta.reviewedAt)} · ${esc(t('Dossiers in Dutch'))}</small></details></div><div class="life-toolbar"><label for="life-query">${esc(t('Search these dossiers'))}<input type="search" id="life-query" maxlength="200" placeholder="${esc(t('Topic, practice or source…'))}" value="${esc(this.state.query)}"></label><div class="life-tags" role="group" aria-label="${esc(t('All topics'))}"></div><button class="life-clear" data-life-clear="true">${esc(t('Clear filters'))}</button></div><p class="life-count" role="status" aria-live="polite"></p><div class="life-cards" aria-label="Dossiers"></div><div class="life-detail"></div>`;
   if(this.section==='peace'&&this.model.search('peace').some(e=>e.location))this.el.querySelector('.life-cards').insertAdjacentHTML?.('beforebegin','<details class="life-map-disclosure"><summary>Kaart van de historische casussen</summary><p>De markeringen tonen indicatieve stadscentra, geen exacte vergaderlocaties. Kies een plaats om het bijbehorende dossier te openen.</p><div class="life-case-map" role="region" aria-label="Kaart van historische vredescasussen"></div><p class="life-map-status" role="status"></p></details>');
   this.renderTags();this.renderResults();
  }
  renderTags(){this.el.querySelector('.life-tags').innerHTML=[['all',t('All topics')],...this.model.tags(this.section).map(tag=>[tag,tag])].map(([key,title])=>`<button data-life-tag="${esc(key)}" aria-pressed="${this.state.tag===key}">${esc(title)}</button>`).join('');}
  renderResults(){
   const matches=this.model.search(this.section,this.state.query,this.state.tag);if(!matches.some(e=>e.id===this.state.selected))this.state.selected=matches[0]?.id||null;
   this.el.querySelector('.life-count').textContent=matches.length+' '+(matches.length===1?'dossier':'dossiers');
   this.el.querySelector('.life-cards').innerHTML=matches.map(e=>`<button class="life-card" data-life-id="${esc(e.id)}" aria-pressed="${this.state.selected===e.id}"><span class="life-card-number">${String(e.order).padStart(2,'0')}<span aria-hidden="true">${this.state.selected===e.id?'✓':'↗'}</span></span><strong>${esc(e.title)}</strong><span>${esc(e.summary)}</span></button>`).join('')||`<p>${esc(t('No matching dossiers. Clear the filters or try another word.'))}</p>`;
   this.renderDetail();
   if(this.map)this.renderMap();
  }
  renderMap(){
   const holder=this.el.querySelector('.life-case-map');if(!holder||!root.L)return;
   const entries=this.model.search('peace',this.state.query,this.state.tag).filter(e=>e.location),L=root.L;
   if(!this.map){this.map=L.map(holder,{scrollWheelZoom:false,minZoom:2,maxZoom:15}).setView([34,15],3);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(this.map);this.markers=L.layerGroup().addTo(this.map);}
   this.map.invalidateSize();this.markers.clearLayers();const grouped=new Map();
   for(const e of entries){const key=e.location.lat+','+e.location.lng;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(e);}
   for(const group of grouped.values()){const location=group[0].location,selected=group.some(e=>e.id===this.state.selected);const marker=L.circleMarker([location.lat,location.lng],{radius:selected?11:8,color:'#fffefa',weight:2,fillColor:selected?'#344e38':'#809a64',fillOpacity:1}).addTo(this.markers).bindTooltip(esc(location.name)).bindPopup(`<strong>${esc(location.name)}</strong>${group.map(e=>`<button class="life-map-open" data-life-id="${esc(e.id)}">${esc(e.title)} →</button>`).join('')}`,{minWidth:180,maxWidth:220,maxHeight:260,className:'life-map-popup'});marker.on?.('popupopen',()=>{this.el.querySelector('.leaflet-popup-close-button')?.setAttribute('aria-label','Sluit kaartvenster');});const element=marker.getElement?.();if(element){element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label',location.name+' · '+group.length+' '+(group.length===1?'dossier':'dossiers'));element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();marker.openPopup();}});}}
   const key=entries.map(e=>e.id).join(',');if(key!==this.mapKey&&entries.length){const points=entries.map(e=>[e.location.lat,e.location.lng]);this.map.fitBounds(L.latLngBounds(points),{padding:[30,30],maxZoom:7});}this.mapKey=key;
   const status=this.el.querySelector('.life-map-status');if(status)status.textContent=entries.length?`${entries.length} historische casussen op de kaart. De dossierlijst blijft ook zonder kaart beschikbaar.`:'Geen kaartlocaties bij deze filters.';
   const plus=this.el.querySelector('.leaflet-control-zoom-in'),minus=this.el.querySelector('.leaflet-control-zoom-out');plus?.setAttribute('aria-label','Kaart inzoomen');minus?.setAttribute('aria-label','Kaart uitzoomen');
  }
  renderDetail(){
   const panel=this.el.querySelector('.life-detail'),e=this.model.byId.get(this.state.selected);panel.hidden=!e;if(!e){panel.innerHTML='';return;}
   const anchor=id=>'life-source-'+e.id+'-'+id;
   const cites=ids=>`<span class="life-cites">${ids.map(id=>{const n=e.sources.findIndex(s=>s.id===id);return n<0?'':`<a href="#${esc(anchor(id))}" aria-label="${esc(e.sources[n].label)}">[${n+1}]</a>`;}).join(' ')}</span>`;
   panel.innerHTML=`<article class="life-article"><header><span class="library-kicker">${esc(t(sections[this.section][0]))}</span><h2 tabindex="-1">${esc(e.title)}</h2><p class="life-lead">${esc(e.summary)}</p></header>${e.eventId?`<button class="life-event-link" data-life-timeline="${esc(e.eventId)}">Bekijk deze gebeurtenis op de tijdslijn →</button>`:''}<nav class="life-outline" aria-label="${esc(t('In this dossier'))}">${e.blocks.map((b,i)=>`<a href="#life-block-${esc(e.id)}-${i}">${esc(b.title)}</a>`).join('')}</nav>${e.blocks.map((b,i)=>`<section id="life-block-${esc(e.id)}-${i}"><h3>${esc(b.title)}</h3><p>${esc(b.text)} ${cites(b.sourceIds)}</p></section>`).join('')}<section class="life-practice"><h3>${esc(e.practice.title)}</h3><ol>${e.practice.items.map(text=>`<li>${esc(text)}</li>`).join('')}</ol>${cites(e.practice.sourceIds)}</section>${e.actors?.length?`<section><h3>${esc(t('People and organizations involved'))}</h3><dl class="life-actors">${e.actors.map(a=>`<div><dt>${esc(a.name)}</dt><dd>${esc(a.role)}</dd></div>`).join('')}</dl></section>`:''}${e.process?.length?`<section><h3>${esc(t('Development over time'))}</h3><ol class="life-process">${e.process.map(p=>`<li><span>${esc(p.date)}</span><strong>${esc(p.title)}</strong><p>${esc(p.text)} ${cites(p.sourceIds)}</p></li>`).join('')}</ol></section>`:''}</article><aside class="life-sources"><h3>${esc(t('Sources & context'))}</h3><p>Bij elke bron staan het soort document en het perspectief vermeld. Tekst en praktijk blijven afzonderlijk herkenbaar.</p>${e.sources.map((s,i)=>`<section id="${esc(anchor(s.id))}" tabindex="-1"><span class="library-kicker">${i+1} · ${esc(kinds[s.kind]||s.kind)}</span><h4>${esc(s.label)}</h4><p>${esc(s.context)}</p>${s.passage?`<button data-life-read="${esc(s.id)}">${esc(t('Read passage'))} →<small>${esc({christianity:'Nederlandse katholieke Bijbel',judaism:'Hebreeuwse Tenach',islam:'Nederlandse Koranvertaling'}[s.passage.tradition])}</small></button>`:''}<a href="${esc(safe(s.url))}" target="_blank" rel="noopener noreferrer">${esc(t('Original source'))} ↗</a></section>`).join('')}</aside>`;
  }
 }
 root.LifeCollection=LifeCollection;root.LifeView=LifeView;root.LifeSections=sections;
 if(typeof module!=='undefined')module.exports={LifeCollection,LifeView,sections,safe};
})(typeof window!=='undefined'?window:globalThis);
