// Editorial person summaries, independently identified within the Qur'an.
// These are original paraphrases, not modified copies of the licensed translations.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const L = (nl, en, fr) => ({ nl, en, fr });
const roles = {
  prophet: L('Profeet', 'Prophet', 'Prophète'),
  messenger: L('Boodschapper', 'Messenger', 'Messager'),
  ruler: L('Heerser', 'Ruler', 'Souverain'),
  parent: L('Ouder', 'Parent', 'Parent'),
  family: L('Familielid', 'Family member', 'Membre de la famille'),
  believer: L('Gelovige', 'Believer', 'Croyant'),
  wisdom: L('Wijsheid', 'Wisdom', 'Sagesse'),
  opponent: L('Tegenstander', 'Opponent', 'Adversaire'),
  narrative: L('Verhaalfiguur', 'Narrative figure', 'Figure du récit')
};
const people = [];
function add(key, names, aliases, roleKeys, summary, references, extra = {}) {
  people.push({
    id: `quran:${key}`, key, names: L(...names), aliases,
    roles: Object.fromEntries(['nl', 'en', 'fr'].map(locale => [locale, roleKeys.map(role => roles[role][locale])])),
    summary: L(...summary),
    refs: references.map(([surah, ayah, endAyah]) => ({ label: `${surah}:${ayah}${endAyah && endAyah !== ayah ? `–${endAyah}` : ''}`, surah, ayah, ...(endAyah ? { endAyah } : {}), url: `https://quran.com/${surah}/${ayah}` })),
    sourceIds: ['quran', 'quranenc'], ...extra
  });
}
const compared = key => ({ comparisonKey: key });
const unnamed = { naming: 'descriptive' };

