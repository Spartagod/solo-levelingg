/* ==========================================================
   CONTENT/CULTURE.JS : paquet "Culture générale"
   ----------------------------------------------------------
   Une ligne = une carte :
   [ thème, question, bonne réponse, [3 mauvaises réponses], explication (facultatif) ]
   Les mauvaises réponses servent aux QCM et aux vrai/faux.
   Pour ajouter une carte : copie une ligne et change les textes.
   (Tu peux aussi ajouter des cartes directement dans le site.)
   ========================================================== */


const SEED_CULTURE = [

  /* ----- Histoire ----- */
  ["Histoire", "En quelle année a eu lieu la prise de la Bastille ?", "1789", ["1792", "1804", "1815"], "Le 14 juillet 1789, début symbolique de la Révolution française."],
  ["Histoire", "Qui est devenu empereur des Français en 1804 ?", "Napoléon Bonaparte", ["Louis XVIII", "Napoléon III", "Charlemagne"], "Il a été sacré à Notre-Dame de Paris le 2 décembre 1804."],
  ["Histoire", "En quelle année a débuté la Première Guerre mondiale ?", "1914", ["1905", "1918", "1939"]],
  ["Histoire", "En quelle année s'est terminée la Seconde Guerre mondiale en Europe ?", "1945", ["1941", "1944", "1948"], "Capitulation de l'Allemagne le 8 mai 1945."],
  ["Histoire", "En quelle année le mur de Berlin est-il tombé ?", "1989", ["1961", "1975", "1991"]],
  ["Histoire", "Qui fut le premier président de la Ve République ?", "Charles de Gaulle", ["Georges Pompidou", "François Mitterrand", "René Coty"], "Élu en décembre 1958, en fonction à partir de janvier 1959."],
  ["Histoire", "À quelle date a eu lieu le débarquement de Normandie ?", "6 juin 1944", ["8 mai 1945", "11 novembre 1918", "14 juillet 1789"]],
  ["Histoire", "En quelle année Napoléon a-t-il été définitivement vaincu à Waterloo ?", "1815", ["1805", "1812", "1830"]],
  ["Histoire", "Dans quel siècle a régné Louis XIV, le Roi-Soleil ?", "Le XVIIe siècle", ["Le XVIe siècle", "Le XVIIIe siècle", "Le XIXe siècle"], "Il a régné de 1643 à 1715."],
  ["Histoire", "Dans quelle ville Jeanne d'Arc a-t-elle été brûlée en 1431 ?", "Rouen", ["Orléans", "Reims", "Paris"]],
  ["Histoire", "Quel traité a officiellement mis fin à la Première Guerre mondiale avec l'Allemagne ?", "Le traité de Versailles", ["Le traité de Rome", "Le traité de Vienne", "Le traité de Paris"], "Signé en 1919."],
  ["Histoire", "En quelle année Christophe Colomb atteint-il l'Amérique ?", "1492", ["1453", "1515", "1648"]],
  ["Histoire", "En quelle année a été signé le traité de Maastricht, qui a créé l'Union européenne ?", "1992", ["1957", "1985", "2002"]],
  ["Histoire", "Quel peuple de l'Antiquité a construit les pyramides de Gizeh ?", "Les Égyptiens", ["Les Romains", "Les Grecs", "Les Mayas"]],
  ["Histoire", "Quelle date marque traditionnellement la chute de l'Empire romain d'Occident ?", "476", ["395", "800", "1066"]],

  /* ----- Géographie ----- */
  ["Géographie", "Quelle est la capitale de l'Australie ?", "Canberra", ["Sydney", "Melbourne", "Perth"], "Sydney est la plus grande ville, mais pas la capitale."],
  ["Géographie", "Quel est le plus long fleuve de France ?", "La Loire", ["La Seine", "Le Rhône", "La Garonne"], "Environ 1 000 km."],
  ["Géographie", "Quel est le plus haut sommet des Alpes ?", "Le Mont Blanc", ["Le Cervin", "Le Mont Rose", "Le Mont Viso"], "Environ 4 805 m."],
  ["Géographie", "Quel est le pays le plus peuplé d'Afrique ?", "Le Nigeria", ["L'Éthiopie", "L'Égypte", "La RD Congo"]],
  ["Géographie", "Quelle est la capitale du Canada ?", "Ottawa", ["Toronto", "Montréal", "Vancouver"]],
  ["Géographie", "Quel est le plus grand océan du monde ?", "L'océan Pacifique", ["L'océan Atlantique", "L'océan Indien", "L'océan Arctique"]],
  ["Géographie", "Quel est le plus vaste désert chaud du monde ?", "Le Sahara", ["Le Gobi", "Le Kalahari", "Le désert d'Arabie"]],
  ["Géographie", "Quel est le pays le plus étendu du monde ?", "La Russie", ["Le Canada", "La Chine", "Les États-Unis"]],
  ["Géographie", "Quelle mer borde la côte sud de la France ?", "La Méditerranée", ["La mer du Nord", "La mer Baltique", "La mer Noire"]],
  ["Géographie", "Quelle est la capitale du Brésil ?", "Brasília", ["Rio de Janeiro", "São Paulo", "Salvador"]],
  ["Géographie", "Quel fleuve traverse Paris ?", "La Seine", ["La Loire", "La Marne", "Le Rhin"]],
  ["Géographie", "Combien la France métropolitaine compte-t-elle de régions depuis 2016 ?", "13", ["12", "18", "22"]],
  ["Géographie", "Quel est le plus haut sommet du monde ?", "L'Everest", ["Le K2", "Le Kilimandjaro", "L'Aconcagua"], "Environ 8 849 m, dans l'Himalaya."],
  ["Géographie", "Quelle est la capitale de la Turquie ?", "Ankara", ["Istanbul", "Izmir", "Bursa"]],
  ["Géographie", "Dans quel pays se trouve le site de Machu Picchu ?", "Le Pérou", ["Le Mexique", "La Bolivie", "Le Chili"]],

  /* ----- Sciences ----- */
  ["Sciences", "Quel est le symbole chimique de l'or ?", "Au", ["Ag", "Or", "Fe"], "Du latin aurum."],
  ["Sciences", "Quelle est la planète la plus proche du Soleil ?", "Mercure", ["Vénus", "Mars", "Jupiter"]],
  ["Sciences", "Quelle est la vitesse de la lumière dans le vide ?", "Environ 300 000 km/s", ["Environ 3 000 km/s", "Environ 30 000 km/s", "Environ 3 millions de km/s"]],
  ["Sciences", "Quelle est la formule chimique de l'eau ?", "H₂O", ["CO₂", "O₂", "NaCl"]],
  ["Sciences", "Quel est l'os le plus long du corps humain ?", "Le fémur", ["Le tibia", "L'humérus", "Le radius"]],
  ["Sciences", "Quel gaz est le plus abondant dans l'atmosphère terrestre ?", "L'azote", ["L'oxygène", "Le dioxyde de carbone", "L'argon"], "Environ 78 % de l'air."],
  ["Sciences", "Qui a formulé la théorie de la relativité ?", "Albert Einstein", ["Isaac Newton", "Niels Bohr", "Stephen Hawking"]],
  ["Sciences", "Combien l'être humain a-t-il de chromosomes ?", "46", ["23", "44", "48"], "23 paires."],
  ["Sciences", "Quelle est l'unité de mesure de la force dans le Système international ?", "Le newton", ["Le joule", "Le watt", "Le pascal"]],
  ["Sciences", "Quel est le plus grand organe du corps humain ?", "La peau", ["Le foie", "Les poumons", "L'intestin"]],
  ["Sciences", "Quelle particule de l'atome porte une charge négative ?", "L'électron", ["Le proton", "Le neutron", "Le noyau"]],
  ["Sciences", "Quelle planète est surnommée la « planète rouge » ?", "Mars", ["Vénus", "Saturne", "Mercure"]],
  ["Sciences", "À quelle température l'eau bout-elle au niveau de la mer ?", "100 °C", ["90 °C", "110 °C", "212 °C"]],
  ["Sciences", "Qui est à l'origine de la théorie de l'évolution par sélection naturelle ?", "Charles Darwin", ["Gregor Mendel", "Louis Pasteur", "Jean-Baptiste Lamarck"]],
  ["Sciences", "Quel est le plus petit nombre premier ?", "2", ["0", "1", "3"], "C'est aussi le seul nombre premier pair."],
  ["Sciences", "Dans un triangle, le théorème de Pythagore s'applique à quel type de triangle ?", "Un triangle rectangle", ["Un triangle isocèle", "Un triangle équilatéral", "Tous les triangles"], "a² + b² = c², avec c l'hypoténuse."],
  ["Sciences", "Combien vaut 2 à la puissance 10 ?", "1024", ["1000", "512", "2048"], "Utile en informatique : 1 Kio = 1024 octets."],

  /* ----- Littérature et arts ----- */
  ["Arts", "Qui a écrit « Les Misérables » ?", "Victor Hugo", ["Émile Zola", "Honoré de Balzac", "Alexandre Dumas"]],
  ["Arts", "Qui a peint la Joconde ?", "Léonard de Vinci", ["Michel-Ange", "Raphaël", "Botticelli"]],
  ["Arts", "Qui a écrit « Le Petit Prince » ?", "Antoine de Saint-Exupéry", ["Jules Verne", "Marcel Pagnol", "Albert Camus"]],
  ["Arts", "Dans quel musée est exposée la Joconde ?", "Le Louvre", ["Le musée d'Orsay", "Le Prado", "Le Rijksmuseum"]],
  ["Arts", "Qui a composé la 9e symphonie, avec l'« Ode à la joie » ?", "Beethoven", ["Mozart", "Bach", "Chopin"]],
  ["Arts", "Qui a écrit le roman « 1984 » ?", "George Orwell", ["Aldous Huxley", "Ray Bradbury", "Isaac Asimov"]],
  ["Arts", "Qui a peint « La Nuit étoilée » ?", "Vincent van Gogh", ["Claude Monet", "Pablo Picasso", "Paul Cézanne"]],
  ["Arts", "Qui a écrit « Roméo et Juliette » ?", "William Shakespeare", ["Molière", "Christopher Marlowe", "Charles Dickens"]],
  ["Arts", "Qui a écrit « L'Étranger » ?", "Albert Camus", ["Jean-Paul Sartre", "Marcel Proust", "André Gide"]],
  ["Arts", "À quelle occasion la tour Eiffel a-t-elle été construite ?", "L'Exposition universelle de 1889", ["Les Jeux olympiques de 1900", "Le centenaire de Napoléon", "Le Second Empire"]],
  ["Arts", "Qui a écrit « Les Fleurs du mal » ?", "Charles Baudelaire", ["Arthur Rimbaud", "Paul Verlaine", "Alfred de Musset"]],
  ["Arts", "À quel mouvement artistique est associé Claude Monet ?", "L'impressionnisme", ["Le cubisme", "Le surréalisme", "Le romantisme"]],

  /* ----- France et institutions ----- */
  ["France", "Quelle est la devise de la République française ?", "Liberté, Égalité, Fraternité", ["Union, Travail, Progrès", "Dieu et mon droit", "Unité, Justice, Paix"]],
  ["France", "Combien d'étoiles compte le drapeau de l'Union européenne ?", "12", ["10", "15", "27"], "Le nombre ne change pas avec les adhésions."],
  ["France", "Quelle est la durée du mandat présidentiel en France depuis 2002 ?", "5 ans", ["4 ans", "6 ans", "7 ans"]],
  ["France", "Quelles sont les couleurs du drapeau français ?", "Bleu, blanc, rouge", ["Rouge, blanc, vert", "Bleu, jaune, rouge", "Blanc, rouge, noir"]],
  ["France", "Comment s'appelle la chambre haute du Parlement français ?", "Le Sénat", ["L'Assemblée nationale", "Le Conseil d'État", "Le Conseil constitutionnel"]],
  ["France", "Que célèbre la fête nationale du 14 juillet ?", "La prise de la Bastille et la fête de la Fédération", ["La fin de la Seconde Guerre mondiale", "La proclamation de la République", "Le sacre de Napoléon"]],
  ["France", "Combien la France compte-t-elle de départements, outre-mer compris ?", "101", ["96", "100", "105"], "96 en métropole et 5 outre-mer."],

  /* ----- Informatique ----- */
  ["Informatique", "Que signifie HTTP ?", "HyperText Transfer Protocol", ["High Transfer Text Protocol", "Hyper Terminal Transport Program", "Host Transfer Technical Protocol"]],
  ["Informatique", "Qui a créé le noyau Linux ?", "Linus Torvalds", ["Richard Stallman", "Dennis Ritchie", "Ken Thompson"], "En 1991."],
  ["Informatique", "Que signifie RAM ?", "Random Access Memory", ["Read Access Memory", "Rapid Allocation Module", "Remote Access Machine"], "La mémoire vive."],
  ["Informatique", "Combien de bits y a-t-il dans un octet ?", "8", ["4", "16", "32"]],
  ["Informatique", "Quel est le port par défaut du protocole HTTPS ?", "443", ["80", "22", "8080"]],
  ["Informatique", "Quel est le port par défaut du protocole SSH ?", "22", ["21", "23", "443"]],
  ["Informatique", "Que signifie DNS ?", "Domain Name System", ["Dynamic Network Service", "Data Name Server", "Domain Network Security"], "Il traduit les noms de domaine en adresses IP."],
  ["Informatique", "Qui a inventé le World Wide Web ?", "Tim Berners-Lee", ["Vint Cerf", "Bill Gates", "Steve Jobs"]],
  ["Informatique", "Que signifie SQL ?", "Structured Query Language", ["Simple Question Language", "Standard Query Logic", "Sequential Query Language"]],
  ["Informatique", "Quel langage décrit la structure d'une page web ?", "HTML", ["CSS", "SQL", "Python"]],

  /* ----- Langue française ----- */
  ["Langue", "Quel est le pluriel de « un cheval » ?", "Des chevaux", ["Des chevals", "Des chevaus", "Des chevales"]],
  ["Langue", "Quel est le participe passé du verbe « résoudre » ?", "Résolu", ["Résout", "Résolvé", "Résoulu"]],
  ["Langue", "Que signifie le mot « ubiquité » ?", "La capacité d'être présent partout en même temps", ["Le fait d'être unique", "Une grande rapidité", "Un don de prédiction"]],
  ["Langue", "Quel est un synonyme d'« éphémère » ?", "Passager", ["Durable", "Ancien", "Solide"]],
  ["Langue", "Que signifie l'adjectif « ostensible » ?", "Que l'on montre volontairement, bien visible", ["Que l'on cache", "Qui est très ancien", "Qui est difficile à comprendre"]]
];
