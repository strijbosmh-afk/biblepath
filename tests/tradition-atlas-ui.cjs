'use strict';
const assert=require('node:assert/strict');
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
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,{innerHTML:'',textContent:'',hidden:false,clientWidth:720,attrs:{},style:{},setAttribute(name,value){this.attrs[name]=String(value);},focus:()=>{this.focused=selector;},scrollBy:value=>{this.scrolled=value;}});return this.nodes.get(selector);}
  click(dataset){const b={dataset};b.closest=()=>b;this.handlers.get('click')({target:b});}
  input(selector,value){this.handlers.get('input')({target:{value,matches:s=>s===selector}});}
  change(selector,value){this.handlers.get('change')({target:{value,matches:s=>s===selector}});}
}
const jewish=fixture(),islam=fixture('islam'),model=new TraditionAtlasModel(jewish);
assert.equal(model.searchPeople('abba')[0].id,'judaism:parent');assert.equal(model.searchPeople('père','fr')[0].id,'judaism:parent');assert.equal(model.searchPlaces('eerste')[0].id,'judaism:city-one');assert.equal(model.searchPlaces('','mountain').length,1);
const host=new Root(),passages=[],indexes=[],modes=[],view=new TraditionAtlasView(host,{onPassage:p=>passages.push(p),onPerson:id=>indexes.push(id),onModeChange:mode=>modes.push(mode)});
view.setCollection(jewish);assert.equal(view.tradition,'judaism');assert.match(host.innerHTML,/Kies een familie/);assert.match(host.querySelector('.atlas-canvas').innerHTML,/role="button" tabindex="0"/);assert.match(host.querySelector('.atlas-canvas').innerHTML,/marker-end/);assert.equal(modes.length,0);
const svg=host.querySelector('.atlas-canvas').innerHTML;
assert.equal((svg.match(/marker-end=/g)||[]).length,4,'Only explicit parent edges get arrowheads');
view.openPerson('judaism:parent');host.click({atlasIndex:'judaism:parent'});assert.deepEqual(indexes,['torah:father']);
assert.match(host.querySelector('.atlas-person-detail').innerHTML,/noopene[r] noreferrer/);assert.match(host.querySelector('.atlas-person-detail').innerHTML,/Partners in een huwelijk/);
const refKey=[...view.refs.keys()][0];host.click({atlasPassage:refKey});assert.deepEqual(passages[0],jewish.people[0].refs[0].passage);passages[0].verse=9;assert.equal(jewish.people[0].refs[0].passage.verse,1,'Callback receives an independent coordinate object');
host.input('[data-atlas-search]','Abba');assert.match(host.querySelector('.atlas-person-results').innerHTML,/Vader/);host.input('[data-atlas-search]','no-such-person');assert.match(host.querySelector('.atlas-person-results').innerHTML,/Geen passende personen/);assert.equal(view.state.selected,'judaism:parent','An empty search does not erase selected family');
host.click({atlasClear:'people'});assert.equal(view.state.mapQuery,'');
host.change('[data-atlas-family]','judaism:family-b');assert.equal(view.state.family,'judaism:family-b');assert.equal(host.focused,'[data-atlas-family]');
view.openPerson('judaism:child');assert.equal(view.state.family,'judaism:family-a');assert.equal(view.state.selected,'judaism:child');
host.click({atlasZoom:'in'});const zoom=view.state.zoom;assert(zoom>0);assert.equal(host.querySelector('.atlas-family-svg').style.width,host.querySelector('.atlas-family-svg').attrs.width+'px','Zoom overrides global SVG icon sizing');host.click({atlasPan:'right'});assert.equal(host.scrolled.left,360);host.click({atlasZoom:'fit'});assert(view.state.zoom<=1);
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
const malicious=fixture();malicious.people[0].name.nl='<img onerror="alert(1)">';view.setCollection(malicious);view.openPerson(malicious.people[0].id);assert.doesNotMatch(host.querySelector('.atlas-canvas').innerHTML,/<img/);assert.match(host.querySelector('.atlas-person-detail').innerHTML,/&lt;img/);
// Jochebed/Amram-style pedigree collapse: no spouse union may override directed parents.
const ids=['ancestor','uncle','nephew','aunt','child'];const people=ids.map(id=>({id}));const relations=[['ancestor','uncle','parent'],['ancestor','aunt','parent'],['uncle','nephew','parent'],['aunt','nephew','spouse'],['nephew','child','parent'],['aunt','child','parent']].map(([source,target,type])=>({source,target,type}));
const layout=familyLayout(people,relations);assert.deepEqual(familyLayout(people,relations).nodes,layout.nodes);assert.equal(layout.byId.get('aunt').y,layout.byId.get('nephew').y,'Spouses share a row when parent direction allows it');const ancestorSpouse=familyLayout(people,[...relations,{source:'ancestor',target:'child',type:'spouse'}]);assert(ancestorSpouse.byId.get('ancestor').y<ancestorSpouse.byId.get('child').y,'An unsafe spouse union must not collapse ancestors');
for(const r of relations.filter(r=>r.type==='parent'))assert(layout.byId.get(r.source).y<layout.byId.get(r.target).y,'Parents remain above children');
for(const n of layout.nodes){assert(n.x-n.width/2>=0&&n.x+n.width/2<=layout.width);assert(n.y-n.height/2>=0&&n.y+n.height/2<=layout.height);}
function crossesInterior(a,b,n){const left=n.x-80,right=n.x+80,top=n.y-42,bottom=n.y+42;return a[0]===b[0]?a[0]>left&&a[0]<right&&Math.max(Math.min(a[1],b[1]),top)<Math.min(Math.max(a[1],b[1]),bottom):a[1]>top&&a[1]<bottom&&Math.max(Math.min(a[0],b[0]),left)<Math.min(Math.max(a[0],b[0]),right);}
for(const [i,r] of relations.entries()){const points=relationshipRoute(r,layout,i);for(let j=1;j<points.length;j++)for(const n of layout.nodes.filter(n=>n.id!==r.source&&n.id!==r.target))assert(!crossesInterior(points[j-1],points[j],n),`${r.source}/${r.target} route crosses ${n.id}`);}
view.destroy();assert.equal(host.handlers.size,0);
console.log('Tradition atlas UI passed: separate state, search/filters, family/city transitions, source navigation, locales, safe markup, keyboard hooks, zoom/pan, pedigree collapse and non-intersecting node routes.');
