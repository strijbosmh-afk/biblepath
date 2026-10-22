#!/usr/bin/env node
'use strict';
// Settlement selection from pinned STEP TIPNR, classified using pinned OpenBible data.
// No AI biographies, modern coordinates, maps or images are imported.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const STEP_COMMIT = 'ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d';
const GEO_COMMIT = '7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f';
const STEP_FILE = 'Proper Nouns/TIPNR - Translators Individualised Proper Names with all References - STEPBible.org CC BY.txt';
const STEP_PATH = STEP_FILE.split('/').map(encodeURIComponent).join('/');
const STEP_URL = `https://github.com/STEPBible/STEPBible-Data/blob/${STEP_COMMIT}/${STEP_PATH}`;
const GEO_URL = `https://github.com/openbibleinfo/Bible-Geocoding-Data/blob/${GEO_COMMIT}/data/ancient.jsonl`;
const SOURCES = [
  {file:'TIPNR.txt',sha:'dc2fba41f24ed85ce0e29b426208e7ea06efc2b85ae8f2a14a06cda01648cd43',url:`https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${STEP_COMMIT}/${STEP_PATH}`},
  {file:'OpenBible-ancient.jsonl',sha:'b8187aa4737e8517ccc090f765d2be11da4c548cd2a59d3cdcb62e952cb8c0f2',url:`https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/${GEO_COMMIT}/data/ancient.jsonl`}
];
const BOOKS = {
  Gen:'Genesis',Exo:'Exodus',Lev:'Leviticus',Num:'Numbers',Deu:'Deuteronomy',Jos:'Joshua',Jdg:'Judges',Rut:'Ruth','1Sa':'1 Samuel','2Sa':'2 Samuel','1Ki':'1 Kings','2Ki':'2 Kings','1Ch':'1 Chronicles','2Ch':'2 Chronicles',Ezr:'Ezra',Neh:'Nehemiah',Est:'Esther',Job:'Job',Psa:'Psalms',Pro:'Proverbs',Ecc:'Ecclesiastes',Sng:'Song of Solomon',Isa:'Isaiah',Jer:'Jeremiah',Lam:'Lamentations',Ezk:'Ezekiel',Dan:'Daniel',Hos:'Hosea',Jol:'Joel',Amo:'Amos',Oba:'Obadiah',Jon:'Jonah',Mic:'Micah',Nam:'Nahum',Hab:'Habakkuk',Zep:'Zephaniah',Hag:'Haggai',Zec:'Zechariah',Mal:'Malachi',
  Mat:'Matthew',Mrk:'Mark',Luk:'Luke',Jhn:'John',Act:'Acts',Rom:'Romans','1Co':'1 Corinthians','2Co':'2 Corinthians',Gal:'Galatians',Eph:'Ephesians',Php:'Philippians',Col:'Colossians','1Th':'1 Thessalonians','2Th':'2 Thessalonians','1Ti':'1 Timothy','2Ti':'2 Timothy',Tit:'Titus',Phm:'Philemon',Heb:'Hebrews',Jas:'James','1Pe':'1 Peter','2Pe':'2 Peter','1Jn':'1 John','2Jn':'2 John','3Jn':'3 John',Jud:'Jude',Rev:'Revelation'
};
const ORDER = Object.fromEntries(Object.keys(BOOKS).map((book, index) => [book, index]));
const normalize = value => String(value || '').toLowerCase().replace(/[_\s-]+/g,' ').trim();
const display = value => value.replaceAll('_',' ').trim();
const baseKey = value => value.match(/^(.+?@[1-3]?[A-Z][a-z]{1,2}\.\d+\.\d+[a-z]?)/)?.[1] || value;
const label = key => { const [book, chapter, verse] = key.split('.'); return `${BOOKS[book]} ${chapter}:${verse}`; };
const sortRefs = (a,b) => { const x=a.split('.'),y=b.split('.'); return ORDER[x[0]]-ORDER[y[0]] || x[1]-y[1] || x[2]-y[2]; };
const PROPER_ROWS = /^– (?:Named|Spelled|Greek|Aramaic|Name combined)(?:\s|$)/;
const GENERIC_ALIASES = new Set(['forsaken','desolate','deserted','married','my delight is in her','lord is there','city of the lord']);
const BLOCKED_ALIASES = { 'Babylon@Gen.10.10-Rev':new Set(['shinar','merathaim','pekod']) };
// These source records combine city/region or multiple geographical identifications.
// Select only the explicit settlement records for classification, retaining a scope note.
const CLASSIFICATION_OVERRIDES = {
  'Babylon@Gen.10.10-Rev':['Babylon 1','Babel'],
  'Samaria@1Ki.13.32-Act':['Samaria 1'],
  'Aijalon@Jos.10.12-2Ch':['Aijalon 1','Aijalon 2'],
  'Gebal@Jos.13.5-Ezk':['Gebal 1'],
  'Kir@1Sa.22.3-Jer':['Kir 2','Kir-hareseth'],
  'Ephraim@2Sa.13.23-Jhn':['Ephraim 2'],
  'Nahalol@Jos.19.15-Jdg':['Nahalal']
};
function parseRefs(text){
  const refs=new Set();
  for(const raw of (text||'').split(';')){
    const match=raw.trim().match(/^([1-3]?[A-Z][a-z]{1,2})\.(\d+)\.(\d+[a-z]?(?:,\d+[a-z]?)*)$/);
    if(!match || !(match[1] in BOOKS) || +match[2]<1)continue;
    // Verse zero is a Psalm superscription, not a numbered reader verse.
    for(const verse of match[3].split(','))if(parseInt(verse,10)>0)refs.add(`${match[1]}.${+match[2]}.${parseInt(verse,10)}`);
  }
  return [...refs].sort(sortRefs);
}
function parseStep(text){
  const records=[];let current;
  for(const [index,line] of text.replace(/^\uFEFF/,'').split(/\r?\n/).entries()){
    if(line.startsWith('$')){ current=null;continue; }
    const fields=line.split('\t');
    if(fields.length>=9 && /^[^@\s=]+@[^=\s]+=[HG]\d/.test(fields[0])){
      const [key,strong]=fields[0].split('=');
      current={key,strong,line:index+1,type:fields[8].trim(),geography:fields[1].trim(),rows:[]};
      if(current.type==='Place')records.push(current);
    } else if(current?.type==='Place' && PROPER_ROWS.test(fields[0]) && !/LXX addition|\(\?\)/i.test(fields[0])){
      const alias=display((fields[1]||'').split('@')[0].split('|')[0]);
      if(!alias || /[?<>@]/.test(alias))continue;
      current.rows.push({name:alias,refs:parseRefs(fields[4]),line:index+1});
    }
  }
  return records;
}
function settlement(row){return row.types.includes('settlement') && row.types.every(type=>['settlement','settlement and spring','special'].includes(type));}
function classify(record,geography){
  const override=CLASSIFICATION_OVERRIDES[record.key];
  if(override){
    const matches=override.map(name=>geography.find(item=>item.friendly_id===name));
    if(matches.some(item=>!item || !settlement(item)))throw new Error(`Invalid place override: ${record.key}`);
    return {matches,scopeNote:record.key.startsWith('Nahalol@')?null:'The STEP entry combines geographical identifications or uses of this name. Some indexed passages may refer to the surrounding region; consult each passage.'};
  }
  // Do not turn a valley or mountain into a town merely because its near-place is a town.
  if(/(?:^|_)(?:Mountain|Mount|Valley|Forest|Sea|River|Gate|Wilderness)(?:_|@)/i.test(record.key))return {reason:'Explicit non-settlement feature in STEP identity'};
  // '= near …' is a coordinate approximation, not an identity or city classification.
  const friendly=record.geography.includes('=')?'':normalize(record.geography);
  let matches=friendly ? geography.filter(item=>normalize(item.friendly_id)===friendly):[];
  if(!matches.length)matches=geography.filter(item=>{
    const link=item.linked_data?.s3b25cf;
    return [link?.id,...(link?.ids||[])].filter(Boolean).some(key=>key===baseKey(record.key));
  });
  if(!matches.length)return {reason:'No exact cross-source classification match'};
  if(!matches.every(settlement))return {reason:'Non-settlement or mixed settlement/geographical feature classification',candidates:matches.map(item=>({name:item.friendly_id,types:item.types}))};
  return {matches,scopeNote:matches.length>1?'The STEP entry combines more than one geographical identification under this name. The passages are retained together as indexed by STEP.':null};
}
function build(stepText,geoText){
  const records=parseStep(stepText),geography=geoText.trim().split(/\r?\n/).map((line,index)=>({...JSON.parse(line),sourceLine:index+1}));
  const selectedRecords=records.flatMap(record=>{
    if(record.key!=='Kanah@Jos.19.28-Jhn')return [record];
    // The OT town and NT town are separate OpenBible identities. STEP combines them;
    // its distinct Hebrew/Greek name rows provide exact passage partitions.
    return [{...record,strong:`${record.strong}-kanah`,displayName:'Kanah',geography:'Kanah_2',rows:record.rows.filter(row=>row.name==='Kanah'),splitNote:'This entry contains the Kanah passage in Joshua. STEP combines it with Cana; this explorer keeps the Old Testament and New Testament towns separate following the geographical source.'},{...record,strong:`${record.strong}-cana`,displayName:'Cana',geography:'Cana',rows:record.rows.filter(row=>row.name==='Cana'),splitNote:'This entry contains the Cana passages in John. STEP combines it with Kanah; this explorer keeps the New Testament and Old Testament towns separate following the geographical source.'}];
  });
  const places=[],excluded=[];
  for(const record of selectedRecords){
    const classification=classify(record,geography);
    if(!classification.matches){excluded.push({record:record.key,...classification});continue;}
    const forms=new Map(),allRefs=new Set();
    for(const row of record.rows){
      // Retain verse provenance even when a poetic descriptive label is not a safe name alias.
      for(const key of row.refs)allRefs.add(key);
      if(GENERIC_ALIASES.has(normalize(row.name)) || BLOCKED_ALIASES[record.key]?.has(normalize(row.name)))continue;
      if(!forms.has(row.name))forms.set(row.name,new Set());
      for(const key of row.refs)forms.get(row.name).add(key);
    }
    const keys=[...allRefs].sort(sortRefs);
    if(!keys.length){excluded.push({record:record.key,reason:'No canonical named-place references (group-only forms are excluded)'});continue;}
    const name=record.displayName||display(record.key.split('@')[0]);
    const aliases=[...forms.keys()].filter(alias=>alias!==name).sort((a,b)=>a.localeCompare(b,'en'));
    const testaments=[...new Set(keys.map(key=>ORDER[key.split('.')[0]]<39?'OT':'NT'))];
    const books=[...new Set(keys.map(key=>key.split('.')[0]))];
    const refs=keys.map(key=>{const [book,c,v]=key.split('.'),refLabel=label(key);return {label:refLabel,url:`https://www.biblegateway.com/passage/?search=${encodeURIComponent(refLabel)}&version=WEB`,book,chapter:+c,verse:+v,provenance:'indexed-name'};});
    const notes=[];
    if(record.splitNote)notes.push(record.splitNote);
    if(classification.scopeNote)notes.push(classification.scopeNote);
    if(classification.matches.some(item=>item.types.includes('special')))notes.push('The geographical source includes uncertain or unresolved identifications for this settlement. No modern location is asserted.');
    if(name==='Jerusalem')notes.push('The source also indexes poetic and visionary names and uses, including Zion and Salem. These passages do not always describe the historical city literally.');
    if(name==='Babylon')notes.push('The source combines Babylon with Babel, regional names and symbolic uses. These passages do not all describe the historical city literally.');
    if(name==='Rome')notes.push('Some indexed passages refer to Romans or Roman identity rather than naming the city itself. An indexed person or passage does not establish a visit to Rome.');
    const description=`A biblical settlement indexed in ${testaments.length===2?'the Old and New Testaments':testaments[0]==='OT'?'the Old Testament':'the New Testament'}. Its ${refs.length===1?'indexed passage is':'indexed passages begin at'} ${refs[0].label}${books.length>1?` and span ${books.length} books`:''}.`;
    places.push({id:`place-${record.strong}`,name,aliases,kind:'settlement',description,disambiguation:refs[0].label,refs,testaments,referenceCount:refs.length,nameForms:[...forms].map(([form,formRefs])=>({name:form,refs:[...formRefs].sort(sortRefs).map(label)})),source:{name:'STEP Bible TIPNR',url:`${STEP_URL}#L${record.line}`,record:record.key,commit:STEP_COMMIT,line:record.line},classification:{name:'OpenBible.info Bible Geocoding Data',sources:classification.matches.map(item=>({id:item.id,name:item.friendly_id,types:item.types,url:`${GEO_URL}#L${item.sourceLine}`})),commit:GEO_COMMIT},notes});
  }
  places.sort((a,b)=>a.name.localeCompare(b.name,'en') || a.refs[0].label.localeCompare(b.refs[0].label,'en') || a.id.localeCompare(b.id));
  const ids=new Set();for(const place of places){if(ids.has(place.id))throw new Error(`Duplicate place ID: ${place.id}`);ids.add(place.id);}
  const meta={title:'BiblePath cities and towns',version:1,placeCount:places.length,referenceCount:places.reduce((n,p)=>n+p.refs.length,0),scope:'Named settlements in the 66-book Protestant canon. This is a broad source index, not an exhaustive catalogue of every biblical place.',sources:[{name:'STEP Bible',url:'https://www.STEPBible.org',datasetUrl:STEP_URL,commit:STEP_COMMIT,license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'},{name:'OpenBible.info',url:'https://www.openbible.info/geo/',datasetUrl:GEO_URL,commit:GEO_COMMIT,license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'}],changes:['Selected STEP Place records classified as settlements by linked OpenBible records; ambiguous non-settlement classifications omitted. Nearby-place coordinate approximations are not used to classify a place.','Retained source identities and canonical verse references from named, spelling, Aramaic and Greek rows; excluded group-only, LXX and uncertain name forms.','Normalized reference subparts to single verses; deduplicated verses and aliases.','Generated short descriptions from structured reference fields only. No source AI biographies, map coordinates, geometry or images used.','Kept source-combined geographical identities with explicit notes, except Cana/Kanah separated on explicit source name-form verses. Generic descriptive aliases and Babylon regional alias labels are omitted from name matching.'],notes:['References identify indexed uses of a name, including poetic, regional or symbolic uses. They do not independently establish a modern location.','People indexed in the same passage are reading links; this alone does not establish residence or physical presence.','Settlements with uncertain modern identifications remain searchable, with notes. Countries, rivers, mountains and other geographical features are outside this explorer.']};
  meta.changes.push('Excluded verse-zero Psalm superscriptions from numbered passage links; the complete source record remains linked.');
  meta.notes.push('Source indexes may include inhabitants or derivative forms of city names, and spellings vary between Bible translations.');
  return {data:{places,meta},report:{sourcePlaceRecords:records.length,included:places.length,excluded,splitRecords:['Kanah@Jos.19.28-Jhn'],overrides:CLASSIFICATION_OVERRIDES,sourceHashes:SOURCES.map(({file,sha})=>({file,sha256:sha}))}};
}
async function readSource(spec){
  const target=path.join(ROOT,'.cache',spec.file);fs.mkdirSync(path.dirname(target),{recursive:true});
  if(!fs.existsSync(target)){const response=await fetch(spec.url);if(!response.ok)throw new Error(`Source download: ${response.status}`);fs.writeFileSync(target,Buffer.from(await response.arrayBuffer()));}
  const bytes=fs.readFileSync(target),sha=crypto.createHash('sha256').update(bytes).digest('hex');
  if(sha!==spec.sha)throw new Error(`Pinned source checksum mismatch: ${spec.file}`);
  return bytes.toString('utf8');
}
async function main(){
  const [step,geo]=await Promise.all(SOURCES.map(readSource));const {data,report}=build(step,geo);
  fs.writeFileSync(path.join(ROOT,'dist','places-data.json'),JSON.stringify(data));
  fs.writeFileSync(path.join(ROOT,'scripts','places-import-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Imported ${data.places.length} settlements and ${data.meta.referenceCount} verse references; ${report.excluded.length} place records excluded.`);
}
module.exports={build,parseStep,parseRefs,classify,BOOKS,SOURCES};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
