const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const related=require('../dist/related-exploration.js'),read=name=>JSON.parse(fs.readFileSync('dist/'+name+'.json','utf8'));
const c={window:{}};vm.runInNewContext(fs.readFileSync('dist/data.js','utf8'),c);
const timeline=read('timeline-events');let count=0,links=0;
for(const tradition of ['christianity','judaism','islam']){
 const data=read('festivals-'+tradition),atlas=tradition==='christianity'?null:read('tradition-atlas-'+tradition);
 const people=new Set(tradition==='christianity'?c.window.BIBLE_DATA.people.map(p=>p.id):[...atlas.people.map(p=>p.id),...read(tradition==='judaism'?'torah-people':'quran-people').people.map(p=>p.id)]);
 const places=new Set((atlas||read('places-data')).places.map(p=>p.id)),events=new Set(timeline.traditions[tradition].map(e=>e.id)),festivals=new Set(data.entries.map(e=>e.id));
 for(const entry of data.entries){count++;assert(related.entries[entry.id],entry.id);const rows=related.linksFor(entry);assert(rows.length,entry.id);links+=rows.length;
  rows.forEach((link,i)=>{assert.equal(link.tradition,tradition);assert.deepEqual(related.resolve(entry,i),link);if(link.type==='people')assert(people.has(link.id),link.id);else if(link.type==='places')assert(places.has(link.id),link.id);else if(link.type==='events')assert(events.has(link.id),link.id);else if(link.type==='festivals')assert(festivals.has(link.id),link.id);else {assert.equal(link.type,'passage');assert(entry.references.some(r=>r.id===link.id&&r.passage));assert.equal(link.passage.tradition,tradition);}});
  assert.equal(related.resolve(entry,-1),null);assert.equal(related.resolve(entry,900),null);assert.equal(related.resolve(entry,.5),null);assert.match(related.render(entry),/data-festival-explore/);
 }
}
assert.equal(count,22);assert.equal(Object.keys(related.entries).length,count);
assert(!related.linksFor(read('festivals-judaism').entries.find(e=>e.id==='judaism:hanukkah')).some(x=>x.type==='passage'),'No invented Tanakh passage for Hanukkah');
assert(!related.entries['islam:eid-al-adha'].some(x=>x.id==='islam:ishmael'),'The unnamed offered son is not silently identified');
const malicious={id:'missing',tradition:'judaism',references:[{id:'x',label:{nl:'<script>x</script>'},passage:{tradition:'judaism'}}]};assert(!related.render(malicious).includes('<script>'));assert.match(related.render(malicious),/&lt;script/);
console.log(`Related exploration passed: ${count} dossiers and ${links} source-bound links; every religious identity, place, event and dossier exists, with safe markup and no inferred cross-canon references.`);
