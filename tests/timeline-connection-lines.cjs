'use strict';
const assert=require('node:assert/strict');
const {TimelineModel,AtlasExplore}=require('../dist/explore-features.js');
const data=require('../dist/timeline-events.json'),{connections}=require('../dist/timeline-connections.json');
const events=Object.entries(data.traditions).flatMap(([tradition,es])=>es.map(e=>({...e,tradition}))),model=new TimelineModel(events);
const byId=new Map(events.map(e=>[e.id,e]));
// Every reviewed connection is visible in the overview, and each segment retains two distinct religions.
for(const width of [273,343,931]){
 const all=model.connections(connections,{width});assert.equal(all.length,connections.length);
 for(const {link,segments} of all)for(const p of segments){
  assert(link.eventIds.includes(p.fromId)&&link.eventIds.includes(p.toId));assert.notEqual(byId.get(p.fromId).tradition,byId.get(p.toId).tradition);
  assert(!p.clipped&&p.startVisible&&p.endVisible);assert(p.y2>p.y1);
 }
}
// Endpoint positions use the event year, never the first year of a grouped card.
for(const width of [273,343,931])for(const zoom of [1,28,1000]){
 const scale=width*zoom/(model.max-model.min),target=(1492-model.min)*scale-width/2;
 const visible=model.connections(connections,{width,zoom,scroll:Math.max(0,target)});
 for(const {segments} of visible)for(const p of segments){
  for(const n of [p.x1,p.x2])assert(n>=0&&n<=width,'The SVG never contains huge offscreen coordinates');
  if(p.startVisible)assert(Math.abs(model.min+(p.x1+Math.max(0,target))/scale-byId.get(p.fromId).start)<1e-7);
  if(p.endVisible)assert(Math.abs(model.min+(p.x2+Math.max(0,target))/scale-byId.get(p.toId).start)<1e-7);
 }
 const shared=visible.find(c=>c.link.id==='iberia-1492');assert(shared);assert.equal(shared.segments[0].x1,shared.segments[0].x2,'Two events in1492 align exactly');
}
// A connector crossing the viewport stays visible while both real endpoints are offscreen.
const far=new TimelineModel([{id:'a',tradition:'christianity',start:100},{id:'b',tradition:'islam',start:900}]);
const crossing=far.connections([{id:'far',eventIds:['a','b']}],{width:300,zoom:10,scroll:1300})[0].segments[0];
assert(crossing.clipped&&!crossing.startVisible&&!crossing.endVisible);assert.equal(crossing.x1,0);assert.equal(crossing.x2,300);
assert.equal(far.connections([{eventIds:['missing','a']}],{width:300}).length,0);
for(const {segments} of model.connections(connections,{width:390,kind:'text'}))for(const p of segments){assert.equal(byId.get(p.fromId).kind,'text');assert.equal(byId.get(p.toId).kind,'text');}
// Clicking an SVG group opens its dossier without moving the shared camera.
const view=Object.create(AtlasExplore.prototype),panel={hidden:true,innerHTML:'',scrollIntoView(){this.revealed=true},querySelector(){return {focus(){panel.focused=true}}}};
Object.assign(view,{states:new Map(),view:'timeline',tradition:'islam',timelineComparison:true,model,data:{...data,connections},el:{contains:()=>true,querySelector:()=>panel},paintTimeline(){this.painted=true}});
view.state.zoom=28;view.state.scroll=5000;
view.click({target:{closest:()=>({dataset:{timelineLink:'iberia-1492'}})}});
assert.equal(view.state.connection,'iberia-1492');assert.equal(view.state.zoom,28);assert.equal(view.state.scroll,5000);
assert(!panel.hidden&&panel.revealed&&panel.focused&&view.painted);assert(panel.innerHTML.includes('Gedeelde historische context'));assert(panel.innerHTML.includes('Fordham University'));assert(panel.innerHTML.includes('islam:granada'));assert(panel.innerHTML.includes('judaism:spain-expulsion'));
view.state.connection='fraternity-dialogue';view.renderTimelineConnection();assert(panel.innerHTML.includes('Historische doorwerking en contact'));assert(panel.innerHTML.includes('Fratelli tutti'));assert(panel.innerHTML.includes('christianity:fratelli'));
view.state.connection=null;view.renderTimelineConnection();assert(panel.hidden);
// Keyboard activation, normal taps and drags work on the lines themselves.
let opened=[],prevented=false;view.openTimelineConnection=id=>opened.push(id);view.queueTimeline=()=>{};
const canvas={clientWidth:343,scrollWidth:3000,scrollLeft:500,setPointerCapture(){},getBoundingClientRect:()=>({left:0})};view.bindTimelineGestures(canvas);
const line={dataset:{timelineLink:'iberia-1492'},closest:s=>s==='[data-timeline-link]'?line:null};
for(const key of ['Enter',' '])canvas.onkeydown({target:line,key,preventDefault(){prevented=true}});assert(prevented);assert.deepEqual(opened,['iberia-1492','iberia-1492']);
canvas.onkeydown({target:line,key:'ArrowRight',preventDefault(){}});assert.equal(canvas.scrollLeft,750);
const pointer=x=>({pointerId:1,button:0,clientX:x,clientY:200,target:line,cancelable:true,preventDefault(){}});
canvas.onpointerdown(pointer(200));canvas.onpointermove(pointer(100));canvas.onpointerup(pointer(100));assert.equal(canvas.scrollLeft,850);
let suppressed=false;canvas.onclick({detail:1,preventDefault(){suppressed=true},stopPropagation(){}});assert(suppressed,'Dragging a line must not accidentally open its dossier');
canvas.onpointerdown(pointer(100));canvas.onpointerup(pointer(100));suppressed=false;canvas.onclick({detail:1,preventDefault(){suppressed=true},stopPropagation(){}});assert(!suppressed,'A stationary line tap remains clickable');
// The drawing is viewport-sized; unchanged frames retain nodes, and hiding lines is reversible.
const drawing=Object.create(AtlasExplore.prototype),nodes=new Map();let writes=0;
Object.assign(drawing,{states:new Map(),view:'timeline',tradition:'islam',timelineComparison:true,model,data:{connections},el:{querySelector(s){if(!nodes.has(s))nodes.set(s,{style:{},_html:'',set innerHTML(v){writes++;this._html=v},get innerHTML(){return this._html}});return nodes.get(s)}}});
drawing.state.zoom=28;
const width=343,scroll=(1492-model.min)*width*28/(model.max-model.min)-width/2,clusters=model.visible({width,zoom:28,scroll,separateTraditions:true});
drawing.paintTimelineConnections(width,scroll,clusters);const firstWrites=writes;
assert(nodes.get('.timeline-link-layer').innerHTML.includes('width="343"'));assert(nodes.get('.timeline-link-layer').innerHTML.includes('role="button"'));assert(nodes.get('.timeline-link-layer').innerHTML.includes('class="timeline-link shared'));
assert(nodes.get('#timeline-link-list').innerHTML.includes('Granada'));
drawing.paintTimelineConnections(width,scroll,clusters);assert.equal(writes,firstWrites,'Identical frames retain link/button nodes');
drawing.paintTimelineConnections(width,scroll+100,clusters);assert.equal(nodes.get('.timeline-link-layer').style.left,`${scroll+100}px`);
drawing.state.showConnections=false;drawing.paintTimelineConnections(width,scroll,clusters);assert(!nodes.get('.timeline-link-layer').innerHTML.includes('<g '));assert(nodes.get('#timeline-link-list').innerHTML.includes('verborgen'));
drawing.state.showConnections=true;drawing.paintTimelineConnections(width,scroll,clusters);assert(nodes.get('.timeline-link-layer').innerHTML.includes('<g '));
console.log('Timeline connection lines passed: seven dossiers, exact date anchors, phone/desktop geometry, clipped continuations, filtered identities, SVG click/context/source routing, unchanged camera, keyboard/touch/drag distinction, bounded drawing, stable nodes and reversible visibility.');
