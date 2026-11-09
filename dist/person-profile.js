(function(root){
  'use strict';
  const local=(v,lang=root.BibleI18n?.language||'nl')=>typeof v==='string'?v:v?.[lang]??v?.en??'';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:'#';}catch{return '#';}};
  const rows=[['Full profile','Volledig profiel','Profil complet'],['Overview','Overzicht','Aperçu'],['Texts','Teksten','Textes'],['Family','Familie','Famille'],['Places','Plaatsen','Lieux'],['Close profile','Sluit profiel','Fermer le profil'],['Explore family map','Bekijk familiekaart','Voir la carte familiale'],['Compare this person','Vergelijk deze persoon','Comparer cette personne'],['Read passage','Lees passage','Lire le passage'],['Original source','Oorspronkelijke bron','Source originale'],['Show more','Toon meer','Afficher plus'],['No documented family links in this collection.','Geen onderbouwde familiebanden in deze collectie.','Aucun lien familial documenté dans cette collection.'],['No linked places in this collection.','Geen gekoppelde plaatsen in deze collectie.','Aucun lieu lié dans cette collection.'],['Shared text reference; this does not establish residence or presence.','Gedeelde tekstverwijzing; dit bewijst geen verblijf of aanwezigheid.','Référence textuelle commune ; elle ne prouve ni résidence ni présence.'],['Parent → child','Ouder → kind','Parent → enfant'],['Marriage','Huwelijk','Mariage'],['Sibling','Broer of zus','Frère ou sœur'],['Guardianship','Zorgrelatie','Tutelle'],['Adoption','Adoptie','Adoption'],['Additional Catholic passages','Aanvullende katholieke passages','Passages catholiques complémentaires'],['Tradition and interpretation','Traditie en interpretatie','Tradition et interprétation'],['Back to profile','Terug naar profiel','Retour au profil'],['Family collection · Tanakh','Familiecollectie · Tenach','Collection familiale · Tanakh']];
  root.BibleI18n?.registerRows(rows);
  const t=k=>root.BibleI18n?.t(k)||k;
  const refKey=r=>JSON.stringify([local(r.label),r.url,r.edition,r.sourceEdition,r.passage]);
  const unique=values=>[...new Map(values.map(v=>[refKey(v),v])).values()];
  class PersonProfileModel{
    constructor(tradition,{base=[],supplement,collection,atlas,places,comparisons}={}){
      if(!['christianity','judaism','islam'].includes(tradition))throw Error('Unknown tradition');
      this.tradition=tradition;Object.assign(this,{base,supplement,collection,atlas,places,comparisons});
      this.baseById=new Map(base.map(p=>[p.id,p]));
      this.collectionById=new Map((collection?.people||[]).map(p=>[p.id,p]));
      this.atlasById=new Map((atlas?.people||[]).map(p=>[p.id,p]));
      this.atlasByIndex=new Map((atlas?.people||[]).filter(p=>p.indexId).map(p=>[p.indexId,p]));
      this.supplementById=new Map((supplement?.people||[]).map(p=>[p.bibleId||p.id,p]));
      this.extraIds=new Map((supplement?.people||[]).map(p=>[p.id,p.bibleId||p.id]));
      this.placeRefs=new Map();
      for(const place of places?.places||[])for(const r of place.refs||[]){if(!this.placeRefs.has(r.label))this.placeRefs.set(r.label,new Set());this.placeRefs.get(r.label).add(place);}
    }
    canonical(id){if(this.tradition==='christianity')return this.extraIds.get(id)||id;return this.atlasById.get(id)?.indexId||id;}
    get(id,{summaryOnly=false}={}){
      id=this.canonical(id);
      const christian=this.tradition==='christianity',base=christian?this.baseById.get(id):this.collectionById.get(id),extra=christian?this.supplementById.get(id):null,ap=this.atlasByIndex.get(id)||this.atlasById.get(id);
      if(!base&&!extra&&!ap)return null;
      const comparison=this.comparisons?.people.find(p=>p.traditions?.[this.tradition]?.indexId===id),account=comparison?.traditions[this.tradition];
      const refs=unique([...(base?.refs||[]).filter(r=>r.provenance!=='indexed-name'),...(extra?.refs||[]),...(ap?.refs||[]),...(base?.refs||[]).filter(r=>r.provenance==='indexed-name')]);
      const summaries=[base?.description||local(base?.summary),local(extra?.summary),local(ap?.summary)].filter(Boolean);
      const family=summaryOnly?[]:christian?(this.relationships||[]):(this.atlas?.relationships||[]);
      const familyId=christian?id:ap?.id;
      const relations=family.filter(r=>r.source===familyId||r.target===familyId).map(r=>{
        const other=christian?this.baseById.get(r.source===familyId?r.target:r.source):this.atlasById.get(r.source===familyId?r.target:r.source);
        return {...r,otherId:other?this.canonical(other.id):null,otherName:other?.name?local(other.name):other?.names?local(other.names):'',refs:r.refs||[r.ref].filter(Boolean)};
      });
      const linked=summaryOnly?[]:christian?[...new Set((base?.refs||[]).filter(r=>!r.edition).flatMap(r=>[...(this.placeRefs.get(r.label)||[])]))]:(this.atlas?.places||[]).filter(p=>ap&&p.personIds.includes(ap.id));
      return {id,tradition:this.tradition,name:base?.name||local(base?.names)||local(extra?.names)||local(ap?.name),aliases:[...new Set([...(base?.displayAliases||base?.aliases||[]),...(extra?.aliases||[]),...(ap?.aliases||[])])],identity:base?.disambiguation?local(base.disambiguation):local(extra?.disambiguation),summaries:[...new Set(summaries)],notes:base?.notes||[],sources:[base?.source,...(this.collection?.meta.sources||[]),...(extra?this.supplement?.meta.sources||[]:[]),...(this.atlas?.meta.sources||[])].filter(Boolean),roles:local(base?.roles)||local(extra?.roles)||[],refs,extra,account,comparisonKey:comparison?.key||base?.comparisonKey,relations,places:linked,mapId:christian?(base?id:null):ap?.id,sourceNotes:[local(this.collection?.meta.referenceNote),local(this.supplement?.meta.referenceNote),!base&&ap&&this.tradition==='judaism'?t('Family collection · Tanakh'):''].filter(Boolean)};
    }
  }
  class PersonProfileView{
    constructor(dialog,{onRead=()=>{},onMap=()=>{},onPlace=()=>{},onCompare=()=>{}}={}){
      this.dialog=dialog;Object.assign(this,{onRead,onMap,onPlace,onCompare});this.tab='overview';this.limit=24;
      dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
        if(d.profileTab){this.tab=d.profileTab;this.render();dialog.querySelector(`[data-profile-tab="${this.tab}"]`)?.focus({preventScroll:true});}
        else if(d.profileRef!==undefined)this.onRead(this.model.tradition,this.profile.refs[Number(d.profileRef)],this.profile.id);
        else if(d.profileRelative){this.open(this.model,d.profileRelative);}
        else if(d.profileMap){this.dialog.close();this.onMap(this.model.tradition,this.profile.mapId);}
        else if(d.profilePlace){this.dialog.close();this.onPlace(this.model.tradition,d.profilePlace);}
        else if(d.profileCompare){this.dialog.close();this.onCompare(this.profile.comparisonKey);}
        else if(d.profileMore){this.limit+=24;this.render();}
        else if(d.profileClose!==undefined)dialog.close();
      });
      dialog.addEventListener('keydown',e=>{if(!e.target.matches('[data-profile-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['overview','texts','family','places'],i=tabs.indexOf(this.tab);this.tab=e.key==='Home'?tabs[0]:e.key==='End'?tabs[3]:tabs[(i+(e.key==='ArrowRight'?1:3))%4];this.render();dialog.querySelector(`[data-profile-tab="${this.tab}"]`).focus({preventScroll:true});});
    }
    open(model,id,{tab='overview'}={}){const p=model.get(id);if(!p)return false;this.model=model;this.profile=p;this.tab=tab;this.limit=24;this.render();if(!this.dialog.open)this.dialog.showModal();this.dialog.querySelector('[data-profile-close]')?.focus({preventScroll:true});return true;}
    canRead(r){if(this.model.tradition==='christianity')return true;return Boolean(r.passage||this.model.tradition==='islam'&&r.surah||this.model.tradition==='judaism'&&r.sourceEdition==='JPS 1917');}
    render(){
      const p=this.profile,traditionName={christianity:'Roman Catholic',judaism:'Judaism',islam:'Islam'}[p.tradition],label=r=>root.BibleI18n?.reference(local(r.label))||local(r.label);
      let content='';
      if(this.tab==='overview')content=`${p.identity?`<p class="profile-identity">${esc(p.identity)}</p>`:''}${p.aliases.length?`<p class="profile-alias">${esc(p.aliases.join(' · '))}</p>`:''}${Array.isArray(p.roles)&&p.roles.length?`<div class="collection-role-tags">${p.roles.map(role=>`<span>${esc(role)}</span>`).join('')}</div>`:''}${p.summaries.map((s,i)=>`${i&&p.extra?`<h3>${esc(t('Additional Catholic passages'))}</h3>`:''}<p>${esc(s)}</p>`).join('')}${p.notes.map(note=>`<p class="workspace-note">${esc(root.BibleI18n?.text?.(note)||note)}</p>`).join('')}${p.account?`<section><h3>${esc(t('Tradition and interpretation'))}</h3><strong>${esc(local(p.account.role))}</strong><p>${esc(local(p.account.summary))}</p><p class="workspace-note">${esc(local(p.account.scope))}</p>${(p.account.refs||[]).map(r=>`<a class="profile-source" target="_blank" rel="noopener noreferrer" href="${esc(safe(r.url))}">${esc(label(r))} ↗</a>`).join('')}</section>`:''}${p.comparisonKey?`<button class="workspace-primary" data-profile-compare="true">${esc(t('Compare this person'))} →</button>`:''}`;
      if(this.tab==='texts')content=`<h3>${esc(t('Texts'))} · ${p.refs.length}</h3>${p.refs.slice(0,this.limit).map((r,i)=>`<div class="unified-reference"><strong>${esc(label(r))}</strong><small>${esc(r.sourceEdition||r.numbering||r.edition||t({scripture:'Scripture',tradition:'Tradition and interpretation',historical:'Historical context'}[r.kind]||r.kind||''))}</small><div>${this.canRead(r)?`<button data-profile-ref="${i}">${esc(t('Read passage'))} →</button>`:''}<a href="${esc(safe(r.url))}" target="_blank" rel="noopener noreferrer">${esc(t('Original source'))} ↗</a></div></div>`).join('')}${p.refs.length>this.limit?`<button data-profile-more="true">${esc(t('Show more'))} (${p.refs.length-this.limit})</button>`:''}${p.sources.length?`<details><summary>${esc(t('Sources & attribution'))}</summary>${p.sources.map(source=>`<a class="profile-source" href="${esc(safe(source.url))}" target="_blank" rel="noopener noreferrer">${esc(local(source.label||source.name||source.title)||source.id)} ↗</a>`).join('')}</details>`:''}${p.sourceNotes.map(s=>`<p class="workspace-note">${esc(s)}</p>`).join('')}`;
      if(this.tab==='family')content=`${p.mapId?`<button class="workspace-primary" data-profile-map="true">${esc(t('Explore family map'))} →</button>`:''}${p.relations.length?p.relations.map(r=>`<section class="unified-relation"><small>${esc(t({parent:'Parent → child',spouse:'Marriage',sibling:'Sibling',guardian:'Guardianship',adoption:'Adoption'}[r.type]||r.type))}</small><button data-profile-relative="${esc(r.otherId)}">${esc(r.otherName)} →</button>${r.note||r.summary?`<p>${esc(root.BibleI18n?.text?.(local(r.summary)||r.note)||local(r.summary)||r.note)}</p>`:''}${r.refs.map(ref=>`<a href="${esc(safe(ref.url))}" target="_blank" rel="noopener noreferrer">${esc(label(ref))} ↗</a>`).join('')}</section>`).join(''):`<p>${esc(t('No documented family links in this collection.'))}</p>`}`;
      if(this.tab==='places')content=`${p.tradition==='christianity'?`<p class="workspace-note">${esc(t('Shared text reference; this does not establish residence or presence.'))}</p>`:''}${p.places.length?p.places.slice(0,this.limit).map(place=>`<button class="unified-place" data-profile-place="${esc(place.id)}">${esc(local(place.name))} →</button>`).join(''):`<p>${esc(t('No linked places in this collection.'))}</p>`}${p.places.length>this.limit?`<button data-profile-more="true">${esc(t('Show more'))}</button>`:''}`;
      this.dialog.innerHTML=`<header class="unified-profile-header"><div><span class="library-kicker">${esc(t(traditionName))}</span><h2 id="unified-profile-title">${esc(p.name)}</h2></div><button class="icon-button" data-profile-close aria-label="${esc(t('Close profile'))}">×</button></header><div class="unified-profile-tabs" role="tablist" aria-label="${esc(t('Full profile'))}">${[['overview','Overview'],['texts','Texts'],['family','Family'],['places','Places']].map(([key,title])=>`<button role="tab" id="profile-tab-${key}" data-profile-tab="${key}" aria-selected="${this.tab===key}" aria-controls="unified-profile-panel" tabindex="${this.tab===key?'0':'-1'}">${esc(t(title))}</button>`).join('')}</div><article id="unified-profile-panel" class="unified-profile-content" role="tabpanel" aria-labelledby="profile-tab-${this.tab}" tabindex="0">${content}</article>`;
    }
  }
  root.PersonProfileModel=PersonProfileModel;root.PersonProfileView=PersonProfileView;
  if(typeof module!=='undefined')module.exports={PersonProfileModel,local,safe};
})(typeof window!=='undefined'?window:globalThis);
