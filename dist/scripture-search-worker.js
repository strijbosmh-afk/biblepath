/* Index downloads and all corpus queries stay off the main UI thread. */
importScripts('scripture-search-core.js');
const indexes=new Map();let topicsPromise=null,previewPromise=null;
const json=url=>fetch(url).then(r=>{if(!r.ok)throw Error('Download mislukt');return r.json()});
const topics=()=>topicsPromise||(topicsPromise=json('scripture-topics.json').then(d=>d.topics).catch(e=>{topicsPromise=null;throw e}));
const previews=()=>previewPromise||(previewPromise=json('scripture-topic-preview.json').catch(e=>{previewPromise=null;throw e}));
function index(id){if(!indexes.has(id))indexes.set(id,json(`search-index-${id}.json`).catch(e=>{indexes.delete(id);throw e}));return indexes.get(id)}
self.onmessage=async({data:d})=>{
 if(!Array.isArray(d.traditions)||!Number.isInteger(d.page)||d.page<0||d.page>2000)return;
 const ids=[...new Set(d.traditions)].filter(f=>['christianity','judaism','islam'].includes(f));
 try{const ts=await topics(),options={offset:0,limit:(d.page+1)*30,mode:d.mode,topicId:d.topicId},query=String(d.query||'').slice(0,200);
 if(d.mode==='theme'||(d.mode!=='text'&&(d.topicId||ScriptureSearchCore.matchingTopics(query,ts).length))){const small=await previews(),parts=ids.map(id=>{const data=small.traditions[id];return {...ScriptureSearchCore.search(data,query,ts,{...options,mode:'theme'}),tradition:id,names:data.names}});self.postMessage(result(d,parts,d.mode!=='theme'));if(d.mode==='theme')return;}
 const parts=await Promise.all(ids.map(async id=>{const data=await index(id);return {...ScriptureSearchCore.search(data,query,ts,options),tradition:id,names:data.names};}));self.postMessage(result(d,parts));
 }catch(e){self.postMessage({id:d.id,error:'De zoekindex kon niet worden geladen. Controleer je verbinding en probeer opnieuw.'});}
};
function result(d,parts,partial=false){
 const totals=Object.fromEntries(parts.map(p=>[p.tradition,p.total]));
 // Round-robin keeps small collections visible next to large corpora.
 const mixed=[];for(let n=0;n<Math.max(0,...parts.map(p=>p.results.length));n++)for(const p of parts)if(p.results[n])mixed.push({...p.results[n],bookName:p.names[p.results[n].book]});
 return {id:d.id,partial,totals,total:parts.reduce((n,p)=>n+p.total,0),results:mixed.slice(d.page*30,(d.page+1)*30),matchedTopics:[...new Set(parts.flatMap(p=>p.matchedTopics))]};
}
