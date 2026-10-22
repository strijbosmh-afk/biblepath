'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const translations=new Map();
const I=globalThis.BibleI18n={language:'nl',registerRows(rows){for(const row of rows)translations.set(row[0],row);},t(key,p={}){return (translations.get(key)?.[{en:0,nl:1,fr:2}[this.language]]||key).replace(/\{(\w+)\}/g,(_,k)=>p[k]??'');},reference(label){return label.replace('Kings','Koningen');}};
I.bookNames={en:['1 Kings'],nl:['1 Koningen'],fr:['1 Rois']};
globalThis.BIBLE_ENTITY_LOCALES={nl:{places:{jerusalem:{name:'Jeruzalem',description:'Nederlandse beschrijving.',aliases:['Sion']}}},fr:{places:{jerusalem:{name:'Jérusalem',description:'Description française.',aliases:['Sion']}}}};
const {PlacesMapModel,PlacesMapView,groupPositions,nameOf,safeUrl}=require('../dist/places-map.js');
const L=(nl,en=nl,fr=nl)=>({nl,en,fr});
const collections={christianity:{places:[{id:'jerusalem',name:'Jerusalem',description:'Original description.',aliases:['Zion'],refs:[{label:'1 Kings 8:1'}]}]},judaism:{places:[{id:'judaism:jerusalem',name:L('Jeruzalem','Jerusalem','Jérusalem'),summary:L('Joods profiel.'),aliases:['Sion'],refs:[{label:L('1 Koningen 8:1')}]}]},islam:{places:[{id:'islam:jerusalem',name:L('Jeruzalem','Jerusalem','Jérusalem'),summary:L('Islamitisch profiel.'),aliases:[],refs:[{label:L('Koran 17:1')}]},{id:'islam:unknown',name:L('Onbekende plaats','Unknown place','Lieu inconnu'),summary:L('Geen vaste ligging.'),aliases:[],refs:[{label:L('Koran 7:1')}]}]}};
const source=[{label:'Geographical source',url:'https://example.org/geography'}];
const geo={meta:{},places:[['christianity','jerusalem',31.78,35.23,'identified'],['judaism','judaism:jerusalem',31.78,35.23,'approximate'],['islam','islam:jerusalem',31.78,35.23,'traditional'],['islam','islam:unknown',null,null,'unmapped']].map(([tradition,id,lat,lon,status])=>({tradition,id,lat,lon,status,note:L('Toelichting bij de ligging.','Location note.','Note de localisation.'),sources:source}))};
geo.places[0].candidateLabel='Jerusalem (modern centre)';
const model=new PlacesMapModel(geo,collections);
assert.equal(model.records.length,4);
assert.equal(model.filter({traditions:['christianity'],query:'Jeruzalem'}).length,1);
assert.equal(model.filter({traditions:['christianity'],query:'Sion'}).length,1);
assert.equal(model.filter({traditions:['christianity'],query:'Koningen 8'}).length,1);
assert.equal(model.filter({traditions:['islam'],query:'17:1'}).length,1);
assert.equal(model.filter({traditions:[],query:''}).length,0,'No active religions means no markers');
assert.equal(model.filter({traditions:['islam'],location:'unmapped'}).length,1,'Unknown location remains discoverable');
assert.equal(model.filter({traditions:['islam'],location:'mapped'}).length,1);
assert.equal(model.filter({traditions:['islam'],query:'not a place'}).length,0);
I.language='en';assert.equal(nameOf(model.records[0]),'Jerusalem','English restores the canonical name');I.language='fr';assert.equal(nameOf(model.records[0]),'Jérusalem');I.language='nl';
for(const locale of ['nl','en','fr']){I.language=locale;assert.equal(model.filter({traditions:['christianity'],query:'Rois 8:1'}).length,1,'Translated Bible-reference queries work in every interface language');}I.language='nl';
const clusters=groupPositions(model.records,r=>({x:r.lon*5,y:r.lat*5}));assert.equal(clusters.length,1);assert.equal(clusters[0].records.length,3,'Coincident religious profiles remain independent choices');
const far=groupPositions([model.records[0],{...model.records[1],key:'far',lon:80}],r=>({x:r.lon*100,y:r.lat*100}));assert.equal(far.length,2);
assert.equal(safeUrl('javascript:alert(1)'), '');assert.equal(safeUrl('https://user:pass@example.org'),'');assert.equal(safeUrl('http://example.org'),'');
const invalid=structuredClone(geo);invalid.places[0].lat=100;assert.throws(()=>new PlacesMapModel(invalid,collections),/coordinates/);
const nullWrong=structuredClone(geo);nullWrong.places[0].lat=null;assert.throws(()=>new PlacesMapModel(nullWrong,collections),/coordinates/);
const unknownWrong=structuredClone(geo);unknownWrong.places[3].lon=0;assert.throws(()=>new PlacesMapModel(unknownWrong,collections),/coordinates/);
const duplicate=structuredClone(geo);duplicate.places.push(duplicate.places[0]);assert.throws(()=>new PlacesMapModel(duplicate,collections),/duplicate/);
const unsafe=structuredClone(geo);unsafe.places[0].sources=[{label:'Unsafe',url:'javascript:alert(1)'}];assert.throws(()=>new PlacesMapModel(unsafe,collections),/provenance/);
class Host{
  constructor(){this.nodes=new Map();this.handlers=new Map();this.innerHTML='';this.classList={add(){}};this.attrs={};}
  setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.handlers.set(k,fn);}removeEventListener(k,fn){if(this.handlers.get(k)===fn)this.handlers.delete(k);}contains(){return true;}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,{innerHTML:'',textContent:'',value:'',hidden:true,checked:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus:()=>this.focused=selector});return this.nodes.get(selector);}
  click(dataset){const button={dataset};button.closest=()=>button;this.handlers.get('click')({target:button});}
  input(value){this.handlers.get('input')({target:{value,matches:s=>s==='[data-pm-search]'}});}
  religion(tradition,checked){this.handlers.get('change')({target:{dataset:{pmReligion:tradition},checked,matches:s=>s==='[data-pm-religion]'}});}
  location(value){this.handlers.get('change')({target:{value,matches:s=>s==='[data-pm-location]'}});}
}
const host=new Host(),callbacks=[];const view=new PlacesMapView(host,{onPlace:r=>callbacks.push(r)});view.setData(geo,collections);assert.match(host.querySelector('.pm-map-error').textContent,/kaart is niet beschikbaar/,'Search and links remain available without map library');
assert.equal(host.attrs.translate,'no');assert.equal(view.matches.length,1);assert.match(host.querySelector('.pm-status').textContent,/1 plaats ·/);
view.setTradition('all');assert.equal(view.matches.length,4);assert.equal(callbacks.length,0,'Programmatic filters do not navigate');
host.input('Jeruzalem');host.click({pmSelect:'islam|islam:jerusalem'});for(const lang of ['en','fr','nl']){I.language=lang;view.changeLanguage();assert.equal(view.state.query,'Jeruzalem');assert.equal(view.matches.length,3,'A saved Dutch query retains Christian, Jewish and Islamic profiles after language changes');assert.equal(view.state.selected,'islam|islam:jerusalem','Language changes preserve the selected religious profile');}
host.input('17:1');assert.equal(view.matches.length,1);assert.equal(view.matches[0].tradition,'islam');host.click({pmSelect:'islam|islam:jerusalem'});assert.equal(view.state.selected,'islam|islam:jerusalem');assert.match(host.querySelector('.pm-detail').innerHTML,/Traditionele identificatie/);assert.match(host.querySelector('.pm-detail').innerHTML,/Personen en tekstpassages/);assert.match(host.querySelector('.pm-detail').innerHTML,/noopener noreferrer/);
host.click({pmOpen:view.state.selected});assert.deepEqual(callbacks,[{tradition:'islam',id:'islam:jerusalem'}]);
const saved=view.getState();saved.traditions.push('bad');assert(!view.state.traditions.includes('bad'));
host.input('missing');assert.equal(view.state.selected,null);assert.match(host.querySelector('.pm-results').innerHTML,/Geen plaatsen gevonden/);assert.doesNotMatch(host.querySelector('.pm-detail').innerHTML,/data-pm-open/,'Hidden matches cannot leave stale navigation');
host.click({pmClear:''});assert.equal(view.matches.length,4);host.location('unmapped');assert.equal(view.matches.length,1);host.click({pmSelect:'islam|islam:unknown'});assert.match(host.querySelector('.pm-detail').innerHTML,/Niet op de kaart gelokaliseerd/);host.click({pmOpen:view.state.selected});assert.equal(callbacks.at(-1).id,'islam:unknown');
for(const lang of ['en','fr','nl']){I.language=lang;view.changeLanguage();assert.equal(view.state.selected,'islam|islam:unknown');assert.match(host.querySelector('.pm-detail').innerHTML,new RegExp(collections.islam.places[1].name[lang]));}
host.click({pmClear:''});for(const religion of ['christianity','judaism','islam'])host.religion(religion,false);assert.equal(view.matches.length,0);assert.match(host.querySelector('.pm-results').innerHTML,/minstens één religie/);host.click({pmAll:''});assert.equal(view.matches.length,4);
const originalName=collections.islam.places[1].name.nl;collections.islam.places[1].name.nl='<img src=x onerror=alert(1)>';view.update();host.click({pmSelect:'islam|islam:unknown'});assert.doesNotMatch(host.querySelector('.pm-detail').innerHTML,/<img/);assert.match(host.querySelector('.pm-detail').innerHTML,/&lt;img/);collections.islam.places[1].name.nl=originalName;
view.destroy();assert.equal(host.handlers.size,0);
// A minimal Leaflet adapter verifies selection, grouping, fit, tile failure,
// viewport retention, resize and cleanup without a network-dependent test.
const maps=[],layers=[],markers=[];
globalThis.L={map(){const map={zoom:5,center:{lat:31,lng:35},handlers:{},fitCalls:0,setView(center,zoom){this.center={lat:center[0],lng:center[1]};this.zoom=zoom;return this;},getCenter(){return this.center;},getZoom(){return this.zoom;},on(type,handler){this.handlers[type]=handler;return this;},project(point){return {x:point[1]*2**this.zoom,y:point[0]*2**this.zoom};},invalidateSize(){this.invalidated=true;return this;},fitBounds(points){this.fitCalls++;this.bounds=points;return this;},panTo(point){this.center={lat:point[0],lng:point[1]};return this;},closePopup(){this.closed=true;},remove(){this.removed=true;}};maps.push(map);return map;},control:{zoom(){return {addTo(){return this;}};}},layerGroup(){const layer={items:[],addTo(){return this;},clearLayers(){this.items=[];}};layers.push(layer);return layer;},tileLayer(url,options){return {url,options,handlers:{},addTo(){return this;},on(type,handler){this.handlers[type]=handler;return this;}};},divIcon(options){return options;},marker(point,options){const marker={point,options,handlers:{},addTo(layer){layer.items.push(this);markers.push(this);return this;},on(type,handler){this.handlers[type]=handler;return this;},bindPopup(html){this.popup=html;return this;}};return marker;}};
const liveHost=new Host(),liveView=new PlacesMapView(liveHost);liveView.setData(geo,collections);assert.equal(liveView.markerLayer.items.length,1);assert.equal(liveView.markerLayer.items[0].options.keyboard,true,'Markers remain keyboard reachable');assert.match(liveView.markerLayer.items[0].options.title,/Jeruzalem.*rooms-katholiek.*Gelokaliseerd/,'Accessible marker label includes religious context and precision');liveView.markerLayer.items[0].handlers.click();assert.equal(liveView.state.selected,'christianity|jerusalem');
assert.match(liveHost.querySelector('.pm-detail').innerHTML,/Kaartpunt.*Jerusalem \(modern centre\)/,'A coordinate candidate is distinguished from the ancient place name');assert.match(liveView.markerLayer.items[0].options.title,/Kaartpunt: Jerusalem/);
liveView.setTradition('all');assert.equal(liveView.markerLayer.items.length,1);assert.equal(liveView.groups[0].records.length,3);assert.match(liveView.markerLayer.items[0].popup,/judaism\|judaism:jerusalem/);assert.match(liveView.markerLayer.items[0].popup,/islam\|islam:jerusalem/);
liveHost.click({pmSelect:'judaism|judaism:jerusalem'});assert.equal(liveView.state.selected,'judaism|judaism:jerusalem');const before=liveView.getState();I.language='fr';liveView.changeLanguage();assert.deepEqual(liveView.getState().center,before.center);assert.equal(liveView.getState().zoom,before.zoom);I.language='nl';
assert.equal(liveView.tileLayer.url,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');assert.match(liveView.tileLayer.options.attribution,/OpenStreetMap/);liveView.tileLayer.handlers.tileerror();liveView.tileLayer.handlers.tileerror();assert.equal(liveHost.querySelector('.pm-map-error').hidden,false);liveView.tileLayer.handlers.tileload();assert.equal(liveHost.querySelector('.pm-map-error').hidden,true);
liveHost.location('unmapped');assert.equal(liveView.markerLayer.items.length,0,'An unknown location never becomes a fabricated map marker');assert.equal(liveView.matches.length,1);liveHost.click({pmSelect:'islam|islam:unknown'});assert.match(liveHost.querySelector('.pm-detail').innerHTML,/Personen en tekstpassages/);
liveView.resize();assert(liveView.map.invalidated);const liveMap=liveView.map;liveView.destroy();assert(liveMap.removed);delete globalThis.L;
const root=path.resolve(__dirname,'..');const realFile=path.join(root,'dist/place-geography.json');if(fs.existsSync(realFile)){const realGeo=JSON.parse(fs.readFileSync(realFile,'utf8')),realCollections=Object.fromEntries([['christianity','places-data.json'],['judaism','tradition-atlas-judaism.json'],['islam','tradition-atlas-islam.json']].map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(root,'dist',file),'utf8'))]));const real=new PlacesMapModel(realGeo,realCollections);assert.equal(real.records.length,639);assert.equal(new Set(real.records.map(r=>r.key)).size,639);}
console.log('Places map passed: religion filters, multilingual search, sourced coordinate validation, coincident religious profiles, unmapped entries, safe detail/profile navigation, leaflet grouping/zoom, tile fallback, viewport/language retention and cleanup.');
