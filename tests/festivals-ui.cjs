'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const strings=new Map();
const I=globalThis.BibleI18n={language:'nl',registerRows(rows){for(const row of rows)strings.set(row[0],row);},t(key,params={}){return (strings.get(key)?.[{en:0,nl:1,fr:2}[this.language]]||key).replace(/\{(\w+)\}/g,(_,k)=>params[k]??'');}};
const {FestivalCollection,FestivalView}=require('../dist/festivals.js');
const data=tradition=>JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/festivals-'+tradition+'.json'),'utf8'));
class Root{
  constructor(){this.nodes=new Map();this.handlers=new Map();}
  addEventListener(type,fn){this.handlers.set(type,fn);}removeEventListener(type,fn){if(this.handlers.get(type)===fn)this.handlers.delete(type);}
  contains(){return true;}querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,{innerHTML:'',textContent:'',focus:()=>{this.focused=selector;}});return this.nodes.get(selector);}
  click(dataset){const b={dataset};b.closest=()=>b;this.handlers.get('click')({target:b});}
  input(value){this.handlers.get('input')({target:{id:'festival-search',value}});}
}
const catholic=data('christianity'),jewish=data('judaism'),islam=data('islam'),host=new Root(),opened=[];
const view=new FestivalView(host,{onPassage:(p,id)=>opened.push({p,id})});view.setCollection(catholic);
assert.match(host.innerHTML,/hoger onderwijs/);assert.match(host.querySelector('.festival-detail').innerHTML,/Kritische studievragen/);
const second=catholic.entries[1];host.click({festival:second.id});assert.equal(view.state.selected,second.id);
host.input(second.title.nl);assert.equal(view.state.selected,second.id);assert.equal(new FestivalCollection(catholic).search(second.title.nl).length,1);
view.setCollection(jewish);assert.equal(view.state.query,'');assert(!view.model.byId.has(second.id));assert(!view.open(second.id));
view.setCollection(catholic);assert.equal(view.state.query,second.title.nl);assert.equal(view.state.selected,second.id);
host.input('zzzz-no-results');assert.equal(view.state.selected,null);assert.equal(host.querySelector('.festival-detail').hidden,true);assert.match(host.querySelector('.festival-cards').innerHTML,/Geen passende onderwerpen/);
host.input('');host.click({festivalKind:'ritual'});assert(view.model.search('',view.state.kind).every(e=>e.kind==='ritual'));assert(view.model.byId.get(view.state.selected).kind==='ritual');
assert.equal(host.focused,'[data-festival-kind="ritual"]','Keyboard focus stays on the chosen filter after rendering');
for(const source of [catholic,jewish,islam]){
  view.setCollection(source);const entry=source.entries.find(e=>e.references.some(r=>r.passage));view.open(entry.id);
  const r=entry.references.find(r=>r.passage);host.click({festivalPassage:r.id});assert.deepEqual(opened.at(-1),{p:r.passage,id:entry.id});
  const html=host.querySelector('.festival-detail').innerHTML;assert(html.includes(r.url.replaceAll('&','&amp;')));assert.match(html,/noopener noreferrer/);assert.match(html,/festival-source-/);
}
const selected=view.state.selected;for(const lang of ['fr','en','nl']){I.language=lang;view.changeLanguage();assert.equal(view.state.selected,selected);assert(host.querySelector('.festival-detail').innerHTML.includes(view.model.byId.get(selected).title[lang]));}
const unsafe=structuredClone(catholic);unsafe.entries[0].references[0].url='javascript:alert(1)';assert.throws(()=>new FestivalCollection(unsafe),/sources/);
const unknown=structuredClone(catholic);unknown.entries[0].sections[0].sourceIds=['missing'];assert.throws(()=>new FestivalCollection(unknown),/source/);
const duplicate=structuredClone(catholic);duplicate.entries.push(duplicate.entries[0]);assert.throws(()=>new FestivalCollection(duplicate));
const escaped=structuredClone(catholic);escaped.entries[0].title.nl='<img src=x onerror=alert(1)>';view.setCollection(escaped);view.open(escaped.entries[0].id);assert.match(host.querySelector('.festival-detail').innerHTML,/&lt;img/);assert.doesNotMatch(host.querySelector('.festival-detail').innerHTML,/<img/);
view.destroy();assert.equal(host.handlers.size,0);
console.log('Festival UI passed: separate religion state, source links, reader actions, search/filter/no-results, three languages, safe markup and listener cleanup.');
