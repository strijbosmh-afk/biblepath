'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),C=require('../dist/scripture-search-core.js');
function build(tradition,topics){
 const file={christianity:'catholic-bible-data-nl.json',judaism:'tanakh-data.json',islam:'quran-data.json'}[tradition],raw=fs.readFileSync(path.join(dist,file)),data=JSON.parse(raw),rows=[],postings={},locations={},names={};
 const edition=tradition==='christianity'?'catholic-nl':'nl';
 function add(book,chapter,verse,text,e=edition,indexed=true){const k=C.key({edition:e,book,chapter,verse});if(locations[k]!==undefined)return;const id=rows.length;locations[k]=id;rows.push([book,chapter,verse,text,e]);if(indexed)for(const w of C.terms(text))(postings[w]??=[]).push(id);}
 if(tradition==='islam')for(const s of data.surahs){names[String(s.number)]=`${s.number}. ${s.transliteration}`;for(const v of s.ayahs)add(String(s.number),1,v.number,v.translations.nl);}
 else for(const b of (tradition==='judaism'?data.editions.nl.books:data.books)){names[b.id]=tradition==='judaism'?(data.books.find(x=>x.id===b.id)?.names?.nl||b.name):b.name;for(const ch of b.chapters)for(const v of ch.verses)add(b.id,ch.number,v.number,v.text);}
 if(tradition==='judaism')for(const t of topics)for(const p of t.passages||[]){if(p.tradition!==tradition||p.edition!=='he')continue;const ch=data.editions.he.books.find(b=>b.id===p.book)?.chapters.find(c=>c.number===p.chapter);for(const v of ch?.verses.filter(v=>v.number>=p.verse&&v.number<=(p.endVerse||p.verse))||[])add(p.book,p.chapter,v.number,v.text,'he',false);}
 const credits=tradition==='judaism'?{translation:data.editions.nl.meta,hebrew:data.editions.he.meta}:tradition==='islam'?{translation:data.editions.nl,rightsNotice:data.meta.rightsNotice}:data.meta;
 return {version:1,tradition,edition,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),names,credits,rows,locations,postings};
}
function previews(indexes,topics){const traditions={};for(const [tradition,index] of Object.entries(indexes)){const rows=[],locations={};for(const t of topics)for(const p of t.passages||[]){if(p.tradition!==tradition)continue;const k=C.key(p),id=index.locations[k];if(id===undefined||Object.hasOwn(locations,k))continue;locations[k]=rows.length;rows.push(index.rows[id]);}traditions[tradition]={version:1,tradition,edition:index.edition,names:index.names,credits:index.credits,rows,locations,postings:{}};}return {version:1,traditions};}
if(require.main===module){const args=process.argv.slice(2),topics=JSON.parse(fs.readFileSync(path.join(dist,'scripture-topics.json'),'utf8')).topics;let failed=false;const indexes={};function write(name,content){const target=path.join(dist,name);if(args.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content){console.error('Stale search index',name);failed=true;}}else fs.writeFileSync(target,content);}
 for(const f of ['christianity','judaism','islam']){const index=indexes[f]=build(f,topics),content=JSON.stringify(index);write(`search-index-${f}.json`,content);console.log(`${f}: ${index.rows.length} rows, ${(Buffer.byteLength(content)/1048576).toFixed(2)} MiB`);}write('scripture-topic-preview.json',JSON.stringify(previews(indexes,topics)));if(failed)process.exitCode=1;}
module.exports={build,previews};
