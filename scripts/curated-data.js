/* BiblePath's initial, curated index. Descriptions are original paraphrases.
   Verse links identify the evidence for each person and relationship. */
window.BIBLE_DATA = (() => {
  const people = [], relationships = [];
  const ref = label => ({ label, url: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(label)}&version=KJV` });
  const person = (id, name, gender, era, description, references, aliases = [], testament = 'OT') => people.push({ id, name, gender, testament, era, description, refs: references.split(';').map(ref), aliases });
  const parent = (source, target, reference, note) => relationships.push({ source, target, type: 'parent', ref: ref(reference), ...(note ? { note } : {}) });
  const spouse = (source, target, reference, note) => relationships.push({ source, target, type: 'spouse', ref: ref(reference), ...(note ? { note } : {}) });
  const family = (father, mother, children, reference) => children.split(' ').forEach(child => { parent(father, child, reference); parent(mother, child, reference); });

  person('adam', 'Adam', 'male', 'Beginnings', 'The first man in Genesis; husband of Eve and father of Cain, Abel, and Seth.', 'Genesis 4:1-2;Genesis 5:1-5');
  person('eve', 'Eve', 'female', 'Beginnings', 'Adam’s wife; mother of Cain, Abel, and Seth in the Genesis account.', 'Genesis 4:1-2;Genesis 4:25');
  person('cain', 'Cain', 'male', 'Beginnings', 'A farmer, son of Adam and Eve, who killed his brother Abel.', 'Genesis 4:1-8');
  person('abel', 'Abel', 'male', 'Beginnings', 'A shepherd whose offering was accepted; killed by his brother Cain.', 'Genesis 4:2-8');
  person('seth', 'Seth', 'male', 'Beginnings', 'Son born to Adam and Eve after Abel’s death.', 'Genesis 4:25-26;Genesis 5:3-8');
  person('enosh', 'Enosh', 'male', 'Beginnings', 'Seth’s son and father of Kenan.', 'Genesis 5:6-11', ['Enos']);
  person('kenan', 'Kenan', 'male', 'Beginnings', 'Son of Enosh and father of Mahalalel.', 'Genesis 5:9-14', ['Cainan']);
  person('mahalalel', 'Mahalalel', 'male', 'Beginnings', 'Kenan’s son and Jared’s father.', 'Genesis 5:12-17', ['Mahalaleel']);
  person('jared', 'Jared', 'male', 'Beginnings', 'Father of Enoch in Seth’s family line.', 'Genesis 5:15-20');
  person('enoch', 'Enoch', 'male', 'Beginnings', 'Jared’s son; remembered for walking with God.', 'Genesis 5:18-24');
  person('methuselah', 'Methuselah', 'male', 'Beginnings', 'Enoch’s son and father of Lamech.', 'Genesis 5:21-27');
  person('lamech', 'Lamech', 'male', 'Beginnings', 'Noah’s father, distinct from Lamech in Cain’s line.', 'Genesis 5:25-31');
  person('noah', 'Noah', 'male', 'Beginnings', 'Father of Shem, Ham, and Japheth; built the ark in the flood account.', 'Genesis 5:28-32;Genesis 6:13-22');
  ['shem', 'ham', 'japheth'].forEach(id => person(id, id[0].toUpperCase()+id.slice(1), 'male', 'Beginnings', 'One of Noah’s three named sons.', 'Genesis 5:32'));
  spouse('adam', 'eve', 'Genesis 4:1');
  family('adam', 'eve', 'cain abel', 'Genesis 4:1-2');
  family('adam', 'eve', 'seth', 'Genesis 4:25');
  const earlyLine = ['adam','seth','enosh','kenan','mahalalel','jared','enoch','methuselah','lamech','noah'];
  earlyLine.slice(1).forEach((id, i) => { if (id !== 'seth') parent(earlyLine[i], id, 'Genesis 5:3-29'); });
  ['shem','ham','japheth'].forEach(id => parent('noah', id, 'Genesis 5:32'));
  const afterFlood = [['arphaxad','Arphaxad'],['shelah','Shelah'],['eber','Eber'],['peleg','Peleg'],['reu','Reu'],['serug','Serug'],['nahor-elder','Nahor'],['terah','Terah']];
  afterFlood.forEach(([id,name], i) => {
    person(id,name,'male','Beginnings', id === 'terah' ? 'Father of Abraham, Nahor, and Haran.' : 'Named in the family line from Shem to Abraham.', 'Genesis 11:10-26', id === 'shelah' ? ['Salah'] : []);
    parent(i ? afterFlood[i-1][0] : 'shem', id, 'Genesis 11:10-26');
  });

  person('abraham', 'Abraham', 'male', 'Patriarchs', 'Patriarch called to leave his homeland; father of Isaac and Ishmael, and husband of Sarah.', 'Genesis 12:1-5;Genesis 17:1-8;Genesis 21:1-3', ['Abram']);
  person('sarah', 'Sarah', 'female', 'Patriarchs', 'Abraham’s wife, who gave birth to Isaac in her old age.', 'Genesis 21:1-7', ['Sarai']);
  person('hagar', 'Hagar', 'female', 'Patriarchs', 'Sarah’s Egyptian servant and Ishmael’s mother; encountered God’s messenger in the wilderness.', 'Genesis 16:1-16');
  person('ishmael', 'Ishmael', 'male', 'Patriarchs', 'Son of Abraham and Hagar; father of twelve named sons.', 'Genesis 16:15-16;Genesis 25:12-16');
  person('isaac', 'Isaac', 'male', 'Patriarchs', 'Son of Abraham and Sarah; husband of Rebekah and father of the twins Esau and Jacob.', 'Genesis 21:1-3;Genesis 25:19-26');
  person('keturah', 'Keturah', 'female', 'Patriarchs', 'Abraham’s wife and mother of six named sons.', 'Genesis 25:1-4');
  person('nahor', 'Nahor', 'male', 'Patriarchs', 'Abraham’s brother and Milcah’s husband; grandfather of Rebekah.', 'Genesis 11:26-29;Genesis 22:20-23');
  person('haran', 'Haran', 'male', 'Patriarchs', 'Abraham’s brother and father of Lot and Milcah.', 'Genesis 11:27-29');
  person('lot', 'Lot', 'male', 'Patriarchs', 'Haran’s son and Abraham’s nephew, who journeyed with him.', 'Genesis 11:27-31');
  person('milcah', 'Milcah', 'female', 'Patriarchs', 'Daughter of Haran, wife of Nahor, and mother of Bethuel.', 'Genesis 11:29;Genesis 22:20-23');
  person('bethuel', 'Bethuel', 'male', 'Patriarchs', 'Son of Nahor and Milcah; father of Rebekah and Laban.', 'Genesis 22:20-23;Genesis 28:5');
  person('rebekah', 'Rebekah', 'female', 'Patriarchs', 'Daughter of Bethuel; wife of Isaac and mother of Esau and Jacob.', 'Genesis 24:15;Genesis 25:20-26', ['Rebecca']);
  person('laban', 'Laban', 'male', 'Patriarchs', 'Rebekah’s brother and father of Leah and Rachel.', 'Genesis 28:5;Genesis 29:16');
  person('esau', 'Esau', 'male', 'Patriarchs', 'Isaac and Rebekah’s elder twin, also called Edom.', 'Genesis 25:24-34', ['Edom']);
  person('jacob', 'Jacob', 'male', 'Patriarchs', 'Son of Isaac and Rebekah, renamed Israel; father of the twelve sons associated with Israel’s tribes.', 'Genesis 25:26;Genesis 35:9-26', ['Israel']);
  person('leah', 'Leah', 'female', 'Patriarchs', 'Laban’s elder daughter, Jacob’s wife, and mother of six sons and Dinah.', 'Genesis 29:16-35;Genesis 30:17-21');
  person('rachel', 'Rachel', 'female', 'Patriarchs', 'Laban’s younger daughter and Jacob’s wife; mother of Joseph and Benjamin.', 'Genesis 29:16-30;Genesis 35:16-24');
  person('bilhah', 'Bilhah', 'female', 'Patriarchs', 'Rachel’s servant, given to Jacob as a wife; mother of Dan and Naphtali.', 'Genesis 30:3-8');
  person('zilpah', 'Zilpah', 'female', 'Patriarchs', 'Leah’s servant, given to Jacob as a wife; mother of Gad and Asher.', 'Genesis 30:9-13');
  for (const id of ['abraham','nahor','haran']) parent('terah', id, 'Genesis 11:26-27');
  for (const id of ['lot','milcah']) parent('haran', id, 'Genesis 11:27-29');
  spouse('nahor','milcah','Genesis 11:29'); family('nahor','milcah','bethuel','Genesis 22:20-23');
  parent('bethuel','rebekah','Genesis 24:15'); parent('bethuel','laban','Genesis 28:5');
  spouse('abraham','sarah','Genesis 11:29'); spouse('abraham','hagar','Genesis 16:3', 'Hagar was Sarah’s servant, given to Abraham as a wife in the narrative.');
  spouse('abraham','keturah','Genesis 25:1');
  family('abraham','sarah','isaac','Genesis 21:1-3'); family('abraham','hagar','ishmael','Genesis 16:15');
  ['Zimran','Jokshan','Medan','Midian','Ishbak','Shuah'].forEach(name => { const id=name.toLowerCase(); person(id,name,'male','Patriarchs','A son of Abraham and Keturah.','Genesis 25:1-2'); family('abraham','keturah',id,'Genesis 25:1-2'); });
  spouse('isaac','rebekah','Genesis 25:20'); family('isaac','rebekah','esau jacob','Genesis 25:24-26');
  ['leah','rachel'].forEach(id => parent('laban', id, 'Genesis 29:16'));
  ['leah','rachel'].forEach(id => spouse('jacob', id, 'Genesis 29:23-30'));
  ['bilhah','zilpah'].forEach(id => spouse('jacob', id, 'Genesis 30:3-9', 'The narrative also describes this relationship as concubinage.'));
  const jacobChildren = [
    ['reuben','Reuben','leah','Genesis 29:32','Jacob and Leah’s first son.'],
    ['simeon','Simeon','leah','Genesis 29:33','The second son of Jacob and Leah.'],
    ['levi','Levi','leah','Genesis 29:34','Son of Jacob and Leah; ancestor of the Levites.'],
    ['judah','Judah','leah','Genesis 29:35','Son of Jacob and Leah, in the ancestral line of David.'],
    ['dan','Dan','bilhah','Genesis 30:3-6','Son of Jacob and Bilhah.'],
    ['naphtali','Naphtali','bilhah','Genesis 30:7-8','Bilhah’s second son with Jacob.'],
    ['gad','Gad','zilpah','Genesis 30:9-11','Son of Jacob and Zilpah.'],
    ['asher','Asher','zilpah','Genesis 30:12-13','Zilpah’s second son with Jacob.'],
    ['issachar','Issachar','leah','Genesis 30:17-18','Leah’s fifth son with Jacob.'],
    ['zebulun','Zebulun','leah','Genesis 30:19-20','Leah’s sixth son with Jacob.'],
    ['dinah','Dinah','leah','Genesis 30:21','Named daughter of Jacob and Leah.'],
    ['joseph','Joseph','rachel','Genesis 30:22-24','Son of Jacob and Rachel who became a ruler in Egypt.'],
    ['benjamin','Benjamin','rachel','Genesis 35:16-18','Jacob’s youngest son, born as Rachel died.']
  ];
  jacobChildren.forEach(([id,name,mother,reference,description]) => { person(id,name,id==='dinah'?'female':'male','Patriarchs',description,reference+(id==='joseph'?';Genesis 41:39-45':'')); family('jacob',mother,id,reference); });
  person('asenath','Asenath','female','Patriarchs','Daughter of Potiphera, wife of Joseph, and mother of Manasseh and Ephraim.','Genesis 41:45-52');
  person('potiphera','Potiphera','male','Patriarchs','Priest of On and Asenath’s father. Distinct from Potiphar.','Genesis 41:45');
  person('manasseh','Manasseh','male','Patriarchs','Joseph and Asenath’s firstborn son.','Genesis 41:50-51');
  person('ephraim','Ephraim','male','Patriarchs','Joseph and Asenath’s second son.','Genesis 41:50-52');
  parent('potiphera','asenath','Genesis 41:45'); spouse('joseph','asenath','Genesis 41:45'); family('joseph','asenath','manasseh ephraim','Genesis 41:50-52');

  const levites = [['gershon','Gershon'],['kohath','Kohath'],['merari','Merari']];
  levites.forEach(([id,name]) => { person(id,name,'male','Exodus','A son of Levi named in the Levite family record.','Exodus 6:16'); parent('levi',id,'Exodus 6:16'); });
  person('amram','Amram','male','Exodus','Kohath’s son; husband of Jochebed and father of Moses, Aaron, and Miriam.','Exodus 6:18-20;Numbers 26:59');
  person('jochebed','Jochebed','female','Exodus','A daughter of Levi; mother of Moses, Aaron, and Miriam.','Numbers 26:59');
  person('moses','Moses','male','Exodus','Led Israel out of Egypt with Aaron; son of Amram and Jochebed.','Exodus 6:20-27');
  person('aaron','Aaron','male','Exodus','Moses’ brother and Elisheba’s husband; father of four named sons.','Exodus 6:20-27');
  person('miriam','Miriam','female','Exodus','Daughter of Amram and Jochebed, and sister of Aaron and Moses.','Numbers 26:59');
  person('zipporah','Zipporah','female','Exodus','Moses’ wife and mother of Gershom and Eliezer.','Exodus 2:21-22;Exodus 18:2-4');
  person('jethro','Jethro','male','Exodus','Priest of Midian and Moses’ father-in-law, also called Reuel in Exodus.','Exodus 2:18-21;Exodus 3:1;Exodus 18:1', ['Reuel']);
  person('gershom','Gershom','male','Exodus','Son of Moses and Zipporah; distinct from Gershon, Levi’s son.','Exodus 18:2-3');
  person('eliezer','Eliezer','male','Exodus','The other named son of Moses and Zipporah.','Exodus 18:2-4');
  person('elisheba','Elisheba','female','Exodus','Aaron’s wife, Amminadab’s daughter, and Nahshon’s sister.','Exodus 6:23');
  parent('kohath','amram','Exodus 6:18'); parent('levi','jochebed','Numbers 26:59');
  spouse('amram','jochebed','Exodus 6:20'); family('amram','jochebed','moses aaron miriam','Numbers 26:59');
  parent('jethro','zipporah','Exodus 2:18-21'); spouse('moses','zipporah','Exodus 2:21'); family('moses','zipporah','gershom eliezer','Exodus 18:2-4');
  spouse('aaron','elisheba','Exodus 6:23');
  ['Nadab','Abihu','Eleazar','Ithamar'].forEach(name => { const id=name.toLowerCase(); person(id,name,'male','Exodus','A son of Aaron and Elisheba.','Exodus 6:23'); family('aaron','elisheba',id,'Exodus 6:23'); });
  person('phinehas','Phinehas','male','Exodus','Son of Eleazar and grandson of Aaron.','Exodus 6:25'); parent('eleazar','phinehas','Exodus 6:25');

  person('tamar','Tamar','female','Patriarchs','Mother of Judah’s twin sons Perez and Zerah; formerly his daughter-in-law.','Genesis 38:24-30');
  person('perez','Perez','male','Patriarchs','Son of Judah and Tamar, in the ancestry of David.','Genesis 38:27-30;Ruth 4:18', ['Pharez']);
  person('zerah','Zerah','male','Patriarchs','Perez’s twin brother, a son of Judah and Tamar.','Genesis 38:27-30');
  family('judah','tamar','perez zerah','Genesis 38:27-30');
  const davidLine = [['hezron','Hezron'],['ram','Ram'],['amminadab','Amminadab'],['nahshon','Nahshon'],['salmon','Salmon'],['boaz','Boaz'],['obed','Obed'],['jesse','Jesse'],['david','David']];
  const davidDescriptions = { hezron:'Son of Perez in David’s family line.',ram:'Hezron’s son and Amminadab’s father.',amminadab:'Father of Nahshon and Elisheba.',nahshon:'Amminadab’s son and ancestor of David.',salmon:'Father of Boaz in the genealogy.',boaz:'Ruth’s husband and father of Obed.',obed:'Son of Boaz and Ruth, and grandfather of David.',jesse:'Obed’s son and David’s father.',david:'Son of Jesse; king of Israel and father of Solomon.' };
  davidLine.forEach(([id,name],i) => { person(id,name,'male', i<5 ? 'Exodus':'Kingdom',davidDescriptions[id],id==='amminadab'?'Ruth 4:19-20;Exodus 6:23':id==='david'?'Ruth 4:22;1 Chronicles 3:1-5':'Ruth 4:18-22',id==='ram'?['Aram']:id==='salmon'?['Salma']:[]); parent(i?davidLine[i-1][0]:'perez',id,'Ruth 4:18-22'); });
  parent('amminadab','elisheba','Exodus 6:23');
  person('rahab','Rahab','female','Kingdom','Named as Boaz’s mother in Matthew’s genealogy.','Matthew 1:5', ['Rachab']); parent('rahab','boaz','Matthew 1:5');
  person('ruth','Ruth','female','Kingdom','A Moabite widow who remained with Naomi; later married Boaz and became Obed’s mother.','Ruth 1:16-22;Ruth 4:10-17');
  person('naomi','Naomi','female','Kingdom','Elimelech’s wife and mother of Mahlon and Chilion; Ruth’s mother-in-law.','Ruth 1:1-5', ['Mara']);
  person('elimelech','Elimelech','male','Kingdom','Naomi’s husband, who moved with his family from Bethlehem to Moab.','Ruth 1:1-3');
  person('mahlon','Mahlon','male','Kingdom','Son of Elimelech and Naomi; Ruth’s first husband.','Ruth 1:2-5;Ruth 4:10');
  person('chilion','Chilion','male','Kingdom','Son of Elimelech and Naomi, who died in Moab.','Ruth 1:2-5');
  spouse('boaz','ruth','Ruth 4:13'); parent('ruth','obed','Ruth 4:13-17');
  spouse('elimelech','naomi','Ruth 1:2'); family('elimelech','naomi','mahlon chilion','Ruth 1:2'); spouse('mahlon','ruth','Ruth 4:10');
  person('bathsheba','Bathsheba','female','Kingdom','Wife of David and mother of Solomon.','2 Samuel 12:24;1 Chronicles 3:5', ['Bathshua']);
  person('ahinoam','Ahinoam','female','Kingdom','The Jezreelite mother of David’s firstborn, Amnon.','1 Chronicles 3:1');
  person('abigail','Abigail','female','Kingdom','David’s wife from Carmel and mother of Daniel.','1 Chronicles 3:1');
  person('maacah','Maacah','female','Kingdom','Talmai’s daughter and mother of David’s son Absalom.','1 Chronicles 3:2', ['Maachah']);
  person('haggith','Haggith','female','Kingdom','Mother of David’s son Adonijah.','1 Chronicles 3:2');
  person('amnon','Amnon','male','Kingdom','David’s firstborn son, by Ahinoam.','1 Chronicles 3:1');
  person('daniel-david','Daniel','male','Kingdom','David’s son by Abigail; distinct from the prophet Daniel.','1 Chronicles 3:1');
  person('absalom','Absalom','male','Kingdom','A son of David and Maacah.','1 Chronicles 3:2');
  person('adonijah','Adonijah','male','Kingdom','A son of David and Haggith.','1 Chronicles 3:2');
  person('tamar-david','Tamar','female','Kingdom','David’s daughter; distinct from Tamar, mother of Perez.','1 Chronicles 3:9');
  person('solomon','Solomon','male','Kingdom','Son of David and Bathsheba; father of Rehoboam.','1 Chronicles 3:5-10');
  person('nathan','Nathan','male','Kingdom','David and Bathsheba’s son; distinct from the prophet Nathan.','1 Chronicles 3:5');
  [['ahinoam','amnon'],['abigail','daniel-david'],['maacah','absalom'],['haggith','adonijah'],['bathsheba','solomon nathan']].forEach(([mother,children]) => family('david',mother,children,'1 Chronicles 3:1-5'));
  spouse('david','bathsheba','2 Samuel 12:24'); parent('david','tamar-david','1 Chronicles 3:9');
  const kings = [['rehoboam','Rehoboam'],['abijah','Abijah'],['asa','Asa'],['jehoshaphat','Jehoshaphat'],['jehoram','Jehoram'],['ahaziah','Ahaziah'],['joash','Joash'],['amaziah','Amaziah'],['uzziah','Uzziah'],['jotham','Jotham'],['ahaz','Ahaz'],['hezekiah','Hezekiah'],['manasseh-king','Manasseh'],['amon','Amon'],['josiah','Josiah'],['jehoiakim','Jehoiakim'],['jeconiah','Jeconiah']];
  kings.forEach(([id,name],i) => { person(id,name,'male',i>14?'Exile':'Kingdom','Named in Judah’s royal family line.','1 Chronicles 3:10-16',id==='uzziah'?['Azariah']:id==='jeconiah'?['Jehoiachin','Coniah']:id==='abijah'?['Abia']:id==='jehoram'?['Joram']:[]); parent(i?kings[i-1][0]:'solomon',id,'1 Chronicles 3:10-16'); });
  person('pedaiah','Pedaiah','male','Exile','Jeconiah’s son; named as Zerubbabel’s father in Chronicles.','1 Chronicles 3:17-19');
  person('shealtiel','Shealtiel','male','Exile','Jeconiah’s son; named as Zerubbabel’s father in Matthew’s genealogy.','1 Chronicles 3:17;Matthew 1:12', ['Salathiel']);
  person('zerubbabel','Zerubbabel','male','Exile','A leader after the exile. Chronicles names Pedaiah as his father; Matthew names Shealtiel.','1 Chronicles 3:19;Matthew 1:12;Haggai 1:1');
  parent('jeconiah','pedaiah','1 Chronicles 3:17-18'); parent('jeconiah','shealtiel','1 Chronicles 3:17');
  parent('pedaiah','zerubbabel','1 Chronicles 3:19','Chronicles’ genealogy. Matthew 1:12 instead names Shealtiel; the differing accounts are not harmonized here.');
  const laterLine = [['abiud','Abiud'],['eliakim','Eliakim'],['azor','Azor'],['zadok','Zadok'],['achim','Achim'],['eliud','Eliud'],['eleazar-nt','Eleazar'],['matthan','Matthan'],['jacob-nt','Jacob'],['joseph-nt','Joseph']];
  laterLine.forEach(([id,name],i) => { person(id,name,'male',i<9?'Exile':'New Testament',id==='joseph-nt'?'Mary’s husband; Jesus’ legal father, not his biological father in Matthew’s birth account.':'Named in Matthew’s genealogy from Zerubbabel to Joseph.','Matthew 1:13-16'+(id==='joseph-nt'?';Matthew 1:18-25':''),[], 'NT'); parent(i?laterLine[i-1][0]:'zerubbabel',id,'Matthew 1:13-16','Relationship as presented in Matthew’s genealogy; Luke 3 records a different genealogy.'); });

  person('mary','Mary','female','New Testament','Mother of Jesus and wife of Joseph; received Gabriel’s announcement of Jesus’ birth.','Luke 1:26-35;Matthew 1:18-25',[],'NT');
  person('jesus','Jesus','male','New Testament','Central figure of the New Testament, identified as the Christ; born to Mary.','Matthew 1:16-25;Luke 1:31-35',['Jesus Christ','Christ','Messiah'],'NT');
  spouse('joseph-nt','mary','Matthew 1:24'); parent('mary','jesus','Matthew 1:16-25','Mary is identified as Jesus’ birth mother.');
  parent('joseph-nt','jesus','Matthew 1:18-25','Legal parent, not biological father: Matthew attributes Mary’s pregnancy to the Holy Spirit.');
  person('zechariah','Zechariah','male','New Testament','A priest, husband of Elizabeth, and father of John the Baptist.','Luke 1:5-13',['Zacharias'],'NT');
  person('elizabeth','Elizabeth','female','New Testament','Zechariah’s wife and John the Baptist’s mother; a relative of Mary.','Luke 1:5-13;Luke 1:36',['Elisabeth'],'NT');
  person('john-baptist','John the Baptist','male','New Testament','Son of Zechariah and Elizabeth, sent to prepare people for the Lord.','Luke 1:13-17',[],'NT');
  spouse('zechariah','elizabeth','Luke 1:5'); family('zechariah','elizabeth','john-baptist','Luke 1:13');
  person('jonah-peter','Jonah','male','New Testament','Peter’s father, named Jona in the KJV; some translations use John.','John 1:42',['Jona','John father of Peter'],'NT');
  person('peter','Peter','male','New Testament','A fisherman called by Jesus; brother of Andrew and also known as Simon and Cephas.','Matthew 4:18-20;John 1:40-42',['Simon Peter','Simon','Cephas'],'NT');
  person('andrew','Andrew','male','New Testament','Peter’s brother, a fisherman and follower of Jesus.','Matthew 4:18-20;John 1:40-42',[],'NT');
  parent('jonah-peter','peter','John 1:42');
  person('zebedee','Zebedee','male','New Testament','Father of the fishermen James and John.','Matthew 4:21-22',[],'NT');
  person('james','James','male','New Testament','A son of Zebedee and brother of John, called by Jesus.','Matthew 4:21-22',['James son of Zebedee'],'NT');
  person('john','John','male','New Testament','A son of Zebedee and brother of James, called by Jesus.','Matthew 4:21-22',['John son of Zebedee'],'NT');
  ['james','john'].forEach(id=>parent('zebedee',id,'Matthew 4:21'));
  person('eunice','Eunice','female','New Testament','Timothy’s mother, remembered for her sincere faith.','2 Timothy 1:5',[],'NT');
  person('timothy','Timothy','male','New Testament','A disciple from Lystra who traveled with Paul; son of Eunice.','Acts 16:1-3;2 Timothy 1:5',['Timotheus'],'NT');
  parent('eunice','timothy','2 Timothy 1:5');

  return {
    people, relationships,
    meta: {
      title: 'BiblePath — a growing people index',
      coverage: 'Curated starting dataset across the Old and New Testaments. This is not yet every person or every relationship in the Bible.',
      complete: false,
      source: 'Biblical references link to the King James Version at Bible Gateway. Descriptions are original short paraphrases, not quotations.',
      canon: 'Initial selection from the 66-book Protestant canon; no claim of complete coverage of any canon.',
      methodology: 'Distinct IDs separate namesakes. Generations follow the cited passages, not a dated chronology. Unnamed parents are not invented. A line missing from the map does not imply that no such relationship exists.',
      genealogyNotes: 'Chronicles supplies the royal succession including generations omitted by Matthew. Zerubbabel is linked to Pedaiah as in 1 Chronicles 3:19, with Matthew’s Shealtiel attribution noted. Joseph’s link to Jesus is legal parenthood. Luke’s alternative genealogy is not yet mapped.',
      version: '0.1',
      reviewedAt: '2026-10-21'
    }
  };
})();
