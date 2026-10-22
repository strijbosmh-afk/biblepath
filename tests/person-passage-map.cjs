'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build,load,mergeTargets} = require('../scripts/build-person-passage-map.cjs');
const ROOT=path.resolve(__dirname,'..');
const actual=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/person-passage-map.json'),'utf8'));
assert.deepEqual(actual,build(),'Published map must reproduce from pinned sources and reviewed rules');
const {people,model}=load();
const get=(label,translation='ESV')=>{const r=actual.references[`atlas-${translation}|${label}`];assert(r,`Missing ${translation} ${label}`);return r;};
const compact=r=>r.targets.map(t=>[t.book,t.chapter,t.verse,t.endVerse]);
const text=r=>r.targets.flatMap(t=>{const rows=[];for(let n=t.verse;n<=t.endVerse;n++)rows.push(model.verse(t.book,t.chapter,n)?.text||'');return rows;}).join(' ');
const unique = new Set();let occurrences=0;
for(const p of people)for(const ref of p.refs||[]) {
  occurrences++;const k=`atlas-${ref.translation}|${ref.label}`;unique.add(k);
  const r=get(ref.label,ref.translation);
  assert(['mapped','partial'].includes(r.status));
  assert(r.targets.length);
  assert(actual.evidence[r.evidence],`Evidence must resolve for ${k}`);
  if(r.status==='partial')for(const locale of ['nl','en','fr'])assert(r.note?.[locale]?.length>20,`Explain partial passage in ${locale}: ${k}`);
  for(const t of r.targets) {
    assert.equal(t.edition,'catholic-nl');
    for(let n=t.verse;n<=t.endVerse;n++)assert(model.verse(t.book,t.chapter,n),`Actual target row missing for ${k}: ${n}`);
  }
}
assert.equal(occurrences,20531);assert.equal(unique.size,11290);
assert.equal(actual.meta.uniqueReferences,11443);
assert.deepEqual(actual.meta.statusCounts,{mapped:11424,partial:19,unavailable:0});
assert.deepEqual(compact(get('Daniel 3:24')),[['DAN',3,91,91]]);
assert.match(text(get('Daniel 3:24')),/Nabukodonosor.*drie mannen/);
assert.deepEqual(compact(get('Daniel 3:26')),[['DAN',3,93,93]]);
assert.match(text(get('Daniel 3:26')),/Sjadrak.*Mesjak.*Abed/i);
assert.deepEqual(compact(get('Daniel 4:1')),[['DAN',3,98,98]]);
assert.match(text(get('Daniel 4:1')),/Nabukodonosor.*volken/);
assert.deepEqual(compact(get('Daniel 4:8')),[['DAN',4,5,5]]);
assert.match(text(get('Daniel 4:8')),/Daniël/);
assert.deepEqual(compact(get('Daniel 4:37')),[['DAN',4,34,34]]);
assert.deepEqual(compact(get('Psalms 3:0')),[['PSA',3,1,1]]);
assert.match(text(get('Psalms 3:0')),/David.*Absalom/);
assert.deepEqual(compact(get('Psalms 51:0')),[['PSA',51,1,1]]);
assert.match(text(get('Psalms 51:0')),/David.*Natan.*Bat/);
assert.deepEqual(compact(get('Romans 16:27')),[['ROM',16,27,27]]);
assert.match(text(get('Romans 16:27')),/Jesus Christus/);
assert.deepEqual(compact(get('Philippians 1:17')),[['PHP',1,17,17]]);
assert.match(text(get('Philippians 1:17')),/partijzucht/);
assert.deepEqual(compact(get('Acts 13:39')),[['ACT',13,38,39]]);
assert.match(text(get('Acts 13:39')),/Moses/,'Source clause about Moses must not disappear at a translated verse boundary');
assert.equal(get('Hosea 6:7').status,'partial');
assert.equal(get('1 Kings 4:4').status,'partial');
assert.equal(get('Isaiah 2:1').status,'partial');
assert.match(get('Isaiah 2:1').note.nl,/geen afzonderlijke verszin/);
const supplement=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/catholic-people.json'),'utf8'));
let catholicOccurrences=0;
for(const p of supplement.people)for(const ref of p.refs) {
  catholicOccurrences++;
  const r=actual.references[`catholic|${ref.label}`];assert(r);
  assert(actual.evidence[r.evidence]);
  for(const t of r.targets)for(let n=t.verse;n<=t.endVerse;n++)assert(model.verse(t.book,t.chapter,n)?.text.replace(/[-–—\s]/g,''));
}
assert.equal(catholicOccurrences,176);
for(const [label,expected] of [
  ['Sirach 50:29-31',[['SIR',50,27,29]]],['Sirach 49:13',[['SIR',49,11,11]]],
  ['Baruch 6:1-2',[['BAR',6,2,3]]],['Judith 4:5-10',[['JDT',4,5,11]]],
  ['1 Maccabees 1:11',[['1MA',1,10,10]]],['1 Maccabees 1:43-57',[['1MA',1,41,54]]],
  ['1 Maccabees 3:32-35',[['1MA',3,32,36]]],['2 Maccabees 2:24-29',[['2MA',2,23,28]]]
])assert.deepEqual(compact(actual.references[`catholic|${label}`]),expected,label);
assert.equal(actual.references['catholic|Sirach 44:16'].status,'partial');
// Cross-chapter target passages must never be collapsed into one chapter.
const t=(chapter,verse,endVerse=verse)=>({edition:'catholic-nl',book:'DAN',chapter,verse,endVerse});
assert.deepEqual(mergeTargets([t(3,99),t(3,100),t(4,1),t(4,2)]),[t(3,99,100),t(4,1,2)]);
// Explicitly reviewed exceptional rules are retained even if not currently
// cited by a person, to prevent rediscovery from turning into number guessing.
const rules=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts/atlas-versification-rules.json'),'utf8'));
assert.deepEqual(compact(rules.reviewed['KJV|PHP.1:16']),[['PHP',1,17,17]]);
assert.deepEqual(compact(rules.reviewed['KJV|PHP.1:17']),[['PHP',1,16,16]]);
assert.equal(rules.reviewed['PSA.84:9'].status,'partial');
assert.deepEqual(compact(rules.reviewed['PSA.84:10']),[['PSA',84,9,10]]);
assert.equal(rules.reviewed['MRK.9:44'].status,'partial');
assert.deepEqual(compact(rules.reviewed['MRK.9:44']),[['MRK',9,43,48]]);
console.log(`Person passage map: ${occurrences+catholicOccurrences} source references, ${actual.meta.uniqueReferences} edition-specific mappings, semantic regressions and reproducibility passed.`);
