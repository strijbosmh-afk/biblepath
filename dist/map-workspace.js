/* Keep the original maps and controls; only their workspace changes. */
(function(root){
 'use strict';
 const tr=s=>root.BibleI18n?.t(s)||s;
 const rows=[['Map full screen','Kaart schermvullend','Carte plein écran'],['Close full screen','Schermvullend sluiten','Quitter le plein écran'],['Selected details','Geselecteerde details','Détails sélectionnés'],['Show details','Details tonen','Afficher les détails'],['Hide details','Details inklappen','Réduire les détails'],['Map workspace','Kaartwerkruimte','Espace carte'],['Drag inside the map to move it. Scroll outside the map to move the page.','Sleep binnen de kaart om deze te verplaatsen. Veeg buiten de kaart om de pagina te verschuiven.','Faites glisser dans la carte pour la déplacer ; en dehors pour faire défiler la page.']];
 root.BibleI18n?.registerRows(rows);
 class AtlasMapWorkspace{
  constructor(document){this.document=document;this.active=null;this.inert=[];this.media=root.matchMedia('(max-width:760px)');this.key=e=>this.onKey(e);document.addEventListener('keydown',this.key);}
  mount(host,{key,map,detail,label,resize=()=>{}}){
   if(!host||!map||!detail)return;
   if(this.active?.host===host){this.active.resize=resize;this.refresh();return;}
   const previous=this.active?.key===key?this.getState():null;
   this.leave({focus:false});
   const d=this.document,toolbar=d.createElement('div');toolbar.className='map-workspace-tools';
   const expand=d.createElement('button');expand.type='button';expand.className='map-workspace-expand';expand.textContent=tr('Map full screen');expand.setAttribute('aria-pressed','false');
   const help=d.createElement('p');help.className='map-workspace-hint';help.textContent=tr('Drag inside the map to move it. Scroll outside the map to move the page.');
   toolbar.append(expand,help);host.prepend(toolbar);host.classList.add('map-workspace-host');
   const dock=d.createElement('section');dock.className='map-detail-dock';const bar=d.createElement('div');bar.className='map-detail-bar';
   const toggle=d.createElement('button');toggle.type='button';toggle.className='map-detail-toggle';const body=d.createElement('div');body.className='map-detail-body';body.id='map-detail-'+key;toggle.setAttribute('aria-controls',body.id);
   detail.before(dock);const quickExpand=d.createElement('button');quickExpand.type='button';quickExpand.className='map-detail-expand';quickExpand.textContent='⤢';dock.append(bar,body);bar.append(toggle,quickExpand);body.append(detail);
   this.active={host,key,map,detail,label,resize,toolbar,expand,quickExpand,help,dock,toggle,body,full:false,sheet:false};
   expand.addEventListener('click',()=>this.setFullscreen(!this.active.full));quickExpand.addEventListener('click',()=>this.setFullscreen(!this.active.full));toggle.addEventListener('click',()=>this.setSheet(!this.active.sheet));
   this.restore(previous||{sheet:false,full:false});this.refresh();
  }
  refresh(){
   const a=this.active;if(!a)return;const title=a.detail.querySelector('h2,h3')?.textContent?.trim()||tr('Selected details');
   a.toggle.textContent=(a.sheet?'⌄ ':'⌃ ')+title+' · '+tr(a.sheet?'Hide details':'Show details');a.toggle.setAttribute('aria-expanded',String(a.sheet));a.dock.classList.toggle('is-open',a.sheet);
   a.expand.textContent=(a.full?'↙ ':'⤢ ')+tr(a.full?'Close full screen':'Map full screen');a.expand.setAttribute('aria-pressed',String(a.full));a.quickExpand.setAttribute('aria-label',tr(a.full?'Close full screen':'Map full screen'));a.quickExpand.title=tr(a.full?'Close full screen':'Map full screen');a.help.textContent=tr('Drag inside the map to move it. Scroll outside the map to move the page.');
  }
  showSelection(){if(!this.active)return;this.active.detail.scrollTop=0;if(this.media.matches)this.setSheet(true);this.refresh();}
  setSheet(open){if(!this.active)return;const changed=this.active.sheet!==Boolean(open);this.active.sheet=Boolean(open);this.active.host.classList.toggle('map-sheet-open',this.active.sheet);this.refresh();if(changed)this.active.resize();}
  setFullscreen(open,{focus=true}={}){
   const a=this.active;if(!a||a.full===Boolean(open))return;
   a.full=Boolean(open);a.host.classList.toggle('map-focus-mode',a.full);
   if(a.full){
    this.scroll={x:root.scrollX||0,y:root.scrollY||0};this.overflow=this.document.body.style.overflow;this.document.body.style.overflow='hidden';
    this.role=a.host.getAttribute('role');this.ariaLabel=a.host.getAttribute('aria-label');a.host.setAttribute('role','dialog');a.host.setAttribute('aria-modal','true');a.host.setAttribute('aria-label',a.label||tr('Map workspace'));
    for(let node=a.host;node&&node!==this.document.body;node=node.parentElement)for(const sibling of node.parentElement?.children||[])if(sibling!==node&&!sibling.matches('dialog,#toast')){this.inert.push([sibling,sibling.inert]);sibling.inert=true;}
   }else{
    this.document.body.style.overflow=this.overflow||'';for(const [node,value] of this.inert)node.inert=value;this.inert=[];
    if(this.role)a.host.setAttribute('role',this.role);else a.host.removeAttribute('role');a.host.removeAttribute('aria-modal');if(this.ariaLabel)a.host.setAttribute('aria-label',this.ariaLabel);else a.host.removeAttribute('aria-label');
    root.scrollTo?.({left:this.scroll?.x||0,top:this.scroll?.y||0,behavior:'auto'});
   }
   this.refresh();a.resize();if(focus)a.expand.focus({preventScroll:true});
  }
  getState(){const a=this.active;return a?{key:a.key,full:a.full,sheet:a.sheet}:null;}
  restore(saved){if(!saved||!this.active||saved.key&&saved.key!==this.active.key)return;this.setSheet(saved.sheet);this.setFullscreen(saved.full,{focus:false});}
  onKey(event){
   const a=this.active;if(!a||this.document.querySelector('dialog[open]'))return;
   if(event.key==='Escape'&&(a.full||a.sheet&&this.media.matches)){event.preventDefault();if(a.sheet&&this.media.matches){this.setSheet(false);a.toggle.focus();}else this.setFullscreen(false);return;}
   if(event.key!=='Tab'||!a.full)return;
   const nodes=[...a.host.querySelectorAll('button,a[href],select,input,[tabindex="0"]')].filter(n=>!n.disabled&&!n.closest('[hidden]')&&n.getClientRects().length);
   if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1),current=this.document.activeElement;
   if(event.shiftKey&&(current===first||!a.host.contains(current))){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(current===last||!a.host.contains(current))){event.preventDefault();first.focus();}
  }
  leave({focus=false}={}){
   const a=this.active;if(!a)return;this.setFullscreen(false,{focus});a.toolbar.remove();a.dock.before(a.detail);a.dock.remove();a.host.classList.remove('map-workspace-host');a.host.classList.remove('map-sheet-open');this.active=null;
  }
  destroy(){this.leave();this.document.removeEventListener('keydown',this.key);}
 }
 root.AtlasMapWorkspace=AtlasMapWorkspace;
 if(typeof module!=='undefined')module.exports={AtlasMapWorkspace};
})(typeof window!=='undefined'?window:globalThis);
