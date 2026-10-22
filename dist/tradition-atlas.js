/* Religion-specific family relationships and places. Source text is never inferred from another collection. */
(() => {
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  const rows=[
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
      this.container=container;this.onPassage=onPassage;this.onPerson=onPerson;this.onModeChange=onModeChange;this.states=new Map();this.refs=new Map();this.refSerial=0;
      this.click=event=>{const el=event.target.closest('[data-atlas-person],[data-atlas-city],[data-atlas-city-person],[data-atlas-index],[data-atlas-passage],[data-atlas-zoom],[data-atlas-pan],[data-atlas-clear]');if(!el||!container.contains(el))return;const d=el.dataset;
        if(d.atlasPerson)this.openPerson(d.atlasPerson);
        else if(d.atlasCity){this.state.citySelected=d.atlasCity;const switched=this.mode!=='cities';if(switched){this.state.cityQuery='';this.state.kind='all';}this.mode=this.state.mode='cities';this.render();if(switched)this.onModeChange('cities');this.focus('.atlas-place-detail h2');}
        else if(d.atlasCityPerson){this.openPerson(d.atlasCityPerson);this.onModeChange('map');}
        else if(d.atlasIndex){const p=this.model.peopleById.get(d.atlasIndex);if(p?.indexId)this.onPerson(p.indexId);}
        else if(d.atlasPassage){const ref=this.refs.get(d.atlasPassage);if(ref?.passage)this.onPassage({...ref.passage});}
        else if(d.atlasZoom){const fit=this.fitScale();this.state.zoom=d.atlasZoom==='fit'?fit:Math.max(.2,Math.min(2.5,(this.state.zoom||fit)*(d.atlasZoom==='in'?1.25:.8)));this.applyScale();}
        else if(d.atlasPan)this.container.querySelector('.atlas-canvas')?.scrollBy?.({left:d.atlasPan==='left'?-360:360,behavior:'smooth'});
        else if(d.atlasClear){if(d.atlasClear==='people')this.state.mapQuery='';else{this.state.cityQuery='';this.state.kind='all';}this.render();this.focus(d.atlasClear==='people'?'[data-atlas-search]':'[data-atlas-city-search]');}
      };
      this.input=event=>{if(event.target.matches('[data-atlas-search]')){this.state.mapQuery=event.target.value;this.renderPeopleResults();}else if(event.target.matches('[data-atlas-city-search]')){this.state.cityQuery=event.target.value;this.renderPlaceResults();}};
      this.change=event=>{if(event.target.matches('[data-atlas-family]')){const f=this.model.familiesById.get(event.target.value);if(!f)return;this.state.family=f.id;this.state.selected=f.personIds[0];this.state.zoom=null;this.render();this.focus('[data-atlas-family]');}else if(event.target.matches('[data-atlas-kind]')){this.state.kind=event.target.value;this.renderPlaceResults();}};
      this.key=event=>{const node=event.target.closest('[data-atlas-person]');if(node&&container.contains(node)&&['Enter',' '].includes(event.key)&&node.tagName?.toLowerCase()==='g'){event.preventDefault();this.openPerson(node.dataset.atlasPerson);}};
      for(const [name,fn] of [['click',this.click],['input',this.input],['change',this.change],['keydown',this.key]])container.addEventListener(name,fn);
    }
    destroy(){for(const [name,fn] of [['click',this.click],['input',this.input],['change',this.change],['keydown',this.key]])this.container.removeEventListener(name,fn);}
    focus(selector){this.container.querySelector(selector)?.focus();}
    setCollection(data,mode='map'){
      this.model=new TraditionAtlasModel(data);this.tradition=this.model.tradition;
      if(!this.states.has(this.tradition))this.states.set(this.tradition,{family:this.model.families[0].id,selected:this.model.families[0].personIds[0],mapQuery:'',cityQuery:'',kind:'all',citySelected:null,zoom:null,mode:'map'});
      this.state=this.states.get(this.tradition);this.setMode(mode);
    }
    setMode(mode){if(!['map','cities'].includes(mode))return false;this.mode=this.state.mode=mode;this.render();return true;}
    getState(){return this.state?{...this.state,tradition:this.tradition}:null;}
    changeLanguage(){if(this.model)this.render();}
    openPerson(id){if(!this.model.peopleById.has(id))return false;const family=this.model.familyForPerson(id,this.state.family);if(!family)return false;if(family.id!==this.state.family)this.state.zoom=null;this.state.family=family.id;this.state.selected=id;this.mode=this.state.mode='map';this.render();this.focus('.atlas-person-detail h2');return true;}
    render(){
      if(!this.model)return;this.refs.clear();this.refSerial=0;
      const scope=this.mode==='map'?this.model.data.meta.familyScope:this.model.data.meta.placesScope;
      this.container.innerHTML=`<div class="atlas-introduction"><span class="library-kicker">${esc(tr(this.mode==='map'?'Families & sources':'Cities & places'))}</span><p>${esc(local(scope))}</p></div>${this.mode==='map'?this.mapShell():this.citiesShell()}`;
      if(this.mode==='map'){this.renderPeopleResults();this.renderMap();this.renderPerson();}else this.renderPlaceResults();
    }
    mapShell(){const f=this.model.familiesById.get(this.state.family);return `<div class="atlas-toolbar"><label>${esc(tr('Choose a family'))}<select data-atlas-family>${this.model.families.map(item=>`<option value="${esc(item.id)}"${item.id===f.id?' selected':''}>${esc(local(item.title))}</option>`).join('')}</select></label><label>${esc(tr('Search people in this collection'))}<input type="search" data-atlas-search value="${esc(this.state.mapQuery)}" placeholder="${esc(tr('Name, alias or passage…'))}"></label></div><div class="atlas-person-results"></div><div class="atlas-map-workspace"><section class="atlas-map-panel"><header class="atlas-family-heading"><h2>${esc(local(f.title))}</h2><p>${esc(local(f.summary))}</p></header><div class="atlas-map-toolbar"><span class="atlas-map-count" role="status"></span><div class="atlas-zoom-controls"><button type="button" data-atlas-pan="left" aria-label="${esc(tr('Move left'))}">←</button><button type="button" data-atlas-pan="right" aria-label="${esc(tr('Move right'))}">→</button><button type="button" data-atlas-zoom="out" aria-label="${esc(tr('Zoom out'))}">−</button><output class="atlas-zoom-value">100%</output><button type="button" data-atlas-zoom="in" aria-label="${esc(tr('Zoom in'))}">+</button><button type="button" data-atlas-zoom="fit">${esc(tr('Fit whole family'))}</button></div></div><div class="atlas-canvas" tabindex="0" role="region" aria-label="${esc(tr('Family map: scroll to explore'))}"></div><div class="atlas-legend">${Object.entries(relationLabels).map(([key,label])=>`<span><i class="atlas-line atlas-line-${key}" aria-hidden="true"></i>${esc(tr(label))}</span>`).join('')}</div><p class="atlas-map-help">${esc(tr('Only parent–child lines have arrows. Other relationships retain their own labels and sources.'))} ${esc(tr('Rows organize documented family links; they do not represent dates or exact generational distances.'))} ${esc(tr('Select a name for its profile and relationship sources. Scroll within the map to see more; use the buttons to zoom.'))}</p><details class="atlas-family-people"><summary>${esc(tr('People in this family'))}</summary><div>${f.personIds.map(id=>`<button type="button" data-atlas-person="${esc(id)}" aria-pressed="${id===this.state.selected}">${esc(local(this.model.peopleById.get(id).name))}</button>`).join('')}</div></details></section><article class="atlas-person-detail atlas-detail"></article></div>`;}
    renderPeopleResults(){const panel=this.container.querySelector('.atlas-person-results');if(!panel)return;if(!this.state.mapQuery.trim()){panel.innerHTML='';panel.hidden=true;return;}panel.hidden=false;const matches=this.model.searchPeople(this.state.mapQuery);panel.innerHTML=`<p role="status">${esc(tr('{count} people',{count:matches.length}))}</p><div>${matches.map(p=>`<button type="button" data-atlas-${this.model.familyForPerson(p.id)?'person':'index'}="${esc(p.id)}" title="${esc(tr(this.model.familyForPerson(p.id)?'Open family profile':'Open in people index'))}" aria-pressed="${p.id===this.state.selected}">${esc(local(p.name))}</button>`).join('')||`<p>${esc(tr('No matching people. Try another name or passage.'))}</p>`}<button type="button" data-atlas-clear="people">${esc(tr('Clear search'))} ×</button></div>`;}
    renderMap(){
      const graph=this.model.familyGraph(this.state.family);this.layout=familyLayout(graph.people,graph.relationships);
      const {width,height,byId,nodes}=this.layout,marker=`atlas-arrow-${this.tradition}`;
      this.container.querySelector('.atlas-map-count').textContent=tr('{count} people · {links} connections',{count:graph.people.length,links:graph.relationships.length});
      const paths=graph.relationships.map((r,index)=>{const points=relationshipRoute(r,this.layout,index),d=points.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ');return `<path class="atlas-edge atlas-edge-${r.type}${r.source===this.state.selected||r.target===this.state.selected?' is-related':''}" d="${d}"${r.type==='parent'?` marker-end="url(#${marker})"`:''}><title>${esc(local(this.model.peopleById.get(r.source).name))} — ${esc(tr(relationLabels[r.type]))} — ${esc(local(this.model.peopleById.get(r.target).name))}. ${esc(local(r.summary))}</title></path>`;}).join('');
      const svgNodes=nodes.map(n=>{const name=local(n.person.name),words=name.split(/\s+/),lines=[];let line='';for(const word of words){if(line&&`${line} ${word}`.length>21){lines.push(line);line=word;}else line=line?`${line} ${word}`:word;}if(line)lines.push(line);const visible=lines.slice(0,2).map((text,i)=>`<text x="0" y="${i*15+17}" class="atlas-node-name">${esc(text.length>24?text.slice(0,23)+'…':text)}</text>`).join('');return `<g class="atlas-node${n.id===this.state.selected?' is-selected':''}" transform="translate(${n.x} ${n.y})" role="button" tabindex="0" aria-label="${esc(name)}" aria-pressed="${n.id===this.state.selected}" data-atlas-person="${esc(n.id)}"><title>${esc(name)}</title><rect x="-80" y="-42" width="160" height="84" rx="11"/><circle cx="0" cy="-19" r="13"/><text x="0" y="-14" class="atlas-node-initial" aria-hidden="true">${esc([...name][0])}</text>${visible}</g>`;}).join('');
      this.container.querySelector('.atlas-canvas').innerHTML=`<svg class="atlas-family-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="${esc(local(this.model.familiesById.get(this.state.family).title))}"><defs><marker id="${marker}" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="#6c8560"/></marker></defs>${paths}${svgNodes}</svg>`;
      if(this.state.zoom===null)this.state.zoom=Math.max(.8,this.fitScale());this.applyScale();const canvas=this.container.querySelector('.atlas-canvas'),selected=byId.get(this.state.selected);if(selected)canvas.scrollTo?.({left:Math.max(0,selected.x*this.state.zoom-(canvas.clientWidth||700)/2),top:Math.max(0,selected.y*this.state.zoom-120)});
    }
    fitScale(){const canvas=this.container.querySelector('.atlas-canvas');return Math.min(1,Math.max(.08,Math.min(((canvas?.clientWidth||700)-16)/(this.layout?.width||700),((canvas?.clientHeight||500)-16)/(this.layout?.height||500))));}
    applyScale(){const svg=this.container.querySelector('.atlas-family-svg');if(!svg||!this.layout)return;svg.setAttribute('width',Math.round(this.layout.width*this.state.zoom));svg.setAttribute('height',Math.round(this.layout.height*this.state.zoom));svg.style.width=`${Math.round(this.layout.width*this.state.zoom)}px`;svg.style.height=`${Math.round(this.layout.height*this.state.zoom)}px`;this.container.querySelector('.atlas-zoom-value').textContent=`${Math.round(this.state.zoom*100)}%`;}
    renderSources(refs){return `<div class="atlas-sources">${refs.map(ref=>{const key=String(++this.refSerial);this.refs.set(key,ref);return `<div class="atlas-source"><span class="atlas-source-kind">${esc(tr(sourceLabels[ref.kind]))}</span><strong>${esc(local(ref.label))}</strong><div>${ref.passage?`<button type="button" data-atlas-passage="${key}">${esc(tr(this.tradition==='judaism'?'Read passage · Hebrew Tanakh':'Read passage · Dutch Qur’an translation'))} →</button>`:''}<a href="${esc(safeUrl(ref.url))}" target="_blank" rel="noopener noreferrer">${esc(tr('Open original source'))} ↗</a></div></div>`;}).join('')}</div>`;}
    renderPerson(){const person=this.model.peopleById.get(this.state.selected),graph=this.model.familyGraph(this.state.family),relations=graph.relationships.filter(r=>r.source===person.id||r.target===person.id),places=this.model.places.filter(p=>p.personIds.includes(person.id));
      this.container.querySelector('.atlas-person-detail').innerHTML=`<span class="library-kicker">${esc(tr('Family map'))}</span><h2 tabindex="-1">${esc(local(person.name))}</h2>${person.aliases.length?`<p class="atlas-aliases">${esc(person.aliases.join(' · '))}</p>`:''}<p>${esc(local(person.summary))}</p>${person.indexId?`<button class="atlas-primary" type="button" data-atlas-index="${esc(person.id)}">${esc(tr('Open in people index'))} →</button>`:''}<h3>${esc(tr('Sources & reading'))}</h3>${this.renderSources(person.refs)}<h3>${esc(tr('Family connections'))}</h3><div class="atlas-relations">${relations.map(r=>{const other=this.model.peopleById.get(r.source===person.id?r.target:r.source);return `<section class="atlas-relation"><span class="atlas-relation-kind atlas-relation-kind-${r.type}">${esc(tr(relationLabels[r.type]))}</span><div class="atlas-relation-title">${esc(local(this.model.peopleById.get(r.source).name))} ${r.type==='parent'?'→':'—'} ${esc(local(this.model.peopleById.get(r.target).name))}</div><button type="button" data-atlas-person="${esc(other.id)}">${esc(local(other.name))} ↗</button><p>${esc(local(r.summary))}</p>${this.renderSources(r.refs)}</section>`;}).join('')||`<p>${esc(tr('No relationship is recorded in this selected family.'))}</p>`}</div>${places.length?`<h3>${esc(tr('Related places'))}</h3><div class="atlas-linked-people">${places.map(p=>`<button type="button" data-atlas-city="${esc(p.id)}">${esc(local(p.name))} ↗</button>`).join('')}</div>`:''}`;
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
