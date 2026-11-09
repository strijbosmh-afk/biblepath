/* Move the original controls, preserving their handlers and values. Desktop stays expanded. */
(function(root){
 'use strict';
 const rows=[['Edition and reading context','Teksteditie en toelichting','Édition et contexte'],['Search this book','Zoeken in deze tekst','Rechercher dans ce texte'],['Reading help and numbering','Leeshulp en versnummering','Aide et numérotation'],['Line filters and legend','Lijnfilters en legenda','Filtres des liens et légende'],['Timeline explanation','Toelichting bij de vergelijking','Explication de la comparaison'],['Search and map filters','Zoeken en kaartfilters','Recherche et filtres de carte'],['Map layout','Kaartindeling','Disposition de la carte'],['Search family members','Zoek familieleden','Rechercher des membres'],['Find a family connection','Zoek een familieverbinding','Chercher un lien familial'],['Collection context','Context van deze collectie','Contexte de cette collection']];
 root.BibleI18n?.registerRows(rows);
 class AtlasCompact{
  constructor(document){this.document=document;this.media=root.matchMedia('(max-width:760px)');this.saved=new Map();this.frame=null;
   this.observer=new root.MutationObserver(()=>this.schedule());this.observer.observe(document.querySelector('.page-content'),{childList:true,subtree:true});
   this.resize=()=>{for(const d of document.querySelectorAll('.compact-options'))d.open=this.media.matches?Boolean(this.saved.get(d.dataset.compactKey)):true;};this.media.addEventListener('change',this.resize);this.scan();
  }
  schedule(){if(this.frame!==null)return;this.frame=root.requestAnimationFrame(()=>{this.frame=null;this.scan();});}
  wrap(parentSelector,selectors,key,title){
   const parent=this.document.querySelector(parentSelector);if(!parent)return;
   const nodes=[...parent.querySelectorAll(selectors)].filter(n=>!n.closest('.compact-options'));
   if(!nodes.length)return;const first=nodes[0],siblings=nodes.filter(n=>n.parentElement===first.parentElement);if(!siblings.length)return;
   const details=this.document.createElement('details');details.className='compact-options';details.dataset.compactKey=key;details.open=this.media.matches?Boolean(this.saved.get(key)):true;
   const summary=this.document.createElement('summary');summary.textContent=root.BibleI18n?.t(title)||title;const body=this.document.createElement('div');body.className='compact-options-body';first.before(details);details.append(summary,body);for(const n of siblings)body.append(n);
   details.addEventListener('toggle',()=>{if(this.media.matches)this.saved.set(key,details.open);else if(!details.open)details.open=true;});
   details.addEventListener('toggle',()=>{root.dispatchEvent(new Event('resize'));});
  }
  scan(){
   for(const id of ['#reader-view','#sacred-reader-view']){
    this.wrap(id,'.reader-topline,.catholic-context,.sacred-edition-context',id+'edition','Edition and reading context');
    this.wrap(id,'.reader-search',id+'search','Search this book');
   }
   this.wrap('#reader-content','.reader-name-hint,.reader-versification-note','reading-help','Reading help and numbering');
   this.wrap('#explore-features-view','.timeline-link-controls','line-filters','Line filters and legend');
   this.wrap('#explore-features-view','.timeline-explanation,.timeline-connections-jump','timeline-context','Timeline explanation');
   this.wrap('#places-map-view','.pm-controls','map-filters','Search and map filters');
   this.wrap('#tradition-atlas-view','.atlas-layout-picker','family-layout','Map layout');
   this.wrap('#tradition-atlas-view','.atlas-toolbar > label:last-child','family-search','Search family members');
   this.wrap('.page-content','#path-finder','family-path','Find a family connection');
   this.wrap('.page-content','.layout-picker','bible-layout','Map layout');
   this.wrap('#festivals-view','.festival-introduction','festival-context','Collection context');
   this.wrap('#index-view','.catholic-context','index-context','Collection context');
   for(const details of this.document.querySelectorAll('.compact-options'))details.hidden=[...details.querySelector('.compact-options-body').children].every(node=>node.hidden);
  }
  destroy(){this.observer.disconnect();this.media.removeEventListener('change',this.resize);if(this.frame!==null)root.cancelAnimationFrame(this.frame);}
 }
 root.AtlasCompact=AtlasCompact;
})(typeof window!=='undefined'?window:globalThis);
