/* ReligieAtlas geographical explorer. Coordinates are sourced identifications,
   never inferred from shared textual references or family relationships. */
(function(root){
  'use strict';
  const rows=[
    ['Places on the map','Plaatsen op de kaart','Lieux sur la carte'],
    ['Explore geographical locations, then follow the people and texts in each religion.','Verken de ligging en ontdek de bijbehorende personen en teksten per religie.','Explorez les lieux, puis les personnes et les textes de chaque religion.'],
    ['Religions on the map','Religies op de kaart','Religions sur la carte'],
    ['All religions','Alle religies','Toutes les religions'],['Christianity · Roman Catholic','Christendom · rooms-katholiek','Christianisme · catholique'],['Judaism','Jodendom','Judaïsme'],['Islam','Islam','Islam'],
    ['Search a place or passage','Zoek een plaats of tekstpassage','Chercher un lieu ou un passage'],['Place name, other name or reference…','Plaatsnaam, andere naam of verwijzing…','Nom, autre appellation ou référence…'],
    ['Location','Ligging','Localisation'],['All locations','Alle locaties','Toutes les localisations'],['With map location','Met kaartlocatie','Avec une localisation sur la carte'],['Without map location','Zonder kaartlocatie','Sans localisation sur la carte'],
    ['Show all results on the map','Toon alle resultaten op de kaart','Afficher tous les résultats sur la carte'],['Clear filters','Wis filters','Effacer les filtres'],
    ['{count} places · {mapped} on the map · {unmapped} without a map location','{count} plaatsen · {mapped} op de kaart · {unmapped} zonder kaartlocatie','{count} lieux · {mapped} sur la carte · {unmapped} sans localisation'],
    ['{count} place · {mapped} on the map · {unmapped} without a map location','{count} plaats · {mapped} op de kaart · {unmapped} zonder kaartlocatie','{count} lieu · {mapped} sur la carte · {unmapped} sans localisation'],
    ['A marker indicates a sourced identification, not proof that a person was there. Uncertain and traditional locations are labeled.','Een markering geeft een identificatie uit een bron aan, geen bewijs dat een persoon daar was. Onzekere en traditionele locaties zijn aangeduid.','Un repère indique une identification sourcée, pas la preuve de la présence d’une personne. Les localisations incertaines et traditionnelles sont indiquées.'],
    ['Map labels and present-day borders are for orientation; they do not represent historical boundaries or religious claims.','Kaartnamen en huidige grenzen dienen ter oriëntatie; ze geven geen historische grenzen of religieuze aanspraken weer.','Les noms et frontières actuels servent à l’orientation ; ils ne représentent ni frontières historiques ni revendications religieuses.'],
    ['Geographical map. Drag to move; use the zoom buttons or keyboard to zoom.','Geografische kaart. Sleep om te verplaatsen; gebruik de zoomknoppen of het toetsenbord om te zoomen.','Carte géographique. Faites glisser pour vous déplacer ; utilisez les boutons ou le clavier pour zoomer.'],
    ['Zoom in','Inzoomen','Agrandir'],['Zoom out','Uitzoomen','Réduire'],
    ['Map background unavailable. Locations and source links remain available below.','De achtergrondkaart is niet beschikbaar. Plaatsen en bronverwijzingen blijven hieronder beschikbaar.','Le fond de carte est indisponible. Les lieux et leurs sources restent accessibles ci-dessous.'],
    ['Map unavailable. Use the searchable place list and its source links.','De kaart is niet beschikbaar. Gebruik de doorzoekbare plaatsenlijst en de bronverwijzingen.','La carte est indisponible. Utilisez la liste des lieux et leurs sources.'],
    ['Mapped location','Gelokaliseerd','Localisé'],['Approximate location','Globale ligging','Localisation approximative'],['Traditional identification','Traditionele identificatie','Identification traditionnelle'],['Uncertain identification','Onzekere identificatie','Identification incertaine'],['Not located on the map','Niet op de kaart gelokaliseerd','Non localisé sur la carte'],
    ['Selected place','Geselecteerde plaats','Lieu sélectionné'],['Select a marker or a place in the list.','Selecteer een markering of een plaats in de lijst.','Sélectionnez un repère ou un lieu dans la liste.'],
    ['People and text passages','Personen en tekstpassages','Personnes et passages'],['Open the place profile with its associated people, reading links and context.','Open het plaatsprofiel met de bijbehorende personen, leeslinks en context.','Ouvrir la fiche du lieu avec ses personnes associées, ses lectures et son contexte.'],
    ['Location sources','Bronnen voor de ligging','Sources de localisation'],['Other proposed locations','Andere voorgestelde locaties','Autres localisations proposées'],['Map point','Kaartpunt','Point cartographique'],
    ['No places match these filters.','Geen plaatsen gevonden met deze filters.','Aucun lieu ne correspond à ces filtres.'],['Choose at least one religion to show places.','Kies minstens één religie om plaatsen te tonen.','Choisissez au moins une religion pour afficher les lieux.'],
    ['Show more places','Toon meer plaatsen','Afficher plus de lieux'],['{shown} of {total} shown','{shown} van {total} getoond','{shown} sur {total} affichés'],
    ['{count} places in this area','{count} plaatsen in dit gebied','{count} lieux dans cette zone'],['Zoom into this area','Zoom in op dit gebied','Agrandir cette zone'],['More places are listed below the map.','Meer plaatsen staan in de lijst onder de kaart.','D’autres lieux figurent dans la liste sous la carte.'],
    ['Open place details','Open plaatsdetails','Ouvrir les détails du lieu'],['Map data','Kaartgegevens','Données cartographiques'],['Report a map issue','Meld een kaartfout','Signaler une erreur de carte']
  ];
  root.BibleI18n?.registerRows(rows);
  const byText=new Map(rows.map(row=>[row[0],row]));
  const language=()=>root.BibleI18n?.language||'nl';
  const t=(s,p={})=>(root.BibleI18n?.t(s,p)||byText.get(s)?.[{en:0,nl:1,fr:2}[language()]]||s).replace(/\{(\w+)\}/g,(_,k)=>p[k]??'');
  const local=(value,locale=language())=>typeof value==='string'?value:value?.[locale]||value?.nl||value?.en||'';
  const allLanguages=value=>typeof value==='string'?[value]:['nl','en','fr'].map(locale=>value?.[locale]).filter(value=>typeof value==='string');
  const referenceTerms=label=>{const terms=allLanguages(label);if(typeof label!=='string')return terms;const match=label.match(/^(.+?) (\d.*)$/),names=root.BibleI18n?.bookNames;if(match&&names?.en){const book=match[1]==='Psalm'?'Psalms':match[1]==='Song of Songs'?'Song of Solomon':match[1],index=names.en.indexOf(book);if(index>=0)for(const locale of ['nl','en','fr'])if(names[locale]?.[index])terms.push(`${names[locale][index]} ${match[2]}`);}return terms;};
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normal=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().trim();
  const safeUrl=value=>{try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const traditions=['christianity','judaism','islam'];
  const religionNames={christianity:'Christianity · Roman Catholic',judaism:'Judaism',islam:'Islam'};
  const statusNames={identified:'Mapped location',approximate:'Approximate location',traditional:'Traditional identification',uncertain:'Uncertain identification',unmapped:'Not located on the map'};
  const keyOf=(tradition,id)=>`${tradition}|${id}`;
  const validPosition=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85.05112878&&Math.abs(lon)<=180;
  function nameOf(record,locale=language()){
    return record.tradition==='christianity'?(root.BIBLE_ENTITY_LOCALES?.[locale]?.places?.[record.id]?.name||local(record.place.name,locale)):local(record.place.name,locale);
  }
  function summaryOf(record,locale=language()){
    return record.tradition==='christianity'?(root.BIBLE_ENTITY_LOCALES?.[locale]?.places?.[record.id]?.description||record.place.description||''):local(record.place.summary,locale);
  }
  class PlacesMapModel{
    constructor(geography,collections){
      if(!Array.isArray(geography?.places))throw new Error('Missing place geography');
      this.meta=geography.meta||{};this.records=[];this.byKey=new Map();
      const indexes=new Map(traditions.map(tradition=>[tradition,new Map((collections?.[tradition]?.places||[]).map(p=>[p.id,p]))]));
      for(const geo of geography.places){
        if(!traditions.includes(geo.tradition)||typeof geo.id!=='string'||!Object.hasOwn(statusNames,geo.status))throw new Error('Invalid geographical identity or status');
        const key=keyOf(geo.tradition,geo.id),place=indexes.get(geo.tradition).get(geo.id);
        if(this.byKey.has(key)||!place)throw new Error('Unknown or duplicate geographical place');
        const mapped=validPosition(geo.lat,geo.lon);
        if((geo.status==='unmapped'&&(geo.lat!==null||geo.lon!==null))||(geo.status!=='unmapped'&&!mapped))throw new Error('Invalid geographical coordinates');
        const sources=(geo.sources||[]).map(source=>({...source,url:safeUrl(source.url)}));
        if(sources.some(source=>!source.url)||!sources.length)throw new Error('Missing or unsafe geographical provenance');
        const record={...geo,key,place,sources,mapped};this.records.push(record);this.byKey.set(key,record);
      }
    }
    filter(state,locale=language()){
      const selected=new Set(state.traditions||[]),terms=normal(state.query).split(/\s+/).filter(Boolean);
      return this.records.filter(record=>selected.has(record.tradition)&&(!(state.location==='mapped')||record.mapped)&&(!(state.location==='unmapped')||!record.mapped)&&terms.every(term=>normal([...allLanguages(record.place.name),...(record.place.aliases||[]),...(record.tradition==='christianity'?['nl','en','fr'].flatMap(lang=>{const translated=root.BIBLE_ENTITY_LOCALES?.[lang]?.places?.[record.id];return [translated?.name||'',...(translated?.aliases||[])];}):[]),...(record.place.refs||[]).flatMap(ref=>[...referenceTerms(ref.label),record.tradition==='christianity'?root.BibleI18n?.reference?.(ref.label)||'':''])].join(' ')).includes(term))).sort((a,b)=>{
        const exactA=normal(nameOf(a,locale))===normal(state.query),exactB=normal(nameOf(b,locale))===normal(state.query);
        return Number(exactB)-Number(exactA)||nameOf(a,locale).localeCompare(nameOf(b,locale),locale)||a.key.localeCompare(b.key);
      });
    }
  }
  // Screen-space grouping keeps overlapping religious records individually
  // selectable, without shifting their coordinates to fictitious locations.
  function groupPositions(records,project,distance=42){
    const groups=[],cells=new Map();
    for(const record of records.filter(r=>r.mapped).slice().sort((a,b)=>a.key.localeCompare(b.key))){
      const point=project(record),cx=Math.floor(point.x/distance),cy=Math.floor(point.y/distance);let group;
      for(let dx=-1;dx<=1&&!group;dx++)for(let dy=-1;dy<=1&&!group;dy++)group=(cells.get(`${cx+dx},${cy+dy}`)||[]).find(g=>Math.hypot(g.x-point.x,g.y-point.y)<=distance);
      if(group){group.records.push(record);continue;}
      group={x:point.x,y:point.y,lat:record.lat,lon:record.lon,records:[record]};groups.push(group);const cell=`${cx},${cy}`;if(!cells.has(cell))cells.set(cell,[]);cells.get(cell).push(group);
    }
    return groups;
  }
  class PlacesMapView{
    constructor(container,callbacks={}){
      if(!container?.addEventListener)throw new TypeError('PlacesMapView requires a container');
      this.container=container;this.callbacks=callbacks;this.state={traditions:['christianity'],query:'',location:'all',selected:null,limit:30};this.model=null;this.map=null;this.markerLayer=null;this.tileErrors=0;this.destroyed=false;
      container.classList?.add('places-map');container.setAttribute?.('translate','no');
      this.click=event=>{const button=event.target.closest('[data-pm-all],[data-pm-select],[data-pm-open],[data-pm-fit],[data-pm-clear],[data-pm-more],[data-pm-cluster]');if(!button||!container.contains(button))return;const d=button.dataset;
        if(d.pmSelect!==undefined)this.selectPlace(d.pmSelect);
        else if(d.pmOpen!==undefined){const record=this.model?.byKey.get(d.pmOpen);if(record)this.callbacks.onPlace?.({tradition:record.tradition,id:record.id});}
        else if(d.pmAll!==undefined){this.state.traditions=[...traditions];this.state.limit=30;this.update(true);}
        else if(d.pmFit!==undefined)this.fitResults();
        else if(d.pmClear!==undefined){this.state.query='';this.state.location='all';this.state.limit=30;this.state.traditions=[...traditions];this.update(true);}
        else if(d.pmMore!==undefined){this.state.limit+=30;this.renderResults();}
        else if(d.pmCluster!==undefined){const group=this.groups?.[Number(d.pmCluster)];if(group&&this.map){this.map.closePopup();this.map.setView([group.lat,group.lon],Math.min(this.map.getZoom()+2,18));}}
      };
      this.input=event=>{if(event.target.matches('[data-pm-search]')){this.state.query=event.target.value;this.state.limit=30;this.update(false);}};
      this.change=event=>{if(event.target.matches('[data-pm-religion]')){const tradition=event.target.dataset.pmReligion;if(!traditions.includes(tradition))return;const selected=new Set(this.state.traditions);event.target.checked?selected.add(tradition):selected.delete(tradition);this.state.traditions=traditions.filter(r=>selected.has(r));this.state.limit=30;this.update(true);}else if(event.target.matches('[data-pm-location]')){if(!['all','mapped','unmapped'].includes(event.target.value))return;this.state.location=event.target.value;this.state.limit=30;this.update(false);}};
      container.addEventListener('click',this.click);container.addEventListener('input',this.input);container.addEventListener('change',this.change);this.renderShell();
    }
    setData(geography,collections){this.model=new PlacesMapModel(geography,collections);this.update(true);return this;}
    setTradition(tradition){if(tradition!=='all'&&!traditions.includes(tradition))return this;this.state.traditions=tradition==='all'?[...traditions]:[tradition];this.state.query='';this.state.location='all';this.state.limit=30;this.state.selected=null;this.update(true);return this;}
    getState(){return {...this.state,traditions:[...this.state.traditions],center:this.map?{lat:this.map.getCenter().lat,lon:this.map.getCenter().lng}:null,zoom:this.map?.getZoom()??null};}
    renderShell(){
      this.container.innerHTML=`<header class="pm-heading"><div><span class="pm-kicker">ReligieAtlas</span><h2 data-pm-title></h2><p data-pm-intro></p></div></header><div class="pm-controls"></div><p class="pm-status" role="status" aria-live="polite"></p><div class="pm-workspace"><div class="pm-map-panel"><div class="pm-map" role="region" tabindex="0"></div><p class="pm-map-error" role="status" hidden></p><div class="pm-map-footer"><button type="button" data-pm-fit></button><a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer" data-pm-report></a></div></div><article class="pm-detail"></article></div><p class="pm-note" data-pm-note></p><details class="pm-border-note"><summary data-pm-boundary-summary></summary><p data-pm-boundary-note></p><div data-pm-credits></div></details><div class="pm-results"></div>`;
      this.renderChrome();this.initMap();
    }
    renderChrome(){
      const q=s=>this.container.querySelector(s);q('[data-pm-title]').textContent=t('Places on the map');q('[data-pm-intro]').textContent=t('Explore geographical locations, then follow the people and texts in each religion.');
      q('.pm-controls').innerHTML=`<fieldset class="pm-religions"><legend>${escape(t('Religions on the map'))}</legend><button type="button" data-pm-all aria-pressed="${this.state.traditions.length===3}">${escape(t('All religions'))}</button>${traditions.map(tradition=>`<label class="pm-religion pm-${tradition}"><input type="checkbox" data-pm-religion="${tradition}"${this.state.traditions.includes(tradition)?' checked':''}><span class="pm-swatch" aria-hidden="true"></span>${escape(t(religionNames[tradition]))}</label>`).join('')}</fieldset><div class="pm-search-row"><label>${escape(t('Search a place or passage'))}<input type="search" data-pm-search value="${escape(this.state.query)}" placeholder="${escape(t('Place name, other name or reference…'))}"></label><label>${escape(t('Location'))}<select data-pm-location>${[['all','All locations'],['mapped','With map location'],['unmapped','Without map location']].map(([value,label])=>`<option value="${value}"${this.state.location===value?' selected':''}>${escape(t(label))}</option>`).join('')}</select></label><button type="button" data-pm-clear>${escape(t('Clear filters'))}</button></div>`;
      q('[data-pm-fit]').textContent=t('Show all results on the map');q('[data-pm-report]').textContent=t('Report a map issue');q('[data-pm-note]').textContent=t('A marker indicates a sourced identification, not proof that a person was there. Uncertain and traditional locations are labeled.');q('[data-pm-boundary-summary]').textContent=t('Map data');q('[data-pm-boundary-note]').textContent=t('Map labels and present-day borders are for orientation; they do not represent historical boundaries or religious claims.');q('.pm-map').setAttribute('aria-label',t('Geographical map. Drag to move; use the zoom buttons or keyboard to zoom.'));
      if(this.map?.zoomControl){const plus=this.container.querySelector('.leaflet-control-zoom-in'),minus=this.container.querySelector('.leaflet-control-zoom-out');if(plus){plus.title=t('Zoom in');plus.setAttribute('aria-label',t('Zoom in'));}if(minus){minus.title=t('Zoom out');minus.setAttribute('aria-label',t('Zoom out'));}}
      if(!q('.pm-map-error').hidden)q('.pm-map-error').textContent=t(this.map?'Map background unavailable. Locations and source links remain available below.':'Map unavailable. Use the searchable place list and its source links.');
    }
    initMap(){
      const L=root.L,element=this.container.querySelector('.pm-map');if(!L?.map){const error=this.container.querySelector('.pm-map-error');error.hidden=false;error.textContent=t('Map unavailable. Use the searchable place list and its source links.');return;}
      this.map=L.map(element,{scrollWheelZoom:false,zoomControl:false,worldCopyJump:false,minZoom:2,maxZoom:18,attributionControl:true}).setView([31.5,36],5);
      this.map.zoomControl=L.control.zoom({zoomInTitle:t('Zoom in'),zoomOutTitle:t('Zoom out')}).addTo(this.map);
      this.markerLayer=L.layerGroup().addTo(this.map);
      this.tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',keepBuffer:1,updateWhenIdle:true}).addTo(this.map);
      this.tileLayer.on('tileerror',()=>{if(++this.tileErrors>=2){const error=this.container.querySelector('.pm-map-error');error.hidden=false;error.textContent=t('Map background unavailable. Locations and source links remain available below.');}});
      this.tileLayer.on('tileload',()=>{this.tileErrors=0;this.container.querySelector('.pm-map-error').hidden=true;});
      this.map.on('zoomend',()=>this.renderMarkers());
      if(root.ResizeObserver){this.observer=new root.ResizeObserver(()=>this.resize());this.observer.observe(element);}
    }
    update(fit=false){
      if(!this.model)return;this.matches=this.model.filter(this.state);if(this.state.selected&&!this.matches.some(r=>r.key===this.state.selected))this.state.selected=null;
      this.renderControlsState();this.renderCredits();this.renderResults();this.renderDetail();this.renderMarkers();if(fit)this.fitResults();
    }
    renderCredits(){this.container.querySelector('[data-pm-credits]').innerHTML=(this.model?.meta.sources||[]).map(source=>{const url=safeUrl(source.url),licenseUrl=safeUrl(source.licenseUrl);return `${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(local(source.label||source.name))}</a>`:escape(local(source.label||source.name))}${source.license?` · ${licenseUrl?`<a href="${escape(licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(source.license)}</a>`:escape(source.license)}`:''}`;}).join('<br>');}
    renderControlsState(){
      for(const tradition of traditions){const input=this.container.querySelector(`[data-pm-religion="${tradition}"]`);if(input)input.checked=this.state.traditions.includes(tradition);}
      this.container.querySelector('[data-pm-all]')?.setAttribute('aria-pressed',String(this.state.traditions.length===3));const input=this.container.querySelector('[data-pm-search]');if(input&&input.value!==this.state.query)input.value=this.state.query;const select=this.container.querySelector('[data-pm-location]');if(select)select.value=this.state.location;
    }
    renderResults(){
      const matches=this.matches||[],mapped=matches.filter(r=>r.mapped).length;this.container.querySelector('.pm-status').textContent=t(matches.length===1?'{count} place · {mapped} on the map · {unmapped} without a map location':'{count} places · {mapped} on the map · {unmapped} without a map location',{count:matches.length,mapped,unmapped:matches.length-mapped});
      const visible=matches.slice(0,this.state.limit);this.container.querySelector('.pm-results').innerHTML=matches.length?`<div class="pm-place-list">${visible.map(record=>`<button type="button" class="pm-place pm-${record.tradition}" data-pm-select="${escape(record.key)}" aria-pressed="${this.state.selected===record.key}"><span class="pm-place-name">${escape(nameOf(record))}</span><span class="pm-place-religion"><i class="pm-swatch" aria-hidden="true"></i>${escape(t(religionNames[record.tradition]))}</span><span class="pm-location-status pm-status-${record.status}">${escape(t(statusNames[record.status]))}</span></button>`).join('')}</div><div class="pm-list-footer"><span>${escape(t('{shown} of {total} shown',{shown:visible.length,total:matches.length}))}</span>${visible.length<matches.length?`<button type="button" data-pm-more>${escape(t('Show more places'))}</button>`:''}</div>`:`<p class="pm-empty">${escape(t(this.state.traditions.length?'No places match these filters.':'Choose at least one religion to show places.'))}</p>`;
    }
    renderDetail(){
      const record=this.model?.byKey.get(this.state.selected),panel=this.container.querySelector('.pm-detail');
      if(!record){panel.innerHTML=`<div class="pm-detail-empty"><span class="pm-kicker">${escape(t('Selected place'))}</span><p>${escape(t('Select a marker or a place in the list.'))}</p></div>`;return;}
      panel.innerHTML=`<span class="pm-kicker pm-${record.tradition}"><i class="pm-swatch" aria-hidden="true"></i>${escape(t(religionNames[record.tradition]))}</span><h3 tabindex="-1">${escape(nameOf(record))}</h3><span class="pm-location-status pm-status-${record.status}">${escape(t(statusNames[record.status]))}</span>${record.candidateLabel?`<p class="pm-candidate"><strong>${escape(t('Map point'))}:</strong> ${escape(local(record.candidateLabel))}</p>`:''}<p class="pm-place-summary">${escape(summaryOf(record))}</p><p class="pm-location-note">${escape(local(record.note))}</p><button type="button" class="pm-open" data-pm-open="${escape(record.key)}">${escape(t('People and text passages'))} →</button><p class="pm-open-note">${escape(t('Open the place profile with its associated people, reading links and context.'))}</p><details class="pm-provenance"><summary>${escape(t('Location sources'))}</summary><ul>${record.sources.map(source=>`<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(local(source.label)||new URL(source.url).hostname)} ↗</a></li>`).join('')}</ul>${record.alternatives?.length?`<h4>${escape(t('Other proposed locations'))}</h4><ul>${record.alternatives.map(a=>`<li>${escape(local(a.label)||`${a.lat}, ${a.lon}`)}</li>`).join('')}</ul>`:''}</details>`;
    }
    selectPlace(key,{pan=true,focus=true}={}){
      if(typeof key==='object')key=keyOf(key.tradition,key.id);const record=this.model?.byKey.get(key);if(!record||!(this.matches||[]).some(r=>r.key===key))return false;
      this.state.selected=key;this.renderDetail();this.renderResults();this.renderMarkers();if(this.map&&record.mapped&&pan)this.map.panTo([record.lat,record.lon]);if(focus)this.container.querySelector('.pm-detail h3')?.focus?.({preventScroll:true});return true;
    }
    renderMarkers(){
      if(!this.map||!this.markerLayer||!this.model)return;const L=root.L;this.markerLayer.clearLayers();
      this.groups=groupPositions(this.matches||[],record=>this.map.project([record.lat,record.lon],this.map.getZoom()));
      this.groups.forEach((group,index)=>{
        const single=group.records.length===1,record=group.records[0],selected=group.records.some(r=>r.key===this.state.selected),title=single?`${nameOf(record)} · ${t(religionNames[record.tradition])} · ${t(statusNames[record.status])}${record.candidateLabel?` · ${t('Map point')}: ${local(record.candidateLabel)}`:''}`:t('{count} places in this area',{count:group.records.length});
        const icon=L.divIcon({className:'pm-marker-wrap',html:`<span class="pm-marker ${single?'pm-'+record.tradition:'pm-marker-group'}${selected?' is-selected':''}${single&&record.status!=='identified'?' is-uncertain':''}">${single?'<span aria-hidden="true"></span>':group.records.length}</span>`,iconSize:[32,32],iconAnchor:[16,16]});
        const marker=L.marker([group.lat,group.lon],{icon,title,alt:title,keyboard:true,riseOnHover:true,zIndexOffset:selected?1000:0}).addTo(this.markerLayer);
        if(single)marker.on('click',()=>this.selectPlace(record.key,{pan:false}));
        else{const entries=group.records.slice().sort((a,b)=>nameOf(a).localeCompare(nameOf(b))||a.key.localeCompare(b.key));marker.bindPopup(`<div class="pm-cluster-popup"><strong>${escape(title)}</strong><div>${entries.slice(0,40).map(r=>`<button type="button" data-pm-select="${escape(r.key)}"><strong>${escape(nameOf(r))}</strong><span>${escape(t(religionNames[r.tradition]))} · ${escape(t(statusNames[r.status]))}</span></button>`).join('')}</div>${entries.length>40?`<p>${escape(t('More places are listed below the map.'))}</p>`:''}${this.map.getZoom()<18?`<button class="pm-cluster-zoom" type="button" data-pm-cluster="${index}">${escape(t('Zoom into this area'))}</button>`:''}</div>`,{maxWidth:320,minWidth:220,autoPan:true});}
      });
    }
    fitResults(){
      if(!this.map)return;const records=(this.matches||[]).filter(r=>r.mapped);if(!records.length)return;
      this.map.invalidateSize({pan:false});if(records.length===1)this.map.setView([records[0].lat,records[0].lon],10);else this.map.fitBounds(records.map(r=>[r.lat,r.lon]),{padding:[35,35],maxZoom:10,animate:false});
    }
    changeLanguage(){this.renderChrome();this.update(false);return this;}
    resize(){if(this.map&&!this.destroyed)this.map.invalidateSize({pan:false});}
    destroy(){this.destroyed=true;this.container.removeEventListener('click',this.click);this.container.removeEventListener('input',this.input);this.container.removeEventListener('change',this.change);this.observer?.disconnect();this.map?.remove();this.map=null;this.markerLayer=null;}
  }
  root.PlacesMapView=PlacesMapView;root.PlacesMapModel=PlacesMapModel;
  if(typeof module!=='undefined'&&module.exports)module.exports={PlacesMapModel,PlacesMapView,groupPositions,nameOf,summaryOf,safeUrl,rows};
})(typeof window!=='undefined'?window:globalThis);
