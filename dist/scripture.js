/* Full-text reading, search, and editorial atlas links. No network or DOM access. */
(function () {
  'use strict';
  const words = text => Array.from(String(text).matchAll(/[\p{L}\p{N}]+/gu),match => ({text:match[0],key:fold(match[0]),start:match.index,end:match.index+match[0].length}));
  const fold = text => String(text).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('en');
  const searchKey = text => fold(text).replace(/['’]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  // These spellings also occur as ordinary words or descriptive titles. They may
  // link with verse evidence, but never from a capitalized word alone.
  const COMMON = new Set('on so will mark job lot ham ram ben nun judge king queen prince priest servant father mother brother sister son daughter man woman lord god beloved friends lover desolate forsaken married even most high light joy grace word wisdom truth free strong beloved stranger'.split(' '));
  // Edition-specific homographs stay available when the verse index identifies
  // the person. Only speculative, spelling-only links are suppressed.
  const LOCAL_COMMON = {nl:new Set(['dan','naam','men']),fr:new Set(['toi'])};
  const COLLECTIVE = new Set(['israel','judah','juda','ephraim','efraim','dan','gad','asher','aser','benjamin','naphtali','naftali','reuben','ruben','simeon','zebulun','zebulon','manasseh','manasse','levi','edom','moab','ammon']);
  const DEMONYMS = new Set(['jew','jews','jewess','hebrew','hebrews','roman','romans','greek','greeks','christian','christians','jood','joden','juif','juifs','juive','juives','hebreux','hebreer','hebreers','hebreen','hebreens','israelite','israelites','israelieten','romeinen','romain','romains','grec','grecs','grieken','chretien','chretiens','christenen']);
  const BOOK_ALIASES = {psalm:'PSA',ps:'PSA',songofsongs:'SNG',canticles:'SNG',song:'SNG',sos:'SNG',eze:'EZK',joel:'JOL',nah:'NAM',mark:'MRK',mar:'MRK',john:'JHN',joh:'JHN',phil:'PHP',phi:'PHP',james:'JAS',jam:'JAS','1jo':'1JN','2jo':'2JN','3jo':'3JN'};
  const BOOK_IDS = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ');
  const BOOK_NAMES = [
    'Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation',
    'Genesis|Exodus|Leviticus|Numeri|Deuteronomium|Jozua|Richteren|Ruth|1 Samuel|2 Samuel|1 Koningen|2 Koningen|1 Kronieken|2 Kronieken|Ezra|Nehemia|Esther|Job|Psalmen|Spreuken|Prediker|Hooglied|Jesaja|Jeremia|Klaagliederen|Ezechiël|Daniël|Hosea|Joël|Amos|Obadja|Jona|Micha|Nahum|Habakuk|Zefanja|Haggaï|Zacharia|Maleachi|Mattheüs|Markus|Lukas|Johannes|Handelingen|Romeinen|1 Korinthe|2 Korinthe|Galaten|Efeze|Filippenzen|Kolossenzen|1 Thessalonicenzen|2 Thessalonicenzen|1 Timotheüs|2 Timotheüs|Titus|Filemon|Hebreeën|Jakobus|1 Petrus|2 Petrus|1 Johannes|2 Johannes|3 Johannes|Judas|Openbaring',
    'Genèse|Exode|Lévitique|Nombres|Deutéronome|Josué|Juges|Ruth|1 Samuel|2 Samuel|1 Rois|2 Rois|1 Chroniques|2 Chroniques|Esdras|Néhémie|Esther|Job|Psaumes|Proverbes|Ecclésiaste|Cantique des cantiques|Ésaïe|Jérémie|Lamentations|Ézéchiel|Daniel|Osée|Joël|Amos|Abdias|Jonas|Michée|Nahum|Habacuc|Sophonie|Aggée|Zacharie|Malachie|Matthieu|Marc|Luc|Jean|Actes|Romains|1 Corinthiens|2 Corinthiens|Galates|Éphésiens|Philippiens|Colossiens|1 Thessaloniciens|2 Thessaloniciens|1 Timothée|2 Timothée|Tite|Philémon|Hébreux|Jacques|1 Pierre|2 Pierre|1 Jean|2 Jean|3 Jean|Jude|Apocalypse'
  ];

  class BibleScripture {
    constructor(bibleData,peopleData={people:[]},placesData={places:[]}) {
      this.meta = bibleData.meta;
      this._uncertainVerseBooks = new Set(bibleData.meta?.verseIdentityUncertainBooks || []);
      this._books = bibleData.books;
      this._byBook = new Map();this._bookAliases = new Map();this._verses = new Map();this._searchRows = [];
      this._nameRoot = {children:new Map(),candidates:[]};this._annotationCache = new Map();
      for (const book of this._books) {
        this._byBook.set(book.id,book);
        for (const alias of [book.id,book.name,...(book.aliases || [])]) this._bookAliases.set(searchKey(alias).replaceAll(' ',''),book.id);
        for (const chapter of book.chapters) for (const verse of chapter.verses) {
          const key = `${book.id}.${chapter.number}.${verse.number}`;
          this._verses.set(key,verse);
          const headingText = (chapter.headings || []).filter(heading => heading.beforeVerse === verse.number).map(heading => heading.text).join(' ');
          const searchableText = [headingText,verse.text].filter(Boolean).join(' ');
          this._searchRows.push({bookId:book.id,bookName:book.name,testament:book.testament,chapter:chapter.number,verse:verse.number,text:searchableText,key:searchKey(searchableText)});
        }
      }
      for (const names of BOOK_NAMES) names.split('|').forEach((name,index) => {if (this._byBook.has(BOOK_IDS[index])) this._bookAliases.set(searchKey(name).replaceAll(' ',''),BOOK_IDS[index]);});
      for (const [alias,id] of Object.entries(BOOK_ALIASES)) if (this._byBook.has(id)) this._bookAliases.set(alias,id);
      for (const person of peopleData?.people || []) this.indexEntity(person,'person');
      for (const place of placesData?.places || []) this.indexEntity(place,'place');
    }

    book(bookId) {return this._byBook.get(this._bookAliases.get(searchKey(bookId).replaceAll(' ',''))) || null;}
    books() {return this._books.map(book => ({id:book.id,name:book.name,testament:book.testament,chapterCount:book.chapters.length,verseCount:book.chapters.reduce((sum,ch) => sum+ch.verses.length,0)}));}
    reference(label) {
      if (label && typeof label === 'object') {
        if (label.book && label.chapter && label.verse) {
          const book = this.book(label.book);
          const chapter=Number(label.chapter),verse=Number(label.verse);
          return book && this._verses.has(`${book.id}.${chapter}.${verse}`) ? {bookId:book.id,chapter,verse,endVerse:verse} : null;
        }
        label = label.label;
      }
      const match = String(label || '').trim().match(/^(.*?)\s*(\d+)\s*(?::\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
      if (!match) return null;
      const book = this.book(match[1]),chapter = Number(match[2]),verse = Number(match[3] || 1),endVerse = Number(match[4] || verse);
      if (!book || chapter < 1 || verse < 1 || endVerse < verse || !this._verses.has(`${book.id}.${chapter}.${verse}`) || !this._verses.has(`${book.id}.${chapter}.${endVerse}`)) return null;
      return {bookId:book.id,chapter,verse,endVerse};
    }
    verse(bookId,chapter,verse) {
      const book = this.book(bookId);
      return book ? this._verses.get(`${book.id}.${Number(chapter)}.${Number(verse)}`) || null : null;
    }
    chapter(bookId,number) {
      const book = this.book(bookId),chapter = book?.chapters.find(ch => ch.number === Number(number));
      if (!chapter) return null;
      return {bookId:book.id,bookName:book.name,testament:book.testament,number:chapter.number,
        headings:(chapter.headings || []).map(heading => ({...heading,annotations:this.annotate(book.id,chapter.number,heading.beforeVerse,heading.text)})),
        verses:chapter.verses.map(verse => ({...verse,annotations:this.annotate(book.id,chapter.number,verse.number)}))};
    }
    search(query,{testament='all',bookId=null,limit=50,offset=0}={}) {
      const needle = searchKey(query),book = bookId ? this.book(bookId) : null;
      if (!needle || (bookId && !book)) return {total:0,results:[]};
      limit = Math.max(1,Math.min(250,Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 50));
      offset = Math.max(0,Number.isFinite(Number(offset)) ? Math.floor(Number(offset)) : 0);
      let total = 0;const results = [];
      for (const row of this._searchRows) {
        if ((testament !== 'all' && row.testament !== testament) || (book && row.bookId !== book.id) || !row.key.includes(needle)) continue;
        if (total >= offset && results.length < limit) {
          const {key,...result} = row;results.push(result);
        }
        total++;
      }
      return {total,results};
    }

    referenceKeys(refs) {
      const keys = new Set();
      for (const label of refs || []) {
        const ref = this.reference(label);
        if (!ref) continue;
        for (let verse=ref.verse;verse<=ref.endVerse;verse++) keys.add(`${ref.bookId}.${ref.chapter}.${verse}`);
      }
      return keys;
    }
    indexEntity(entity,kind) {
      const refs = this.referenceKeys(entity.refs),forms = new Map();
      for (const form of entity.nameForms || []) forms.set(words(form.name).map(word => word.key).join(' '),this.referenceKeys(form.refs));
      for (const alias of new Set([entity.name,...(entity.aliases || [])])) {
        const tokens = words(alias),nameKey = tokens.map(token => token.key).join(' ');
        if (!tokens.length || (tokens.length === 1 && tokens[0].key.length < 2)) continue;
        // Derivative national/demonym spellings are group words, not aliases that
        // identify a person or a named settlement in the reading text.
        if (DEMONYMS.has(nameKey) || (alias !== entity.name && /(?:ites?|ians?)$/i.test(nameKey))) continue;
        let node = this._nameRoot;
        for (const token of tokens) {
          if (!node.children.has(token.key)) node.children.set(token.key,{children:new Map(),candidates:[]});
          node = node.children.get(token.key);
        }
        if (!node.candidates.some(candidate => candidate.id === entity.id && candidate.kind === kind)) node.candidates.push({id:entity.id,kind,refs:forms.get(nameKey) || refs,nameKey});
      }
    }

    annotate(bookId,chapter,verse,text) {
      const book = this.book(bookId);
      if (!book) return [];
      const verseKey = `${book.id}.${Number(chapter)}.${Number(verse)}`,customText = text !== undefined;
      if (!customText && this._annotationCache.has(verseKey)) return this._annotationCache.get(verseKey);
      text = customText ? String(text) : this._verses.get(verseKey)?.text || '';
      const tokens = words(text),annotations = [];
      for (let i=0;i<tokens.length;i++) {
        // Proper names retain their capitalization in WEB. This avoids linking
        // ordinary lowercase words even when a broad profile passage cites them.
        if (!/^[\p{Lu}\p{Lt}]/u.test(tokens[i].text)) continue;
        let node = this._nameRoot,best = null;
        for (let j=i;j<tokens.length;j++) {
          if (j > i && !/^[\s\-‐‑–]+$/u.test(text.slice(tokens[j-1].end,tokens[j].start))) break;
          node = node.children.get(tokens[j].key);
          if (!node) break;
          if (!node.candidates.length) continue;
          const exact = this._uncertainVerseBooks.has(book.id) ? [] : node.candidates.filter(candidate => candidate.refs.has(verseKey));
          const fallbackAllowed = j > i || (!COMMON.has(tokens[i].key) && !LOCAL_COMMON[this.meta.language]?.has(tokens[i].key) && tokens[i].key.length > 2);
          const candidates = exact.length ? exact : fallbackAllowed ? node.candidates : [];
          if (candidates.length && (exact.length || !best || best.match !== 'verse')) best = {endIndex:j,candidates,match:exact.length ? 'verse' : 'name'};
        }
        if (!best) continue;
        const start = tokens[i].start,end = tokens[best.endIndex].end;
        const personIds = [...new Set(best.candidates.filter(candidate => candidate.kind === 'person').map(candidate => candidate.id))].sort();
        const placeIds = [...new Set(best.candidates.filter(candidate => candidate.kind === 'place').map(candidate => candidate.id))].sort();
        const collective = personIds.length > 0 && COLLECTIVE.has(tokens[i].key);
        annotations.push({start,end,text:text.slice(start,end),kind:personIds.length && placeIds.length ? 'entity' : personIds.length ? 'person' : 'place',personIds,placeIds,match:best.match,
          ambiguous:personIds.length+placeIds.length > 1 || best.match === 'name' || collective,
          note:collective ? 'This name can also refer to a people or territory; the atlas index does not establish an individual in every occurrence.' : this._uncertainVerseBooks.has(book.id) ? 'Verse numbering in this book differs from the atlas. These are possible matches by spelling.' : best.match === 'name' ? 'Possible atlas match by spelling; this verse is not listed for the candidate.' : 'Name indexed in this verse; candidate identities follow the atlas source.'});
        i = best.endIndex;
      }
      if (!customText) this._annotationCache.set(verseKey,annotations);
      return annotations;
    }
  }
  window.BibleScripture = BibleScripture;
})();
