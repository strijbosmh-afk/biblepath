'use strict';
const assert=require('node:assert/strict');
const {TimelineShare,TimelineModel,AtlasExplore}=require('../dist/explore-features.js');
const data=require('../dist/timeline-events.json'),{connections}=require('../dist/timeline-connections.json');
const events=Object.entries(data.traditions).flatMap(([tradition,es])=>es.map(e=>({...e,tradition}))),model=new TimelineModel(events);
const original={start:1452.123456,end:1552.123456,linkReligions:['judaism','islam'],linkType:'shared-context',kind:'all',connection:'iberia-1492',selected:'judaism:spain-expulsion',filter:'Vrede & hoop / één <moment>',showConnections:true};
const url=TimelineShare.encode(original,'https://www.religieatlas.com/?private=discard#old');
assert.equal(new URL(url).search,'');assert(!url.includes('private'));assert.deepEqual(TimelineShare.parse(new URL(url).hash),original);
for(const religions of [[],['christianity'],['christianity','islam'],['christianity','judaism','islam']])for(const linkType of ['all','influence','shared-context']){
 const state={...original,start:-600,end:-500,linkReligions:religions,linkType,connection:null,filter:'',showConnections:false};
 assert.deepEqual(TimelineShare.parse(new URL(TimelineShare.encode(state,'https://www.religieatlas.com/')).hash),state);
}
assert.equal(TimelineShare.parse('#andere-sectie'),null);
assert.equal(TimelineShare.parse('#vergelijking=1&van=100&tot=200').linkReligions.length,3);assert.deepEqual(TimelineShare.parse('#vergelijking=1&van=100&tot=200&rel=').linkReligions,[]);
assert(!TimelineShare.encode(original,'https://user:password@example.org/?token=private').includes('user:password'));
for(const hash of ['#vergelijking=9','#vergelijking=1&van=NaN&tot=200','#vergelijking=1&van=100&tot=100','#vergelijking=1&van=200&tot=100','#vergelijking=1&van=-100001&tot=100','#vergelijking=1&van=100&tot=200&rel=islam,islam','#vergelijking=1&van=100&tot=200&rel=unknown','#vergelijking=1&van=100&tot=200&type=unknown','#vergelijking=1&van=100&tot=200&lijnen=x','#vergelijking=1&van=100&van=200&tot=300','#vergelijking=1&van=100&tot=200&verband=javascript:alert(1)','#vergelijking=1&van=100&tot=200&zoek='+('x'.repeat(161)),'#vergelijking=1&'+('x'.repeat(2000))])assert(TimelineShare.parse(hash).invalid,hash);
assert.throws(()=>TimelineShare.encode(original,'javascript:alert(1)'));
function makeView(width,shared){
 let pixels=0;const nodes=new Map(),scroll={clientWidth:width,get scrollLeft(){return pixels},set scrollLeft(value){pixels=Math.round(value)},style:{},scrollIntoView(){this.revealed=true}};
 const view=Object.create(AtlasExplore.prototype);
 Object.assign(view,{states:new Map(),view:'timeline',tradition:'islam',data:{...data,connections},passages:[],el:{innerHTML:'',querySelector(s){if(s==='.atlas-timeline-scroll')return scroll;if(!nodes.has(s))nodes.set(s,{style:{},innerHTML:'',value:'',textContent:''});return nodes.get(s)}},bindTimelineGestures(){},paintTimeline(){},renderTimelineDetail(){},renderTimelineConnection(){},renderConnectionCatalog(){}});
 view.setSharedComparison(shared);view.renderTimeline();return {view,scroll,nodes};
}
// A fresh recipient needs no saved state, and gets the same historical period at any screen width.
for(const width of [273,343,931]){
 const {view,scroll}=makeView(width,TimelineShare.parse(new URL(url).hash)),restored=view.sharedTimelineState();
 assert(view.timelineComparison);assert.deepEqual(restored.linkReligions,original.linkReligions);assert.equal(restored.connection,original.connection);assert.equal(restored.selected,original.selected);assert.equal(restored.filter,original.filter);
 assert(Math.abs(restored.start-original.start)<1e-8);assert(Math.abs(restored.end-original.end)<1e-8);assert(scroll.revealed);
 const again=TimelineShare.parse(new URL(TimelineShare.encode(restored,'https://www.religieatlas.com/')).hash);assert.deepEqual(again,original);
}
const unknown=makeView(343,{...original,connection:'missing-connection'});assert.equal(unknown.view.state.connection,null);assert.equal(unknown.view.state.linkType,original.linkType);assert(unknown.view.el.innerHTML.includes('niet beschikbaar'));
const incompatible=makeView(343,{...original,linkType:'influence'});assert.equal(incompatible.view.state.connection,null,'A link cannot force selection outside its own filters');
const invalid=makeView(343,{invalid:true});assert.equal(invalid.view.state.zoom,1);assert.equal(invalid.view.state.scroll,0);assert.equal(invalid.view.state.linkType,'all');assert(invalid.view.el.innerHTML.includes('ongeldig'));
const clamped=makeView(343,{...original,start:99900,end:99950});assert(clamped.view.sharedTimelineState().end<=model.max+1e-8);
// The captured link is a snapshot; later panning changes only a newly generated link.
const captured=makeView(931,original);const before=captured.view.sharedTimelineState();captured.scroll.scrollLeft+=300;assert.notEqual(captured.view.sharedTimelineState().start,before.start);assert.equal(TimelineShare.parse(new URL(url).hash).start,original.start);
// Sharing/copying uses the current state and keeps a manual fallback when clipboard access fails.
(async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let copied='';
 const input={value:'',focus(){this.focused=true},select(){this.selected=true}},status={textContent:''},panel={hidden:true,scrollIntoView(){this.revealed=true}};
 const copyView=Object.create(AtlasExplore.prototype);Object.assign(copyView,{el:{contains:()=>true,querySelector:s=>s==='#timeline-share-url'?input:s==='#timeline-share-status'?status:panel},sharedTimelineState:()=>original});
 const priorLocation=globalThis.location;globalThis.location={href:'https://www.religieatlas.com/'};
 copyView.shareTimeline();assert(!panel.hidden&&panel.revealed&&input.selected);assert.deepEqual(TimelineShare.parse(new URL(input.value).hash),original);
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>{copied=text}}}});
 await copyView.copyTimelineLink();assert.equal(copied,input.value);assert(status.textContent.includes('gekopieerd'));
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw Error('denied')}}}});
 await copyView.copyTimelineLink();assert(status.textContent.includes('handmatig'));assert(input.selected);
 if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;if(priorLocation===undefined)delete globalThis.location;else globalThis.location=priorLocation;
 console.log('Timeline sharing passed: versioned round trips, BCE periods, all filter/visibility combinations, malformed/oversized URL rejection, fresh phone/desktop restoration, missing or filtered-out dossiers, bounded camera, immutable snapshots, clipboard success and manual fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});
