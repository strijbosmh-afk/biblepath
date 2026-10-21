const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync('dist/data.js','utf8'),context);
const {people,relationships,meta} = context.window.BIBLE_DATA;
const ids = new Set(people.map(p=>p.id));
assert.equal(ids.size,people.length,'People must have unique IDs');
assert.equal(meta.complete,false,'Initial collection must disclose incomplete coverage');
const validRef = ref => {
  assert.ok(ref.label && ref.url,'Every reference must have a label and URL');
  const url = new URL(ref.url);
  assert.equal(url.protocol,'https:');
  assert.equal(url.hostname,'www.biblegateway.com');
  assert.ok(url.searchParams.get('search'));
};
for(const p of people){
  assert.ok(p.name && p.description && p.refs.length,`Profile incomplete: ${p.id}`);
  assert.ok(['OT','NT'].includes(p.testament));
  p.refs.forEach(validRef);
}
const edgeKeys = new Set();
const children = new Map(people.map(p=>[p.id,[]]));
for(const r of relationships){
  assert.ok(ids.has(r.source) && ids.has(r.target),'Relationship points to a missing person');
  assert.notEqual(r.source,r.target);
  assert.ok(['parent','spouse'].includes(r.type));
  validRef(r.ref);
  const key = r.type === 'spouse' ? ['spouse',...[r.source,r.target].sort()].join(':') : `${r.type}:${r.source}:${r.target}`;
  assert.ok(!edgeKeys.has(key),`Duplicate relationship: ${key}`);edgeKeys.add(key);
  if(r.type === 'parent') children.get(r.source).push(r.target);
}
const visiting = new Set(), visited = new Set();
function visit(id){
  assert.ok(!visiting.has(id),`Ancestry cycle at ${id}`);
  if(visited.has(id))return;
  visiting.add(id);children.get(id).forEach(visit);visiting.delete(id);visited.add(id);
}
people.forEach(p=>visit(p.id));
assert.ok(relationships.find(r=>r.source==='joseph-nt' && r.target==='jesus')?.note?.includes('Legal'));
console.log(`Validated ${people.length} people and ${relationships.length} sourced relationships: unique IDs, valid endpoints, no cycles, and legal-parent annotation.`);