add('adam', ['Adam', 'Adam', 'Adam'], ['آدم'], ['prophet'], [
  'God leert Adam de namen. Het verhaal beschrijft zijn verblijf met zijn vrouw in de tuin, hun overtreding en Gods aanvaarding van zijn berouw.',
  'God teaches Adam the names. His story describes life with his wife in the garden, their transgression and God accepting his repentance.',
  'Dieu enseigne les noms à Adam. Son récit évoque le jardin avec son épouse, leur transgression et le repentir accepté par Dieu.'
], [[2,30,39], [20,115,123]], compared('adam'));
add('idris', ['Idris', 'Idris', 'Idrîs'], ['إدريس'], ['prophet'], [
  'Idris wordt als waarachtig en als profeet beschreven. God verheft hem tot een hoge plaats; de tekst geeft weinig biografische details.',
  'Idris is described as truthful and as a prophet. God raises him to a high station; the text gives few biographical details.',
  'Idrîs est présenté comme véridique et prophète. Dieu l’élève à un rang élevé ; le texte donne peu de détails biographiques.'
], [[19,56,57], [21,85,86]]);
add('noah', ['Nuh (Noach)', 'Nuh (Noah)', 'Nûh (Noé)'], ['Nuh', 'Noah', 'Noach', 'Noé', 'نوح'], ['prophet', 'messenger'], [
  'Nuh roept zijn volk op God te dienen en bouwt de ark. De vloed, de redding van gelovigen en het lot van zijn zoon tonen dat familiebanden geen geloof vervangen.',
  'Nuh calls his people to worship God and builds the ark. The flood, the believers’ rescue and his son’s fate show that family ties do not replace faith.',
  'Nûh appelle son peuple à adorer Dieu et construit l’arche. Le déluge, le salut des croyants et le sort de son fils distinguent foi et liens familiaux.'
], [[11,25,49], [71,1,4]], compared('noah'));
add('hud', ['Hud', 'Hud', 'Hûd'], ['هود'], ['prophet', 'messenger'], [
  'Hud waarschuwt het volk Ad en roept het op uitsluitend God te aanbidden. Hij en de gelovigen worden gered wanneer zijn tegenstanders zijn boodschap verwerpen.',
  'Hud warns the people of Ad and calls them to worship God alone. He and the believers are rescued when his opponents reject his message.',
  'Hûd avertit le peuple de Ad et l’appelle à adorer Dieu seul. Lui et les croyants sont sauvés lorsque ses adversaires rejettent son message.'
], [[7,65,72], [11,50,60]]);
add('salih', ['Salih', 'Salih', 'Sâlih'], ['Saleh', 'صالح'], ['prophet', 'messenger'], [
  'Salih spreekt tot Thamoed. De kameelin vormt een teken en een beproeving; zijn waarschuwing wordt verworpen en het dier wordt gedood.',
  'Salih addresses Thamud. The she-camel is a sign and a test; his warning is rejected and the animal is killed.',
  'Sâlih s’adresse aux Thamûd. La chamelle constitue un signe et une épreuve ; son avertissement est rejeté et l’animal est tué.'
], [[7,73,79], [11,61,68]]);
add('abraham', ['Ibrahim (Abraham)', 'Ibrahim (Abraham)', 'Ibrâhîm (Abraham)'], ['Ibrahim', 'Abraham', 'إبراهيم'], ['prophet'], [
  'Ibrahim is een voorbeeld van toewijding aan één God. Hij wordt beproefd en bouwt samen met Ismail de fundamenten van het Huis; de Koran noemt hem Gods vriend.',
  'Ibrahim exemplifies devotion to one God. He is tested and raises the foundations of the House with Ismail; the Qur’an calls him God’s friend.',
  'Ibrâhîm incarne la fidélité au Dieu unique. Il est éprouvé et élève avec Ismâïl les fondations de la Maison ; le Coran le présente comme ami de Dieu.'
], [[2,124,129], [4,125]], compared('abraham'));
add('lot', ['Lut (Lot)', 'Lut (Lot)', 'Lût (Loth)'], ['Lut', 'Lot', 'Loth', 'لوط'], ['prophet', 'messenger'], [
  'Lut waarschuwt zijn volk voor hun gedrag. Bezoekers kondigen het oordeel aan; hij en zijn gezin krijgen opdracht te vertrekken, met uitzondering van zijn vrouw.',
  'Lut warns his people about their conduct. Visitors announce judgment; he and his household are instructed to leave, with his wife excepted.',
  'Lût avertit son peuple de sa conduite. Des visiteurs annoncent le jugement ; il doit partir avec les siens, à l’exception de son épouse.'
], [[11,77,83], [26,160,175]], compared('lot'));
add('ishmael', ['Ismail (Ismaël)', 'Ismail (Ishmael)', 'Ismâïl (Ismaël)'], ['Ismail', 'Ishmael', 'Ismaël', 'إسماعيل'], ['prophet', 'messenger'], [
  'Ismail helpt Ibrahim de fundamenten van het Huis op te richten. Hij wordt geprezen om zijn trouw aan beloften en zijn oproep tot gebed en aalmoezen.',
  'Ismail helps Ibrahim raise the foundations of the House. He is praised for keeping his promises and urging prayer and charitable giving.',
  'Ismâïl aide Ibrâhîm à élever les fondations de la Maison. Il est loué pour sa fidélité aux promesses et son appel à la prière et à l’aumône.'
], [[2,127,129], [19,54,55]], compared('ishmael'));
add('isaac', ['Ishaq (Isaak)', 'Ishaq (Isaac)', 'Ishâq (Isaac)'], ['Ishaq', 'Isaak', 'Isaac', 'إسحاق'], ['prophet'], [
  'Ishaq wordt aan Ibrahim en zijn vrouw aangekondigd. De Koran noemt hem een rechtvaardige profeet en verbindt hem met de belofte van Yaqub.',
  'Ishaq is announced to Ibrahim and his wife. The Qur’an describes him as a righteous prophet and connects his birth announcement with Yaqub.',
  'Ishâq est annoncé à Ibrâhîm et à son épouse. Le Coran le décrit comme un prophète vertueux et associe cette annonce à Ya‘qûb.'
], [[11,71,73], [37,112,113]], compared('isaac'));
add('jacob', ['Yaqub (Jakob)', 'Yaqub (Jacob)', 'Ya‘qûb (Jacob)'], ['Yaqub', 'Jakob', 'Jacob', 'Israïl', 'يعقوب'], ['prophet', 'parent'], [
  'Yaqub draagt zijn zonen op de ene God te dienen. In Yusufs verhaal treurt hij om zijn verdwenen zoon en houdt hij hoop op Gods barmhartigheid.',
  'Yaqub urges his sons to serve the one God. In Yusuf’s story he grieves for his missing son while retaining hope in God’s mercy.',
  'Ya‘qûb demande à ses fils de servir le Dieu unique. Dans le récit de Yûsuf, il pleure son fils disparu tout en gardant espoir en la miséricorde divine.'
], [[2,132,133], [12,83,87]], compared('jacob'));
add('joseph', ['Yusuf (Jozef)', 'Yusuf (Joseph)', 'Yûsuf (Joseph)'], ['Yusuf', 'Jozef', 'Joseph', 'يوسف'], ['prophet'], [
  'Yusuf wordt door zijn broers weggevoerd, komt in Egypte terecht en legt dromen uit. Na gevangenschap krijgt hij verantwoordelijkheid over de voorraden en wordt hij met zijn familie herenigd.',
  'Yusuf is taken away by his brothers, reaches Egypt and interprets dreams. After imprisonment he receives responsibility for the storehouses and is reunited with his family.',
  'Yûsuf est éloigné par ses frères, arrive en Égypte et interprète les rêves. Après la prison, il reçoit la gestion des réserves et retrouve sa famille.'
], [[12,4,18], [12,54,57], [12,99,101]], compared('joseph'));
add('shuayb', ['Shuayb', 'Shuayb', 'Chu‘ayb'], ['Shuaib', 'شعيب'], ['prophet', 'messenger'], [
  'Shuayb roept Midjan op God te dienen en eerlijk te handelen met maten en gewichten. Zijn boodschap verbindt geloof met rechtvaardigheid in het dagelijks verkeer.',
  'Shuayb calls Midian to worship God and use honest measures and weights. His message connects faith with justice in everyday dealings.',
  'Chu‘ayb appelle Madyan à adorer Dieu et à respecter les poids et mesures. Son message relie la foi à la justice dans les échanges quotidiens.'
], [[7,85,93], [11,84,95]]);
add('job', ['Ayyub (Job)', 'Ayyub (Job)', 'Ayyûb (Job)'], ['Ayyub', 'Job', 'أيوب'], ['prophet'], [
  'Ayyub roept God aan tijdens zijn lijden. Zijn beproeving, herstel en geduld vormen de kern van de korte passages over hem.',
  'Ayyub calls upon God in suffering. His trial, restoration and patience are central to the short passages about him.',
  'Ayyûb invoque Dieu dans la souffrance. Son épreuve, son rétablissement et sa patience sont au cœur des courts passages qui le concernent.'
], [[21,83,84], [38,41,44]], compared('job'));
add('dhul-kifl', ['Dhu al-Kifl', 'Dhu al-Kifl', 'Dhû al-Kifl'], ['Dhul-Kifl', 'ذو الكفل'], ['believer'], [
  'Dhu al-Kifl wordt met Ismail en Idris geprezen om geduld en rechtschapenheid. Hij wordt traditioneel onder de 25 profeten gerekend, maar deze verzen noemen hem niet uitdrukkelijk profeet.',
  'Dhu al-Kifl is praised with Ismail and Idris for patience and righteousness. Conventionally counted among the 25 prophets, he is not explicitly called a prophet in these verses.',
  'Dhû al-Kifl est loué avec Ismâïl et Idrîs pour sa patience et sa droiture. Traditionnellement compté parmi les 25 prophètes, il n’est pas explicitement qualifié de prophète dans ces versets.'
], [[21,85,86], [38,48]], { classification: 'conventionally-counted-prophet' });
add('moses', ['Musa (Mozes)', 'Musa (Moses)', 'Mûsâ (Moïse)'], ['Musa', 'Mozes', 'Moses', 'Moïse', 'موسى'], ['prophet', 'messenger'], [
  'God spreekt Musa aan en zendt hem naar Farao, met Harun als helper. Zijn verhalen behandelen bevrijding, openbaring, leiding en de beproevingen van zijn volk.',
  'God addresses Musa and sends him to Pharaoh, with Harun as his helper. His narratives concern deliverance, revelation, leadership and the trials of his people.',
  'Dieu s’adresse à Mûsâ et l’envoie auprès de Pharaon, avec Hârûn pour l’aider. Ses récits portent sur la délivrance, la révélation et les épreuves de son peuple.'
], [[20,9,36], [7,103,137]], compared('moses'));
add('aaron', ['Harun (Aäron)', 'Harun (Aaron)', 'Hârûn (Aaron)'], ['Harun', 'Aäron', 'Aaron', 'هارون'], ['prophet'], [
  'Harun is Musa’s broer en helper. Tijdens de episode met het kalf waarschuwt hij het volk en roept het op hem te volgen.',
  'Harun is Musa’s brother and helper. During the calf episode he warns the people and calls them to follow him.',
  'Hârûn est le frère et l’assistant de Mûsâ. Lors de l’épisode du veau, il avertit le peuple et l’appelle à le suivre.'
], [[19,53], [20,29,36], [20,90,94]], compared('aaron'));
add('david', ['Dawud (David)', 'Dawud (David)', 'Dâwûd (David)'], ['Dawud', 'David', 'داود'], ['prophet', 'ruler'], [
  'Dawud verslaat Jalut en ontvangt koningschap en wijsheid. Hij ontvangt de Zabur; een andere passage benadrukt zijn verantwoordelijkheid om rechtvaardig te oordelen.',
  'Dawud defeats Jalut and receives kingship and wisdom. He receives the Zabur; another passage stresses his responsibility to judge justly.',
  'Dâwûd vainc Jâlût et reçoit royauté et sagesse. Il reçoit le Zabûr ; un autre passage souligne sa responsabilité de juger avec justice.'
], [[2,251], [4,163], [38,17,26]], compared('david'));
add('solomon', ['Sulayman (Salomo)', 'Sulayman (Solomon)', 'Sulaymân (Salomon)'], ['Sulayman', 'Salomo', 'Solomon', 'Salomon', 'سليمان'], ['prophet', 'ruler'], [
  'Sulayman erft van Dawud en dankt God voor zijn gaven. Zijn verhalen omvatten kennis van de vogels, zijn heerschappij en de ontmoeting met de koningin van Saba.',
  'Sulayman inherits from Dawud and thanks God for his gifts. His stories include knowledge of birds, his rule and the encounter with the queen of Sheba.',
  'Sulaymân hérite de Dâwûd et remercie Dieu de ses dons. Ses récits évoquent le langage des oiseaux, son règne et sa rencontre avec la reine de Saba.'
], [[27,15,44], [38,30,40]], compared('solomon'));
add('elijah', ['Ilyas (Elia)', 'Ilyas (Elijah)', 'Ilyâs (Élie)'], ['Ilyas', 'Elia', 'Elijah', 'Élie', 'إلياس'], ['prophet', 'messenger'], [
  'Ilyas roept zijn volk op God te dienen in plaats van Baäl. Hij wordt onder de rechtvaardigen en de boodschappers genoemd.',
  'Ilyas calls his people to worship God rather than Baal. He is named among the righteous and the messengers.',
  'Ilyâs appelle son peuple à adorer Dieu plutôt que Baal. Il est cité parmi les vertueux et les messagers.'
], [[6,85], [37,123,132]], compared('elijah'));
add('elisha', ['Al-Yasa (Elisa)', 'Al-Yasa (Elisha)', 'Al-Yasa‘ (Élisée)'], ['Al-Yasa', 'Elisa', 'Elisha', 'Élisée', 'اليسع'], ['prophet'], [
  'Al-Yasa wordt genoemd in lijsten van door God begunstigde en uitmuntende personen. De Koran vertelt geen afzonderlijke levensgeschiedenis over hem.',
  'Al-Yasa appears in lists of people favoured by God and counted among the outstanding. The Qur’an gives no separate life narrative for him.',
  'Al-Yasa‘ figure parmi les personnes favorisées par Dieu et les meilleurs de Ses serviteurs. Le Coran ne présente pas de récit distinct de sa vie.'
], [[6,86,89], [38,48]], compared('elisha'));
add('jonah', ['Yunus (Jona)', 'Yunus (Jonah)', 'Yûnus (Jonas)'], ['Yunus', 'Jona', 'Jonah', 'Jonas', 'يونس'], ['prophet', 'messenger'], [
  'Yunus verlaat zijn volk, wordt door een grote vis opgeslokt en roept God aan. Zijn redding en het geloof van zijn volk staan centraal.',
  'Yunus leaves his people, is swallowed by a great fish and calls upon God. His rescue and his people’s belief are central to his story.',
  'Yûnus quitte son peuple, est avalé par un grand poisson et invoque Dieu. Son salut et la foi de son peuple sont au centre du récit.'
], [[21,87,88], [37,139,148]], compared('jonah'));
add('zechariah', ['Zakariya (Zacharias)', 'Zakariya (Zechariah)', 'Zakariyyâ (Zacharie)'], ['Zakariya', 'Zacharias', 'Zechariah', 'Zacharie', 'زكريا'], ['prophet', 'parent'], [
  'Zakariya draagt zorg voor Maryam en bidt op hoge leeftijd om een kind. De geboorte van Yahya wordt hem aangekondigd.',
  'Zakariya cares for Maryam and prays for a child in old age. The birth of Yahya is announced to him.',
  'Zakariyyâ prend soin de Maryam et prie pour avoir un enfant malgré son âge avancé. La naissance de Yahyâ lui est annoncée.'
], [[3,37,41], [19,2,11]], compared('zechariah'));
add('john-baptist', ['Yahya (Johannes)', 'Yahya (John)', 'Yahyâ (Jean)'], ['Yahya', 'Johannes', 'John', 'Jean', 'يحيى'], ['prophet'], [
  'Yahya wordt als zoon aan Zakariya aangekondigd. Hij ontvangt als kind wijsheid en wordt beschreven als zuiver, godvrezend en goed voor zijn ouders.',
  'Yahya is announced as Zakariya’s son. He receives wisdom in childhood and is described as pure, devout and kind to his parents.',
  'Yahyâ est annoncé comme fils de Zakariyyâ. Il reçoit la sagesse dès l’enfance et est présenté comme pur, pieux et bon envers ses parents.'
], [[3,39], [19,7,15]], compared('john-baptist'));
add('jesus', ['Isa (Jezus)', 'Isa (Jesus)', 'Îsâ (Jésus)'], ['Isa', 'Jezus', 'Jesus', 'Jésus', 'Messias', 'عيسى'], ['prophet', 'messenger'], [
  'Isa is de zoon van Maryam, de Messias en een boodschapper. Hij ontvangt de Injil en verricht tekenen met Gods toestemming; de Koran verwerpt zijn goddelijkheid.',
  'Isa is Maryam’s son, the Messiah and a messenger. He receives the Injil and performs signs by God’s permission; the Qur’an rejects his divinity.',
  'Îsâ est le fils de Maryam, le Messie et un messager. Il reçoit l’Injîl et accomplit des signes avec la permission de Dieu ; le Coran rejette sa divinité.'
], [[3,45,51], [5,72,75], [5,110]], compared('jesus'));
add('muhammad', ['Mohammed', 'Muhammad', 'Muhammad'], ['Muhammad', 'Mohammed', 'Ahmad', 'محمد'], ['prophet', 'messenger'], [
  'Mohammed wordt Gods boodschapper en het zegel van de profeten genoemd. De Koran presenteert hem als een voorbeeld voor gelovigen en als mens die openbaring ontvangt.',
  'Muhammad is called God’s messenger and the seal of the prophets. The Qur’an presents him as an example for believers and as a human receiving revelation.',
  'Muhammad est appelé messager de Dieu et sceau des prophètes. Le Coran le présente comme un exemple pour les croyants et un être humain recevant la révélation.'
], [[33,21], [33,40], [18,110]], compared('muhammad'));

