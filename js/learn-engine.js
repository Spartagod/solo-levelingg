/* ==========================================================
   LEARN-ENGINE.JS : le moteur d'apprentissage intelligent
   ----------------------------------------------------------
   Ce fichier ne dessine rien : il décide QUOI poser, COMMENT
   le poser et QUAND revoir chaque carte.

   1. Répétition espacée (méthode SM-2) : plus tu réussis, plus la
      carte revient tard ; si tu rates, elle revient vite.
   2. Questions variées : une même carte est posée sous des formes
      différentes (QCM, vrai/faux, réponse libre, texte à trous,
      sens inverse, carte mémoire), avec des formulations et des
      mauvaises réponses qui changent à chaque fois.
   3. Difficulté progressive : QCM au début, réponse libre ensuite.
   4. Séance entrelacée : les paquets sont mélangés pour mieux retenir.
   ========================================================== */


const FORMAT_LABELS = {
  mcq: "QCM", tf: "Vrai ou faux", type: "Réponse libre",
  cloze: "Texte à trous", reverse: "Sens inverse", flip: "Carte mémoire"
};


/* ==========================================================
   1. Lecture d'une carte
   ========================================================== */

function deckOf(key) {
  return S.learn.decks[key];
}


// La réponse à retrouver (la commande pour le paquet cyber)
function answerOf(card, deck) {
  return deck.codeIsAnswer && card.code ? card.code : card.a;
}


// Ce qu'on affiche en plus de la réponse, après avoir répondu
function explanationOf(card, deck) {
  const parts = [];

  if (deck.codeIsAnswer && card.code && card.a) parts.push(card.a);
  if (!deck.codeIsAnswer && card.note) parts.push(card.note);
  if (deck.codeIsAnswer && card.note) parts.push(card.note);

  return { text: parts.join(" "), code: deck.codeIsAnswer ? "" : card.code };
}


function dueToday(card) {
  return card.due <= dayKey();
}


/* ==========================================================
   2. Comparer des textes (réponses libres tolérantes)
   ========================================================== */

function normText(text) {
  return String(text)
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// Pour les commandes : on garde la ponctuation, on ignore les espaces en trop,
// les guillemets et les valeurs entre chevrons (<ip>, <wordlist>...)
function normCode(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, "X")
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }

  return row[b.length];
}


function similarity(a, b) {
  if (!a.length && !b.length) return 1;

  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}


