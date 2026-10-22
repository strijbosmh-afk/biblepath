'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'dist/sacred-library.js'),'utf8'),context);
const Library=context.window.SacredLibrary,plain=value=>JSON.parse(JSON.stringify(value));
const chapter=(number,verses)=>({number,verses:verses.map(([number,text])=>({number,text}))});
const tanakh={books:[
  {id:'GEN',name:'Genesis',names:{nl:'Genesis',en:'Genesis',he:'בראשית'},aliases:['Bereshit'],group:'torah',canonicalBook:'Genesis'},
  {id:'JOS',name:'Joshua',names:{nl:'Jozua',en:'Joshua',he:'יהושע'},group:'prophets',canonicalBook:'Joshua'},
  {id:'PSA',name:'Psalms',names:{nl:'Psalmen',en:'Psalms',he:'תהילים'},group:'writings',canonicalBook:'Psalms'}
],editions:{
  he:{meta:{title:'Hebrew fixture',language:'he',direction:'rtl'},books:[
    {id:'GEN',chapters:[chapter(1,[[1,'בְּרֵאשִׁית בָּרָא אֱלֹהִים'],[2,'וְהָאָרֶץ']]),chapter(2,[[1,'וַיְכֻלּוּ']])]},
    {id:'JOS',chapters:[chapter(1,[[1,'וַיְהִי']])]},
    {id:'PSA',chapters:[chapter(51,[[20,'הֵיטִיבָה בִרְצוֹנְךָ אֶת־צִיּוֹן']])]}]},
  en:{meta:{title:'JPS fixture',language:'en'},books:[
    {id:'GEN',chapters:[chapter(1,[[1,'In the beginning God created the heaven and the earth.'],[2,'And the earth was unformed and void.']]),chapter(2,[[1,'And the heaven and the earth were finished.']])]},
    {id:'JOS',chapters:[chapter(1,[[1,'Now it came to pass after the death of Moses.']])]},
    {id:'PSA',chapters:[chapter(51,[[20,'Do good in Thy favour unto Zion.']])]}]},
  nl:{meta:{title:'Dutch fixture',language:'nl'},books:[
    {id:'GEN',chapters:[chapter(1,[[1,'In den beginne schiep God den hemel en de aarde.'],[2,'De aarde nu was woest en ledig.']]),chapter(2,[[1,'Alzo zijn volbracht de hemel en de aarde.']])]},
    {id:'JOS',chapters:[chapter(1,[[1,'Het geschiedde nu na den dood van Mozes.']])]},
    {id:'PSA',chapters:[chapter(51,[[18,'Doe wel bij Sion naar Uw welbehagen.']])]}]}
}};
const model=new Library('judaism',tanakh);
assert.equal(model.defaultEdition('nl'),'nl');assert.equal(model.defaultEdition('fr'),'en');
assert.equal(model.edition('he').language,'he');
assert.deepEqual(model.units('nl').map(u=>u.name),['Genesis','Jozua','Psalmen']);
assert.deepEqual(model.units('en').map(u=>u.group),['torah','prophets','writings']);
assert.deepEqual(plain(model.reference('Bereshit 1:1–2','en')),{unit:'GEN',chapter:1,verse:1,endVerse:2});
assert.deepEqual(plain(model.location('he',{unit:'GEN',chapter:1,verse:1,endVerse:2})),{unit:'GEN',chapter:1,verse:1,endVerse:2});
assert.equal(model.location('he',{unit:'GEN',chapter:1,verse:1,endVerse:99}).endVerse,undefined,'Invalid range endpoints must not persist');
assert.equal(model.location('he',{unit:'GEN',chapter:1,verse:null,endVerse:2}).endVerse,undefined,'A chapter-only selection clears the range');
assert.equal(model.reference('בראשית 1:1','he').unit,'GEN');
assert.equal(model.reference('Jozua 1','nl').unit,'JOS');
for(const reference of ['John 3:16','GEN 0:1','GEN 1:99','GEN 1:2-1','GEN 999','Psalms 51:18'])assert.equal(model.reference(reference,'en'),null,reference);
assert.equal(model.reference('Psalmen 51:18','nl').verse,18);
assert.equal(model.reference('Psalms 51:20','en').verse,20);
assert.equal(model.reference('Psalm 51:20','en').verse,20,'Singular Psalm is a standard reference alias');
assert.equal(model.reference('Psaume 51:20','en').verse,20);
assert.equal(model.reference('Psalms 51:18','he'),null,'Edition-specific verse identities must not inherit the atlas numbering');
assert.equal(model.verses('nl','PSA',51)[0].number,18);assert.equal(model.verses('en','PSA',51)[0].number,20);
assert.deepEqual(plain(model.location('nl',{unit:'GEN',chapter:99,verse:99})),{unit:'GEN',chapter:1,verse:null});
assert.deepEqual(plain(model.location('nl',{unit:'unknown',chapter:2,verse:1})),{unit:'GEN',chapter:2,verse:1});
assert.equal(model.move('nl',{unit:'GEN',chapter:1},-1),null);
assert.deepEqual(plain(model.move('nl',{unit:'GEN',chapter:2},1)),{unit:'JOS',chapter:1,verse:null});
assert.deepEqual(plain(model.move('nl',{unit:'JOS',chapter:1},-1)),{unit:'GEN',chapter:2,verse:null});
assert.equal(model.move('nl',{unit:'PSA',chapter:51},1),null);
assert.equal(model.search('earth','en').total,3);assert.equal(model.search('earth','nl').total,0);
assert.equal(model.search('AARDE','nl').total,3);assert.equal(model.search('בראשית','he').total,1,'Hebrew vowel marks must not block search');
assert.equal(model.search('earth','en',{unit:'JOS'}).total,0);
const page=model.search('earth','en',{offset:1,limit:1});assert.equal(page.total,3);assert.equal(page.results.length,1);assert.equal(page.results[0].verse,2);
assert.equal(model.search('   ','en').total,0);
assert.equal(model.verses('nl','MAT',1).length,0,'Tanakh must not expose New Testament books');

