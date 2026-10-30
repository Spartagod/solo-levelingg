/* ==========================================================
   DATA.JS : réglages et données de départ
   ----------------------------------------------------------
   C'est ICI que tu changes les règles du jeu :
   - CONFIG    : XP, durée du quiz, son...
   - DECK_META : les paquets de révision (nom, stat gagnée)
   - DEFAULT_* : ce qui est préchargé au premier lancement
   Les cartes de révision sont dans le dossier js/content/.
   Une fois le site lancé, tout est aussi modifiable depuis
   l'interface (les données sont gardées dans le navigateur).
   ========================================================== */


const CONFIG = {
  storageKey: "solo-leveling-v2",

  // Ton son perso : mets ton fichier ici (assets/sounds/notification.mp3).
  // S'il n'existe pas, un son synthétique est utilisé à la place.
  soundFile: "assets/sounds/notification.mp3",

  // XP nécessaire pour passer du niveau N au suivant : base + step * (N - 1)
  levelBase: 100,
  levelStep: 50,

  // Fenêtre de la journée utilisée par l'optimiseur de planning
  dayStart: "08:00",
  dayEnd: "22:00",

  // Apprentissage
  partSize: 15,            // cartes par partie (une partie par sujet et par jour)
  reviewsPerPart: 5,       // dont révisions de cartes déjà vues (max)
  leechLapses: 4,          // une carte ratée autant de fois est signalée

  // XP perdue pour chaque quête obligatoire manquée
  penaltyXp: 10
};


/* ---------- Les 5 caractéristiques ---------- */
const STATS = {
  FOR: { label: "Force",        hint: "Sport" },
  INT: { label: "Intelligence", hint: "Cybersécurité, CTF" },
  AGI: { label: "Agilité",      hint: "Code, Python, projets" },
  PER: { label: "Perception",   hint: "Anglais, culture générale" },
  VIT: { label: "Vitalité",     hint: "Discipline, planning" }
};


/* ---------- Rangs (niveau minimum pour chaque rang) ---------- */
const RANKS = [
  { min: 1,  rank: "E", title: "Joueur novice" },
  { min: 10, rank: "D", title: "Chasseur de rang D" },
  { min: 20, rank: "C", title: "Chasseur de rang C" },
  { min: 35, rank: "B", title: "Chasseur de rang B" },
  { min: 50, rank: "A", title: "Chasseur de rang A" },
  { min: 70, rank: "S", title: "Chasseur de rang S" }
];


/* ---------- Catégories de l'emploi du temps ---------- */
const EVENT_CATS = {
  cours:  "Cours",
  sport:  "Sport",
  etude:  "Étude",
  projet: "Projet",
  perso:  "Perso",
  tache:  "Tâche"
};


/* ---------- Paquets de révision ----------
   stat          : stat qui monte quand on révise ce paquet
   codeIsAnswer  : la réponse à retrouver est la commande (champ "code")
   reversible    : on peut aussi poser la question dans l'autre sens          */
const DECK_META = {
  culture: { label: "Culture générale", stat: "PER", codeIsAnswer: false, reversible: false },
  cyber:   { label: "Cybersécurité",    stat: "INT", codeIsAnswer: true,  reversible: false },
  kali:    { label: "Outils Kali",      stat: "INT", codeIsAnswer: false, reversible: true },
  python:  { label: "Python",           stat: "AGI", codeIsAnswer: false, reversible: false },
  english: { label: "Anglais",          stat: "PER", codeIsAnswer: false, reversible: true }
};


/* ---------- Quêtes quotidiennes de départ ----------
   required : une quête obligatoire manquée coûte de l'XP (zone de pénalité)
   days     : jours où elle apparaît (0 = dimanche ... 6 = samedi), absent = tous
   auto     : validation automatique (learn = temps d'apprentissage du jour)
   special  : "gym" = validée par le bouton de la page Sport                    */
const DEFAULT_QUESTS = [
  { id: "q-gym",   title: "Séance de salle de sport",        xp: 50, stat: "FOR", minutes: 90, required: true,  days: [1, 3, 5], special: "gym" },
  { id: "q-learn", title: "Parties du jour (culture, cyber, anglais)", xp: 60, stat: "VIT", minutes: 30, required: true, auto: { learn: true } },
  { id: "q-htb",   title: "Entraînement Hack The Box / CTF", xp: 50, stat: "INT", minutes: 60, required: false }
];


/* ---------- Emploi du temps de départ (modifiable dans Planning) ---------- */
const DEFAULT_EVENTS = [
  { id: "e-gym", title: "Salle de sport", cat: "sport", start: "19:00", end: "20:30", days: [1, 3, 5], note: "Exemple : change les jours et l'heure dans Planning" }
];


/* ---------- Projets de départ (exemple) ---------- */
const DEFAULT_PROJECTS = [
  {
    id: "p-portfolio",
    name: "Portfolio",
    deadline: "",
    priority: 2,
    stat: "AGI",
    tasks: [
      { id: "t-1", text: "Ajouter les liens GitHub des projets", minutes: 30, done: false },
      { id: "t-2", text: "Mettre mon CV dans assets/cv.pdf", minutes: 15, done: false },
      { id: "t-3", text: "Mettre en ligne le site", minutes: 45, done: false }
    ]
  }
];
