/* Religion-specific family relationships and places. Source text is never inferred from another collection. */
(() => {
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  const rows=[
    ['Constellation','Constellatie','Constellation'],['Family tree','Stamboom','Arbre généalogique'],['Ancestry rings','Verwantschapsringen','Cercles de parenté'],
    ['Direct family','Directe familie','Famille proche'],['Whole family','Hele familie','Toute la famille'],['Map scope','Omvang van de kaart','Étendue de la carte'],['Focus on this person','Deze persoon centraal','Centrer sur cette personne'],
    ['Sources and context','Bronnen en context','Sources et contexte'],['Relationship sources','Bronnen bij de relatie','Sources du lien'],['Map guide','Uitleg bij de kaart','Lire la carte'],['Fit map','Kaart passend maken','Ajuster la carte'],
    ['{shown} of {total} people','{shown} van {total} personen','{shown} personnes sur {total}'],
    ['Drag to pan. Scroll or pinch to zoom.','Sleep om te verplaatsen. Scroll of knijp om te zoomen.','Faites glisser pour déplacer. Défilez ou pincez pour zoomer.'],
    ['Interactive family map. Drag to pan, scroll or pinch to zoom. Use arrow keys to pan and plus or minus to zoom.','Interactieve familiekaart. Sleep om te verplaatsen, scroll of knijp om te zoomen. Gebruik de pijltjestoetsen om te verplaatsen en plus of min om te zoomen.','Carte familiale interactive. Faites glisser pour déplacer, défilez ou pincez pour zoomer. Utilisez les flèches pour déplacer et plus ou moins pour zoomer.'],
    ['Select to view family and source references.','Selecteer voor familiebanden en bronverwijzingen.','Sélectionnez pour les liens familiaux et les références.'],
    ['Family map','Familiekaart','Carte des familles'],['Cities explorer','Stedenverkenner','Villes et lieux'],
    ['Families & sources','Families & bronnen','Familles et sources'],['Cities & places','Steden & plaatsen','Villes et lieux'],
    ['Choose a family','Kies een familie','Choisir une famille'],['Search people in this collection','Zoek personen in deze collectie','Rechercher des personnes dans cette collection'],
    ['Name, alias or passage…','Naam, andere naam of passage…','Nom, variante ou passage…'],['Search cities and places','Zoek steden en plaatsen','Rechercher des villes et lieux'],
    ['All places','Alle plaatsen','Tous les lieux'],['City','Stad','Ville'],['Settlement','Nederzetting','Localité'],['Region','Gebied','Région'],['Mountain','Berg','Montagne'],['Sanctuary','Heiligdom','Sanctuaire'],['Place type','Soort plaats','Type de lieu'],
    ['{count} people','{count} personen','{count} personnes'],['{count} places','{count} plaatsen','{count} lieux'],['{count} people · {links} connections','{count} personen · {links} relaties','{count} personnes · {links} liens'],
    ['No matching people. Try another name or passage.','Geen passende personen. Probeer een andere naam of passage.','Aucune personne correspondante. Essayez un autre nom ou passage.'],
    ['No matching places. Try another search or place type.','Geen passende plaatsen. Probeer een andere zoekterm of soort plaats.','Aucun lieu correspondant. Essayez une autre recherche ou un autre type de lieu.'],
    ['Clear search','Wis zoekopdracht','Effacer la recherche'],['Family connections','Familierelaties','Liens familiaux'],['Sources & reading','Bronnen & verder lezen','Sources et lectures'],
    ['Parent → child','Ouder → kind','Parent → enfant'],['Spouses','Partners in een huwelijk','Conjoints'],['Siblings','Broers en zussen','Frères et sœurs'],['Guardianship','Voogdij of zorg','Tutelle ou protection'],['Adoptive relationship','Adoptierelatie','Lien adoptif'],
    ['Only parent–child lines have arrows. Other relationships retain their own labels and sources.','Alleen ouder-kindlijnen hebben pijlen. Andere relaties behouden hun eigen aanduiding en bronnen.','Seules les lignes parent-enfant portent des flèches. Les autres liens conservent leurs propres intitulés et sources.'],
    ['Select a name for its profile and relationship sources. Scroll within the map to see more; use the buttons to zoom.','Selecteer een naam voor het profiel en de bronnen bij de relaties. Schuif binnen de kaart om meer te zien; gebruik de knoppen om te zoomen.','Sélectionnez un nom pour son profil et les sources des liens. Faites défiler la carte ou utilisez les boutons de zoom.'],
    ['Rows organize documented family links; they do not represent dates or exact generational distances.','De rijen ordenen gedocumenteerde familiebanden; ze geven geen datums of exacte generatieafstanden weer.','Les rangées organisent les liens familiaux documentés ; elles ne représentent ni dates ni écarts générationnels exacts.'],
    ['Family map: scroll to explore','Familiekaart: schuif om te verkennen','Carte des familles : faire défiler pour explorer'],['Zoom in','Inzoomen','Agrandir'],['Zoom out','Uitzoomen','Réduire'],['Fit whole family','Toon hele familie','Afficher toute la famille'],['Move left','Naar links','Déplacer à gauche'],['Move right','Naar rechts','Déplacer à droite'],
    ['People in this family','Personen in deze familie','Personnes de cette famille'],['Open in people index','Open in personenindex','Ouvrir dans l’index des personnes'],['Related places','Gerelateerde plaatsen','Lieux associés'],
    ['Historical context','Historische context','Contexte historique'],['Location & identification','Ligging & identificatie','Localisation et identification'],['People in these accounts','Personen in deze verhalen','Personnes de ces récits'],
    ['These links indicate an association in the cited accounts, not necessarily residence at this place.','Deze koppelingen geven een verband in de aangehaalde verhalen aan, niet noodzakelijk een verblijf op deze plaats.','Ces liens indiquent une association dans les récits cités, pas nécessairement une résidence sur place.'],
    ['Open family profile','Open familieprofiel','Ouvrir le profil familial'],['No relationship is recorded in this selected family.','Binnen deze geselecteerde familie is geen relatie vastgelegd.','Aucun lien n’est documenté dans cette famille sélectionnée.'],
    ['Sacred text','Heilige tekst','Texte sacré'],['Tradition & interpretation','Traditie & interpretatie','Tradition et interprétation'],['Historical source','Historische bron','Source historique'],['Open original source','Open oorspronkelijke bron','Ouvrir la source originale'],
    ['Read passage · Hebrew Tanakh','Lees passage · Hebreeuwse Tenach','Lire le passage · Tanakh hébreu'],['Read passage · Dutch Qur’an translation','Lees passage · Nederlandse Koranvertaling','Lire le passage · Traduction néerlandaise du Coran'],
    ['← Back to the family map','← Terug naar de familiekaart','← Retour à la carte des familles'],['← Back to cities and places','← Terug naar steden en plaatsen','← Retour aux villes et lieux'],
    ['Family relationships within the Jewish tradition, with their textual sources.','Familierelaties binnen de Joodse traditie, met hun tekstbronnen.','Liens familiaux dans la tradition juive, avec leurs sources textuelles.'],
    ['Family relationships within the Islamic tradition, with scripture and later tradition distinguished.','Familierelaties binnen de islamitische traditie, met onderscheid tussen schrifttekst en latere traditie.','Liens familiaux dans la tradition islamique, en distinguant les textes sacrés des traditions ultérieures.'],
    ['Places in Jewish texts and history, with sources and location notes.','Plaatsen in Joodse teksten en geschiedenis, met bronnen en toelichting bij de ligging.','Lieux dans les textes et l’histoire juifs, avec sources et précisions géographiques.'],
    ['Places in Islamic texts and history, with sources and location notes.','Plaatsen in islamitische teksten en geschiedenis, met bronnen en toelichting bij de ligging.','Lieux dans les textes et l’histoire islamiques, avec sources et précisions géographiques.']
  ];
  root.BibleI18n?.registerRows(rows);
  const language=()=>root.BibleI18n?.language||'nl';
  const tr=(key,params={})=>root.BibleI18n?.t(key,params)||key.replace(/\{(\w+)\}/g,(_,k)=>params[k]??'');
  const local=(value,locale=language())=>value?.[locale]||value?.nl||value?.en||'';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
  const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const relationLabels={parent:'Parent → child',spouse:'Spouses',sibling:'Siblings',guardian:'Guardianship',adoptive:'Adoptive relationship'};
  const placeLabels={city:'City',settlement:'Settlement',region:'Region',mountain:'Mountain',sanctuary:'Sanctuary'};
  const sourceLabels={scripture:'Sacred text',tradition:'Tradition & interpretation',historical:'Historical source'};
  const localized=value=>value&&['nl','en','fr'].every(k=>typeof value[k]==='string'&&value[k].trim());
  class TraditionAtlasModel {
    constructor(data){
      this.tradition=data?.meta?.tradition;
      if(!['judaism','islam'].includes(this.tradition)||!localized(data.meta.familyScope)||!localized(data.meta.placesScope))throw new Error('Invalid atlas scope');
      this.data=data;this.people=data.people;this.relationships=data.relationships;this.families=data.families;this.places=data.places;
      if([this.people,this.relationships,this.families,this.places].some(a=>!Array.isArray(a)||!a.length))throw new Error('Empty atlas collection');
      const index=(items,label)=>{const map=new Map();for(const item of items){if(!new RegExp(`^${this.tradition}:[a-z0-9-]+$`).test(item.id)||map.has(item.id))throw new Error(`Invalid ${label} identity`);map.set(item.id,item);}return map;};
      this.peopleById=index(this.people,'person');this.relationshipsById=index(this.relationships,'relationship');this.familiesById=index(this.families,'family');this.placesById=index(this.places,'place');
      const refs=(list)=>{if(!Array.isArray(list)||!list.length)throw new Error('Missing atlas sources');for(const r of list){if(!/^[a-z0-9-]+$/.test(r.id)||!localized(r.label)||!Object.hasOwn(sourceLabels,r.kind)||!safeUrl(r.url))throw new Error('Invalid atlas source');if(r.passage){const p=r.passage;if(p.tradition!==this.tradition||p.edition!==(this.tradition==='judaism'?'he':'nl')||!Number.isInteger(p.verse)||p.verse<1||!Number.isInteger(p.endVerse)||p.endVerse<p.verse||(this.tradition==='judaism'?(!/^[A-Z0-9]{3}$/.test(p.book)||!Number.isInteger(p.chapter)||p.chapter<1):(!Number.isInteger(p.surah)||p.surah<1||p.surah>114)))throw new Error('Invalid atlas passage');}}};
      for(const p of this.people){if(!localized(p.name)||!localized(p.summary)||!Array.isArray(p.aliases))throw new Error('Invalid atlas person');refs(p.refs);}
      for(const r of this.relationships){if(!this.peopleById.has(r.source)||!this.peopleById.has(r.target)||r.source===r.target||!Object.hasOwn(relationLabels,r.type)||!localized(r.summary))throw new Error('Invalid atlas relationship');refs(r.refs);}
      for(const f of this.families){if(!localized(f.title)||!localized(f.summary)||!Array.isArray(f.personIds)||!f.personIds.length||new Set(f.personIds).size!==f.personIds.length||f.personIds.some(id=>!this.peopleById.has(id)))throw new Error('Invalid atlas family');}
      for(const p of this.places){if(!localized(p.name)||!localized(p.summary)||!localized(p.historicalContext)||!localized(p.locationNote)||!Object.hasOwn(placeLabels,p.kind)||!Array.isArray(p.aliases)||!Array.isArray(p.personIds)||p.personIds.some(id=>!this.peopleById.has(id)))throw new Error('Invalid atlas place');refs(p.refs);}
      if(this.people.some(p=>!this.families.some(f=>f.personIds.includes(p.id))&&!(typeof p.indexId==='string'&&p.indexId&&this.places.some(place=>place.personIds.includes(p.id)))))throw new Error('Person without a family group or indexed place association');
      // Reject directed parent cycles rather than presenting an invented generation order.
      const visiting=new Set(),done=new Set(),children=new Map(this.people.map(p=>[p.id,[]]));
      this.relationships.filter(r=>r.type==='parent').forEach(r=>children.get(r.source).push(r.target));
      const visit=id=>{if(visiting.has(id))throw new Error('Cyclic parent relationship');if(done.has(id))return;visiting.add(id);children.get(id).forEach(visit);visiting.delete(id);done.add(id);};this.people.forEach(p=>visit(p.id));
    }
    searchPeople(query='',locale=language()){
      const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
      return this.people.filter(p=>terms.every(term=>normalize([local(p.name,locale),...p.aliases,local(p.summary,locale),...p.refs.map(r=>local(r.label,locale))].join(' ')).includes(term)));
    }
    searchPlaces(query='',kind='all',locale=language()){
      const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
      return this.places.filter(p=>(kind==='all'||kind===p.kind)&&terms.every(term=>normalize([local(p.name,locale),...p.aliases,local(p.summary,locale),local(p.historicalContext,locale),...p.refs.map(r=>local(r.label,locale))].join(' ')).includes(term))).sort((a,b)=>local(a.name,locale).localeCompare(local(b.name,locale))||a.id.localeCompare(b.id));
    }
    familyForPerson(id,preferred){const current=this.familiesById.get(preferred);return current?.personIds.includes(id)?current:this.families.find(f=>f.personIds.includes(id));}
    familyGraph(id){const family=this.familiesById.get(id);if(!family)return {people:[],relationships:[]};const included=new Set(family.personIds);return {people:family.personIds.map(pid=>this.peopleById.get(pid)),relationships:this.relationships.filter(r=>included.has(r.source)&&included.has(r.target))};}
  }
  // Spouses share a row only when doing so preserves every documented parent
  // direction. The union changes layout groups, never person identities.
  function familyLayout(people,relationships){
    const parents=new Map(people.map(p=>[p.id,p.id]));
    const find=id=>{while(parents.get(id)!==id)id=parents.get(id);return id;};
    const ancestry=relationships.filter(r=>r.type==='parent'||r.type==='adoptive');
    const acyclic=()=>{const groups=[...new Set(people.map(p=>find(p.id)))],next=new Map(groups.map(id=>[id,[]]));for(const e of ancestry){const a=find(e.source),b=find(e.target);if(a===b)return false;next.get(a).push(b);}const active=new Set(),done=new Set();const visit=id=>{if(active.has(id))return false;if(done.has(id))return true;active.add(id);for(const child of next.get(id))if(!visit(child))return false;active.delete(id);done.add(id);return true;};return groups.every(visit);};
    for(const edge of relationships.filter(r=>r.type==='spouse')){const a=find(edge.source),b=find(edge.target);if(a===b)continue;parents.set(b,a);if(!acyclic())parents.set(b,b);}
    const groups=[...new Set(people.map(p=>find(p.id)))],depth=new Map(groups.map(id=>[id,0]));
    const edges=ancestry.map(r=>[find(r.source),find(r.target)]);
    for(let step=0;step<groups.length;step++){let changed=false;for(const [a,b] of edges){const next=depth.get(a)+1;if(next>depth.get(b)){depth.set(b,next);changed=true;}}if(!changed)break;if(step===groups.length-1)throw new Error('Inconsistent family generations');}
    const bands=new Map();for(const p of people){const d=depth.get(find(p.id));if(!bands.has(d))bands.set(d,[]);bands.get(d).push(p);}
    const maxColumns=Math.max(1,...[...bands.values()].map(a=>a.length)),width=Math.max(600,maxColumns*184+80),height=Math.max(300,(Math.max(0,...bands.keys())+1)*164+90),nodes=[];
    for(const [level,band] of bands){const start=(width-band.length*184)/2+92;band.forEach((p,i)=>nodes.push({person:p,id:p.id,x:start+i*184,y:84+level*164,width:160,height:84}));}
    return {nodes,width,height,byId:new Map(nodes.map(n=>[n.id,n]))};
  }
  function relationshipRoute(edge,layout,index=0){
    const a=layout.byId.get(edge.source),b=layout.byId.get(edge.target);
    if(a.y===b.y){const above=a.y-62-(index%3)*7;return [[a.x,a.y-42],[a.x,above],[b.x,above],[b.x,b.y-42]];}
    const direction=b.y>a.y?1:-1,from=a.y+direction*42,to=b.y-direction*42;
    if(Math.abs(b.y-a.y)<=164){const middle=(from+to)/2;return [[a.x,from],[a.x,middle],[b.x,middle],[b.x,to]];}
    // Multi-generation edges travel outside every node column, then re-enter
    // in the clear gap above/below the destination row.
    const gutter=(a.x+b.x)/2<layout.width/2?12+(index%3)*5:layout.width-12-(index%3)*5;
    return [[a.x,from],[a.x,a.y+direction*82],[gutter,a.y+direction*82],[gutter,b.y-direction*82],[b.x,b.y-direction*82],[b.x,to]];
  }
  class TraditionAtlasView {
    constructor(container,{onPassage=()=>{},onPerson=()=>{},onModeChange=()=>{}}={}){
      this.container=container;this.onPassage=onPassage;this.onPerson=onPerson;this.onModeChange=onModeChange;this.states=new Map();this.refs=new Map();this.refSerial=0;this.graph=null;
      this.click=event=>{const el=event.target.closest('[data-atlas-person],[data-atlas-city],[data-atlas-city-person],[data-atlas-index],[data-atlas-passage],[data-atlas-zoom],[data-atlas-pan],[data-atlas-clear],[data-atlas-layout],[data-atlas-focus]');if(!el||!container.contains(el))return;const d=el.dataset;
        if(d.atlasPerson)this.openPerson(d.atlasPerson);
        else if(d.atlasCity){const switched=this.mode!=='cities';if(this.openPlace(d.atlasCity,{preserveFilters:!switched})&&switched)this.onModeChange('cities');}
        else if(d.atlasCityPerson){this.openPerson(d.atlasCityPerson);this.onModeChange('map');}
        else if(d.atlasIndex){const p=this.model.peopleById.get(d.atlasIndex);if(p?.indexId)this.onPerson(p.indexId);}
        else if(d.atlasPassage){const ref=this.refs.get(d.atlasPassage);if(ref?.passage)this.onPassage({...ref.passage});}
        else if(d.atlasZoom){if(d.atlasZoom==='fit')this.graph?.fit();else this.graph?.zoomBy(d.atlasZoom==='in'?1.25:.8);}
        else if(d.atlasPan){if(this.graph){this.graph.transform.x+=d.atlasPan==='left'?160:-160;this.graph.applyTransform();}}
        else if(d.atlasLayout&&['constellation','lineage','radial'].includes(d.atlasLayout)){this.state.layout=d.atlasLayout;this.state.camera=null;this.render();}
        else if(d.atlasFocus){this.state.focus=this.state.selected;this.state.camera=null;this.renderMap();}
        else if(d.atlasClear){if(d.atlasClear==='people')this.state.mapQuery='';else{this.state.cityQuery='';this.state.kind='all';}this.render();this.focus(d.atlasClear==='people'?'[data-atlas-search]':'[data-atlas-city-search]');}
      };
      this.input=event=>{if(event.target.matches('[data-atlas-search]')){this.state.mapQuery=event.target.value;this.renderPeopleResults();}else if(event.target.matches('[data-atlas-city-search]')){this.state.cityQuery=event.target.value;this.renderPlaceResults();}};
      this.change=event=>{if(event.target.matches('[data-atlas-family]')){const f=this.model.familiesById.get(event.target.value);if(!f)return;this.state.family=f.id;this.state.selected=this.state.focus=f.personIds[0];this.state.zoom=null;this.state.camera=null;this.render();this.focus('[data-atlas-family]');}else if(event.target.matches('[data-atlas-scope]')){this.state.showAll=event.target.value==='all';this.state.focus=this.state.selected;this.state.camera=null;this.renderMap();}else if(event.target.matches('[data-atlas-kind]')){this.state.kind=event.target.value;this.renderPlaceResults();}};
      this.key=event=>{const node=event.target.closest('[data-atlas-person]');if(node&&container.contains(node)&&['Enter',' '].includes(event.key)&&node.tagName?.toLowerCase()==='g'){event.preventDefault();this.openPerson(node.dataset.atlasPerson);}};
      for(const [name,fn] of [['click',this.click],['input',this.input],['change',this.change],['keydown',this.key]])container.addEventListener(name,fn);
    }
    destroy(){this.graph?.destroy();this.graph=null;for(const [name,fn] of [['click',this.click],['input',this.input],['change',this.change],['keydown',this.key]])this.container.removeEventListener(name,fn);}
    focus(selector){this.container.querySelector(selector)?.focus();}
    setCollection(data,mode='map'){
      this.model=new TraditionAtlasModel(data);this.tradition=this.model.tradition;
      const saved=this.states.get(this.tradition);if(saved&&(!this.model.familiesById.has(saved.family)||!this.model.peopleById.has(saved.selected)||!this.model.peopleById.has(saved.focus)))this.states.delete(this.tradition);
      if(!this.states.has(this.tradition))this.states.set(this.tradition,{family:this.model.families[0].id,selected:this.model.families[0].personIds[0],mapQuery:'',cityQuery:'',kind:'all',citySelected:null,zoom:null,mode:'map',focus:this.model.families[0].personIds[0],layout:'constellation',showAll:false,camera:null,graphKey:null});
      this.state=this.states.get(this.tradition);this.setMode(mode);
    }
    setMode(mode){if(!['map','cities'].includes(mode))return false;this.mode=this.state.mode=mode;this.render();return true;}
    getState(){return this.state?{...this.state,tradition:this.tradition}:null;}
    changeLanguage(){if(this.model)this.render();}
    openPerson(id){
      if(!this.model.peopleById.has(id))return false;
      const family=this.model.familyForPerson(id,this.state.family);if(!family)return false;
      const sameScene=family.id===this.state.family&&this.mode==='map'&&this.graph?.peopleById.has(id);
      if(!sameScene){this.state.focus=id;this.state.camera=null;this.state.zoom=null;}
      this.state.family=family.id;this.state.selected=id;this.mode=this.state.mode='map';
      if(sameScene){this.graph.selectedId=id;this.graph.highlight(null);this.renderPerson();this.renderPeopleResults();}
      else this.render();
      this.focus('.atlas-person-detail h2');return true;
    }
    openPlace(id,{preserveFilters=false}={}){
      if(!this.model?.placesById.has(id))return false;
      if(!preserveFilters||!this.model.searchPlaces(this.state.cityQuery,this.state.kind).some(p=>p.id===id)){this.state.cityQuery='';this.state.kind='all';}
      this.state.citySelected=id;this.mode=this.state.mode='cities';this.render();this.focus('.atlas-place-detail h2');return true;
    }
    render(){
      if(!this.model)return;this.graph?.destroy();this.graph=null;this.refs.clear();this.refSerial=0;
      this.container.innerHTML=this.mode==='map'?this.mapShell():`<div class="atlas-introduction"><span class="library-kicker">${esc(tr('Cities & places'))}</span><p>${esc(local(this.model.data.meta.placesScope))}</p></div>${this.citiesShell()}`;
      if(this.mode==='map'){this.renderPeopleResults();this.renderMap();this.renderPerson();}else this.renderPlaceResults();
    }
    mapShell(){const f=this.model.familiesById.get(this.state.family);return `<div class="atlas-toolbar"><label>${esc(tr('Choose a family'))}<select data-atlas-family>${this.model.families.map(item=>`<option value="${esc(item.id)}"${item.id===f.id?' selected':''}>${esc(local(item.title))}</option>`).join('')}</select></label><label>${esc(tr('Search people in this collection'))}<input type="search" data-atlas-search value="${esc(this.state.mapQuery)}" placeholder="${esc(tr('Name, alias or passage…'))}"></label></div><div class="atlas-person-results"></div><div class="atlas-layout-picker" role="group" aria-label="${esc(tr('Family map'))}">${[['constellation','Constellation'],['lineage','Family tree'],['radial','Ancestry rings']].map(([layout,label])=>`<button type="button" data-atlas-layout="${layout}" aria-pressed="${this.state.layout===layout}">${esc(tr(label))}</button>`).join('')}</div><div class="atlas-map-workspace"><section class="atlas-map-panel"><header class="atlas-map-toolbar"><div><h2>${esc(local(f.title))}</h2><span class="atlas-map-count" role="status"></span></div><label class="atlas-scope-label">${esc(tr('Map scope'))}<select data-atlas-scope><option value="near"${!this.state.showAll?' selected':''}>${esc(tr('Direct family'))}</option><option value="all"${this.state.showAll?' selected':''}>${esc(tr('Whole family'))}</option></select></label></header><div class="atlas-graph-wrap"><div class="atlas-canvas"></div><div class="atlas-graph-bottom"><span class="atlas-drag-hint">${esc(tr('Drag to pan. Scroll or pinch to zoom.'))}</span><div class="atlas-zoom-controls"><button type="button" data-atlas-zoom="out" aria-label="${esc(tr('Zoom out'))}">−</button><output class="atlas-zoom-value">100%</output><button type="button" data-atlas-zoom="in" aria-label="${esc(tr('Zoom in'))}">+</button><button type="button" data-atlas-zoom="fit" aria-label="${esc(tr('Fit map'))}" title="${esc(tr('Fit map'))}">⤢</button></div></div></div><details class="atlas-map-guide"><summary>${esc(tr('Map guide'))}</summary><div class="atlas-legend">${Object.entries(relationLabels).map(([key,label])=>`<span><i class="atlas-line atlas-line-${key}" aria-hidden="true"></i>${esc(tr(label))}</span>`).join('')}</div><p class="atlas-map-help">${esc(tr('Only parent–child lines have arrows. Other relationships retain their own labels and sources.'))} ${esc(tr('Rows organize documented family links; they do not represent dates or exact generational distances.'))}</p><p class="atlas-map-help">${esc(local(f.summary))} ${esc(local(this.model.data.meta.familyScope))}</p></details><details class="atlas-family-people"><summary>${esc(tr('People in this family'))}</summary><div>${f.personIds.map(id=>`<button type="button" data-atlas-person="${esc(id)}" aria-pressed="${id===this.state.selected}">${esc(local(this.model.peopleById.get(id).name))}</button>`).join('')}</div></details></section><article class="atlas-person-detail atlas-detail"></article></div>`;}
    renderPeopleResults(){const panel=this.container.querySelector('.atlas-person-results');if(!panel)return;if(!this.state.mapQuery.trim()){panel.innerHTML='';panel.hidden=true;return;}panel.hidden=false;const matches=this.model.searchPeople(this.state.mapQuery);panel.innerHTML=`<p role="status">${esc(tr('{count} people',{count:matches.length}))}</p><div>${matches.map(p=>`<button type="button" data-atlas-${this.model.familyForPerson(p.id)?'person':'index'}="${esc(p.id)}" title="${esc(tr(this.model.familyForPerson(p.id)?'Open family profile':'Open in people index'))}" aria-pressed="${p.id===this.state.selected}">${esc(local(p.name))}</button>`).join('')||`<p>${esc(tr('No matching people. Try another name or passage.'))}</p>`}<button type="button" data-atlas-clear="people">${esc(tr('Clear search'))} ×</button></div>`;}
    visibleFamily(){
      const all=this.model.familyGraph(this.state.family);
      if(this.state.showAll)return all;
      const ids=new Set([this.state.focus]);
      for(const r of all.relationships)if(r.source===this.state.focus||r.target===this.state.focus){ids.add(r.source);ids.add(r.target);}
      return {people:all.people.filter(p=>ids.has(p.id)),relationships:all.relationships.filter(r=>ids.has(r.source)&&ids.has(r.target))};
    }
    renderMap(){
      const visible=this.visibleFamily(),all=this.model.familyGraph(this.state.family),canvas=this.container.querySelector('.atlas-canvas');
      const key=[this.tradition,this.state.family,this.state.focus,this.state.layout,this.state.showAll].join('|');
      const camera=key===this.state.graphKey?this.state.camera:null;
      this.graph?.destroy();this.graph=null;canvas.innerHTML='';
      this.container.querySelector('.atlas-map-count').textContent=tr('{shown} of {total} people',{shown:visible.people.length,total:all.people.length});
      this.graph=new root.BibleGraph(canvas,{
        mapLabel:tr('Interactive family map. Drag to pan, scroll or pinch to zoom. Use arrow keys to pan and plus or minus to zoom.'),
        nodeHint:tr('Select to view family and source references.'),
        onSelect:person=>{this.state.selected=person.id;this.renderPerson();this.renderPeopleResults();},
        onZoom:zoom=>{this.state.zoom=zoom;if(this.graph)this.state.camera={...this.graph.transform};this.container.querySelector('.atlas-zoom-value').textContent=`${Math.round(zoom*100)}%`;}
      });
      const people=visible.people.map(p=>({id:p.id,name:local(p.name),description:local(p.summary)}));
      const relationships=visible.relationships.map(r=>({...r,displayLabel:tr(relationLabels[r.type]),ref:{label:r.refs.map(ref=>local(ref.label)).join('; ')},note:local(r.summary)}));
      this.graph.setData(people,relationships,{layout:this.state.layout,focusId:this.state.focus,selectedId:this.state.selected});
      this.state.graphKey=key;
      if(camera){this.graph.transform={...camera};this.graph.fittedScale=null;this.graph.applyTransform();}
      else this.state.camera={...this.graph.transform};
    }
    renderSources(refs){return `<div class="atlas-sources">${refs.map(ref=>{const key=String(++this.refSerial);this.refs.set(key,ref);return `<div class="atlas-source"><span class="atlas-source-kind">${esc(tr(sourceLabels[ref.kind]))}</span><strong>${esc(local(ref.label))}</strong><div>${ref.passage?`<button type="button" data-atlas-passage="${key}">${esc(tr(this.tradition==='judaism'?'Read passage · Hebrew Tanakh':'Read passage · Dutch Qur’an translation'))} →</button>`:''}<a href="${esc(safeUrl(ref.url))}" target="_blank" rel="noopener noreferrer">${esc(tr('Open original source'))} ↗</a></div></div>`;}).join('')}</div>`;}
    renderPerson(){this.container.querySelectorAll?.('[data-atlas-person]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.atlasPerson===this.state.selected)));this.refs.clear();this.refSerial=0;const person=this.model.peopleById.get(this.state.selected),graph=this.model.familyGraph(this.state.family),relations=graph.relationships.filter(r=>r.source===person.id||r.target===person.id),places=this.model.places.filter(p=>p.personIds.includes(person.id));
      this.container.querySelector('.atlas-person-detail').innerHTML=`<span class="library-kicker">${esc(tr('Family map'))}</span><div class="atlas-profile-hero"><span class="atlas-profile-initial" aria-hidden="true">${esc([...local(person.name)][0])}</span><h2 tabindex="-1">${esc(local(person.name))}</h2></div>${person.aliases.length?`<p class="atlas-aliases">${esc(person.aliases.join(' · '))}</p>`:''}<p>${esc(local(person.summary))}</p><button class="atlas-focus-person" type="button" data-atlas-focus="true">${esc(tr('Focus on this person'))} →</button>${person.indexId?`<button class="atlas-primary" type="button" data-atlas-index="${esc(person.id)}">${esc(tr('Open in people index'))} →</button>`:''}<h3>${esc(tr('Family connections'))}</h3><div class="atlas-relations">${relations.map(r=>{const other=this.model.peopleById.get(r.source===person.id?r.target:r.source);return `<details class="atlas-relation"><summary><span class="atlas-relation-kind atlas-relation-kind-${r.type}">${esc(tr(relationLabels[r.type]))}</span><span>${esc(local(other.name))}</span></summary><div class="atlas-relation-title">${esc(local(this.model.peopleById.get(r.source).name))} ${r.type==='parent'?'→':'—'} ${esc(local(this.model.peopleById.get(r.target).name))}</div><button type="button" data-atlas-person="${esc(other.id)}">${esc(local(other.name))} ↗</button><p>${esc(local(r.summary))}</p>${this.renderSources(r.refs)}</details>`;}).join('')||`<p>${esc(tr('No relationship is recorded in this selected family.'))}</p>`}</div><details class="atlas-profile-sources"><summary>${esc(tr('Sources & reading'))} <span>${person.refs.length}</span></summary>${this.renderSources(person.refs)}</details>${places.length?`<h3>${esc(tr('Related places'))}</h3><div class="atlas-linked-people">${places.map(p=>`<button type="button" data-atlas-city="${esc(p.id)}">${esc(local(p.name))} ↗</button>`).join('')}</div>`:''}`;
    }
    citiesShell(){return `<div class="atlas-toolbar atlas-city-toolbar"><label>${esc(tr('Search cities and places'))}<input type="search" data-atlas-city-search value="${esc(this.state.cityQuery)}" placeholder="${esc(tr('Name, alias or passage…'))}"></label><label>${esc(tr('Place type'))}<select data-atlas-kind><option value="all"${this.state.kind==='all'?' selected':''}>${esc(tr('All places'))}</option>${Object.entries(placeLabels).map(([key,label])=>`<option value="${key}"${this.state.kind===key?' selected':''}>${esc(tr(label))}</option>`).join('')}</select></label></div><div class="atlas-city-workspace"><section class="atlas-place-list"><p class="atlas-place-count" role="status" aria-live="polite"></p><div class="atlas-place-cards"></div></section><article class="atlas-place-detail atlas-detail"></article></div>`;}
    renderPlaceResults(){const matches=this.model.searchPlaces(this.state.cityQuery,this.state.kind);if(!matches.some(p=>p.id===this.state.citySelected))this.state.citySelected=matches[0]?.id||null;
      this.container.querySelector('.atlas-place-count').textContent=tr('{count} places',{count:matches.length});
      this.container.querySelector('.atlas-place-cards').innerHTML=matches.map(p=>`<button type="button" class="atlas-place-card" data-atlas-city="${esc(p.id)}" aria-pressed="${p.id===this.state.citySelected}"><span>${esc(tr(placeLabels[p.kind]))}</span><strong>${esc(local(p.name))}</strong><small>${esc(local(p.summary))}</small></button>`).join('')||`<p class="atlas-empty">${esc(tr('No matching places. Try another search or place type.'))}</p><button type="button" data-atlas-clear="cities">${esc(tr('Clear search'))}</button>`;
      this.renderPlace();
    }
    renderPlace(){this.refs.clear();this.refSerial=0;const panel=this.container.querySelector('.atlas-place-detail'),place=this.model.placesById.get(this.state.citySelected);if(!place){panel.hidden=true;panel.innerHTML='';return;}panel.hidden=false;
      panel.innerHTML=`<span class="library-kicker">${esc(tr(placeLabels[place.kind]))}</span><h2 tabindex="-1">${esc(local(place.name))}</h2>${place.aliases.length?`<p class="atlas-aliases">${esc(place.aliases.join(' · '))}</p>`:''}<p class="atlas-place-summary">${esc(local(place.summary))}</p><h3>${esc(tr('Historical context'))}</h3><p>${esc(local(place.historicalContext))}</p><section class="atlas-location"><h3>${esc(tr('Location & identification'))}</h3><p>${esc(local(place.locationNote))}</p></section>${place.personIds.length?`<h3>${esc(tr('People in these accounts'))}</h3><p class="atlas-association-note">${esc(tr('These links indicate an association in the cited accounts, not necessarily residence at this place.'))}</p><div class="atlas-linked-people">${place.personIds.map(id=>`<button type="button" data-atlas-${this.model.familyForPerson(id)?'city-person':'index'}="${esc(id)}" title="${esc(tr(this.model.familyForPerson(id)?'Open family profile':'Open in people index'))}">${esc(local(this.model.peopleById.get(id).name))} ↗</button>`).join('')}</div>`:''}<h3>${esc(tr('Sources & reading'))}</h3>${this.renderSources(place.refs)}`;
    }
  }
  root.TraditionAtlasModel=TraditionAtlasModel;root.TraditionAtlasView=TraditionAtlasView;
  if(typeof module!=='undefined'&&module.exports)module.exports={TraditionAtlasModel,TraditionAtlasView,familyLayout,relationshipRoute,rows};
})();
