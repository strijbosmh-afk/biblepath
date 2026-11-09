'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),file=path.join(dir,'dist/timeline-events.json'),data=JSON.parse(fs.readFileSync(file,'utf8'));
let count=0;
for(const faith of ['christianity','judaism','islam']){
 const context=JSON.parse(fs.readFileSync(path.join(dir,`docs/timeline-context-${faith}.json`),'utf8')),entries=[...data.traditions[faith],...data.undated[faith]];
 assert.equal(Object.keys(context).length,entries.length);
 for(const e of entries){const extra=context[e.id];assert(extra,`Missing ${e.id}`);assert(extra.what?.length>80&&extra.faithImpact?.length>80);assert(extra.stakeholders?.length>=2);for(const s of extra.stakeholders)assert(s.name&&s.role?.length>12);
  const sources=new Map(e.sources.map(s=>[s.url,s]));for(const s of extra.sources||[]){assert(new URL(s.url).protocol==='https:');if(!sources.has(s.url))sources.set(s.url,s);}
  Object.assign(e,{what:extra.what,stakeholders:extra.stakeholders,faithImpact:extra.faithImpact,...(extra.nuance?{nuance:extra.nuance}:{}),sources:[...sources.values()]});count++;
 }
}
data.meta.contextNote='Elk moment beschrijft de gebeurtenis, betrokkenen en hun rollen, en betekenis voor geloof en praktijk. Historische duiding is redactioneel en houdt rekening met interne diversiteit en onzekerheid.';
const output=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),output,'Timeline context needs regeneration');else fs.writeFileSync(file,output);
console.log(`${count} timeline items have sourced events, stakeholders and religious impact.`);
