'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {TimelineModel,TimelineLayout,AtlasExplore}=require('../dist/explore-features.js');
const data=require('../dist/timeline-events.json'),links=require('../dist/timeline-connections.json');
const traditions=['christianity','judaism','islam'];
const events=Object.entries(data.traditions).flatMap(([tradition,entries])=>entries.map(e=>({...e,tradition})));
const model=new TimelineModel(events),overview=model.visible({width:390,separateTraditions:true});
assert.equal(new Set(overview.flatMap(c=>c.events.map(e=>e.id))).size,events.length,'The phone overview retains every event from all three religions');
assert(overview.every(c=>new Set(c.events.map(e=>e.tradition)).size===1),'Clusters may never merge distinct religious identities');
const sameYear=traditions.map(tradition=>({id:tradition+':same',tradition,start:2019,title:'Shared date',kind:'history'}));
const simultaneous=new TimelineModel(sameYear).visible({width:390,separateTraditions:true});
assert.equal(simultaneous.length,3,'A simultaneous event must appear separately in each religion lane');
assert.equal(new Set(simultaneous.map(c=>c.x)).size,1,'Identical dates must have identical horizontal coordinates');
// Phone year labels leave enough space to read instead of colliding in the overview.
const paintView=Object.create(AtlasExplore.prototype),paintNodes=new Map(),phone={clientWidth:273,scrollLeft:0};
Object.assign(paintView,{states:new Map(),view:'timeline',tradition:'islam',timelineComparison:true,model,el:{querySelector(s){if(s==='.atlas-timeline-scroll')return phone;if(!paintNodes.has(s))paintNodes.set(s,{style:{}});return paintNodes.get(s)}}});
paintView.paintTimeline();
const ticks=[...paintNodes.get('.atlas-timeline-items').innerHTML.matchAll(/class="atlas-timeline-tick" style="left:([\d.-]+)px"/g)].map(m=>+m[1]).filter(x=>x>=0&&x<=phone.clientWidth);
assert(ticks.length>=1,'The overview must retain year markers');for(let i=1;i<ticks.length;i++)assert(ticks[i]-ticks[i-1]>=90,'Phone year labels need readable spacing');
for(const width of [305,375,931])for(const zoom of [1,4,20,300]){
 const full=width*zoom,clusters=model.visible({width,zoom,scroll:Math.max(0,full-width-100),separateTraditions:true});
 for(const tradition of traditions){
  const positions=clusters.filter(c=>c.events[0].tradition===tradition).map(c=>Math.max(0,Math.min(full-TimelineLayout.cardWidth-8,c.x-8))).sort((a,b)=>a-b);
  for(let i=1;i<positions.length;i++)assert(positions[i]-positions[i-1]>=TimelineLayout.cardGap-.01,'Cards in the same lane must not overlap, including clamped overview cards');
 }
}
// Virtualization stays bounded as the corpus grows, while preserving each lane.
const dense=new TimelineModel(Array.from({length:60000},(_,i)=>({id:String(i),start:100+i,tradition:traditions[i%3],title:'Event',kind:'history'})));
for(const scroll of [0,120000,390000])assert(dense.visible({width:390,zoom:1000,scroll,separateTraditions:true}).length<=18);
// The two modes retain independent cameras; all comparison lanes use the same camera.
const view=Object.create(AtlasExplore.prototype);Object.assign(view,{states:new Map(),view:'timeline',tradition:'islam',timelineComparison:false});
view.state.zoom=8;view.state.scroll=450;view.timelineComparison=true;assert.equal(view.state.zoom,1);view.state.zoom=12;view.state.scroll=900;
view.tradition='judaism';assert.equal(view.state.zoom,12,'The shared comparison camera survives changing the active religion');
view.timelineComparison=false;view.tradition='islam';assert.equal(view.state.zoom,8);assert.equal(view.state.scroll,450);
view.timelineComparison=true;assert.equal(view.state.scroll,900);
// Nearby means overlap or at most 25 years away, never the selected religion itself.
view.model=new TimelineModel([
 {id:'chosen',tradition:'christianity',start:100,end:110},
 {id:'same-faith',tradition:'christianity',start:101},
 {id:'overlap',tradition:'judaism',start:80,end:105},
 {id:'before',tradition:'islam',start:75},
 {id:'after',tradition:'judaism',start:135},
 {id:'too-late',tradition:'islam',start:136},
 {id:'too-early',tradition:'judaism',start:74}
]);
assert.deepEqual(view.contemporaries(view.model.events.find(e=>e.id==='chosen')).map(e=>e.id).sort(),['after','before','overlap']);
// Real sourced connections must join existing, distinct traditions with safe source links.
assert(links.connections.length>=6);
assert.equal(new Set(links.connections.map(c=>c.id)).size,links.connections.length);
for(const c of links.connections){
 const linked=c.eventIds.map(id=>events.find(e=>e.id===id));assert(linked.every(Boolean),c.id);
 assert(new Set(linked.map(e=>e.tradition)).size>=2,c.id);assert(['influence','shared-context'].includes(c.type));
 assert(c.context.length>140&&c.title);assert(c.sources.length);
 for(const s of c.sources){assert(s.title);const u=new URL(s.url);assert.equal(u.protocol,'https:');assert(!u.username&&!u.password);}
}
assert.deepEqual(links,JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/timeline-connections.json'),'utf8')),'Published connections must match their reviewed source');
// Selection retains religion/edition in passage routing, with shared context and same-period links.
view.data={...data,...links};view.model=model;view.state.selected='islam:fraternity';view.passages=[];
const detail={};view.el={querySelector:()=>detail};view.renderTimelineDetail();
assert(detail.innerHTML.includes('In dezelfde periode bij andere religies'));
assert(detail.innerHTML.includes('Eén gezamenlijk document, doorwerking in Fratelli tutti'));
assert(detail.innerHTML.includes('Christendom · rooms-katholiek'));
assert(detail.innerHTML.includes('geen bewijs van contact of invloed'));
view.state.selected=events.find(e=>e.tradition==='judaism'&&e.passage).id;view.renderTimelineDetail();assert.equal(view.passages.at(-1).tradition,'judaism');assert.equal(view.passages.at(-1).edition,'he');
// The same-date group remains selectable even when no amount of zoom can separate it.
let selectedHtml='',focused=0;
const clusterScroll={clientWidth:390,scrollLeft:0};
Object.assign(view,{model:new TimelineModel(sameYear),paintTimeline(){},renderTimelineDetail(){focused++},el:{contains:()=>true,querySelector:s=>s==='.atlas-timeline-scroll'?clusterScroll:{set innerHTML(v){selectedHtml=v}}}});
view.click({target:{closest:()=>({dataset:{cluster:sameYear.map(e=>e.id).join(',')}})}});
assert.equal((selectedHtml.match(/data-event=/g)||[]).length,3);assert(focused);
console.log(`Timeline comparison passed: ${events.length} separate events, shared date coordinates, bounded phone rendering, independent mode state, contemporaries, ${links.connections.length} sourced connections, edition-safe passages and selectable simultaneous clusters.`);