add('mary', ['Maryam (Maria)', 'Maryam (Mary)', 'Maryam (Marie)'], ['Maryam', 'Maria', 'Mary', 'Marie', 'مريم'], ['parent', 'believer'], [
  'Maryam wordt door God uitverkoren. Zij ontvangt de aankondiging van Isa, baart hem zonder menselijke vader en wordt als voorbeeld van toewijding genoemd.',
  'Maryam is chosen by God. She receives the announcement of Isa, gives birth without a human father and is presented as an example of devotion.',
  'Maryam est choisie par Dieu. Elle reçoit l’annonce de Îsâ, enfante sans père humain et est présentée comme un exemple de dévotion.'
], [[3,42,47], [19,16,36], [66,12]], compared('mary'));
add('imran', ['Imran', 'Imran', '‘Imrân'], ['عمران'], ['parent'], [
  'Imran wordt genoemd in de uitverkoren familie van Imran en als vader van Maryam. Deze vermelding wordt hier niet samengevoegd met een gelijknamige Bijbelse identiteit.',
  'Imran is named in the chosen family of Imran and as Maryam’s father. This entry is not merged with a similarly named biblical identity.',
  '‘Imrân est mentionné dans la famille élue de ‘Imrân et comme père de Maryam. Cette entrée n’est pas fusionnée avec une identité biblique au nom voisin.'
], [[3,33,36], [66,12]]);
add('azar', ['Azar', 'Azar', 'Âzar'], ['آزر'], ['parent'], [
  'Azar wordt in de Koran als Ibrahims vader aangesproken in een gesprek over afgodsbeelden. De index voegt hem niet automatisch samen met Terach uit Genesis.',
  'Azar is addressed in the Qur’an as Ibrahim’s father in a discussion about idols. The index does not automatically merge him with Terah in Genesis.',
  'Âzar est désigné dans le Coran comme le père d’Ibrâhîm lors d’un échange sur les idoles. L’index ne le fusionne pas automatiquement avec Térah dans la Genèse.'
], [[6,74]]);
add('luqman', ['Luqman', 'Luqman', 'Luqmân'], ['لقمان'], ['wisdom', 'parent'], [
  'Luqman ontvangt wijsheid en onderwijst zijn zoon. Zijn raad gaat over Gods eenheid, gebed, geduld en bescheiden gedrag; de passage noemt hem niet profeet.',
  'Luqman receives wisdom and teaches his son. His counsel concerns God’s oneness, prayer, patience and humility; the passage does not call him a prophet.',
  'Luqmân reçoit la sagesse et instruit son fils. Ses conseils concernent l’unicité de Dieu, la prière, la patience et l’humilité ; le passage ne le qualifie pas de prophète.'
], [[31,12,19]]);
add('uzayr', ['Uzayr', 'Uzayr', '‘Uzayr'], ['Ezra', 'عزير'], ['narrative'], [
  'Uzayr wordt genoemd in een passage die een uitspraak over goddelijk zoonschap weerlegt. De passage biedt geen levensbeschrijving; zij is geen beschrijving van wat alle joden geloven.',
  'Uzayr is named in a passage rejecting a claim of divine sonship. It offers no biography and should not be treated as a description of what all Jews believe.',
  '‘Uzayr est nommé dans un passage réfutant une affirmation de filiation divine. Il ne donne pas de biographie et ne décrit pas la croyance de tous les juifs.'
], [[9,30]]);
add('talut', ['Talut', 'Talut', 'Tâlût'], ['Saul', 'طالوت'], ['ruler'], [
  'Talut wordt als koning aangesteld en leidt zijn leger. De oversteek van een rivier beproeft zijn manschappen vóór de strijd tegen Jalut.',
  'Talut is appointed king and leads his army. A river crossing tests his troops before the battle against Jalut.',
  'Tâlût est établi roi et conduit son armée. La traversée d’une rivière met ses hommes à l’épreuve avant le combat contre Jâlût.'
], [[2,247,251]]);
add('jalut', ['Jalut', 'Jalut', 'Jâlût'], ['Goliath', 'جالوت'], ['opponent'], [
  'Jalut staat met zijn leger tegenover Talut en de gelovigen. Dawud doodt hem in de strijd.',
  'Jalut and his army confront Talut and the believers. Dawud kills him in battle.',
  'Jâlût et son armée affrontent Tâlût et les croyants. Dâwûd le tue au combat.'
], [[2,249,251]]);
add('qarun', ['Qarun', 'Qarun', 'Qârûn'], ['Korah', 'Korach', 'قارون'], ['narrative'], [
  'Qarun behoort tot Musa’s volk en bezit grote rijkdom. Zijn hoogmoed en het verdwijnen van hem en zijn huis in de aarde dienen als waarschuwing.',
  'Qarun belongs to Musa’s people and possesses great wealth. His arrogance and the earth swallowing him and his house serve as a warning.',
  'Qârûn appartient au peuple de Mûsâ et possède de grandes richesses. Son orgueil et son engloutissement avec sa demeure servent d’avertissement.'
], [[28,76,82]]);
add('haman', ['Haman', 'Haman', 'Hâmân'], ['هامان'], ['opponent'], [
  'Haman staat aan Farao’s zijde. Farao draagt hem op een hoge constructie te bouwen; deze Koranfiguur blijft gescheiden van Haman in het boek Ester.',
  'Haman is associated with Pharaoh, who orders him to build a lofty structure. This Qur’anic figure remains separate from Haman in the book of Esther.',
  'Hâmân est associé à Pharaon, qui lui ordonne de construire un édifice élevé. Cette figure coranique reste distincte de Haman dans le livre d’Esther.'
], [[28,38], [40,36,37]]);
add('pharaoh', ['Farao bij Musa', 'Pharaoh in Musa’s story', 'Pharaon dans le récit de Mûsâ'], ['Farao', 'Pharaoh', 'Pharaon', 'Firawn', 'فرعون'], ['ruler', 'opponent'], [
  'Farao onderdrukt de Israëlieten en verzet zich tegen Musa. De titel wordt niet aan een bij naam genoemde historische farao gekoppeld.',
  'Pharaoh oppresses the Israelites and resists Musa. The title is not linked here to a named historical pharaoh.',
  'Pharaon opprime les Israélites et s’oppose à Mûsâ. Le titre n’est pas associé ici à un pharaon historique nommé.'
], [[28,3,8], [10,75,92]], { naming: 'title' });
add('samiri', ['As-Samiri', 'As-Samiri', 'As-Sâmirî'], ['Samiri', 'السامري'], ['opponent'], [
  'As-Samiri wordt verantwoordelijk gesteld voor het misleiden van het volk met het kalf tijdens Musa’s afwezigheid. Musa ondervraagt en verbant hem.',
  'As-Samiri is held responsible for misleading the people with the calf during Musa’s absence. Musa questions him and sends him away.',
  'As-Sâmirî est tenu responsable d’avoir égaré le peuple avec le veau pendant l’absence de Mûsâ. Celui-ci l’interroge et le chasse.'
], [[20,85,97]]);
add('dhul-qarnayn', ['Dhu al-Qarnayn', 'Dhu al-Qarnayn', 'Dhû al-Qarnayn'], ['Dhul-Qarnayn', 'ذو القرنين'], ['ruler'], [
  'Dhu al-Qarnayn reist en bouwt een barrière tegen Gog en Magog. Het profiel volgt de Koran en kiest geen omstreden historische identificatie voor hem.',
  'Dhu al-Qarnayn travels and builds a barrier against Gog and Magog. This profile follows the Qur’an without selecting a disputed historical identification.',
  'Dhû al-Qarnayn voyage et construit une barrière contre Gog et Magog. Ce profil suit le Coran sans retenir d’identification historique contestée.'
], [[18,83,98]], { naming: 'title' });
add('abu-lahab', ['Abu Lahab', 'Abu Lahab', 'Abû Lahab'], ['Aboe Lahab', 'أبو لهب'], ['opponent'], [
  'Abu Lahab wordt met zijn vrouw veroordeeld in soera 111. Zijn rijkdom en verworven bezit kunnen hem volgens de passage niet redden.',
  'Abu Lahab is condemned together with his wife in surah 111. According to the passage, his wealth and gains cannot save him.',
  'Abû Lahab est condamné avec son épouse dans la sourate 111. Selon le passage, ses richesses et ses acquis ne peuvent le sauver.'
], [[111,1,5]]);
add('zayd', ['Zayd', 'Zayd', 'Zayd'], ['Zaid', 'زيد'], ['narrative'], [
  'Zayd wordt bij naam genoemd in de passage over zijn beëindigde huwelijk en het daaropvolgende huwelijk van de Profeet met zijn voormalige vrouw.',
  'Zayd is named in the passage about the end of his marriage and the Prophet’s subsequent marriage to his former wife.',
  'Zayd est nommé dans le passage concernant la fin de son mariage et le mariage ultérieur du Prophète avec son ancienne épouse.'
], [[33,37]]);

