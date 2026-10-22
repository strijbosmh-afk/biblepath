const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor(name){this.name=name;this.children=[];this.attrs={};this.dataset={};this.style={};this.classes=new Set();this.classList={toggle:(name,on)=>{if(on)this.classes.add(name);else this.classes.delete(name);},contains:name=>this.classes.has(name)};}
  setAttribute(name,value){this.attrs[name]=String(value);if(name==='class')this.classes=new Set(String(value).split(' '));if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  getAttribute(name){return this.attrs[name];}
  append(...elements){this.children.push(...elements);}
  replaceChildren(...elements){this.children=[...elements];}
  addEventListener(){} removeEventListener(){} remove(){}
  querySelector(selector){const wanted=selector.slice(1);for(const child of this.children){if(child.classes.has(wanted))return child;const nested=child.querySelector(selector);if(nested)return nested;}return null;}
  getBoundingClientRect(){return {x:0,y:0,width:680,height:420};}
}
const context={window:{},document:{createElementNS:(_,name)=>new Element(name)},ResizeObserver:class{observe(){}disconnect(){}},Map,Set,Math,Date,console};
vm.createContext(context);
const root=path.resolve(__dirname,'..');
vm.runInContext(fs.readFileSync(path.join(root,'dist/data.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'dist/graph.js'),'utf8'),context);
const {people,relationships}=context.window.BIBLE_DATA;
const distanceToSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
function neighborhood(focus,depth){
  const adjacency=new Map(people.map(p=>[p.id,[]]));
  relationships.forEach(r=>{adjacency.get(r.source)?.push(r.target);adjacency.get(r.target)?.push(r.source);});
  const distances=new Map([[focus,0]]),queue=[focus];
  for(let i=0;i<queue.length;i++)if(distances.get(queue[i])<depth)for(const next of adjacency.get(queue[i])||[])if(!distances.has(next)){distances.set(next,distances.get(queue[i])+1);queue.push(next);}
  return people.filter(p=>distances.has(p.id)).slice(0,180);
}
function validate(graph,label){
  const state=graph.getState(),entries=Object.entries(state.positions);
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=entries[i],b=entries[j],distance=Math.hypot(a[1].x-b[1].x,a[1].y-b[1].y);
    assert.ok(distance>=state.minimumSpacing-.2,`${label}: ${a[0]} and ${b[0]} too close (${distance})`);
  }
  for(const route of state.routes){
    assert.equal(route.failed,false,`${label}: route failure ${route.source}→${route.target}`);
    assert.ok(route.points.length>=2);
    for(const [id,point] of entries){
      if(id===route.source||id===route.target)continue;
      for(let i=1;i<route.points.length;i++)assert.ok(distanceToSegment(point,route.points[i-1],route.points[i])>=state.radius+10,`${label}: ${route.source}→${route.target} crosses ${id}`);
    }
    const first=route.points[0],last=route.points.at(-1),source=state.positions[route.source],target=state.positions[route.target];
    assert.ok(Math.hypot(first.x-source.x,first.y-source.y)>=state.radius+7.9);
    assert.ok(Math.hypot(last.x-target.x,last.y-target.y)>=state.radius+7.9,label+': '+route.source+'>'+route.target+' arrow clearance '+Math.hypot(last.x-target.x,last.y-target.y));
  }
  return state;
}
if(require.main===module){
const graph=new context.window.BibleGraph(new Element('div'));
for(const layout of ['constellation','lineage','radial']){
  for(const focus of ['abraham','jacob','jesus','david','levi','moses']){
    const nodes=neighborhood(focus,2);graph.setData(nodes,relationships,{layout,focusId:focus});validate(graph,`${layout}/${focus}`);
    const before=graph.getState();graph.zoomBy(.7);const camera={...graph.getState().transform};
    graph.setData(neighborhood(focus,3),relationships,{layout,focusId:focus,preserveView:true,anchorId:focus,selectedId:focus});
    const after=validate(graph,`${layout}/${focus}/expanded`);
    if(layout==='radial'){
      const center=after.positions[focus],rings=new Map();
      for(const point of Object.values(after.positions))if(point.rank!=null){const radius=Math.hypot(point.x-center.x,point.y-center.y);if(!rings.has(point.rank))rings.set(point.rank,[]);rings.get(point.rank).push(radius);}
      for(const [rank,radii] of rings)assert.ok(Math.max(...radii)-Math.min(...radii)<.1,`${layout}/${focus}: rank ${rank} must remain on its relationship-distance ring`);
    }
    for(const[id,point]of Object.entries(before.positions))if(after.positions[id])assert.deepEqual(after.positions[id],point,'Existing circles must not jump while zoom reveals relatives');
    assert.equal(JSON.stringify(after.transform),JSON.stringify(camera),'Semantic reveal must preserve camera');
  }
  const all=people.slice(0,180);graph.setData(all,relationships,{layout,focusId:'abraham'});validate(graph,`${layout}/large`);
  console.log(`${layout}: spacing, obstacle routing, target clearance and stable reveal passed (${all.length} people).`);
}
let zoomEvent;
graph.callbacks.onZoom=(scale,metadata)=>zoomEvent={scale,...metadata};
graph.zoomBy(2);assert.equal(zoomEvent.userInitiated,true);assert.equal(zoomEvent.direction,'in');
graph.fit();assert.equal(zoomEvent.userInitiated,false);assert.equal(zoomEvent.reason,'fit');
graph.select('abraham');assert.equal(graph.getState().selectedId,'abraham');
console.log('Zoom metadata and selection passed.');
}
module.exports={context,Element,people,relationships,validate,neighborhood};


