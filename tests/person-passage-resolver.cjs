'use strict';
const assert = require('node:assert/strict');
const {PersonPassageMap} = require('../dist/person-passage-map.js');
const target = (chapter,verse,endVerse=verse) => ({book:'DAN',chapter,verse,endVerse,edition:'catholic-nl'});
const fixture = {meta:{targetEdition:'catholic-nl'},references:{
  'atlas|Daniel 4:1-4':{status:'mapped',targets:[target(3,98,100),target(4,1)]},
  'catholic|Daniel 4:1-4':{status:'mapped',targets:[target(4,1,4)]},
  'atlas-KJV|Philippians 1:16':{status:'mapped',targets:[{...target(1,17),book:'PHP'}]},
  'atlas-ESV|Philippians 1:16':{status:'mapped',targets:[{...target(1,16),book:'PHP'}]},
  'atlas|Mark 9:44':{status:'unavailable',targets:[]}
}};
const map = new PersonPassageMap(fixture);
const ref = {label:'Daniel 4:1-4',url:'https://example.org/source'};
const original = structuredClone(ref), result = map.resolve(ref);
assert.deepEqual(result.targets,[target(3,98,100),target(4,1)]);
assert.deepEqual(ref,original,'The source citation must not be rewritten');
assert.equal(result.sourceUrl,ref.url);
assert.deepEqual(map.resolve({...ref,edition:'catholic'}).targets,[target(4,1,4)],'The same numbers can mean a different passage in another edition');
assert.equal(map.resolve({...ref,edition:'he'}).status,'unavailable','Never reuse atlas numbers for an unknown source tradition');
assert.equal(map.resolve('Daniel 4:5').status,'unavailable','A valid-looking but unreviewed reference must not be guessed');
assert.equal(map.resolve('Mark 9:44').targets.length,0);
assert.equal(map.resolve({label:'Philippians 1:16',translation:'KJV'}).targets[0].verse,17);
assert.equal(map.resolve({label:'Philippians 1:16',translation:'ESV'}).targets[0].verse,16);
assert.equal(map.resolve({label:'Philippians 1:16',translation:'NIV'}).status,'unavailable');
assert.equal(map.resolve({...ref,translation:'KJV'}).status,'unavailable','An explicit translation cannot fall back to an unspecified edition');
assert.deepEqual(map.resolve('  Daniel  4:1–4 ').targets,result.targets,'Typographic range separators do not change the source reference');
result.targets[0].verse=1;
assert.equal(map.resolve(ref).targets[0].verse,98,'Reader state must not mutate the reviewed mapping');
assert.throws(()=>new PersonPassageMap({meta:{targetEdition:'catholic'},references:{}}));
for (const invalid of [
  {status:'mapped',targets:[]},
  {status:'unavailable',targets:[target(1,1)]},
  {status:'mapped',targets:[{...target(1,1),edition:'catholic'}]},
  {status:'mapped',targets:[target(1,5,2)]},
  {status:'mapped',targets:[target(0,1)]}
]) assert.throws(()=>new PersonPassageMap({meta:fixture.meta,references:{'atlas|Daniel 1:1':invalid}}));
console.log('Person passage resolver passed: edition isolation, split passages, immutable citations, unavailable references and invalid-data rejection.');
