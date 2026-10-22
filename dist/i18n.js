/* Local translations; Bible text itself is supplied by the selected published edition. */
(function () {
  'use strict';
  const dictionaries = {en:{},nl:{},fr:{}};
  // Dutch is the first-visit default; an explicit saved preference wins.
  let language = 'nl';
  try { const saved=localStorage.getItem('biblepath-language'); if(['en','nl','fr'].includes(saved))language=saved; } catch (_) {}
  const ids='GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV TOB JDT WIS SIR BAR 1MA 2MA'.split(' ');
  const names={
    en:'Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation|Tobit|Judith|Wisdom|Sirach|Baruch|1 Maccabees|2 Maccabees'.split('|'),
    nl:'Genesis|Exodus|Leviticus|Numeri|Deuteronomium|Jozua|Richteren|Ruth|1 Samuel|2 Samuel|1 Koningen|2 Koningen|1 Kronieken|2 Kronieken|Ezra|Nehemia|Esther|Job|Psalmen|Spreuken|Prediker|Hooglied|Jesaja|Jeremia|Klaagliederen|Ezechiël|Daniël|Hosea|Joël|Amos|Obadja|Jona|Micha|Nahum|Habakuk|Zefanja|Haggaï|Zacharia|Maleachi|Mattheüs|Markus|Lukas|Johannes|Handelingen|Romeinen|1 Korinthe|2 Korinthe|Galaten|Efeze|Filippenzen|Kolossenzen|1 Thessalonicenzen|2 Thessalonicenzen|1 Timotheüs|2 Timotheüs|Titus|Filemon|Hebreeën|Jakobus|1 Petrus|2 Petrus|1 Johannes|2 Johannes|3 Johannes|Judas|Openbaring|Tobit|Judit|Wijsheid|Sirach|Baruch|1 Makkabeeën|2 Makkabeeën'.split('|'),
    fr:'Genèse|Exode|Lévitique|Nombres|Deutéronome|Josué|Juges|Ruth|1 Samuel|2 Samuel|1 Rois|2 Rois|1 Chroniques|2 Chroniques|Esdras|Néhémie|Esther|Job|Psaumes|Proverbes|Ecclésiaste|Cantique des cantiques|Ésaïe|Jérémie|Lamentations|Ézéchiel|Daniel|Osée|Joël|Amos|Abdias|Jonas|Michée|Nahum|Habacuc|Sophonie|Aggée|Zacharie|Malachie|Matthieu|Marc|Luc|Jean|Actes|Romains|1 Corinthiens|2 Corinthiens|Galates|Éphésiens|Philippiens|Colossiens|1 Thessaloniciens|2 Thessaloniciens|1 Timothée|2 Timothée|Tite|Philémon|Hébreux|Jacques|1 Pierre|2 Pierre|1 Jean|2 Jean|3 Jean|Jude|Apocalypse|Tobie|Judith|Sagesse|Siracide|Baruch|1 Maccabées|2 Maccabées'.split('|')
  };
  const patterns=[],textCache=new Map(),referenceCache=new Map(),bookIndexes=new Map(ids.map((id,index)=>[id,index]));
  const referenceNames=new Map();
  for(const list of Object.values(names))list.forEach((name,index)=>referenceNames.set(name,index));
  referenceNames.set('Psalm',18);referenceNames.set('Song of Songs',21);
  for(const [alias,id] of [['Tobias','TOB'],['Ecclesiasticus','SIR'],['Ecclésiastique','SIR'],['Wisdom of Solomon','WIS'],['Ester','EST']])referenceNames.set(alias,ids.indexOf(id));
  const referencePattern=new RegExp('(^|[; ·(])('+[...referenceNames.keys()].sort((a,b)=>b.length-a.length).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?= \\d)','gu');
  function cache(map,key,value){if(map.size>=8192)map.delete(map.keys().next().value);map.set(key,value);return value;}
  function register(bundle) {for(const lang of ['nl','fr'])Object.assign(dictionaries[lang],bundle[lang]||{});textCache.clear();}
  function registerRows(rows) {for(const [en,nl,fr] of rows){dictionaries.nl[en]=nl;dictionaries.fr[en]=fr;}textCache.clear();}
  function pattern(source,nl,fr) {patterns.push({regex:source,nl,fr});textCache.clear();}
  function t(source,params={}) {const key=String(source??''),value=String(dictionaries[language][key]??key);return value.replace(/\{(\w+)\}/g,(match,key)=>params[key]??match);}
  function bookName(id){return names[language][bookIndexes.get(id)]||id;}
  function reference(label) {
    const value=String(label??''),key=language+'\0'+value;
    if(referenceCache.has(key))return referenceCache.get(key);
    if(!/\d/.test(value))return cache(referenceCache,key,value);
    // Longest names first, and only before chapter numbers: names in prose stay identities.
    return cache(referenceCache,key,value.replace(referencePattern,(_,prefix,name)=>prefix+names[language][referenceNames.get(name)]));
  }
  function text(source) {
    const original=String(source), trim=original.trim();
    if(!trim||language==='en')return original;
    const key=language+'\0'+original;
    if(textCache.has(key))return textCache.get(key);
    let translated=t(trim);
    if(translated===trim)for(const row of patterns){row.regex.lastIndex=0;if(row.regex.test(trim)){row.regex.lastIndex=0;translated=trim.replace(row.regex,row[language]);break;}}
    translated=reference(translated);
    return cache(textCache,key,original.slice(0,original.indexOf(trim))+translated+original.slice(original.indexOf(trim)+trim.length));
  }
  // The shell is vanilla DOM with dynamic panels. Remember English originals so
  // language switches are reversible; never translate Scripture verse nodes.
  const originals=new WeakMap(),attributes=new WeakMap();
  const libraryRoots='#reader-view,#cities-view',protectedNodes='script,style,[translate="no"],.graph-node text',excluded=protectedNodes+','+libraryRoots;
  function ignored(node){return !node||node.isConnected===false||(node.nodeType===1?node:node.parentElement)?.closest(excluded);}
  function translateAttributes(node){
    if(ignored(node)&&!(node?.nodeType===1&&node.matches(libraryRoots)&&node.isConnected!==false&&!node.closest(protectedNodes)))return;
    const saved=attributes.get(node)||{};
    for(const attr of ['aria-label','title','placeholder'])if(node.hasAttribute(attr)){const current=node.getAttribute(attr),prior=saved[attr];const source=prior&&current===prior.last?prior.source:current;const value=text(source);saved[attr]={source,last:value};if(value!==current)node.setAttribute(attr,value);}
    attributes.set(node,saved);
  }
  function translateNode(node) {
    if(node?.nodeType===1&&node.matches(libraryRoots)){translateAttributes(node);return;}
    if(ignored(node))return;
    if(node.nodeType===3){
      const saved=originals.get(node);const source=saved&&node.nodeValue===saved.last?saved.source:node.nodeValue;
      const value=text(source);originals.set(node,{source,last:value});if(node.nodeValue!==value)node.nodeValue=value;
    }else if(node.nodeType===1){
      translateAttributes(node);
      [...node.childNodes].forEach(translateNode);
    }
  }
  let observer;
  const observerOptions={childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']};
  function applyRecords(records){
    const roots=new Set(),attrs=new Set();
    for(const record of records){if(record.type==='childList')record.addedNodes.forEach(node=>roots.add(node));else if(record.type==='characterData')roots.add(record.target);else attrs.add(record.target);}
    for(const node of roots){let parent=node.parentNode,covered=false;while(parent){if(roots.has(parent)){covered=true;break;}parent=parent.parentNode;}if(!covered)translateNode(node);}
    for(const node of attrs)if(!roots.has(node))translateAttributes(node);
  }
  function withoutObserver(callback){observer?.disconnect();try{callback();}finally{if(observer&&document.body)observer.observe(document.body,observerOptions);}}
  function translateDOM(root=document.body){
    const pending=observer?.takeRecords()||[];
    withoutObserver(()=>{if(root!==document.body)applyRecords(pending);if(root)translateNode(root);});
  }
  function observe(){
    observer?.disconnect();observer=null;translateDOM();
    observer=new MutationObserver(records=>withoutObserver(()=>applyRecords(records)));
    if(document.body)observer.observe(document.body,observerOptions);
  }
  function setLanguage(next){if(!['en','nl','fr'].includes(next))return;language=next;document.documentElement.lang=next;try{localStorage.setItem('biblepath-language',next);}catch(_){}translateDOM();}
  function localizePeople(data,originals) {
    const patches=window.BIBLE_ENTITY_LOCALES?.[language]?.people||{};
    for(let i=0;i<data.people.length;i++){
      const person=data.people[i],base=originals[i],patch=patches[base.id]||{};
      // Preserve object identity for graph/search references, but remove fields
      // introduced only by a previous locale before restoring the base record.
      for(const key of Object.keys(person))if(!Object.hasOwn(base,key))delete person[key];
      Object.assign(person,base,patch);
      person.displayAliases=[...new Set(patch.displayAliases||patch.aliases||base.aliases||[])].filter(name=>name!==person.name);
      person.aliases=[...new Set([...(base.aliases||[]),...(person.aliases||[]),base.name].filter(name=>name!==person.name))];
    }
  }
  function localizePlaces(data){
    const patches=window.BIBLE_ENTITY_LOCALES?.[language]?.places||{};
    return {...data,places:data.places.map(place=>{
      const patch=patches[place.id]||{},name=patch.name||place.name;
      return {...place,...patch,displayAliases:[...new Set(patch.displayAliases||patch.aliases||place.aliases||[])].filter(alias=>alias!==name),aliases:[...new Set([...(place.aliases||[]),...(patch.aliases||[]),place.name].filter(alias=>alias!==name))]};
    })};
  }
  window.BibleI18n={get language(){return language;},t,text,register,registerRows,pattern,bookName,reference,setLanguage,translateDOM,observe,localizePeople,localizePlaces,bookNames:names,bookIds:ids};
})();
