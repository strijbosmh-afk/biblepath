#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {table,names,extraAliases,curated}=require('./entity-locale-copy.cjs');
const ROOT=path.resolve(__dirname,'..');
const books=table(`Genesis	Genesis	Genèse
Exodus	Exodus	Exode
Leviticus	Leviticus	Lévitique
Numbers	Numeri	Nombres
Deuteronomy	Deuteronomium	Deutéronome
Joshua	Jozua	Josué
Judges	Rechters	Juges
Ruth	Ruth	Ruth
1 Samuel	1 Samuel	1 Samuel
2 Samuel	2 Samuel	2 Samuel
1 Kings	1 Koningen	1 Rois
2 Kings	2 Koningen	2 Rois
1 Chronicles	1 Kronieken	1 Chroniques
2 Chronicles	2 Kronieken	2 Chroniques
Ezra	Ezra	Esdras
Nehemiah	Nehemia	Néhémie
Esther	Ester	Esther
Job	Job	Job
Psalms	Psalmen	Psaumes
Psalm	Psalm	Psaume
Proverbs	Spreuken	Proverbes
Ecclesiastes	Prediker	Ecclésiaste
Song of Solomon	Hooglied	Cantique des cantiques
Isaiah	Jesaja	Ésaïe
Jeremiah	Jeremia	Jérémie
Lamentations	Klaagliederen	Lamentations
Ezekiel	Ezechiël	Ézéchiel
Daniel	Daniël	Daniel
Hosea	Hosea	Osée
Joel	Joël	Joël
Amos	Amos	Amos
Obadiah	Obadja	Abdias
Jonah	Jona	Jonas
Micah	Micha	Michée
Nahum	Nahum	Nahum
Habakkuk	Habakuk	Habacuc
Zephaniah	Sefanja	Sophonie
Haggai	Haggai	Aggée
Zechariah	Zacharia	Zacharie
Malachi	Maleachi	Malachie
Matthew	Matteüs	Matthieu
Mark	Marcus	Marc
Luke	Lucas	Luc
John	Johannes	Jean
Acts	Handelingen	Actes
Romans	Romeinen	Romains
1 Corinthians	1 Korintiërs	1 Corinthiens
2 Corinthians	2 Korintiërs	2 Corinthiens
Galatians	Galaten	Galates
Ephesians	Efeziërs	Éphésiens
Philippians	Filippenzen	Philippiens
Colossians	Kolossenzen	Colossiens
1 Thessalonians	1 Tessalonicenzen	1 Thessaloniciens
2 Thessalonians	2 Tessalonicenzen	2 Thessaloniciens
1 Timothy	1 Timoteüs	1 Timothée
2 Timothy	2 Timoteüs	2 Timothée
Titus	Titus	Tite
Philemon	Filemon	Philémon
Hebrews	Hebreeën	Hébreux
James	Jakobus	Jacques
1 Peter	1 Petrus	1 Pierre
2 Peter	2 Petrus	2 Pierre
1 John	1 Johannes	1 Jean
2 John	2 Johannes	2 Jean
3 John	3 Johannes	3 Jean
Jude	Judas	Jude
Revelation	Openbaring	Apocalypse`);
const eras=table(`Beginnings	Oorsprong	Origines
Patriarchs	Aartsvaders	Patriarches
Exodus	Uittocht	Exode
Judges	Rechters	Juges
Kingdom	Koninkrijk	Royauté
Exile	Ballingschap	Exil
Old Testament	Oude Testament	Ancien Testament
New Testament	Nieuwe Testament	Nouveau Testament`);
const periods=table(`at the time of Exile and Return	tijdens de ballingschap en de terugkeer	à l’époque de l’exil et du retour
at the time of United Monarchy	tijdens het verenigde koninkrijk	à l’époque de la monarchie unifiée
at the time of Divided Monarchy	tijdens het verdeelde koninkrijk	à l’époque des royaumes divisés
before Israel's Monarchy	vóór het koningschap in Israël	avant la monarchie d’Israël
at the time of Egypt and Wilderness	in de tijd in Egypte en de woestijn	à l’époque du séjour en Égypte et au désert
at the time of the Patriarchs	in de tijd van de aartsvaders	à l’époque des patriarches
at the time of the New Testament	in de tijd van het Nieuwe Testament	à l’époque du Nouveau Testament
at the time before the Flood	vóór de zondvloed	avant le déluge
at the time of Egypt and Wilderness and Conquest	in de tijd in Egypte, de woestijn en de verovering van Kanaän	à l’époque du séjour en Égypte, du désert et de la conquête de Canaan
at the time of United Monarchyand Divided Monarchy	tijdens het verenigde en het verdeelde koninkrijk	à l’époque de la monarchie unifiée et des royaumes divisés`);
const roles=table(`man	Een man	Un homme
woman	Een vrouw	Une femme
woman of	Een vrouw	Une femme
woman (?)	Een vrouw (?)	Une femme (?)
woman descended from Judah	Een vrouw die afstamt van Juda	Une femme descendante de Juda
levite	Een Leviet	Un Lévite
judge	Een rechter	Un juge
warrior	Een krijger	Un guerrier
high priest	Een hogepriester	Un grand prêtre
king	Een koning	Un roi
david's brother	Een broer van David	Un frère de David
aaron's adversary	Een tegenstander van Aäron	Un adversaire d’Aaron
david's warrior	Een krijger van David	Un guerrier de David
priest	Een priester	Un prêtre
david's compatriot	Een tijdgenoot en volksgenoot van David	Un compatriote de David
prince	Een vorst	Un prince
tetrarch	Een viervorst	Un tétrarque
emperor xerxes i,	Keizer Xerxes I	L’empereur Xerxès Ier
prophet	Een profeet	Un prophète
edomite	Een Edomiet	Un Édomite
ishmaelite	Een Ismaëliet	Un Ismaélite
isaiah's father	De vader van Jesaja	Le père d’Ésaïe
canaanite	Een Kanaäniet	Un Cananéen
ethnarch	Een ethnarch (volksvorst)	Un ethnarque
artaxerxes longimanus, an emperor	Artaxerxes Longimanus, een keizer	Artaxerxès Longue-Main, un empereur
singer	Een zanger	Un chantre
queen	Een koningin	Une reine
emperor	Een keizer	Un empereur
daniel's compatriot	Een volksgenoot van Daniël	Un compatriote de Daniel
david's compatriots	Een volksgenoot van David	Un compatriote de David
apostle	Een apostel	Un apôtre
jeremiah's servant	Een dienaar van Jeremia	Un serviteur de Jérémie
ammonite	Een Ammoniet	Un Ammonite
asaph's father	De vader van Asaf	Le père d’Asaph
joshua's compatriot	Een volksgenoot van Jozua	Un compatriote de Josué
emperor darius i, 'the great',	Keizer Darius I, ‘de Grote’	L’empereur Darius Ier, « le Grand »
ruler	Een heerser	Un dirigeant
nurse	Een voedster	Une nourrice
arabian	Een Arabier	Un Arabe
david's son	Een zoon van David	Un fils de David
governor	Een gouverneur	Un gouverneur
giant	Een reus	Un géant
persian	Een Pers	Un Perse
king herod the great: ruler	Koning Herodes de Grote, een heerser	Le roi Hérode le Grand, un souverain
syrian	Een Syriër	Un Syrien
midianite	Een Midjaniet	Un Madianite
pharaoh	Een farao	Un pharaon
prophetess	Een profetes	Une prophétesse
aaron's compatriot	Een volksgenoot van Aäron	Un compatriote d’Aaron
saul's son	Een zoon van Saul	Un fils de Saül
jeremiah's adversary	Een tegenstander van Jeremia	Un adversaire de Jérémie
moabite warrior	Een Moabitische krijger	Un guerrier moabite
father of an apostle	De vader van een apostel	Le père d’un apôtre
egyptian	Een Egyptenaar	Un Égyptien
moabite	Een Moabiet	Un Moabite
caleb's father	De vader van Kaleb	Le père de Caleb
david's nephew	Een neef van David	Un neveu de David
saul's father	De vader van Saul	Le père de Saül
mary's brother	Een broer van Maria	Un frère de Marie
tetrarch of abilene	Een viervorst van Abilene	Un tétrarque d’Abilène
manasseh's son	Een zoon van Manasse	Un fils de Manassé
samson's father	De vader van Simson	Le père de Samson
lazarus' sister	Een zus van Lazarus	Une sœur de Lazare
barnabus' relative	Een familielid van Barnabas	Un parent de Barnabas
jonathan's son	Een zoon van Jonatan	Un fils de Jonathan
esther's relative	Een familielid van Ester	Un parent d’Esther
saul's uncle	Een oom van Saul	Un oncle de Saül
babylonian official of samgar	Een Babylonische beambte van Samgar	Un fonctionnaire babylonien de Samgar
babylonian official	Een Babylonische beambte	Un fonctionnaire babylonien
david's adversary	Een tegenstander van David	Un adversaire de David
deborah's adversary	Een tegenstander van Debora	Un adversaire de Débora
absalom's daughter	Een dochter van Absalom	Une fille d’Absalom
Leader's title	Titel van een leider	Titre d’un dirigeant
nehemiah's adversary	Een tegenstander van Nehemia	Un adversaire de Néhémie
bathsheba's husband	De echtgenoot van Batseba	L’époux de Bath-Schéba
aaron's uncle	Een oom van Aäron	Un oncle d’Aaron
warrior ammonite	Een Ammonitische krijger	Un guerrier ammonite`);
const notes=table(`Matthew 1:5 names Rahab as Boaz’s mother. Identifying her with Rahab of Jericho is a common interpretation, but the genealogy does not explicitly make that identification.	Matteüs 1:5 noemt Rachab als de moeder van Boaz. Zij wordt vaak vereenzelvigd met Rachab uit Jericho, maar het geslachtsregister zegt niet uitdrukkelijk dat het dezelfde persoon is.	Matthieu 1:5 nomme Rahab comme mère de Boaz. L’identifier à Rahab de Jéricho est une interprétation courante, mais la généalogie ne le dit pas explicitement.
Genesis 11:12 gives Arphaxad as Shelah’s father. Luke 3:35–36 includes Cainan between them in some textual traditions; this map retains the Genesis parent line.	Genesis 11:12 noemt Arpachsad als de vader van Sela. In sommige teksttradities vermeldt Lucas 3:35–36 Kenan tussen hen; deze kaart volgt de afstammingslijn van Genesis.	Genèse 11:12 donne Arpacschad comme père de Schélach. Dans certaines traditions textuelles, Luc 3:35–36 place Kaïnam entre eux ; cette carte conserve la filiation de la Genèse.
Corrected an upstream role field: Genesis 35:8 identifies this Deborah as Rebekah’s nurse. She is distinct from the prophetess and judge in Judges 4–5. Source: https://www.biblegateway.com/passage/?search=Genesis%2035%3A8&version=ESV	Rol uit de bron gecorrigeerd: Genesis 35:8 noemt deze Debora de voedster van Rebekka. Zij is een andere persoon dan de profetes en rechter uit Rechters 4–5. Bron: https://www.biblegateway.com/passage/?search=Genesis%2035%3A8&version=ESV	Rôle corrigé dans la source : Genèse 35:8 identifie cette Débora comme la nourrice de Rébecca. Elle est distincte de la prophétesse et juge de Juges 4–5. Source : https://www.biblegateway.com/passage/?search=Genesis%2035%3A8&version=ESV
Corrected an upstream gender field: Judges 4:4 describes Deborah as Lappidoth’s wife, so Lappidoth is shown as her husband. Source: https://www.biblegateway.com/passage/?search=Judges%204%3A4&version=ESV	Geslachtsaanduiding uit de bron gecorrigeerd: Rechters 4:4 noemt Debora de vrouw van Lappidot. Daarom wordt Lappidot als haar echtgenoot getoond. Bron: https://www.biblegateway.com/passage/?search=Judges%204%3A4&version=ESV	Sexe corrigé dans la source : Juges 4:4 présente Débora comme l’épouse de Lappidoth ; Lappidoth est donc affiché comme son époux. Source : https://www.biblegateway.com/passage/?search=Judges%204%3A4&version=ESV
The geographical source includes uncertain or unresolved identifications for this settlement. No modern location is asserted.	De geografische bron bevat onzekere of onopgeloste identificaties voor deze nederzetting. Er wordt geen moderne locatie vastgesteld.	La source géographique contient des identifications incertaines ou non résolues pour cette localité. Aucun emplacement moderne n’est affirmé.
The STEP entry combines geographical identifications or uses of this name. Some indexed passages may refer to the surrounding region; consult each passage.	De STEP-vermelding combineert geografische identificaties of toepassingen van deze naam. Sommige geïndexeerde passages kunnen over de omliggende streek gaan; raadpleeg telkens de passage.	La notice STEP regroupe des identifications géographiques ou des emplois de ce nom. Certains passages indexés peuvent désigner la région environnante ; consultez chaque passage.
The STEP entry combines more than one geographical identification under this name. The passages are retained together as indexed by STEP.	De STEP-vermelding combineert meerdere geografische identificaties onder deze naam. De passages blijven samen staan zoals ze in STEP zijn geïndexeerd.	La notice STEP regroupe plusieurs identifications géographiques sous ce nom. Les passages restent réunis tels qu’ils sont indexés dans STEP.
The source combines Babylon with Babel, regional names and symbolic uses. These passages do not all describe the historical city literally.	De bron combineert Babylon met Babel, streeknamen en symbolisch gebruik. Niet al deze passages beschrijven letterlijk de historische stad.	La source regroupe Babylone avec Babel, des noms régionaux et des emplois symboliques. Ces passages ne décrivent pas tous littéralement la ville historique.
This entry contains the Cana passages in John. STEP combines it with Kanah; this explorer keeps the New Testament and Old Testament towns separate following the geographical source.	Deze vermelding bevat de passages over Kana in Johannes. STEP combineert Kana met Kanah; deze verkenner houdt de nieuwtestamentische en oudtestamentische plaatsen gescheiden, in navolging van de geografische bron.	Cette notice contient les passages de Jean concernant Cana. STEP réunit Cana et Kana ; cet explorateur sépare les villes du Nouveau et de l’Ancien Testament, conformément à la source géographique.
The source also indexes poetic and visionary names and uses, including Zion and Salem. These passages do not always describe the historical city literally.	De bron indexeert ook poëtische en visionaire namen en toepassingen, waaronder Sion en Salem. Deze passages beschrijven niet altijd letterlijk de historische stad.	La source indexe aussi des noms et des emplois poétiques ou visionnaires, notamment Sion et Salem. Ces passages ne décrivent pas toujours littéralement la ville historique.
This entry contains the Kanah passage in Joshua. STEP combines it with Cana; this explorer keeps the Old Testament and New Testament towns separate following the geographical source.	Deze vermelding bevat de passage over Kanah in Jozua. STEP combineert Kanah met Kana; deze verkenner houdt de oudtestamentische en nieuwtestamentische plaatsen gescheiden, in navolging van de geografische bron.	Cette notice contient le passage de Josué concernant Kana. STEP réunit Kana et Cana ; cet explorateur sépare les villes de l’Ancien et du Nouveau Testament, conformément à la source géographique.
Some indexed passages refer to Romans or Roman identity rather than naming the city itself. An indexed person or passage does not establish a visit to Rome.	Sommige geïndexeerde passages gaan over Romeinen of een Romeinse identiteit zonder de stad zelf te noemen. Een geïndexeerde persoon of passage toont niet aan dat iemand Rome bezocht.	Certains passages indexés évoquent les Romains ou l’identité romaine sans nommer la ville elle-même. L’indexation d’une personne ou d’un passage ne prouve pas une visite à Rome.`);
Object.assign(names,table(`Cana	Kana	Cana
Kanah	Kanah	Kana
Lappidoth	Lappidot	Lappidoth`));
function name(value,lang){return names[value]?.[lang]||value;}
function reference(value,lang){return String(value||'').replace(/\b((?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)*)(?= \d+:\d+)/g,book=>books[book]?.[lang]||book);}
function aliases(entity,lang){
  const original=[entity.name,...(entity.aliases||[])];
  return [...new Set([...original.map(value=>name(value,lang)),...original,...original.flatMap(value=>extraAliases[lang][value]||[])])];
}
// Source parsing contains a few non-name translation/gloss fragments. Retain
// them in search aliases for compatibility, but do not present them as names.
const NON_NAME_DISPLAY_ALIASES=new Set(['wielded','imperial','sons','men','weary God','second','steward','valor','tribute','great']);
function displayAliases(entity,lang){
  const current=name(entity.name,lang);
  return [...new Set((entity.aliases||[]).filter(value=>!NON_NAME_DISPLAY_ALIASES.has(value)).map(value=>name(value,lang)))].filter(value=>value!==current);
}
function parentPhrase(values,lang){
  const localized=values.map(value=>name(value,lang));
  if(lang==='nl')return localized.join(' en ');
  return localized.map(value=>/^[aàâäeéèêëiîïoôöuùûühy]/i.test(value)?`d’${value}`:`de ${value}`).join(' et ');
}
function translatedNotes(entity,lang){return (entity.notes||[]).map(note=>{if(!notes[note])throw new Error(`Untranslated note for ${entity.id}: ${note}`);return notes[note][lang];});}
function roleDescription(english,gender,lang){
  const withoutArticle=english.replace(/^An? /,''),[role,period]=withoutArticle.split(' living ');
  if(!roles[role])throw new Error(`Untranslated role: ${role}`);
  let result=roles[role][lang];
  if(role==='judge'&&gender==='female'&&lang==='fr')result='Une juge';
  if(period){if(!periods[period])throw new Error(`Untranslated period: ${period}`);result+=` ${periods[period][lang]}`;}
  return result;
}
function peopleDescription(person,lang){
  if(person.profileOrigin==='curated'){
    if(!curated[person.id])throw new Error(`Missing curated profile ${person.id}`);
    return curated[person.id][lang];
  }
  const match=person.description.match(/^(.+)\. Indexed at (.+? \d+:\d+)\.(?: The STEP Bible index records (?:him|her) as a child of (.+)\.)?$/);
  if(!match)throw new Error(`Untranslated description pattern ${person.id}: ${person.description}`);
  const role=roleDescription(match[1],person.gender,lang),ref=reference(match[2],lang);
  let text=lang==='nl'?`${role}. Geïndexeerd bij ${ref}.`:`${role}. Répertorié${person.gender==='female'?'e':''} en ${ref}.`;
  if(match[3]){
    const parents=parentPhrase(match[3].split(' and '),lang);
    text+=lang==='nl'?` De STEP Bible-index vermeldt ${person.gender==='female'?'haar':'hem'} als kind van ${parents}.`:` L’index STEP Bible ${person.gender==='female'?'la':'le'} présente comme enfant ${parents}.`;
  }
  return text;
}
function disambiguation(person,lang){
  if(person.id==='jesus' && person.disambiguation==='Son of Mary · Joseph is his legal father')return lang==='nl'?'Zoon van Maria · Jozef is zijn wettelijke vader':'Fils de Marie · Joseph est son père légal';
  const parents=person.disambiguation?.match(/^(Son|Daughter) of (.+)$/);
  if(parents){
    if(/[·;:]/.test(parents[2]))throw new Error(`Untranslated parent-name clause for ${person.id}: ${person.disambiguation}`);
    return `${lang==='nl'?(parents[1]==='Son'?'Zoon van':'Dochter van'):(parents[1]==='Son'?'Fils':'Fille')} ${parentPhrase(parents[2].split(' & '),lang)}`;
  }
  const parts=(person.disambiguation||'').split(' · ');
  if(parts.length===2&&eras[parts[0]])return `${eras[parts[0]][lang]} · ${reference(parts[1],lang)}`;
  throw new Error(`Untranslated disambiguation for ${person.id}: ${person.disambiguation}`);
}
function placeDescription(place,lang){
  const both=place.testaments.length===2,old=place.testaments[0]==='OT',count=place.refs.length,bookCount=new Set(place.refs.map(ref=>ref.book)).size,first=reference(place.refs[0].label,lang);
  if(lang==='nl')return `Een bijbelse nederzetting, geïndexeerd in ${both?'het Oude en Nieuwe Testament':old?'het Oude Testament':'het Nieuwe Testament'}. ${count===1?'De geïndexeerde passage is':'De geïndexeerde passages beginnen bij'} ${first}${bookCount>1?` en beslaan ${bookCount} boeken`:''}.`;
  return `Une localité biblique répertoriée dans ${both?'l’Ancien et le Nouveau Testament':old?'l’Ancien Testament':'le Nouveau Testament'}. ${count===1?'Le passage indexé est':'Les passages indexés commencent en'} ${first}${bookCount>1?` et couvrent ${bookCount} livres`:''}.`;
}
function build(data,placeData){
  const output={};
  for(const lang of ['nl','fr']){
    const people={},places={};
    for(const person of data.people){
      if(!eras[person.era])throw new Error(`Untranslated era ${person.era}`);
      people[person.id]={name:name(person.name,lang),description:peopleDescription(person,lang),era:eras[person.era][lang],disambiguation:disambiguation(person,lang),aliases:aliases(person,lang),displayAliases:displayAliases(person,lang),notes:translatedNotes(person,lang)};
    }
    for(const place of placeData.places){
      // Keep canonical reference labels for identity matching in all languages.
      const forms=new Map();
      for(const form of place.nameForms||[])for(const value of [name(form.name,lang),form.name,...(extraAliases[lang][form.name]||[])]){
        if(!forms.has(value))forms.set(value,new Set());for(const ref of form.refs)forms.get(value).add(ref);
      }
      places[place.id]={name:name(place.name,lang),description:placeDescription(place,lang),aliases:aliases(place,lang),displayAliases:displayAliases(place,lang),disambiguation:reference(place.disambiguation,lang),notes:translatedNotes(place,lang),nameForms:[...forms].map(([form,refs])=>({name:form,refs:[...refs]}))};
    }
    output[lang]={people,places};
  }
  return output;
}
function load(){const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'dist/data.js'),'utf8'),context);return {data:JSON.parse(JSON.stringify(context.window.BIBLE_DATA)),placeData:JSON.parse(fs.readFileSync(path.join(ROOT,'dist/places-data.json'),'utf8'))};}
function main(){const {data,placeData}=load(),output=build(data,placeData);fs.writeFileSync(path.join(ROOT,'dist/entity-locales.js'),'// Generated by scripts/build-entity-locales.cjs; editorial translations preserve canonical IDs and reference provenance.\nwindow.BIBLE_ENTITY_LOCALES='+JSON.stringify(output)+';\n');console.log(`Localized ${data.people.length} people (${data.people.filter(p=>p.profileOrigin==='curated').length} curated) and ${placeData.places.length} settlements into Dutch and French.`);}
module.exports={build,load,reference,name,curated,books,eras,roles,periods,notes};
if(require.main===module)main();
