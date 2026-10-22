'use strict';
// Reviewed editorial copy. Proper names without a conventional translation retain
// their source transliteration. IDs and scripture provenance are never translated.
function table(text){return Object.fromEntries(text.trim().split('\n').map(line=>{const [key,nl,fr]=line.split('\t');if(!key||!nl||!fr)throw new Error(`Incomplete locale row: ${line}`);return [key,{nl,fr}];}));}
const names=table(`Aaron	Aäron	Aaron
Abigail	Abigaïl	Abigaïl
Abijah	Abia	Abija
Abihu	Abihu	Abihu
Adonijah	Adonia	Adonija
Ahaz	Achaz	Achaz
Ahaziah	Achazja	Achazia
Ahinoam	Achinoam	Achinoam
Amaziah	Amasja	Amatsia
Andrew	Andreas	André
Arphaxad	Arpachsad	Arpacschad
Asenath	Asnat	Asnath
Asher	Aser	Aser
Bathsheba	Batseba	Bath-Schéba
Benjamin	Benjamin	Benjamin
Bethuel	Betuël	Bethuel
Bilhah	Bilha	Bilha
Boaz	Boaz	Boaz
Cain	Kaïn	Caïn
Chilion	Kiljon	Kiljon
Daniel	Daniël	Daniel
Dinah	Dina	Dina
Eber	Eber	Héber
Eleazar	Eleazar	Éléazar
Eliakim	Eljakim	Éliakim
Eliezer	Eliëzer	Éliézer
Elimelech	Elimelech	Élimélec
Elisheba	Eliseba	Élischéba
Eliud	Eliud	Éliud
Elizabeth	Elisabet	Élisabeth
Enoch	Henoch	Hénoc
Enosh	Enos	Énosch
Ephraim	Efraïm	Éphraïm
Esau	Esau	Ésaü
Eunice	Eunike	Eunice
Eve	Eva	Ève
Gershom	Gersom	Guerschom
Gershon	Gerson	Guerschon
Haggith	Chaggit	Haggith
Ham	Cham	Cham
Hezekiah	Hizkia	Ézéchias
Hezron	Chesron	Hetsron
Isaac	Isaak	Isaac
Ishbak	Jisbak	Jischbak
Ishmael	Ismaël	Ismaël
Issachar	Issachar	Issacar
Ithamar	Itamar	Ithamar
James	Jakobus	Jacques
Japheth	Jafet	Japhet
Jared	Jered	Jéred
Jeconiah	Jechonja	Jéconia
Jehoiachin	Jojachin	Jojakin
Jehoiakim	Jojakim	Jojakim
Jehoram	Joram	Joram
Jehoshaphat	Josafat	Josaphat
Jesse	Isaï	Isaï
Jesus	Jezus	Jésus
Jethro	Jetro	Jéthro
Joash	Joas	Joas
Jochebed	Jochebed	Jokébed
John	Johannes	Jean
John the Baptist	Johannes de Doper	Jean-Baptiste
Jokshan	Joksan	Jokschan
Jonah	Jona	Jonas
Joseph	Jozef	Joseph
Josiah	Josia	Josias
Jotham	Jotam	Jotham
Judah	Juda	Juda
Kenan	Kenan	Kénan
Keturah	Ketura	Ketura
Kohath	Kehat	Kehath
Leah	Lea	Léa
Levi	Levi	Lévi
Maacah	Maächa	Maaca
Mahalalel	Mahalalel	Mahalaleel
Mahlon	Machlon	Machlon
Manasseh	Manasse	Manassé
Mary	Maria	Marie
Mary Magdalene	Maria Magdalena	Marie de Magdala
Medan	Medan	Medan
Merari	Merari	Merari
Methuselah	Metuselach	Metuschélah
Midian	Midjan	Madian
Milcah	Milka	Milca
Moses	Mozes	Moïse
Nahshon	Nachson	Nachschon
Naomi	Noömi	Naomi
Naphtali	Naftali	Nephthali
Nathan	Natan	Nathan
Noah	Noach	Noé
Pedaiah	Pedaja	Pedaja
Peleg	Peleg	Péleg
Perez	Peres	Pérets
Peter	Petrus	Pierre
Phinehas	Pinechas	Phinées
Potiphera	Potifera	Poti-Phéra
Potiphar	Potifar	Potiphar
Rachel	Rachel	Rachel
Rahab	Rachab	Rahab
Rebekah	Rebekka	Rébecca
Rehoboam	Rechabeam	Roboam
Reu	Reü	Rehu
Reuben	Ruben	Ruben
Ruth	Ruth	Ruth
Sarah	Sara	Sara
Sarai	Sarai	Saraï
Serug	Serug	Serug
Shealtiel	Sealtiël	Schealthiel
Shelah	Sela	Schélach
Shem	Sem	Sem
Shuah	Suach	Schuach
Simeon	Simeon	Siméon
Solomon	Salomo	Salomon
Terah	Terach	Térach
Timothy	Timoteüs	Timothée
Uzziah	Uzzia	Ozias
Zadok	Sadok	Tsadok
Zebedee	Zebedeüs	Zébédée
Zebulun	Zebulon	Zabulon
Zechariah	Zacharias	Zacharie
Zerah	Zerach	Zérach
Zerubbabel	Zerubbabel	Zorobabel
Zilpah	Zilpa	Zilpa
Zipporah	Sippora	Séphora
Paul	Paulus	Paul
Saul	Saul	Saül
Joshua	Jozua	Josué
Caleb	Kaleb	Caleb
Deborah	Debora	Débora
Gideon	Gideon	Gédéon
Samson	Simson	Samson
Samuel	Samuël	Samuel
Eli	Eli	Éli
Elijah	Elia	Élie
Elisha	Elisa	Élisée
Isaiah	Jesaja	Ésaïe
Jeremiah	Jeremia	Jérémie
Ezekiel	Ezechiël	Ézéchiel
Hosea	Hosea	Osée
Joel	Joël	Joël
Obadiah	Obadja	Abdias
Micah	Micha	Michée
Nahum	Nahum	Nahum
Habakkuk	Habakuk	Habacuc
Zephaniah	Sefanja	Sophonie
Haggai	Haggai	Aggée
Malachi	Maleachi	Malachie
Ezra	Ezra	Esdras
Nehemiah	Nehemia	Néhémie
Esther	Ester	Esther
Mordecai	Mordechai	Mardochée
Job	Job	Job
Matthew	Matteüs	Matthieu
Mark	Marcus	Marc
Luke	Lucas	Luc
Philip	Filippus	Philippe
Bartholomew	Bartolomeüs	Barthélemy
Thomas	Tomas	Thomas
Thaddaeus	Taddeüs	Thaddée
Matthias	Mattias	Matthias
Nathanael	Natanaël	Nathanaël
Nicodemus	Nikodemus	Nicodème
Lazarus	Lazarus	Lazare
Martha	Marta	Marthe
Stephen	Stefanus	Étienne
Barnabas	Barnabas	Barnabas
Silas	Silas	Silas
Titus	Titus	Tite
Philemon	Filemon	Philémon
Onesimus	Onesimus	Onésime
Apollos	Apollos	Apollos
Aquila	Aquila	Aquilas
Priscilla	Priscilla	Priscille
Lydia	Lydia	Lydie
Phoebe	Febe	Phœbé
Dorcas	Dorkas	Dorcas
Tabitha	Tabita	Tabitha
Cornelius	Cornelius	Corneille
Zacchaeus	Zacheüs	Zachée
Bartimaeus	Bartimeüs	Bartimée
Herod	Herodes	Hérode
Herodias	Herodias	Hérodias
Antipas	Antipas	Antipas
Archelaus	Archelaüs	Archélaüs
Agrippa	Agrippa	Agrippa
Pilate	Pilatus	Pilate
Pontius	Pontius	Ponce
Caiaphas	Kajafas	Caïphe
Annas	Annas	Anne
Ananias	Ananias	Ananias
Sapphira	Saffira	Saphira
Gamaliel	Gamaliël	Gamaliel
Felix	Felix	Félix
Festus	Festus	Festus
Claudius	Claudius	Claude
Augustus	Augustus	Auguste
Caesar	Caesar	César
Tiberius	Tiberius	Tibère
Sergius Paulus	Sergius Paulus	Sergius Paulus
Queen of Sheba	Koningin van Seba	Reine de Saba
Jonathan	Jonatan	Jonathan
Joab	Joab	Joab
Abner	Abner	Abner
Abiathar	Abjatar	Abiathar
Ahimelech	Achimelech	Achimélec
Ahithophel	Achitofel	Achitophel
Mephibosheth	Mefiboset	Mephiboscheth
Ish bosheth	Isboset	Isch-Boscheth
Uriah	Uria	Urie
Huldah	Chulda	Hulda
Jael	Jaël	Jaël
Barak	Barak	Barak
Jephthah	Jefta	Jephthé
Othniel	Otniël	Othniel
Ehud	Ehud	Éhud
Delilah	Delila	Delila
Ruth	Ruth	Ruth
Nebuchadnezzar	Nebukadnessar	Nebucadnetsar
Belshazzar	Belsassar	Belschatsar
Cyrus	Cyrus	Cyrus
Darius	Darius	Darius
Ahasuerus	Ahasveros	Assuérus
Artaxerxes	Artaxerxes	Artaxerxès
Shadrach	Sadrach	Schadrac
Meshach	Mesach	Méschac
Abednego	Abednego	Abed-Nego
Melchizedek	Melchisedek	Melchisédek
Jezebel	Izebel	Jézabel
Ahab	Achab	Achab
Jeroboam	Jerobeam	Jéroboam
Athaliah	Atalja	Athalie
Sennacherib	Sanherib	Sanchérib
Sargon	Sargon	Sargon
Tiglath pileser	Tiglatpileser	Tiglath-Piléser
Tubal cain	Tubal-Kaïn	Tubal-Caïn
Jerusalem	Jeruzalem	Jérusalem
Bethlehem	Betlehem	Bethléem
Nazareth	Nazaret	Nazareth
Capernaum	Kafarnaüm	Capernaüm
Bethsaida	Betsaïda	Bethsaïda
Jericho	Jericho	Jéricho
Samaria	Samaria	Samarie
Babylon	Babel	Babylone
Babel	Babel	Babel
Nineveh	Nineve	Ninive
Damascus	Damascus	Damas
Antioch	Antiochië	Antioche
Caesarea	Caesarea	Césarée
Caesarea Philippi	Caesarea Filippi	Césarée de Philippe
Ephesus	Efeze	Éphèse
Corinth	Korinte	Corinthe
Athens	Athene	Athènes
Philippi	Filippi	Philippes
Thessalonica	Tessalonica	Thessalonique
Colossae	Kolosse	Colosses
Laodicea	Laodicea	Laodicée
Pergamum	Pergamum	Pergame
Thyatira	Tyatira	Thyatire
Sardis	Sardes	Sardes
Philadelphia	Filadelfia	Philadelphie
Smyrna	Smyrna	Smyrne
Tarsus	Tarsus	Tarse
Joppa	Joppe	Joppé
Bethany	Betanië	Béthanie
Emmaus	Emmaüs	Emmaüs
Nain	Naïn	Naïn
Sychar	Sichar	Sychar
Siloam	Siloam	Siloé
Gaza	Gaza	Gaza
Tyre	Tyrus	Tyr
Sidon	Sidon	Sidon
Beersheba	Berseba	Beer-Schéba
Hebron	Hebron	Hébron
Shechem	Sichem	Sichem
Bethel	Betel	Béthel
Ai	Ai	Aï
Shiloh	Silo	Silo
Gibeon	Gibeon	Gabaon
Gibeah	Gibea	Guibea
Ashdod	Asdod	Asdod
Ashkelon	Askelon	Askalon
Ekron	Ekron	Ékron
Lachish	Lachis	Lakis
Megiddo	Megiddo	Meguiddo
Jezreel	Jizreël	Jizreel
Hazor	Hasor	Hatsor
Dan	Dan	Dan
Haran	Haran	Haran
Ur	Ur	Ur
Susa	Susan	Suse
Shushan	Susan	Suse
Memphis	Memfis	Memphis
Alexandria	Alexandrië	Alexandrie
Cyrene	Cyrene	Cyrène
Iconium	Ikonium	Icone
Lystra	Lystra	Lystre
Derbe	Derbe	Derbe
Troas	Troas	Troas
Miletus	Milete	Milet
Patara	Patara	Patara
Ptolemais	Ptolemaïs	Ptolémaïs
Salamis	Salamis	Salamine
Paphos	Pafos	Paphos
Neapolis	Neapolis	Néapolis
Amphipolis	Amfipolis	Amphipolis
Apollonia	Apollonia	Apollonie
Berea	Berea	Bérée
Cenchreae	Kenchreeën	Cenchrées
Zion	Sion	Sion
Salem	Salem	Salem
Jebus	Jebus	Jébus
Ephrath	Efrat	Éphrata
Hephzibah	Chefsiba	Hephziba
Beulah	Beüla	Beulah
Nahalol	Nahalal	Nahalal
Moresheth	Moreset	Moréscheth
Moresheth-gath	Moreset-Gat	Moréscheth-Gath
Ramah	Rama	Rama
Kiriath jearim	Kirjat-Jearim	Kirjath-Jearim
Gath	Gat	Gath
Nob	Nob	Nob
Rameses	Raämses	Ramsès
Raamses	Raämses	Ramsès`);
// Spelling variants help search and older public-domain Bible translations.
const extraAliases={nl:{Aaron:['Aaron'],Isaac:['Izaäk','Izaak'],Noah:['Noë','Noé'],Jesus:['Jesus'],Peter:['Petrus'],Mary:['Maria'],Joseph:['Jozef','Jozef'],Rebekah:['Rebekka','Rebecca'],Methuselah:['Methusalem'],Hezekiah:['Hiskia','Hizkia'],Nahshon:['Nahesson','Nahasson'],Jared:['Jared'],Jerusalem:['Jeruzalem'],Bethlehem:['Bethlehem'],Capernaum:['Kapernaüm'],Corinth:['Korinthe'],Thessalonica:['Thessalonika'],Matthew:['Mattheüs','Mattheus'],Luke:['Lukas'],James:['Jacobus'],Japheth:['Jafeth'],Ezekiel:['Ezechiël','Ezechiel'],Zechariah:['Zacharia'],Zebulun:['Zebulon'],Phinehas:['Pinehas','Pinehas'],Shelah:['Selach'],Kohath:['Kahath'],Potiphera:['Potiphera']},fr:{Noah:['Noé'],Jesus:['Jésus'],Peter:['Pierre','Céphas'],Mary:['Marie'],James:['Jacques'],John:['Jean'],Moses:['Moïse'],Zechariah:['Zacharie'],Nahshon:['Naasson'],Shelah:['Sala','Schéla'],Methuselah:['Mathusalem'],Kenan:['Kaïnam','Caïnan'],Jesse:['Jessé'],Jeconiah:['Jéchonias'],Zadok:['Sadok'],Arphaxad:['Arphaxad'],Mary_Magdalene:['Marie-Madeleine']}};
const curated=table(`aaron	Broer van Mozes en echtgenoot van Eliseba; vader van vier bij naam genoemde zonen.	Frère de Moïse et époux d’Élischéba ; père de quatre fils nommés dans le texte.
abel	Herder wiens offer werd aanvaard; gedood door zijn broer Kaïn.	Berger dont l’offrande fut agréée ; tué par son frère Caïn.
abigail	Vrouw van David uit Karmel en moeder van Daniël.	Épouse de David, originaire de Carmel, et mère de Daniel.
abihu	Zoon van Aäron en Eliseba.	Fils d’Aaron et d’Élischéba.
abijah	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
abiud	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
abraham	Aartsvader die werd geroepen zijn land te verlaten; vader van Isaak en Ismaël en echtgenoot van Sara.	Patriarche appelé à quitter son pays ; père d’Isaac et d’Ismaël, et époux de Sara.
absalom	Zoon van David en Maächa.	Fils de David et de Maaca.
achim	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
adam	De eerste man in Genesis; echtgenoot van Eva en vader van Kaïn, Abel en Seth.	Le premier homme dans la Genèse ; époux d’Ève et père de Caïn, Abel et Seth.
adonijah	Zoon van David en Chaggit.	Fils de David et de Haggith.
ahaz	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
ahaziah	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
ahinoam	Vrouw uit Jizreël en moeder van Davids eerstgeboren zoon Amnon.	Femme de Jizreel et mère d’Amnon, le fils aîné de David.
amaziah	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
amminadab	Vader van Nachson en Eliseba.	Père de Nachschon et d’Élischéba.
amnon	Davids eerstgeboren zoon, bij Achinoam.	Fils aîné de David, né d’Achinoam.
amon	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
amram	Zoon van Kehat; echtgenoot van Jochebed en vader van Mozes, Aäron en Miriam.	Fils de Kehath ; époux de Jokébed et père de Moïse, Aaron et Miriam.
andrew	Broer van Petrus, visser en volgeling van Jezus.	Frère de Pierre, pêcheur et disciple de Jésus.
arphaxad	Genoemd in de familielijn van Sem tot Abraham.	Nommé dans la lignée de Sem à Abraham.
asa	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
asenath	Dochter van Potifera, vrouw van Jozef en moeder van Manasse en Efraïm.	Fille de Poti-Phéra, épouse de Joseph et mère de Manassé et d’Éphraïm.
asher	Zilpa’s tweede zoon bij Jakob.	Deuxième fils de Jacob et de Zilpa.
azor	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
bathsheba	Vrouw van David en moeder van Salomo.	Épouse de David et mère de Salomon.
benjamin	Jakobs jongste zoon; Rachel stierf bij zijn geboorte.	Plus jeune fils de Jacob ; Rachel mourut en lui donnant naissance.
bethuel	Zoon van Nahor en Milka; vader van Rebekka en Laban.	Fils de Nachor et de Milca ; père de Rébecca et de Laban.
bilhah	Dienares van Rachel, die haar aan Jakob tot vrouw gaf; moeder van Dan en Naftali.	Servante de Rachel, donnée à Jacob pour épouse ; mère de Dan et de Nephthali.
boaz	Echtgenoot van Ruth en vader van Obed.	Époux de Ruth et père d’Obed.
cain	Landbouwer en zoon van Adam en Eva, die zijn broer Abel doodde.	Cultivateur, fils d’Adam et d’Ève, qui tua son frère Abel.
chilion	Zoon van Elimelech en Noömi; hij stierf in Moab.	Fils d’Élimélec et de Naomi, mort en Moab.
dan	Zoon van Jakob en Bilha.	Fils de Jacob et de Bilha.
daniel-david	Zoon van David en Abigaïl; een andere persoon dan de profeet Daniël.	Fils de David et d’Abigaïl ; distinct du prophète Daniel.
david	Zoon van Isaï; koning van Israël en vader van Salomo.	Fils d’Isaï ; roi d’Israël et père de Salomon.
dinah	Bij naam genoemde dochter van Jakob en Lea.	Fille de Jacob et de Léa, nommée dans le texte.
eber	Genoemd in de familielijn van Sem tot Abraham.	Nommé dans la lignée de Sem à Abraham.
eleazar	Zoon van Aäron en Eliseba.	Fils d’Aaron et d’Élischéba.
eleazar-nt	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
eliakim	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
eliezer	De andere bij naam genoemde zoon van Mozes en Sippora.	L’autre fils de Moïse et de Séphora nommé dans le texte.
elimelech	Echtgenoot van Noömi; verhuisde met zijn gezin van Betlehem naar Moab.	Époux de Naomi ; il quitta Bethléem pour Moab avec sa famille.
elisheba	Vrouw van Aäron, dochter van Amminadab en zus van Nachson.	Épouse d’Aaron, fille d’Amminadab et sœur de Nachschon.
eliud	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
elizabeth	Vrouw van Zacharias en moeder van Johannes de Doper; een familielid van Maria.	Épouse de Zacharie et mère de Jean-Baptiste ; parente de Marie.
enoch	Zoon van Jered, bekend omdat hij met God wandelde.	Fils de Jéred, connu pour avoir marché avec Dieu.
enosh	Zoon van Seth en vader van Kenan.	Fils de Seth et père de Kénan.
ephraim	Tweede zoon van Jozef en Asnat.	Deuxième fils de Joseph et d’Asnath.
esau	De oudste van de tweelingzonen van Isaak en Rebekka; ook Edom genoemd.	L’aîné des jumeaux d’Isaac et de Rébecca, également appelé Édom.
eunice	Moeder van Timoteüs, bekend om haar oprechte geloof.	Mère de Timothée, connue pour sa foi sincère.
eve	Vrouw van Adam; moeder van Kaïn, Abel en Seth in het Genesisverhaal.	Épouse d’Adam ; mère de Caïn, Abel et Seth dans le récit de la Genèse.
gad	Zoon van Jakob en Zilpa.	Fils de Jacob et de Zilpa.
gershom	Zoon van Mozes en Sippora; een andere persoon dan Gerson, de zoon van Levi.	Fils de Moïse et de Séphora ; distinct de Guerschon, fils de Lévi.
gershon	Zoon van Levi, genoemd in het geslachtsregister van de Levieten.	Fils de Lévi, nommé dans la généalogie des Lévites.
hagar	Egyptische dienares van Sara en moeder van Ismaël; ontmoette Gods boodschapper in de woestijn.	Servante égyptienne de Sara et mère d’Ismaël ; elle rencontra le messager de Dieu dans le désert.
haggith	Moeder van Adonia, een zoon van David.	Mère d’Adonija, fils de David.
ham	Een van de drie bij naam genoemde zonen van Noach.	L’un des trois fils de Noé nommés dans le texte.
haran	Broer van Abraham en vader van Lot en Milka.	Frère d’Abraham et père de Lot et de Milca.
hezekiah	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
hezron	Zoon van Peres in de familielijn van David.	Fils de Pérets dans la lignée de David.
isaac	Zoon van Abraham en Sara; echtgenoot van Rebekka en vader van de tweeling Esau en Jakob.	Fils d’Abraham et de Sara ; époux de Rébecca et père des jumeaux Ésaü et Jacob.
ishbak	Zoon van Abraham en Ketura.	Fils d’Abraham et de Ketura.
ishmael	Zoon van Abraham en Hagar; vader van twaalf bij naam genoemde zonen.	Fils d’Abraham et d’Agar ; père de douze fils nommés dans le texte.
issachar	Lea’s vijfde zoon bij Jakob.	Cinquième fils de Jacob et de Léa.
ithamar	Zoon van Aäron en Eliseba.	Fils d’Aaron et d’Élischéba.
jacob	Zoon van Isaak en Rebekka, die de naam Israël kreeg; vader van de twaalf zonen die met de stammen van Israël worden verbonden.	Fils d’Isaac et de Rébecca, renommé Israël ; père des douze fils associés aux tribus d’Israël.
jacob-nt	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
james	Zoon van Zebedeüs en broer van Johannes; geroepen door Jezus.	Fils de Zébédée et frère de Jean, appelé par Jésus.
japheth	Een van de drie bij naam genoemde zonen van Noach.	L’un des trois fils de Noé nommés dans le texte.
jared	Vader van Henoch in de familielijn van Seth.	Père d’Hénoc dans la lignée de Seth.
jeconiah	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
jehoiakim	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
jehoram	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
jehoshaphat	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
jesse	Zoon van Obed en vader van David.	Fils d’Obed et père de David.
jesus	Centrale figuur van het Nieuwe Testament, aangeduid als de Christus; geboren uit Maria.	Figure centrale du Nouveau Testament, identifié comme le Christ ; né de Marie.
jethro	Priester van Midjan en schoonvader van Mozes; in Exodus ook Reüel genoemd.	Prêtre de Madian et beau-père de Moïse, également appelé Réuel dans l’Exode.
joash	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
jochebed	Dochter van Levi; moeder van Mozes, Aäron en Miriam.	Fille de Lévi ; mère de Moïse, Aaron et Miriam.
john	Zoon van Zebedeüs en broer van Jakobus; geroepen door Jezus.	Fils de Zébédée et frère de Jacques, appelé par Jésus.
john-baptist	Zoon van Zacharias en Elisabet, gezonden om mensen voor te bereiden op de Heer.	Fils de Zacharie et d’Élisabeth, envoyé préparer le peuple à la venue du Seigneur.
jokshan	Zoon van Abraham en Ketura.	Fils d’Abraham et de Ketura.
jonah-peter	Vader van Petrus; Jona genoemd in de King James Version. Sommige vertalingen gebruiken Johannes.	Père de Pierre, nommé Jona dans la King James Version ; certaines traductions emploient Jean.
joseph	Zoon van Jakob en Rachel, die machthebber in Egypte werd.	Fils de Jacob et de Rachel, devenu dirigeant en Égypte.
joseph-nt	Echtgenoot van Maria; de wettelijke vader van Jezus, niet zijn biologische vader in het geboorteverhaal van Matteüs.	Époux de Marie ; père légal de Jésus, et non son père biologique dans le récit de sa naissance chez Matthieu.
josiah	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
jotham	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
judah	Zoon van Jakob en Lea, in de voorouderlijn van David.	Fils de Jacob et de Léa, dans la lignée ancestrale de David.
kenan	Zoon van Enos en vader van Mahalalel.	Fils d’Énosch et père de Mahalaleel.
keturah	Vrouw van Abraham en moeder van zes bij naam genoemde zonen.	Épouse d’Abraham et mère de six fils nommés dans le texte.
kohath	Zoon van Levi, genoemd in het geslachtsregister van de Levieten.	Fils de Lévi, nommé dans la généalogie des Lévites.
laban	Broer van Rebekka en vader van Lea en Rachel.	Frère de Rébecca et père de Léa et de Rachel.
lamech	Vader van Noach; een andere persoon dan Lamech uit de familielijn van Kaïn.	Père de Noé, distinct de Lémec dans la lignée de Caïn.
leah	Oudste dochter van Laban, vrouw van Jakob en moeder van zes zonen en Dina.	Fille aînée de Laban, épouse de Jacob et mère de six fils et de Dina.
levi	Zoon van Jakob en Lea; voorouder van de Levieten.	Fils de Jacob et de Léa ; ancêtre des Lévites.
lot	Zoon van Haran en neef van Abraham; reisde met hem mee.	Fils de Haran et neveu d’Abraham, qu’il accompagna dans ses voyages.
maacah	Dochter van Talmai en moeder van Davids zoon Absalom.	Fille de Talmaï et mère d’Absalom, fils de David.
mahalalel	Zoon van Kenan en vader van Jered.	Fils de Kénan et père de Jéred.
mahlon	Zoon van Elimelech en Noömi; de eerste echtgenoot van Ruth.	Fils d’Élimélec et de Naomi ; premier époux de Ruth.
manasseh	Eerstgeboren zoon van Jozef en Asnat.	Fils aîné de Joseph et d’Asnath.
manasseh-king	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
mary	Moeder van Jezus en vrouw van Jozef; ontving Gabriëls aankondiging van Jezus’ geboorte.	Mère de Jésus et épouse de Joseph ; elle reçut de Gabriel l’annonce de la naissance de Jésus.
matthan	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
medan	Zoon van Abraham en Ketura.	Fils d’Abraham et de Ketura.
merari	Zoon van Levi, genoemd in het geslachtsregister van de Levieten.	Fils de Lévi, nommé dans la généalogie des Lévites.
methuselah	Zoon van Henoch en vader van Lamech.	Fils d’Hénoc et père de Lémec.
midian	Zoon van Abraham en Ketura.	Fils d’Abraham et de Ketura.
milcah	Dochter van Haran, vrouw van Nahor en moeder van Betuël.	Fille de Haran, épouse de Nachor et mère de Bethuel.
miriam	Dochter van Amram en Jochebed, en zus van Aäron en Mozes.	Fille d’Amram et de Jokébed, et sœur d’Aaron et de Moïse.
moses	Leidde Israël met Aäron uit Egypte; zoon van Amram en Jochebed.	Conduisit Israël hors d’Égypte avec Aaron ; fils d’Amram et de Jokébed.
nadab	Zoon van Aäron en Eliseba.	Fils d’Aaron et d’Élischéba.
nahor	Broer van Abraham en echtgenoot van Milka; grootvader van Rebekka.	Frère d’Abraham et époux de Milca ; grand-père de Rébecca.
nahor-elder	Genoemd in de familielijn van Sem tot Abraham.	Nommé dans la lignée de Sem à Abraham.
nahshon	Zoon van Amminadab en voorouder van David.	Fils d’Amminadab et ancêtre de David.
naomi	Vrouw van Elimelech en moeder van Machlon en Kiljon; schoonmoeder van Ruth.	Épouse d’Élimélec et mère de Machlon et de Kiljon ; belle-mère de Ruth.
naphtali	Bilha’s tweede zoon bij Jakob.	Deuxième fils de Jacob et de Bilha.
nathan	Zoon van David en Batseba; een andere persoon dan de profeet Natan.	Fils de David et de Bath-Schéba ; distinct du prophète Nathan.
noah	Vader van Sem, Cham en Jafet; bouwde de ark in het verhaal van de zondvloed.	Père de Sem, Cham et Japhet ; il construisit l’arche dans le récit du déluge.
obed	Zoon van Boaz en Ruth en grootvader van David.	Fils de Boaz et de Ruth, et grand-père de David.
pedaiah	Zoon van Jechonja; in Kronieken genoemd als de vader van Zerubbabel.	Fils de Jéconia ; nommé comme père de Zorobabel dans les Chroniques.
peleg	Genoemd in de familielijn van Sem tot Abraham.	Nommé dans la lignée de Sem à Abraham.
perez	Zoon van Juda en Tamar, in de voorouderlijn van David.	Fils de Juda et de Tamar, dans l’ascendance de David.
peter	Visser die door Jezus werd geroepen; broer van Andreas, ook bekend als Simon en Kefas.	Pêcheur appelé par Jésus ; frère d’André, également connu sous les noms de Simon et Céphas.
phinehas	Zoon van Eleazar en kleinzoon van Aäron.	Fils d’Éléazar et petit-fils d’Aaron.
potiphera	Priester van On en vader van Asnat; een andere persoon dan Potifar.	Prêtre d’On et père d’Asnath ; distinct de Potiphar.
rachel	Jongste dochter van Laban en vrouw van Jakob; moeder van Jozef en Benjamin.	Fille cadette de Laban et épouse de Jacob ; mère de Joseph et de Benjamin.
rahab	In het geslachtsregister van Matteüs genoemd als de moeder van Boaz.	Nommée comme mère de Boaz dans la généalogie de Matthieu.
ram	Zoon van Chesron en vader van Amminadab.	Fils de Hetsron et père d’Amminadab.
rebekah	Dochter van Betuël; vrouw van Isaak en moeder van Esau en Jakob.	Fille de Bethuel ; épouse d’Isaac et mère d’Ésaü et de Jacob.
rehoboam	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
reu	Genoemd in de familielijn van Sem tot Abraham.	Nommé dans la lignée de Sem à Abraham.
reuben	Eerste zoon van Jakob en Lea.	Premier fils de Jacob et de Léa.
ruth	Moabitische weduwe die bij Noömi bleef; trouwde later met Boaz en werd de moeder van Obed.	Veuve moabite restée auprès de Naomi ; elle épousa ensuite Boaz et devint la mère d’Obed.
salmon	In het geslachtsregister genoemd als de vader van Boaz.	Père de Boaz dans la généalogie.
sarah	Vrouw van Abraham; kreeg op hoge leeftijd haar zoon Isaak.	Épouse d’Abraham, qui donna naissance à Isaac dans sa vieillesse.
serug	Genoemd in de familielijn van Sem tot Abraham.	Nommé dans la lignée de Sem à Abraham.
seth	Zoon die na Abels dood uit Adam en Eva werd geboren.	Fils né d’Adam et d’Ève après la mort d’Abel.
shealtiel	Zoon van Jechonja; in het geslachtsregister van Matteüs genoemd als de vader van Zerubbabel.	Fils de Jéconia ; nommé comme père de Zorobabel dans la généalogie de Matthieu.
shelah	Genoemd in de familielijn van Sem tot Abraham.	Nommé dans la lignée de Sem à Abraham.
shem	Een van de drie bij naam genoemde zonen van Noach.	L’un des trois fils de Noé nommés dans le texte.
shuah	Zoon van Abraham en Ketura.	Fils d’Abraham et de Ketura.
simeon	Tweede zoon van Jakob en Lea.	Deuxième fils de Jacob et de Léa.
solomon	Zoon van David en Batseba; vader van Rechabeam.	Fils de David et de Bath-Schéba ; père de Roboam.
tamar	Moeder van Juda’s tweelingzonen Peres en Zerach; zij was eerder zijn schoondochter.	Mère des jumeaux de Juda, Pérets et Zérach ; elle avait auparavant été sa belle-fille.
tamar-david	Dochter van David; een andere persoon dan Tamar, de moeder van Peres.	Fille de David ; distincte de Tamar, mère de Pérets.
terah	Vader van Abraham, Nahor en Haran.	Père d’Abraham, de Nachor et de Haran.
timothy	Leerling uit Lystra die met Paulus meereisde; zoon van Eunike.	Disciple originaire de Lystre qui voyagea avec Paul ; fils d’Eunice.
uzziah	Genoemd in de koninklijke familielijn van Juda.	Nommé dans la lignée royale de Juda.
zadok	Genoemd in het geslachtsregister van Matteüs, tussen Zerubbabel en Jozef.	Nommé dans la généalogie de Matthieu, entre Zorobabel et Joseph.
zebedee	Vader van de vissers Jakobus en Johannes.	Père des pêcheurs Jacques et Jean.
zebulun	Lea’s zesde zoon bij Jakob.	Sixième fils de Jacob et de Léa.
zechariah	Priester, echtgenoot van Elisabet en vader van Johannes de Doper.	Prêtre, époux d’Élisabeth et père de Jean-Baptiste.
zerah	Tweelingbroer van Peres en zoon van Juda en Tamar.	Frère jumeau de Pérets, fils de Juda et de Tamar.
zerubbabel	Leider na de ballingschap. Kronieken noemt Pedaja als zijn vader; Matteüs noemt Sealtiël.	Dirigeant après l’exil. Les Chroniques nomment Pedaja comme son père ; Matthieu nomme Schealthiel.
zilpah	Dienares van Lea, die haar aan Jakob tot vrouw gaf; moeder van Gad en Aser.	Servante de Léa, donnée à Jacob pour épouse ; mère de Gad et d’Aser.
zimran	Zoon van Abraham en Ketura.	Fils d’Abraham et de Ketura.
zipporah	Vrouw van Mozes en moeder van Gersom en Eliëzer.	Épouse de Moïse et mère de Guerschom et d’Éliézer.`);
Object.assign(names,table(`Jacob	Jakob	Jacob
Lamech	Lamech	Lémec
Nahor	Nahor	Nachor
Hagar	Hagar	Agar
Israel	Israël	Israël
Edom	Edom	Édom
Cephas	Kefas	Céphas
Reuel	Reüel	Réuel
Talmai	Talmai	Talmaï
Gabriel	Gabriël	Gabriel
Michael	Michaël	Michel
Simon	Simon	Simon
Susanna	Susanna	Suzanne
Joanna	Johanna	Jeanne
Chloe	Chloë	Chloé
Euodia	Euodia	Évodie
Syntyche	Syntyche	Syntyche
Jairus	Jaïrus	Jaïrus
Judas	Judas	Judas
Judith	Judit	Judith
Rezia	Resja	Retsia
Salome	Salome	Salomé`));
extraAliases.fr['Mary Magdalene']=['Marie-Madeleine'];
Object.assign(names,table(`Carmel	Karmel	Carmel
Ariel	Ariël	Ariel
Cainan	Kainan	Kaïnam
Jesus Christ	Jezus Christus	Jésus-Christ
Christ	Christus	Christ
Messiah	Messias	Messie
Immanuel	Immanuël	Emmanuel
Simon Peter	Simon Petrus	Simon Pierre
James son of Zebedee	Jakobus, zoon van Zebedeüs	Jacques, fils de Zébédée
John son of Zebedee	Johannes, zoon van Zebedeüs	Jean, fils de Zébédée
John father of Peter	Johannes, vader van Petrus	Jean, père de Pierre
Bar Jonah	Barjona	Bar-Jona
Azariah	Azarja	Azaria
Jehoahaz	Joachaz	Joachaz
Arpachshad	Arpachsad	Arpacschad
Bathshua	Batsua	Bath-Schua
Ben oni	Ben-Oni	Ben-Oni
Chileab	Kileab	Kileab
Elisabeth	Elisabet	Élisabeth
Enos	Enos	Énos
Ephron	Efron	Éphron
Jeshurun	Jesurun	Jeschurun
Jechoniah	Jechonja	Jéconia
Coniah	Chonja	Conia
Jehoash	Joas	Joas
Jona	Jona	Jonas
Maachah	Maächa	Maaca
Mahalaleel	Mahalalel	Mahalaleel
Pharez	Peres	Pharès
Rebecca	Rebekka	Rébecca
Roboam	Rechabeam	Roboam
Salathiel	Sealtiël	Salathiel
Salah	Sela	Schélach
Jedidiah	Jedidja	Jedidja
Timotheus	Timoteüs	Timothée
Zacharias	Zacharias	Zacharie
Cleopas	Kleopas	Cléopas
Clopas	Klopas	Clopas
Elymas	Elymas	Élymas
Belteshazzar	Beltesassar	Beltschatsar
Elias	Elia	Élie
Hadassah	Hadassa	Hadassa
Jerubbaal	Jerubbaäl	Jerubbaal
Pharaoh	Farao	Pharaon
Hoshea	Hosea	Osée
Jeshua	Jesua	Josué
Lebbeus	Lebbeüs	Lebbée
Thaddeus	Taddeüs	Thaddée
Iscariot	Iskariot	Iscariote
Silvanus	Silvanus	Silvain
Zealot	Zeloot	Zélote
Didymus	Didymus	Didyme
Greek	Griek	Grec
Judahite	Judeeër	Judéen
Jews	Joden	Juifs`));
const editionAliases={nl:{Isaac:['Izak'],Tamar:['Thamar'],Perez:['Fares'],Zerah:['Zara'],Hezron:['Esrom'],Ram:['Aram'],Nahshon:['Naässon','Naasson'],Boaz:['Boöz'],Jesus:['Christus'],Cainan:['Caïnan','Kainan'],Shem:['Sem'],Rehoboam:['Roboam'],Hezekiah:['Ezechias'],Jeconiah:['Jechonias'],Shealtiel:['Salathiël'],Zerubbabel:['Zorobabel'],Jehoiakim:['Jojakim'],Asenath:['Asnath'],Japheth:['Jafeth'],Amminadab:['Amminadab'],Potiphera:['Potifera'],Jotham:['Joatham'],Ahaz:['Achaz'],Uzziah:['Ozias']},fr:{Tamar:['Thamar'],Perez:['Pharès'],Zerah:['Zara'],Hezron:['Esrom'],Ram:['Aram'],Nahshon:['Naasson'],Rahab:['Rachab'],Jesus:['Christ'],Cainan:['Kaïnam','Caïnan'],Shelah:['Sala'],Shealtiel:['Salathiel'],Jeconiah:['Jéchonias'],Zadok:['Sadok'],Jotham:['Joatham'],Uzziah:['Ozias'],Hezekiah:['Ézéchias'],Asenath:['Asnath']}};
for(const [lang,entries] of Object.entries(editionAliases))for(const [key,values] of Object.entries(entries))extraAliases[lang][key]=[...new Set([...(extraAliases[lang][key]||[]),...values])];
// Additional spellings verified directly against the bundled SV1888 / LSG1910 text.
for(const [lang,entries] of Object.entries({nl:{Amminadab:['Aminadab'],Jesse:['Jessai'],Solomon:['Salomon'],Hezekiah:['Ezekias'],Josiah:['Josias'],Eliud:['Elihud'],Boaz:['Booz'],Huldah:['Hulda']},fr:{Amminadab:['Aminadab'],Abijah:['Abia'],Miriam:['Myriam','Marie']}}))for(const [key,values] of Object.entries(entries))extraAliases[lang][key]=[...new Set([...(extraAliases[lang][key]||[]),...values])];
module.exports={table,names,extraAliases,curated};
