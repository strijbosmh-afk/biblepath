#!/usr/bin/env node
'use strict';
// Reproducible selection and transformation of STEP Bible's CC BY 4.0 TIPNR data.
// No upstream AI-generated Brief/Short/Article prose is used.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname,'..');
const COMMIT = 'ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d';
const FILE = 'Proper Nouns/TIPNR - Translators Individualised Proper Names with all References - STEPBible.org CC BY.txt';
const FILE_URL = `https://github.com/STEPBible/STEPBible-Data/blob/${COMMIT}/${FILE.split('/').map(encodeURIComponent).join('/')}`;
const DOWNLOAD = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${COMMIT}/${FILE.split('/').map(encodeURIComponent).join('/')}`;
const BOOKS = {
  Gen:'Genesis',Exo:'Exodus',Lev:'Leviticus',Num:'Numbers',Deu:'Deuteronomy',Jos:'Joshua',Jdg:'Judges',Rut:'Ruth',
  '1Sa':'1 Samuel','2Sa':'2 Samuel','1Ki':'1 Kings','2Ki':'2 Kings','1Ch':'1 Chronicles','2Ch':'2 Chronicles',Ezr:'Ezra',Neh:'Nehemiah',Est:'Esther',Job:'Job',Psa:'Psalms',Pro:'Proverbs',Ecc:'Ecclesiastes',Sng:'Song of Solomon',Isa:'Isaiah',Jer:'Jeremiah',Lam:'Lamentations',Ezk:'Ezekiel',Dan:'Daniel',Hos:'Hosea',Jol:'Joel',Amo:'Amos',Oba:'Obadiah',Jon:'Jonah',Mic:'Micah',Nam:'Nahum',Hab:'Habakkuk',Zep:'Zephaniah',Hag:'Haggai',Zec:'Zechariah',Mal:'Malachi',
  Mat:'Matthew',Mrk:'Mark',Luk:'Luke',Jhn:'John',Act:'Acts',Rom:'Romans','1Co':'1 Corinthians','2Co':'2 Corinthians',Gal:'Galatians',Eph:'Ephesians',Php:'Philippians',Col:'Colossians','1Th':'1 Thessalonians','2Th':'2 Thessalonians','1Ti':'1 Timothy','2Ti':'2 Timothy',Tit:'Titus',Phm:'Philemon',Heb:'Hebrews',Jas:'James','1Pe':'1 Peter','2Pe':'2 Peter','1Jn':'1 John','2Jn':'2 John','3Jn':'3 John',Jud:'Jude',Rev:'Revelation'
};
const BOOK_ORDER = Object.fromEntries(Object.keys(BOOKS).map((code,index)=>[code,index]));
const byBookName = Object.fromEntries(Object.entries(BOOKS).map(([code,name])=>[name,code]));
byBookName.Psalm = 'Psa';
const normalize = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const named = record => record.key.split('@')[0].replaceAll('_',' ').replaceAll('-',' ');
const cleanKey = value => value.trim().replace(/\([^)]*\)/g,'').trim();
const hasFlag = value => /\([^)]*[?adf][^)]*\)/.test(value);
const relationshipKey = (type,source,target) => type === 'spouse' ? `spouse:${[source,target].sort().join(':')}` : `parent:${source}:${target}`;

function parse(source){
  const lines = source.replace(/^\uFEFF/,'').split(/\r?\n/), records = [];
  let current = null;
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    if(line.startsWith('$')){current=null;continue;}
    const fields=line.split('\t');
    if(fields.length>=9 && /^[^@\s=]+@[^=\s]+=[HG]\d/.test(fields[0])){
      const [key,strong] = fields[0].split('=');
      current = {key,strong,line:i+1,role:fields[1].trim(),parents:fields[2],siblings:fields[3],partners:fields[4],children:fields[5],tribe:fields[6].trim(),type:fields[8].trim(),rows:[]};
      records.push(current);
    } else if(current && /^– /.test(line) && !line.startsWith('– Total')) current.rows.push(fields);
  }
  for(const r of records){
    const refs = new Set();
    for(const row of r.rows){
      if(/LXX addition|Group|Form \(/.test(row[0]))continue;
      for(const token of (row[4]||'').split(';')){
        const match=token.trim().match(/^([1-3]?[A-Z][a-z]{1,2})\.(\d+)\.(\d+[a-z]?(?:,\d+[a-z]?)*)$/);
        if(!match || !BOOKS[match[1]])continue;
        for(const verse of match[3].split(',')) refs.add(`${match[1]}.${Number(match[2])}.${parseInt(verse,10)}`);
      }
    }
    r.refs = [...refs].sort((a,b)=>{
      const x=a.split('.'),y=b.split('.');return BOOK_ORDER[x[0]]-BOOK_ORDER[y[0]] || x[1]-y[1] || x[2]-y[2];
    });
    r.aliases = [...new Set(r.rows.filter(row=>/Named|Name combined|Spelled|Greek|Aramaic/.test(row[0])).map(row=>(row[1]||'').split('@')[0].split('|')[0].replaceAll('_',' ').replaceAll('-',' ').trim()).filter(Boolean))];
  }
  return records;
}

function references(raw,translation='ESV'){
  return raw.map(ref=>{
    const [book,chapter,verse]=ref.split('.'), label=`${BOOKS[book]} ${chapter}:${verse}`;
    return {label,url:`https://www.biblegateway.com/passage/?search=${encodeURIComponent(label)}&version=${translation}`,translation,provenance:'indexed-name'};
  });
}
function curatedRefs(person){
  const refs = new Set();
  for(const ref of person.refs){
    const match=ref.label.match(/^(.+?) (\d+):(\d+)(?:-(\d+))?$/);
    if(!match || !byBookName[match[1]])continue;
    for(let v=+match[3];v<=+(match[4]||match[3]);v++)refs.add(`${byBookName[match[1]]}.${+match[2]}.${v}`);
  }
  return refs;
}
function candidates(person,records){
  const names = new Set([person.name,...(person.aliases||[])].map(normalize)), refs=curatedRefs(person);
  return records.filter(r=>[named(r),...r.aliases].some(n=>names.has(normalize(n)))).map(r=>{
    const exact=r.refs.filter(ref=>refs.has(ref)).length;
    const chapters = new Set([...refs].map(ref=>ref.split('.').slice(0,2).join('.')));
    const chapter=r.refs.filter(ref=>chapters.has(ref.split('.').slice(0,2).join('.'))).length;
    return {key:r.key,score:exact*100+Math.min(chapter,20),role:r.role,parents:r.parents,refs:r.refs.slice(0,3)};
  }).sort((a,b)=>b.score-a.score);
}