add('adam-wife', ['Adams vrouw', 'Adam’s wife', 'L’épouse d’Adam'], [], ['family'], [
  'Adams vrouw deelt met hem het verblijf in de tuin en de overtreding. De Koran geeft haar in dit verhaal geen eigennaam.',
  'Adam’s wife shares life in the garden and the transgression with him. The Qur’an does not give her a personal name in this account.',
  'L’épouse d’Adam partage avec lui le jardin et la transgression. Le Coran ne lui donne pas de nom personnel dans ce récit.'
], [[2,35,36], [7,19,23]], unnamed);
add('abraham-wife', ['Ibrahims vrouw bij de aankondiging', 'Ibrahim’s wife at the announcement', 'L’épouse d’Ibrâhîm lors de l’annonce'], [], ['family', 'parent'], [
  'Ibrahims vrouw hoort de aankondiging van Ishaq en Yaqub en reageert verbaasd wegens hun hoge leeftijd. Zij wordt in deze verzen niet bij naam genoemd.',
  'Ibrahim’s wife hears the announcement of Ishaq and Yaqub and expresses surprise because of their old age. These verses do not name her.',
  'L’épouse d’Ibrâhîm reçoit l’annonce de Ishâq et Ya‘qûb et s’étonne de leur âge avancé. Ces versets ne la nomment pas.'
], [[11,71,73]], unnamed);
add('queen-sheba', ['De koningin van Saba', 'The queen of Sheba', 'La reine de Saba'], [], ['ruler'], [
  'De heerseres van Saba overlegt met haar raad en ontmoet Sulayman. Zij erkent uiteindelijk God; de Koran noemt haar niet Bilqis.',
  'The ruler of Sheba consults her council and meets Sulayman. She ultimately acknowledges God; the Qur’an does not name her Bilqis.',
  'La souveraine de Saba consulte son conseil et rencontre Sulaymân. Elle reconnaît finalement Dieu ; le Coran ne la nomme pas Bilqîs.'
], [[27,23,44]], unnamed);
add('pharaoh-wife', ['Farao’s vrouw', 'Pharaoh’s wife', 'L’épouse de Pharaon'], [], ['believer'], [
  'Farao’s vrouw vraagt het kind Musa te sparen. Elders bidt zij om redding van Farao en wordt zij als voorbeeld voor gelovigen genoemd; haar eigennaam ontbreekt.',
  'Pharaoh’s wife asks that the infant Musa be spared. Elsewhere she prays for rescue from Pharaoh and is an example for believers; no personal name is given.',
  'L’épouse de Pharaon demande d’épargner le petit Mûsâ. Ailleurs, elle prie d’être sauvée de Pharaon et sert d’exemple aux croyants ; aucun nom personnel n’est donné.'
], [[28,9], [66,11]], unnamed);
add('moses-mother', ['Musa’s moeder', 'Musa’s mother', 'La mère de Mûsâ'], [], ['parent', 'believer'], [
  'Musa’s moeder krijgt de opdracht haar kind aan het water toe te vertrouwen en ontvangt de belofte van zijn terugkeer. Later wordt hij aan haar teruggegeven om hem te voeden.',
  'Musa’s mother is told to entrust her child to the water and is promised his return. He is later restored to her so she can nurse him.',
  'La mère de Mûsâ reçoit l’ordre de confier son enfant à l’eau et la promesse de son retour. Il lui est ensuite rendu pour qu’elle l’allaite.'
], [[28,7,13]], unnamed);
add('moses-sister', ['Musa’s zus', 'Musa’s sister', 'La sœur de Mûsâ'], [], ['family'], [
  'Musa’s zus volgt het kind en stelt een gezin voor dat voor hem kan zorgen. De Koran noemt haar hier niet bij naam; zij is niet Maryam, de moeder van Isa.',
  'Musa’s sister follows the child and suggests a household that can care for him. The Qur’an does not name her here; she is not Maryam, Isa’s mother.',
  'La sœur de Mûsâ suit l’enfant et propose une famille pour s’en occuper. Le Coran ne la nomme pas ici ; elle n’est pas Maryam, la mère de Îsâ.'
], [[28,11,13]], unnamed);
add('mary-mother', ['Maryams moeder', 'Maryam’s mother', 'La mère de Maryam'], [], ['parent', 'believer'], [
  'De vrouw van Imran wijdt haar ongeboren kind aan God. Na de geboorte noemt zij haar dochter Maryam en vraagt bescherming voor haar en haar nakomelingen.',
  'Imran’s wife dedicates her unborn child to God. After the birth she names her daughter Maryam and asks protection for her and her offspring.',
  'L’épouse de ‘Imrân consacre son enfant à naître à Dieu. Après la naissance, elle appelle sa fille Maryam et demande protection pour elle et sa descendance.'
], [[3,35,36]], unnamed);
add('lot-wife', ['Luts vrouw', 'Lut’s wife', 'L’épouse de Lût'], [], ['family'], [
  'Luts vrouw wordt uitgezonderd van de redding van zijn gezin. Samen met Nuhs vrouw dient zij als voorbeeld dat het huwelijk met een rechtvaardige geen redding garandeert.',
  'Lut’s wife is excepted from his household’s rescue. With Nuh’s wife she illustrates that marriage to a righteous person does not guarantee salvation.',
  'L’épouse de Lût est exclue du salut de sa famille. Avec celle de Nûh, elle illustre que le mariage avec un juste ne garantit pas le salut.'
], [[11,81], [66,10]], unnamed);
add('noah-wife', ['Nuhs vrouw', 'Nuh’s wife', 'L’épouse de Nûh'], [], ['family'], [
  'Nuhs vrouw wordt samen met Luts vrouw als tegenvoorbeeld genoemd. De tekst geeft haar geen naam en stelt dat hun echtgenoten hen niet tegen het oordeel konden beschermen.',
  'Nuh’s wife is presented alongside Lut’s wife as a counterexample. She is unnamed, and the text says their husbands could not protect them from judgment.',
  'L’épouse de Nûh est présentée avec celle de Lût comme un contre-exemple. Elle n’est pas nommée et leurs maris ne peuvent les protéger du jugement.'
], [[66,10]], unnamed);
add('noah-son', ['Nuhs zoon bij de vloed', 'Nuh’s son in the flood', 'Le fils de Nûh lors du déluge'], [], ['family'], [
  'Een zoon van Nuh weigert met hem aan boord te gaan en zoekt veiligheid op een berg. Hij verdrinkt; de passage maakt onderscheid tussen verwantschap en rechtschapen handelen.',
  'A son of Nuh refuses to board with him and seeks safety on a mountain. He drowns; the passage distinguishes kinship from righteous conduct.',
  'Un fils de Nûh refuse d’embarquer et cherche refuge sur une montagne. Il se noie ; le passage distingue parenté et conduite juste.'
], [[11,42,46]], unnamed);
add('adam-son-killed', ['Adams gedode zoon', 'Adam’s slain son', 'Le fils d’Adam tué'], [], ['family', 'narrative'], [
  'Een van Adams twee zonen brengt een aanvaard offer en wordt door zijn broer gedood. De Koran gebruikt hier niet de namen Abel en Kaïn.',
  'One of Adam’s two sons offers an accepted sacrifice and is killed by his brother. The Qur’an does not use the names Abel and Cain here.',
  'L’un des deux fils d’Adam présente une offrande acceptée et est tué par son frère. Le Coran n’emploie pas ici les noms Abel et Caïn.'
], [[5,27,31]], unnamed);
add('adam-son-killer', ['Adams zoon die zijn broer doodt', 'Adam’s son who kills his brother', 'Le fils d’Adam qui tue son frère'], [], ['family', 'narrative'], [
  'Nadat zijn offer niet is aanvaard, doodt deze zoon van Adam zijn broer. Een raaf laat hem zien hoe hij het lichaam kan bedekken; de tekst noemt hem niet bij naam.',
  'After his sacrifice is not accepted, this son of Adam kills his brother. A raven shows him how to cover the body; the text gives him no personal name.',
  'Son offrande n’étant pas acceptée, ce fils d’Adam tue son frère. Un corbeau lui montre comment couvrir le corps ; le texte ne lui donne pas de nom.'
], [[5,27,31]], unnamed);
add('moses-guide', ['De dienaar die Musa onderwijst', 'The servant who teaches Musa', 'Le serviteur qui instruit Mûsâ'], [], ['wisdom'], [
  'Musa volgt een dienaar aan wie God kennis heeft gegeven. Drie gebeurtenissen beproeven zijn geduld; de gids verklaart zijn handelen. De naam al-Khidr staat niet in deze verzen.',
  'Musa follows a servant whom God has given knowledge. Three events test his patience before the guide explains his actions. The name al-Khidr is absent from these verses.',
  'Mûsâ suit un serviteur auquel Dieu a donné un savoir. Trois événements éprouvent sa patience avant que le guide explique ses actes. Le nom al-Khidr est absent de ces versets.'
], [[18,65,82]], unnamed);
add('joseph-master', ['De Egyptenaar die Yusuf koopt', 'The Egyptian who buys Yusuf', 'L’Égyptien qui achète Yûsuf'], ['Al-Aziz'], ['narrative'], [
  'De Egyptenaar die Yusuf koopt vraagt zijn vrouw goed voor hem te zorgen. De episode rond Yusuf en zijn vrouw speelt zich in zijn huishouden af; zijn eigennaam ontbreekt.',
  'The Egyptian who buys Yusuf asks his wife to care for him. The episode involving Yusuf and his wife takes place in his household; no personal name is given.',
  'L’Égyptien qui achète Yûsuf demande à sa femme de bien le traiter. L’épisode concernant Yûsuf et son épouse se déroule chez lui ; aucun nom personnel n’est donné.'
], [[12,21,29]], unnamed);
add('joseph-master-wife', ['De vrouw van Yusufs meester', 'The wife of Yusuf’s master', 'L’épouse du maître de Yûsuf'], [], ['narrative'], [
  'De vrouw in het huis waar Yusuf woont probeert hem te verleiden en beschuldigt hem. Later erkent zij zijn waarachtigheid. De Koran noemt haar niet Zulaikha.',
  'The woman in the house where Yusuf lives tries to seduce him and accuses him. Later she acknowledges his truthfulness. The Qur’an does not name her Zulaikha.',
  'La femme de la maison où vit Yûsuf tente de le séduire et l’accuse. Elle reconnaît ensuite sa sincérité. Le Coran ne la nomme pas Zuleikha.'
], [[12,23,29], [12,51]], unnamed);
add('joseph-king', ['De koning in Yusufs verhaal', 'The king in Yusuf’s story', 'Le roi dans le récit de Yûsuf'], [], ['ruler'], [
  'De koning zoekt uitleg voor zijn droom over koeien en korenaren. Hij laat Yusuf komen en stelt vertrouwen in hem; de tekst noemt deze koning niet Farao.',
  'The king seeks an explanation of his dream about cattle and ears of grain. He summons Yusuf and places trust in him; the text does not call this king Pharaoh.',
  'Le roi cherche l’explication de son rêve de vaches et d’épis. Il fait venir Yûsuf et lui accorde sa confiance ; le texte n’appelle pas ce roi Pharaon.'
], [[12,43,55]], unnamed);
add('pharaoh-believer', ['De gelovige uit Farao’s huis', 'The believer from Pharaoh’s household', 'Le croyant de la famille de Pharaon'], [], ['believer'], [
  'Een man uit Farao’s huis houdt zijn geloof verborgen en verdedigt Musa. Hij waarschuwt zijn volk voor de gevolgen van het verwerpen van Gods boodschap.',
  'A man from Pharaoh’s household conceals his faith and speaks in Musa’s defence. He warns his people about rejecting God’s message.',
  'Un homme de la famille de Pharaon cache sa foi et défend Mûsâ. Il avertit son peuple des conséquences du rejet du message divin.'
], [[40,28,45]], unnamed);
add('city-believer', ['De gelovige man in Ya-Sin', 'The believing man in Ya-Sin', 'L’homme croyant dans Yâ-Sîn'], [], ['believer'], [
  'Een man komt uit de verste wijk van de stad en spoort zijn volk aan de boodschappers te volgen. De tekst noemt hem niet bij naam.',
  'A man comes from the farthest part of the city and urges his people to follow the messengers. The text gives him no personal name.',
  'Un homme vient du quartier le plus éloigné de la ville et exhorte son peuple à suivre les messagers. Le texte ne lui donne pas de nom.'
], [[36,20,27]], unnamed);
add('midian-elder', ['De vader van de vrouwen bij Midjan', 'The father of the women at Midian', 'Le père des femmes de Madyan'], [], ['parent'], [
  'Deze oudere man ontvangt Musa nadat hij zijn dochters heeft geholpen. Hij biedt een huwelijk en een dienstverband aan. De passage noemt hem niet Shuayb.',
  'This elderly man welcomes Musa after he helps his daughters. He offers a marriage and a term of service. The passage does not name him Shuayb.',
  'Cet homme âgé accueille Mûsâ après l’aide apportée à ses filles. Il propose un mariage et une durée de service. Le passage ne le nomme pas Chu‘ayb.'
], [[28,23,28]], unnamed);
add('moses-companion', ['Musa’s jonge reisgenoot', 'Musa’s young travelling companion', 'Le jeune compagnon de voyage de Mûsâ'], [], ['narrative'], [
  'Musa reist met een jonge metgezel naar de samenkomst van twee zeeën. De metgezel vertelt over de vis; de Koran noemt hem hier niet Jozua.',
  'Musa travels with a young companion towards the meeting of two seas. The companion reports what happened to the fish; the Qur’an does not name him Joshua here.',
  'Mûsâ voyage avec un jeune compagnon vers le confluent de deux mers. Celui-ci raconte ce qui est arrivé au poisson ; le Coran ne le nomme pas Josué ici.'
], [[18,60,64]], unnamed);
add('abu-lahab-wife', ['Abu Lahabs vrouw', 'Abu Lahab’s wife', 'L’épouse d’Abû Lahab'], [], ['opponent'], [
  'Abu Lahabs vrouw verschijnt samen met hem in de veroordeling van soera 111. Zij wordt omschreven als draagster van brandhout; haar eigennaam wordt niet vermeld.',
  'Abu Lahab’s wife appears with him in the condemnation in surah 111. She is described as carrying firewood; no personal name is supplied.',
  'L’épouse d’Abû Lahab apparaît avec lui dans la condamnation de la sourate 111. Elle est décrite comme portant du bois ; aucun nom personnel n’est donné.'
], [[111,4,5]], unnamed);

