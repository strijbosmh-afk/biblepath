'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const locales = ['nl', 'en', 'fr'];
const localized = values => Object.fromEntries(locales.map((locale, i) => [locale, values[i]]));
const books = {
  Genesis: { id: 'GEN', names: { nl: 'Genesis', en: 'Genesis', fr: 'Genèse' } },
  Exodus: { id: 'EXO', names: { nl: 'Exodus', en: 'Exodus', fr: 'Exode' } },
  Leviticus: { id: 'LEV', names: { nl: 'Leviticus', en: 'Leviticus', fr: 'Lévitique' } },
  Numbers: { id: 'NUM', names: { nl: 'Numeri', en: 'Numbers', fr: 'Nombres' } },
  Deuteronomy: { id: 'DEU', names: { nl: 'Deuteronomium', en: 'Deuteronomy', fr: 'Deutéronome' } }
};
const torahPattern = /^(Genesis|Exodus|Leviticus|Numbers|Deuteronomy) (\d+):(\d+)(?:-(\d+))?$/;
// These summaries are editorial paraphrases of the cited Torah passages. They do
// not inherit the Bible atlas's biographies or any New Testament interpretation.
const profiles = {};
function profile(id, key, roles, summary, refs) {
  profiles[id] = { comparisonKey: key, roles: localized(roles.map(role => [role])), summary: localized(summary), refs };
}
profile('adam', 'adam', ['Eerste mens', 'First human', 'Premier humain'], [
  'In Genesis vormt God Adam uit stof en plaatst hem in de tuin. Het verhaal verbindt zijn leven met arbeid, verantwoordelijkheid en sterfelijkheid.',
  'In Genesis, God forms Adam from dust and places him in the garden. His story addresses work, responsibility and mortality.',
  'Dans la Genèse, Dieu forme Adam de poussière et le place dans le jardin. Son récit aborde le travail, la responsabilité et la mortalité.'
], ['Genesis 2:7-17', 'Genesis 3:17-19']);
profile('eve', 'eve', ['Moederfiguur', 'Mother figure', 'Figure maternelle'], [
  'Eva verschijnt als Adams partner. Genesis noemt haar de moeder van alle levenden; het verhaal vertelt ook over haar zonen Kaïn, Abel en Seth.',
  'Eve appears as Adam’s partner. Genesis calls her the mother of all living and also tells of her sons Cain, Abel and Seth.',
  'Ève apparaît comme la compagne d’Adam. La Genèse la présente comme la mère de tous les vivants et raconte aussi la naissance de Caïn, Abel et Seth.'
], ['Genesis 2:22-24', 'Genesis 3:20', 'Genesis 4:1-2', 'Genesis 4:25']);
profile('cain', 'cain', ['Landbouwer', 'Farmer', 'Cultivateur'], [
  'Kaïn bewerkt de grond en brengt een offer. Hij doodt zijn broer Abel; het verhaal bespreekt verantwoordelijkheid voor de ander, oordeel en bescherming.',
  'Cain tills the ground and brings an offering. He kills his brother Abel; the account concerns responsibility for another person, judgment and protection.',
  'Caïn cultive la terre et apporte une offrande. Il tue son frère Abel ; le récit traite de la responsabilité envers autrui, du jugement et de la protection.'
], ['Genesis 4:1-16']);
profile('abel', 'abel', ['Herder', 'Shepherd', 'Berger'], [
  'Abel is een herder en de broer van Kaïn. Genesis vertelt over zijn offer en zijn dood door Kaïns hand.',
  'Abel is a shepherd and Cain’s brother. Genesis recounts his offering and his death at Cain’s hand.',
  'Abel est berger et frère de Caïn. La Genèse raconte son offrande et sa mort de la main de Caïn.'
], ['Genesis 4:2-10']);
profile('enoch', 'enoch', ['Persoon in de oergeschiedenis', 'Primeval figure', 'Figure des origines'], [
  'Henoch staat in de geslachtslijst van Genesis 5. De tekst zegt dat hij met God wandelde en dat God hem wegnam.',
  'Enoch appears in the genealogy of Genesis 5. The text says that he walked with God and that God took him.',
  'Hénoch figure dans la généalogie de Genèse 5. Le texte dit qu’il marchait avec Dieu et que Dieu le prit.'
], ['Genesis 5:21-24']);
profile('noah', 'noah', ['Verbondsfiguur', 'Covenant figure', 'Figure de l’alliance'], [
  'Noach wordt rechtvaardig genoemd en bouwt de ark. Na de vloed sluit God een verbond met hem, zijn nakomelingen en alle levende wezens.',
  'Noah is described as righteous and builds the ark. After the flood, God establishes a covenant with him, his descendants and all living creatures.',
  'Noé est présenté comme juste et construit l’arche. Après le déluge, Dieu établit une alliance avec lui, ses descendants et tous les êtres vivants.'
], ['Genesis 6:9-22', 'Genesis 9:8-17']);
profile('abraham', 'abraham', ['Aartsvader', 'Patriarch', 'Patriarche'], [
  'Abraham ontvangt de opdracht te vertrekken en de belofte van land en nakomelingen. Genesis beschrijft Gods verbond met hem en de naamsverandering van Abram naar Abraham.',
  'Abraham receives a call to leave his home and promises of land and descendants. Genesis describes God’s covenant with him and his change of name from Abram.',
  'Abraham reçoit l’appel à quitter son pays et la promesse d’une terre et de descendants. La Genèse décrit son alliance avec Dieu et son changement de nom, d’Abram à Abraham.'
], ['Genesis 12:1-7', 'Genesis 17:1-8']);
profile('sarah', 'sarah', ['Aartsmoeder', 'Matriarch', 'Matriarche'], [
  'Sara is Abrahams vrouw en de moeder van Isaak. Genesis verbindt de geboorte van haar zoon met Gods belofte en beschrijft haar als moeder van volken.',
  'Sarah is Abraham’s wife and Isaac’s mother. Genesis connects her son’s birth with God’s promise and describes her as a mother of nations.',
  'Sara est l’épouse d’Abraham et la mère d’Isaac. La Genèse relie la naissance de son fils à la promesse divine et la présente comme mère de nations.'
], ['Genesis 17:15-21', 'Genesis 21:1-7']);
profile('hagar', 'hagar', ['Moeder van Ismaël', 'Ishmael’s mother', 'Mère d’Ismaël'], [
  'Hagar is een Egyptische slavin van Sara en de moeder van Ismaël. In de woestijn ontvangt zij hulp en een belofte over haar zoon.',
  'Hagar is Sarah’s Egyptian slave and Ishmael’s mother. In the wilderness, she receives help and a promise concerning her son.',
  'Agar est l’esclave égyptienne de Sara et la mère d’Ismaël. Dans le désert, elle reçoit de l’aide et une promesse concernant son fils.'
], ['Genesis 16:1-16', 'Genesis 21:14-21']);
profile('isaac', 'isaac', ['Aartsvader', 'Patriarch', 'Patriarche'], [
  'Isaak is de zoon van Abraham en Sara. De verbondsbelofte wordt op hem betrokken; Genesis vertelt ook over zijn huwelijk met Rebekka en de geboorte van Esau en Jakob.',
  'Isaac is Abraham and Sarah’s son. The covenant promise is attached to him; Genesis also recounts his marriage to Rebekah and the birth of Esau and Jacob.',
  'Isaac est le fils d’Abraham et de Sara. La promesse de l’alliance lui est rattachée ; la Genèse raconte aussi son mariage avec Rébecca et la naissance d’Ésaü et de Jacob.'
], ['Genesis 17:19-21', 'Genesis 24:67', 'Genesis 25:19-26']);
profile('ishmael', 'ishmael', ['Zoon van Abraham', 'Son of Abraham', 'Fils d’Abraham'], [
  'Ismaël is de zoon van Abraham en Hagar. Genesis vertelt dat God hem hoort, beschermt en een talrijk nageslacht belooft.',
  'Ishmael is Abraham and Hagar’s son. Genesis recounts that God hears and protects him and promises him many descendants.',
  'Ismaël est le fils d’Abraham et d’Agar. La Genèse raconte que Dieu l’entend, le protège et lui promet une nombreuse descendance.'
], ['Genesis 16:15', 'Genesis 17:20', 'Genesis 21:17-21']);
profile('rebekah', 'rebekah', ['Aartsmoeder', 'Matriarch', 'Matriarche'], [
  'Rebekka stemt in met de reis om Isaaks vrouw te worden. Zij is de moeder van Esau en Jakob en speelt een beslissende rol in het verhaal over de zegen.',
  'Rebekah agrees to travel to become Isaac’s wife. She is Esau and Jacob’s mother and plays a decisive role in the account of the blessing.',
  'Rébecca accepte de partir pour devenir l’épouse d’Isaac. Elle est la mère d’Ésaü et de Jacob et joue un rôle décisif dans le récit de la bénédiction.'
], ['Genesis 24:58-67', 'Genesis 25:21-26', 'Genesis 27:5-17']);
profile('jacob', 'jacob', ['Aartsvader', 'Patriarch', 'Patriarche'], [
  'Jakob ontvangt de naam Israël en de belofte van land en nakomelingen. De verhalen over zijn gezin vormen een belangrijke oorsprongsgeschiedenis van Israël.',
  'Jacob receives the name Israel and promises of land and descendants. The stories of his family form a major account of Israel’s origins.',
  'Jacob reçoit le nom d’Israël et la promesse d’une terre et de descendants. Les récits de sa famille occupent une place majeure dans les origines d’Israël.'
], ['Genesis 28:10-15', 'Genesis 32:28', 'Genesis 35:9-12']);
profile('esau', 'esau', ['Broer van Jakob', 'Jacob’s brother', 'Frère de Jacob'], [
  'Esau is Jakobs tweelingbroer. Genesis vertelt over hun strijd om eerstgeboorterecht en zegen, maar ook over hun latere ontmoeting en omhelzing.',
  'Esau is Jacob’s twin brother. Genesis recounts their conflict over birthright and blessing, and their later meeting and embrace.',
  'Ésaü est le frère jumeau de Jacob. La Genèse raconte leur conflit autour du droit d’aînesse et de la bénédiction, puis leur rencontre et leur étreinte.'
], ['Genesis 25:24-34', 'Genesis 33:1-4']);
profile('leah', 'leah', ['Aartsmoeder', 'Matriarch', 'Matriarche'], [
  'Lea is Jakobs vrouw en Rachels zuster. Genesis vertelt over haar positie in het gezin en de geboorte van onder anderen Ruben, Simeon, Levi en Juda.',
  'Leah is Jacob’s wife and Rachel’s sister. Genesis recounts her position in the household and the births of Reuben, Simeon, Levi and Judah, among others.',
  'Léa est l’épouse de Jacob et la sœur de Rachel. La Genèse raconte sa place dans la famille et la naissance notamment de Ruben, Siméon, Lévi et Juda.'
], ['Genesis 29:16-35']);
profile('rachel', 'rachel', ['Aartsmoeder', 'Matriarch', 'Matriarche'], [
  'Rachel is Jakobs vrouw en de moeder van Jozef en Benjamin. Genesis beschrijft haar verlangen naar kinderen en haar dood bij Benjamins geboorte.',
  'Rachel is Jacob’s wife and the mother of Joseph and Benjamin. Genesis describes her desire for children and her death at Benjamin’s birth.',
  'Rachel est l’épouse de Jacob et la mère de Joseph et de Benjamin. La Genèse décrit son désir d’enfants et sa mort à la naissance de Benjamin.'
], ['Genesis 30:22-24', 'Genesis 35:16-20']);
profile('joseph', 'joseph', ['Bestuurder in Egypte', 'Administrator in Egypt', 'Administrateur en Égypte'], [
  'Jozef wordt door zijn broers verkocht en komt in Egypte terecht. Na het uitleggen van dromen krijgt hij bestuurlijke macht en helpt hij zijn familie tijdens de hongersnood.',
  'Joseph is sold by his brothers and reaches Egypt. After interpreting dreams, he receives administrative authority and helps his family during the famine.',
  'Joseph est vendu par ses frères et arrive en Égypte. Après avoir interprété des rêves, il reçoit une autorité administrative et aide sa famille pendant la famine.'
], ['Genesis 37:28', 'Genesis 41:39-43', 'Genesis 45:4-11']);
profile('judah', 'judah', ['Zoon van Jakob', 'Son of Jacob', 'Fils de Jacob'], [
  'Juda is een zoon van Jakob en Lea. In het Jozefverhaal neemt hij verantwoordelijkheid voor Benjamin en biedt hij zichzelf in diens plaats aan.',
  'Judah is a son of Jacob and Leah. In the Joseph narrative, he takes responsibility for Benjamin and offers himself in Benjamin’s place.',
  'Juda est un fils de Jacob et de Léa. Dans le récit de Joseph, il prend la responsabilité de Benjamin et propose de rester à sa place.'
], ['Genesis 29:35', 'Genesis 44:18-34']);
profile('lot', 'lot', ['Neef van Abraham', 'Abraham’s nephew', 'Neveu d’Abraham'], [
  'Lot reist met Abraham en vestigt zich bij Sodom. Genesis beschrijft de scheiding van hun huishoudens en Lots ontsnapping uit de stad.',
  'Lot travels with Abraham and settles near Sodom. Genesis describes the separation of their households and Lot’s escape from the city.',
  'Lot voyage avec Abraham et s’installe près de Sodome. La Genèse décrit la séparation de leurs familles et la fuite de Lot hors de la ville.'
], ['Genesis 12:5', 'Genesis 13:8-13', 'Genesis 19:15-22']);
profile('moses', 'moses', ['Profeet en leider', 'Prophet and leader', 'Prophète et dirigeant'], [
  'Mozes wordt geroepen om Israël uit Egypte te leiden. Hij ontvangt de instructies van het verbond op de Sinaï; Deuteronomium beschrijft zijn bijzondere positie als profeet.',
  'Moses is called to lead Israel out of Egypt. He receives the covenant’s instructions at Sinai; Deuteronomy describes his distinctive place as a prophet.',
  'Moïse est appelé à faire sortir Israël d’Égypte. Il reçoit les instructions de l’alliance au Sinaï ; le Deutéronome décrit sa place particulière comme prophète.'
], ['Exodus 3:10', 'Exodus 24:12', 'Deuteronomy 34:10-12']);
profile('aaron', 'aaron', ['Priester', 'Priest', 'Prêtre'], [
  'Aäron ondersteunt Mozes bij de uittocht. Exodus wijst hem en zijn zonen aan voor de priesterdienst; de Torah vertelt ook over zijn aandeel in het gouden kalf.',
  'Aaron supports Moses during the exodus. Exodus appoints him and his sons to priestly service; the Torah also recounts his part in the golden calf episode.',
  'Aaron soutient Moïse lors de l’Exode. L’Exode le désigne avec ses fils pour le service sacerdotal ; la Torah raconte aussi son rôle dans l’épisode du veau d’or.'
], ['Exodus 4:14-16', 'Exodus 28:1', 'Exodus 32:1-6']);
profile('miriam', 'miriam', ['Profetes', 'Prophetess', 'Prophétesse'], [
  'Mirjam wordt in Exodus profetes en zuster van Aäron genoemd. Zij leidt de vrouwen in zang en dans na de doortocht door de zee.',
  'Exodus calls Miriam a prophetess and Aaron’s sister. She leads the women in song and dance after the crossing of the sea.',
  'L’Exode présente Miriam comme prophétesse et sœur d’Aaron. Elle conduit les femmes dans le chant et la danse après la traversée de la mer.'
], ['Exodus 15:20-21']);
profile('jethro', 'jethro', ['Priester en raadgever', 'Priest and adviser', 'Prêtre et conseiller'], [
  'Jetro is een priester van Midjan en Mozes’ schoonvader. Hij adviseert Mozes om het rechtspreken met geschikte helpers te delen.',
  'Jethro is a priest of Midian and Moses’ father-in-law. He advises Moses to share the work of judging with suitable helpers.',
  'Jéthro est prêtre de Madian et beau-père de Moïse. Il lui conseille de partager la tâche de juger avec des personnes capables.'
], ['Exodus 18:1', 'Exodus 18:17-24']);
profile('zipporah', 'zipporah', ['Vrouw van Mozes', 'Moses’ wife', 'Épouse de Moïse'], [
  'Zippora is de vrouw van Mozes. Exodus vertelt over haar ingrijpen met een besnijdenis tijdens hun reis; de korte passage laat verschillende details onuitgesproken.',
  'Zipporah is Moses’ wife. Exodus recounts her intervention with a circumcision during their journey; the brief passage leaves several details unstated.',
  'Séphora est l’épouse de Moïse. L’Exode raconte son intervention par une circoncision durant leur voyage ; ce bref passage laisse plusieurs détails inexpliqués.'
], ['Exodus 2:21-22', 'Exodus 4:24-26']);
profile('jochebed', 'jochebed', ['Moeder van Mozes', 'Moses’ mother', 'Mère de Moïse'], [
  'Jochebed is in de geslachtslijsten de moeder van Aäron, Mozes en Mirjam. Haar naam wordt daar verbonden met de familie van Levi.',
  'The genealogies identify Jochebed as the mother of Aaron, Moses and Miriam. Her name is connected there with Levi’s family.',
  'Les généalogies identifient Jokébed comme la mère d’Aaron, de Moïse et de Miriam. Son nom y est rattaché à la famille de Lévi.'
], ['Exodus 6:20', 'Numbers 26:59']);
profile('step-H3091G', 'joshua', ['Opvolger van Mozes', 'Moses’ successor', 'Successeur de Moïse'], [
  'Jozua, de zoon van Nun, helpt Mozes en wordt aangewezen als zijn opvolger. Numeri beschrijft de overdracht van gezag voor de gemeenschap.',
  'Joshua, son of Nun, assists Moses and is appointed as his successor. Numbers describes the transfer of authority before the community.',
  'Josué, fils de Noun, assiste Moïse et est désigné pour lui succéder. Les Nombres décrivent le transfert d’autorité devant la communauté.'
], ['Exodus 24:13', 'Numbers 27:18-23']);
profile('step-H3612G', 'caleb', ['Verkenner', 'Scout', 'Explorateur'], [
  'Kaleb, de zoon van Jefunne, is een van de verkenners van het land. Hij spreekt vertrouwen uit en wordt onderscheiden van degenen die het volk ontmoedigen.',
  'Caleb, son of Jephunneh, is one of the scouts sent into the land. He expresses confidence and is distinguished from those who discourage the people.',
  'Caleb, fils de Jephounné, est un des explorateurs du pays. Il exprime sa confiance et se distingue de ceux qui découragent le peuple.'
], ['Numbers 13:6', 'Numbers 13:30', 'Numbers 14:24']);
profile('step-H1109A', 'balaam', ['Ziener', 'Seer', 'Devin'], [
  'Bileam wordt door Balak gevraagd Israël te vervloeken. In Numeri spreekt hij echter zegeningen uit en zegt hij alleen te kunnen spreken wat God hem opdraagt.',
  'Balaam is asked by Balak to curse Israel. In Numbers, he instead pronounces blessings and says he can speak only what God commands.',
  'Balaam est sollicité par Balak pour maudire Israël. Dans les Nombres, il prononce pourtant des bénédictions et dit ne pouvoir parler que selon l’ordre de Dieu.'
], ['Numbers 22:5-12', 'Numbers 23:11-12', 'Numbers 24:10-13']);
profile('step-H7141I', 'korah', ['Leider van een opstand', 'Rebellion leader', 'Chef d’une révolte'], [
  'Korach, de zoon van Jishar, bestrijdt met anderen het gezag van Mozes en Aäron. Numeri 16 vertelt over het conflict rond leiderschap en priesterschap.',
  'Korah, son of Izhar, joins others in challenging Moses and Aaron’s authority. Numbers 16 recounts the conflict over leadership and priesthood.',
  'Coré, fils de Yitsehar, conteste avec d’autres l’autorité de Moïse et d’Aaron. Nombres 16 raconte ce conflit autour de la direction et du sacerdoce.'
], ['Numbers 16:1-11']);

