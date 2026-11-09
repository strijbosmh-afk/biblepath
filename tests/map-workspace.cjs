const assert=require('node:assert/strict');
class Node{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.style={};this.listeners={};this.classes=new Set();this.inert=false;this.textContent='';this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
 append(...nodes){for(const n of nodes){n.remove();this.children.push(n);n.parentElement=this;}}
 prepend(n){n.remove();this.children.unshift(n);n.parentElement=this;}
 before(n){const p=this.parentElement;if(!p)return;n.remove();p.children.splice(p.children.indexOf(this),0,n);n.parentElement=p;}
 remove(){if(this.parentElement){const p=this.parentElement;p.children.splice(p.children.indexOf(this),1);this.parentElement=null;}}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,v){this.listeners[k]=v;}removeEventListener(k){delete this.listeners[k];}
 matches(s){return s.split(',').some(s=>s.trim()==='dialog'?this.tagName==='dialog':s.trim()==='#toast'?this.id==='toast':s.trim()===this.tagName);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 querySelectorAll(s){const all=[];for(const n of this.children){if(s==='h2,h3'?['h2','h3'].includes(n.tagName):s.includes('button')?['button','select','input','a'].includes(n.tagName):false)all.push(n);all.push(...n.querySelectorAll(s));}return all;}
 contains(n){return this===n||this.children.some(c=>c.contains(n));}closest(){return null;}getClientRects(){return [{}];}focus(){doc.activeElement=this;}
}
const body=new Node('body'),sidebar=new Node(),main=new Node('main'),view=new Node(),host=new Node(),map=new Node(),detail=new Node(),heading=new Node('h2'),dialog=new Node('dialog'),toast=new Node();toast.id='toast';heading.textContent='Abraham';detail.append(heading);host.append(map,detail);view.append(host);main.append(view);body.append(sidebar,main,dialog,toast);
let modal=false,scroll,resize=0;const doc={body,activeElement:null,createElement:t=>new Node(t),addEventListener(){},removeEventListener(){},querySelector:()=>modal?dialog:null};
globalThis.matchMedia=()=>({matches:true});globalThis.scrollX=0;globalThis.scrollY=600;globalThis.scrollTo=x=>scroll=x;body.style.overflow='clip';
const {AtlasMapWorkspace}=require('../dist/map-workspace.js'),workspace=new AtlasMapWorkspace(doc);const options={key:'judaism-family',map,detail,label:'Familiekaart',resize:()=>resize++};host.setAttribute('aria-label','Original label');
workspace.mount(host,options);assert.equal(detail.parentElement,workspace.active.body);assert.deepEqual(workspace.getState(),{key:'judaism-family',full:false,sheet:false});workspace.showSelection();assert.equal(workspace.getState().sheet,true);assert.equal(workspace.active.toggle.getAttribute('aria-expanded'),'true');
workspace.setFullscreen(true);assert.equal(body.style.overflow,'hidden');assert.equal(host.getAttribute('role'),'dialog');assert.equal(host.getAttribute('aria-modal'),'true');assert(sidebar.inert);assert(!dialog.inert&&!toast.inert,'Top-layer profiles and status stay accessible');
const buttons=host.querySelectorAll('button'),first=buttons[0],last=buttons.at(-1);doc.activeElement=last;let prevented=false;workspace.onKey({key:'Tab',preventDefault:()=>prevented=true});assert(prevented);assert.equal(doc.activeElement,first);doc.activeElement=first;workspace.onKey({key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(doc.activeElement,last);
modal=true;workspace.onKey({key:'Escape',preventDefault(){throw Error('Must leave profile Escape to the profile');}});assert(workspace.getState().full);modal=false;
workspace.onKey({key:'Escape',preventDefault(){}});assert.equal(workspace.getState().sheet,false);assert(workspace.getState().full);workspace.onKey({key:'Escape',preventDefault(){}});assert.equal(body.style.overflow,'clip');assert.equal(scroll.top,600);assert(!sidebar.inert);assert.equal(host.getAttribute('aria-label'),'Original label');assert.equal(host.getAttribute('role'),null);assert(resize>=2);
const saved={key:'judaism-family',full:true,sheet:true};workspace.restore(saved);assert.deepEqual(workspace.getState(),saved);workspace.mount(host,options);assert.equal(host.children.filter(n=>n.className==='map-workspace-tools').length,1,'Renders do not accumulate toolbars');workspace.leave();assert.deepEqual(host.children,[map,detail]);assert.equal(body.style.overflow,'clip');assert(!sidebar.inert);assert.equal(workspace.getState(),null);workspace.destroy();
console.log('Map workspace passed: original nodes/handlers retained, bottom sheet, full-screen bounds, independent saved state, modal focus cycle, Escape/profile isolation, inert cleanup, focus/scroll return and idempotent mounting.');