const data = {
  meta: {
    tradition: 'islam', version: 1, reviewedOn: '2026-10-22',
    scope: L(
      'Een afzonderlijke, samengestelde Koranindex met de 25 traditioneel getelde profeten en andere genoemde of herkenbaar beschreven personen. Geen volledige index van iedere anonieme figuur; engelen, djinn en groepen vallen buiten deze selectie.',
      'A separate curated Qur’an index covering the 25 conventionally counted prophets and other named or recognisably described people. Not an exhaustive index of every anonymous figure; angels, jinn and groups are outside this selection.',
      'Un index coranique distinct et sélectionné, comprenant les 25 prophètes traditionnellement dénombrés et d’autres personnes nommées ou reconnaissables dans le récit. Il ne recense pas chaque figure anonyme ; anges, djinns et groupes sont exclus.'
    ),
    referenceNote: L(
      'Samenvattingen beschrijven de Koranpassages, geen samengevoegde levensgeschiedenis uit andere tradities. Beschrijvende namen zijn herkenningslabels. Gelijkende namen maken personen niet automatisch identiek; Dhu al-Kifl is traditioneel als profeet geteld, terwijl zijn verzen hem als geduldig en rechtvaardig omschrijven.',
      'Summaries describe Qur’anic passages, not merged biographies from other traditions. Descriptive names are identification labels. Similar names do not automatically establish identity; Dhu al-Kifl is conventionally counted as a prophet while his verses describe patience and righteousness.',
      'Les résumés décrivent les passages coraniques, sans fusionner les biographies d’autres traditions. Les noms descriptifs servent de repères. Des noms voisins ne prouvent pas une identité ; Dhû al-Kifl est traditionnellement compté comme prophète, tandis que ses versets évoquent patience et droiture.'
    ),
    sources: [
      { id: 'quran', label: 'Qur’an — passage links at Quran.com', url: 'https://quran.com/' },
      { id: 'quranenc', label: 'QuranEnc — text cross-check against the bundled editions', url: 'https://quranenc.com/en/home' }
    ],
    editorialMethod: 'Original NL/EN/FR paraphrases checked against the locally bundled QuranEnc editions and primary passage links. Commentary names are not silently substituted for unnamed Qur’anic figures. No cross-tradition family edges are inferred.',
    count: people.length
  }, people
};
const output = JSON.stringify(data, null, 2) + '\n';
const file = path.join(root, 'dist', 'quran-people.json');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(file, 'utf8') !== output) throw new Error('Qur’an person asset differs; run node scripts/build-quran-people.cjs');
  console.log(`Qur’an person data is reproducible: ${people.length} profiles.`);
} else {
  fs.writeFileSync(file, output);
  console.log(`Wrote ${people.length} Qur’an profiles.`);
}