const ARTICLES = new Set(["le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "the", "a", "an", "to"]);


function stripArticles(text) {
  return text.split(" ").filter(word => !ARTICLES.has(word)).join(" ");
}


// Compare ce que tu as tapé avec la bonne réponse : { ok, near }
function checkTyped(input, expected, isCode) {
  if (isCode) {
    const sim = similarity(normCode(input), normCode(expected));
    return { ok: sim >= 0.88, near: sim >= 0.6 };
  }

  const a = normText(input);
  const b = normText(expected);
  if (!a) return { ok: false, near: false };
  if (a === b) return { ok: true, near: true };

  const a2 = stripArticles(a);
  const b2 = stripArticles(b);
  const sim = Math.max(similarity(a, b), similarity(a2, b2));

  if (b2.length >= 5 && sim >= 0.85) return { ok: true, near: true };
  if (b2.length < 5 && a2 === b2) return { ok: true, near: true };

  // Réponse en plusieurs mots : on regarde si les mots importants sont présents
  const words = b2.split(" ").filter(word => word.length >= 4);
  if (words.length >= 2) {
    const mine = new Set(a2.split(" "));
    const found = words.filter(word => mine.has(word) || [...mine].some(m => m.length >= 4 && similarity(m, word) >= 0.85)).length;
    if (found / words.length >= 0.8) return { ok: true, near: true };
  }

  return { ok: false, near: sim >= 0.6 };
}


/* ==========================================================
   3. Fabriquer les questions
   ========================================================== */

// Mauvaises réponses : celles de la carte en priorité, complétées par celles des cartes
// voisines. On choisit des réponses de longueur proche de la bonne pour que la plus
// longue (ou la plus courte) ne soit pas toujours la bonne.
function distractors(card, deck, count = 3) {
  const correct = answerOf(card, deck);
  const key = normText(correct) || correct;

  const pool = [
    ...(card.wrongs || []).map(text => ({ text, score: -40 })),
    ...deck.cards
      .filter(other => other.id !== card.id)
      .map(other => ({ text: answerOf(other, deck), tag: other.tag }))
      .filter(item => item.text)
      .map(item => ({ text: item.text, score: (item.tag && item.tag === card.tag ? 0 : 30) }))
  ].map(item => ({ ...item, score: item.score + Math.abs(item.text.length - correct.length) + Math.random() * 25 }))
   .sort((a, b) => a.score - b.score);

  const chosen = [];
  const seen = new Set([key]);

  for (const item of pool) {
    const id = normText(item.text) || item.text;
    if (seen.has(id)) continue;

    seen.add(id);
    chosen.push(item.text);
    if (chosen.length >= count) break;
  }

  return chosen;
}


// Le QCM est équitable si la bonne réponse n'est pas bien plus longue que les mauvaises
function mcqBalanced(answer, wrongs) {
  const average = wrongs.reduce((sum, text) => sum + text.length, 0) / Math.max(1, wrongs.length);

  return answer.length <= average * 1.6 + 15;
}


// Mot clé à cacher dans un texte à trous
function clozeTarget(answer) {
  const words = answer.split(/\s+/);
  if (words.length < 4) return null;

  let best = null;

  words.forEach((word, index) => {
    const clean = word.replace(/[^\p{L}\p{N}]/gu, "");
    if (index === 0 || clean.length < 6) return;
    if (!best || clean.length > best.word.length) best = { index, word: clean, raw: word };
  });

  return best;
}


function availableFormats(card, deck) {
  const answer = answerOf(card, deck);
  const isCode = Boolean(deck.codeIsAnswer && card.code);
  const wrongs = distractors(card, deck, 3);
  const hasWrongs = wrongs.length >= 3;
  const formats = ["flip"];

  if (hasWrongs && answer.length <= 150 && mcqBalanced(answer, wrongs)) formats.push("mcq");
  if (hasWrongs && answer.length <= 110) formats.push("tf");
  if (isCode ? answer.length <= 90 : answer.length <= 40 && answer.split(/\s+/).length <= 6) formats.push("type");
  if (!isCode && clozeTarget(answer)) formats.push("cloze");
  if (deck.reversible && card.q.length <= 60 && answer.length <= 60) formats.push("reverse");

  return formats;
}


// Choisit la forme de la question selon le niveau de maîtrise de la carte
function chooseFormat(card, deck, opts = {}) {
  let formats = availableFormats(card, deck);

  // Dans une partie, pas d'auto-évaluation : on veut une vraie vérification
  if (opts.noFlip && formats.length > 1) formats = formats.filter(format => format !== "flip");
  const learning = card.stage === "new" || card.stage === "learn" || card.relearn;
  let weights;

  if (learning && card.learnWins === 0) weights = { mcq: 6, tf: 1, flip: 2 };
  else if (learning) weights = { tf: 3, type: 4, cloze: 3, mcq: 1, reverse: 3, flip: 1 };
  else if (opts.hard) weights = { type: 5, cloze: 3, reverse: 3, mcq: 1, tf: 1, flip: 0 };
  else if (card.reps <= 2) weights = { type: 4, cloze: 3, mcq: 2, tf: 2, reverse: 3, flip: 2 };
  else weights = { type: 5, cloze: 4, reverse: 4, flip: 3, mcq: 1, tf: 1 };

  let pool = formats.filter(format => weights[format]);

  // Jamais deux fois de suite la même forme pour une carte, si on a le choix
  if (pool.length > 1) pool = pool.filter(format => format !== card.lastFmt);
  if (!pool.length) pool = ["flip"];

  // "flip" est le dernier recours : on l'évite quand une saisie est possible
  if (pool.length > 1 && pool.includes("flip") && formats.includes("type")) pool = pool.filter(f => f !== "flip" || Math.random() < 0.3);

  const total = pool.reduce((sum, format) => sum + weights[format], 0);
  let roll = Math.random() * total;

  for (const format of pool) {
    roll -= weights[format];
    if (roll <= 0) return format;
  }

  return pool[0];
}


// Formulation : la question d'origine puis ses variantes, à tour de rôle
function pickWording(card) {
  const wordings = [card.q, ...(card.alts || [])];
  card.altIdx = (card.altIdx + 1) % wordings.length;

  return wordings[card.altIdx];
}


// Construit la question complète (ce qui sera affiché) pour une carte
function buildQuestion(card, deckKey, opts = {}) {
  const deck = deckOf(deckKey);
  const answer = answerOf(card, deck);
  const format = chooseFormat(card, deck, opts);

  const question = {
    deckKey, cardId: card.id, format, answer,
    prompt: pickWording(card),
    isCode: Boolean(deck.codeIsAnswer && card.code),
    isNew: card.stage === "new"
  };

  if (format === "mcq") {
    const wrongs = distractors(card, deck, 3);
    question.options = shuffle([answer, ...wrongs]);
  }

  if (format === "tf") {
    const wrong = distractors(card, deck, 3)[0];
    question.proposed = Math.random() < 0.5 ? answer : wrong;
    question.isTrue = question.proposed === answer;
  }

  if (format === "cloze") {
    const target = clozeTarget(answer);
    question.cloze = {
      before: answer.split(/\s+/).slice(0, target.index).join(" "),
      after: answer.split(/\s+/).slice(target.index + 1).join(" "),
      word: target.word,
      suffix: target.raw.slice(target.raw.indexOf(target.word) + target.word.length)
    };
  }

  if (format === "reverse") {
    question.prompt = answer;
    question.answer = card.q;
  }

  return question;
}


/* ==========================================================
   4. Corriger une réponse
   ========================================================== */

// response : texte tapé, option choisie, "true"/"false", ou note de la carte mémoire
// Renvoie { ok, near, quality (0 à 5), expected }
function gradeAnswer(question, response, elapsedMs, hinted) {
  let ok = false;
  let near = false;
  let quality;

  const seconds = elapsedMs / 1000;
  const speed = seconds < 6 ? 5 : seconds < 16 ? 4 : 3;

  if (question.format === "flip") {
    quality = { fail: 1, hard: 3, good: 4, easy: 5 }[response];
    ok = quality >= 3;
    return { ok, near: ok, quality, expected: question.answer };
  }

  if (question.format === "mcq") {
    ok = response === question.answer;
    quality = ok ? Math.min(4, speed) : 1;
  }

  if (question.format === "tf") {
    ok = (response === "true") === question.isTrue;
    quality = ok ? Math.min(4, speed) : 1;
  }

  if (question.format === "type" || question.format === "reverse") {
    ({ ok, near } = checkTyped(response, question.answer, question.isCode));
    quality = ok ? speed : near ? 2 : 1;
  }

  if (question.format === "cloze") {
    ({ ok, near } = checkTyped(response, question.cloze.word, false));
    quality = ok ? speed : near ? 2 : 1;
  }

  if (ok && hinted) quality = Math.max(3, quality - 1);

  const expected = question.format === "cloze" ? question.cloze.word : question.answer;

  return { ok, near: near || ok, quality, expected };
}


/* ==========================================================
   5. Planifier la prochaine révision (SM-2)
   ========================================================== */

// Met à jour la carte. Renvoie true si elle doit revenir dans la séance en cours.
function scheduleCard(card, quality) {
  const today = dayKey();

  card.seen++;
  card.hist = (card.hist + (quality >= 3 ? "1" : "0")).slice(-8);

  /* ----- Nouvelle carte ou en apprentissage : 2 réussites dans la séance ----- */
  if (card.stage === "new" || card.stage === "learn") {
    card.stage = "learn";

    if (quality < 3) {
      card.learnWins = 0;
      return true;
    }

    card.learnWins++;
    if (card.learnWins < 2) return true;

    card.stage = "review";
    card.reps = 1;
    card.interval = quality >= 5 ? 2 : 1;
    card.due = addDays(today, card.interval);
    return false;
  }

  /* ----- Carte en révision ----- */
  if (quality < 3) {
    card.lapses++;
    card.ef = Math.max(1.3, card.ef - 0.2);
    card.interval = 1;
    card.reps = 0;
    card.relearn = true;
    card.due = today;

    if (card.lapses >= CONFIG.leechLapses) card.leech = true;

    return true;
  }

  // Réussite après un échec : elle repart demain
  if (card.relearn) {
    card.relearn = false;
    card.reps = 1;
    card.interval = 1;
    card.due = addDays(today, 1);
    return false;
  }

  card.reps++;
  card.ef = Math.max(1.3, card.ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  let interval;
  if (card.reps === 2) interval = quality >= 5 ? 7 : 6;
  else if (quality === 3) interval = Math.max(card.interval + 1, Math.round(card.interval * 1.2));
  else interval = Math.round(card.interval * card.ef * (quality >= 5 ? 1.15 : 1));

  // Un peu de hasard pour ne pas faire revenir toutes les cartes le même jour
  if (interval >= 10) interval = Math.round(interval * (0.95 + Math.random() * 0.1));

  card.interval = clamp(interval, 1, 365);
  card.due = addDays(today, card.interval);

  return false;
}


/* ==========================================================
   6. Compteurs du jour
   ========================================================== */

function dailyStats(key = dayKey()) {
  if (!S.learn.daily[key]) S.learn.daily[key] = { sec: 0, n: 0, ok: 0, nw: 0 };

  return S.learn.daily[key];
}


function newQuotaLeft() {
  return Math.max(0, partSize() - (S.learn.daily[dayKey()]?.nw || 0));
}


/* ==========================================================
   7. Composer la séance
   ========================================================== */

function deckKeys() {
  return Object.keys(S.learn.decks);
}


// Cartes à revoir aujourd'hui (les plus en retard et les plus fragiles d'abord)
function dueCards(keys) {
  const today = dayKey();
  const list = [];

  for (const key of keys) {
    for (const card of S.learn.decks[key].cards) {
      if (card.stage === "new" || card.due > today) continue;
      list.push({ deck: key, card, late: diffDays(today, card.due) });
    }
  }

  return list.sort((a, b) => b.late - a.late || a.card.ef - b.card.ef);
}


// Nouvelles cartes à introduire : un peu de chaque paquet, thèmes variés
function newCards(keys, limit) {
  const lists = keys.map(key => shuffle(S.learn.decks[key].cards.filter(card => card.stage === "new")).map(card => ({ deck: key, card })));
  const picked = [];

  while (picked.length < limit && lists.some(list => list.length)) {
    for (const list of lists) {
      if (list.length && picked.length < limit) picked.push(list.shift());
    }
  }

  return picked;
}


// Mélange les paquets : jamais plus de 2 cartes de suite du même paquet
function interleave(items) {
  const result = shuffle(items);

  for (let i = 2; i < result.length; i++) {
    if (result[i].deck === result[i - 1].deck && result[i].deck === result[i - 2].deck) {
      const swap = result.findIndex((item, index) => index > i && item.deck !== result[i].deck);
      if (swap > -1) [result[i], result[swap]] = [result[swap], result[i]];
    }
  }

  return result;
}


function buildQueue(keys) {
  const reviews = dueCards(keys);
  const fresh = newCards(keys, newQuotaLeft());

  return interleave([...reviews, ...fresh]).map(item => ({ deck: item.deck, id: item.card.id }));
}


// Quand la file est vide mais que le temps n'est pas écoulé
function extraQueue(keys, kind) {
  if (kind === "new") {
    return newCards(keys, 6).map(item => ({ deck: item.deck, id: item.card.id, bonusNew: true }));
  }

  // Révision anticipée : cartes dues dans les 3 prochains jours
  const limit = addDays(dayKey(), 3);
  const list = [];

  for (const key of keys) {
    for (const card of S.learn.decks[key].cards) {
      if (card.stage === "review" && card.due > dayKey() && card.due <= limit) list.push({ deck: key, id: card.id });
    }
  }

  return shuffle(list).slice(0, 12);
}


/* ==========================================================
   8. Statistiques
   ========================================================== */

function deckCounts(key) {
  const today = dayKey();
  const counts = { total: 0, fresh: 0, learning: 0, young: 0, mature: 0, due: 0, leeches: 0 };

  for (const card of S.learn.decks[key].cards) {
    counts.total++;

    if (card.stage === "new") counts.fresh++;
    else if (card.stage === "learn" || card.relearn) counts.learning++;
    else if (card.interval >= 21) counts.mature++;
    else counts.young++;

    if (card.stage !== "new" && card.due <= today) counts.due++;
    if (card.leech) counts.leeches++;
  }

  return counts;
}


function allCounts(keys = deckKeys()) {
  const sum = { total: 0, fresh: 0, learning: 0, young: 0, mature: 0, due: 0, leeches: 0 };

  for (const key of keys) {
    const counts = deckCounts(key);
    for (const field of Object.keys(sum)) sum[field] += counts[field];
  }

  return sum;
}


// Nombre de cartes à revoir chaque jour sur les 14 prochains jours
function forecast(days = 14) {
  const today = dayKey();
  const result = Array.from({ length: days }, () => 0);

  for (const key of deckKeys()) {
    for (const card of S.learn.decks[key].cards) {
      if (card.stage === "new") continue;

      const offset = Math.max(0, diffDays(card.due, today));
      if (offset < days) result[offset]++;
    }
  }

  return result;
}


// Taux de bonnes réponses sur les N derniers jours (null s'il n'y a rien)
function retention(days = 7) {
  let n = 0;
  let ok = 0;

  for (let i = 0; i < days; i++) {
    const day = S.learn.daily[addDays(dayKey(), -i)];
    if (day) { n += day.n; ok += day.ok; }
  }

  return n ? Math.round((ok / n) * 100) : null;
}


// Jours d'affilée où toutes les parties du jour sont terminées
function learnStreak() {
  let key = dayKey();
  let streak = 0;

  if (!S.learn.daily[key]?.full) key = addDays(key, -1);

  while (S.learn.daily[key]?.full) {
    streak++;
    key = addDays(key, -1);
  }

  return streak;
}
