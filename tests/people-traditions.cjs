'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const I=globalThis.BibleI18n={language:'nl',registerRows(){},reference:value=>value};
const {PeopleCollection,PeopleIndexView,PeopleComparisonView,safeUrl}=require('../dist/people-traditions.js');
const data=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../dist',name+'.json'),'utf8'));
class Root {
  constructor(){this.handlers=new Map();this.nodes=new Map();this.innerHTML='';}
  addEventListener(type,fn){this.handlers.set(type,fn);}removeEventListener(type,fn){if(this.handlers.get(type)===fn)this.handlers.delete(type);}
  contains(){return true;}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,{innerHTML:'',textContent:'',focus(){}});return this.nodes.get(selector);}
  querySelectorAll(){return [];}
  click(dataset){const target={dataset};target.closest=()=>target;this.handlers.get('click')({target});}
  input(id,value){this.handlers.get('input')({target:{id,value}});}
}
const torah=data('torah-people'),quran=data('quran-people'),comparisons=data('person-comparisons');
const Torah=new PeopleCollection(torah),Quran=new PeopleCollection(quran);
assert(Torah.search('Mozes').some(p=>p.id==='torah:moses'));
assert(Quran.search('مُوسَى').some(p=>p.comparisonKey==='moses'),'Arabic name lookup must ignore vocalization');
assert.equal(Quran.search('not-a-person-999').length,0);
assert(!Torah.byId.has('quran:moses'));assert(!Quran.byId.has('torah:moses'));
assert.equal(safeUrl('javascript:alert(1)'),'#');assert.equal(safeUrl('data-notes.html'),'data-notes.html');
const host=new Root(),opened=[];const view=new PeopleIndexView(host,{onCompare:key=>opened.push(key)});
view.setCollection(torah,'judaism');view.setComparisonKeys(comparisons.people.map(p=>p.key));
host.input('tradition-people-search','Mozes');host.click({profile:'torah:moses'});
assert.equal(view.getState().selected,'torah:moses');
assert.match(host.querySelector('.collection-profile').innerHTML,/Mozes/);
assert.match(host.querySelector('.collection-profile').innerHTML,/data-compare="moses"/);
host.click({compare:'moses'});assert.deepEqual(opened,['moses']);
host.click({moreRefs:'true'});assert.equal(view.getState().limit,36);
view.setCollection(quran,'islam');assert.equal(view.getState().query,'','Search remains collection-specific');
host.input('tradition-people-search','Yusuf');assert.match(host.querySelector('.collection-cards').innerHTML,/quran:joseph/);
assert.doesNotMatch(host.querySelector('.collection-cards').innerHTML,/torah:/);
view.setCollection(torah,'judaism');assert.equal(view.getState().query,'Mozes');assert.equal(view.getState().selected,'torah:moses');
I.language='fr';view.changeLanguage();assert.match(host.querySelector('.collection-profile').innerHTML,/Moïse/);
assert.equal(view.getState().selected,'torah:moses','Language changes preserve identity');
host.input('tradition-people-search','');host.click({peoplePage:'1'});assert.equal(view.getState().page,2);
host.input('tradition-people-search','no-results-999');assert.equal(view.getState().page,1);assert.match(host.querySelector('.collection-cards').innerHTML,/Aucune personne/);
assert.equal(view.open('quran:moses'),false,'A foreign namespace must never select an identity');
view.destroy();assert.equal(host.handlers.size,0);
const comparisonHost=new Root(),links=[];I.language='nl';
const comparisonView=new PeopleComparisonView(comparisonHost,comparisons,{onPerson:(tradition,id)=>links.push([tradition,id])});
assert(comparisonView.open('moses'));let detail=comparisonHost.querySelector('.comparison-detail').innerHTML;
assert.match(detail,/Rooms-katholiek/);assert.match(detail,/Jodendom/);assert.match(detail,/Islam/);
assert.equal((detail.match(/class="comparison-account /g)||[]).length,3);
comparisonHost.click({collectionTradition:'judaism',collectionPerson:'torah:moses'});assert.deepEqual(links,[['judaism','torah:moses']]);
comparisonHost.input('comparison-search','Jesus');assert.match(comparisonHost.querySelector('.comparison-figures').innerHTML,/data-figure="jesus"/);
comparisonHost.input('comparison-search','4:171');
assert.match(comparisonHost.querySelector('.comparison-figures').innerHTML,/data-figure="jesus"/,'A cited Qur’an passage must find its comparison figure');
assert.doesNotMatch(comparisonHost.querySelector('.comparison-figures').innerHTML,/data-figure="moses"/,'Reference lookup must not return unrelated figures');
comparisonHost.click({figure:'jesus'});assert.equal(comparisonView.getState().selected,'jesus');
I.language='fr';comparisonView.changeLanguage();assert.match(comparisonHost.querySelector('.comparison-detail').innerHTML,/Catholique romain/);assert.equal(comparisonView.getState().selected,'jesus');
assert.equal(comparisonView.open('missing'),false);
// Doctrinal sources must be visibly distinguished from scripture and localizable.
assert(comparisonView.open('mary'));
for(const [locale,scripture,teaching,catechism] of [['nl','Schriftpassages','Katholieke leer','Catechismus'],['en','Scriptural passages','Catholic teaching','Catechism'],['fr','Passages des Écritures','Enseignement catholique','Catéchisme']]){
  I.language=locale;comparisonView.changeLanguage();
  const html=comparisonHost.querySelector('.comparison-detail').innerHTML;
  const catholic=html.split('class="comparison-account christianity"')[1].split('</article>')[0];
  assert.ok(catholic.includes(scripture)&&catholic.includes(teaching),'Bible and Catholic teaching need separate source groups');
  assert.ok(catholic.includes(catechism),'Catechism source labels follow the interface language');
  assert.match(catholic,/href="https:\/\/www\.vatican\.va\//,'Doctrinal claims link to official primary sources');
  assert.equal(comparisonView.getState().selected,'mary');
  comparisonHost.input('comparison-search',catechism);
  assert.match(comparisonHost.querySelector('.comparison-figures').innerHTML,/data-figure="mary"/,'Localized source names are searchable');
}
comparisonHost.input('comparison-search','no-such-person-999');assert.match(comparisonHost.querySelector('.comparison-figures').innerHTML,/Aucune personne/);
comparisonView.destroy();assert.equal(comparisonHost.handlers.size,0);
console.log('People views passed: collection isolation, search, Arabic normalization, profiles, namespaced navigation, pagination, localization, comparison selection and listener cleanup.');
