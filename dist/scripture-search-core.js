/* Offline-built word postings and editorial themes. Shared by Worker and Node checks. */
(function(root){
 'use strict';
 const fold=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const stop=new Set('de het een en of in op aan te tot van voor met naar om is als dat die dit er ik gij ge u uw jullie zij hij zijn haar hun ons onze the a an and of to in le la les des du et un une'.split(' '));
 const terms=s=>[...new Set(fold(s).split(' ').filter(w=>w.length>1&&!stop.has(w)))];
 const key=p=>`${p.edition}:${p.book}:${p.chapter}:${p.verse}`;
 function matchingTopics(query,topics){const q=fold(query),words=terms(q);if(!q)return [];return topics.filter(t=>[t.label,t.id,...(t.synonyms||[])].some(a=>{const f=fold(a);return f===q||(f.length>3&&words.includes(f))}));}
 function search(index,query,topics=[],{offset=0,limit=30,mode='all',topicId=''}={}){
  const words=terms(query),matched=mode==='text'?[]:topicId?topics.filter(t=>t.id===topicId):matchingTopics(query,topics),scores=new Map(),thematic=new Map(),themeOrder=new Map();
  if(mode!=='text')for(const t of matched)for(const p of t.passages||[]){if(p.tradition!==index.tradition)continue;const row=index.locations[key(p)];if(row===undefined)continue;const current=thematic.get(row)||{endVerse:p.endVerse||p.verse,topics:[]};current.endVerse=Math.max(current.endVerse,p.endVerse||p.verse);current.topics.push(t.label);if(!themeOrder.has(row))themeOrder.set(row,themeOrder.size);thematic.set(row,current);scores.set(row,500);}
  if(mode!=='theme'&&words.length){
   const lists=words.map(w=>Object.hasOwn(index.postings,w)?index.postings[w]:[]).sort((a,b)=>a.length-b.length);
   if(lists[0]?.length){const sets=lists.slice(1).map(a=>new Set(a));for(const id of lists[0])if(sets.every(s=>s.has(id)))scores.set(id,(scores.get(id)||0)+10+(fold(index.rows[id][3]).includes(fold(query))?5:0));}
  }
  const ranked=[...scores].sort((a,b)=>themeOrder.has(a[0])&&themeOrder.has(b[0])?themeOrder.get(a[0])-themeOrder.get(b[0]):b[1]-a[1]||a[0]-b[0]),visible=ranked.slice(offset,offset+limit);
  return {total:ranked.length,matchedTopics:matched.map(t=>t.label),results:visible.map(([id])=>{const [book,chapter,verse,text,edition]=index.rows[id],m=thematic.get(id);return {id,tradition:index.tradition,book,chapter,verse,text,edition:edition||index.edition,endVerse:m?.endVerse||verse,topics:m?.topics||[]};})};
 }
 const api={fold,terms,key,matchingTopics,search};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ScriptureSearchCore=api;
})(typeof self!=='undefined'?self:globalThis);
