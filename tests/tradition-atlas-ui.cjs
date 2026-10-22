'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {context,Element,validate}=require('./graph-geometry.cjs');
globalThis.BibleGraph=context.window.BibleGraph;
const strings=new Map();
const I=globalThis.BibleI18n={language:'nl',registerRows(rows){for(const row of rows)strings.set(row[0],row);},t(key,params={}){return (strings.get(key)?.[{en:0,nl:1,fr:2}[this.language]]||key).replace(/\{(\w+)\}/g,(_,k)=>params[k]??'');}};
const {TraditionAtlasModel,TraditionAtlasView,familyLayout,relationshipRoute}=require('../dist/tradition-atlas.js');
const L=(nl,en=nl,fr=nl)=>({nl,en,fr});
function fixture(tradition='judaism'){
  const id=x=>`${tradition}:${x}`;
  const refs=[{id:'text',kind:'scripture',label:L('Genesis 1:1','Genesis 1:1','Genèse 1,1'),url:'https://example.org/text',passage:tradition==='judaism'?{tradition,edition:'he',book:'GEN',chapter:1,verse:1,endVerse:1}:{tradition,edition:'nl',surah:1,verse:1,endVerse:1}}];
  const people=['grandparent','parent','aunt','child','other'].map(name=>({id:id(name),name:L(name==='parent'?'Vader':name,name==='parent'?'Father':name,name==='parent'?'Père':name),aliases:name==='parent'?['Abba']:[],summary:L('Een tekstprofiel.','A textual profile.','Un profil textuel.'),refs,indexId:name==='parent'?`${tradition==='judaism'?'torah':'quran'}:father`:undefined}));
  const relation=(source,target,type='parent')=>({id:id(`${source}-${target}`),source:id(source),target:id(target),type,summary:L('Een vastgelegde relatie.'),refs});
  return {meta:{tradition,familyScope:L('Familiebron, geen volledige genealogie.'),placesScope:L('Plaatsbron met toelichting.')},people,relationships:[relation('grandparent','parent'),relation('grandparent','aunt'),relation('parent','child'),relation('aunt','child'),relation('parent','aunt','spouse')],families:[{id:id('family-a'),title:L('De familie','The family','La famille'),summary:L('Een gespecificeerde groep.'),personIds:people.slice(0,4).map(p=>p.id)},{id:id('family-b'),title:L('Andere familie'),summary:L('Een andere groep.'),personIds:[id('other'),id('parent')]}],places:[{id:id('city-one'),name:L('Stad Eén','City One','Ville Un'),aliases:['Eerste'],kind:'city',summary:L('Stad bij een verhaal.'),historicalContext:L('Historische bron.'),locationNote:L('Ligging is onzeker.'),personIds:[id('parent')],refs},{id:id('mountain'),name:L('Berg','Mountain','Montagne'),aliases:[],kind:'mountain',summary:L('Een berg.'),historicalContext:L('Historische duiding.'),locationNote:L('Onzekere identificatie.'),personIds:[id('other')],refs}]};
}
class Root {
  constructor(){this.nodes=new Map();this.handlers=new Map();this.innerHTML='';}
  addEventListener(type,fn){this.handlers.set(type,fn);}removeEventListener(type,fn){if(this.handlers.get(type)===fn)this.handlers.delete(type);}
  contains(){return true;}
  querySelector(selector){if(!this.nodes.has(selector)){const node=new Element('div');Object.assign(node,{innerHTML:'',textContent:'',hidden:false,clientWidth:720,focus:()=>{this.focused=selector;}});this.nodes.set(selector,node);}return this.nodes.get(selector);}
  click(dataset){const b={dataset};b.closest=()=>b;this.handlers.get('click')({target:b});}
  input(selector,value){this.handlers.get('input')({target:{value,matches:s=>s===selector}});}
  change(selector,value){this.handlers.get('change')({target:{value,matches:s=>s===selector}});}
}
const jewish=fixture(),islam=fixture('islam'),model=new TraditionAtlasModel(jewish);
assert.equal(model.searchPeople('abba')[0].id,'judaism:parent');assert.equal(model.searchPeople('père','fr')[0].id,'judaism:parent');assert.equal(model.searchPlaces('eerste')[0].id,'judaism:city-one');assert.equal(model.searchPlaces('','mountain').length,1);
const host=new Root(),passages=[],indexes=[],modes=[],view=new TraditionAtlasView(host,{onPassage:p=>passages.push(p),onPerson:id=>indexes.push(id),onModeChange:mode=>modes.push(mode)});
view.setCollection(jewish);assert.equal(view.tradition,'judaism');assert.match(host.innerHTML,/Kies een familie/);assert.match(host.innerHTML,/data-atlas-layout="constellation" aria-pressed="true"/);assert.equal(modes.length,0);
assert.equal(view.graph.layout,'constellation');assert.equal(view.graph.people.length,3,'Default view shows the focus person and direct relatives, not the whole dense family');
assert(view.graph.nodes.get('judaism:grandparent').querySelector('.node-circle'),'Uses the same circular graph renderer as Christianity');
host.change('[data-atlas-scope]','all');assert.equal(view.graph.people.length,4);
assert.equal(view.graph.edgeLayer.children.filter(e=>e.getAttribute('marker-end')).length,4,'Only explicit parent edges get arrowheads');
view.openPerson('judaism:parent');host.click({atlasIndex:'judaism:parent'});assert.deepEqual(indexes,['torah:father']);
assert.match(host.querySelector('.atlas-person-detail').innerHTML,/noopene[r] noreferrer/);assert.match(host.querySelector('.atlas-person-detail').innerHTML,/Partners in een huwelijk/);
const refKey=[...view.refs.entries()].find(([_,r])=>r===jewish.people[0].refs[0])[0];host.click({atlasPassage:refKey});assert.deepEqual(passages[0],jewish.people[0].refs[0].passage);passages[0].verse=9;assert.equal(jewish.people[0].refs[0].passage.verse,1,'Callback receives an independent coordinate object');
host.input('[data-atlas-search]','Abba');assert.match(host.querySelector('.atlas-person-results').innerHTML,/Vader/);host.input('[data-atlas-search]','no-such-person');assert.match(host.querySelector('.atlas-person-results').innerHTML,/Geen passende personen/);assert.equal(view.state.selected,'judaism:parent','An empty search does not erase selected family');
host.click({atlasClear:'people'});assert.equal(view.state.mapQuery,'');
host.change('[data-atlas-family]','judaism:family-b');assert.equal(view.state.family,'judaism:family-b');assert.equal(host.focused,'[data-atlas-family]');
view.openPerson('judaism:child');assert.equal(view.state.family,'judaism:family-a');assert.equal(view.state.selected,'judaism:child');
host.click({atlasZoom:'in'});const zoom=view.state.zoom;assert(zoom>0);const camera={...view.graph.transform};host.click({atlasPan:'right'});assert.equal(view.graph.transform.x,camera.x-160);host.click({atlasZoom:'fit'});assert(view.state.zoom<=1.3);
const oldGraph=view.graph,oldCamera={...view.graph.transform};view.openPerson('judaism:parent');assert.equal(view.graph,oldGraph,'Selecting a visible node preserves the map');assert.deepEqual({...view.graph.transform},oldCamera);
host.click({atlasLayout:'lineage'});assert.equal(view.graph.layout,'lineage');host.click({atlasLayout:'radial'});assert.equal(view.graph.layout,'radial');host.click({atlasLayout:'constellation'});assert.equal(view.graph.layout,'constellation');
host.change('[data-atlas-scope]','near');assert.equal(view.state.focus,view.state.selected);assert(view.graph.people.length<=4);view.graph.select('judaism:aunt');assert.equal(view.state.selected,'judaism:aunt');host.click({atlasFocus:'true'});assert.equal(view.graph.focusId,'judaism:aunt');
view.setMode('cities');assert.equal(modes.length,0,'Programmatic setMode must not recurse into router');host.input('[data-atlas-city-search]','Stad');host.click({atlasCity:'judaism:city-one'});assert.equal(view.state.cityQuery,'Stad','Selecting a city retains its search');host.change('[data-atlas-kind]','mountain');assert.equal(view.state.citySelected,null);assert.equal(host.querySelector('.atlas-place-detail').hidden,true);assert.match(host.querySelector('.atlas-place-cards').innerHTML,/Geen passende plaatsen/);
host.click({atlasClear:'cities'});host.change('[data-atlas-kind]','mountain');assert.equal(view.state.citySelected,'judaism:mountain');
view.setCollection(islam,'map');assert.equal(view.state.mapQuery,'');view.openPerson('islam:parent');assert(!view.openPerson('judaism:parent'));
view.setCollection(jewish,'cities');assert.equal(view.state.kind,'mountain');assert.equal(view.state.citySelected,'judaism:mountain');
host.click({atlasCityPerson:'judaism:other'});assert.equal(view.mode,'map');assert.equal(view.state.family,'judaism:family-b');assert.equal(view.state.selected,'judaism:other');assert.deepEqual(modes,['map']);
host.click({atlasCity:'judaism:city-one'});assert.equal(view.mode,'cities');assert.equal(view.state.kind,'all');assert.deepEqual(modes,['map','cities']);
assert.match(host.querySelector('.atlas-place-detail').innerHTML,/Ligging is onzeker/);assert.match(host.querySelector('.atlas-place-detail').innerHTML,/niet noodzakelijk een verblijf/);
for(const lang of ['en','fr','nl']){I.language=lang;view.changeLanguage();assert.equal(view.state.citySelected,'judaism:city-one');assert(host.querySelector('.atlas-place-detail').innerHTML.includes(jewish.places[0].name[lang]));}
const cityOnly=fixture();cityOnly.people.push({...cityOnly.people[0],id:'judaism:city-only',name:L('Losse persoon'),indexId:'torah:city-only'});cityOnly.places[0].personIds.push('judaism:city-only');view.setCollection(cityOnly,'cities');host.click({atlasCity:'judaism:city-one'});assert.match(host.querySelector('.atlas-place-detail').innerHTML,/data-atlas-index="judaism:city-only"/);assert(!view.openPerson('judaism:city-only'));host.click({atlasIndex:'judaism:city-only'});assert.equal(indexes.at(-1),'torah:city-only');view.setMode('map');host.input('[data-atlas-search]','Losse');assert.match(host.querySelector('.atlas-person-results').innerHTML,/data-atlas-index="judaism:city-only"/);
const unsafe=fixture();unsafe.people[0].refs=[{...unsafe.people[0].refs[0],url:'javascript:alert(1)'}];assert.throws(()=>new TraditionAtlasModel(unsafe),/source/);
const foreign=fixture();foreign.relationships[0].target='islam:child';assert.throws(()=>new TraditionAtlasModel(foreign),/relationship/);
const cycle=fixture();cycle.relationships.push({...cycle.relationships[0],id:'judaism:cycle',source:'judaism:child',target:'judaism:grandparent'});assert.throws(()=>new TraditionAtlasModel(cycle),/Cyclic/);
const malicious=fixture();malicious.people[0].name.nl='<img onerror="alert(1)">';view.setCollection(malicious);view.openPerson(malicious.people[0].id);assert.equal(view.graph.nodes.get(malicious.people[0].id).getAttribute('role'),'button');assert.match(host.querySelector('.atlas-person-detail').innerHTML,/&lt;img/);
// Shared renderer preserves every relationship type without calling care or adoption biological parenthood.
const typed=fixture();typed.relationships.push({id:'judaism:care',source:'judaism:parent',target:'judaism:other',type:'guardian',summary:L('Zorg'),refs:typed.people[0].refs});typed.relationships.push({id:'judaism:adopt',source:'judaism:grandparent',target:'judaism:other',type:'adoptive',summary:L('Adoptie'),refs:typed.people[0].refs});typed.relationships.push({id:'judaism:sib',source:'judaism:parent',target:'judaism:aunt',type:'sibling',summary:L('Broer/zus'),refs:typed.people[0].refs});typed.families[0].personIds.push('judaism:other');view.setCollection(typed);host.change('[data-atlas-family]','judaism:family-a');host.change('[data-atlas-scope]','all');
for(const type of ['guardian','adoptive','sibling']){const edge=view.graph.edgeLayer.children.find(e=>e.dataset.relationType===type);assert(edge,`${type} edge is visible`);assert(!edge.getAttribute('marker-end'),`${type} has no parent arrow`);assert(edge.getAttribute('stroke-dasharray'));assert.notEqual(view.graph.relationshipLabel(typed.relationships.find(r=>r.type===type)),'Parent');}
assert.equal(view.graph.svg.getAttribute('aria-label'),I.t('Interactive family map. Drag to pan, scroll or pinch to zoom. Use arrow keys to pan and plus or minus to zoom.'));assert(!view.graph.nodes.get('judaism:parent').getAttribute('aria-label').includes('Bible references'));
assert.match(host.querySelector('.atlas-person-detail').innerHTML,/<details class="atlas-relation"/);assert.match(host.querySelector('.atlas-person-detail').innerHTML,/<details class="atlas-profile-sources"/);
view.setMode('cities');host.input('[data-atlas-city-search]','nothing');assert(view.openPlace('judaism:city-one'));assert.equal(view.state.citySelected,'judaism:city-one');assert.equal(view.state.cityQuery,'');assert(!view.openPlace('islam:city-one'));assert.equal(modes.at(-1),'cities','Programmatic place selection does not trigger navigation callback');
for(const tradition of ['judaism','islam']){
 const data=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,`../dist/tradition-atlas-${tradition}.json`),'utf8'));
 view.setCollection(data);host.change('[data-atlas-scope]','all');
 for(const family of data.families){host.change('[data-atlas-family]',family.id);for(const layout of ['constellation','lineage','radial']){host.click({atlasLayout:layout});validate(view.graph,`${tradition}/${family.id}/${layout}`);assert.equal(view.graph.routes.length,view.model.familyGraph(family.id).relationships.length);if(layout==='lineage'){const positions=view.graph.getState().positions;for(const r of view.graph.relationships.filter(r=>r.type==='parent'))assert(positions[r.source].y<positions[r.target].y);}}}
}
view.destroy();assert.equal(host.handlers.size,0);
console.log('Shared circular tradition atlas UI passed: separate state, search/filters, family/city transitions, source navigation, locales, safe markup, keyboard hooks, zoom/pan, pedigree collapse and non-intersecting node routes.');
