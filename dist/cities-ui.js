/* BiblePath city browser. Shared passage references describe an index match,
   never an inferred journey, residence, or relationship. */
(() => {
  'use strict';
  let instanceCount = 0;
  const PAGE_SIZE = 24;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const t=(s,p)=>window.BibleI18n?.t(s,p)??String(s).replace(/\{(\w+)\}/g,(match,key)=>p?.[key]??match);
  const tr=(s,p)=>escape(t(s,p));
  const language=()=>window.BibleI18n?.language||'en';
  const number=value=>Number(value).toLocaleString(language());
  const reference=value=>window.BibleI18n?.reference(String(value??''))||String(value??'');
  const displayBook=value=>reference(`${value} 1:1`).replace(/\s+1:1$/,'');
  const normalize = value => String(value ?? '').toLocaleLowerCase('en').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const safeUrl = value => {
    try { const url = new URL(String(value)); return ['https:','http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  const plural = (count, singular, multiple = `${singular}s`) => t(`{count} ${count === 1 ? singular : multiple}`,{count:number(count)});
  const bookOf = label => String(label || '').match(/^(.+?)\s+\d+(?::\d+)?(?:\D.*)?$/)?.[1] || '';
  // Deliberately exclude chapter-wide and range references. A person indexed
  // somewhere in a range is not necessarily indexed in every verse in it.
  const verseKey = label => {
    const match = String(label || '').trim().match(/^(.+?)\s+(\d+):(\d+)$/);
    return match ? `${normalize(match[1]).replace(/^psalm$/,'psalms')} ${Number(match[2])}:${Number(match[3])}` : null;
  };
  const icon = name => {
    const paths = {
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
      back:'<path d="M19 12H5m5-5-5 5 5 5"/>',
      book:'<path d="M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
      external:'<path d="M14 3h7v7m-1-6L10 14m0-10H4v16h16v-6"/>',
      city:'<path d="M3 21h18M5 21V9h6v12m0-16h8v16M5 9V6m14-1V3M8 12v2m7-6v2m0 4v2m0 5v-2m-7-2v4"/>',
      people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-3-5"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.city}</svg>`;
  };

  class BibleCities {
    constructor(container, placesData, peopleData, callbacks = {}) {
      if (!container?.addEventListener) throw new TypeError('BibleCities requires a container element.');
      container._bibleCities?.destroy();
      this.container = container;
      container._bibleCities=this;
      this.listeners=[];
      this.callbacks = callbacks;
      this.uid = `city-browser-${++instanceCount}`;
      this.meta = placesData?.meta || {};
      this.people = Array.isArray(peopleData) ? peopleData : peopleData?.people || [];
      this.state = {view:'index', cityId:null, query:'', testament:'all', book:'all', sort:'name', page:1};
      this.places = [];
      this.byId = new Map();
      this.byVerse = null;
      this.peopleLimit = 12;
      this.referenceLimit = 24;
      const sourcePlaces = Array.isArray(placesData) ? placesData : placesData?.places || [];
      for (const place of sourcePlaces) {
        if (!place?.id || !place.name || this.byId.has(String(place.id))) continue;
        const seenRefs = new Set();
        const refs = (Array.isArray(place.refs) ? place.refs : []).filter(ref => {
          if (!ref?.label || seenRefs.has(String(ref.label))) return false;
          seenRefs.add(String(ref.label)); return true;
        }).map(ref => ({...ref, label:String(ref.label), url:safeUrl(ref.url)}));
        const record = {...place, id:String(place.id), name:String(place.name), refs,
          aliases:(Array.isArray(place.aliases) ? place.aliases : []).map(String),
          displayAliases:(Array.isArray(place.displayAliases) ? place.displayAliases : Array.isArray(place.aliases) ? place.aliases : []).map(String),
          testaments:(Array.isArray(place.testaments) ? place.testaments : []).filter(value => value === 'OT' || value === 'NT')};
        record.books = new Set(refs.map(ref => bookOf(ref.label)).filter(Boolean));
        record.searchText = normalize([record.name,...record.aliases,record.description,...refs.flatMap(ref => [ref.label,reference(ref.label)])].join(' '));
        this.places.push(record); this.byId.set(record.id,record);
      }
      this.places.sort((a,b) => a.name.localeCompare(b.name,language()) || a.id.localeCompare(b.id));
      this.books = [...new Set(this.places.flatMap(place => [...place.books]))].sort((a,b) => displayBook(a).localeCompare(displayBook(b),language()));
      this.container.classList.add('city-browser');
      this.listen('click', event => this.handleClick(event));
      this.listen('input', event => {
        if (event.target.matches('[data-city-search]')) {
          this.state.query = event.target.value; this.state.page = 1; this.renderResults();
        }
      });
      this.listen('change', event => {
        if (event.target.matches('[data-city-book]')) this.state.book = event.target.value;
        else if (event.target.matches('[data-city-sort]')) this.state.sort = event.target.value;
        else return;
        this.state.page = 1; this.renderResults();
      });
      this.renderIndex();
    }
    listen(type,handler){this.listeners.push([type,handler]);this.container.addEventListener(type,handler);}
    destroy(){for(const [type,handler] of this.listeners)this.container.removeEventListener(type,handler);this.listeners=[];if(this.container._bibleCities===this)delete this.container._bibleCities;}

    matchingPlaces() {
      const terms = normalize(this.state.query).split(' ').filter(Boolean);
      const places = this.places.filter(place =>
        (this.state.testament === 'all' || place.testaments.includes(this.state.testament)) &&
        (this.state.book === 'all' || place.books.has(this.state.book)) &&
        terms.every(term => place.searchText.includes(term)));
      return this.state.sort === 'references'
        ? places.sort((a,b) => b.refs.length-a.refs.length || a.name.localeCompare(b.name,language()) || a.id.localeCompare(b.id))
        : places;
    }

    testamentBadges(place) {
      return place.testaments.map(testament => `<span class="city-badge city-badge-${testament.toLowerCase()}">${tr(testament === 'OT' ? 'Old Testament' : 'New Testament')}</span>`).join('');
    }

    credits() {
      const sources = (Array.isArray(this.meta.sources) ? this.meta.sources : []).map(source => {
        const url = safeUrl(source.url), licenseUrl = safeUrl(source.licenseUrl);
        const name = url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(source.name)}<span class="city-sr-only"> ${tr('(opens in a new tab)')}</span></a>` : escape(source.name);
        const license = source.license ? (licenseUrl ? `<a href="${escape(licenseUrl)}" target="_blank" rel="noopener noreferrer">${tr(source.license)}<span class="city-sr-only"> ${tr('(opens in a new tab)')}</span></a>` : tr(source.license)) : '';
        return `${name}${license ? ` (${license})` : ''}`;
      });
      return `<footer class="city-index-note">${tr(this.meta.scope || 'Every place leads back to its indexed biblical passages. Source details are included in each profile.')}${sources.length ? `<span class="city-credits">${tr('Place index adapted from')} ${sources.join(` ${tr('and')} `)}.</span>` : ''}</footer>`;
    }

    renderIndex() {
      const state = this.state;
      this.container.innerHTML = `
        <header class="city-intro">
          <div><p class="city-eyebrow">${tr('THE PLACES OF SCRIPTURE')}</p><h1>${tr('Cities & places')}</h1><p>${tr('Find a familiar name. Follow its story through Scripture.')}</p></div>
          <div class="city-index-count"><span>${number(this.places.length)}</span><p>${tr('places in the index')}${icon('city')}</p></div>
        </header>
        <section class="city-index" aria-label="${tr('Browse biblical cities and places')}">
          <div class="city-filter-bar">
            <label class="city-search" for="${this.uid}-search">${icon('search')}<span class="city-sr-only">${tr('Search cities, aliases, or references')}</span><input id="${this.uid}-search" data-city-search type="search" placeholder="${tr('Search a city, alias, or passage…')}" value="${escape(state.query)}" autocomplete="off"></label>
            <div class="city-testaments" role="group" aria-label="${tr('Testament')}">
              ${[['all','All places'],['OT','Old Testament'],['NT','New Testament']].map(([value,label]) => `<button type="button" data-city-action="testament" data-city-value="${value}" aria-pressed="${state.testament === value}">${tr(label)}</button>`).join('')}
            </div>
          </div>
          <div class="city-results-bar">
            <p data-city-status role="status" aria-live="polite" aria-atomic="true"></p>
            <div class="city-selects"><label>${tr('Book')}<select data-city-book aria-label="${tr('Filter places by Bible book')}"><option value="all">${tr('All books')}</option>${this.books.map(book => `<option value="${escape(book)}"${state.book === book ? ' selected' : ''}>${escape(displayBook(book))}</option>`).join('')}</select></label><label>${tr('Sort')}<select data-city-sort aria-label="${tr('Sort places')}"><option value="name"${state.sort === 'name' ? ' selected' : ''}>${tr('Name A–Z')}</option><option value="references"${state.sort === 'references' ? ' selected' : ''}>${tr('Most references')}</option></select></label><button type="button" class="city-clear" data-city-action="clear" data-city-clear>${tr('Clear filters')}</button></div>
          </div>
          <div data-city-results></div>
          ${this.credits()}
        </section>`;
      this.renderResults();
    }

    renderResults() {
      const results = this.container.querySelector('[data-city-results]');
      if (!results) return;
      const places = this.matchingPlaces(), pages = Math.max(1,Math.ceil(places.length/PAGE_SIZE));
      this.state.page = Math.max(1,Math.min(this.state.page,pages));
      const offset = (this.state.page-1)*PAGE_SIZE, shown = places.slice(offset,offset+PAGE_SIZE);
      const status = this.container.querySelector('[data-city-status]');
      if (status) status.textContent = places.length ? `${plural(places.length,'place')} · ${t('Showing {start}–{end}',{start:number(offset+1),end:number(offset+shown.length)})}` : t('No places match these filters');
      const clear = this.container.querySelector('[data-city-clear]');
      if (clear) clear.hidden = !this.state.query && this.state.testament === 'all' && this.state.book === 'all';
      this.container.querySelectorAll('[data-city-action="testament"]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.cityValue === this.state.testament)));
      results.innerHTML = shown.length ? `<div class="city-grid">${shown.map(place => this.card(place)).join('')}</div>${pages > 1 ? this.pagination(pages) : ''}` : `<div class="city-empty">${icon('search')}<h2>${tr('No places found')}</h2><p>${tr('Try another name or passage, or broaden the filters.')}</p><button type="button" class="city-primary" data-city-action="clear">${tr('Clear filters')}</button></div>`;
    }

    card(place) {
      return `<article class="city-card">
        <div class="city-card-top"><span class="city-card-symbol" aria-hidden="true">${icon('city')}</span><span class="city-card-count">${escape(plural(place.refs.length,'reference'))}</span></div>
        <h2><button type="button" class="city-card-open" data-city-action="open" data-city-id="${escape(place.id)}">${escape(place.name)}<span class="city-sr-only"> — ${tr('view place')}</span></button></h2>
        <p class="city-card-alias">${place.displayAliases.length ? tr('Also {aliases}',{aliases:place.displayAliases.join(', ')}) : escape(place.disambiguation || reference(place.refs[0]?.label) || t('Biblical place index'))}</p>
        <p class="city-card-description">${tr(place.description || 'Explore the passages in which this place is indexed.')}</p>
        <div class="city-card-bottom"><div class="city-badges">${this.testamentBadges(place)}</div><span class="city-card-arrow" aria-hidden="true">${icon('arrow')}</span></div>
      </article>`;
    }

    pagination(pages) {
      const current = this.state.page;
      const pageNumbers = [...new Set([1,current-1,current,current+1,pages])].filter(page => page >= 1 && page <= pages).sort((a,b) => a-b);
      let previous = 0;
      const buttons = pageNumbers.map(page => {
        const gap = page-previous > 1 ? '<span class="city-page-gap" aria-hidden="true">…</span>' : '';
        previous = page;
        return `${gap}<button type="button" data-city-action="page" data-city-page="${page}" aria-label="${tr('Page {page}',{page})}"${page === current ? ' aria-current="page"' : ''}>${page}</button>`;
      }).join('');
      return `<nav class="city-pagination" aria-label="${tr('Place index pages')}"><button type="button" class="city-page-direction" data-city-action="page" data-city-page="${current-1}"${current === 1 ? ' disabled' : ''}>${icon('back')}<span>${tr('Previous')}</span></button><div>${buttons}</div><button type="button" class="city-page-direction" data-city-action="page" data-city-page="${current+1}"${current === pages ? ' disabled' : ''}><span>${tr('Next')}</span>${icon('arrow')}</button></nav>`;
    }

    indexPeople() {
      if (this.byVerse) return;
      this.byVerse = new Map();
      for (const person of this.people) {
        if (!person?.id || !person.name) continue;
        const refs = [...(Array.isArray(person.allReferences) ? person.allReferences : []),...(Array.isArray(person.refs) ? person.refs : [])];
        const keys = new Set(refs.map(ref => verseKey(typeof ref === 'string' ? ref : ref?.label)).filter(Boolean));
        for (const key of keys) {
          if (!this.byVerse.has(key)) this.byVerse.set(key,[]);
          this.byVerse.get(key).push(person);
        }
      }
    }

    peopleFor(place) {
      this.indexPeople();
      const matches = new Map();
      for (const ref of place.refs) {
        const key = verseKey(ref.label);
        if (!key) continue;
        for (const person of this.byVerse.get(key) || []) {
          if (!matches.has(person.id)) matches.set(person.id,{person,refs:[]});
          const match = matches.get(person.id);
          if (!match.refs.includes(ref.label)) match.refs.push(ref.label);
        }
      }
      return [...matches.values()].sort((a,b) => b.refs.length-a.refs.length || a.person.name.localeCompare(b.person.name,language()) || String(a.person.id).localeCompare(String(b.person.id)));
    }

    open(id) {
      const place = this.byId.get(String(id));
      if (!place) return false;
      this.state.view = 'detail'; this.state.cityId = place.id;
      this.peopleLimit = 12; this.referenceLimit = 24;
      this.relatedPeople = this.peopleFor(place);
      this.renderDetail();
      this.focusHeading();
      return true;
    }

    showIndex() {
      const previousId = this.state.cityId;
      this.state.view = 'index'; this.state.cityId = null;
      this.renderIndex();
      const previousButton = [...this.container.querySelectorAll('[data-city-action="open"]')].find(button => button.dataset.cityId === previousId);
      previousButton?.focus({preventScroll:true});
      previousButton?.scrollIntoView?.({block:'nearest',behavior:'auto'});
      return this;
    }

    focusHeading() {
      this.container.querySelector('.city-detail-title')?.focus({preventScroll:true});
      this.container.scrollIntoView?.({block:'start',behavior:'auto'});
    }

    renderDetail() {
      const place = this.byId.get(this.state.cityId);
      if (!place) return;
      const sourceUrl = safeUrl(place.source?.url), sourceName = place.source?.name || t('Place index');
      this.container.innerHTML = `
        <button type="button" class="city-back" data-city-action="index">${icon('back')}${tr('Back to cities & places')}</button>
        <header class="city-detail-hero"><div class="city-detail-emblem" aria-hidden="true">${icon('city')}</div><div class="city-detail-heading"><p class="city-eyebrow">${tr('A PLACE IN SCRIPTURE')}</p><h1 class="city-detail-title" tabindex="-1">${escape(place.name)}</h1><div class="city-badges">${this.testamentBadges(place)}</div>${place.displayAliases.length ? `<p class="city-aliases">${tr('Also indexed as {aliases}',{aliases:place.displayAliases.join(', ')})}</p>` : ''}</div><div class="city-detail-stat"><strong>${number(place.refs.length)}</strong><span>${tr(place.refs.length === 1 ? 'indexed reference' : 'indexed references')}</span></div></header>
        <div class="city-detail-layout"><div class="city-detail-main">
          <section class="city-description-panel" aria-label="${tr('About this place')}"><p>${tr(place.description || 'This place appears in the biblical passages listed below. Read each passage for its context.')}</p>${(Array.isArray(place.notes) ? place.notes : []).map(note => `<p class="city-place-note">${tr(note)}</p>`).join('')}<div class="city-source"><span>${tr('PLACE INDEX SOURCE')}</span>${sourceUrl ? `<a href="${escape(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(sourceName)}${icon('external')}<span class="city-sr-only"> ${tr('(opens in a new tab)')}</span></a>` : `<strong>${escape(sourceName)}</strong>`}</div></section>
          <section class="city-passages" aria-labelledby="${this.uid}-passages"><div class="city-section-heading"><div>${icon('book')}<h2 id="${this.uid}-passages">${tr('In Scripture')}</h2></div><span>${escape(plural(place.books.size,'book'))}</span></div><p class="city-section-note">${tr('Open a passage to read this place in context.')}</p><div data-city-passages>${this.referenceList(place)}</div></section>
        </div><aside class="city-people-panel" aria-labelledby="${this.uid}-people"><div class="city-section-heading"><div>${icon('people')}<h2 id="${this.uid}-people">${tr('People indexed in these passages')}</h2></div></div><p class="city-section-note">${tr('Names with an exact verse match in the people index. Sharing a passage does not establish a person’s residence or visit.')}</p><div data-city-people>${this.peopleList()}</div></aside></div>${this.credits()}`;
    }

    referenceList(place) {
      if (!place.refs.length) return `<p class="city-no-matches">${tr('No biblical references have been included for this place yet.')}</p>`;
      const groups = new Map();
      place.refs.slice(0,this.referenceLimit).forEach((ref,index) => {
        const book = bookOf(ref.label) || 'References';
        if (!groups.has(book)) groups.set(book,[]);
        groups.get(book).push({ref,index});
      });
      const links = [...groups].map(([book,refs]) => `<div class="city-reference-group"><h3>${escape(book === 'References'?t('References'):displayBook(book))}</h3><div>${refs.map(({ref,index}) => {
        const label = `${escape(reference(ref.label))}${icon(typeof this.callbacks.onPassage === 'function' ? 'arrow' : 'external')}`;
        if (typeof this.callbacks.onPassage === 'function') return `<button type="button" class="city-verse" data-city-action="passage" data-city-ref="${index}">${label}</button>`;
        return ref.url ? `<a class="city-verse" href="${escape(ref.url)}" target="_blank" rel="noopener noreferrer">${label}<span class="city-sr-only"> ${tr('(opens in a new tab)')}</span></a>` : `<span class="city-verse">${escape(reference(ref.label))}</span>`;
      }).join('')}</div></div>`).join('');
      const remaining = place.refs.length-this.referenceLimit;
      return `${links}${remaining > 0 ? `<button type="button" class="city-more" data-city-action="references-more">${tr('Show {count} more references',{count:Math.min(24,remaining)})}<span>${tr('{count} remaining',{count:number(remaining)})}</span></button>` : ''}`;
    }

    peopleList() {
      const people = this.relatedPeople || [], remaining = people.length-this.peopleLimit;
      if (!people.length) return `<div class="city-no-matches">${tr('No exact verse matches in the current people index. The passages may mention other people.')}</div>`;
      return `<p class="city-people-count">${tr(people.length===1?'{count} person with shared references':'{count} people with shared references',{count:number(people.length)})}</p><div class="city-people-list">${people.slice(0,this.peopleLimit).map(({person,refs}) => `<button type="button" class="city-person" data-city-action="person" data-city-person="${escape(person.id)}"${typeof this.callbacks.onPerson !== 'function' ? ' disabled' : ''}><span class="city-person-initial" aria-hidden="true">${escape(String(person.name).slice(0,1))}</span><span class="city-person-copy"><strong>${escape(person.name)}</strong>${person.disambiguation ? `<span class="city-person-identity">${escape(person.disambiguation)}</span>` : ''}<small>${escape(refs.slice(0,2).map(reference).join(' · '))}${refs.length > 2 ? ` · +${refs.length-2}` : ''}</small></span>${icon('arrow')}</button>`).join('')}</div>${remaining > 0 ? `<button type="button" class="city-more" data-city-action="people-more">${tr('Show {count} more people',{count:Math.min(12,remaining)})}<span>${tr('{count} remaining',{count:number(remaining)})}</span></button>` : ''}`;
    }

    handleClick(event) {
      const button = event.target.closest?.('[data-city-action]');
      if (!button || !this.container.contains(button) || button.disabled) return;
      const action = button.dataset.cityAction;
      if (action === 'open') this.open(button.dataset.cityId);
      else if (action === 'index') this.showIndex();
      else if (action === 'testament') {
        this.state.testament = button.dataset.cityValue; this.state.page = 1; this.renderResults();
      } else if (action === 'clear') {
        Object.assign(this.state,{query:'',testament:'all',book:'all',page:1});
        this.renderIndex(); this.container.querySelector('[data-city-search]')?.focus();
      } else if (action === 'page') {
        this.state.page = Number(button.dataset.cityPage) || 1; this.renderResults();
        this.container.querySelector('[data-city-action="open"]')?.focus({preventScroll:true});
        this.container.querySelector('[data-city-results]')?.scrollIntoView?.({block:'start',behavior:'auto'});
      } else if (action === 'passage') {
        const ref = this.byId.get(this.state.cityId)?.refs[Number(button.dataset.cityRef)];
        if (ref && typeof this.callbacks.onPassage === 'function') this.callbacks.onPassage(ref.label);
      } else if (action === 'person' && typeof this.callbacks.onPerson === 'function') this.callbacks.onPerson(button.dataset.cityPerson);
      else if (action === 'people-more') {
        this.peopleLimit += 12;
        const list = this.container.querySelector('[data-city-people]');
        const previousCount = this.peopleLimit-12;
        list.innerHTML = this.peopleList();
        list.querySelectorAll('[data-city-action="person"]')[previousCount]?.focus({preventScroll:true});
      } else if (action === 'references-more') {
        const previousCount = this.referenceLimit; this.referenceLimit += 24;
        const list = this.container.querySelector('[data-city-passages]');
        list.innerHTML = this.referenceList(this.byId.get(this.state.cityId));
        list.querySelectorAll('.city-verse')[previousCount]?.focus({preventScroll:true});
      }
    }

    getState() {
      return {...this.state,peopleLimit:this.peopleLimit,referenceLimit:this.referenceLimit,totalPlaces:this.places.length,resultCount:this.matchingPlaces().length,
        peopleCount:this.state.view === 'detail' ? this.relatedPeople?.length || 0 : 0,
        peopleShown:this.state.view === 'detail' ? Math.min(this.peopleLimit,this.relatedPeople?.length || 0) : 0};
    }
    setState(state={}) {
      this.state={view:'index',cityId:null,query:String(state.query??''),testament:['OT','NT'].includes(state.testament)?state.testament:'all',book:this.books.includes(state.book)?state.book:'all',sort:state.sort==='references'?'references':'name',page:Math.max(1,Math.floor(Number(state.page)||1))};
      if(state.view==='detail'&&this.byId.has(state.cityId)) {
        this.state.view='detail';this.state.cityId=state.cityId;
        this.peopleLimit=Math.max(12,Number(state.peopleLimit)||12);this.referenceLimit=Math.max(24,Number(state.referenceLimit)||24);
        this.relatedPeople=this.peopleFor(this.byId.get(state.cityId));this.renderDetail();
      } else this.renderIndex();
      return this;
    }
  }
  window.BibleCities = BibleCities;
})();