function loadSource() {
  const context = { window: {} };
  vm.createContext(context);
  for (const name of ['data.js', 'entity-locales.js']) vm.runInContext(fs.readFileSync(path.join(root, 'dist', name), 'utf8'), context);
  return JSON.parse(JSON.stringify({ data: context.window.BIBLE_DATA, translations: context.window.BIBLE_ENTITY_LOCALES }));
}
function parseRef(label) {
  const match = torahPattern.exec(label);
  if (!match) return null;
  return { label, book: books[match[1]].id, chapter: Number(match[2]), verse: Number(match[3]), ...(match[4] ? { endVerse: Number(match[4]) } : {}) };
}
function build() {
  const { data, translations } = loadSource();
  const people = data.people.filter(person => person.refs.some(ref => torahPattern.test(ref.label))).map(person => {
    const indexedRefs = person.refs.filter(ref => torahPattern.test(ref.label)).map(ref => ({
      ...parseRef(ref.label), url: ref.url, numbering: 'English index', sourceEdition: ref.translation || 'ESV',
      sourceId: ref.provenance === 'verse' ? 'biblepath-index' : 'step-bible', provenance: ref.provenance || 'indexed-name'
    }));
    const curated = profiles[person.id];
    const roleRefs = (curated?.refs || []).map(label => {
      const ref = parseRef(label);
      return { ...ref, url: `https://ebible.org/engjps/${ref.book}${String(ref.chapter).padStart(2, '0')}.htm`, numbering: 'English JPS 1917', sourceEdition: 'JPS 1917', sourceId: 'jps1917', provenance: 'curated-torah-role' };
    });
    const names = { nl: translations.nl.people[person.id]?.name || person.name, en: person.name, fr: translations.fr.people[person.id]?.name || person.name };
    const first = indexedRefs[0];
    const firstBook = Object.values(books).find(book => book.id === first.book);
    const identityReference = Object.fromEntries(locales.map(locale => [locale, `${firstBook.names[locale]} ${first.chapter}:${first.verse}`]));
    return {
      id: `torah:${person.id}`, key: person.id, bibleId: person.id, names,
      aliases: [...new Set([person.name, ...(person.aliases || []), ...Object.values(names), ...(translations.nl.people[person.id]?.aliases || []), ...(translations.fr.people[person.id]?.aliases || [])])],
      disambiguation: localized([`Indexvermelding: ${identityReference.nl}`, `Index entry: ${identityReference.en}`, `Entrée d’index : ${identityReference.fr}`]),
      roles: curated?.roles || localized([['Persoon in de Torah-index'], ['Torah index person'], ['Personne de l’index de la Torah']]),
      summary: curated?.summary || localized([
        `${names.nl} is als afzonderlijke identiteit opgenomen in de personenindex bij de Torah. Bekijk de bronverwijzingen om de passages en hun context te lezen.`,
        `${names.en} is recorded as a distinct identity in the Torah person index. Consult the source references to read the passages in context.`,
        `${names.fr} figure comme une identité distincte dans l’index des personnes de la Torah. Consultez les références pour lire les passages dans leur contexte.`
      ]),
      profileKind: curated ? 'curated-torah-role' : 'index-entry',
      refs: [...roleRefs, ...indexedRefs],
      sourceIds: [...new Set([...roleRefs, ...indexedRefs].map(ref => ref.sourceId))],
      ...(curated?.comparisonKey ? { comparisonKey: curated.comparisonKey } : {})
    };
  });
  const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dist', name))).digest('hex');
  return {
    meta: {
      tradition: 'judaism', title: 'Torah person index', version: 1,
      scope: localized([
        'Afzonderlijke index van personen bij de vijf boeken van de Torah: Genesis, Exodus, Leviticus, Numeri en Deuteronomium. De selectie volgt de bestaande naamindex; dit is geen volledige weergave van alle personen of interpretaties binnen het jodendom.',
        'A separate person index for the five books of the Torah: Genesis, Exodus, Leviticus, Numbers and Deuteronomy. Selection follows the existing name index; it is not a complete account of every person or interpretation within Judaism.',
        'Index distinct des personnes des cinq livres de la Torah : Genèse, Exode, Lévitique, Nombres et Deutéronome. La sélection suit l’index de noms existant ; elle ne couvre pas toutes les personnes ni toutes les interprétations du judaïsme.'
      ]),
      referenceNote: localized([
        'De bronindex gebruikt Engelse versnummering. Indexlinks openen de daar gebruikte ESV/KJV-vertaling; de aanvullende rolbeschrijvingen verwijzen naar de Joodse JPS-editie van 1917. Nummering kan per editie verschillen. Een indexkoppeling kan ook een collectieve of voorouderlijke verwijzing zijn en bewijst niet dat de persoon zelf in elk vers optreedt.',
        'The source index uses English verse numbering. Index links open its ESV/KJV editions; the additional role summaries cite the Jewish JPS 1917 edition. Numbering can differ by edition. An index association may be collective or ancestral and does not establish that the individual appears personally in every verse.',
        'L’index source emploie la numérotation anglaise. Ses liens ouvrent les éditions ESV/KJV ; les descriptions de rôles ajoutées citent l’édition juive JPS de 1917. La numérotation peut varier selon l’édition. Un lien d’index peut être collectif ou ancestral et ne prouve pas la présence personnelle de l’individu dans chaque verset.'
      ]),
      sources: [
        { id: 'step-bible', label: 'STEP Bible TIPNR person index', url: 'https://github.com/STEPBible/STEPBible-Data', version: data.meta.upstream.commit, license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', credit: 'Data created for STEP Bible, based on work at Tyndale House, Cambridge. Filtered to the Torah, namespaced and given independent summaries for BiblePath.' },
        { id: 'biblepath-index', label: 'BiblePath original passage index', url: 'data-notes.html' },
        { id: 'jps1917', label: 'Jewish Publication Society Tanakh 1917', url: 'https://ebible.org/engjps/', license: 'Public domain' }
      ],
      sourceHashes: { 'data.js': hash('data.js'), 'entity-locales.js': hash('entity-locales.js') },
      personCount: people.length, curatedProfileCount: people.filter(person => person.profileKind === 'curated-torah-role').length,
      indexReferenceCount: people.reduce((total, person) => total + person.refs.filter(ref => ref.provenance !== 'curated-torah-role').length, 0),
      bookIds: Object.values(books).map(book => book.id),
      method: 'Existing distinct name identities restricted to Genesis–Deuteronomy. No imported biographies, New Testament roles, cross-tradition identities or relationship edges. Curated Torah summaries are separately paraphrased from their cited passages.'
    }, people
  };
}
if (require.main === module) {
  const target = path.join(root, 'dist', 'torah-people.json');
  const content = JSON.stringify(build(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== content) throw new Error('Torah index is not reproducible: run node scripts/build-torah-people.cjs');
    console.log('Torah person index reproduces exactly.');
  } else {
    fs.writeFileSync(target, content);
    console.log(`Wrote ${target}`);
  }
}
module.exports = { build, parseRef, loadSource };
