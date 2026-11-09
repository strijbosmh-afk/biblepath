'use strict';
const assert=require('node:assert/strict'),{AtlasExplore,TimelineModel,TimelineShare}=require('../dist/explore-features.js'),data=require('../dist/timeline-events.json');
function makeView(width,tradition='comparison'){
 const view=Object.create(AtlasExplore.prototype),nodes=new Map();let pixels=0;
 const scroll={clientWidth:width,get scrollLeft(){return pixels;},set scrollLeft(v){pixels=Math.round(v);}};
 Object.assign(view,{view:'timeline',tradition:tradition==='comparison'?'islam':tradition,timelineComparison:tradition==='comparison',states:new Map(),el:{querySelector(selector){if(selector==='.atlas-timeline-scroll')return scroll;if(!nodes.has(selector))nodes.set(selector,{textContent:'',value:'',style:{}});return nodes.get(selector);}},paintTimeline(){this.state.width=width;},searchState:{query:'peace',traditions:['judaism','islam']}});
 view.model=new TimelineModel(tradition==='comparison'?Object.entries(data.traditions).flatMap(([t,es])=>es.map(e=>({...e,tradition:t}))):data.traditions[tradition]);
 return {view,scroll,nodes};
}
for(const width of [273,343,931])for(const tradition of ['comparison','christianity','judaism','islam']){
 const {view}=makeView(width,tradition),state=view.state;Object.assign(state,{filter:'vrede',kind:'history',linkType:'shared-context',linkReligions:['judaism','islam'],connection:'iberia-1492',selected:'judaism:spain-expulsion',showConnections:false});
 for(const span of [100,500,1000]){assert(view.chooseTimelineSpan(String(span)));const p=view.sharedTimelineState();assert(Math.abs((p.end-p.start)-Math.min(span,view.model.max-view.model.min))<1e-8);assert(p.start>=view.model.min&&p.end<=view.model.max);assert.equal(state.filter,'vrede');assert.equal(state.connection,'iberia-1492');assert.deepEqual(state.linkReligions,['judaism','islam']);assert.equal(state.showConnections,false);}
 assert.equal(view.setTimelinePeriod(1450,1550,{strict:true}),null);assert.deepEqual([view.sharedTimelineState().start,view.sharedTimelineState().end],[1450,1550]);
 const url=TimelineShare.encode(view.sharedTimelineState(),'https://www.religieatlas.com/');assert.deepEqual([TimelineShare.parse(new URL(url).hash).start,TimelineShare.parse(new URL(url).hash).end],[1450,1550]);
 const before=JSON.stringify(view.sharedTimelineState());for(const [start,end] of [[0,100],[100,0],[1550,1450],[1450,1450],[1450.5,1550],[NaN,1550],[-100000,1550],[1450,100000],[1450,1451]])assert(view.setTimelinePeriod(start,end,{strict:true}),`${start} ${end}`);assert.equal(JSON.stringify(view.sharedTimelineState()),before,'Invalid dates leave the camera and selection unchanged');
 if(view.model.min<-100){assert.equal(view.setTimelinePeriod(-100,100,{strict:true}),null);assert.equal(view.sharedTimelineState().start,-100);assert.equal(view.sharedTimelineState().end,100);}
 assert(view.chooseTimelineSpan('all'));assert.equal(view.state.zoom,1);assert.deepEqual([view.sharedTimelineState().start,view.sharedTimelineState().end],[view.model.min,view.model.max]);assert.equal(view.chooseTimelineSpan('unknown'),false);
}
console.log('Timeline periods passed: 100/500/1000-year choices, all traditions, phone/desktop rounding, BCE/CE, bounds and year-zero validation, stable filters/selections and exact shared URLs.');

(async()=>{
 const view=Object.create(AtlasExplore.prototype);view.states=new Map();view.model={};let finish,applied=0,current=true;
 view.open=()=>new Promise(resolve=>finish=resolve);view.setTimelinePeriod=()=>applied++;
 const saved={view:'timeline',tradition:'judaism',comparison:true,state:{filter:'vrede'},searchState:{query:'vrede'},period:{start:1450,end:1550}};
 const pending=view.restoreNavigationState(saved,()=>current);current=false;finish();await pending;assert.equal(applied,0,'A root navigation cancels a delayed timeline camera restore');
 view.open=async()=>{};await view.restoreNavigationState(saved);assert.equal(applied,1);assert.equal(view.timelineComparison,true);assert.equal(view.state.filter,'vrede');
 console.log('Timeline return passed: saved comparison mode/filters and canceled asynchronous camera restoration.');
})().catch(error=>{console.error(error);process.exitCode=1;});
