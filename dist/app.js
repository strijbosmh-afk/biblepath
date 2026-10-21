(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = text => String(text ?? '').replace(/[&<>"']/g, value => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const {people, relationships, meta} = window.BIBLE_DATA;
  const personById = new Map(people.map(person => [person.id, person]));
  const state = {layout:'constellation', focus:'abraham', selected:'abraham', depth:2, testament:'all', spouses:true, view:'map'};
  const graph = new window.BibleGraph($('#graph'), {
    onSelect: person => {state.selected = person.id; renderInspector(person); hideTooltip();},
    onHover: showTooltip,
    onLeave: delayHideTooltip,
    onZoom: scale => {$('#zoom-level').textContent = `${Math.round(scale * 100)}%`;}
  });
  // Exposed read-only snapshots help verify navigation and graph behavior.
  window.biblePath = {getState:() => ({...state, graph:graph.getState(), peopleCount:people.length, relationshipCount:relationships.length})};
  let tooltipTimer, toastTimer, currentTooltipId;
  const normalize = text => text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const searchable = new Map(people.map(p => [p.id, normalize([p.name,...(p.aliases || []),p.description,p.era,...p.refs.map(r=>r.label)].join(' '))]));

  function matchingPeople(query = '', testament = state.testament) {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    return people.filter(p => (testament === 'all' || p.testament === testament) && terms.every(term => searchable.get(p.id).includes(term)))
      .sort((a,b) => {
        const term = normalize(query.trim());
        const score = p => !term ? 2 : normalize(p.name) === term ? 0 : normalize(p.name).startsWith(term) ? 1 : 2;
        return score(a) - score(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      });
  }

  function visiblePeople() {
    const allowed = new Set(people.filter(p => state.testament === 'all' || p.testament === state.testament).map(p=>p.id));
    if (state.depth === 'all') return people.filter(p=>allowed.has(p.id));
    const distances = new Map([[state.focus,0]]), queue = [state.focus];
    const adjacency = new Map(people.map(p=>[p.id,[]]));
    relationships.forEach(r => {
      if (r.type === 'spouse' && !state.spouses) return;
      adjacency.get(r.source).push(r.target); adjacency.get(r.target).push(r.source);
    });
    for (let i=0;i<queue.length;i++) {
      const id = queue[i], distance = distances.get(id);
      if (distance >= state.depth) continue;
      for (const next of adjacency.get(id) || []) if (!distances.has(next)) {distances.set(next,distance+1);queue.push(next);}
    }
    return people.filter(p => allowed.has(p.id) && distances.has(p.id));
  }

  function renderGraph() {
    hideTooltip();
    const visible = visiblePeople(), visibleIds = new Set(visible.map(p=>p.id));
    const edges = relationships.filter(r => visibleIds.has(r.source) && visibleIds.has(r.target) && (state.spouses || r.type !== 'spouse'));
    state.selected = state.focus;
    graph.setData(visible, edges, {layout:state.layout,focusId:state.focus});
    $('#map-empty').hidden = visible.length > 0;
    $('#visible-count').textContent = `${visible.length} people`;
    $('#map-title').textContent = state.depth === 'all' ? (state.testament === 'all' ? 'The whole collection' : state.testament === 'OT' ? 'Old Testament people' : 'New Testament people') : `${personById.get(state.focus).name}’s connections`;
    renderInspector(personById.get(state.selected));
    $$('.layout-option').forEach(button => {const active = button.dataset.layout === state.layout;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const captions = {constellation:['LIVES INTERWOVEN','Follow a name. Find a story.'],lineage:['FROM GENERATION TO GENERATION','Parents above. Children below.'],radial:['ONE LIFE, MANY CONNECTIONS','Each ring is one relationship away.']};
    const caption = captions[state.layout];
    $('#layout-caption').innerHTML = `${caption[0]}<small>${caption[1]}</small>`;
    $$('.journey').forEach(b=>b.classList.toggle('active',b.dataset.person === state.focus));
  }

  function familyRelations(person) {
    const direct = relationships.filter(r=>r.source === person.id || r.target === person.id);
    return {
      parents:direct.filter(r=>r.type === 'parent' && r.target === person.id).map(r=>({person:personById.get(r.source),edge:r})),
      spouses:direct.filter(r=>r.type === 'spouse').map(r=>({person:personById.get(r.source === person.id ? r.target : r.source),edge:r})),
      children:direct.filter(r=>r.type === 'parent' && r.source === person.id).map(r=>({person:personById.get(r.target),edge:r})),
      direct
    };
  }

  function renderInspector(person) {
    if (!person) return;
    const family = familyRelations(person);
    const relativeButtons = items => items.map(({person:p,edge})=>`<button data-relative="${escape(p.id)}" title="${escape(edge.note || edge.ref.label)}">${escape(p.name)}${edge.note ? ' *' : ''}</button>`).join('');
    const notes = [...new Set(family.direct.filter(r=>r.note).map(r=>r.note))];
    $('#inspector').innerHTML = `
      <div class="profile-topline"><span>A LIFE IN SCRIPTURE</span>${icon('book')}</div>
      <div class="profile-hero"><div class="profile-initial ${person.gender}">${escape(person.name[0])}</div><div><h2>${escape(person.name)}</h2><div class="era">${escape(person.era)}</div></div></div>
      ${person.aliases?.length ? `<div class="profile-alias">Also known as ${person.aliases.map(escape).join(', ')}</div>` : ''}
      <div class="profile-tags"><span>${person.testament === 'OT' ? 'Old Testament' : 'New Testament'}</span><span>${person.gender === 'female' ? 'Woman' : 'Man'}</span></div>
      <p class="profile-description">${escape(person.description)}</p>
      <div class="profile-section"><h3>${icon('book')} IN THE BIBLE</h3>${person.refs.map(ref=>`<a class="reference-link" href="${escape(ref.url)}" target="_blank" rel="noopener noreferrer">${escape(ref.label)}${icon('external')}</a>`).join('')}</div>
      <div class="profile-section"><h3>${icon('tree')} FAMILY CONNECTIONS</h3>
        ${family.parents.length ? `<div class="family-row"><span class="family-label">Parents</span><div class="family-names">${relativeButtons(family.parents)}</div></div>` : ''}
        ${family.spouses.length ? `<div class="family-row"><span class="family-label">Spouse${family.spouses.length > 1 ? 's' : ''}</span><div class="family-names">${relativeButtons(family.spouses)}</div></div>` : ''}
        ${family.children.length ? `<div class="family-row"><span class="family-label">Children</span><div class="family-names">${relativeButtons(family.children)}</div></div>` : ''}
        ${!family.direct.length ? '<p class="profile-note">No parent, child, or spouse connections have been added for this person yet. See the passages above for their story.</p>' : ''}
        ${notes.map(note=>`<p class="profile-note">* ${escape(note)}</p>`).join('')}
      </div>
      <button class="focus-button" id="focus-person">${icon('map')}Explore ${escape(person.name)}’s family${icon('arrow')}</button>
      ${family.direct.length ? `<details class="relationship-sources"><summary>Sources for these relationships</summary>${family.direct.map(r=>`<a href="${escape(r.ref.url)}" target="_blank" rel="noopener noreferrer"><span>${escape(personById.get(r.source).name)} ${r.type === 'spouse' ? '&' : '→'} ${escape(personById.get(r.target).name)}</span><small>${escape(r.ref.label)} ↗</small></a>`).join('')}</details>` : ''}`;
    $$('#inspector [data-relative]').forEach(button=>button.addEventListener('click',()=>explorePerson(button.dataset.relative)));
    $('#focus-person').addEventListener('click',()=>explorePerson(person.id));
  }

  function explorePerson(id, depth) {
    const person = personById.get(id);
    if (!person) return;
    state.focus = state.selected = id;
    if (state.testament !== 'all' && state.testament !== person.testament) setTestamentState('all');
    state.depth = depth ?? (state.depth === 'all' ? 2 : state.depth);
    $('#depth-select').value = String(state.depth);
    setView('map');
    closeSidebar();
    renderGraph();
  }

  function setTestamentState(testament) {
    state.testament = testament;
    $$('.testament').forEach(button => {const active = button.dataset.testament === testament;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  }

  function setView(view) {
    state.view = view;
    $('#map-view').hidden = view !== 'map'; $('#index-view').hidden = view !== 'index';
    $('.layout-picker').hidden = view !== 'map';
    $$('.nav-item').forEach(button=>{const active = button.dataset.view === view;button.classList.toggle('active',active);button.setAttribute('aria-current',active ? 'page' : 'false');});
    if (view === 'index') renderIndex();
    closeSidebar();
  }

  function renderIndex() {
    const matches = matchingPeople($('#index-search').value);
    $('#index-grid').innerHTML = matches.map(person=>`<button class="person-card" data-person="${escape(person.id)}"><span class="avatar ${person.gender}">${escape(person.name[0])}</span><span><strong>${escape(person.name)}</strong><small>${escape(person.era)}<br>${escape(person.refs[0].label)}</small></span>${icon('arrow')}</button>`).join('');
    $('#index-empty').hidden = matches.length > 0;
    $$('#index-grid [data-person]').forEach(button=>button.addEventListener('click',()=>explorePerson(button.dataset.person)));
  }

  function showTooltip(person, point) {
    clearTimeout(tooltipTimer);
    const tooltip = $('#person-tooltip');
    if (currentTooltipId !== person.id) {
      tooltip.innerHTML = `<div class="tooltip-heading"><i class="legend-dot ${person.gender === 'female' ? 'woman' : 'man'}"></i>${escape(person.name)}</div><p>${escape(person.description)}</p><a target="_blank" rel="noopener noreferrer" href="${escape(person.refs[0].url)}">${escape(person.refs[0].label)} ↗</a><div class="tooltip-hint">Select this person to see their family & all sources</div>`;
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

  function openSearch() {
    hideTooltip();$('#search-dialog').showModal();$('#global-search').value = '';renderSearch();$('#global-search').focus();
  }
  function renderSearch() {
    const query = $('#global-search').value.trim();
    const matches = query ? matchingPeople(query,'all') : ['abraham','sarah','jacob','moses','david','mary','jesus'].map(id=>personById.get(id)).filter(Boolean);
    $('#search-heading').textContent = query ? `${matches.length} ${matches.length === 1 ? 'PERSON' : 'PEOPLE'} FOUND` : 'START WITH A FAMILIAR NAME';
    $('#search-results').innerHTML = matches.length ? matches.slice(0,50).map(person=>`<button class="search-result" data-person="${escape(person.id)}"><span class="search-initial ${person.gender}">${escape(person.name[0])}</span><span><strong>${escape(person.name)}</strong><small>${escape(person.era)} · ${escape(person.refs[0].label)}</small></span>${icon('arrow')}</button>`).join('') : '<div class="search-empty">No matching people in this initial collection.</div>';
    $$('#search-results [data-person]').forEach(button=>button.addEventListener('click',()=>{$('#search-dialog').close();explorePerson(button.dataset.person);}));
  }

  function openInfo(mode) {
    hideTooltip();
    $('#info-content').innerHTML = mode === 'help' ? `
      <div class="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</div><h2>Every life opens a story.</h2>
      <p>Start with a familiar name, then follow the connections to see how biblical families fit together.</p>
      <h3>Three ways to see the same people</h3><ul><li><strong>Constellation</strong> spreads a family into an organic network.</li><li><strong>Family tree</strong> arranges parents above their children.</li><li><strong>Ancestry rings</strong> places your starting person at the center, with each ring one family connection farther away. Spouses and descendants can appear alongside ancestors.</li></ul>
      <h3>Make the map your own</h3><p>Drag to move. Scroll or pinch to zoom from 1% to 500%. Use the + and − buttons, and the corner icon to fit everyone in view. With the map focused, arrow keys pan and + / − zoom.</p>
      <p>Hover over a circle for a short biography and passage link. Select a person to open their profile; choose <strong>Explore their family</strong> to build a new map around them. On touchscreens, tap to open the profile.</p>
      <div class="info-fact">Solid arrows lead from parent to child. Dashed lines connect spouses. The profile includes notes for legal parenthood and passages with differing genealogical accounts.</div>` : `
      <div class="eyebrow">THE FIRST CHAPTER OF BIBLEPATH</div><h2>A growing atlas of Scripture.</h2>
      <div class="info-fact">${people.length} people · ${relationships.length} sourced family connections · Both testaments</div>
      <p>${escape(meta?.coverage || 'This is an initial curated collection, not yet an exhaustive index of every person in the Bible.')}</p>
      <p>The three layouts share one collection. Descriptions are original summaries, and every person and family link has a biblical passage. Links open the King James Version on Bible Gateway.</p>
      <h3>A little care with family history</h3><p>Connections reflect the cited passages. Legal parenthood, differing accounts, and genealogical ambiguity are annotated in the profile. Spouse links may include relationships described as concubinage; notes preserve that distinction.</p>
      <p>Missing people or relationships indicate gaps in this initial collection, not an absence of biblical evidence. Scripture filters describe where a person is indexed, not every book in which their name occurs. Namesakes remain separate entries.</p>
      <h3>Built to keep growing</h3><p>The initial edition follows connected lines through Genesis, the patriarchs, the Exodus, David’s family, and the New Testament. Expanding to every named and unnamed person requires further sourcing and a clear choice of biblical canon.</p>`;
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
    setTestamentState(button.dataset.testament);
    if (state.testament !== 'all' && personById.get(state.focus).testament !== state.testament) state.focus = state.testament === 'NT' ? 'jesus' : 'abraham';
    renderGraph();if(state.view === 'index')renderIndex();
  }));
  $$('.journey').forEach(button=>button.addEventListener('click',()=>{setTestamentState('all');explorePerson(button.dataset.person,2);}));
  $('#depth-select').addEventListener('change',event=>{state.depth=event.target.value === 'all' ? 'all' : Number(event.target.value);renderGraph();});
  $('#show-spouses').addEventListener('change',event=>{state.spouses=event.target.checked;renderGraph();});
  $('#zoom-in').addEventListener('click',()=>graph.zoomBy(1.3));$('#zoom-out').addEventListener('click',()=>graph.zoomBy(1/1.3));$('#zoom-fit').addEventListener('click',()=>graph.fit());
  $('#reset-view').addEventListener('click',()=>{graph.reset();toast('Map fitted to your current selection');});
  $('#map-fullscreen').addEventListener('click',()=>{const expanded=$('#map-view').classList.toggle('expanded');$('#map-fullscreen').setAttribute('aria-label',expanded?'Exit expanded map':'Expand map');requestAnimationFrame(()=>graph.fit());});
  $('#empty-reset').addEventListener('click',()=>{setTestamentState('all');explorePerson('abraham',2);});
  $('#index-search').addEventListener('input',renderIndex);$('#search-trigger').addEventListener('click',openSearch);$('#global-search').addEventListener('input',renderSearch);
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
  $('#count-all').textContent=people.length;$('#count-ot').textContent=people.filter(p=>p.testament==='OT').length;$('#count-nt').textContent=people.filter(p=>p.testament==='NT').length;
  $('#index-count').textContent=people.length;$('#coverage-summary').textContent=`${people.length} sourced profiles · Initial edition`;
  setTestamentState('all');syncSidebarAccess();renderGraph();
})();
