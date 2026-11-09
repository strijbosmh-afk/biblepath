const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const rows=new Map();globalThis.BibleI18n={language:'nl',registerRows(rs){rs.forEach(r=>rows.set(r[0],r));},t(k){return rows.get(k)?.[{en:0,nl:1,fr:2}[this.language]]||k;}};
const {LifeView}=require('../dist/lived-religion.js');
const read=t=>JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/lived-'+t+'.json'),'utf8'));
class Container{constructor(){this.handlers=new Map();this.nodes=new Map();}addEventListener(t,fn){this.handlers.set(t,fn);}contains(){return true;}querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,{innerHTML:'',textContent:'',setAttribute(){},focus:()=>this.focused=s,scrollIntoView:()=>this.scrolled=s});return this.nodes.get(s);}click(data){const target={dataset:data,closest(){return this;}};this.handlers.get('click')({target});}}
const el=new Container(),opened=[],view=new LifeView(el,{onPassage:(p,origin)=>opened.push({p,origin})});
for(const religion of ['christianity','judaism','islam'])for(const section of ['prayer','dignity','peace']){
 view.setCollection(read(religion),section);assert.equal(el.lang,'nl');assert.match(el.querySelector('.life-count').textContent,/3 dossiers/);assert(el.querySelector('.life-detail').innerHTML.includes('life-source-'));
 const chosen=view.model.search(section)[1];el.click({lifeId:chosen.id});assert.equal(view.state.selected,chosen.id);assert(el.scrolled);const source=chosen.sources.find(s=>s.passage);el.click({lifeRead:source.id});assert.deepEqual(opened.at(-1),{p:source.passage,origin:section});assert.notEqual(opened.at(-1).p,source.passage,'Passage callbacks receive a copy');
 const state=view.getState();assert(view.setState(state));assert.equal(view.state.selected,chosen.id);assert.equal(view.setState({...state,tradition:'foreign'}),false);
 view.state.query='impossible-search-word';view.renderResults();assert.equal(el.querySelector('.life-detail').hidden,true);assert.equal(view.state.selected,null);el.click({lifeClear:'true'});assert.equal(el.querySelector('.life-detail').hidden,false);assert.equal(el.focused,'#life-query');
 el.click({lifeTag:view.model.tags(section)[0]});assert.notEqual(view.state.tag,'all');el.click({lifeClear:'true'});
}
view.setCollection(read('christianity'),'prayer');view.state.query='Onzevader';view.renderResults();const saved=view.getState();view.setCollection(read('islam'),'prayer');assert.equal(view.state.query,'');view.setCollection(read('christianity'),'prayer');assert.deepEqual(view.getState(),saved,'Each religious collection preserves its own search and selection');
const malicious=read('islam');malicious.entries[0].title='<img src=x onerror=bad()>';view.setCollection(malicious,'prayer');assert(el.querySelector('.life-cards').innerHTML.includes('&lt;img'));assert(!el.querySelector('.life-cards').innerHTML.includes('<img'));
console.log('Lived religion UI passed: all nine collections, exact text-reader callbacks, search/tag/empty recovery, independent state, return snapshots, focus/scroll, source anchors and escaped content.');
// Exercise case-map grouping and camera restoration without network or a tile server.
globalThis.L={
 map(){return {center:{lat:34,lng:15},zoom:3,setView([lat,lng],zoom){this.center={lat,lng};this.zoom=zoom;return this;},getCenter(){return this.center;},getZoom(){return this.zoom;},invalidateSize(){},remove(){this.removed=true;},fitBounds(points){this.center={lat:points[0][0],lng:points[0][1]};this.zoom=7;}};},
 tileLayer(){return {addTo(){}};},latLngBounds:points=>points,
 layerGroup(){return {items:[],addTo(){return this;},clearLayers(){this.items=[];}};},
 circleMarker(point,options){return {point,options,element:{attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;}},addTo(group){group.items.push(this);return this;},bindTooltip(text){this.label=text;return this;},bindPopup(html){this.html=html;return this;},getElement(){return this.element;},openPopup(){this.opened=true;}};}
};
const mapRoot=new Container(),mapView=new LifeView(mapRoot);mapView.setCollection(read('christianity'),'peace');mapRoot.querySelector('.life-map-disclosure').open=true;mapView.renderMap();
assert.equal(mapView.markers.items.length,2,'Three Catholic cases share two city centres');
const rome=mapView.markers.items.find(m=>m.label==='Assisi');assert.equal((rome.html.match(/data-life-id=/g)||[]).length,2);assert.equal(rome.element.attrs.role,'button');rome.element.listeners.keydown({key:'Enter',preventDefault(){}});assert(rome.opened,'Map points support keyboard activation');
mapView.map.setView([42,13],8);const camera=mapView.getState();mapView.setState(camera);assert.deepEqual(mapView.getState().mapCamera,camera.mapCamera,'Reader returns restore the case-map camera');assert(mapView.getState().mapOpen);
mapView.state.query='Mozambique';mapView.renderResults();assert.equal(mapView.markers.items.length,1);mapView.state.query='no-result-word';mapView.renderResults();assert.equal(mapView.markers.items.length,0);assert.match(mapRoot.querySelector('.life-map-status').textContent,/Geen kaartlocaties/);
console.log('Peace case map passed: co-located dossiers, accessible points, filter synchronization, no-result clearing and restored disclosure/camera.');
