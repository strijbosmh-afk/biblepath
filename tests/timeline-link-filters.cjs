'use strict';
const assert=require('node:assert/strict');
const {TimelineModel,AtlasExplore}=require('../dist/explore-features.js');
const data=require('../dist/timeline-events.json'),{connections}=require('../dist/timeline-connections.json');
const religions=['christianity','judaism','islam'],events=Object.entries(data.traditions).flatMap(([tradition,es])=>es.map(e=>({...e,tradition}))),model=new TimelineModel(events);
const ids=options=>model.connectionEntries(connections,options).map(c=>c.link.id).sort();
assert.equal(ids({}).length,7);
assert.deepEqual(ids({linkType:'shared-context'}),['iberia-1492','jerusalem-sacred-site','temple-gospels']);
assert.deepEqual(ids({linkType:'influence'}),['fraternity-dialogue','greek-scriptures-gospels','jesuits-mughal-court','shoah-nostra-aetate']);
assert.deepEqual(ids({religions:['christianity','judaism']}),['greek-scriptures-gospels','shoah-nostra-aetate','temple-gospels']);
assert.deepEqual(ids({religions:['christianity','islam']}),['fraternity-dialogue','jesuits-mughal-court']);
assert.deepEqual(ids({religions:['judaism','islam']}),['iberia-1492','jerusalem-sacred-site']);
assert.deepEqual(ids({religions:['judaism','islam'],linkType:'influence'}),[]);
assert.deepEqual(ids({religions:['christianity','judaism'],linkType:'shared-context'}),['temple-gospels']);
for(const selected of [[],['islam'],['judaism'],['christianity']])assert.deepEqual(ids({religions:selected}),[],'One selected religion cannot create an interreligious line');
// Every drawing width and type/religion combination uses the same dossier filter.
for(const width of [273,343,931])for(const linkType of ['all','influence','shared-context'])for(let mask=0;mask<8;mask++){
 const selected=religions.filter((_,i)=>mask&(1<<i)),options={religions:selected,linkType};
 const actual=model.connections(connections,{width,...options});assert.deepEqual(actual.map(c=>c.link.id).sort(),ids(options));
 for(const c of actual)for(const p of c.segments){assert(selected.includes(events.find(e=>e.id===p.fromId).tradition));assert(selected.includes(events.find(e=>e.id===p.toId).tradition));}
}
// A future dossier involving three religions retains only the selected pair, with no stray third-religion segment.
const tri=new TimelineModel(religions.map((tradition,i)=>({id:tradition,tradition,start:100+i,kind:'history'})));
const pair=tri.connections([{id:'tri',type:'influence',eventIds:religions}],{width:343,religions:['judaism','islam']});
assert.equal(pair[0].segments.length,1);assert.equal(pair[0].segments[0].fromId,'judaism');assert.equal(pair[0].segments[0].toId,'islam');
// Applying filters changes lines/catalogue/selection without shifting the camera or hiding time lanes.
const view=Object.create(AtlasExplore.prototype),nodes=new Map();
function node(selector){if(!nodes.has(selector))nodes.set(selector,{style:{},dataset:{},textContent:'',innerHTML:'',value:'',checked:true,hidden:false});return nodes.get(selector);}
const boxes=religions.map(id=>({dataset:{linkReligion:id},checked:true}));
Object.assign(view,{states:new Map(),view:'timeline',tradition:'christianity',timelineComparison:true,model,data:{...data,connections},el:{contains:()=>true,querySelector:node,querySelectorAll:s=>s.endsWith(':checked')?boxes.filter(b=>b.checked):boxes},paintTimeline(){this.painted=true;}});
view.state.zoom=28;view.state.scroll=20519;view.state.filter='1492';view.state.connection='iberia-1492';
view.change({target:{id:'timeline-link-type',value:'influence',dataset:{}}});
assert.equal(view.state.connection,null);assert(node('#timeline-link-detail').hidden);assert.equal(view.state.zoom,28);assert.equal(view.state.scroll,20519);assert.equal(view.state.filter,'1492');
assert(node('.timeline-connections summary').textContent.endsWith('(4)'));assert(!node('#timeline-connection-catalog').innerHTML.includes('data-connection="3"'));
view.state.connection='jesuits-mughal-court';boxes[1].checked=false;
view.change({target:{id:'',dataset:{linkReligion:'judaism'}}});assert.deepEqual(view.state.linkReligions,['christianity','islam']);assert.equal(view.state.connection,'jesuits-mughal-court','A still-eligible dossier remains selected');
assert(node('.timeline-connections summary').textContent.endsWith('(2)'));
const oldSelection=view.state.connection;view.openTimelineConnection('iberia-1492');assert.equal(view.state.connection,oldSelection,'A stale filtered-out button cannot reopen a hidden connection');
// Shared comparison filters survive religion navigation and a visit to another feature.
view.tradition='judaism';assert.equal(view.state.linkType,'influence');assert.deepEqual(view.state.linkReligions,['christianity','islam']);
view.view='challenge';assert.equal(view.state.linkType,'all');view.view='timeline';view.timelineComparison=false;assert.equal(view.state.linkType,'all');view.timelineComparison=true;assert.equal(view.state.linkType,'influence');
view.state.showConnections=false;
view.click({target:{closest:()=>({dataset:{action:'reset-link-filters'}})}});
assert.equal(view.state.linkType,'all');assert.deepEqual(view.state.linkReligions,religions);assert(boxes.every(b=>b.checked));assert.equal(node('#timeline-link-type').value,'all');assert.equal(view.state.showConnections,false,'Resetting filters does not override the visibility checkbox');assert.equal(view.state.scroll,20519);
// Counts distinguish a filtered empty set, fewer than two religions, offscreen matches and hidden lines.
view.paintTimeline=AtlasExplore.prototype.paintTimeline;view.state.showConnections=true;view.state.linkType='influence';view.state.linkReligions=['judaism','islam'];
view.paintTimelineConnections(343,0,[]);assert(node('#timeline-link-list').innerHTML.includes('Geen verbanden voor deze filtercombinatie'));assert(node('#timeline-link-filter-status').textContent.startsWith('0 van 7'));
view.state.linkReligions=['islam'];view.paintTimelineConnections(343,0,[]);assert(node('#timeline-link-list').innerHTML.includes('Kies minstens twee religies'));
view.state.linkReligions=['christianity','islam'];view.state.zoom=28;view.paintTimelineConnections(343,0,[]);assert(node('#timeline-link-filter-status').textContent.startsWith('2 van 7'));assert(node('#timeline-link-list').innerHTML.includes('Geen verbindingen in dit tijdvak'));
view.state.showConnections=false;view.paintTimelineConnections(343,0,[]);assert(node('#timeline-link-filter-status').textContent.includes('Lijnen zijn verborgen'));
console.log('Timeline line filters passed: all types/religion combinations at phone and desktop widths, exact pair semantics, three-religion dossiers, filtered catalogue/counts, stale selection guards, retained zoom/query/position, mode/navigation retention, reset and distinct empty/hidden states.');
