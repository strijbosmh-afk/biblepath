(function(root){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const local=(value,language)=>typeof value==='string'?value:value?.[language]??value?.en??'';
  const normalize=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[ٱأإآ]/g,'ا').replace(/ـ/g,'').toLocaleLowerCase();
  const safeUrl=value=>{if(value==='data-notes.html')return value;try{const url=new URL(value);return url.protocol==='https:'?url.href:'#';}catch{return '#';}};
  const rows=[
    ['Bible · Roman Catholic','Bijbel · Rooms-katholiek','Bible · Catholique romain'],['Torah · Judaism','Tora · Jodendom','Torah · Judaïsme'],['Qur’an · Islam','Koran · Islam','Coran · Islam'],
    ['Genesis – Deuteronomy','Genesis – Deuteronomium','Genèse – Deutéronome'],['114 surahs','114 soera’s','114 sourates'],
    ['Across traditions','Personen vergelijken','Personnes et traditions'],['Find a Bible person','Zoek een Bijbelse persoon','Chercher une personne biblique'],
    ['Three collections. Distinct accounts.','Drie collecties. Eigen verhalen.','Trois collections. Des récits distincts.'],['Choose a collection to explore its people. Each tradition keeps its own profiles and sources.','Kies een collectie om haar personen te verkennen. Elke traditie heeft eigen profielen en bronnen.','Choisissez une collection pour explorer ses personnages. Chaque tradition conserve ses profils et ses sources.'],
    ['People across traditions.','Personen in drie tradities.','Des personnes dans trois traditions.'],['Explore how people are portrayed in Roman Catholic Christianity, Judaism and Islam, with each account alongside its sources.','Verken de rol van personen vanuit rooms-katholiek, Joods en islamitisch perspectief, telkens met de bronnen bij hun verhaal.','Explorez le rôle des personnages dans le christianisme catholique romain, le judaïsme et l’islam, avec les sources de chaque récit.'],
    ['Choose a people collection','Kies een personencollectie','Choisir une collection de personnages'],['Bible people and family map only.','Alleen Bijbelse personen en hun familiekaart.','Personnages bibliques et carte familiale uniquement.'],
    ['Search this collection','Doorzoek deze collectie','Rechercher dans cette collection'],['Search names, roles or passages…','Zoek namen, rollen of passages…','Noms, rôles ou passages…'],
    ['People','Personen','Personnes'],['person','persoon','personne'],['people','personen','personnes'],['Selected person','Geselecteerde persoon','Personne sélectionnée'],['Passages and sources','Passages en bronnen','Passages et sources'],
    ['Compare this person','Vergelijk deze persoon','Comparer cette personne'],['Read the source','Lees de bron','Lire la source'],['Show more passages','Meer passages tonen','Afficher plus de passages'],
    ['Previous','Vorige','Précédent'],['Next','Volgende','Suivant'],['Page {page} of {total}','Pagina {page} van {total}','Page {page} sur {total}'],['No matching people. Try another name or role.','Geen personen gevonden. Probeer een andere naam of rol.','Aucune personne trouvée. Essayez un autre nom ou rôle.'],
    ['Search comparison figures','Zoek personen om te vergelijken','Rechercher un personnage à comparer'],['Choose a person','Kies een persoon','Choisir une personne'],['Three perspectives','Drie perspectieven','Trois perspectives'],
    ['Roman Catholic','Rooms-katholiek','Catholique romain'],['Judaism','Jodendom','Judaïsme'],['Islam','Islam','Islam'],['Role in this account','Rol in dit verhaal','Rôle dans ce récit'],
    ['Scriptural passages','Schriftpassages','Passages des Écritures'],['Catholic teaching','Katholieke leer','Enseignement catholique'],
    ['Named or identified in the text','Genoemd of geïdentificeerd in de tekst','Nommé ou identifié dans le texte'],['Outside this corpus','Buiten dit tekstcorpus','Hors de ce corpus'],['Not named in the text','Niet bij naam genoemd in de tekst','Non nommé dans le texte'],['Not attested in this corpus','Niet vermeld in dit tekstcorpus','Non attesté dans ce corpus'],
    ['Open this profile','Open dit profiel','Ouvrir ce profil'],['Reading the comparison','De vergelijking lezen','Lire la comparaison'],
    ['The Christian perspective is Roman Catholic. Scripture and Church teaching are identified separately. Similar names do not merge identities or family trees.','Het christelijke perspectief is rooms-katholiek. Schriftpassages en kerkelijke leer worden afzonderlijk vermeld. Gelijkende namen voegen personen of stambomen niet samen.','Le point de vue chrétien est catholique romain. Les passages bibliques et l’enseignement de l’Église sont identifiés séparément. Des noms proches ne fusionnent ni les identités ni les généalogies.'],
    ['Indexed person','Geïndexeerde persoon','Personne indexée'],['Editorial profile','Redactioneel profiel','Profil éditorial'],['Selected comparisons','Geselecteerde vergelijkingen','Comparaisons choisies'],['Profiles stay in their own collection.','Profielen blijven in hun eigen collectie.','Les profils restent dans leur propre collection.'],['Indexed Bible collection','Bijbelse indexcollectie','Index biblique'],
    ['Open scripture readers','Open de tekstlezers','Ouvrir les lecteurs de textes']
  ];
  root.BibleI18n?.registerRows(rows);
  const language=()=>root.BibleI18n?.language||'nl';
  const t=(key,params={})=>{const lang=language();const row=rows.find(r=>r[0]===key);return String(row?.[lang==='nl'?1:lang==='fr'?2:0]??key).replace(/\{(\w+)\}/g,(_,name)=>params[name]??`{${name}}`);};
  const sourceLabel=ref=>local(ref.labelLocales,language())||ref.label;
  function sourceLinks(refs){return refs.map(ref=>`<a href="${escape(safeUrl(ref.url))}" target="_blank" rel="noopener noreferrer">${escape(root.BibleI18n?.reference?.(sourceLabel(ref))||sourceLabel(ref))} <span aria-hidden="true">↗</span></a>`).join('');}
  function comparisonSources(panel){
    const doctrine=ref=>['catechism','magisterium'].includes(ref.corpus),refs=panel.refs||[];
    const scripture=refs.filter(ref=>!doctrine(ref)),teaching=refs.filter(doctrine);
    if(!teaching.length)return `<div class="collection-sources">${sourceLinks(refs)}</div>`;
    return `${scripture.length?`<h4>${escape(t('Scriptural passages'))}</h4><div class="collection-sources">${sourceLinks(scripture)}</div>`:''}<h4>${escape(t('Catholic teaching'))}</h4><div class="collection-sources">${sourceLinks(teaching)}</div>`;
  }
  class PeopleCollection {
    constructor(data){this.data=data;this.people=data.people;this.byId=new Map(this.people.map(person=>[person.id,person]));}
    search(query='',lang='nl'){
      const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
      return this.people.filter(p=>{const text=normalize([Object.values(p.names).join(' '),(p.aliases||[]).join(' '),local(p.summary,lang),local(p.disambiguation,lang),local(p.roles,lang).join(' '),p.refs.map(r=>r.label).join(' ')].join(' '));return terms.every(term=>text.includes(term));})
        .sort((a,b)=>{const rank=p=>normalize(local(p.names,lang))===normalize(query)?0:1;return rank(a)-rank(b)||local(a.names,lang).localeCompare(local(b.names,lang),lang)||a.id.localeCompare(b.id);});
    }
  }
  class PeopleIndexView {
    constructor(container,{onCompare=()=>{},onRead=()=>{}}={}){
      this.container=container;this.onCompare=onCompare;this.onRead=onRead;this.states=new Map();this.comparisonKeys=new Set();
      this.click=event=>{const button=event.target.closest('button');if(!button||!container.contains(button))return;
        if(button.dataset.profile){this.state.selected=button.dataset.profile;this.state.limit=12;this.renderProfile();container.querySelector('.collection-profile h3')?.focus();}
        else if(button.dataset.peoplePage){this.state.page+=Number(button.dataset.peoplePage);this.renderList();container.querySelector('.collection-list h3')?.focus();}
        else if(button.dataset.compare){this.onCompare(button.dataset.compare);}
        else if(button.dataset.moreRefs){this.state.limit+=24;this.renderProfile();}
        else if(button.dataset.readCollection){this.onRead(this.tradition);}
      };
      this.input=event=>{if(event.target.id==='tradition-people-search'){this.state.query=event.target.value;this.state.page=1;this.renderList();}};
      container.addEventListener('click',this.click);container.addEventListener('input',this.input);
    }
    setCollection(data,tradition){this.model=new PeopleCollection(data);this.tradition=tradition;if(!this.states.has(tradition))this.states.set(tradition,{query:'',page:1,selected:this.model.people.find(p=>p.comparisonKey==='abraham')?.id||this.model.people[0]?.id,limit:12});this.state=this.states.get(tradition);this.render();}
    setComparisonKeys(keys){this.comparisonKeys=new Set(keys);if(this.model)this.renderProfile();}
    open(id){if(!this.model.byId.has(id))return false;this.state.selected=id;this.state.limit=12;this.state.query='';this.state.page=Math.floor(this.model.search('',language()).findIndex(p=>p.id===id)/24)+1;this.render();return true;}
    changeLanguage(){if(this.model)this.render();}
    render(){const lang=language(),scope=local(this.model.data.meta.scope,lang),title=t(this.tradition==='judaism'?'Torah · Judaism':'Qur’an · Islam');
      this.container.innerHTML=`<div class="collection-heading"><div><span class="collection-kicker">${escape(t('Profiles stay in their own collection.'))}</span><h2>${escape(title)}</h2><p>${escape(scope)}</p></div><label class="collection-search">${escape(t('Search this collection'))}<input type="search" id="tradition-people-search" value="${escape(this.state.query)}" placeholder="${escape(t('Search names, roles or passages…'))}"></label></div><div class="collection-workspace"><section class="collection-list" aria-label="${escape(t('People'))}"><h3 tabindex="-1">${escape(t('People'))}</h3><div class="collection-results" aria-live="polite"></div><div class="collection-cards"></div><div class="collection-pagination"></div></section><article class="collection-profile" aria-label="${escape(t('Selected person'))}"></article></div>`;
      this.renderList();this.renderProfile();
    }
    renderList(){const lang=language(),matches=this.model.search(this.state.query,lang),pages=Math.max(1,Math.ceil(matches.length/24));this.state.page=Math.max(1,Math.min(pages,this.state.page));const start=(this.state.page-1)*24;
      this.container.querySelector('.collection-results').textContent=`${matches.length.toLocaleString(lang)} ${t(matches.length===1?'person':'people')}`;
      this.container.querySelector('.collection-cards').innerHTML=matches.length?matches.slice(start,start+24).map(p=>`<button class="collection-card" data-profile="${escape(p.id)}" aria-pressed="${this.state.selected===p.id}"><span class="collection-initial" aria-hidden="true">${escape(local(p.names,lang).slice(0,1))}</span><span><strong>${escape(local(p.names,lang))}</strong><small>${escape(local(p.disambiguation,lang)||local(p.roles,lang).join(' · ')||p.refs[0]?.label)}</small></span><span aria-hidden="true">›</span></button>`).join(''):`<p class="collection-empty">${escape(t('No matching people. Try another name or role.'))}</p>`;
      this.container.querySelector('.collection-pagination').innerHTML=pages>1?`<button data-people-page="-1" ${this.state.page===1?'disabled':''}>← ${escape(t('Previous'))}</button><span>${escape(t('Page {page} of {total}',{page:this.state.page,total:pages}))}</span><button data-people-page="1" ${this.state.page===pages?'disabled':''}>${escape(t('Next'))} →</button>`:'';
    }
    renderProfile(){const p=this.model.byId.get(this.state.selected),lang=language(),panel=this.container.querySelector('.collection-profile');if(!panel)return;if(!p){panel.innerHTML='';return;}
      panel.innerHTML=`<span class="collection-kicker">${escape(t(p.profileKind==='index-entry'?'Indexed person':'Editorial profile'))}</span><h3 tabindex="-1">${escape(local(p.names,lang))}</h3><p class="collection-identity">${escape(local(p.disambiguation,lang))}</p><div class="collection-role-tags">${local(p.roles,lang).map(role=>`<span>${escape(role)}</span>`).join('')}</div><p class="collection-summary">${escape(local(p.summary,lang))}</p>${p.comparisonKey&&this.comparisonKeys.has(p.comparisonKey)?`<button class="collection-primary" data-compare="${escape(p.comparisonKey)}">${escape(t('Compare this person'))} →</button>`:''}<h4>${escape(t('Passages and sources'))} <small>${p.refs.length.toLocaleString(lang)}</small></h4><div class="collection-sources">${sourceLinks(p.refs.slice(0,this.state.limit))}</div>${p.refs.length>this.state.limit?`<button class="collection-more" data-more-refs="true">${escape(t('Show more passages'))} (${p.refs.length-this.state.limit})</button>`:''}<p class="collection-source-note">${escape(local(this.model.data.meta.referenceNote,lang))}</p><details class="collection-provenance"><summary>${escape(t('Passages and sources'))}</summary>${sourceLinks((this.model.data.meta.sources||[]).filter(source=>!p.sourceIds?.length||p.sourceIds.includes(source.id)))}</details><button class="collection-reader-link" data-read-collection="true">${escape(t('Open scripture readers'))} ↗</button>`;
      this.container.querySelectorAll('[data-profile]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.profile===p.id)));
    }
    getState(){return {...this.state,tradition:this.tradition};}
    destroy(){this.container.removeEventListener('click',this.click);this.container.removeEventListener('input',this.input);}
  }
  class PeopleComparisonView {
    constructor(container,data,{onPerson=()=>{}}={}){
      this.container=container;this.data=data;this.onPerson=onPerson;this.query='';this.selected=data.people.find(p=>p.key==='abraham')?.key||data.people[0]?.key;
      this.click=event=>{const button=event.target.closest('button');if(!button||!container.contains(button))return;if(button.dataset.figure){this.selected=button.dataset.figure;this.renderDetail();this.renderList();container.querySelector('.comparison-person-heading h2')?.focus();}else if(button.dataset.collectionPerson)this.onPerson(button.dataset.collectionTradition,button.dataset.collectionPerson);};
      this.input=event=>{if(event.target.id==='comparison-search'){this.query=event.target.value;this.renderList();}};
      container.addEventListener('click',this.click);container.addEventListener('input',this.input);this.render();
    }
    open(key){if(!this.data.people.some(p=>p.key===key))return false;this.selected=key;this.query='';this.render();return true;}
    render(){this.container.innerHTML=`<div class="comparison-layout"><aside class="comparison-picker"><span class="collection-kicker">${escape(t('Selected comparisons'))}</span><h2>${escape(t('Choose a person'))}</h2><label class="collection-search">${escape(t('Search comparison figures'))}<input id="comparison-search" type="search" value="${escape(this.query)}" placeholder="${escape(t('Search names, roles or passages…'))}"></label><div class="comparison-count" aria-live="polite"></div><div class="comparison-figures"></div></aside><div class="comparison-detail"></div></div>`;this.renderList();this.renderDetail();}
    renderList(){const lang=language(),terms=normalize(this.query).trim().split(/\s+/).filter(Boolean);const matches=this.data.people.filter(p=>{const text=normalize([Object.values(p.names).join(' '),(p.aliases||[]).join(' '),local(p.theme,lang),...Object.values(p.traditions).map(panel=>`${local(panel.name,lang)} ${local(panel.role,lang)} ${(panel.refs||[]).map(ref=>`${ref.label} ${sourceLabel(ref)} ${root.BibleI18n?.reference?.(ref.label)||ref.label}`).join(' ')}`)].join(' '));return terms.every(term=>text.includes(term));});
      this.container.querySelector('.comparison-count').textContent=`${matches.length} ${t(matches.length===1?'person':'people')}`;
      this.container.querySelector('.comparison-figures').innerHTML=matches.length?matches.map(p=>`<button data-figure="${escape(p.key)}" aria-pressed="${this.selected===p.key}"><strong>${escape(local(p.names,lang))}</strong><small>${escape(local(p.theme,lang))}</small></button>`).join(''):`<p class="collection-empty">${escape(t('No matching people. Try another name or role.'))}</p>`;
    }
    renderDetail(){const p=this.data.people.find(p=>p.key===this.selected),lang=language();if(!p)return;
      const statuses={attested:'Named or identified in the text','outside-corpus':'Outside this corpus','not-named':'Not named in the text','not-attested':'Not attested in this corpus'};
      this.container.querySelector('.comparison-detail').innerHTML=`<header class="comparison-person-heading"><span class="collection-kicker">${escape(t('Three perspectives'))}</span><h2 tabindex="-1">${escape(local(p.names,lang))}</h2><p>${escape(local(p.theme,lang))}</p></header><div class="comparison-columns">${['christianity','judaism','islam'].map(tradition=>{const panel=p.traditions[tradition];return `<article class="comparison-account ${tradition}"><div class="comparison-tradition"><span aria-hidden="true"></span>${escape(t({christianity:'Roman Catholic',judaism:'Judaism',islam:'Islam'}[tradition]))}</div><h3>${escape(local(panel.name,lang))}</h3><p class="comparison-status">${escape(t(statuses[panel.status]||'Outside this corpus'))}</p><h4>${escape(t('Role in this account'))}</h4><p class="comparison-role">${escape(local(panel.role,lang))}</p><p class="comparison-summary">${escape(local(panel.summary,lang))}</p><p class="comparison-scope">${escape(local(panel.scope,lang))}</p>${comparisonSources(panel)}${panel.indexId?`<button class="collection-reader-link" data-collection-tradition="${tradition}" data-collection-person="${escape(panel.indexId)}">${escape(t('Open this profile'))} →</button>`:''}</article>`;}).join('')}</div><aside class="comparison-method"><h3>${escape(t('Reading the comparison'))}</h3><p>${escape(t('The Christian perspective is Roman Catholic. Scripture and Church teaching are identified separately. Similar names do not merge identities or family trees.'))}</p><p>${escape(local(this.data.meta.scope,lang))}</p><details><summary>${escape(t('Passages and sources'))}</summary><p>${escape(local(this.data.meta.methodology,lang))}</p>${sourceLinks(this.data.meta.sources||[])}</details></aside>`;
    }
    changeLanguage(){this.render();}
    getState(){return {selected:this.selected,query:this.query};}
    destroy(){this.container.removeEventListener('click',this.click);this.container.removeEventListener('input',this.input);}
  }
  root.PeopleCollection=PeopleCollection;root.PeopleIndexView=PeopleIndexView;root.PeopleComparisonView=PeopleComparisonView;
  if(typeof module!=='undefined')module.exports={PeopleCollection,PeopleIndexView,PeopleComparisonView,normalize,local,safeUrl};
})(typeof window!=='undefined'?window:globalThis);
