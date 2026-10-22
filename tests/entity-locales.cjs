'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {build,load,curated,reference}=require('../scripts/build-entity-locales.cjs');
const root=path.resolve(__dirname,'..');
const {data,placeData}=load();
const before=JSON.stringify({data,placeData});
const generated=build(data,placeData);
assert.equal(JSON.stringify({data,placeData}),before,'Translation does not mutate source data');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/entity-locales.js'),'utf8'),context);
const output=JSON.parse(JSON.stringify(context.window.BIBLE_ENTITY_LOCALES));
assert.deepEqual(output,generated,'Published sidecar matches deterministic generator');
assert.equal(data.people.filter(p=>p.profileOrigin==='curated').length,157);
assert.deepEqual(Object.keys(curated).sort(),data.people.filter(p=>p.profileOrigin==='curated').map(p=>p.id).sort(),'Every curated profile has individually reviewed copy');
const englishLeak=/\b(?:living at|living before|Son of|Daughter of|Indexed at|records him|records her|Named in|A biblical settlement|The STEP entry|The source combines|No modern location|Source:|firstborn son|his brother|her husband|his legal father|royal family line)\b/;
for(const lang of ['nl','fr']){
  assert.deepEqual(Object.keys(output[lang].people).sort(),data.people.map(p=>p.id).sort());
  assert.deepEqual(Object.keys(output[lang].places).sort(),placeData.places.map(p=>p.id).sort());
  for(const [kind,entities] of [['people',data.people],['places',placeData.places]])for(const entity of entities){
    const patch=output[lang][kind][entity.id];
    for(const key of ['name','description','disambiguation'])assert.equal(typeof patch[key],'string',`${lang} ${entity.id}: ${key}`);
    assert(patch.name&&patch.description&&patch.disambiguation);
    assert.notEqual(patch.description,entity.description,`${lang} ${entity.id} has translated description`);
    assert(!Object.keys(patch).some(key=>['id','refs','allReferences','source','gender','testament','testaments','classification'].includes(key)),'Canonical identities and source fields are not patched');
    assert(patch.aliases.includes(entity.name),'Original name remains searchable');
    for(const alias of entity.aliases||[])assert(patch.aliases.includes(alias),'Original aliases remain searchable');
    assert.equal(new Set(patch.aliases).size,patch.aliases.length);
    assert(Array.isArray(patch.displayAliases));
    assert.equal(new Set(patch.displayAliases).size,patch.displayAliases.length);
    assert(!patch.displayAliases.includes(patch.name),'Do not repeat the display name as an alias');
    for(const alias of patch.displayAliases)assert(patch.aliases.includes(alias),'Displayed aliases remain searchable');
    assert.equal(patch.notes.length,(entity.notes||[]).length,'All caveats translated, none dropped');
    for(let i=0;i<patch.notes.length;i++)assert.notEqual(patch.notes[i],entity.notes[i]);
    for(const text of [patch.description,patch.disambiguation,...patch.notes]){
      assert(!englishLeak.test(text),`${lang} ${entity.id} English prose leak: ${text}`);
      assert(!/undefined|\[object Object\]|\uFFFD|<[^>]+>/.test(text),'No broken interpolation, encoding or markup');
      assert(!/\.L’index/.test(text),'French sentences have a separating space');
    }
    if(kind==='people'){
      assert(patch.era);
      assert(Array.isArray(patch.displayAliases));
      assert.equal(new Set(patch.displayAliases).size,patch.displayAliases.length);
      assert(!patch.displayAliases.includes(patch.name),'Do not repeat the display name as an alias');
      for(const alias of patch.displayAliases)assert(patch.aliases.includes(alias),'Displayed aliases remain searchable');
      assert(!patch.displayAliases.some(alias=>['wielded','imperial','sons','men','weary God','second','steward','valor','tribute','great'].includes(alias)),'Non-name gloss fragments hidden from profiles');
      if(entity.profileOrigin==='curated')assert.equal(patch.description,curated[entity.id][lang]);
      if(entity.description.includes('The STEP Bible index records'))assert(patch.description.includes(lang==='nl'?'De STEP Bible-index vermeldt':'L’index STEP Bible'),'Indexed relationship provenance retained');
    }else{
      const canonicalRefs=new Set(entity.refs.map(ref=>ref.label));
      for(const form of patch.nameForms)for(const ref of form.refs)assert(canonicalRefs.has(ref),'Localized name forms retain canonical reference keys');
      for(const form of entity.nameForms)assert(patch.nameForms.some(local=>local.name===form.name&&form.refs.every(ref=>local.refs.includes(ref))),'All original name forms preserved');
    }
  }
}
assert.equal(output.nl.people.moses.name,'Mozes');assert.equal(output.fr.people.moses.name,'Moïse');
assert.equal(output.nl.people.peter.name,'Petrus');assert.equal(output.fr.people.peter.name,'Pierre');
assert.equal(output.fr.people.mary.name,'Marie');assert.equal(output.nl.people.jacob.name,'Jakob');
assert(output.nl.people.isaac.aliases.includes('Izak'));assert(output.fr.people.perez.aliases.includes('Pharès'));
assert(output.nl.people.perez.aliases.includes('Fares'));assert(output.nl.people.boaz.aliases.includes('Boöz'));
assert(output.nl.people.jesus.aliases.includes('Christus'));assert(output.fr.people.jesus.aliases.includes('Christ'));
assert.equal(output.fr.people.abel.disambiguation,'Fils d’Adam et d’Ève');
assert.equal(output.fr.people.aaron.disambiguation,'Fils d’Amram et de Jokébed');
assert.equal(output.nl.people.jesus.disambiguation,'Zoon van Maria · Jozef is zijn wettelijke vader');
assert.equal(output.fr.people.jesus.disambiguation,'Fils de Marie · Joseph est son père légal');
assert.deepEqual(output.nl.people.jesus.displayAliases,['Jezus Christus','Christus','Messias','Immanuël']);
assert.deepEqual(output.fr.people.jesus.displayAliases,['Jésus-Christ','Christ','Messie','Emmanuel']);
assert(output.nl.people.jesus.aliases.includes('Jesus Christ'),'Original alias retained for search');
assert(output.fr.people.jesus.aliases.includes('Messiah'),'Original alias retained for search');
assert(output.nl.people.peter.displayAliases.includes('Simon Petrus'));
assert(output.fr.people.peter.displayAliases.includes('Simon Pierre'));
assert(output.fr.people.james.displayAliases.includes('Jacques, fils de Zébédée'));
assert(output.nl.people.john.displayAliases.includes('Johannes, zoon van Zebedeüs'));
assert.match(output.fr.people['joseph-nt'].description,/père légal.+non son père biologique/);
assert.match(output.nl.people['joseph-nt'].description,/wettelijke vader.+niet zijn biologische vader/);
assert.match(output.fr.people.rahab.notes[0],/ne le dit pas explicitement/);
assert.match(output.nl.people.shelah.notes[0],/sommige teksttradities/);
assert.equal(reference('1 Kings 16:24','nl'),'1 Koningen 16:24');
assert.equal(reference('John 2:1','fr'),'Jean 2:1');
const cana=placeData.places.find(p=>p.name==='Cana'),kanah=placeData.places.find(p=>p.name==='Kanah');
const jerusalem=placeData.places.find(p=>p.name==='Jerusalem');
assert.deepEqual(output.nl.places[jerusalem.id].displayAliases,['Ariël','Beüla','Chefsiba','Jebus','Salem','Sion']);
assert.deepEqual(output.fr.places[jerusalem.id].displayAliases,['Ariel','Beulah','Hephziba','Jébus','Salem','Sion']);
assert(output.nl.places[jerusalem.id].aliases.includes('Jerusalem'),'Original city name stays searchable');
assert.equal(output.nl.places[cana.id].name,'Kana');
assert.equal(output.fr.places[kanah.id].name,'Kana');
assert(output.nl.places[cana.id].nameForms.some(f=>f.name==='Kana'&&f.refs.includes('John 2:1')));
assert(!output.nl.places[cana.id].nameForms.some(f=>f.refs.includes('Joshua 19:28')),'Cana/OT Kanah passages remain distinct');
for(const lang of ['nl','fr'])for(const name of ['Bethlehem','Antioch','Ai'])assert.equal(placeData.places.filter(p=>p.name===name).map(p=>output[lang].places[p.id]).length,2);
console.log(`entity-locales: NL/FR complete for ${data.people.length} people and ${placeData.places.length} places; 157 curated profiles, caveats, original aliases, namesakes and scripture provenance verified.`);