function era(r){
  if(/New Testament/i.test(r.role))return 'New Testament';
  if(/Flood|Creation/i.test(r.role))return 'Beginnings';
  if(/Patriarch/i.test(r.role))return 'Patriarchs';
  if(/Egypt|Wilderness/i.test(r.role))return 'Exodus';
  if(/Conquest|Judges|before Israel/i.test(r.role))return 'Judges';
  if(/Monarchy/i.test(r.role))return 'Kingdom';
  if(/Exile|Return/i.test(r.role))return 'Exile';
  return BOOK_ORDER[r.refs[0]?.split('.')[0]]>=39 ? 'New Testament' : 'Old Testament';
}

async function main(){
  const sourceArg=process.argv.indexOf('--source');
  let sourcePath=sourceArg>=0 ? path.resolve(process.argv[sourceArg+1]) : path.join(ROOT,'.cache','TIPNR.txt');
  if(!fs.existsSync(sourcePath)){
    const response=await fetch(DOWNLOAD);if(!response.ok)throw new Error(`Download failed: ${response.status}`);
    fs.mkdirSync(path.dirname(sourcePath),{recursive:true});fs.writeFileSync(sourcePath,await response.text());
  }
  const raw=fs.readFileSync(sourcePath,'utf8'), allRecords=parse(raw);
  const personOverrides=JSON.parse(fs.readFileSync(path.join(__dirname,'person-overrides.json'),'utf8'));
  for(const r of allRecords){
    const override=personOverrides[r.key];
    if(override){if(override.type)r.type=override.type;if(override.role)r.role=override.role;r.correctionNote=override.note;}
  }
  const selected=allRecords.filter(r=>['Male','Female'].includes(r.type) && !/\b(?:man|woman) or town\b/i.test(r.role) && !r.key.startsWith('Unnamed') && !r.key.startsWith('huge_man@') && r.refs.length && r.rows.some(row=>/Named|Name combined|Spelled|Greek|Aramaic/.test(row[0])));
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'curated-data.js'),'utf8'),context);
  const curated=JSON.parse(JSON.stringify(context.window.BIBLE_DATA));
  if(process.argv.includes('--mapping-report')){
    const report=curated.people.map(p=>({id:p.id,name:p.name,refs:p.refs.map(x=>x.label),candidates:candidates(p,selected)}));
    fs.writeFileSync(path.join(__dirname,'mapping-report.json'),JSON.stringify(report,null,2)+'\n');
    const mapping=Object.fromEntries(report.filter(r=>r.candidates.length && (r.candidates.length===1 || r.candidates[0].score>r.candidates[1].score)).map(r=>[r.id,r.candidates[0].key]));
    fs.writeFileSync(path.join(__dirname,'curated-map.proposed.json'),JSON.stringify(mapping,null,2)+'\n');
    console.log(JSON.stringify({allRecords:allRecords.length,selected:selected.length,proposedMappings:Object.keys(mapping).length,needsReview:report.filter(r=>!mapping[r.id]).map(r=>({id:r.id,candidates:r.candidates.slice(0,4)}))},null,2));
    return;
  }
  const mapping=JSON.parse(fs.readFileSync(path.join(__dirname,'curated-map.json'),'utf8'));
  const blocked=JSON.parse(fs.readFileSync(path.join(__dirname,'excluded-relationships.json'),'utf8'));
  const recordMap=new Map(selected.map(r=>[r.key,r]));
  // Strong suffix case is significant: H2148V and H2148v are different people.
  const idMap=new Map(selected.map(r=>[r.key,`step-${r.strong}`]));
  for(const p of curated.people){if(!mapping[p.id] || !recordMap.has(mapping[p.id]))throw new Error(`Missing verified source mapping for ${p.id}`);idMap.set(mapping[p.id],p.id);}
  if(new Set(Object.values(mapping)).size!==Object.values(mapping).length)throw new Error('Two curated people map to the same source identity');
  const sourceFor = r => ({name:'STEP Bible TIPNR',url:`${FILE_URL}#L${r.line}`,record:r.key,commit:COMMIT});
  const display = key => recordMap.has(cleanKey(key)) ? named(recordMap.get(cleanKey(key))) : cleanKey(key).split('@')[0].replaceAll('-',' ');
  const exclusions=[], suppression=new Map();
  const suppress=(type,from,to,reason)=>suppression.set(relationshipKey(type,cleanKey(from),cleanKey(to)),reason);
  // A flag on either direction suppresses the same claim from the unflagged reverse field.
  for(const r of allRecords){
    for(const parent of r.parents.split('+').map(x=>x.trim()).filter(Boolean))if(hasFlag(parent))suppress('parent',parent,r.key,'Upstream marks this relation uncertain or non-direct.');
    for(const child of r.children.split(',').map(x=>x.trim()).filter(Boolean))if(hasFlag(child))suppress('parent',r.key,child,'Upstream marks this relation uncertain or non-direct.');
    for(const partner of r.partners.split(',').map(x=>x.trim()).filter(Boolean))if(hasFlag(partner))suppress('spouse',r.key,partner,'Upstream marks this relation uncertain.');
  }
  for(const item of blocked)suppress(item.type,item.source,item.target,item.reason);
  const relationships=curated.relationships.map(r=>({...r,provenance:'verse',evidence:{kind:'verse',source:'BiblePath curated passages',url:r.ref.url}}));
  const seen=new Set(relationships.map(r=>relationshipKey(r.type,r.source,r.target)));
  const parentsById=new Map();
  function add(type,from,to,record){
    const a=cleanKey(from),b=cleanKey(to),source=idMap.get(a),target=idMap.get(b);
    if(!source || !target || source===target)return;
    const idKey=relationshipKey(type,source,target);if(seen.has(idKey))return;
    const reason=suppression.get(relationshipKey(type,a,b));
    if(reason){exclusions.push({type,source:a,target:b,reason});return;}
    const provenance=sourceFor(record);
    relationships.push({source,target,type,ref:{label:'STEP Bible relationship index',url:provenance.url},provenance:'indexed',confidence:'indexed',evidence:{kind:'index',source:provenance.name,url:provenance.url,record:record.key}});
    seen.add(idKey);
  }
  for(const r of selected){
    for(const parent of r.parents.split('+').map(x=>x.trim()).filter(Boolean))add('parent',parent,r.key,r);
    for(const partner of r.partners.split(',').map(x=>x.trim()).filter(Boolean))add('spouse',r.key,partner,r);
  }
  // Curated passages take priority over index-only genealogy harmonizations.
  const curatedIds=new Set(curated.people.map(p=>p.id));
  const curatedParentTargets=new Set(curated.relationships.filter(r=>r.type==='parent').map(r=>r.target));
  const exactCuratedParents=new Set(curated.relationships.filter(r=>r.type==='parent').map(r=>`${r.source}:${r.target}`));
  const genderById=new Map(selected.map(r=>[idMap.get(r.key),r.type.toLowerCase()]));
  const curatedParentGenders=new Map();
  for(const r of curated.relationships.filter(r=>r.type==='parent')){
    if(!curatedParentGenders.has(r.target))curatedParentGenders.set(r.target,new Set());
    curatedParentGenders.get(r.target).add(genderById.get(r.source));
  }
  const finalRelationships=relationships.filter(r=>{
    if(r.type==='parent' && r.provenance==='indexed' && curatedParentTargets.has(r.target) && curatedParentGenders.get(r.target).has(genderById.get(r.source)) && !exactCuratedParents.has(`${r.source}:${r.target}`)){
      exclusions.push({type:r.type,source:r.source,target:r.target,reason:'Conflicts with curated genealogy; retained cited account.'});return false;
    }return true;
  });
  for(const r of finalRelationships)if(r.type==='parent'){if(!parentsById.has(r.target))parentsById.set(r.target,[]);parentsById.get(r.target).push(r.source);}
  const curatedMap=new Map(curated.people.map(p=>[p.id,p]));
  const namesById=new Map(selected.map(r=>[idMap.get(r.key),named(r)]));
  const people=selected.map(r=>{
    const id=idMap.get(r.key),original=curatedMap.get(id),recordEra=era(r);
    const refs=references(r.refs), aliases=[...new Set([...(original?.aliases||[]),...r.aliases].filter(name=>normalize(name)!==normalize(original?.name||named(r))))];
    const parentIds=parentsById.get(id)||[],parentNames=parentIds.map(pid=>curatedMap.get(pid)?.name||namesById.get(pid)).filter(Boolean);
    const disambiguation=id==='jesus' ? 'Son of Mary · Joseph is his legal father' : parentNames.length ? `${r.type==='Female'?'Daughter':'Son'} of ${parentNames.slice(0,2).join(' & ')}` : `${recordEra} · ${refs[0].label}`;
    const role=r.role.replace(/([^\s@]+)@[A-Za-z0-9.\-]+/g,(_,name)=>name.replaceAll('_',' ').replaceAll('-',' ')).replace(/^Man\b/,'A man').replace(/^Woman\b/,'A woman').replace(/^(.+?) living\b/,(_,label)=>`${/^(A |An )/.test(label)?label:`${/^[AEIOU]/i.test(label)?'An':'A'} ${label.toLowerCase()}`} living`);
    const description=original?.description || `${role.replace(/\.$/,'')}. Indexed at ${refs[0].label}.${parentNames.length ? ` The STEP Bible index records ${r.type==='Female'?'her':'him'} as a child of ${parentNames.slice(0,2).join(' and ')}.` : ''}`;
    const mergedRefs=original ? [...original.refs.map(ref=>({...ref,translation:'KJV',provenance:'verse'})),...refs.filter(ref=>!original.refs.some(existing=>existing.label===ref.label))] : refs;
    const notes=r.correctionNote ? [r.correctionNote] : [];
    if(id==='rahab')notes.push('Matthew 1:5 names Rahab as Boaz’s mother. Identifying her with Rahab of Jericho is a common interpretation, but the genealogy does not explicitly make that identification.');
    if(id==='shelah')notes.push('Genesis 11:12 gives Arphaxad as Shelah’s father. Luke 3:35–36 includes Cainan between them in some textual traditions; this map retains the Genesis parent line.');
    return {...(original||{}),id,name:original?.name||named(r),gender:original?.gender||r.type.toLowerCase(),testament:original?.testament||(recordEra==='New Testament'?'NT':'OT'),era:original?.era||recordEra,description,refs:mergedRefs,aliases,disambiguation,source:sourceFor(r),referenceCount:mergedRefs.length,profileOrigin:original?'curated':'structured-index',...(notes.length?{notes}:{})};
  });
  // Preserve the original starting journeys, then order the expanded index alphabetically.
  people.sort((a,b)=>(curatedIds.has(b.id)-curatedIds.has(a.id)) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const meta={
    title:'BiblePath — expanded people atlas',version:'0.2',complete:false,reviewedAt:'2026-10-21',
    coverage:`${people.length.toLocaleString('en-US')} named or title-identified people across the Old and New Testaments, drawn from a pinned STEP Bible TIPNR index and the original curated profiles. This is broad coverage, not a claim that every individual or relationship is included.`,
    canon:'References are restricted to the 66-book Protestant canon. Place, group, deity, ambiguous person-or-town, LXX-only and synthetic unnamed bridge records are excluded.',
    source:'Original BiblePath summaries are retained. New summaries are generated from structured role, identity and genealogy fields; upstream AI-generated biographies are not imported. Profile passages use ESV for imported references and KJV for original curated references.',
    methodology:'Namesakes retain distinct STEP identities. Named records are selected by human type and attested name-form rows. Uncertain, ancestor, descendant-group and founder links are omitted from direct family lines, including reciprocal flags. Imported relationship links cite the STEP index, not an arbitrary Bible verse. Original verse-backed relationships take precedence. Missing links do not mean that no such relationship exists.',
    genealogyNotes:'Joseph’s link to Jesus remains legal parenthood. Heli is not assigned as Mary’s father. Disputed harmonizations and inferred biological links to Jesus’ brothers are excluded. Alternative genealogy accounts are not merged into extra immediate parents.',
    sources:[{name:'STEP Bible TIPNR',url:'https://github.com/STEPBible/STEPBible-Data',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',credit:'Data created for STEP Bible, based on work at Tyndale House, Cambridge.',creditUrl:'https://www.stepbible.org/',version:COMMIT},{name:'BiblePath original collection',url:'data-notes.html',license:'Original summaries with biblical references',licenseUrl:'data-notes.html',credit:'The original 157 profiles and their cited relationship notes are retained.'}],
    attribution:'Data from STEP Bible (www.STEPBible.org), CC BY 4.0. Selected, reformatted and supplemented for BiblePath. See the data notes for modifications and exclusions.',
    sourceNotesUrl:'data-notes.html',stats:{people:people.length,relationships:finalRelationships.length,curatedPeople:curated.people.length,indexedRelationships:finalRelationships.filter(r=>r.provenance==='indexed').length,verseRelationships:finalRelationships.filter(r=>r.provenance==='verse').length,excludedRelationshipClaims:exclusions.length},
    upstream:{commit:COMMIT,sourceUrl:DOWNLOAD,sha256:crypto.createHash('sha256').update(raw).digest('hex')}
  };
  const data={people,relationships:finalRelationships,meta};
  fs.writeFileSync(path.join(ROOT,'dist','data.js'),`/* STEP Bible TIPNR data, CC BY 4.0; selected and supplemented for BiblePath.\n   Source and modifications: data-notes.html. Regenerate with scripts/import-tipnr.cjs. */\nwindow.BIBLE_DATA = ${JSON.stringify(data)};\n`);
  fs.writeFileSync(path.join(__dirname,'import-report.json'),JSON.stringify({commit:COMMIT,sha256:meta.upstream.sha256,upstreamRecords:allRecords.length,selected:people.length,excludedRecords:allRecords.filter(r=>!idMap.has(r.key)).map(r=>({key:r.key,type:r.type})),stats:meta.stats,excludedRelationships:exclusions},null,2)+'\n');
  console.log(JSON.stringify(meta.stats,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
