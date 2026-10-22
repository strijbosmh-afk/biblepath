const assert=require('node:assert/strict');
const {context,Element,people,relationships,validate}=require('./graph-geometry.cjs');
const key=edge=>edge.type==='spouse'?`spouse:${[edge.source,edge.target].sort().join(':')}`:`${edge.type}:${edge.source}:${edge.target}`;
function findPath(start,end){
  const neighbors=new Map(people.map(person=>[person.id,[]]));
  relationships.forEach(edge=>{neighbors.get(edge.source)?.push({id:edge.target,edge});neighbors.get(edge.target)?.push({id:edge.source,edge});});
  const queue=[start],previous=new Map([[start,null]]);
  for(let i=0;i<queue.length&&!previous.has(end);i++)for(const next of neighbors.get(queue[i])||[])if(!previous.has(next.id)){previous.set(next.id,{id:queue[i],edge:next.edge});queue.push(next.id);}
  assert.ok(previous.has(end),`No sample path from ${start} to ${end}`);
  const personIds=[end],edges=[];let current=end;
  while(current!==start){const prior=previous.get(current);personIds.push(prior.id);edges.push(prior.edge);current=prior.id;}
  return{personIds:personIds.reverse(),relationships:edges.reverse()};
}
const graph=new context.window.BibleGraph(new Element('div'));
const shortPath=findPath('abraham','jacob');
const contextIds=new Set([...shortPath.personIds,'sarah','hagar','rebekah','esau','rachel']);
const scene=people.filter(person=>contextIds.has(person.id));
for(const layout of ['constellation','lineage','radial']){
  graph.setData(scene,relationships,{layout,focusId:'abraham',highlightPath:shortPath});
  const state=validate(graph,`${layout}/highlight`);
  assert.equal(state.highlightedEdgeCount,shortPath.relationships.length);
  assert.equal(JSON.stringify(state.highlightPath.personIds),JSON.stringify(shortPath.personIds));
  const expected=new Set(shortPath.relationships.map(key));
  for(const route of state.routes)assert.equal(route.highlighted,expected.has(key(route)),'Only explicitly supplied path edges are highlighted');
  for(const id of shortPath.personIds)assert.ok(graph.nodes.get(id).classList.contains('is-on-path'));
  assert.equal(graph.nodes.get('abraham').getAttribute('data-path-role'),'start');
  assert.equal(graph.nodes.get('jacob').getAttribute('data-path-role'),'end');
  const pathEdges=graph.edgeLayer.children.filter(edge=>edge.classList.contains('is-on-path'));
  assert.ok(pathEdges.every(edge=>edge.getAttribute('stroke')==='#a37622'));
  assert.ok(pathEdges.every(edge=>edge.getAttribute('marker-end').includes('-path-arrow')));
  graph.select('sarah');graph.highlight('hagar');graph.highlight(null);
  assert.equal(graph.getState().highlightedEdgeCount,shortPath.relationships.length,'Selection and hover must preserve the path');
  assert.ok(pathEdges.every(edge=>edge.style.opacity==='1'&&edge.getAttribute('stroke')==='#a37622'));
  graph.setHighlightedPath(null);
  assert.equal(graph.getState().highlightPath,null);
  assert.equal(graph.getState().highlightedEdgeCount,0);
  assert.ok([...graph.nodes.values()].every(node=>!node.classList.contains('is-on-path')));
  assert.ok(graph.edgeLayer.children.every(edge=>!edge.classList.contains('is-on-path')));
  graph.setHighlightedPath(shortPath);
  const camera=graph.getState().transform;
  graph.centerOn('jacob',1.15);
  const centered=graph.getState(),point=centered.positions.jacob;
  assert.equal(centered.transform.k,1.15);
  assert.ok(Math.abs(point.x*1.15+centered.transform.x-centered.width/2)<.0001);
  assert.ok(Math.abs(point.y*1.15+centered.transform.y-centered.height/2)<.0001);
  assert.equal(centered.highlightedEdgeCount,shortPath.relationships.length);
  graph.centerOn('abraham');assert.equal(graph.getState().transform.k,1.15,'One-argument centerOn keeps zoom unchanged');
  graph.setData(scene,relationships,{layout,focusId:'abraham'});
  assert.equal(graph.getState().highlightPath,null,'Omitting path on a new scene clears highlights');
}
const longPath=findPath('adam','jesus');
assert.ok(longPath.personIds.length>40,'Long genealogy fixture must exercise serpentine layout');
const longIds=new Set([...longPath.personIds,'eve','sarah','rebekah','rachel','leah','bathsheba']);
graph.setData(people.filter(person=>longIds.has(person.id)),relationships,{layout:'constellation',focusId:'adam',highlightPath:longPath});
const longState=validate(graph,'Adam–Jesus serpentine');
assert.equal(longState.pathLayout,true);
assert.ok(longState.transform.k>.25,'Long path should fit more readably than one long genealogy column');
const points=longPath.personIds.map(id=>longState.positions[id]);
assert.ok(new Set(points.map(point=>point.y)).size>1);
for(let i=1;i<points.length;i++)assert.ok(Math.abs(Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y)-144)<.001,'Ordered path must follow adjacent serpent positions');
assert.equal(longState.highlightedEdgeCount,longPath.relationships.length);
console.log(`Persistent path styling, exact edges, endpoints, clearing, center/zoom and ${longPath.personIds.length}-person serpentine geometry passed.`);
