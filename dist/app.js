(function () {
  'use strict';
  const I = window.BibleI18n;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = text => String(text ?? '').replace(/[&<>"']/g, value => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const identityContext = (person, separator = ' · ') => {
    const context = person.disambiguation || person.era;
    return context.includes(person.refs[0].label)||context.includes(I.reference(person.refs[0].label)) ? escape(context) : `${escape(context)}${separator}${escape(I.reference(person.refs[0].label))}`;
  };
  const {people, relationships, meta} = window.BIBLE_DATA;
  const originalPeople = structuredClone(people);
  I.localizePeople(window.BIBLE_DATA,originalPeople);
  const personById = new Map(people.map(person => [person.id, person]));
  const discovery = new window.BibleDiscovery(window.BIBLE_DATA);
  const pathFinder = new window.BiblePaths(window.BIBLE_DATA);
  const pathPicks = {from:'adam',to:'jesus'};
  let activePath = null, searchTarget = null;
  let reader = null, cities = null, placesPromise = null, scripturePromise = null;
  let pendingPassage = null, pendingCity = null;
  let returnToLibrary = null;
  let savedReaderState=null,savedCitiesState=null;
  const scriptureCache=new Map();
  const catholicEditions={'catholic-nl':{file:'catholic-bible-data-nl.json',label:'Catholic Bible · Dutch · 73 books'},catholic:{file:'catholic-bible-data.json',label:'Douay-Rheims · English · 73 books'}};
  const isCatholicEdition=edition=>Object.hasOwn(catholicEditions,edition);
  let initialBibleEdition='catholic-nl';try{const saved=localStorage.getItem('biblepath-bible-edition');if(isCatholicEdition(saved)||saved==='locale')initialBibleEdition=saved;}catch{}
  const bibleEditionStates=new Map();let readerRequest=0,catholicPeople=null,catholicPeopleLoading=null;
  let personPassages=null,personPassagesLoading=null,personPassageRequest=0;
  let initialTradition='christianity';try{const saved=localStorage.getItem('biblepath-tradition');if(['christianity','judaism','islam'].includes(saved))initialTradition=saved;}catch{}
  let sacredReader=null,sacredLoading=null,sacredRequest=0;
  const sacredCache=new Map();
  let peopleIndex=null,comparisonView=null,peopleRequest=0,comparisonLoading=null,pendingPeopleProfile=null;
  const peopleCache=new Map();
  let festivalView=null,festivalRequest=0,festivalPassageRequest=0,returnToFestivals=null;
  const festivalCache=new Map();
  let traditionAtlas=null,atlasRequest=0,atlasPassageRequest=0,returnToAtlas=null;
  const atlasCache=new Map();
  let placesMap=null,geographyLoading=null,geographyRequest=0,geographyFilter=initialTradition,geographyFilterPending=true,returnToGeography=null,pendingAtlasPlace=null;
  const state = {layout:'constellation', focus:'abraham', selected:'abraham', depth:'auto', discoveryDepth:1, localRoots:[], testament:'all', spouses:true, view:'reader', tradition:initialTradition, bibleEdition:initialBibleEdition, peopleTradition:initialTradition, indexPage:1};
  let zoomBase = null, zoomTimer, rendering = false, lastSelection;
  const MAX_MAP_PEOPLE = 180, INDEX_PAGE_SIZE = 60;
  const graph = new window.BibleGraph($('#graph'), {
    onSelect: person => {state.selected = person.id; renderInspector(person); hideTooltip();},
    onHover: showTooltip,
    onLeave: delayHideTooltip,
    onZoom: handleZoom
  });
  // Exposed read-only snapshots help verify navigation and graph behavior.
  window.biblePath = {getState:() => ({...state, path:activePath ? {kind:activePath.kind,personIds:[...activePath.personIds],steps:activePath.steps.length,indexedCount:activePath.indexedCount} : null, graph:graph.getState(), language:I.language,reader:reader?.getState?.()||null,sacredReader:sacredReader?.getState?.()||null,cities:cities?.getState?.()||null,peopleCount:people.length, relationshipCount:relationships.length})};
  let tooltipTimer, toastTimer, currentTooltipId;
  const normalize = text => text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const searchable = new Map(people.map(p => [p.id, normalize([p.name,...(p.aliases || []),p.disambiguation || '',p.description,p.era,...(p.allReferences || p.refs.map(r=>r.label))].join(' '))]));

  function matchingPeople(query = '', testament = state.testament) {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    return people.filter(p => discovery.allows(p,testament) && terms.every(term => searchable.get(p.id).includes(term)))
      .sort((a,b) => {
        const term = normalize(query.trim());
        const score = p => !term ? 2 : normalize(p.name) === term ? 0 : normalize(p.name).startsWith(term) ? 1 : 2;
        return score(a) - score(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      });
  }

  function handleZoom(scale, event = {}) {
    $('#zoom-level').textContent = `${Math.round(scale * 100)}%`;
    if (!rendering && !event.userInitiated && ['fit','resize'].includes(event.reason) && state.depth === 'auto') zoomBase = scale*Math.pow(1.5,state.discoveryDepth-1);
    if (rendering || activePath || !event.userInitiated || state.depth !== 'auto' || state.view !== 'map' || state.tradition !== 'christianity') return;
    clearTimeout(zoomTimer);
    const desired = Math.max(state.discoveryDepth,window.BibleDiscovery.depthForZoom(scale,zoomBase || scale));
    const shown = new Set(lastSelection?.people.map(p=>p.id) || []);
    const candidate = event.direction === 'in' && scale >= .95 && event.anchorDistance <= 120 && shown.has(event.anchorId) && !state.localRoots.includes(event.anchorId) && shown.size < MAX_MAP_PEOPLE ? event.anchorId : null;
    const localRoot = candidate && discovery.byPerson.get(candidate).some(edge=>{
      if (!state.spouses && edge.type === 'spouse') return false;
      const next = edge.source === candidate ? edge.target : edge.source;
      return !shown.has(next) && discovery.allows(personById.get(next),state.testament);
    }) ? candidate : null;
    if (desired === state.discoveryDepth && !localRoot) return;
    zoomTimer = setTimeout(() => {
      if (state.depth !== 'auto' || state.view !== 'map') return;
      state.discoveryDepth = desired;
      if (localRoot) state.localRoots.push(localRoot);
      renderGraph({preserveView:true});
      if (localRoot) toast(`${personById.get(localRoot).name}’s nearby family revealed`);
    },140);
  }

  function renderGraph({preserveView=false, preserveDiscovery=preserveView} = {}) {
    if (activePath) {renderPathGraph();return;}
    hideTooltip();
    if (!preserveView) clearTimeout(zoomTimer);
    if (!preserveDiscovery) {state.discoveryDepth = 1;state.localRoots=[];}
    const depth = state.depth === 'auto' ? state.discoveryDepth : state.depth === 'all' ? Infinity : state.depth;
    lastSelection = discovery.neighborhood({focusId:state.focus,depth,testament:state.testament,spouses:state.spouses,limit:MAX_MAP_PEOPLE,localRoots:state.localRoots});
    const visible = lastSelection.people, edges = lastSelection.relationships;
    if (!preserveDiscovery || !visible.some(p=>p.id===state.selected)) state.selected = state.focus;
    rendering = true;
    graph.setData(visible, edges, {layout:state.layout,focusId:state.focus,selectedId:state.selected,preserveView,anchorId:state.focus});
    rendering = false;
    if (!preserveView) zoomBase = graph.getState().transform.k*Math.pow(1.5,state.discoveryDepth-1);
    $('#map-empty').hidden = visible.length > 0;
    $('#visible-count').textContent = `${visible.length} people`;
    $('#map-title').textContent = `${personById.get(state.focus).name}’s connections`;
    $('#discovery-title').textContent = state.depth === 'auto' ? 'Adaptive zoom' : 'Fixed reach';
    $('#discovery-level').textContent = `${depth === Infinity ? 'Extended network' : `${depth} ${depth === 1 ? 'step' : 'steps'}${state.localRoots.length ? ' + local branches' : ''}`} · ${edges.length} links`;
    $('#discovery-description').textContent = lastSelection.omitted ? `${lastSelection.omitted.toLocaleString(I.language)} more people in this branch. Choose a person to explore farther.` : state.depth === 'auto' ? 'Zoom out for more relatives · Zoom in for detail' : 'Choose Adaptive zoom to reveal branches as you zoom';
    $('.discovery-bar').classList.toggle('is-limited',lastSelection.omitted > 0);
    renderInspector(personById.get(state.selected));
    $$('.layout-option').forEach(button => {const active = button.dataset.layout === state.layout;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const captions = {constellation:['LIVES INTERWOVEN','Follow a name. Find a story.'],lineage:['FROM GENERATION TO GENERATION','Parents above. Children below.'],radial:['ONE LIFE, MANY CONNECTIONS','Each ring is one relationship away.']};
    const caption = captions[state.layout];
    $('#layout-caption').innerHTML = `${caption[0]}<small>${caption[1]}</small>`;
    $$('.journey').forEach(b=>b.classList.toggle('active',b.dataset.person === state.focus));
  }

  function familyRelations(person) {
    const direct = discovery.byPerson.get(person.id) || [];
    return {
      parents:direct.filter(r=>r.type === 'parent' && r.target === person.id).map(r=>({person:personById.get(r.source),edge:r})),
      spouses:direct.filter(r=>r.type === 'spouse').map(r=>({person:personById.get(r.source === person.id ? r.target : r.source),edge:r})),
      children:direct.filter(r=>r.type === 'parent' && r.source === person.id).map(r=>({person:personById.get(r.target),edge:r})),
      direct
    };
  }

  function renderInspector(person, referenceLimit = 6) {
    if (!person) return;
    const family = familyRelations(person);
    const relativeButtons = items => items.map(({person:p,edge})=>`<button data-relative="${escape(p.id)}" title="${escape(edge.note || edge.ref.label)}">${escape(p.name)}${edge.note ? ' *' : ''}</button>`).join('');
    const notes = [...new Set([...(person.notes || []),...family.direct.filter(r=>r.note).map(r=>r.note)])];
    const referenceLinks = person.refs.slice(0,referenceLimit);
    const indexedRelations = family.direct.some(r=>r.evidence?.kind === 'index');
    const displayAliases=person.displayAliases??person.aliases;
    $('#inspector').innerHTML = `
      ${activePath ? '<button class="back-to-path" id="back-to-path">← Back to the connecting path</button>' : ''}
      <div class="profile-topline"><span>A LIFE IN SCRIPTURE</span>${icon('book')}</div>
      <div class="profile-hero"><div class="profile-initial ${person.gender}">${escape(person.name[0])}</div><div><h2>${escape(person.name)}</h2><div class="era">${escape(person.era)}</div></div></div>
      ${displayAliases?.length ? `<div class="profile-alias">Also known as ${displayAliases.map(escape).join(', ')}</div>` : ''}
      <div class="profile-tags"><span>${person.testament === 'OT' ? 'Old Testament' : 'New Testament'}</span><span>${person.gender === 'female' ? 'Woman' : person.gender === 'male' ? 'Man' : 'Person'}</span></div>
      ${person.disambiguation ? `<p class="profile-identity">${escape(person.disambiguation)}</p>` : ''}
      <p class="profile-description">${escape(person.description)}</p>
      <div class="profile-section"><h3>${icon('book')} IN SCRIPTURE <span class="reference-count">${(person.referenceCount || person.refs.length).toLocaleString(I.language)} refs</span></h3>${referenceLinks.map((ref,index)=>`<div class="person-reference-row"><button class="reference-link" data-person-passage="${index}" aria-label="${escape(I.t('Read {reference} in the Dutch Catholic Bible',{reference:I.reference(ref.label)}))}"><span>${escape(I.reference(ref.label))}${ref.provenance === 'indexed-name' ? '<small class="reference-provenance">Indexed name reference</small>' : ''}</span>${icon('arrow')}</button><a class="person-reference-source" href="${escape(ref.url)}" target="_blank" rel="noopener noreferrer">${escape(I.t('Original source'))} ↗</a></div>`).join('')}${person.refs.length > referenceLimit ? `<button class="more-references" id="more-references">Show more passages (${person.refs.length-referenceLimit} remaining)</button>` : ''}${referenceLinks.some(ref=>ref.provenance === 'indexed-name') ? '<p class="reference-caveat">Name references may include descendants or a group bearing the same name. Read the passage in context.</p>' : ''}</div>
      <div class="profile-section"><h3>${icon('tree')} FAMILY CONNECTIONS</h3>
        ${family.parents.length ? `<div class="family-row"><span class="family-label">Parents</span><div class="family-names">${relativeButtons(family.parents)}</div></div>` : ''}
        ${family.spouses.length ? `<div class="family-row"><span class="family-label">Spouse${family.spouses.length > 1 ? 's' : ''}</span><div class="family-names">${relativeButtons(family.spouses)}</div></div>` : ''}
        ${family.children.length ? `<div class="family-row"><span class="family-label">Children</span><div class="family-names">${relativeButtons(family.children)}</div></div>` : ''}
        ${!family.direct.length ? '<p class="profile-note">No parent, child, or spouse connections have been added for this person yet. See the passages above for their story.</p>' : ''}
        ${notes.map(note=>`<p class="profile-note">* ${escape(note)}</p>`).join('')}
        ${indexedRelations ? '<p class="profile-note source-note">Some family links come from STEP Bible’s relationship index. They may reflect editorial inferences; the source for each link is listed below.</p>' : ''}
      </div>
      <button class="focus-button" id="focus-person">${icon('map')}Explore ${escape(person.name)}’s family${icon('arrow')}</button>
      <div class="profile-path-actions"><button data-path-endpoint="from">Use as start</button><button data-path-endpoint="to">Use as destination</button></div>
      ${family.direct.length ? `<details class="relationship-sources"><summary>Sources for these relationships</summary>${family.direct.map(r=>`<a href="${escape(r.ref.url)}" target="_blank" rel="noopener noreferrer"><span>${escape(personById.get(r.source).name)} ${r.type === 'spouse' ? '&' : '→'} ${escape(personById.get(r.target).name)}</span><small>${escape(r.ref.label)} ↗</small></a>`).join('')}</details>` : ''}
      ${person.source?.url ? `<a class="profile-source" href="${escape(person.source.url)}" target="_blank" rel="noopener noreferrer">Indexed with ${escape(person.source.name || 'STEP Bible')} ↗</a>` : ''}`;
    $$('#inspector [data-person-passage]').forEach(button=>button.addEventListener('click',()=>openPersonPassage(referenceLinks[Number(button.dataset.personPassage)])));
    $$('#inspector [data-relative]').forEach(button=>button.addEventListener('click',()=>explorePerson(button.dataset.relative)));
    $('#focus-person').addEventListener('click',()=>explorePerson(person.id));
    $('#back-to-path')?.addEventListener('click',renderPathInspector);
    $$('#inspector [data-path-endpoint]').forEach(button=>button.addEventListener('click',()=>{pickPathPerson(button.dataset.pathEndpoint,person.id);$('#path-finder').scrollIntoView({block:'nearest',behavior:'smooth'});toast(`${person.name} selected as ${button.dataset.pathEndpoint === 'from' ? 'the start' : 'the destination'}`);}));
    $('#more-references')?.addEventListener('click',()=>{const top=$('#inspector').scrollTop;renderInspector(person,referenceLimit+12);$('#inspector').scrollTop=top;});
  }

  function explorePerson(id, depth) {
    const person = personById.get(id);
    if (!person) return;
    useReligion('christianity');
    clearPath(false);
    state.focus = state.selected = id;
    if (state.testament !== 'all' && state.testament !== person.testament) setTestamentState('all');
    state.depth = depth ?? 'auto';
    $('#depth-select').value = String(state.depth);
    setView('map');
    closeSidebar();
    renderGraph();
  }

  function setTestamentState(testament) {
    state.testament = testament;
    state.indexPage = 1;
    $$('.testament').forEach(button => {const active = button.dataset.testament === testament;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  }

  const religionNames={christianity:'Roman Catholic Christianity',judaism:'Judaism',islam:'Islam'};
  function useReligion(tradition){
    if(!Object.hasOwn(religionNames,tradition))return false;
    if(tradition!==state.tradition){
      festivalRequest++;festivalPassageRequest++;returnToFestivals=null;
      atlasRequest++;atlasPassageRequest++;returnToAtlas=null;
      if(tradition!=='christianity')cancelPersonRequest();
      sacredRequest++;sacredReader?.destroy();sacredReader=null;sacredLoading=null;
      state.tradition=tradition;
    }
    if(tradition!==state.peopleTradition){peopleRequest++;state.peopleTradition=tradition;pendingPeopleProfile=null;}
    try{localStorage.setItem('biblepath-tradition',tradition);localStorage.setItem('biblepath-people-tradition',tradition);}catch{}
    return true;
  }
  function navigateReligion(tradition,view,{keepSidebar=false}={}){
    if(!useReligion(tradition))return;
    returnToGeography=null;pendingAtlasPlace=null;geographyFilter=tradition;geographyFilterPending=true;
    setView(view==='cities'?'geography':view||(['reader','index','festivals','map','cities','geography'].includes(state.view)?state.view:'reader'),{keepSidebar});
  }
  function setView(view,{keepSidebar=false}={}) {
    festivalPassageRequest++;
    atlasRequest++;atlasPassageRequest++;
    geographyRequest++;
    if(!['reader','festivals'].includes(view))returnToFestivals=null;
    if(!['reader','index'].includes(view))returnToAtlas=null;
    const bibleContext=state.tradition==='christianity';
    const atlasContext=!bibleContext&&['map','cities'].includes(view);
    clearTimeout(zoomTimer);
    if(view!=='reader')cancelPersonRequest();
    state.view = view;
    $('#map-view').hidden = view !== 'map'||!bibleContext; $('#index-view').hidden = view !== 'index'||state.peopleTradition!=='christianity';
    $('#people-collection-controls').hidden=true;
    $('#tradition-people-view').hidden=view!=='index'||state.peopleTradition==='christianity';
    $('#comparison-view').hidden=view!=='compare';
    $('#festivals-view').hidden=view!=='festivals';
    $('#tradition-atlas-view').hidden=!atlasContext;
    $('#places-map-view').hidden=view!=='geography';
    $('#cities-view-switch').hidden=!['cities','geography'].includes(view);
    $('#cities-show-map').setAttribute('aria-pressed',String(view==='geography'));
    $('#cities-show-list').setAttribute('aria-pressed',String(view==='cities'));
    $('#return-to-geography').hidden=view==='geography'||!returnToGeography;
    $('#return-to-geography').textContent=I.t('← Back to the places map');
    $('#return-to-festivals').hidden=view!=='reader'||returnToFestivals?.tradition!==state.tradition;
    $('#return-to-festivals').textContent=I.t('← Back to festivals & rituals');
    $('#return-to-atlas').hidden=!['reader','index'].includes(view)||returnToAtlas?.tradition!==state.tradition;
    $('#return-to-atlas').textContent=I.t(returnToAtlas?.mode==='cities'?'← Back to the cities explorer':'← Back to the family map');
    $$('[data-people-tradition]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.peopleTradition===state.peopleTradition)));
    $('.layout-picker').hidden = view !== 'map'||!bibleContext;
    $('#path-finder').hidden = view !== 'map'||!bibleContext;
    $('#reader-view').hidden = view !== 'reader'||!bibleContext; $('#cities-view').hidden = view !== 'cities'||!bibleContext;
    $('#sacred-reader-view').hidden=view!=='reader'||state.tradition==='christianity';
    $('#sacred-reader-view').setAttribute('aria-label',I.t(state.tradition==='islam'?'Qur’an':'Tanakh'));
    $('#tradition-controls').hidden=true;
    $('.intro-note').hidden=!bibleContext||['reader','index','compare','festivals','geography'].includes(view);
    $('.intro .eyebrow').textContent=I.t(view==='compare'?'Compare religions':religionNames[state.tradition]);
    $$('[data-tradition]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tradition===state.tradition)));
    $('#people-testament-filters').hidden = !bibleContext||!['map','index'].includes(view);
    $('#return-to-library').hidden = state.tradition!=='christianity' || !returnToLibrary || !['map','index'].includes(view);
    const titles={map:['One story. Many connections.','Explore the people of the Bible, one relationship at a time.'],index:['Three collections. Distinct accounts.','Choose a collection to explore its people. Each tradition keeps its own profiles and sources.'],compare:['People across traditions.','Explore how people are portrayed in Roman Catholic Christianity, Judaism and Islam, with each account alongside its sources.'],reader:['Read each tradition in its own context.','Choose the Bible, Tanakh or Qur’an. Each edition keeps its own sources and reading position.'],cities:['Places that hold a story.','Explore biblical cities and the passages that bring them to life.']};
    if(view==='reader')titles.reader=['Holy books',{
      christianity:'Read the Catholic Bible and explore its texts, people and context.',
      judaism:'Read the Tanakh and explore its Jewish context.',
      islam:'Read the Qur’an and explore its Islamic context.'
    }[state.tradition]];
    if(view==='index')titles.index=[{christianity:'People in the Catholic Bible',judaism:'People in the Torah',islam:'People in the Qur’an'}[state.tradition],'Explore people and follow their passages within this religion.'];
    if(view==='festivals')titles.festivals=['Festivals & rituals','Celebrations and practices, with their sources, historical development and internal diversity.'];
    if(view==='geography')titles.geography=['Places map','Explore places by religion, then follow their people and texts.'];
    if(atlasContext)titles[view]=view==='map'?['Relationship map','Family relationships in this tradition, with a source for every connection.']:['Cities explorer','Cities and places in this tradition, with textual sources and historical context.'];
    $('.intro h1').textContent=I.t(titles[view][0]);$('.intro p').textContent=I.t(titles[view][1]);
    $('#religion-crumb').textContent=I.t(view==='compare'?'Compare religions':religionNames[state.tradition]);
    $('.breadcrumb strong').textContent=I.t({map:'Relationship map',index:'People index',compare:'Across traditions',reader:'Holy books',cities:'Cities explorer',geography:'Places map',festivals:'Festivals & rituals'}[view]);
    $$('[data-religion]').forEach(button=>{const active=view!=='compare'&&button.dataset.religion===state.tradition;button.classList.toggle('active',active);button.setAttribute('aria-expanded',String(active));button.setAttribute('aria-pressed',String(active));});
    $$('[data-religion-menu]').forEach(menu=>{menu.hidden=view==='compare'||menu.dataset.religionMenu!==state.tradition;});
    $$('.nav-item').forEach(button=>{const active=button.dataset.view===(view==='geography'?'cities':view)&&(!button.dataset.navTradition||button.dataset.navTradition===state.tradition);button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');});
    const bibleTools=view!=='compare'&&state.tradition==='christianity';
    $('#search-trigger').hidden=!bibleTools;$('.journey-label').hidden=!bibleTools;$('.journeys').hidden=!bibleTools;$('.sidebar-bottom .edition').hidden=!bibleTools;
    if (view === 'index') {if(state.peopleTradition==='christianity'){renderIndex();ensureCatholicPeople().then(()=>{if(state.view==='index'&&state.peopleTradition==='christianity')renderIndex();}).catch(()=>{libraryError($('#catholic-index-status'),()=>setView('index'));});}else ensurePeopleIndex();}
    if (view === 'compare') ensureComparisons();
    if (view === 'festivals') ensureFestivals();
    if (view === 'reader') ensureReader();
    if (view === 'cities'&&bibleContext) ensureCities();
    if (atlasContext) ensureTraditionAtlas();
    if (view === 'geography') ensureGeography();
    updateCounts();
    if(!keepSidebar)closeSidebar();
  }

  function loadJson(file) {return fetch(file).then(response=>{if(!response.ok)throw new Error(`Could not load ${file}`);return response.json();});}
  function loadAtlasCollection(tradition){
    if(!atlasCache.has(tradition))atlasCache.set(tradition,loadJson(`tradition-atlas-${tradition}.json`).catch(error=>{atlasCache.delete(tradition);throw error;}));
    return atlasCache.get(tradition);
  }
  function ensureGeography(){
    const request=++geographyRequest,container=$('#places-map-view');
    if(placesMap){if(geographyFilterPending){placesMap.setTradition(geographyFilter);geographyFilterPending=false;}placesMap.changeLanguage();requestAnimationFrame(()=>{if(state.view==='geography')placesMap.resize();});return Promise.resolve(placesMap);}
    container.innerHTML=`<div class="library-loading" role="status">${escape(I.t('Opening the places map…'))}</div>`;
    if(!geographyLoading)geographyLoading=Promise.all([loadJson('place-geography.json'),loadRawPlaces(),loadAtlasCollection('judaism'),loadAtlasCollection('islam')]).catch(error=>{geographyLoading=null;throw error;});
    return geographyLoading.then(([geography,christianity,judaism,islam])=>{
      if(request!==geographyRequest||state.view!=='geography')return null;
      if(!placesMap){let candidate;try{candidate=new window.PlacesMapView(container,{onPlace:openGeographicPlace});candidate.setData(geography,{christianity,judaism,islam});placesMap=candidate;}catch(error){candidate?.destroy();geographyLoading=null;throw error;}}
      placesMap.setTradition(geographyFilter);geographyFilterPending=false;requestAnimationFrame(()=>{if(state.view==='geography')placesMap.resize();});return placesMap;
    }).catch(()=>{if(request===geographyRequest&&state.view==='geography')libraryError(container,ensureGeography);return null;});
  }
  function openGeographicPlace({tradition,id}){
    if(!Object.hasOwn(religionNames,tradition)||typeof id!=='string')return;
    useReligion(tradition);returnToGeography={tradition,id};
    if(tradition==='christianity'){pendingCity=id;setView('cities');return;}
    pendingAtlasPlace={tradition,id};setView('cities');
  }
  function ensureTraditionAtlas(){
    const tradition=state.tradition,mode=state.view,request=++atlasRequest,container=$('#tradition-atlas-view');
    if(tradition==='christianity'||!['map','cities'].includes(mode))return Promise.resolve(null);
    const showPlace=()=>{if(mode==='cities'&&pendingAtlasPlace?.tradition===tradition){traditionAtlas.openPlace(pendingAtlasPlace.id);pendingAtlasPlace=null;}};
    if(traditionAtlas?.tradition===tradition){traditionAtlas.setMode(mode);traditionAtlas.changeLanguage();showPlace();return Promise.resolve(traditionAtlas);}
    container.innerHTML=`<div class="library-loading" role="status">${escape(I.t('Opening this collection…'))}</div>`;
    return loadAtlasCollection(tradition).then(data=>{
      if(request!==atlasRequest||tradition!==state.tradition||mode!==state.view)return null;
      if(!traditionAtlas)traditionAtlas=new window.TraditionAtlasView(container,{
        onPassage:openAtlasPassage,
        onModeChange:mode=>setView(mode),
        onPerson:id=>{returnToAtlas={tradition:state.tradition,mode:state.view};selectPeopleCollection(state.tradition,id);}
      });
      traditionAtlas.setCollection(data,mode);showPlace();return traditionAtlas;
    }).catch(()=>{atlasCache.delete(tradition);if(request===atlasRequest&&tradition===state.tradition&&mode===state.view)libraryError(container,ensureTraditionAtlas);return null;});
  }
  async function openAtlasPassage(passage){
    const tradition=state.tradition;
    if(passage.tradition!==tradition||!['judaism','islam'].includes(tradition))return;
    const origin=returnToAtlas?.tradition===tradition?returnToAtlas:{tradition,mode:state.view};
    if(!['map','cities'].includes(origin.mode))return;
    returnToFestivals=null;returnToAtlas=origin;
    selectTradition(tradition);
    const request=++atlasPassageRequest,active=await ensureReader();
    if(request!==atlasPassageRequest||state.view!=='reader'||state.tradition!==tradition)return;
    if(!active){libraryError($('#sacred-reader-view'),()=>openAtlasPassage(passage));return;}
    const edition=tradition==='judaism'?'he':'nl';
    const label=tradition==='judaism'?`${passage.book} ${passage.chapter}:${passage.verse}-${passage.endVerse||passage.verse}`:`${passage.surah}:${passage.verse}-${passage.endVerse||passage.verse}`;
    const target=active.model.reference(label,edition,I.language);
    if(target){active.selectEdition(edition);active.open(target);}
    else toast(I.t('This reference could not be located in the reader.'));
  }
  function ensureFestivals(){
    const tradition=state.tradition,request=++festivalRequest,container=$('#festivals-view');
    if(festivalView?.tradition===tradition){festivalView.changeLanguage();return Promise.resolve(festivalView);}
    container.innerHTML=`<div class="library-loading" role="status">${escape(I.t('Opening this collection…'))}</div>`;
    if(!festivalCache.has(tradition))festivalCache.set(tradition,loadJson(`festivals-${tradition}.json`).catch(error=>{festivalCache.delete(tradition);throw error;}));
    return festivalCache.get(tradition).then(data=>{
      if(request!==festivalRequest||tradition!==state.tradition||state.view!=='festivals')return null;
      if(!festivalView)festivalView=new window.FestivalView(container,{onPassage:openFestivalPassage});
      festivalView.setCollection(data);return festivalView;
    }).catch(()=>{festivalCache.delete(tradition);if(request===festivalRequest&&state.view==='festivals')libraryError(container,ensureFestivals);return null;});
  }
  async function openFestivalPassage(passage,entryId){
    const tradition=passage.tradition;
    if(tradition!==state.tradition||!Object.hasOwn(religionNames,tradition))return;
    returnToAtlas=null;returnToFestivals={tradition,entryId};
    if(tradition==='christianity')selectBibleEdition('catholic-nl');
    selectTradition(tradition);
    const request=++festivalPassageRequest,active=await ensureReader();
    if(request!==festivalPassageRequest||state.view!=='reader'||state.tradition!==tradition)return;
    if(!active){libraryError($(tradition==='christianity'?'#reader-view':'#sacred-reader-view'),()=>openFestivalPassage(passage,entryId));return;}
    if(tradition==='christianity'){
      active.restoreSelectedEdition();
      const target=active.model.reference(passage);
      if(target)active.open({...target,endVerse:passage.endVerse||target.endVerse});
      else toast(I.t('This reference could not be located in the reader.'));
    }else{
      const edition=tradition==='judaism'?'he':'nl';
      const reference=tradition==='judaism'?`${passage.book} ${passage.chapter}:${passage.verse}-${passage.endVerse||passage.verse}`:`${passage.surah}:${passage.verse}-${passage.endVerse||passage.verse}`;
      const target=active.model.reference(reference,edition,I.language);
      if(target){active.selectEdition(edition);active.open(target);}
      else toast(I.t('This reference could not be located in the reader.'));
    }
  }
  function loadPeopleCollection(key){
    const files={judaism:'torah-people.json',islam:'quran-people.json',compare:'person-comparisons.json'};
    if(!peopleCache.has(key))peopleCache.set(key,loadJson(files[key]).catch(error=>{peopleCache.delete(key);throw error;}));
    return peopleCache.get(key);
  }
  function selectPeopleCollection(tradition,personId=null){
    if(!useReligion(tradition))return;
    pendingPeopleProfile=personId?{tradition,id:personId}:null;
    peopleRequest++;
    setView('index');
  }
  function ensurePeopleIndex(){
    if(state.peopleTradition==='christianity')return Promise.resolve(null);
    const tradition=state.peopleTradition,request=++peopleRequest,container=$('#tradition-people-view');
    const applyRequestedProfile=()=>{if(pendingPeopleProfile?.tradition===tradition){peopleIndex.open(pendingPeopleProfile.id);pendingPeopleProfile=null;}};
    if(peopleIndex?.tradition===tradition){peopleIndex.changeLanguage();applyRequestedProfile();return Promise.resolve(peopleIndex);}
    container.innerHTML=`<div class="library-loading" role="status">${escape(I.t('Opening this collection…'))}</div>`;
    return loadPeopleCollection(tradition).then(data=>{
      if(request!==peopleRequest||tradition!==state.peopleTradition)return null;
      if(!peopleIndex)peopleIndex=new window.PeopleIndexView(container,{onCompare:openComparison,onRead:selectTradition});
      peopleIndex.setCollection(data,tradition);
      applyRequestedProfile();
      // Comparison availability enhances a profile; it never blocks its collection.
      loadPeopleCollection('compare').then(comparisons=>peopleIndex.setComparisonKeys(comparisons.people.map(p=>p.key))).catch(()=>{});
      return peopleIndex;
    }).catch(()=>{if(request===peopleRequest)libraryError(container,ensurePeopleIndex);return null;});
  }
  function ensureComparisons(){
    if(comparisonView){comparisonView.changeLanguage();return Promise.resolve(comparisonView);}
    if(comparisonLoading)return comparisonLoading;
    const container=$('#comparison-view');
    container.innerHTML=`<div class="library-loading" role="status">${escape(I.t('Opening this collection…'))}</div>`;
    comparisonLoading=loadPeopleCollection('compare').then(data=>{
      comparisonView=new window.PeopleComparisonView(container,data,{onPerson:openCollectionPerson});return comparisonView;
    }).catch(()=>{libraryError(container,ensureComparisons);return null;}).finally(()=>{comparisonLoading=null;});
    return comparisonLoading;
  }
  function openComparison(key){setView('compare');ensureComparisons().then(view=>{if(state.view==='compare')view?.open(key);});}
  function openCollectionPerson(tradition,id){
    if(tradition==='christianity'){explorePerson(id);return;}
    selectPeopleCollection(tradition,id);
  }
  function loadRawPlaces() {if(!placesPromise)placesPromise=loadJson('places-data.json').catch(error=>{placesPromise=null;throw error;});return placesPromise;}
  function loadPlaces() {return loadRawPlaces().then(data=>I.localizePlaces(data));}
  function loadScripture(locale=I.language) {if(!scriptureCache.has(locale))scriptureCache.set(locale,loadJson(catholicEditions[locale]?.file||(locale==='en'?'bible-data.json':`bible-data-${locale}.json`)).catch(error=>{scriptureCache.delete(locale);throw error;}));return scriptureCache.get(locale);}
  function ensureCatholicPeople(){
    if(catholicPeople)return Promise.resolve(catholicPeople);
    if(!catholicPeopleLoading)catholicPeopleLoading=loadJson('catholic-people.json').then(data=>{catholicPeople=new window.CatholicPeople(data,people);updateCounts();return catholicPeople;}).finally(()=>{catholicPeopleLoading=null;});
    return catholicPeopleLoading;
  }
  function loadPersonPassages(){
    if(personPassages)return Promise.resolve(personPassages);
    if(!personPassagesLoading)personPassagesLoading=loadJson('person-passage-map.json').then(data=>personPassages=new window.PersonPassageMap(data)).finally(()=>{personPassagesLoading=null;});
    return personPassagesLoading;
  }
  const bibleEditionKey=()=>state.bibleEdition==='locale'?I.language:state.bibleEdition;
  function selectBibleEdition(edition){
    if((!isCatholicEdition(edition)&&edition!=='locale')||edition===state.bibleEdition)return;
    if(reader)bibleEditionStates.set(bibleEditionKey(),reader.getState());
    state.bibleEdition=edition;readerRequest++;reader=null;readerLoading=null;
    savedReaderState=bibleEditionStates.get(bibleEditionKey())||null;
    try{localStorage.setItem('biblepath-bible-edition',edition);}catch{}
    if(state.view==='reader')ensureReader();
  }
  function openCatholicProfile(id){
    const profile=catholicPeople?.byId.get(id);if(!profile)return;
    const local=value=>typeof value==='string'?value:value?.[I.language]||value?.en||'';
    $('#catholic-profile-content').innerHTML=`<span class="library-kicker">${escape(I.t('People of the Catholic Bible'))}</span><h2 id="catholic-profile-title">${escape(local(profile.names))}</h2><p>${escape(local(profile.disambiguation))}</p><div class="collection-role-tags">${local(profile.roles).map(role=>`<span>${escape(role)}</span>`).join('')}</div><p class="collection-summary">${escape(local(profile.summary))}</p><h3>${escape(I.t('Passages and sources'))}</h3><p>${escape(I.t('Read these passages in the Dutch Catholic Bible. The original source references remain available separately.'))}</p><div class="catholic-profile-passages">${profile.refs.map((ref,index)=>`<div><button class="collection-reader-link" data-catholic-passage="${index}">${escape(I.reference(ref.label))} · ${escape(I.t('Read in Dutch'))} →</button><a href="${escape(ref.url)}" target="_blank" rel="noopener noreferrer">${escape(I.t('Read the source'))} ↗</a></div>`).join('')}</div>${profile.bibleId?`<button class="solid-button" id="catholic-profile-family">${escape(I.t('Open the existing family map'))}</button>`:`<p>${escape(I.t('This profile has sourced passages; family relationships have not been added to the map.'))}</p>`}<p class="collection-source-note">${escape(local(catholicPeople.data.meta.referenceNote))}</p>`;
    $$('#catholic-profile-content [data-catholic-passage]').forEach(button=>button.addEventListener('click',()=>{const ref=profile.refs[Number(button.dataset.catholicPassage)];$('#catholic-profile-dialog').close();openPersonPassage(ref);}));
    $('#catholic-profile-family')?.addEventListener('click',()=>{$('#catholic-profile-dialog').close();explorePerson(profile.bibleId);});
    $('#catholic-profile-dialog').showModal();
  }
  function libraryError(container,retry) {container.innerHTML=`<div class="library-empty"><h2>${escape(I.t('This collection could not load.'))}</h2><p>${escape(I.t('Check your connection, then try again.'))}</p><button class="solid-button library-retry">${escape(I.t('Try again'))}</button></div>`;container.querySelector('button').addEventListener('click',retry);}
  function selectTradition(tradition){
    if(!useReligion(tradition))return;
    setView('reader');
  }
  function ensureSacredReader(){
    if(sacredReader){sacredReader.changeLanguage();return Promise.resolve(sacredReader);}
    if(sacredLoading)return sacredLoading;
    const tradition=state.tradition,request=++sacredRequest,container=$('#sacred-reader-view');
    container.innerHTML=`<div class="library-loading" role="status">${escape(I.t('Opening this collection…'))}</div>`;
    if(!sacredCache.has(tradition))sacredCache.set(tradition,loadJson(tradition==='judaism'?'tanakh-data.json':'quran-data.json').catch(error=>{sacredCache.delete(tradition);throw error;}));
    sacredLoading=sacredCache.get(tradition).then(data=>{
      if(request!==sacredRequest||tradition!==state.tradition)return null;
      sacredReader=new window.SacredReader(container,new window.SacredLibrary(tradition,data));return sacredReader;
    }).catch(()=>{if(request===sacredRequest&&tradition===state.tradition)libraryError(container,ensureSacredReader);return null;}).finally(()=>{if(request===sacredRequest)sacredLoading=null;});
    return sacredLoading;
  }
  let readerLoading=null,citiesLoading=null,passageLoading=null;
  function cancelPersonRequest(){
    personPassageRequest++;if(pendingPassage?.personPassage)pendingPassage=null;
    if(reader?.personPassage?.status==='loading'){reader.personPassage=null;reader.render();}
  }
  function readPendingPassage() {
    if(passageLoading)return passageLoading;
    if(!reader||!pendingPassage)return Promise.resolve(reader);
    passageLoading=(async()=>{
      // Edition changes may leave the replacement reader loading while a
      // previous source-edition lookup completes. Keep its next passage queued.
      while(pendingPassage&&reader){
        const ref=pendingPassage,activeReader=reader;pendingPassage=null;
        try{
          if(ref.personPassage){
            activeReader.openPersonPassage({status:'loading',targets:[],sourceLabel:ref.label,sourceUrl:ref.url,originalReference:ref});
            const passages=await loadPersonPassages();
            if(reader!==activeReader||ref.passageRequest!==personPassageRequest||state.view!=='reader'||state.tradition!=='christianity'||state.bibleEdition!=='catholic-nl')continue;
            activeReader.restoreSelectedEdition();
            activeReader.openPersonPassage({...passages.resolve(ref),originalReference:ref});
            continue;
          }
          if(isCatholicEdition(ref.edition)){
            activeReader.restoreSelectedEdition();
            const parsed=activeReader.model.reference(ref);
            if(reader===activeReader&&(!parsed||!activeReader.open({...parsed,endVerse:ref.endVerse||parsed.endVerse})))toast(I.t('This reference could not be located in the reader.'));
            continue;
          }
          let sourceModel=activeReader.sourceModel;
          if(!activeReader.selectedModel.atlasReference(ref)&&!sourceModel){
            const [text,places]=await Promise.all([loadScripture('en'),loadPlaces()]);
            sourceModel=new window.BibleScripture(text,window.BIBLE_DATA,places);
          }
          if(reader===activeReader&&!activeReader.openAtlas(ref,sourceModel))toast('This reference could not be located in the reader.');
        }catch{
          if(ref.personPassage){
            if(reader===activeReader&&ref.passageRequest===personPassageRequest&&state.view==='reader'&&state.tradition==='christianity'&&state.bibleEdition==='catholic-nl')activeReader.openPersonPassage({status:'error',targets:[],sourceLabel:ref.label,sourceUrl:ref.url,originalReference:ref});
          }else toast(I.t('The cited passage could not load. Select the city reference again to retry.'));
        }
      }
      return reader;
    })().finally(()=>{
      passageLoading=null;
      // A replacement reader can become ready between the loop finishing and
      // this cleanup. Include that queued passage in callers' completion.
      if(reader&&pendingPassage)return readPendingPassage();
    });
    return passageLoading;
  }
  function showPendingCity() {if(cities&&pendingCity){const id=pendingCity;pendingCity=null;cities.open(id);}}
  function ensureReader() {
    if(state.tradition!=='christianity')return ensureSacredReader();
    if(reader)return readPendingPassage();
    if(readerLoading)return readerLoading;
    $('#reader-view').innerHTML='<div class="library-loading" role="status">Opening the Bible…</div>';
    const request=++readerRequest,edition=bibleEditionKey();
    readerLoading=Promise.all([loadScripture(edition),loadPlaces(),isCatholicEdition(edition)?ensureCatholicPeople():null]).then(async([text,places])=>{
      const readerPeople=isCatholicEdition(edition)?catholicPeople.readerPeople(I.language):window.BIBLE_DATA;
      const model=new window.BibleScripture(text,readerPeople,places);
      const sourceModel=savedReaderState?.atlasReference?new window.BibleScripture(await loadScripture('en'),window.BIBLE_DATA,places):null;
      if(request!==readerRequest||edition!==bibleEditionKey())return null;
      reader=new window.BibleReader($('#reader-view'),model,readerPeople,places,{onPerson:id=>openLibraryPerson(id,'reader'),onPlace:openCity,editionId:state.bibleEdition,editionOptions:[...Object.entries(catholicEditions).map(([id,item])=>({id,label:I.t(item.label)})),{id:'locale',label:I.t({nl:'Statenvertaling · Dutch · 66 books',en:'World English Bible · English · 66 books',fr:'Louis Segond · French · 66 books'}[I.language])}],onPersonPassageRetry:openPersonPassage,onPersonPassageCancel:cancelPersonRequest,onEditionChange:id=>{cancelPersonRequest();pendingPassage=null;selectBibleEdition(id);}});
      if(savedReaderState){reader.setState(savedReaderState,sourceModel);savedReaderState=null;}
      await readPendingPassage();
      return reader;
    }).catch(()=>{if(request===readerRequest)libraryError($('#reader-view'),ensureReader);return null;}).finally(()=>{if(request===readerRequest)readerLoading=null;});
    return readerLoading;
  }
  function ensureCities() {
    if(cities){showPendingCity();return Promise.resolve(cities);}
    if(citiesLoading)return citiesLoading;
    $('#cities-view').innerHTML='<div class="library-loading" role="status">Opening the cities collection…</div>';
    citiesLoading=loadPlaces().then(places=>{cities=new window.BibleCities($('#cities-view'),places,window.BIBLE_DATA,{onPerson:id=>openLibraryPerson(id,'cities'),onPassage:openPassage});if(savedCitiesState){cities.setState(savedCitiesState);savedCitiesState=null;}showPendingCity();return cities;}).catch(()=>{libraryError($('#cities-view'),ensureCities);return null;}).finally(()=>{citiesLoading=null;});
    return citiesLoading;
  }
  function openPassage(reference) {cancelPersonRequest();pendingPassage=reference;if(isCatholicEdition(reference.edition))selectBibleEdition(reference.edition);selectTradition('christianity');}
  function openPersonPassage(reference){
    pendingPassage={...(typeof reference==='string'?{label:reference}:reference),personPassage:true,passageRequest:++personPassageRequest};
    selectBibleEdition('catholic-nl');selectTradition('christianity');
  }
  function openCity(id) {pendingCity=id;useReligion('christianity');setView('cities');}
  function openLibraryPerson(id,origin) {if(catholicPeople?.byId.has(id)&&isCatholicEdition(state.bibleEdition)&&origin==='reader'){openCatholicProfile(id);return;}returnToLibrary=origin;$('#return-to-library').textContent=origin==='reader'?'← Back to the Bible reader':'← Back to the city';explorePerson(id);}

  function renderIndex() {
    updateCounts();
    const matches = catholicPeople?catholicPeople.search($('#index-search').value,I.language,state.testament):matchingPeople($('#index-search').value);
    $('#catholic-index-status').textContent=I.t(catholicPeople?'Includes {count} sourced profiles from the deuterocanonical books and additions.':'Loading the Catholic index additions…',{count:catholicPeople?.data.people.length||0});
    const totalPages = Math.max(1,Math.ceil(matches.length/INDEX_PAGE_SIZE));
    state.indexPage = Math.min(state.indexPage,totalPages);
    const start = (state.indexPage-1)*INDEX_PAGE_SIZE, page = matches.slice(start,start+INDEX_PAGE_SIZE);
    $('#index-result-count').textContent = matches.length ? `${(start+1).toLocaleString(I.language)}–${Math.min(start+INDEX_PAGE_SIZE,matches.length).toLocaleString(I.language)} of ${matches.length.toLocaleString(I.language)} people` : '0 people';
    $('#index-grid').innerHTML = page.map(person=>`<button class="person-card" data-person="${escape(person.id)}"><span class="avatar ${person.gender}">${escape(person.name[0])}</span><span class="person-card-copy"><strong>${escape(person.name)}</strong><small>${identityContext(person,'<br>')}</small></span>${icon('arrow')}</button>`).join('');
    $('#index-empty').hidden = matches.length > 0;
    $('#index-pagination').hidden = totalPages <= 1;
    $('#index-page').textContent = `Page ${state.indexPage} of ${totalPages}`;
    $('#index-previous').disabled = state.indexPage === 1;
    $('#index-next').disabled = state.indexPage === totalPages;
    $$('#index-grid [data-person]').forEach(button=>button.addEventListener('click',()=>catholicPeople?.byId.has(button.dataset.person)?openCatholicProfile(button.dataset.person):explorePerson(button.dataset.person)));
  }

  function showTooltip(person, point) {
    clearTimeout(tooltipTimer);
    const tooltip = $('#person-tooltip');
    if (currentTooltipId !== person.id) {
      tooltip.innerHTML = `<div class="tooltip-heading"><i class="legend-dot ${person.gender === 'female' ? 'woman' : 'man'}"></i>${escape(person.name)}</div><p>${escape(person.description)}</p><a target="_blank" rel="noopener noreferrer" href="${escape(person.refs[0].url)}">${person.refs[0].provenance === 'indexed-name' ? 'Name reference: ' : ''}${escape(person.refs[0].label)} ↗</a><div class="tooltip-hint">Select this person to see their family & all sources</div>`;
      currentTooltipId = person.id;
    }
    tooltip.hidden = false;
    const bounds = tooltip.getBoundingClientRect();
    let left = point.x + 22, top = point.y - 30;
    if (left + bounds.width > window.innerWidth - 12) left = point.x - bounds.width - 22;
    top = Math.max(12,Math.min(top,window.innerHeight - bounds.height - 12));
    tooltip.style.left = `${Math.max(12,left)}px`;tooltip.style.top = `${top}px`;
  }
  function delayHideTooltip() {clearTimeout(tooltipTimer);tooltipTimer = setTimeout(hideTooltip,240);}
  function hideTooltip() {clearTimeout(tooltipTimer);$('#person-tooltip').hidden = true;currentTooltipId = null;}
  $('#person-tooltip').addEventListener('mouseenter',()=>clearTimeout(tooltipTimer));
  $('#person-tooltip').addEventListener('mouseleave',delayHideTooltip);

  function openSearch(target = null) {
    searchTarget = typeof target === 'string' ? target : null;
    $('#global-search').placeholder = searchTarget ? `Choose ${searchTarget === 'from' ? 'the starting person' : 'the destination person'}…` : 'Whose story will you discover?';
    $('#global-search').setAttribute('aria-label',searchTarget ? `Find ${searchTarget === 'from' ? 'starting' : 'destination'} person` : 'Find a biblical person');
    hideTooltip();$('#search-dialog').showModal();$('#global-search').value = '';renderSearch();$('#global-search').focus();
    if(!searchTarget)ensureCatholicPeople().then(()=>{if(!searchTarget)renderSearch();}).catch(()=>{});
  }
  function renderSearch() {
    const query = $('#global-search').value.trim();
    const matches = query ? (!searchTarget&&catholicPeople?catholicPeople.search(query,I.language):matchingPeople(query,'all')) : ['adam','abraham','sarah','jacob','moses','david','mary','jesus'].map(id=>personById.get(id)).filter(Boolean);
    $('#search-heading').textContent = query ? `${matches.length.toLocaleString(I.language)} ${matches.length === 1 ? 'PERSON' : 'PEOPLE'} FOUND${matches.length>50 ? ' · FIRST 50 SHOWN — REFINE YOUR SEARCH' : ''}` : 'START WITH A FAMILIAR NAME';
    $('#search-results').innerHTML = matches.length ? matches.slice(0,50).map(person=>`<button class="search-result" data-person="${escape(person.id)}"><span class="search-initial ${person.gender}">${escape(person.name[0])}</span><span><strong>${escape(person.name)}</strong><small>${identityContext(person)}</small></span>${icon('arrow')}</button>`).join('') : '<div class="search-empty">No matching people. Try another spelling or search the people index.</div>';
    $$('#search-results [data-person]').forEach(button=>button.addEventListener('click',()=>{$('#search-dialog').close();if(searchTarget){pickPathPerson(searchTarget,button.dataset.person);searchTarget=null;}else if(catholicPeople?.byId.has(button.dataset.person))openCatholicProfile(button.dataset.person);else explorePerson(button.dataset.person);}));
  }

  function renderPathPickers() {
    for (const side of ['from','to']) {
      const person = personById.get(pathPicks[side]);
      $(`#path-${side}-name`).textContent = person.name;
      $(`#path-${side}-initial`).textContent = person.name[0];
      $(`#path-${side}-context`).textContent = person.disambiguation || person.era;
    }
  }

  function clearPath(redraw = true) {
    const wasActive = !!activePath;
    activePath = null; clearTimeout(zoomTimer);
    $('#path-result-actions').hidden = true;
    $('#depth-select').disabled = false; $('#show-spouses').disabled = false; $('#show-spouses').checked = state.spouses;
    $('#map-view').classList.remove('showing-path');
    $('#path-status').textContent = 'Choose two people, then find their connection.';
    if (redraw && wasActive) renderGraph();
  }

  function pickPathPerson(side,id) {
    clearPath(); pathPicks[side] = id; renderPathPickers();
  }

  function findConnection() {
    useReligion('christianity');
    clearTimeout(zoomTimer);
    const result = pathFinder.find(pathPicks.from,pathPicks.to,{scriptureOnly:$('#path-scripture-only').checked,spouses:true});
    clearPath(false);
    const from = personById.get(pathPicks.from), to = personById.get(pathPicks.to);
    if (!['found','same'].includes(result.status)) {
      renderGraph();
      $('#path-status').textContent = $('#path-scripture-only').checked
        ? `No path made entirely of Bible-cited links is recorded between ${from.name} and ${to.name}. Uncheck “Bible-cited connections only” to also search the relationship index.`
        : `No connecting family path is recorded between ${from.name} and ${to.name}. This is a gap in the collection, not proof that they are unrelated.`;
      return;
    }
    activePath = result;
    setTestamentState('all'); setView('map');
    state.selected = from.id;
    $('#depth-select').disabled = true; $('#show-spouses').disabled = true; $('#show-spouses').checked = true;
    $('#path-result-actions').hidden = false;
    $('#map-view').classList.add('showing-path');
    $('#path-status').textContent = result.status === 'same' ? `${from.name} is the same person — no connecting steps are needed.` : `${from.name} → ${to.name} · ${result.steps.length} connections · ${result.verseCount} Bible-cited${result.indexedCount ? ` · ${result.indexedCount} indexed` : ''}`;
    renderPathGraph();
  }

  function renderPathGraph() {
    if (!activePath) return;
    hideTooltip();clearTimeout(zoomTimer);
    const ids = new Set(activePath.personIds), context = [];
    // Retain the entire connecting route; nearby family gives the highlight context.
    for (const id of activePath.personIds) {
      for (const edge of discovery.byPerson.get(id) || []) {
        const next = edge.source === id ? edge.target : edge.source;
        if (!ids.has(next) && context.length < 20) {ids.add(next);context.push(personById.get(next));}
      }
    }
    const visible = [...activePath.people,...context];
    const edges = relationships.filter(edge=>ids.has(edge.source) && ids.has(edge.target));
    lastSelection = {people:visible,relationships:edges,omitted:0};
    rendering = true;
    graph.setData(visible,edges,{layout:state.layout,focusId:activePath.personIds[0],selectedId:state.selected,highlightPath:{personIds:activePath.personIds,relationships:activePath.relationships}});
    rendering = false;
    $('#map-empty').hidden = true;
    $('#map-title').textContent = `${personById.get(pathPicks.from).name} → ${personById.get(pathPicks.to).name}`;
    $('#visible-count').textContent = `${activePath.personIds.length} on path`;
    $('#discovery-title').textContent = 'Connecting path';
    $('#discovery-description').textContent = 'Gold traces the route · Zoom in to follow each life';
    $('#discovery-level').textContent = `${activePath.steps.length} steps · ${context.length} nearby relatives`;
    $('.discovery-bar').classList.remove('is-limited');
    $$('.layout-option').forEach(button=>{const active=button.dataset.layout===state.layout;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $('#layout-caption').innerHTML = 'A THREAD BETWEEN TWO LIVES<small>Follow the gold connections.</small>';
    renderPathInspector();
  }

  function stepDescription(step) {
    const a = personById.get(step.fromId), b = personById.get(step.toId);
    if (step.direction === 'spouse') return `${a.name} is linked as spouse of ${b.name}`;
    const parent = personById.get(step.edge.source);
    const legal = /legal/i.test(step.edge.note || '');
    const role = legal ? 'legal parent' : parent.gender === 'female' ? 'mother' : 'father';
    return step.direction === 'parent-to-child' ? `${a.name} → ${b.name} · ${role} to child` : `${a.name} → ${b.name} · child to ${role}`;
  }

  function renderPathInspector() {
    if (!activePath) return;
    const from = activePath.people[0], to = activePath.people[activePath.people.length-1];
    const containsLegal = activePath.relationships.some(edge=>/legal/i.test(edge.note || ''));
    const kind = activePath.kind === 'ancestry' ? 'Ancestral route' : activePath.kind === 'reverse-ancestry' ? 'Route to an ancestor' : activePath.kind === 'same' ? 'Same person' : 'Family connection';
    const explanation = activePath.kind === 'ancestry' ? `${from.name} connects to ${to.name} through a parent-to-child route in this collection.` : activePath.kind === 'reverse-ancestry' ? `${from.name} connects back to ${to.name} through a child-to-parent route in this collection.` : activePath.kind === 'same' ? 'Both selections refer to the same person.' : 'This is a shortest recorded family route, which can include parents, children, and spouses.';
    const notes = [...new Set(activePath.people.flatMap(person=>person.notes || []))];
    $('#inspector').innerHTML = `<div class="profile-topline"><span>THE CONNECTING THREAD</span>${icon('tree')}</div>
      <h2 class="path-inspector-title">${escape(from.name)} <span>to</span> ${escape(to.name)}</h2>
      <div class="path-summary-tags"><span>${kind}</span><span>${activePath.steps.length} steps</span></div>
      <p class="path-explanation">${escape(explanation)}</p>
      ${containsLegal ? '<p class="path-important">Includes legal parenthood. This is not an entirely biological lineage.</p>' : ''}
      <p class="path-source-explanation">${activePath.indexedCount ? `${activePath.verseCount} steps cite Bible passages; ${activePath.indexedCount} cite STEP Bible’s relationship index and are marked below. An indexed link may reflect an editorial inference.` : 'Every step below links to a biblical passage.'} Parent links follow the accounts selected in this atlas; genealogy lists can omit generations.</p>
      <div class="path-endpoint"><span>START</span><button data-path-person="${escape(from.id)}">${escape(from.name)} ${icon('fit')}</button></div>
      <ol class="path-steps">${activePath.steps.map((step,index)=>`<li><span class="path-step-number">${index+1}</span><div><button class="path-step-person" data-path-person="${escape(step.toId)}">${escape(stepDescription(step))}</button><a href="${escape(step.edge.ref.url)}" target="_blank" rel="noopener noreferrer" class="path-step-source">${icon('book')}${escape(step.edge.ref.label)} ↗</a>${step.edge.evidence?.kind === 'index' || step.edge.provenance === 'indexed' ? '<span class="path-indexed-badge">Indexed relationship · not verse-verified</span>' : ''}${step.edge.note ? `<p class="path-step-note">${escape(step.edge.note)}</p>` : ''}</div></li>`).join('')}</ol>
      ${activePath.status === 'same' ? '<p class="path-explanation">Select a different destination to find a connecting path.</p>' : `<div class="path-endpoint"><span>DESTINATION</span><button data-path-person="${escape(to.id)}">${escape(to.name)} ${icon('fit')}</button></div>`}
      ${notes.length ? `<details class="path-notes"><summary>Notes on this route (${notes.length})</summary>${notes.map(note=>`<p>${escape(note)}</p>`).join('')}</details>` : ''}
      <p class="path-reading-hint">Select a step to locate that person. Select a circle for their profile. Gold arrows always point from parent to child, even when following the route in reverse.</p>`;
    $$('#inspector [data-path-person]').forEach(button=>button.addEventListener('click',()=>{state.selected=button.dataset.pathPerson;graph.centerOn(state.selected,1.15);hideTooltip();}));
    $('#inspector').scrollTop=0;
  }

  function openInfo(mode) {
    hideTooltip();
    $('#info-content').innerHTML = mode === 'help' ? `
      <div class="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</div><h2>Every life opens a story.</h2>
      <p>Start with a familiar name, then follow the connections to see how biblical families fit together.</p>
      <h3>Families and places within each religion</h3><p>Judaism and Islam have separate family maps and place collections. All family maps share the same circular nodes and three layouts. They start with immediate family; choose the whole family for the complete selected group. Select a person and expand sources or relationships when needed. Parentage, marriage, siblings, guardianship and adoption remain distinct. The cities explorer opens an interactive map. Filter by one or more religions, search and select a marker, then open its people and passages. Return preserves the map position and filters. List opens the existing collection. Uncertain and traditional locations are labeled; places without supported coordinates remain searchable without a marker. Reading actions open the Hebrew Tanakh or Dutch Qur’an translation; the return button restores the selected map or place. These are curated selections, not exhaustive genealogies or geographic inventories.</p><h3>Read the Catholic Bible and explore its cities</h3><p><strong>Bible reader</strong> contains both testaments in English (World English Bible), Dutch (Statenvertaling), and French (Louis Segond 1910). Choose the language in the top bar. Browse books and chapters or search words, phrases and references. Underlined names open a family map or city profile. Dotted names offer possible identities rather than choosing one for you. Your reading position is kept when you follow a link.</p><p><strong>Cities explorer</strong> provides an alphabetical, searchable collection of settlements. Filter by testament or book, read the indexed passages, and follow people indexed in those passages. Shared references do not by themselves establish that a person lived in that city.</p>
      <h3>Connect two people</h3><p>Use <strong>How are they connected?</strong> to choose a start and destination, then select <strong>Find connection</strong>. The gold route remains highlighted while you zoom, pan, or switch layouts. The side panel lists every connection with its source; select a step to locate that person.</p><p>The finder prefers a parent-to-child route when one exists, then searches other family connections. Bible-cited connections are the default. Uncheck that option to include STEP Bible’s indexed links, which are clearly labeled. A missing route means the collection has no recorded path under those settings.</p>
      <h3>Three ways to see the same people</h3><ul><li><strong>Constellation</strong> spreads a family into an organic network.</li><li><strong>Family tree</strong> arranges parents above their children.</li><li><strong>Ancestry rings</strong> places your starting person at the center, with each ring one family connection farther away. Spouses and descendants can appear alongside ancestors.</li></ul>
      <h3>Zoom into the story</h3><p><strong>Adaptive zoom</strong> starts with immediate family. Zoom out to reveal more distant relatives, up to eight family steps away. Zoom in near a person to uncover their immediate relatives and read relationship labels. Revealed branches stay on the map until you reset or choose another family; people stay in place as branches appear unless the family tree needs extra rows to keep parents above children.</p>
      <p>Drag to move. Scroll or pinch to zoom from 1% to 500%. The + and − buttons do the same. Fit shows everyone currently loaded; Reset view returns to your starting family. You can also choose a fixed number of family steps.</p>
      <p>Large branches show up to ${MAX_MAP_PEOPLE} people at a time. Select any person and explore their family to continue deeper. Every indexed person remains available through search, including separate family groups.</p>
      <p>Hover over a circle for a short biography and passage link. Select a person to open their profile; choose <strong>Explore their family</strong> to build a new map around them. On touchscreens, tap to open the profile.</p>
      <div class="info-fact">Solid arrows lead from parent to child. Dashed lines connect spouses. Hovering or selecting highlights that person’s links. Notes identify legal parenthood, uncertain identities, and indexed relationships that may reflect an editorial inference.</div>` : `
      <div class="eyebrow">RELIGIONS IN CONTEXT</div><h2>ReligieAtlas</h2>
      <p>ReligieAtlas is an information source about Roman Catholic Christianity, Judaism and Islam. It brings together holy books, people, festivals and rituals, with source references and historical context. Each religion retains its own accounts and interpretations.</p>
      <div class="info-fact">${people.length.toLocaleString(I.language)} people · ${relationships.length.toLocaleString(I.language)} family connections · Both testaments</div>
      <p>${escape(meta?.coverage || 'This is an initial curated collection, not yet an exhaustive index of every person in the Bible.')}</p>
      <p>The three layouts share one searchable collection. Person reading buttons open the reviewed Dutch Catholic correspondence. Separate source links retain the original KJV or ESV citations used by the atlas. Namesakes remain distinct people.</p>
      <h3>Roman Catholic focus and current coverage</h3><p>The Christian account in the people comparison follows a Roman Catholic perspective, with biblical passages and separately identified references to the Catechism of the Catholic Church and Church teaching. Jewish and Islamic accounts retain their own sources and identities.</p><p>The complete Catholic reader contains all 73 books in Dutch and English (Douay-Rheims 1899), including Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees and the additions to Esther and Daniel. Each edition keeps its own text and verse numbering. Dutch is the default interface language and the Dutch Catholic Bible is the default text edition for a first visit. Existing explicitly saved choices are retained. The 66-book World English Bible, Statenvertaling and Louis Segond editions remain available.</p><h3>Read each connection with its source</h3><p>Some family links cite a specific biblical passage; others cite STEP Bible’s editorial relationship index. An indexed link is not a claim that a particular verse explicitly establishes that relationship. Notes identify uncertainty, legal parenthood, and differing accounts.</p>
      <p>Catholic supplemental profiles cite the added corpus directly. The original family graph and city atlas retain their existing 66-book source scope. The supplemental profiles are a sourced selection, not an exhaustive concordance or inferred genealogy. Missing links indicate a gap in this map, not necessarily in Scripture. Namesakes remain separate; unsupported genealogical harmonizations are excluded.</p>
      <h3>Sources & attribution</h3>${(meta.sources || []).map(source=>`<p><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.name)}</a>${source.license ? ` · ${escape(source.license)}` : ''}${source.credit ? `<br>${escape(source.credit)}` : ''}</p>`).join('')}
      <p>The Dutch Catholic reader uses Canisius 1939 with credited historical supplements. The text sources, supplement boundaries and attribution are recorded with the edition and in the data notes. The English Catholic reader uses the public-domain <a href="https://ebible.org/engDRA/" target="_blank" rel="noopener noreferrer">Douay-Rheims 1899</a> from eBible.org. Catholic supplemental profile buttons open their reviewed Dutch Catholic passages and retain a separate link to the original English source. Changed verse numbers, split passages and incomplete correspondences are shown explicitly. The additional 66-book readers use the World English Bible, Statenvertaling and Louis Segond 1910. Cities combine STEP name references with <a href="https://www.openbible.info/geo/" target="_blank" rel="noopener noreferrer">OpenBible.info</a> settlement classifications, CC BY 4.0.</p>
      <p><a href="data-notes.html" target="_blank" rel="noopener noreferrer">Full data credits, scope, and editorial changes ↗</a></p>`;
    if(I.language!=='en')$('#info-content').innerHTML=window.BIBLE_INFO[I.language][mode];
    $('#info-dialog').showModal();
  }

  function syncSidebarAccess() {
    const mobile = window.matchMedia('(max-width:760px)').matches;
    const open = $('#sidebar').classList.contains('open');
    $('#sidebar').inert = mobile && !open;
    $('#mobile-menu').setAttribute('aria-expanded',String(open));
  }
  function closeSidebar() {$('#sidebar').classList.remove('open');$('#sidebar-shade').classList.remove('open');syncSidebarAccess();}
  function toast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3000);}
  $$('.layout-option').forEach(button=>button.addEventListener('click',()=>{state.layout=button.dataset.layout;renderGraph({preserveDiscovery:true});}));
  $$('.nav-item').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.navTradition)navigateReligion(button.dataset.navTradition,button.dataset.view);else{returnToGeography=null;pendingAtlasPlace=null;setView(button.dataset.view);}}));
  $$('[data-religion]').forEach(button=>button.addEventListener('click',()=>navigateReligion(button.dataset.religion,null,{keepSidebar:true})));
  $$('[data-tradition]').forEach(button=>button.addEventListener('click',()=>selectTradition(button.dataset.tradition)));
  $$('[data-people-tradition]').forEach(button=>button.addEventListener('click',()=>selectPeopleCollection(button.dataset.peopleTradition)));
  $$('.testament').forEach(button=>button.addEventListener('click',()=>{
    clearPath(false);
    setTestamentState(button.dataset.testament);
    if (state.testament !== 'all' && personById.get(state.focus).testament !== state.testament) state.focus = state.testament === 'NT' ? 'jesus' : 'abraham';
    renderGraph();if(state.view === 'index')renderIndex();
  }));
  $$('.journey').forEach(button=>button.addEventListener('click',()=>{setTestamentState('all');explorePerson(button.dataset.person,'auto');}));
  $('#depth-select').addEventListener('change',event=>{state.depth=['all','auto'].includes(event.target.value) ? event.target.value : Number(event.target.value);renderGraph();});
  $('#show-spouses').addEventListener('change',event=>{state.spouses=event.target.checked;renderGraph();});
  $('#zoom-in').addEventListener('click',()=>graph.zoomBy(1.3));$('#zoom-out').addEventListener('click',()=>graph.zoomBy(1/1.3));$('#zoom-fit').addEventListener('click',()=>graph.fit());
  $('#reset-view').addEventListener('click',()=>{if(activePath){graph.fit();toast('Fitted the full connecting path');return;}if(state.depth === 'auto')renderGraph();else graph.reset();toast(state.depth === 'auto' ? 'Returned to immediate family' : 'Map fitted to your current selection');});
  $('#path-form').addEventListener('submit',event=>{event.preventDefault();findConnection();});
  $('#path-from').addEventListener('click',()=>openSearch('from'));
  $('#path-to').addEventListener('click',()=>openSearch('to'));
  $('#path-swap').addEventListener('click',()=>{[pathPicks.from,pathPicks.to]=[pathPicks.to,pathPicks.from];renderPathPickers();if(activePath)findConnection();});
  $('#path-scripture-only').addEventListener('change',()=>{if(activePath)findConnection();});
  $('#path-clear').addEventListener('click',()=>clearPath());
  $('#return-to-library').addEventListener('click',()=>{if(returnToLibrary)setView(returnToLibrary);});
  $('#return-to-festivals').addEventListener('click',()=>{if(returnToFestivals?.tradition===state.tradition)setView('festivals');});
  $('#return-to-atlas').addEventListener('click',()=>{if(returnToAtlas?.tradition===state.tradition)setView(returnToAtlas.mode);});
  $('#return-to-geography').addEventListener('click',()=>setView('geography'));
  $('#cities-show-map').addEventListener('click',()=>setView('geography'));
  $('#cities-show-list').addEventListener('click',()=>setView('cities'));
  $('#path-details').addEventListener('click',()=>{renderPathInspector();$('#inspector').scrollIntoView({block:'nearest',behavior:'smooth'});});
  $('#map-fullscreen').addEventListener('click',()=>{const expanded=$('#map-view').classList.toggle('expanded');$('#map-fullscreen').setAttribute('aria-label',expanded?'Exit expanded map':'Expand map');requestAnimationFrame(()=>graph.fit());});
  $('#empty-reset').addEventListener('click',()=>{setTestamentState('all');explorePerson('abraham','auto');});
  $('#index-search').addEventListener('input',()=>{state.indexPage=1;renderIndex();});$('#search-trigger').addEventListener('click',openSearch);$('#global-search').addEventListener('input',renderSearch);
  $('#index-previous').addEventListener('click',()=>{state.indexPage--;renderIndex();$('#index-view').scrollIntoView({block:'start'});});
  $('#index-next').addEventListener('click',()=>{state.indexPage++;renderIndex();$('#index-view').scrollIntoView({block:'start'});});
  $('#global-search').addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();$('.search-result')?.focus();}if(event.key==='Enter')$('.search-result')?.click();});
  $('#help-button').addEventListener('click',()=>openInfo('help'));
  $('#about-button').addEventListener('click',()=>openInfo('about'));$('#sources-button').addEventListener('click',()=>openInfo('about'));
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
  $$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}}));
  $('#mobile-menu').setAttribute('aria-controls','sidebar');
  $('#help-button').setAttribute('aria-label','How to explore');
  $('#mobile-menu').addEventListener('click',()=>{$('#sidebar').classList.toggle('open');$('#sidebar-shade').classList.toggle('open');syncSidebarAccess();});$('#sidebar-shade').addEventListener('click',closeSidebar);
  document.addEventListener('keydown',event=>{
    if(event.key==='/' && state.tradition==='christianity' && state.view!=='compare' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')){event.preventDefault();openSearch();}
    if(event.key==='Escape'){hideTooltip();closeSidebar();if($('#map-view').classList.contains('expanded')){$('#map-view').classList.remove('expanded');$('#map-fullscreen').setAttribute('aria-label','Expand map');requestAnimationFrame(()=>graph.fit());}}
  });
  window.addEventListener('resize',()=>{hideTooltip();syncSidebarAccess();});
  function updateCounts() {
  const indexed=state.view==='index'&&state.peopleTradition==='christianity'&&catholicPeople?catholicPeople.entries(I.language):people;
  $('#count-all').textContent=indexed.length.toLocaleString(I.language);$('#count-ot').textContent=indexed.filter(p=>discovery.allows(p,'OT')).length.toLocaleString(I.language);$('#count-nt').textContent=indexed.filter(p=>discovery.allows(p,'NT')).length.toLocaleString(I.language);
  $('#index-count').textContent=(catholicPeople?catholicPeople.entries(I.language).length:people.length).toLocaleString(I.language);$('#coverage-summary').textContent=`${(catholicPeople?catholicPeople.entries(I.language).length:people.length).toLocaleString(I.language)} people · Expanded edition`;
  }
  updateCounts();
  async function changeLanguage(next) {
    const select=$('#language-select');select.disabled=true;
    // Finish any in-flight initialization before taking state, so a previous
    // edition cannot overwrite the newly selected reader.
    await Promise.allSettled([readerLoading,citiesLoading,passageLoading,sacredLoading].filter(Boolean));
    savedReaderState=reader?.getState?.()||savedReaderState;
    if(savedReaderState)bibleEditionStates.set(bibleEditionKey(),savedReaderState);
    savedCitiesState=cities?.getState?.()||savedCitiesState;
    I.setLanguage(next);I.localizePeople(window.BIBLE_DATA,originalPeople);updateCounts();
    savedReaderState=bibleEditionStates.get(bibleEditionKey())||null;
    searchable.clear();people.forEach(p=>searchable.set(p.id,normalize([p.name,...(p.aliases||[]),p.disambiguation||'',p.description,p.era,...p.refs.map(r=>I.reference(r.label))].join(' '))));
    reader=null;cities=null;readerLoading=null;citiesLoading=null;
    $('#reader-view').replaceChildren();$('#cities-view').replaceChildren();
    $('#info-dialog').close();$('#search-dialog').close();
    $('#catholic-profile-dialog').close();
    if(activePath){const from=personById.get(pathPicks.from),to=personById.get(pathPicks.to);$('#path-status').textContent=activePath.status==='same'?`${from.name} is the same person — no connecting steps are needed.`:`${from.name} → ${to.name} · ${activePath.steps.length} connections · ${activePath.verseCount} Bible-cited${activePath.indexedCount?` · ${activePath.indexedCount} indexed`:''}`;}
    renderPathPickers();renderGraph({preserveView:true});setView(state.view);
    if(returnToLibrary)$('#return-to-library').textContent=returnToLibrary==='reader'?'← Back to the Bible reader':'← Back to the city';
    document.title=I.t('ReligieAtlas — Religions in context');
    I.translateDOM();select.disabled=false;
  }
  $('#language-select').value=I.language;
  $('#language-select').addEventListener('change',event=>changeLanguage(event.target.value));
  useReligion(state.tradition);setTestamentState('all');syncSidebarAccess();renderPathPickers();renderGraph();setView('reader');
  I.setLanguage(I.language);I.observe();
  document.title=I.t('ReligieAtlas — Religions in context');
})();
