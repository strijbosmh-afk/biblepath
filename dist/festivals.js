/* Curated information dossiers: religion-specific sources, calendars and practices. */
(() => {
  'use strict';
  const rows = [
    ['Festivals & rituals','Feestdagen & rituelen','Fêtes et rites'],
    ['Texts, history and lived religion.','Teksten, geschiedenis en geleefde religie.','Textes, histoire et religion vécue.'],
    ['Celebrations and practices, with their sources, historical development and internal diversity.','Vieringen en gebruiken, met hun bronnen, historische ontwikkeling en interne diversiteit.','Célébrations et pratiques, avec leurs sources, leur évolution historique et leur diversité interne.'],
    ['Religious traditions in context','Religieuze tradities in context','Les traditions religieuses en contexte'],
    ['Search festivals and rituals','Zoek feestdagen en rituelen','Rechercher des fêtes et des rites'],
    ['Name, practice or source…','Naam, gebruik of bron…','Nom, pratique ou source…'],
    ['All topics','Alle onderwerpen','Tous les sujets'],['Festivals','Feestdagen','Fêtes'],['Seasons','Periodes','Périodes'],['Rituals','Rituelen','Rites'],
    ['Festival','Feestdag','Fête'],['Season','Periode','Période'],['Ritual','Ritueel','Rite'],
    ['{count} topics','{count} onderwerpen','{count} sujets'],
    ['1 topic','1 onderwerp','1 sujet'],
    ['Choose a topic','Kies een onderwerp','Choisir un sujet'],
    ['No matching topics. Try another search or filter.','Geen passende onderwerpen. Probeer een andere zoekterm of filter.','Aucun sujet correspondant. Essayez une autre recherche ou un autre filtre.'],
    ['Calendar & rhythm','Kalender & ritme','Calendrier et rythme'],
    ['Meaning & texts','Betekenis & teksten','Sens et textes'],['Historical context','Historische context','Contexte historique'],
    ['Ritual & practice','Ritueel & praktijk','Rite et pratique'],['Diversity & interpretation','Diversiteit & interpretatie','Diversité et interprétation'],
    ['Sources & reading','Bronnen & verder lezen','Sources et lectures'],
    ['Sacred text','Heilige tekst','Texte sacré'],['Tradition & interpretation','Traditie & interpretatie','Tradition et interprétation'],['Historical & contemporary sources','Historische & hedendaagse bronnen','Sources historiques et contemporaines'],
    ['Open original source','Open oorspronkelijke bron','Ouvrir la source originale'],
    ['Read passage · Dutch Catholic Bible','Lees passage · Nederlandse katholieke Bijbel','Lire le passage · Bible catholique néerlandaise'],
    ['Read passage · Hebrew Tanakh','Lees passage · Hebreeuwse Tenach','Lire le passage · Tanakh hébreu'],
    ['Read passage · Dutch Qur’an translation','Lees passage · Nederlandse Koranvertaling','Lire le passage · Traduction néerlandaise du Coran'],
    ['← Back to festivals & rituals','← Terug naar feestdagen & rituelen','← Retour aux fêtes et rites'],
    ['Calendar rules describe recurring observances; local dates and practices may differ.','Kalenderregels beschrijven terugkerende vieringen; lokale data en gebruiken kunnen verschillen.','Les règles du calendrier décrivent les célébrations récurrentes ; les dates et pratiques locales peuvent varier.']
  ];
  const root=typeof window!=='undefined'?window:globalThis;
  root.BibleI18n?.registerRows(rows);
  const lang=()=>root.BibleI18n?.language||'nl';
  const t=(s,p)=>root.BibleI18n?.t(s,p)||s;
  const local=(value,language=lang())=>value?.[language]||value?.nl||value?.en||'';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
  const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const kinds={feast:'Festival',season:'Season',ritual:'Ritual'};
  const sections={meaning:'Meaning & texts',history:'Historical context',practice:'Ritual & practice',diversity:'Diversity & interpretation'};
  const referenceKinds={scripture:'Sacred text',tradition:'Tradition & interpretation',historical:'Historical & contemporary sources'};
  class FestivalCollection {
    constructor(data){
      const tradition=data?.meta?.tradition;
      if(!['christianity','judaism','islam'].includes(tradition)||!Array.isArray(data.entries)||!data.entries.length)throw new Error('Invalid festival collection');
      this.data=data;this.tradition=tradition;this.entries=[...data.entries].sort((a,b)=>a.order-b.order);this.byId=new Map();
      for(const e of this.entries){
        if(!new RegExp(`^${tradition}:[a-z0-9-]+$`).test(e.id)||this.byId.has(e.id)||e.tradition!==tradition||!Object.hasOwn(kinds,e.kind)||!e.title?.nl||!e.calendar||!Array.isArray(e.sections)||!Array.isArray(e.references))throw new Error('Invalid information dossier');
        const ids=new Set(e.references.map(r=>r.id));
        if(ids.size!==e.references.length||e.references.some(r=>!safeUrl(r.url)||!Object.hasOwn(referenceKinds,r.kind)||!/^[-a-z0-9]+$/.test(r.id)))throw new Error('Invalid dossier sources');
        if([e.calendar,...e.sections].some(s=>!Array.isArray(s.sourceIds)||s.sourceIds.some(id=>!ids.has(id))))throw new Error('Unknown dossier source');
        this.byId.set(e.id,e);
      }
    }
    search(query='',kind='all',language=lang()){
      const terms=fold(query).trim().split(/\s+/).filter(Boolean);
      return this.entries.filter(e=>(kind==='all'||e.kind===kind)&&terms.every(term=>fold([local(e.title,language),local(e.summary,language),local(e.calendar.text,language),...e.sections.map(s=>local(s.text,language)),...e.references.map(r=>local(r.label,language))].join(' ')).includes(term)));
    }
  }
  class FestivalView {
    constructor(container,{onPassage=()=>{}}={}){
      this.container=container;this.onPassage=onPassage;this.states=new Map();
      this.click=event=>{const b=event.target.closest('button');if(!b||!container.contains(b))return;
        if(b.dataset.festival){this.state.selected=b.dataset.festival;this.renderList();container.querySelector('.festival-detail h2')?.focus();}
        else if(['all','feast','season','ritual'].includes(b.dataset.festivalKind)){this.state.kind=b.dataset.festivalKind;this.renderFilters();this.renderList();container.querySelector(`[data-festival-kind="${this.state.kind}"]`)?.focus();}
        else if(b.dataset.festivalPassage){const e=this.model.byId.get(this.state.selected),ref=e?.references.find(r=>r.id===b.dataset.festivalPassage);if(ref?.passage)this.onPassage({...ref.passage},e.id);}
      };
      this.input=event=>{if(event.target.id==='festival-search'){this.state.query=event.target.value;this.renderList();}};
      container.addEventListener('click',this.click);container.addEventListener('input',this.input);
    }
    destroy(){this.container.removeEventListener('click',this.click);this.container.removeEventListener('input',this.input);}
    setCollection(data){this.model=new FestivalCollection(data);this.tradition=this.model.tradition;if(!this.states.has(this.tradition))this.states.set(this.tradition,{query:'',kind:'all',selected:this.model.entries[0].id});this.state=this.states.get(this.tradition);this.render();}
    changeLanguage(){if(this.model)this.render();}
    open(id){if(!this.model.byId.has(id))return false;this.state.selected=id;this.state.query='';this.state.kind='all';this.render();return true;}
    render(){
      this.container.innerHTML=`<div class="festival-introduction"><span class="library-kicker">${esc(t('Religious traditions in context'))}</span><p>${esc(local(this.model.data.meta.scope))}</p></div><div class="festival-toolbar"><label for="festival-search">${esc(t('Search festivals and rituals'))}<input id="festival-search" type="search" value="${esc(this.state.query)}" placeholder="${esc(t('Name, practice or source…'))}"></label><div class="festival-filters" role="group" aria-label="${esc(t('Choose a topic'))}"></div></div><div class="festival-workspace"><section class="festival-list" aria-label="${esc(t('Choose a topic'))}"><p class="festival-count" role="status" aria-live="polite"></p><div class="festival-cards"></div></section><article class="festival-detail"></article></div>`;
      this.renderFilters();this.renderList();
    }
    renderFilters(){this.container.querySelector('.festival-filters').innerHTML=[['all','All topics'],['feast','Festivals'],['season','Seasons'],['ritual','Rituals']].map(([key,label])=>`<button type="button" data-festival-kind="${key}" aria-pressed="${this.state.kind===key}">${esc(t(label))}</button>`).join('');}
    renderList(){
      const matches=this.model.search(this.state.query,this.state.kind);
      if(!matches.some(e=>e.id===this.state.selected))this.state.selected=matches[0]?.id||null;
      this.container.querySelector('.festival-count').textContent=matches.length===1?t('1 topic'):t('{count} topics',{count:matches.length});
      this.container.querySelector('.festival-cards').innerHTML=matches.map(e=>`<button type="button" class="festival-card" data-festival="${esc(e.id)}" aria-pressed="${e.id===this.state.selected}"><span class="festival-kind">${esc(t(kinds[e.kind]))}</span><strong>${esc(local(e.title))}</strong><span class="festival-card-summary">${esc(local(e.summary))}</span><span class="festival-card-arrow" aria-hidden="true">↗</span></button>`).join('')||`<p class="festival-empty">${esc(t('No matching topics. Try another search or filter.'))}</p>`;
      this.renderDetail();
    }
    renderDetail(){
      const panel=this.container.querySelector('.festival-detail'),e=this.model.byId.get(this.state.selected);
      if(!e){panel.innerHTML='';panel.hidden=true;return;}panel.hidden=false;
      const sourceId=id=>`festival-source-${e.id}-${id}`;
      const cites=ids=>`<span class="festival-citations">${ids.map(id=>{const i=e.references.findIndex(r=>r.id===id);return `<a href="#${esc(sourceId(id))}" aria-label="${esc(local(e.references[i].label))}">[${i+1}]</a>`;}).join(' ')}</span>`;
      const readLabels={christianity:'Read passage · Dutch Catholic Bible',judaism:'Read passage · Hebrew Tanakh',islam:'Read passage · Dutch Qur’an translation'};
      panel.innerHTML=`<header class="festival-detail-heading"><span class="festival-kind">${esc(t(kinds[e.kind]))}</span><h2 tabindex="-1">${esc(local(e.title))}</h2><p>${esc(local(e.summary))}</p></header><section class="festival-calendar"><h3>${esc(t('Calendar & rhythm'))}</h3><p>${esc(local(e.calendar.text))} ${cites(e.calendar.sourceIds)}</p><small>${esc(t('Calendar rules describe recurring observances; local dates and practices may differ.'))}</small></section><div class="festival-sections">${e.sections.map(s=>`<section><h3>${esc(t(sections[s.id]))}</h3><p>${esc(local(s.text))} ${cites(s.sourceIds)}</p></section>`).join('')}</div><section class="festival-references"><h3>${esc(t('Sources & reading'))}</h3>${e.references.map((r,i)=>`<div class="festival-reference" id="${esc(sourceId(r.id))}" tabindex="-1"><span class="festival-source-kind">${esc(t(referenceKinds[r.kind]))} · ${i+1}</span><h4>${esc(local(r.label))}</h4><p>${esc(local(r.context))}</p><div class="festival-source-actions">${r.passage?`<button type="button" data-festival-passage="${esc(r.id)}">${esc(t(readLabels[r.passage.tradition]))} →</button>`:''}<a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${esc(t('Open original source'))} ↗</a></div></div>`).join('')}</section>`;
    }
  }
  root.FestivalCollection=FestivalCollection;root.FestivalView=FestivalView;
  if(typeof module!=='undefined'&&module.exports)module.exports={FestivalCollection,FestivalView,rows};
})();
