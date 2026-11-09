'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
class Node{
 constructor(){this.innerHTML='';this.textContent='';this.dataset={};this.handlers={};this.children=[];this.nodes=new Map();this.open=false;this.value='';}
 addEventListener(type,fn){this.handlers[type]=fn;}querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector);}querySelectorAll(){return [];}focus(){this.focused=true;}showModal(){this.open=true;}close(){this.open=false;}
 fire(dataset){this.handlers.click({target:{closest:()=>({dataset})}});}
}
const workers=[],pending=[],window={BibleI18n:{language:'nl',t:k=>k,reference:k=>k,registerRows(){}},Worker:class{constructor(){workers.push(this);}postMessage(d){this.request=d;}terminate(){this.terminated=true;}},URL};
const context=vm.createContext({window,URL,console,Map,Set,Promise});
for(const file of ['person-profile.js','atlas-search.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
const dialog=new Node(),read=[],maps=[],compares=[],ref={label:'Genesis 1:1',url:'https://example.org/original',edition:'catholic',book:'GEN',chapter:1,verse:1};
const base=[{id:'a',name:'A <script>',description:'A biography',aliases:[],refs:Array.from({length:30},(_,i)=>({...ref,label:`Genesis 1:${i+1}`}))},{id:'b',name:'B',description:'B biography',aliases:[],refs:[ref]}];
const model=new window.PersonProfileModel('christianity',{base});model.relationships=[{source:'a',target:'b',type:'parent',ref}];
const profile=new window.PersonProfileView(dialog,{onRead:(...v)=>read.push(v),onMap:(...v)=>maps.push(v),onCompare:v=>compares.push(v)});
assert(profile.open(model,'a'));assert(dialog.open);assert.match(dialog.innerHTML,/A &lt;script&gt;/);assert(!dialog.innerHTML.includes('<script>'));
dialog.fire({profileTab:'texts'});assert.match(dialog.innerHTML,/role="tabpanel"/);assert.equal((dialog.innerHTML.match(/data-profile-ref=/g)||[]).length,24);dialog.fire({profileMore:'true'});assert.equal((dialog.innerHTML.match(/data-profile-ref=/g)||[]).length,30);
dialog.fire({profileRef:'0'});assert.equal(read[0][0],'christianity');assert.strictEqual(read[0][1],model.get('a').refs[0]);assert.equal(read[0][2],'a');
dialog.fire({profileTab:'family'});assert.match(dialog.innerHTML,/data-profile-relative="b"/);dialog.fire({profileRelative:'b'});assert.equal(profile.profile.id,'b');dialog.fire({profileTab:'places'});assert.match(dialog.innerHTML,/No linked places/);
let prevented=false;dialog.handlers.keydown({target:{matches:()=>true},key:'Home',preventDefault(){prevented=true;}});assert(prevented);assert.equal(profile.tab,'overview');dialog.fire({profileClose:''});assert(!dialog.open);assert.equal(profile.open(model,'quran:a'),false);
const el=new Node(),results=[],passages=[];
const search=new window.AtlasSearchView(el,{load:(tradition,index)=>new Promise((resolve,reject)=>pending.push({tradition,index,resolve,reject})),onResult:r=>results.push(r),onPassage:r=>passages.push(r)});
async function main(){
 search.open();search.state.query='oud';const first=search.run();const oldJobs=pending.splice(0);const oldWorkerId=workers[0].request.id;
 search.state.query='nieuw';const second=search.run();const newJobs=pending.splice(0),id=workers[0].request.id;assert.notEqual(id,oldWorkerId);
 for(const job of oldJobs){job.index.add(job.tradition,'people','old','oud','old result');job.resolve();}await first;assert(!el.querySelector('.atlas-search-results').innerHTML.includes('old result'),'A stale collection response cannot paint the previous query');
 workers[0].onmessage({data:{id:oldWorkerId,total:1,results:[{text:'stale'}]}});assert.equal(search.texts.length,0);
 for(const job of newJobs){job.index.add(job.tradition,'people','new','nieuw','new result');job.resolve();}await second;assert.equal(search.structured.length,3);assert.match(el.querySelector('.atlas-search-results').innerHTML,/new result/);
 const verse={tradition:'islam',edition:'nl',book:'2',chapter:1,verse:255,endVerse:255,text:'Exact source wording',topics:[]};workers[0].onmessage({data:{id,total:1,partial:false,results:[verse]}});assert.match(el.querySelector('.atlas-search-results').innerHTML,/Exact source wording/);el.fire({searchText:'0'});assert.strictEqual(passages[0],verse);el.fire({searchResult:'0'});assert.equal(results[0].type,'people');
 search.leave();const markup=el.querySelector('.atlas-search-results').innerHTML;workers[0].onmessage({data:{id:search.request,total:0,results:[]}});assert.equal(el.querySelector('.atlas-search-results').innerHTML,markup,'A departed view ignores worker responses');
 search.open();search.state.traditions=[];await search.run();assert.equal(el.querySelector('.atlas-search-results').innerHTML,'');assert.match(el.querySelector('.atlas-search-status').textContent,/minstens/);
 search.state.traditions=['islam'];search.state.type='people';search.state.query='nieuw';const retry=search.run();for(const job of pending.splice(0))job.reject(Error('network'));await retry;assert.match(el.querySelector('.atlas-search-status').textContent,/niet worden geladen/);assert(search.structured.every(r=>r.tradition==='islam'));
 console.log('Workspace UI passed: canonical tabs, exact reading callbacks, pagination, related identities, escaped content, keyboard tabs, separate search scope, source previews, stale responses and failure recovery.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
