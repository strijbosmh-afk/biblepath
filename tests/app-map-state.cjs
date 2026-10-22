const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {context,Element}=require('./graph-geometry.cjs');
const root=path.resolve(__dirname,'..');

// Execute the actual app event handlers and graph against a small DOM adapter.
// The reader's asynchronous data load stays pending; this suite exercises maps.
class Control extends Element {
  constructor(dataset={}) {
    super('control');this.dataset=dataset;this.handlers=new Map();this.value='';
    this.classList.add=name=>this.classes.add(name);
    this.classList.remove=name=>this.classes.delete(name);
  }
  addEventListener(type,handler){this.handlers.set(type,handler);}
  click(){this.handlers.get('click')?.({target:this,preventDefault(){}});}
  close(){} scrollIntoView(){}
}
const controls=new Map();
const control=selector=>{if(!controls.has(selector))controls.set(selector,new Control());return controls.get(selector);};
const layouts=['constellation','lineage','radial'].map(layout=>new Control({layout}));
const nav=['reader','map','index','cities'].map(view=>new Control({view}));
const journeys=['abraham','david','jesus'].map(person=>new Control({person}));
const groups=new Map([['.layout-option',layouts],['.nav-item',nav],['.journey',journeys],['.testament',['all','OT','NT'].map(testament=>new Control({testament}))]]);
context.document.querySelector=control;
context.document.querySelectorAll=selector=>groups.get(selector)||[];
context.document.addEventListener=()=>{};
context.window.matchMedia=()=>({matches:false});
context.window.addEventListener=()=>{};
context.window.BibleI18n={language:'en',reference:text=>text,t:text=>text,localizePeople(){},setLanguage(){},observe(){}};
context.structuredClone=structuredClone;
context.fetch=()=>new Promise(()=>{});
const timers=new Map();let nextTimer=0;
context.setTimeout=callback=>{timers.set(++nextTimer,callback);return nextTimer;};
context.clearTimeout=id=>timers.delete(id);
const flush=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());};
let graph;
const Graph=context.window.BibleGraph;
context.window.BibleGraph=class extends Graph{constructor(...args){super(...args);graph=this;}};
for(const file of ['discovery.js','paths.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const snapshot=()=>context.window.biblePath.getState();
const ids=()=>Object.keys(snapshot().graph.positions).sort();
const plain=value=>JSON.parse(JSON.stringify(value));
nav.find(button=>button.dataset.view==='map').click();
const immediate=ids();

// Close zoom can reveal a branch at the edge without increasing global depth.
graph.callbacks.onZoom(1.1,{userInitiated:true,direction:'in',anchorId:'terah',anchorDistance:0});flush();
assert(ids().length>immediate.length,'Local zoom reveals relatives beyond the initial family');
assert.deepEqual(plain(snapshot().localRoots),['terah']);
const localIds=ids();
layouts[1].click();
assert.deepEqual(ids(),localIds,'Layout switches preserve locally revealed branches');
assert.deepEqual(plain(snapshot().localRoots),['terah']);

graph.zoomBy(.4);flush();
assert(snapshot().discoveryDepth>1,'Zoom out expands global family depth');
assert(ids().length>localIds.length);
graph.select('sarah');
const expandedIds=ids(),expandedDepth=snapshot().discoveryDepth;
for(const button of [layouts[2],layouts[0],layouts[1]]){
  button.click();
  assert.deepEqual(ids(),expandedIds,'Every layout must show the same discovered people');
  assert.equal(snapshot().discoveryDepth,expandedDepth);
  assert.deepEqual(plain(snapshot().localRoots),['terah']);
  assert.equal(snapshot().selected,'sarah','Changing layout keeps the selected person');
  assert.equal(snapshot().graph.layout,button.dataset.layout);
}
graph.zoomBy(1/1.5);flush();
assert.equal(snapshot().discoveryDepth,expandedDepth+1,'One discovery zoom step still works after fitting a different layout');
assert(expandedIds.every(id=>ids().includes(id)),'Further discovery retains the current family');

control('#reset-view').click();flush();
assert.deepEqual(ids(),immediate,'Reset explicitly returns to immediate family');
assert.equal(snapshot().discoveryDepth,1);
assert.deepEqual(plain(snapshot().localRoots),[]);
graph.zoomBy(.4);flush();
journeys.find(button=>button.dataset.person==='david').click();
assert.equal(snapshot().focus,'david');
assert.equal(snapshot().discoveryDepth,1,'Choosing a new family starts fresh');
assert.deepEqual(plain(snapshot().localRoots),[]);
console.log('App map state passed: local/global discovery, all layout switches, selection, continued zoom, reset and new family.');
