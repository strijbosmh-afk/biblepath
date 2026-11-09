'use strict';
const assert=require('node:assert/strict'),{AtlasExplore,TimelineModel}=require('../dist/explore-features.js');
const view=Object.create(AtlasExplore.prototype);view.states=new Map();view.view='timeline';view.tradition='christianity';view.queueTimeline=()=>{};
let zooms=[],captured=[];view.zoomTimeline=(...args)=>zooms.push(args);
const canvas={clientWidth:400,scrollWidth:2000,scrollLeft:300,setPointerCapture:id=>captured.push(id),getBoundingClientRect:()=>({left:20})};view.bindTimelineGestures(canvas);
const card={closest:selector=>selector==='.atlas-timeline-event'?card:null};
function point(id,x,y=100){return {pointerId:id,clientX:x,clientY:y,button:0,target:card,cancelable:true,preventDefault(){this.prevented=true}}}
canvas.onpointerdown(point(1,250));const drag=point(1,170,101);canvas.onpointermove(drag);assert.equal(canvas.scrollLeft,380,'Dragging starts on the event card itself');assert(drag.prevented);assert(captured.includes(1));canvas.onpointerup(point(1,170));
const accidental={detail:1,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};canvas.onclick(accidental);assert(accidental.prevented&&accidental.stopped,'A drag must not accidentally open the card');
canvas.onpointerdown(point(2,180));canvas.onpointerup(point(2,180));const tap={detail:1,preventDefault(){this.prevented=true},stopPropagation(){}};canvas.onclick(tap);assert(!tap.prevented,'A stationary tap remains a normal selection');
canvas.onpointerdown(point(3,180,100));const vertical=point(3,182,180);canvas.onpointermove(vertical);assert(!vertical.prevented,'A vertical touch gesture stays available for page scrolling');assert.equal(canvas.scrollLeft,380);canvas.onpointercancel(point(3,182,180));
canvas.onpointerdown(point(4,100,100));canvas.onpointerdown(point(5,100,200));canvas.onpointermove(point(5,100,300));assert.equal(zooms.at(-1)[0],2,'Vertical finger separation must pinch-zoom as well as horizontal separation');assert.equal(zooms.at(-1)[1],80);canvas.onpointerup(point(4,100,100));canvas.onpointerup(point(5,100,300));
function wheel(deltaY,deltaMode=0,deltaX=0){return {deltaY,deltaMode,deltaX,ctrlKey:false,preventDefault(){this.prevented=true}}}
canvas.scrollWidth=400;canvas.scrollLeft=0;const overview=wheel(100);canvas.onwheel(overview);assert(!overview.prevented,'Overview must not trap vertical page scrolling');
view.state.zoom=2;
canvas.scrollWidth=2000;canvas.scrollLeft=1600;const edge=wheel(100);canvas.onwheel(edge);assert(!edge.prevented,'At the end of the line the page can scroll again');
canvas.scrollLeft=100;const lines=wheel(3,1);canvas.onwheel(lines);assert(lines.prevented);assert.equal(canvas.scrollLeft,148,'Line-based wheels are converted to useful horizontal travel');
const horizontal=wheel(1,0,20);canvas.onwheel(horizontal);assert(!horizontal.prevented,'Native horizontal trackpad travel stays native');
canvas.scrollLeft=200;canvas.onkeydown({target:card,key:'ArrowRight',preventDefault(){}});assert.equal(canvas.scrollLeft,450,'Keyboard navigation also works while an event card has focus');
// Zoom retains the year beneath the chosen pointer/centre anchor.
const zoomView=Object.create(AtlasExplore.prototype);zoomView.states=new Map();zoomView.view='timeline';zoomView.tradition='christianity';zoomView.state.zoom=3;
const camera={clientWidth:400,scrollLeft:300},anchor=100,before=(camera.scrollLeft+anchor)/zoomView.state.zoom;
zoomView.el={querySelector:()=>camera};zoomView.paintTimeline=()=>{};zoomView.zoomTimeline(1.5,anchor);assert(Math.abs((camera.scrollLeft+anchor)/zoomView.state.zoom-before)<1e-8);zoomView.zoomTimeline(2/3,anchor);assert.equal(camera.scrollLeft,300);
// Resizing preserves the visible period, and unchanged paints preserve card DOM.
const model=new TimelineModel([{id:'a',start:-600,title:'A',kind:'history'},{id:'b',start:2000,title:'B',kind:'history'}]),nodes=new Map();let writes=0;
const items={contains:()=>false,_html:'',set innerHTML(s){writes++;this._html=s},get innerHTML(){return this._html}};
const viewport={clientWidth:800,scrollLeft:600,focus(){}};nodes.set('.atlas-timeline-scroll',viewport);nodes.set('.atlas-timeline-items',items);
const cameraView=Object.create(AtlasExplore.prototype);cameraView.states=new Map();cameraView.view='timeline';cameraView.tradition='christianity';cameraView.state.zoom=4;cameraView.state.scroll=600;cameraView.model=model;
cameraView.el={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{style:{}});return nodes.get(selector)}};
cameraView.paintTimeline();const period=nodes.get('#timeline-period').textContent,paintCount=writes;cameraView.paintTimeline();assert.equal(writes,paintCount,'Identical scroll frames do not recreate focused cards');viewport.clientWidth=400;cameraView.paintTimeline();assert.equal(nodes.get('#timeline-period').textContent,period,'Desktop-to-phone resize retains the same historical period');
// Every visible context includes the event, named roles and impact, with safe markup.
const data=require('../dist/timeline-events.json');let checked=0;
for(const faith of ['christianity','judaism','islam'])for(const e of [...data.traditions[faith],...data.undated[faith]]){assert(e.what.length>80&&e.faithImpact.length>80);assert(e.stakeholders.length>=2);for(const s of e.stakeholders)assert(s.name&&s.role.length>12);checked++;}
const selected=data.traditions.christianity.find(e=>e.id==='christianity:vatican2')||data.traditions.christianity[0],detail={};
const contextView=Object.create(AtlasExplore.prototype);contextView.states=new Map();contextView.view='timeline';contextView.tradition='christianity';contextView.state.selected=selected.id;contextView.model=new TimelineModel([selected]);contextView.passages=[];contextView.el={querySelector:()=>detail};contextView.renderTimelineDetail();
for(const label of ['Wat gebeurde er?','Wie waren betrokken?','Betekenis voor geloof en praktijk','Terug naar de tijdslijn'])assert(detail.innerHTML.includes(label));assert(detail.innerHTML.includes(selected.stakeholders[0].name));assert(contextView.stakeholders({stakeholders:[{name:'<img>',role:'<script>'}]}).includes('&lt;img&gt;'));
console.log(`Timeline interaction passed: card dragging, tap protection, vertical page travel, two-axis pinch, wheel modes/edges, keyboard, anchored zoom, resize, stable DOM and ${checked} complete contexts.`);
// Leaving a cold/partial search invalidates its response; returning must resume it.
(async()=>{
 const pendingView=Object.create(AtlasExplore.prototype);Object.assign(pendingView,{view:'topics',tradition:'christianity',language:'nl',request:0,searchId:4,searchPending:true,loaded:true,el:{hidden:false,childElementCount:1}});
 const resumed=[];pendingView.runSearch=options=>resumed.push(options);pendingView.leave();await pendingView.open('topics','christianity');assert.deepEqual(resumed,[{keepResults:true}],'Returning to a pending query must resume the latest request while retaining its visible theme cards');
 pendingView.searchPending=false;await pendingView.open('topics','christianity');assert.equal(resumed.length,1,'A completed search is retained without unnecessary reruns');
 console.log('Search lifecycle passed: returning resumes pending/partial queries and retains completed results.');
})().catch(e=>{console.error(e);process.exitCode=1});