const quran={editions:{ar:{title:'Arabic fixture',language:'ar',direction:'rtl'},nl:{title:'Dutch fixture',language:'nl'}},surahs:[
  {number:1,name:'الفاتحة',transliteration:'Al-Fatiha',translations:{nl:'De opening'},ayahs:[
    {number:1,arabic:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',translations:{nl:'In naam van God, den barmhartigen Erbarmer.'},notes:{nl:['Source note.']}},
    {number:2,arabic:'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',translations:{nl:'Lof zij God, den Heer der werelden.'}}
  ]},
  {number:2,name:'البقرة',transliteration:'Al-Baqara',ayahs:[{number:1,arabic:'الم',translations:{nl:'A. L. M.'}}]}
]};
const islam=new Library('islam',quran);
assert.equal(islam.defaultEdition('nl'),'nl');assert.equal(islam.defaultEdition('fr'),'ar');
assert.equal(islam.units('nl')[0].nativeName,'الفاتحة');
for(const label of ['1:1','Qur’an 1:1','Quran 1:1','Koran 1:1','Coran 1:1'])assert.deepEqual(plain(islam.reference(label,'nl')),{unit:'1',chapter:1,verse:1,endVerse:1});
assert.equal(islam.reference('1:1-2','ar').endVerse,2);
for(const label of ['Genesis 1:1','0:1','3:1','1:0','1:99','1:2-1','1:1-99'])assert.equal(islam.reference(label,'nl'),null,label);
const translated=islam.verses('nl','1')[0];assert.equal(translated.original,quran.surahs[0].ayahs[0].arabic);assert.equal(translated.notes[0],'Source note.');
assert.equal(islam.verses('ar','1')[0].original,null,'The original edition should not duplicate Arabic as translation');
assert.equal(islam.search('بسم الله','ar').total,1,'Arabic diacritics must not block search');
assert.equal(islam.search('GOD','nl').total,2);assert.equal(islam.search('God','ar').total,0);
assert.deepEqual(plain(islam.move('nl',{unit:'1',chapter:1},1)),{unit:'2',chapter:1,verse:null});
assert.deepEqual(plain(islam.move('nl',{unit:'2',chapter:1},-1)),{unit:'1',chapter:1,verse:null});
assert.equal(islam.move('nl',{unit:'1',chapter:1},-1),null);assert.equal(islam.move('nl',{unit:'2',chapter:1},1),null);
assert.equal(islam.chapters('nl','999').length,0);
for(const library of [model,islam]){
  const first=library.units()[0].id;
  assert.equal(library.chapters('missing',first).length,0);
  assert.equal(library.verses('missing',first,1).length,0);
  assert.equal(library.reference(library.tradition==='islam'?'1:1':'Genesis 1:1','missing'),null);
  assert.equal(library.search('God','missing').total,0);
  assert.equal(library.move('missing',{unit:first,chapter:1},1),null);
  assert.equal(library.move('nl',{unit:first,chapter:1},0),null);
  assert.equal(library.move('nl',{unit:first,chapter:1},2),null);
}
assert.equal(islam.verses('nl','1',2).length,0,'A Qur’an surah has no nested chapter 2');
assert.throws(()=>new Library('christianity',quran),/Unknown tradition/);
assert.throws(()=>new Library('islam',{editions:{}}),/Missing editions/);

// Verify the model can navigate the complete published datasets, including the
// last verse of every chapter/surah in every edition. Dataset importer suites
// separately prove the text's source fidelity and canonical structure.
for(const [tradition,filename] of [['judaism','tanakh-data.json'],['islam','quran-data.json']]){
  const published=JSON.parse(fs.readFileSync(path.join(root,'dist',filename),'utf8')),full=new Library(tradition,published);
  const units=full.units('nl');assert.equal(units.length,tradition==='judaism'?39:114);
  assert.equal(full.defaultEdition('nl'),'nl');
  if(tradition==='judaism')assert.equal(new Set(units.map(unit=>unit.canonicalBook)).size,24);
  for(const edition of Object.keys(published.editions)){
    let count=0;
    for(const unit of units){
      const chapters=full.chapters(edition,unit.id);assert(chapters.length,`${filename}/${edition}/${unit.id}: missing chapter navigation`);
      for(const number of chapters){
        const verses=full.verses(edition,unit.id,number);assert(verses.length);
        for(const verse of verses)assert.equal(typeof verse.text,'string',`${edition}/${unit.id}/${number}:${verse.number}`);
        count+=verses.length;
        const last=verses.at(-1),label=tradition==='islam'?`${unit.id}:${last.number}`:`${unit.name} ${number}:${last.number}`;
        const reference=full.reference(label,edition,'nl');
        assert(reference,`${filename}/${edition}: last-verse reference ${label} must resolve`);
        assert.equal(reference.unit,unit.id);assert.equal(reference.chapter,number);assert.equal(reference.verse,last.number);
      }
    }
    assert.equal(count,tradition==='judaism'?full.edition(edition).verseCount:6236);
    if(tradition==='judaism')assert.equal(full.reference('Matthew 1:1',edition),null);
  }
  if(tradition==='islam')assert(full.search('الحمد','ar').results.some(result=>result.unit==='1'&&result.verse===2),'Ordinary Arabic spelling must find the Uthmani Arabic passage');
}
console.log('Sacred library passed: canon/group order, independent editions, native-script search, invalid state guards, references, search pagination, boundaries and all published chapter/surah endpoints.');
