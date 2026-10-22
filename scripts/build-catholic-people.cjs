'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const rows = require('./catholic-people-copy.cjs');
const locales = ['nl', 'en', 'fr'];
const L = values => Object.fromEntries(locales.map((locale, i) => [locale, values[i]]));
const labels = { TOB: 'Tobit', JDT: 'Judith', WIS: 'Wisdom', SIR: 'Sirach', BAR: 'Baruch', '1MA': '1 Maccabees', '2MA': '2 Maccabees', EST: 'Esther', DAN: 'Daniel' };
const bookNames = {
  TOB: ['Tobit', 'Tobit', 'Tobie'], JDT: ['Judit', 'Judith', 'Judith'],
  WIS: ['Wijsheid', 'Wisdom', 'Sagesse'], SIR: ['Sirach', 'Sirach', 'Siracide'],
  BAR: ['Baruch', 'Baruch', 'Baruch'], '1MA': ['1 Makkabeeën', '1 Maccabees', '1 Maccabées'],
  '2MA': ['2 Makkabeeën', '2 Maccabees', '2 Maccabées'], EST: ['Ester', 'Esther', 'Esther'],
  DAN: ['Daniël', 'Daniel', 'Daniel']
};

function build() {
  const scripture = JSON.parse(fs.readFileSync(path.join(root, 'dist/catholic-bible-data.json'), 'utf8'));
  assert.equal(scripture.meta.editionId, 'catholic');
  assert.equal(scripture.meta.sourceEdition, 'engDRA');
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/data.js'), 'utf8'), context);
  const bibleIds = new Set(context.window.BIBLE_DATA.people.map(person => person.id));
  const ids = new Set();
  const mapped = new Set();
  const people = rows.map(row => {
    const id = `catholic:${row.key}`;
    assert.match(row.key, /^[a-z][a-z0-9-]*$/);
    assert(!ids.has(id), `Duplicate Catholic identity: ${id}`);
    ids.add(id);
    for (const field of ['names', 'roles', 'summary']) {
      assert.equal(row[field].length, 3, `${id}: three ${field} translations required`);
      assert(row[field].every(value => typeof value === 'string' && value.trim()), `${id}: empty ${field}`);
    }
    if (row.bibleId) {
      assert(bibleIds.has(row.bibleId), `${id}: missing explicit atlas identity ${row.bibleId}`);
      assert(!mapped.has(row.bibleId), `${id}: duplicate mapping ${row.bibleId}`);
      mapped.add(row.bibleId);
    }
    const refs = row.refs.map(input => {
      const match = /^([A-Z1-2]{3}) (\d+):(\d+)(?:-(\d+))?$/.exec(input);
      assert(match, `${id}: malformed reference ${input}`);
      const [, book, ch, start, end] = match;
      assert(labels[book], `${id}: outside supplement books ${book}`);
      const chapter = Number(ch), verse = Number(start), endVerse = Number(end || start);
      const textChapter = scripture.books.find(item => item.id === book)?.chapters.find(item => item.number === chapter);
      assert(textChapter && verse <= endVerse, `${id}: invalid chapter/range ${input}`);
      for (let v = verse; v <= endVerse; v++) {
        assert(textChapter.verses.some(item => item.number === v && item.text.trim()), `${id}: absent source verse ${book} ${chapter}:${v}`);
      }
      return {
        label: `${labels[book]} ${chapter}:${verse}${endVerse > verse ? `-${endVerse}` : ''}`,
        edition: 'catholic', book, chapter, verse, endVerse,
        url: `https://ebible.org/engDRA/${book}${String(chapter).padStart(2, '0')}.htm#V${verse - 1}`,
        numbering: 'Douay–Rheims 1899 (Vulgate)', sourceEdition: 'Douay–Rheims 1899',
        sourceId: 'douay-rheims', provenance: 'curated-catholic-role'
      };
    });
    assert(refs.length, `${id}: no evidence`);
    return {
      id, key: row.key, ...(row.bibleId ? { bibleId: row.bibleId } : {}),
      names: L(row.names), aliases: [...new Set([...row.names, ...row.aliases])],
      disambiguation: L(row.roles.map((role, localeIndex) => `${role} · ${refs[0].label.replace(labels[refs[0].book], bookNames[refs[0].book][localeIndex])}`)),
      roles: L(row.roles.map(role => [role])), summary: L(row.summary),
      profileKind: 'curated-catholic-role', entityType: 'human', refs, sourceIds: ['douay-rheims']
    };
  });
  const byBook = Object.fromEntries(Object.keys(labels).map(book => [book, people.filter(person => person.refs.some(ref => ref.book === book)).length]));
  return {
    meta: {
      tradition: 'bible', collection: 'catholic-supplement', version: '1.0', reviewedAt: '2026-10-22',
      title: 'BiblePath — Catholic people supplement', complete: false,
      scope: L([
        'Handmatig samengestelde aanvulling met menselijke personen uit de zeven deuterocanonieke boeken en de Griekse aanvullingen bij Ester en Daniël. Ook bestaande Bijbelse personen krijgen aanvullende passages. Dit is geen volledige namenconcordantie; engelen, demonen en groepen vallen buiten deze personenindex. De oorspronkelijke familieverbindingen blijven behouden; hier worden geen nieuwe afgeleid.',
        'Curated supplement of human figures from the seven deuterocanonical books and the Greek additions to Esther and Daniel. Existing biblical people also receive additional passages. This is not an exhaustive name concordance; angels, demons and groups are outside this people index. Existing family links are retained; no new relationships are inferred here.',
        'Complément éditorial de figures humaines des sept livres deutérocanoniques et des additions grecques à Esther et Daniel. Des personnages bibliques existants reçoivent aussi des passages supplémentaires. Il ne s’agit pas d’une concordance exhaustive ; anges, démons et groupes sont hors de cet index. Les liens familiaux existants sont conservés ; aucun nouveau lien n’est déduit ici.'
      ]),
      referenceNote: L([
        'Leesknoppen openen de gecontroleerde overeenkomstige passage in de Nederlandse katholieke Bijbel. De oorspronkelijke bronverwijzingen blijven Douay–Rheims (1899), met eigen Vulgaatnummering, en zijn apart beschikbaar. De lezer toont de Nederlandse versnummers en licht afwijkende, gesplitste of onvolledige overeenkomsten toe.',
        'Reading buttons open the reviewed corresponding passage in the Dutch Catholic Bible. Original citations remain Douay–Rheims (1899), with their own Vulgate numbering, and are available separately. The reader shows Dutch coordinates and explains changed, split or partial correspondences.',
        'Les boutons de lecture ouvrent le passage correspondant vérifié dans la Bible catholique néerlandaise. Les références originales restent celles de Douay–Rheims (1899), avec leur numérotation de la Vulgate, et sont accessibles séparément. Le lecteur affiche les coordonnées néerlandaises et explique les correspondances différentes, fractionnées ou partielles.'
      ]),
      sources: [{ id: 'douay-rheims', label: 'Douay–Rheims 1899 (eBible.org)', url: 'https://ebible.org/engDRA/', license: 'Public domain', licenseUrl: 'https://ebible.org/engDRA/copyright.htm' }],
      sourceHashes: {
        sourceXmlSha256: scripture.meta.sourceXmlSha256,
        scriptureTextSha256: scripture.meta.textSha256,
        editorialCopySha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'catholic-people-copy.cjs'), 'utf8').replace(/\r\n/g, '\n')).digest('hex')
      },
      personCount: people.length, newPersonCount: people.length - mapped.size, mappedPersonCount: mapped.size, byBook
    },
    people
  };
}

if (require.main === module) {
  const output = `${JSON.stringify(build())}\n`;
  const destination = path.join(root, 'dist/catholic-people.json');
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(destination, 'utf8').replace(/\r\n/g, '\n'), output, 'Catholic people asset is stale; run node scripts/build-catholic-people.cjs');
  else fs.writeFileSync(destination, output);
  console.log(`${process.argv.includes('--check') ? 'Verified' : 'Built'} ${JSON.parse(output).meta.personCount} Catholic supplement profiles.`);
}
module.exports = { build };
