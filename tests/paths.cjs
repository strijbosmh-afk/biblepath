const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'..'), context = {window:{}};
vm.createContext(context);
for (const file of ['data.js','paths.js']) vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),context);
const {BIBLE_DATA:data,BiblePaths:Model} = context.window;
const model = new Model(data), snapshot = JSON.stringify(data);
const values = array => Array.from(array);

function exactPath(result,sourceData) {
  assert.equal(result.people.length,result.personIds.length);
  assert.equal(result.relationships.length,result.steps.length);
  assert.equal(result.personIds.length,result.steps.length+1);
  assert.equal(result.indexedCount+result.verseCount,result.steps.length);
  assert.equal(new Set(result.personIds).size,result.personIds.length,'A path cannot repeat an individual');
  for (let i=0;i<result.people.length;i++) assert.strictEqual(result.people[i],sourceData.people.find(person => person.id === result.personIds[i]),'Return original person objects');
  for (let i=0;i<result.steps.length;i++) {
    const step = result.steps[i], edge = step.edge;
    assert.equal(step.fromId,result.personIds[i]);assert.equal(step.toId,result.personIds[i+1]);
    assert.strictEqual(result.relationships[i],edge);
    assert.ok(sourceData.relationships.includes(edge),'Every step must be an existing source edge');
    if (step.direction === 'parent-to-child') {
      assert.equal(edge.type,'parent');assert.equal(edge.source,step.fromId);assert.equal(edge.target,step.toId);
    } else if (step.direction === 'child-to-parent') {
      assert.equal(edge.type,'parent');assert.equal(edge.target,step.fromId);assert.equal(edge.source,step.toId);
    } else {
      assert.equal(step.direction,'spouse');assert.equal(edge.type,'spouse');
      assert.ok((edge.source === step.fromId && edge.target === step.toId) || (edge.target === step.fromId && edge.source === step.toId));
    }
  }
}

const genealogy = model.find('adam','jesus');
assert.equal(genealogy.status,'found');assert.equal(genealogy.kind,'ancestry');
assert.equal(genealogy.people.length,64);assert.equal(genealogy.steps.length,63);
assert.equal(genealogy.indexedCount,0);assert.equal(genealogy.verseCount,63);
assert.ok(genealogy.steps.every(step => step.direction === 'parent-to-child'));
assert.deepEqual(values(genealogy.personIds.slice(-2)),['joseph-nt','jesus']);
assert.match(genealogy.steps.at(-1).edge.note,/Legal parent, not biological father/);
exactPath(genealogy,data);
assert.deepEqual(values(model.find('adam','jesus',{scriptureOnly:true}).personIds),values(genealogy.personIds));

const reverse = model.find('jesus','adam');
assert.equal(reverse.kind,'reverse-ancestry');assert.equal(reverse.steps.length,63);
assert.ok(reverse.steps.every(step => step.direction === 'child-to-parent'));
assert.deepEqual(values(reverse.personIds),values(genealogy.personIds).reverse());exactPath(reverse,data);

const siblings = model.find('cain','abel');
assert.equal(siblings.kind,'family');assert.equal(siblings.steps.length,2);
assert.deepEqual(values(siblings.steps.map(step => step.direction)),['child-to-parent','parent-to-child']);exactPath(siblings,data);
const marriage = model.find('abraham','sarah');
assert.equal(marriage.kind,'family');assert.equal(marriage.steps.length,1);assert.equal(marriage.steps[0].direction,'spouse');exactPath(marriage,data);
assert.ok(model.find('abraham','sarah',{spouses:false}).relationships.every(edge => edge.type !== 'spouse'));
const same = model.find('jesus','jesus');
assert.equal(same.status,'same');assert.equal(same.kind,'same');assert.deepEqual(values(same.personIds),['jesus']);exactPath(same,data);
const linked = new Set(data.relationships.flatMap(edge => [edge.source,edge.target]));
const isolated = data.people.find(person => !linked.has(person.id));assert.ok(isolated);
const unconnected = model.find('adam',isolated.id);
assert.equal(unconnected.status,'unconnected');assert.equal(unconnected.people.length,0);assert.equal(unconnected.steps.length,0);
for (const ids of [['missing','jesus'],['adam','missing'],['missing','missing']]) {
  const result = model.find(...ids);assert.equal(result.status,'invalid');assert.equal(result.personIds.length,0);assert.equal(result.relationships.length,0);
}

const person = id => ({id,name:id});
const edge = (source,target,type='parent',provenance='verse') => ({source,target,type,provenance,evidence:{kind:provenance === 'verse' ? 'verse' : 'index'},ref:{label:`${source} to ${target}`,url:`https://example.com/${source}/${target}`},note:'Original source note'});
const fixture = {people:['a','b','c','d','e','f','isolated'].map(person),relationships:[
  edge('a','b','parent','indexed'),edge('b','d'), // Short, partially indexed ancestry.
  edge('a','c'),edge('c','e'),edge('e','d'), // Longer, entirely verse-backed ancestry.
  edge('a','d','spouse'),edge('b','f','spouse','indexed')
]};
const fixtureModel = new Model(fixture);
const indexedRoute = fixtureModel.find('a','d');
assert.equal(indexedRoute.kind,'ancestry','Ancestry takes precedence over a marriage shortcut');
assert.deepEqual(values(indexedRoute.personIds),['a','b','d']);assert.equal(indexedRoute.indexedCount,1);exactPath(indexedRoute,fixture);
const scriptureRoute = fixtureModel.find('a','d',{scriptureOnly:true});
assert.deepEqual(values(scriptureRoute.personIds),['a','c','e','d']);assert.equal(scriptureRoute.indexedCount,0);exactPath(scriptureRoute,fixture);
assert.equal(fixtureModel.find('b','f',{scriptureOnly:true}).status,'unconnected');
assert.equal(fixtureModel.find('b','f',{spouses:false}).status,'unconnected');
assert.equal(fixtureModel.find('b','f').steps[0].direction,'spouse');
assert.equal(fixtureModel.find('a','isolated').status,'unconnected');

// Equal-hop quality must compare the entire path, not only the first edge.
const tieFixture = {people:['s','a','b','c','d','t'].map(person),relationships:[
  edge('s','a'),edge('a','c','parent','indexed'),edge('c','t','parent','indexed'),
  edge('s','b','parent','indexed'),edge('b','d'),edge('d','t')
]};
const tie = new Model(tieFixture).find('s','t');
assert.deepEqual(values(tie.personIds),['s','b','d','t']);assert.equal(tie.indexedCount,1);exactPath(tie,tieFixture);
// The same tie rule applies to mixed family routes.
tieFixture.relationships[1] = edge('c','a','parent','indexed');
tieFixture.relationships[4] = edge('d','b');
const familyTie = new Model(tieFixture).find('s','t');
assert.equal(familyTie.kind,'family');assert.deepEqual(values(familyTie.personIds),['s','b','d','t']);exactPath(familyTie,tieFixture);

const unknown = {people:['a','b'].map(person),relationships:[{source:'a',target:'b',type:'parent'}]};
assert.equal(new Model(unknown).find('a','b',{scriptureOnly:true}).status,'unconnected','Missing provenance cannot count as scripture-verified');
assert.equal(JSON.stringify(data),snapshot,'Path queries must not mutate data, sources, or notes');
console.log(`Paths passed: ${data.people.length} indexed people; Adam → Jesus has 64 people / 63 sourced steps, with ancestry, reverse ancestry, family, provenance filters, shortest paths, and source identity verified.`);
