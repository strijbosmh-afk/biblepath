'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../dist/data.js'),'utf8'),context);
const {people,relationships,meta}=context.window.BIBLE_DATA;
assert.ok(people.length>=2900,'Expanded index must retain broad human coverage');
const ids=new Set(people.map(p=>p.id));
assert.equal(ids.size,people.length,'No duplicate person IDs');
assert.equal(meta.complete,false,'Do not claim exhaustive biblical coverage');
const sourceKeys=new Set(),edges=new Set(),children=new Map(people.map(p=>[p.id,[]]));
for(const person of people){
  assert.ok(person.name && person.description && person.refs.length && person.disambiguation);
  assert.ok(['male','female'].includes(person.gender));
  assert.ok(['OT','NT'].includes(person.testament));
  assert.ok(!/Unnamed#|_/.test(person.name),'Synthetic bridge record leaked into human index');
  assert.ok(person.source.record && person.source.url && person.source.commit);
  assert.ok(!sourceKeys.has(person.source.record),'Duplicate source identity');sourceKeys.add(person.source.record);
  assert.equal(person.referenceCount,person.refs.length);
  for(const ref of person.refs){
    const url=new URL(ref.url);
    assert.equal(url.protocol,'https:');assert.equal(url.hostname,'www.biblegateway.com');
    assert.ok(url.searchParams.get('search'));
    assert.ok(['verse','indexed-name'].includes(ref.provenance));
  }
}
for(const edge of relationships){
  assert.ok(ids.has(edge.source) && ids.has(edge.target),'Dangling relation endpoint');
  assert.notEqual(edge.source,edge.target);
  assert.ok(['parent','spouse'].includes(edge.type));
  const key=edge.type==='spouse' ? `spouse:${[edge.source,edge.target].sort().join(':')}` : `parent:${edge.source}:${edge.target}`;
  assert.ok(!edges.has(key),`Duplicate relation ${key}`);edges.add(key);
  const url=new URL(edge.ref.url);
  if(edge.provenance==='indexed'){
    assert.equal(url.hostname,'github.com');assert.equal(edge.ref.label,'STEP Bible relationship index');
    assert.equal(edge.evidence.kind,'index');assert.ok(/#L\d+$/.test(edge.ref.url));
  }else{assert.equal(edge.provenance,'verse');assert.equal(url.hostname,'www.biblegateway.com');}
  if(edge.type==='parent')children.get(edge.source).push(edge.target);
}
const visited=new Set(),visiting=new Set();
function visit(id){
  assert.ok(!visiting.has(id),`Ancestry cycle at ${id}`);
  if(visited.has(id))return;
  visiting.add(id);children.get(id).forEach(visit);visiting.delete(id);visited.add(id);
}
people.forEach(p=>visit(p.id));
assert.equal(relationships.filter(r=>r.type==='parent' && r.target==='jesus').length,2);
assert.ok(relationships.find(r=>r.source==='joseph-nt' && r.target==='jesus').note.includes('Legal'));
assert.ok(!relationships.some(r=>r.type==='parent' && r.target==='mary'),'Mary must not receive speculative biological parents');
assert.ok(!ids.has('step-H5176I'),'The disputed Nahash-as-Jesse’s-wife identity must not leak into the map');
assert.ok(!relationships.some(r=>r.type==='spouse' && new Set([r.source,r.target]).has('judah') && new Set([r.source,r.target]).has('tamar')));
for(const id of ['abraham','david','jesus','john-baptist','uzziah'])assert.ok(ids.has(id),`Curated identity missing: ${id}`);
console.log(`PASS: ${people.length} people, ${relationships.length} relationships. Identity, provenance, refs, endpoints, duplicate edges, ancestry cycles, and sensitive genealogy checks passed.`);
