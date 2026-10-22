'use strict';
// Offline, edition-specific crosswalk. No scripture text is generated here.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const key = value => String(value).trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
const note = (nl, en, fr) => ({nl, en, fr});
const target = (book, chapter, verse, endVerse = verse) => ({edition:'catholic-nl', book, chapter, verse, endVerse});
function load() {
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'dist/data.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'dist/scripture.js'), 'utf8'), context);
  const bible = read('dist/catholic-bible-data-nl.json');
  return {people:context.window.BIBLE_DATA.people, bible, model:new context.window.BibleScripture(bible)};
}
function parse(label, model) {
  const m = key(label).match(/^(.*?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Unreviewed atlas label: ${label}`);
  const book = model.book(m[1]);
  if (!book) throw new Error(`Unknown atlas book: ${label}`);
  return {book:book.id, chapter:+m[2], verse:+m[3], endVerse:+(m[4] || m[3])};
}
function mergeTargets(values) {
  const out = [];
  for (const item of values) {
    const previous = out.at(-1);
    if (previous && previous.book === item.book && previous.chapter === item.chapter && item.verse <= previous.endVerse + 1 && item.verse >= previous.verse) previous.endVerse = Math.max(previous.endVerse, item.endVerse);
    else if (!out.some(v => JSON.stringify(v) === JSON.stringify(item))) out.push({...item});
  }
  return out;
}
function build() {
  const {people,bible,model} = load();
  const rules = read('scripts/atlas-versification-rules.json');
  const manualOT = read('scripts/atlas-ot-review.json');
  const catholic = read('scripts/catholic-person-passage-map.json');
  const catholicRefs = read('dist/catholic-people.json').people.flatMap(p=>p.refs || []);
  const catholicKeys = new Set(catholicRefs.map(ref=>`catholic|${key(ref.label)}`));
  if (catholicRefs.length !== catholic.meta.occurrenceCount || catholicKeys.size !== catholic.meta.referenceCount || catholicKeys.size !== Object.keys(catholic.references).length) throw new Error('Catholic reference coverage changed: review the supplemental crosswalk.');
  for (const ref of catholicRefs) {
    const record=catholic.references[`catholic|${key(ref.label)}`];
    if (!record || ['book','chapter','verse','endVerse','edition'].some(field=>record.source[field]!==ref[field])) throw new Error(`Unreviewed Catholic source reference: ${ref.label}`);
  }
  if (sha(fs.readFileSync(path.join(ROOT,'dist/catholic-bible-data-nl.json'))) !== rules.meta.targetAssetSha256) throw new Error('Dutch scripture changed: review the crosswalk before updating the source pin.');
  if (catholic.meta.sourceTextSha256 !== read('dist/catholic-bible-data.json').meta.textSha256 || catholic.meta.targetTextSha256 !== bible.meta.textSha256) throw new Error('Catholic source texts changed: review the supplemental crosswalk.');
  const sourceRefs = people.flatMap(p => p.refs || []);
  const sourceDigest = sha(JSON.stringify(sourceRefs.map(r => [r.translation,r.label])));
  if (sourceDigest !== rules.meta.atlasReferencesSha256) throw new Error('Atlas references changed: review new references before updating the source pin.');
  const references = {};
  const covered = new Set(rules.standardCoverage);
  const manual = {...manualOT, ...rules.reviewed};
  function verseMap(book,chapter,verse,translation) {
    const locator = `${book}.${chapter}:${verse}`;
    const explicit = manual[`${translation}|${locator}`] || manual[locator];
    if (explicit) return explicit;
    if (book === 'PSA' && verse === 0) {
      const row = model.verse(book,chapter,1);
      if (!row || !rules.psalmTitles.includes(chapter)) throw new Error(`Unreviewed Psalm title: ${locator}`);
      return {status:'mapped', targets:[target(book,chapter,1)], evidence:'Canisius/eBible preserves this canonical Psalm superscription at the start of verse 1.', note:note('Het psalmopschrift (vers 0 in de index) staat in deze Nederlandse uitgave aan het begin van vers 1.', 'The Psalm superscription (verse 0 in the index) is included at the start of verse 1 in this Dutch edition.', 'Le titre du psaume (verset 0 dans l’index) figure au début du verset 1 dans cette édition néerlandaise.')};
    }
    const row = model.verse(book,chapter,verse);
    if (row && !row.text.replace(/[-–—\s]/g,'')) return {status:'partial',targets:[target(book,chapter,verse)],evidence:'Pinned Canisius source has a dash and an edition note at this locator; no substitute scripture is invented.',note:note('De Canisiusbron heeft hier geen afzonderlijke verszin. De Nederlandse lezer opent het oorspronkelijke versnummer met de toelichting uit de bron.', 'Canisius has no separate scripture sentence here. The Dutch reader opens the original verse number and its source note.', 'Canisius ne donne pas de phrase biblique distincte ici. Le lecteur néerlandais ouvre le numéro original et la note de la source.')};
    const selected = rules.selected[locator];
    if (selected) return {status:'mapped',targets:selected.targets,evidence:`STEP TVTMS ${selected.sourceType}, line ${selected.line}; ${selected.tests.join(' & ')}. Checked against the pinned Dutch source.`};
    if (covered.has(locator)) throw new Error(`Sensitive versification location lacks review: ${locator}`);
    if (!row) throw new Error(`Missing unreviewed target: ${locator}`);
    return {status:'mapped',targets:[target(book,chapter,row.number,row.endNumber || row.number)],evidence:'Standard English reference in the reviewed Canisius/eBible numbering profile; no applicable STEP TVTMS renumbering. Pinned source-specific exceptions override this rule.'};
  }
  for (const ref of sourceRefs) {
    if (!['ESV','KJV'].includes(ref.translation)) throw new Error(`Unreviewed source edition: ${ref.translation}`);
    const mapKey = `atlas-${ref.translation}|${key(ref.label)}`;
    if (references[mapKey]) continue;
    const source = parse(ref.label,model), parts=[];
    for(let v=source.verse;v<=source.endVerse;v++) parts.push(verseMap(source.book,source.chapter,v,ref.translation));
    const notes=parts.map(p=>p.note).filter(Boolean).filter((n,i,a)=>a.findIndex(v=>JSON.stringify(v)===JSON.stringify(n))===i);
    references[mapKey]={status:parts.some(p=>p.status==='partial')?'partial':'mapped', targets:mergeTargets(parts.flatMap(p=>p.targets)), evidence:[...new Set(parts.map(p=>p.evidence))].join(' '), ...(notes.length?{note:Object.fromEntries(['nl','en','fr'].map(l=>[l,notes.map(n=>n[l]).join(' ')]))}:{})};
  }
  Object.assign(references,catholic.references);
  for(const [label,record] of Object.entries(references)) {
    if(!record.targets.length) throw new Error(`Empty mapping: ${label}`);
    for(const t of record.targets) {
      if(t.edition!=='catholic-nl'||!model.verse(t.book,t.chapter,t.verse)||!model.verse(t.book,t.chapter,t.endVerse)) throw new Error(`Invalid target: ${label} ${JSON.stringify(t)}`);
      for(let n=t.verse;n<=t.endVerse;n++) {
        if(!model.verse(t.book,t.chapter,n) && !(t.book==='MRK'&&t.chapter===9&&n===44&&record.status==='partial')) throw new Error(`Unaccounted hole: ${label} ${n}`);
      }
    }
  }
  const counts = Object.values(references).reduce((o,r)=>(o[r.status]++,o),{mapped:0,partial:0,unavailable:0});
  // Repeated evidence is interned so the browser need not download the same
  // numbering explanation eleven thousand times. This does not alter targets.
  const evidence = {}, evidenceIds = new Map();
  for (const record of Object.values(references)) {
    const serialized = JSON.stringify(record.evidence);
    if (!evidenceIds.has(serialized)) {
      const id = `e${evidenceIds.size + 1}`;
      evidenceIds.set(serialized,id); evidence[id] = record.evidence;
    }
    record.evidence = evidenceIds.get(serialized);
  }
  return {meta:{version:1,targetEdition:'catholic-nl',sourceEditions:['ESV','KJV','Douay-Rheims 1899'],atlasReferenceOccurrences:sourceRefs.length,catholicReferenceOccurrences:catholicRefs.length,uniqueReferences:Object.keys(references).length,statusCounts:counts,sourcePins:rules.meta,supplementReview:catholic.meta},evidence,references};
}
if(require.main===module) {
  const data=build();
  const output=JSON.stringify(data)+'\n',destination=path.join(ROOT,'dist/person-passage-map.json');
  if(process.argv.includes('--check')) {
    if(fs.readFileSync(destination,'utf8')!==output) throw new Error('Person passage map is stale; run node scripts/build-person-passage-map.cjs');
    console.log(`Checked ${data.meta.uniqueReferences} edition-specific person passages: ${JSON.stringify(data.meta.statusCounts)}`);
  } else {
    fs.writeFileSync(destination,output);
    console.log(`Built ${data.meta.uniqueReferences} edition-specific person passages: ${JSON.stringify(data.meta.statusCounts)}`);
  }
}
module.exports={build,load,parse,mergeTargets};
