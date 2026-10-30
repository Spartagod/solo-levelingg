/* ==========================================================
   STORE.JS : l'état du joueur, sauvegardé dans le navigateur
   ----------------------------------------------------------
   S est l'objet qui contient TOUT (XP, quêtes, planning, cartes,
   présentations...). save() l'enregistre. Les données restent sur
   cet ordinateur et ce navigateur (localStorage).
   ========================================================== */


let S;

const memoryBackup = {};   // si le navigateur bloque le stockage, on garde en mémoire


function storageRead() {
  try {
    return localStorage.getItem(CONFIG.storageKey);
  } catch (error) {
    return memoryBackup[CONFIG.storageKey] || null;
  }
}


function storageWrite(value) {
  try {
    localStorage.setItem(CONFIG.storageKey, value);
    return true;
  } catch (error) {
    memoryBackup[CONFIG.storageKey] = value;
    return false;
  }
}


/* ---------- Cartes de révision ---------- */

function makeCard(fields) {
  return {
    id: uid(),
    q: fields.q, a: fields.a,
    code: fields.code || "", note: fields.note || "",
    alts: fields.alts || [], wrongs: fields.wrongs || [], tag: fields.tag || "",

    // Planification (répétition espacée, voir learn-engine.js)
    stage: "new",          // new -> learn -> review
    ef: 2.5, interval: 0, reps: 0, lapses: 0,
    due: dayKey(), seen: 0, learnWins: 0, relearn: false,
    hist: "", lastFmt: "", altIdx: -1, leech: false,
    created: dayKey()
  };
}


function seedDecks() {
  const decks = {};

  for (const key of Object.keys(DECK_META)) {
    decks[key] = { ...DECK_META[key], custom: false, cards: [] };
  }

  decks.culture.cards = SEED_CULTURE.map(([tag, q, a, wrongs, note]) => makeCard({ tag, q, a, wrongs, note }));
  decks.cyber.cards   = SEED_CYBER.map(makeCard);
  decks.kali.cards    = SEED_KALI.map(([tag, q, a]) => makeCard({ tag, q, a }));
  decks.python.cards  = SEED_PYTHON.map(makeCard);
  decks.english.cards = SEED_ENGLISH.map(([q, a, note]) => makeCard({ q, a, note }));

  return decks;
}


/* ---------- Projets de code ---------- */

function seedCodeExample() {
  const file = {
    id: uid(),
    path: "comment-ça-marche.md",
    content: "# Comment utiliser cette page\n\n" +
      "Importe les fichiers d'un de tes projets (dossier complet) pour les relire tranquillement, " +
      "et crée des cartes pour t'entraîner à expliquer ton code à l'oral, avant une défense.\n\n" +
      "## Deux façons de commencer\n\n" +
      "- **+ Importer un dossier** : choisis le dossier de ton projet. Les fichiers texte sont récupérés, " +
      "le reste (node_modules, images, fichiers compilés...) est ignoré automatiquement.\n" +
      "- **+ Page vide** : pour écrire une explication toi-même, sans rien importer.\n\n" +
      "## Créer des cartes pour la défense\n\n" +
      "Ouvre un fichier, clique sur **+ Créer une carte sur ce code**. Écris une question du type " +
      "*« Que fait la fonction X dans fichier.py ? »* ou *« Pourquoi j'ai fait ce choix ? »*, et réponds avec tes mots. " +
      "Ces cartes vont dans **Apprendre → Paquets** (un sujet par projet) et se révisent comme les autres, " +
      "par répétition espacée, pour que tu saches bien expliquer le jour de la défense.",
    created: dayKey()
  };

  return { id: uid(), name: "Comment ça marche", files: [file], activeFileId: file.id, deckKey: "" };
}


/* ---------- État de départ ---------- */

function defaultState() {
  return {
    version: 2,
    created: dayKey(),
    player: { name: "Tom Koulmann", title: "Étudiant en cybersécurité" },

    xp: 0,
    statXp: { FOR: 0, INT: 0, AGI: 0, PER: 0, VIT: 0 },
    xpLog: [],

    quests: { templates: structuredClone(DEFAULT_QUESTS), days: {}, lastCheck: "" },
    events: structuredClone(DEFAULT_EVENTS),
    alerts: [],
    projects: structuredClone(DEFAULT_PROJECTS),

    gym: { log: [], weeklyGoal: 3 },

    learn: {
      decks: seedDecks(),
      daily: {},                    // { "2026-10-27": { sec, n, ok, nw } }
      settings: { partSize: CONFIG.partSize, reviewsPerPart: CONFIG.reviewsPerPart, minutes: 20 }
    },
    english: { lastScore: 605, target: 750 },

    code: {
      projects: [seedCodeExample()], activeProjectId: "", mode: "edit"
    },

    studio: { decks: [], current: "", seeded: false },

    settings: {
      sound: true, penalties: true,
      remind: true, remindMin: 10,
      evening: true,
      browserNotif: false
    },

    fired: {},
    welcomed: false
  };
}


// Complète un ancien état avec les nouveaux champs (pour les mises à jour)
function mergeDefaults(target, defaults) {
  for (const key of Object.keys(defaults)) {
    if (target[key] === undefined) {
      target[key] = structuredClone(defaults[key]);
    } else if (defaults[key] && typeof defaults[key] === "object" && !Array.isArray(defaults[key]) && key !== "decks" && key !== "daily") {
      mergeDefaults(target[key], defaults[key]);
    }
  }

  return target;
}


function loadState() {
  const defaults = defaultState();
  const raw = storageRead();

  if (!raw) {
    S = defaults;
    return;
  }

  try {
    S = mergeDefaults(JSON.parse(raw), defaults);

    // Nouveau paquet ajouté dans une mise à jour du site : on le donne aussi aux joueurs existants
    for (const key of Object.keys(defaults.learn.decks)) {
      if (!S.learn.decks[key]) S.learn.decks[key] = defaults.learn.decks[key];
    }
  } catch (error) {
    S = defaults;
  }
}


let saveTimer = null;


function save() {
  storageWrite(JSON.stringify(S));
  if (typeof syncSchedulePush === "function") syncSchedulePush();
}


// Sauvegarde différée (utile quand on tape beaucoup, ex. éditeur de présentations)
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}


function exportState() {
  return JSON.stringify(S, null, 2);
}


function importState(text) {
  const data = JSON.parse(text);

  if (typeof data !== "object" || data === null || data.xp === undefined) {
    throw new Error("Fichier de sauvegarde invalide");
  }

  S = mergeDefaults(data, defaultState());
  save();
}


function resetState() {
  S = defaultState();
  save();
}
