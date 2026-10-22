(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = text => String(text ?? '').replace(/[&<>"']/g, value => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const identityContext = (person, separator = ' · ') => {
    const context = person.disambiguation || person.era;
    return context.includes(person.refs[0].label) ? escape(context) : `${escape(context)}${separator}${escape(person.refs[0].label)}`;
  };
  const {people, relationships, meta} = window.BIBLE_DATA;
  const personById = new Map(people.map(person => [person.id, person]));
  const discovery = new window.BibleDiscovery(window.BIBLE_DATA);
  const pathFinder = new window.BiblePaths(window.BIBLE_DATA);
  const pathPicks = {from:'adam',to:'jesus'};
  let activePath = null, searchTarget = null;
  let reader = null, cities = null, placesPromise = null, scripturePromise = null;
  let pendingPassage = null, pendingCity = null;
  let returnToLibrary = null;
  const state = {layout:'constellation', focus:'abraham', selected:'abraham', depth:'auto', discoveryDepth:1, localRoots:[], testament:'all', spouses:true, view:'map', indexPage:1};
  let zoomBase = null, zoomTimer, rendering = false, lastSelection;
  const MAX_MAP_PEOPLE = 180, INDEX_PAGE_SIZE = 60;
  const graph = new window.BibleGraph($('#graph'), {
    onSelect: person => {state.selected = person.id; renderInspector(person); hideTooltip();},
    onHover: showTooltip,
    onLeave: delayHideTooltip,
    onZoom: handleZoom
  });
  // Exposed read-only snapshots help verify navigation and graph behavior.
  window.biblePath = {getState:() => ({...state, path:activePath ? {kind:activePath.kind,personIds:[...activePath.personIds],steps:activePath.steps.length,indexedCount:activePath.indexedCount} : null, graph:graph.getState(), peopleCount:people.length, relationshipCount:relationships.length})};
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
    if (rendering || activePath || !event.userInitiated || state.depth !== 'auto' || state.view !== 'map') return;
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

  function renderGraph({preserveView=false} = {}) {
    if (activePath) {renderPathGraph();return;}
    hideTooltip();
    if (!preserveView) {clearTimeout(zoomTimer);state.discoveryDepth = 1;state.localRoots=[];}
    const depth = state.depth === 'auto' ? state.discoveryDepth : state.depth === 'all' ? Infinity : state.depth;
    lastSelection = discovery.neighborhood({focusId:state.focus,depth,testament:state.testament,spouses:state.spouses,limit:MAX_MAP_PEOPLE,localRoots:state.localRoots});
    const visible = lastSelection.people, edges = lastSelection.relationships;
    if (!preserveView || !visible.some(p=>p.id===state.selected)) state.selected = state.focus;
    rendering = true;
    graph.setData(visible, edges, {layout:state.layout,focusId:state.focus,selectedId:state.selected,preserveView,anchorId:state.focus});
    rendering = false;
    if (!preserveView) zoomBase = graph.getState().transform.k;
    $('#map-empty').hidden = visible.length > 0;
    $('#visible-count').textContent = `${visible.length} people`;
    $('#map-title').textContent = `${personById.get(state.focus).name}’s connections`;
    $('#discovery-title').textContent = state.depth === 'auto' ? 'Adaptive zoom' : 'Fixed reach';
    $('#discovery-level').textContent = `${depth === Infinity ? 'Extended network' : `${depth} ${depth === 1 ? 'step' : 'steps'}${state.localRoots.length ? ' + local branches' : ''}`} · ${edges.length} links`;
    $('#discovery-description').textContent = lastSelection.omitted ? `${lastSelection.omitted.toLocaleString()} more people in this branch. Choose a person to explore farther.` : state.depth === 'auto' ? 'Zoom out for more relatives · Zoom in for detail' : 'Choose Adaptive zoom to reveal branches as you zoom';
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
    $('#inspector').innerHTML = `
      ${activePath ? '<button class="back-to-path" id="back-to-path">← Back to the connecting path</button>' : ''}
      <div class="profile-topline"><span>A LIFE IN SCRIPTURE</span>${icon('book')}</div>
      <div class="profile-hero"><div class="profile-initial ${person.gender}">${escape(person.name[0])}</div><div><h2>${escape(person.name)}</h2><div class="era">${escape(person.era)}</div></div></div>
      ${person.aliases?.length ? `<div class="profile-alias">Also known as ${person.aliases.map(escape).join(', ')}</div>` : ''}
      <div class="profile-tags"><span>${person.testament === 'OT' ? 'Old Testament' : 'New Testament'}</span><span>${person.gender === 'female' ? 'Woman' : person.gender === 'male' ? 'Man' : 'Person'}</span></div>
      ${person.disambiguation ? `<p class="profile-identity">${escape(person.disambiguation)}</p>` : ''}
      <p class="profile-description">${escape(person.description)}</p>
      <div class="profile-section"><h3>${icon('book')} IN SCRIPTURE <span class="reference-count">${(person.referenceCount || person.refs.length).toLocaleString()} refs</span></h3>${referenceLinks.map(ref=>`<a class="reference-link" href="${escape(ref.url)}" target="_blank" rel="noopener noreferrer"><span>${escape(ref.label)}${ref.provenance === 'indexed-name' ? '<small class="reference-provenance">Indexed name reference</small>' : ''}</span>${icon('external')}</a>`).join('')}${person.refs.length > referenceLimit ? `<button class="more-references" id="more-references">Show more passages (${person.refs.length-referenceLimit} remaining)</button>` : ''}${referenceLinks.some(ref=>ref.provenance === 'indexed-name') ? '<p class="reference-caveat">Name references may include descendants or a group bearing the same name. Read the passage in context.</p>' : ''}</div>
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
    $$('#inspector [data-relative]').forEach(button=>button.addEventListener('click',()=>explorePerson(button.dataset.relative)));
    $('#focus-person').addEventListener('click',()=>explorePerson(person.id));
    $('#back-to-path')?.addEventListener('click',renderPathInspector);
    $$('#inspector [data-path-endpoint]').forEach(button=>button.addEventListener('click',()=>{pickPathPerson(button.dataset.pathEndpoint,person.id);$('#path-finder').scrollIntoView({block:'nearest',behavior:'smooth'});toast(`${person.name} selected as ${button.dataset.pathEndpoint === 'from' ? 'the start' : 'the destination'}`);}));
    $('#more-references')?.addEventListener('click',()=>{const top=$('#inspector').scrollTop;renderInspector(person,referenceLimit+12);$('#inspector').scrollTop=top;});
  }

  function explorePerson(id, depth) {
    const person = personById.get(id);
    if (!person) return;
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

  function setView(view) {
    clearTimeout(zoomTimer);
    state.view = view;
    $('#map-view').hidden = view !== 'map'; $('#index-view').hidden = view !== 'index';
    $('.layout-picker').hidden = view !== 'map';
    $('#path-finder').hidden = view !== 'map';
    $('#reader-view').hidden = view !== 'reader'; $('#cities-view').hidden = view !== 'cities';
    $('#people-testament-filters').hidden = !['map','index'].includes(view);
    $('#return-to-library').hidden = !returnToLibrary || !['map','index'].includes(view);
    const titles={map:['One story. Many connections.','Explore the people of the Bible, one relationship at a time.'],index:['Every life has a story.','Find a name, follow a family, and discover its place in Scripture.'],reader:['The words behind the story.','Read both testaments. Follow the people and cities within the verses.'],cities:['Places that hold a story.','Explore biblical cities and the passages that bring them to life.']};
    $('.intro h1').textContent=titles[view][0];$('.intro p').textContent=titles[view][1];
    $('.breadcrumb strong').textContent={map:'People & connections',index:'People index',reader:'Bible reader',cities:'Cities explorer'}[view];
    $$('.nav-item').forEach(button=>{const active = button.dataset.view === view;button.classList.toggle('active',active);button.setAttribute('aria-current',active ? 'page' : 'false');});
    if (view === 'index') renderIndex();
    if (view === 'reader') ensureReader();
    if (view === 'cities') ensureCities();
    closeSidebar();
  }

  function loadJson(file) {return fetch(file).then(response=>{if(!response.ok)throw new Error(`Could not load ${file}`);return response.json();});}
  function loadPlaces() {if(!placesPromise)placesPromise=loadJson('places-data.json').catch(error=>{placesPromise=null;throw error;});return placesPromise;}
  function loadScripture() {if(!scripturePromise)scripturePromise=loadJson('bible-data.json').catch(error=>{scripturePromise=null;throw error;});return scripturePromise;}
  function libraryError(container,retry) {container.innerHTML='<div class="library-empty"><h2>This collection could not load.</h2><p>Check your connection, then try again.</p><button class="solid-button library-retry">Try again</button></div>';container.querySelector('button').addEventListener('click',retry);}
  let readerLoading=null,citiesLoading=null;
  function readPendingPassage() {if(reader&&pendingPassage){const ref=pendingPassage;pendingPassage=null;if(!reader.open(ref))toast('This reference could not be located in the reader.');}}
  function showPendingCity() {if(cities&&pendingCity){const id=pendingCity;pendingCity=null;cities.open(id);}}
  function ensureReader() {
    if(reader){readPendingPassage();return Promise.resolve(reader);}
    if(readerLoading)return readerLoading;
    $('#reader-view').innerHTML='<div class="library-loading" role="status">Opening the complete World English Bible…</div>';
    readerLoading=Promise.all([loadScripture(),loadPlaces()]).then(([text,places])=>{
      const model=new window.BibleScripture(text,window.BIBLE_DATA,places);
      reader=new window.BibleReader($('#reader-view'),model,window.BIBLE_DATA,places,{onPerson:id=>openLibraryPerson(id,'reader'),onPlace:openCity});
      readPendingPassage();
      return reader;
    }).catch(()=>{libraryError($('#reader-view'),ensureReader);return null;}).finally(()=>{readerLoading=null;});
    return readerLoading;
  }
  function ensureCities() {
    if(cities){showPendingCity();return Promise.resolve(cities);}
    if(citiesLoading)return citiesLoading;
    $('#cities-view').innerHTML='<div class="library-loading" role="status">Opening the cities collection…</div>';
    citiesLoading=loadPlaces().then(places=>{cities=new window.BibleCities($('#cities-view'),places,window.BIBLE_DATA,{onPerson:id=>openLibraryPerson(id,'cities'),onPassage:openPassage});showPendingCity();return cities;}).catch(()=>{libraryError($('#cities-view'),ensureCities);return null;}).finally(()=>{citiesLoading=null;});
    return citiesLoading;
  }
  function openPassage(reference) {pendingPassage=reference;setView('reader');}
  function openCity(id) {pendingCity=id;setView('cities');}
  function openLibraryPerson(id,origin) {returnToLibrary=origin;$('#return-to-library').textContent=origin==='reader'?'← Back to the Bible reader':'← Back to the city';explorePerson(id);}

  function renderIndex() {
    const matches = matchingPeople($('#index-search').value);
    const totalPages = Math.max(1,Math.ceil(matches.length/INDEX_PAGE_SIZE));
    state.indexPage = Math.min(state.indexPage,totalPages);
    const start = (state.indexPage-1)*INDEX_PAGE_SIZE, page = matches.slice(start,start+INDEX_PAGE_SIZE);
    $('#index-result-count').textContent = matches.length ? `${(start+1).toLocaleString()}–${Math.min(start+INDEX_PAGE_SIZE,matches.length).toLocaleString()} of ${matches.length.toLocaleString()} people` : '0 people';
    $('#index-grid').innerHTML = page.map(person=>`<button class="person-card" data-person="${escape(person.id)}"><span class="avatar ${person.gender}">${escape(person.name[0])}</span><span class="person-card-copy"><strong>${escape(person.name)}</strong><small>${identityContext(person,'<br>')}</small></span>${icon('arrow')}</button>`).join('');
    $('#index-empty').hidden = matches.length > 0;
    $('#index-pagination').hidden = totalPages <= 1;
    $('#index-page').textContent = `Page ${state.indexPage} of ${totalPages}`;
    $('#index-previous').disabled = state.indexPage === 1;
    $('#index-next').disabled = state.indexPage === totalPages;
    $$('#index-grid [data-person]').forEach(button=>button.addEventListener('click',()=>explorePerson(button.dataset.person)));
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
  }
  function renderSearch() {
    const query = $('#global-search').value.trim();
    const matches = query ? matchingPeople(query,'all') : ['adam','abraham','sarah','jacob','moses','david','mary','jesus'].map(id=>personById.get(id)).filter(Boolean);
    $('#search-heading').textContent = query ? `${matches.length.toLocaleString()} ${matches.length === 1 ? 'PERSON' : 'PEOPLE'} FOUND${matches.length>50 ? ' · FIRST 50 SHOWN — REFINE YOUR SEARCH' : ''}` : 'START WITH A FAMILIAR NAME';
    $('#search-results').innerHTML = matches.length ? matches.slice(0,50).map(person=>`<button class="search-result" data-person="${escape(person.id)}"><span class="search-initial ${person.gender}">${escape(person.name[0])}</span><span><strong>${escape(person.name)}</strong><small>${identityContext(person)}</small></span>${icon('arrow')}</button>`).join('') : '<div class="search-empty">No matching people. Try another spelling or search the people index.</div>';
    $$('#search-results [data-person]').forEach(button=>button.addEventListener('click',()=>{$('#search-dialog').close();if(searchTarget){pickPathPerson(searchTarget,button.dataset.person);searchTarget=null;}else explorePerson(button.dataset.person);}));
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
      <h3>Read Scripture and explore its cities</h3><p><strong>Bible reader</strong> contains both testaments in the public-domain World English Bible. Browse books and chapters or search words, phrases and references. Underlined names open a family map or city profile. Dotted names offer possible identities rather than choosing one for you. Your reading position is kept when you follow a link.</p><p><strong>Cities explorer</strong> provides an alphabetical, searchable collection of settlements. Filter by testament or book, read the indexed passages, and follow people indexed in those passages. Shared references do not by themselves establish that a person lived in that city.</p>
      <h3>Connect two people</h3><p>Use <strong>How are they connected?</strong> to choose a start and destination, then select <strong>Find connection</strong>. The gold route remains highlighted while you zoom, pan, or switch layouts. The side panel lists every connection with its source; select a step to locate that person.</p><p>The finder prefers a parent-to-child route when one exists, then searches other family connections. Bible-cited connections are the default. Uncheck that option to include STEP Bible’s indexed links, which are clearly labeled. A missing route means the collection has no recorded path under those settings.</p>
      <h3>Three ways to see the same people</h3><ul><li><strong>Constellation</strong> spreads a family into an organic network.</li><li><strong>Family tree</strong> arranges parents above their children.</li><li><strong>Ancestry rings</strong> places your starting person at the center, with each ring one family connection farther away. Spouses and descendants can appear alongside ancestors.</li></ul>
      <h3>Zoom into the story</h3><p><strong>Adaptive zoom</strong> starts with immediate family. Zoom out to reveal more distant relatives, up to eight family steps away. Zoom in near a person to uncover their immediate relatives and read relationship labels. Revealed branches stay on the map until you reset or choose another family; people stay in place as branches appear.</p>
      <p>Drag to move. Scroll or pinch to zoom from 1% to 500%. The + and − buttons do the same. Fit shows everyone currently loaded; Reset view returns to your starting family. You can also choose a fixed number of family steps.</p>
      <p>Large branches show up to ${MAX_MAP_PEOPLE} people at a time. Select any person and explore their family to continue deeper. Every indexed person remains available through search, including separate family groups.</p>
      <p>Hover over a circle for a short biography and passage link. Select a person to open their profile; choose <strong>Explore their family</strong> to build a new map around them. On touchscreens, tap to open the profile.</p>
      <div class="info-fact">Solid arrows lead from parent to child. Dashed lines connect spouses. Hovering or selecting highlights that person’s links. Notes identify legal parenthood, uncertain identities, and indexed relationships that may reflect an editorial inference.</div>` : `
      <div class="eyebrow">A DEEPER LOOK AT BIBLICAL LIVES</div><h2>A growing atlas of Scripture.</h2>
      <div class="info-fact">${people.length.toLocaleString()} people · ${relationships.length.toLocaleString()} family connections · Both testaments</div>
      <p>${escape(meta?.coverage || 'This is an initial curated collection, not yet an exhaustive index of every person in the Bible.')}</p>
      <p>The three layouts share one searchable collection. The original profiles retain their KJV passage links. Expanded entries link to the ESV passages used by the source index. Namesakes remain distinct people.</p>
      <h3>Read each connection with its source</h3><p>Some family links cite a specific biblical passage; others cite STEP Bible’s editorial relationship index. An indexed link is not a claim that a particular verse explicitly establishes that relationship. Notes identify uncertainty, legal parenthood, and differing accounts.</p>
      <p>Missing links indicate a gap in this map, not necessarily in Scripture. Anonymous bridge identities, group identities, and unsupported genealogical harmonizations are excluded. This is a broad index of the 66-book Protestant canon, with further editorial review still possible.</p>
      <h3>Sources & attribution</h3>${(meta.sources || []).map(source=>`<p><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.name)}</a>${source.license ? ` · ${escape(source.license)}` : ''}${source.credit ? `<br>${escape(source.credit)}` : ''}</p>`).join('')}
      <p>The complete reader uses the <a href="https://ebible.org/engwebp/" target="_blank" rel="noopener noreferrer">World English Bible</a>, public domain, from eBible.org. Cities combine STEP name references with <a href="https://www.openbible.info/geo/" target="_blank" rel="noopener noreferrer">OpenBible.info</a> settlement classifications, CC BY 4.0.</p>
      <p><a href="data-notes.html" target="_blank" rel="noopener noreferrer">Full data credits, scope, and editorial changes ↗</a></p>`;
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
  $$('.layout-option').forEach(button=>button.addEventListener('click',()=>{state.layout=button.dataset.layout;renderGraph();}));
  $$('.nav-item').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
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
    if(event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')){event.preventDefault();openSearch();}
    if(event.key==='Escape'){hideTooltip();closeSidebar();if($('#map-view').classList.contains('expanded')){$('#map-view').classList.remove('expanded');$('#map-fullscreen').setAttribute('aria-label','Expand map');requestAnimationFrame(()=>graph.fit());}}
  });
  window.addEventListener('resize',()=>{hideTooltip();syncSidebarAccess();});
  $('#count-all').textContent=people.length.toLocaleString();$('#count-ot').textContent=people.filter(p=>discovery.allows(p,'OT')).length.toLocaleString();$('#count-nt').textContent=people.filter(p=>discovery.allows(p,'NT')).length.toLocaleString();
  $('#index-count').textContent=people.length.toLocaleString();$('#coverage-summary').textContent=`${people.length.toLocaleString()} people · Expanded edition`;
  setTestamentState('all');syncSidebarAccess();renderPathPickers();renderGraph();
})();
