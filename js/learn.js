/* ==========================================================
   LEARN.JS : la page "Apprendre" (séance de 20 minutes)
   ----------------------------------------------------------
   Trois onglets :
   - Aujourd'hui : lancer la séance du jour
   - Paquets     : voir, ajouter, importer des cartes, créer un sujet
   - Stats       : prévisions, mémorisation, score TOEIC
   Le "cerveau" (quoi poser, quand revoir) est dans learn-engine.js.
   ========================================================== */


let learnTab = "today";
let learnDeckSel = "";            // paquet affiché dans l'onglet Paquets
let learnSession = null;          // partie en cours (ou null)
let learnTimer = null;

const IDLE_LIMIT = 90000;         // sans action pendant 90 s, le chrono se met en pause


/* ==========================================================
   1. Les parties du jour
   ----------------------------------------------------------
   Chaque sujet a sa "partie" : N cartes (15 par défaut).
   - Une manche = toutes les cartes de la partie.
   - Une carte ratée revient quelques cartes plus tard jusqu'à être juste.
   - S'il y a eu au moins une erreur dans la manche, on refait TOUTES
     les cartes. La partie est finie quand une manche est 100 % juste
     du premier coup.
   ========================================================== */

function partSize() {
  return S.learn.settings.partSize;
}


// Sujets qui comptent pour la quête du jour
function requiredDecks() {
  return ["culture", "cyber", "english"].filter(key => S.learn.decks[key] && S.learn.decks[key].cards.length);
}


// Tous les sujets qui ont au moins une carte
function partDecks() {
  return deckKeys().filter(key => S.learn.decks[key].cards.length);
}


// Choisit les cartes d'une partie : quelques révisions + des nouvelles cartes
function composePart(deckKey, used = []) {
  const deck = deckOf(deckKey);
  const today = dayKey();
  const size = partSize();
  const maxReviews = S.learn.settings.reviewsPerPart;
  const ban = new Set(used);

  const due = deck.cards
    .filter(card => card.stage !== "new" && card.due <= today && !ban.has(card.id))
    .sort((a, b) => diffDays(today, b.due) - diffDays(today, a.due) || a.ef - b.ef);

  const fresh = shuffle(deck.cards.filter(card => card.stage === "new" && !ban.has(card.id)));
  const ids = [];

  due.slice(0, maxReviews).forEach(card => ids.push(card.id));

  for (const card of fresh) {
    if (ids.length >= size) break;
    ids.push(card.id);
  }

  // Pas assez de nouvelles cartes : on complète avec d'autres révisions
  for (const card of due.slice(maxReviews)) {
    if (ids.length >= size) break;
    ids.push(card.id);
  }

  const upcoming = deck.cards
    .filter(card => card.stage !== "new" && !ids.includes(card.id) && !ban.has(card.id))
    .sort((a, b) => a.due.localeCompare(b.due));

  for (const card of upcoming) {
    if (ids.length >= size) break;
    ids.push(card.id);
  }

  return shuffle(ids);
}


function newPart(deckKey, completed = 0, used = []) {
  const ids = composePart(deckKey, used);

  return { ids, round: 1, done: false, completed, scheduled: [], used: [...used, ...ids] };
}


function getPart(deckKey) {
  const day = dailyStats();

  if (!day.parts) day.parts = {};
  if (!day.parts[deckKey]) day.parts[deckKey] = newPart(deckKey);

  return day.parts[deckKey];
}


function partsDone() {
  const parts = dailyStats().parts || {};

  return requiredDecks().filter(key => (parts[key]?.completed || 0) >= 1).length;
}


/* ==========================================================
   2. Démarrer, répondre, terminer
   ========================================================== */

function startLearn(deckKey, bonus = false) {
  let part = getPart(deckKey);

  if (bonus) {
    part = newPart(deckKey, part.completed, part.used);

    if (!part.ids.length) { toast("Plus de cartes disponibles dans ce sujet"); return; }

    dailyStats().parts[deckKey] = part;
  }

  if (!part.ids.length) {
    notify({ title: "SUJET VIDE", lines: ["Ajoute des cartes à ce sujet dans l'onglet Paquets."] });
    return;
  }

  learnSession = {
    deck: deckKey, part, round: part.round,
    queue: shuffle(part.ids), cleared: new Set(), missed: new Set(),
    q: null, answered: false, hinted: false, revealed: false, fb: null, banner: part.round > 1 ? bannerText(part.round, part.ids.length) : "",
    qStart: Date.now(), lastAct: Date.now(),
    n: 0, ok: 0, xp: 0, startSec: dailyStats().sec
  };

  Sound.play("click");
  nextQuestion();

  clearInterval(learnTimer);
  learnTimer = setInterval(tickLearn, 1000);

  refresh();
}


function bannerText(round, total) {
  return `Manche ${round} : on repasse les ${total} cartes. Vise zéro erreur !`;
}


function fmtClock(seconds) {
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}


// Chrono : on compte seulement les secondes où la page est visible et où tu es actif
function tickLearn() {
  if (!learnSession) {
    clearInterval(learnTimer);
    return;
  }

  const active = !document.hidden && Date.now() - learnSession.lastAct < IDLE_LIMIT;
  const today = dailyStats();

  if (active) today.sec++;
  if (today.sec % 10 === 0) save();

  const clock = $("#lClock");
  const state = $("#lPause");

  if (clock) clock.textContent = fmtClock(today.sec);
  if (state) state.hidden = active;
}


function touchLearn() {
  if (learnSession) learnSession.lastAct = Date.now();
}


function findCard(deckKey, id) {
  return S.learn.decks[deckKey]?.cards.find(card => card.id === id);
}


function nextQuestion() {
  const s = learnSession;

  s.q = null;
  s.answered = false;
  s.hinted = false;
  s.revealed = false;
  s.fb = null;

  while (!s.q) {
    // Manche terminée : tout juste du premier coup = partie gagnée, sinon on recommence
    if (!s.queue.length) {
      if (s.missed.size === 0 || !s.part.ids.length) { finishPart(); return; }

      s.round++;
      s.part.round = s.round;
      s.missed = new Set();
      s.cleared = new Set();
      s.queue = shuffle(s.part.ids);
      s.banner = bannerText(s.round, s.part.ids.length);
      save();
    }

    const id = s.queue.shift();
    const card = findCard(s.deck, id);

    if (!card) { s.part.ids = s.part.ids.filter(item => item !== id); continue; }

    s.q = buildQuestion(card, s.deck, { noFlip: true, hard: s.round > 1 });
    s.qStart = Date.now();
  }
}


// response : texte tapé / option choisie / "true" "false" / note de carte mémoire
function submitAnswer(response) {
  const s = learnSession;
  if (!s || !s.q || s.answered) return;

  const q = s.q;
  const deck = deckOf(s.deck);
  const card = findCard(s.deck, q.cardId);
  const grade = gradeAnswer(q, response, Date.now() - s.qStart, s.hinted);
  const today = dailyStats();
  const snapshot = { ...card };

  // La planification (répétition espacée) ne compte que la première réponse du jour
  const first = !s.part.scheduled.includes(card.id);

  card.lastFmt = q.format;

  if (first) {
    if (card.stage === "new") today.nw++;
    scheduleCard(card, grade.quality);
    s.part.scheduled.push(card.id);
  }

  if (grade.ok) {
    s.cleared.add(card.id);
  } else {
    s.missed.add(card.id);
    s.queue.splice(Math.min(s.queue.length, 3), 0, card.id);
  }

  today.n++;
  if (grade.ok) today.ok++;

  const xp = first ? (grade.ok ? 3 : 1) : (grade.ok ? 1 : 0);
  s.n++;
  if (grade.ok) s.ok++;
  s.xp += xp;
  s.answered = true;
  s.banner = "";
  s.lastAct = Date.now();

  s.fb = {
    ...grade, response, first, snapshot, xp,
    next: grade.ok ? "Validée pour cette manche." : "Elle reviendra dans quelques cartes."
  };

  save();
  if (xp) addXp(xp, deck.stat, `Révision ${deck.label}`, true);

  // Carte mémoire : on enchaîne directement
  if (q.format === "flip") nextQuestion();

  refresh();
}


// "J'avais juste" : on annule l'erreur et on compte la réponse comme réussie
function overrideAnswer() {
  const s = learnSession;
  if (!s || !s.fb || s.fb.ok) return;

  const card = findCard(s.deck, s.q.cardId);

  if (s.fb.first) {
    Object.assign(card, s.fb.snapshot);
    card.lastFmt = s.q.format;
    scheduleCard(card, 4);
  }

  s.queue = s.queue.filter(id => id !== card.id);
  s.missed.delete(card.id);
  s.cleared.add(card.id);

  dailyStats().ok++;
  s.ok++;
  s.fb = { ...s.fb, ok: true, near: true, quality: 4, overridden: true, next: "Validée pour cette manche." };

  save();
  toast("Corrigé : noté comme réussi");
  refresh();
}


// Partie gagnée : les cartes sont validées pour la répétition espacée
function finishPart() {
  const s = learnSession;
  const part = s.part;
  const deck = deckOf(s.deck);
  const tomorrow = addDays(dayKey(), 1);

  for (const id of part.ids) {
    const card = findCard(s.deck, id);
    if (!card) continue;

    if (card.stage === "learn" || card.stage === "new") {
      card.stage = "review";
      card.learnWins = 2;
      card.reps = Math.max(1, card.reps);
      card.interval = Math.max(1, card.interval);
      card.due = tomorrow;
    } else if (card.relearn) {
      card.relearn = false;
      card.reps = 1;
      card.interval = 1;
      card.due = tomorrow;
    }
  }

  part.done = true;
  part.completed++;

  const rounds = s.round;
  const bonus = 15 + (rounds === 1 ? 10 : 0);

  learnSession = null;
  clearInterval(learnTimer);

  const day = dailyStats();
  const allDone = partsDone() >= requiredDecks().length;
  if (allDone) day.full = true;

  save();
  addXp(bonus, deck.stat, `Partie ${deck.label}`);
  checkAutoQuests();

  notify({
    title: "PARTIE TERMINÉE",
    lines: [`${deck.label} : ${part.ids.length} cartes, tout juste en ${rounds} manche${rounds > 1 ? "s" : ""}.`, `Récompense : +${bonus} XP`, ...(allDone ? ["Toutes les parties du jour sont faites !"] : [])],
    sound: "levelup"
  });

  learnTab = "today";
  refresh();
}


// Arrêt manuel : la progression de la partie est gardée (reprise au même endroit)
function endLearn() {
  const s = learnSession;

  learnSession = null;
  clearInterval(learnTimer);
  save();

  if (s && s.n > 0) toast(`Partie en pause : ${s.ok}/${s.n} justes. Tu pourras la reprendre.`);

  learnTab = "today";
  refresh();
}


/* ==========================================================
   2. Clavier pendant la séance
   ========================================================== */

document.addEventListener("keydown", event => {
  if (!learnSession || currentView !== "apprendre" || $("#modal").innerHTML || event.repeat) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  touchLearn();

  const s = learnSession;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
  const key = event.key;

  if (s.q && s.answered && (key === "Enter" || key === " ")) {
    if (document.activeElement?.tagName === "BUTTON" && key === "Enter") return;
    event.preventDefault();
    advanceLearn();
    return;
  }

  if (typing || !s.q || s.answered) return;

  const q = s.q;

  if (q.format === "mcq" && /^[1-4]$/.test(key) && q.options[Number(key) - 1]) {
    submitAnswer(q.options[Number(key) - 1]);
  }

  if (q.format === "tf" && /^[vVfF]$/.test(key)) submitAnswer(/v/i.test(key) ? "true" : "false");

  if (q.format === "flip") {
    if (!s.revealed && (key === " " || key === "Enter")) { event.preventDefault(); s.revealed = true; refresh(); }
    if (s.revealed && /^[1-4]$/.test(key)) submitAnswer(["fail", "hard", "good", "easy"][Number(key) - 1]);
  }
});


["pointerdown", "input"].forEach(name => document.addEventListener(name, touchLearn, true));


function advanceLearn() {
  nextQuestion();
  refresh();
}


/* ==========================================================
   3. Dessin de la séance
   ========================================================== */

function renderLearn(root) {
  if (learnSession) {
    renderLesson(root);
    return;
  }

  const tabs = [["today", "Aujourd'hui"], ["decks", "Paquets"], ["stats", "Stats"]]
    .map(([key, label]) => `<button type="button" class="tab ${learnTab === key ? "sel" : ""}" data-act="tab" data-tab="${key}">${label}</button>`)
    .join("");

  const body = learnTab === "decks" ? decksTab() : learnTab === "stats" ? statsTab() : todayTab();

  root.innerHTML = `
    <div class="tabs learn-tabs">${tabs}</div>
    ${body}`;

  root.onclick = event => learnClick(event, root);
  root.onsubmit = event => learnSubmit(event);

  const search = $("#cardSearch", root);
  if (search) search.addEventListener("input", () => filterCards(root));
}


/* ---------- Dessin d'une question ---------- */

function renderLesson(root) {
  const s = learnSession;
  const q = s.q;
  const total = s.part.ids.length;
  const pct = Math.round((s.cleared.size / Math.max(1, total)) * 100);

  const head = `
    <div class="lesson-bar">
      <span class="pill gold">Manche ${s.round}</span>
      <span class="pill">${s.cleared.size}/${total} validées</span>
      <span class="pill ${s.missed.size ? "red" : ""}">${s.missed.size} erreur(s)</span>
      <span class="pill">+${s.xp} XP</span>
      <span class="pill">⏱ <b id="lClock">${fmtClock(dailyStats().sec)}</b></span>
      <span class="pill red" id="lPause" hidden>EN PAUSE</span>
      <button class="btn small" type="button" data-act="stop">Pause</button>
    </div>
    <div class="bar goal"><i style="width:${pct}%"></i></div>`;

  const deck = deckOf(s.deck);
  const tag = findCard(s.deck, q.cardId)?.tag;

  root.innerHTML = `
    <section class="win lesson">
      <span class="win-t">Partie · ${esc(deck.label)}</span>
      ${head}

      ${s.banner ? `<p class="round-banner">${esc(s.banner)}</p>` : ""}

      <div class="q-tags">
        <span class="pill">${esc(FORMAT_LABELS[q.format])}</span>
        ${q.isNew ? `<span class="pill gold">NOUVEAU</span>` : ""}
        ${tag ? `<span class="pill">${esc(tag)}</span>` : ""}
      </div>

      ${s.answered && s.fb && q.format !== "flip" ? lessonFeedback(q, s.fb) : questionBody(q, s)}
    </section>`;

  root.onclick = event => learnClick(event, root);
  root.onsubmit = event => learnSubmit(event);

  const input = $("#lInput", root);
  if (input) input.focus();
}


function questionBody(q, s) {
  if (q.format === "mcq") {
    return `
      <h2 class="question">${esc(q.prompt)}</h2>
      <div class="options">
        ${q.options.map((option, i) => `
          <button type="button" class="opt ${q.isCode ? "mono" : ""}" data-act="opt" data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(option)}</span></button>`).join("")}
      </div>`;
  }

  if (q.format === "tf") {
    return `
      <h2 class="question">${esc(q.prompt)}</h2>
      <p class="lbl">Réponse proposée</p>
      <p class="proposed ${q.isCode ? "mono" : ""}">${esc(q.proposed)}</p>
      <div class="row center">
        <button class="btn primary big" type="button" data-act="tf" data-v="true"><kbd>V</kbd> Vrai</button>
        <button class="btn big" type="button" data-act="tf" data-v="false"><kbd>F</kbd> Faux</button>
      </div>`;
  }

  if (q.format === "cloze") {
    return `
      <h2 class="question">${esc(q.prompt)}</h2>
      <p class="lbl">Complète la réponse</p>
      <form class="cloze" data-form="answer">
        <span>${esc(q.cloze.before)}</span>
        <input id="lInput" name="r" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${clamp(q.cloze.word.length + 3, 8, 26)}ch" aria-label="Mot manquant">
        <span>${esc(q.cloze.suffix)} ${esc(q.cloze.after)}</span>
        <button class="btn primary" type="submit">Valider</button>
      </form>
      ${hintLine(q, s)}`;
  }

  if (q.format === "type" || q.format === "reverse") {
    return `
      <h2 class="question">${esc(q.prompt)}</h2>
      <p class="lbl">${q.format === "reverse" ? "Retrouve l'autre côté" : q.isCode ? "Tape la commande" : "Ta réponse"}</p>
      <form class="typed" data-form="answer">
        <input id="lInput" name="r" class="${q.isCode ? "mono" : ""}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Ta réponse">
        <button class="btn primary" type="submit">Valider</button>
      </form>
      ${hintLine(q, s)}`;
  }

  // flip : carte mémoire
  const card = findCard(q.deckKey, q.cardId);
  const deck = deckOf(q.deckKey);
  const explain = explanationOf(card, deck);

  return `
    <h2 class="question">${esc(q.prompt)}</h2>
    ${s.revealed ? `
      <div class="answer">
        <p class="lbl">Réponse</p>
        ${q.isCode ? `<pre>${esc(q.answer)}</pre>` : `<p class="answer-text">${esc(q.answer)}</p>`}
        ${explain.text ? `<p class="muted">${esc(explain.text)}</p>` : ""}
        ${explain.code ? `<pre>${esc(explain.code)}</pre>` : ""}
      </div>
      <p class="lbl">Tu le savais ?</p>
      <div class="row center">
        <button class="btn danger" type="button" data-act="rate" data-r="fail"><kbd>1</kbd> Raté</button>
        <button class="btn" type="button" data-act="rate" data-r="hard"><kbd>2</kbd> Difficile</button>
        <button class="btn primary" type="button" data-act="rate" data-r="good"><kbd>3</kbd> Bien</button>
        <button class="btn" type="button" data-act="rate" data-r="easy"><kbd>4</kbd> Facile</button>
      </div>` : `
      <div class="row center"><button class="btn primary big" type="button" data-act="reveal">Révéler la réponse <kbd>Espace</kbd></button></div>`}`;
}


function hintLine(q, s) {
  if (s.hinted) {
    const target = q.format === "cloze" ? q.cloze.word : q.answer;
    const shown = target.split("").map((char, i) => (i === 0 || /[^\p{L}\p{N}]/u.test(char) ? char : "•")).join("");

    return `<p class="hint">Indice : <code>${esc(shown)}</code></p>`;
  }

  return `
    <div class="row center">
      <button class="btn small" type="button" data-act="hint">Indice</button>
      <button class="btn small" type="button" data-act="giveup">Je ne sais pas</button>
    </div>`;
}


function lessonFeedback(q, fb) {
  const card = findCard(q.deckKey, q.cardId);
  const deck = deckOf(q.deckKey);
  const explain = explanationOf(card, deck);
  const verdict = fb.ok ? (fb.overridden ? "CORRIGÉ : RÉUSSI" : "CORRECT") : fb.near ? "PRESQUE" : "INCORRECT";
  const typed = q.format === "type" || q.format === "reverse" || q.format === "cloze";
  const full = q.format === "cloze" ? `${q.cloze.before} ${q.cloze.word}${q.cloze.suffix} ${q.cloze.after}`.replace(/\s+/g, " ").trim() : q.answer;

  return `
    <h2 class="question">${esc(q.prompt)}</h2>
    <div class="feedback ${fb.ok ? "good" : "bad"}">
      <b class="verdict">${verdict}</b>
      ${typed && fb.response && !fb.ok ? `<p class="lbl">Ta réponse</p><p class="${q.isCode ? "mono" : ""}">${esc(fb.response)}</p>` : ""}
      ${fb.ok && !fb.overridden ? "" : `<p class="lbl">Réponse attendue</p>`}
      ${q.isCode ? `<pre>${esc(full)}</pre>` : `<p class="answer-text">${esc(full)}</p>`}
      ${explain.text ? `<p class="muted">${esc(explain.text)}</p>` : ""}
      ${explain.code ? `<pre>${esc(explain.code)}</pre>` : ""}
      <p class="next-info">${esc(fb.next)}</p>
    </div>
    <div class="row center">
      ${!fb.ok && typed && fb.response ? `<button class="btn" type="button" data-act="override">J'avais juste</button>` : ""}
      <button class="btn primary big" type="button" data-act="next">Suivant <kbd>Entrée</kbd></button>
    </div>`;
}


/* ==========================================================
   4. Onglet "Aujourd'hui"
   ========================================================== */

function todayTab() {
  const required = requiredDecks();
  const done = partsDone();
  const today = dailyStats();
  const pct = required.length ? done / required.length : 0;
  const due = dueCards(deckKeys()).length;
  const rate = retention(7);
  const circumference = 2 * Math.PI * 52;

  const partCard = key => {
    const deck = deckOf(key);
    const part = getPart(key);
    const cards = part.ids.map(id => findCard(key, id)).filter(Boolean);
    const fresh = cards.filter(card => card.stage === "new" || !part.scheduled.includes(card.id) && card.stage === "new").length;
    const started = part.scheduled.length > 0 || part.round > 1;
    const must = required.includes(key);

    let status = `${part.ids.length} cartes · ${part.ids.length - fresh} révision(s) + ${fresh} nouvelle(s)`;
    let button = `<button class="btn primary" type="button" data-act="start" data-deck="${key}">${started ? "Continuer" : "Commencer"}</button>`;

    if (started && !part.done) status = `En cours · manche ${part.round} · ${part.scheduled.length}/${part.ids.length} cartes vues`;

    if (part.done) {
      status = `Terminée ✓ · ${part.round} manche${part.round > 1 ? "s" : ""}`;
      button = `<button class="btn" type="button" data-act="bonus" data-deck="${key}">${partSize()} autres cartes</button>`;
    }

    return `
      <div class="part ${part.done ? "done" : ""}">
        <div class="part-main">
          <strong>${esc(deck.label)}</strong>
          <span class="muted">${esc(status)}</span>
          <span class="pills">${must ? `<span class="pill gold">Quête du jour</span>` : `<span class="pill">Bonus</span>`}<span class="pill">${esc(STATS[deck.stat].label)}</span></span>
        </div>
        ${button}
      </div>`;
  };

  return `
    <section class="win">
      <span class="win-t">Parties du jour</span>

      <div class="today-grid">
        <div class="ring-box">
          <svg viewBox="0 0 120 120" class="ring-svg" role="img" aria-label="Parties terminées aujourd'hui">
            <circle cx="60" cy="60" r="52" class="ring-bg"/>
            <circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="${(circumference * pct).toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 60 60)"/>
          </svg>
          <div class="ring-text"><b>${done}</b><span>/ ${required.length} parties</span></div>
        </div>

        <div class="today-info">
          <div class="grid3 compact">
            <div class="mini ${due ? "gold" : ""}"><b>${due}</b><span>à revoir</span></div>
            <div class="mini"><b>${learnStreak()}</b><span>jours d'affilée</span></div>
            <div class="mini"><b>${Math.round(today.sec / 60)}</b><span>min aujourd'hui</span></div>
          </div>
          <p class="muted">${rate === null ? "Pas encore de statistiques : lance ta première partie." : `Réussite sur 7 jours : ${rate}%`}</p>
          <div class="parts">${partDecks().map(partCard).join("")}</div>
        </div>
      </div>
    </section>

    <section class="win">
      <span class="win-t">Comment ça marche</span>
      <ul class="how">
        <li><b>Une partie par sujet :</b> ${partSize()} cartes (quelques révisions + des nouvelles). Chaque jour, ce sont d'autres cartes.</li>
        <li><b>Une erreur ? La carte revient :</b> quelques questions plus tard, jusqu'à ce que tu la réussisses.</li>
        <li><b>Manche suivante :</b> dès que tout est réussi, on repasse les ${partSize()} cartes. La partie est gagnée quand une manche est 100 % juste du premier coup.</li>
        <li><b>Questions variées :</b> QCM, vrai/faux, réponse libre, texte à trous, sens inverse. Les cartes réussies reviennent aux bons moments (répétition espacée).</li>
      </ul>
      <form class="row wrap" data-form="goal">
        <label>Cartes par partie<input name="partSize" type="number" min="5" max="40" value="${S.learn.settings.partSize}"></label>
        <label>Dont révisions (max)<input name="reviews" type="number" min="0" max="20" value="${S.learn.settings.reviewsPerPart}"></label>
        <button class="btn small" type="submit">Enregistrer</button>
      </form>
    </section>`;
}


/* ==========================================================
   5. Onglet "Paquets"
   ========================================================== */

function stateLabel(card) {
  if (card.stage === "new") return "Nouvelle";
  if (card.stage === "learn" || card.relearn) return "En cours";
  if (card.interval >= 21) return "Maîtrisée";

  return `J+${card.interval}`;
}


function decksTab() {
  const keys = deckKeys();
  if (!S.learn.decks[learnDeckSel]) learnDeckSel = keys[0];

  const deck = deckOf(learnDeckSel);

  const overview = keys.map(key => {
    const counts = deckCounts(key);
    const info = S.learn.decks[key];

    return `
      <button type="button" class="deck-card ${key === learnDeckSel ? "sel" : ""}" data-act="deck" data-deck="${key}">
        <strong>${esc(info.label)}</strong>
        <span>${counts.total} cartes · ${counts.due} à revoir</span>
        ${maturityBar(counts)}
      </button>`;
  }).join("");

  const cards = deck.cards.slice(0, 250);

  return `
    <section class="win">
      <span class="win-t">Mes sujets</span>
      <div class="deck-grid">${overview}</div>
      <div class="row">
        <button class="btn" type="button" data-act="new-deck">+ Nouveau sujet</button>
      </div>
    </section>

    <section class="win">
      <span class="win-t">${esc(deck.label)}</span>
      <div class="row wrap">
        <button class="btn primary" type="button" data-act="add-card">+ Ajouter une carte</button>
        <button class="btn" type="button" data-act="import">Importer une liste</button>
        <button class="btn" type="button" data-act="reset-deck">Remettre à zéro la progression</button>
        ${deck.custom ? `<button class="btn danger" type="button" data-act="del-deck">Supprimer le sujet</button>` : ""}
      </div>
      <input class="search" id="cardSearch" placeholder="Rechercher une carte..." aria-label="Rechercher une carte">
      <div id="cardList">
        ${cards.map(cardRow).join("") || `<p class="muted">Aucune carte. Ajoute-en une ou importe une liste.</p>`}
        ${deck.cards.length > cards.length ? `<p class="muted">${deck.cards.length - cards.length} autres cartes (utilise la recherche).</p>` : ""}
      </div>
    </section>`;
}


function maturityBar(counts) {
  const total = Math.max(1, counts.total);
  const part = value => `${(value / total) * 100}%`;

  return `
    <span class="mat" aria-hidden="true">
      <i class="m-new" style="width:${part(counts.fresh)}"></i>
      <i class="m-learn" style="width:${part(counts.learning)}"></i>
      <i class="m-young" style="width:${part(counts.young)}"></i>
      <i class="m-mature" style="width:${part(counts.mature)}"></i>
    </span>`;
}


function cardRow(card) {
  const text = `${card.q} ${card.a} ${card.code} ${card.tag}`.toLowerCase();

  return `
    <div class="card-row" data-text="${esc(text)}">
      <div class="card-main">
        <strong>${esc(card.q)}</strong>
        <span class="muted">${esc(card.a)}</span>
        ${card.code ? `<pre>${esc(card.code)}</pre>` : ""}
      </div>
      <div class="card-side">
        <span class="pill ${card.leech ? "red" : card.stage === "new" ? "" : "gold"}">${card.leech ? "Difficile" : stateLabel(card)}</span>
        <button class="btn small" type="button" data-act="edit-card" data-id="${card.id}">Modifier</button>
      </div>
    </div>`;
}


function filterCards(root) {
  const text = $("#cardSearch", root).value.toLowerCase();

  $$(".card-row", root).forEach(row => {
    row.hidden = !row.dataset.text.includes(text);
  });
}


/* ==========================================================
   6. Onglet "Stats"
   ========================================================== */

function statsTab() {
  const counts = allCounts();
  const rate = retention(7);
  const days = forecast(14);
  const peak = Math.max(5, ...days);
  const today = dayKey();
  const history = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const minutes = history.map(key => Math.round((S.learn.daily[key]?.sec || 0) / 60));
  const minutePeak = Math.max(S.learn.settings.minutes, ...minutes);
  const leeches = deckKeys().flatMap(key => S.learn.decks[key].cards.filter(card => card.leech).map(card => ({ key, card })));
  const progress = clamp(S.english.lastScore / Math.max(1, S.english.target), 0, 1);

  return `
    <section class="win">
      <span class="win-t">Mémoire</span>
      <div class="grid3 compact">
        <div class="mini"><b>${counts.total}</b><span>cartes</span></div>
        <div class="mini"><b>${counts.mature}</b><span>maîtrisées</span></div>
        <div class="mini ${rate !== null && rate < 70 ? "gold" : ""}"><b>${rate === null ? "–" : rate + "%"}</b><span>réussite 7 j</span></div>
      </div>

      <p class="lbl">Répartition</p>
      <div class="legend">
        <span><i class="m-new"></i>Nouvelles ${counts.fresh}</span>
        <span><i class="m-learn"></i>En cours ${counts.learning}</span>
        <span><i class="m-young"></i>Récentes ${counts.young}</span>
        <span><i class="m-mature"></i>Maîtrisées ${counts.mature}</span>
      </div>
      ${maturityBar(counts)}
    </section>

    <section class="win">
      <span class="win-t">Temps d'apprentissage · 14 jours</span>
      <div class="spark tall">
        ${minutes.map((value, i) => `<div class="col" title="${esc(fmtShort(history[i]))} : ${value} min"><i class="${value >= S.learn.settings.minutes ? "ok" : ""}" style="height:${Math.max(4, (value / minutePeak) * 100)}%"></i><span>${DAY_SHORT[weekdayOf(history[i])].slice(0, 1)}</span></div>`).join("")}
      </div>
    </section>

    <section class="win">
      <span class="win-t">Cartes à revoir · 14 prochains jours</span>
      <div class="spark tall">
        ${days.map((value, i) => `<div class="col" title="${esc(fmtShort(addDays(today, i)))} : ${value} carte(s)"><b>${value || ""}</b><i style="height:${Math.max(4, (value / peak) * 100)}%"></i><span>${i === 0 ? "A" : DAY_SHORT[weekdayOf(addDays(today, i))].slice(0, 1)}</span></div>`).join("")}
      </div>
    </section>

    ${leeches.length ? `
    <section class="win">
      <span class="win-t">Cartes difficiles</span>
      <p class="muted">Ratées plusieurs fois. Reformule-les ou ajoute une note pour mieux les retenir.</p>
      ${leeches.slice(0, 12).map(({ key, card }) => `
        <div class="card-row"><div class="card-main"><strong>${esc(card.q)}</strong><span class="muted">${esc(answerOf(card, S.learn.decks[key]))}</span></div>
        <div class="card-side"><span class="pill red">${card.lapses} échecs</span></div></div>`).join("")}
    </section>` : ""}

    <section class="win">
      <span class="win-t">Anglais · score TOEIC</span>
      <form data-form="toeic" class="row wrap">
        <label>Dernier score<input name="score" type="number" min="0" max="990" value="${S.english.lastScore}"></label>
        <label>Objectif<input name="target" type="number" min="0" max="990" value="${S.english.target}"></label>
        <button class="btn small" type="submit">Enregistrer</button>
      </form>
      <div class="bar"><i style="width:${progress * 100}%"></i></div>
      <p class="muted">${S.english.lastScore} / ${S.english.target} (barème sur 990)</p>
    </section>`;
}


/* ==========================================================
   7. Clics et formulaires de la page
   ========================================================== */

function learnClick(event, root) {
  const target = event.target.closest("[data-act]");
  if (!target) return;

  const act = target.dataset.act;
  const s = learnSession;

  // ----- Pendant la séance -----
  if (s) {
    if (act === "opt") submitAnswer(s.q.options[Number(target.dataset.i)]);
    if (act === "tf") submitAnswer(target.dataset.v);
    if (act === "reveal") { s.revealed = true; refresh(); }
    if (act === "rate") submitAnswer(target.dataset.r);
    if (act === "hint") { s.hinted = true; refresh(); }
    if (act === "giveup") submitAnswer("");
    if (act === "next") advanceLearn();
    if (act === "override") overrideAnswer();
    if (act === "stop") endLearn();

    return;
  }

  // ----- Hors séance -----
  if (act === "tab") { learnTab = target.dataset.tab; Sound.play("click"); refresh(); }
  if (act === "start") startLearn(target.dataset.deck);
  if (act === "bonus") startLearn(target.dataset.deck, true);

  if (act === "deck") { learnDeckSel = target.dataset.deck; refresh(); }
  if (act === "add-card") openCardForm();
  if (act === "edit-card") openCardForm(target.dataset.id);
  if (act === "import") openImportForm();
  if (act === "new-deck") openDeckForm();

  if (act === "reset-deck") {
    askConfirm("Remettre toutes les cartes de ce sujet comme nouvelles ?", () => {
      const deck = deckOf(learnDeckSel);
      deck.cards = deck.cards.map(card => makeCard({ ...card, wrongs: card.wrongs, alts: card.alts }));
      save();
      refresh();
    }, "Remettre à zéro");
  }

  if (act === "del-deck") {
    askConfirm("Supprimer ce sujet et toutes ses cartes ?", () => {
      delete S.learn.decks[learnDeckSel];
      learnDeckSel = "";
      save();
      refresh();
    }, "Supprimer");
  }
}


function learnSubmit(event) {
  event.preventDefault();

  const form = event.target.closest("form[data-form]");
  if (!form) return;

  const data = formData(form);

  if (form.dataset.form === "answer") {
    const typed = (data.r || "").trim();

    if (!typed) { toast("Tape une réponse, ou clique sur « Je ne sais pas »"); return; }

    submitAnswer(typed);
  }

  if (form.dataset.form === "goal") {
    S.learn.settings.partSize = clamp(Number(data.partSize) || 15, 5, 40);
    S.learn.settings.reviewsPerPart = clamp(Number(data.reviews) || 0, 0, 20);
    save();
    toast("Enregistré");
    refresh();
  }

  if (form.dataset.form === "toeic") {
    S.english.lastScore = clamp(Number(data.score) || 0, 0, 990);
    S.english.target = clamp(Number(data.target) || 0, 0, 990);
    save();
    toast("Score enregistré");
    refresh();
  }
}


/* ==========================================================
   8. Formulaires : carte, import, nouveau sujet
   ========================================================== */

function lines(text) {
  return String(text || "").split("\n").map(line => line.trim()).filter(Boolean);
}


function openCardForm(id) {
  const deck = deckOf(learnDeckSel);
  const existing = id ? deck.cards.find(card => card.id === id) : null;
  const card = existing || { q: "", a: "", code: "", note: "", alts: [], wrongs: [], tag: "" };

  openModal({
    title: existing ? "Modifier la carte" : "Nouvelle carte",
    wide: true,
    body: `
      <form class="form">
        <label>Question<textarea name="q" required rows="2" maxlength="300">${esc(card.q)}</textarea></label>
        <label>${deck.codeIsAnswer ? "Explication courte" : "Réponse"}<textarea name="a" ${deck.codeIsAnswer ? "" : "required"} rows="2" maxlength="500">${esc(card.a)}</textarea></label>
        <label>${deck.codeIsAnswer ? "Commande à retrouver" : "Code (facultatif)"}<textarea name="code" ${deck.codeIsAnswer ? "required" : ""} rows="2" maxlength="600" class="mono">${esc(card.code)}</textarea></label>
        <label>Note pour mieux retenir (facultatif)<input name="note" maxlength="300" value="${esc(card.note)}"></label>
        <label>Autres façons de poser la question (une par ligne, facultatif)<textarea name="alts" rows="2">${esc(card.alts.join("\n"))}</textarea></label>
        <label>Mauvaises réponses pour les QCM (une par ligne, facultatif : sinon prises dans le sujet)<textarea name="wrongs" rows="2">${esc(card.wrongs.join("\n"))}</textarea></label>
        <div class="row end">
          ${existing ? `<button class="btn danger" type="button" data-del>Supprimer</button>` : ""}
          <button class="btn primary" type="submit">${existing ? "Enregistrer" : "Ajouter"}</button>
        </div>
      </form>`,
    onMount: root => {
      const form = $("form", root);

      form.addEventListener("submit", event => {
        event.preventDefault();
        const data = formData(form);

        const fields = {
          q: data.q.trim(), a: data.a.trim(), code: data.code.trim(), note: data.note.trim(),
          alts: lines(data.alts), wrongs: lines(data.wrongs)
        };

        if (existing) Object.assign(existing, fields);
        else deck.cards.unshift(makeCard(fields));

        save();
        closeModal();
        Sound.play("click");
        refresh();
      });

      const del = $("[data-del]", form);
      if (del) del.addEventListener("click", () => {
        deck.cards = deck.cards.filter(item => item.id !== existing.id);
        save();
        closeModal();
        refresh();
      });
    }
  });
}


function openImportForm() {
  const deck = deckOf(learnDeckSel);

  openModal({
    title: `Importer dans « ${deck.label} »`,
    wide: true,
    body: `
      <form class="form">
        <p class="muted">Une carte par ligne : <code>question ; réponse</code> (ou avec une tabulation, ou « | »). Tu peux coller depuis un tableur.</p>
        <textarea name="list" rows="9" required class="mono" placeholder="Capitale de l'Australie ; Canberra&#10;Qu'est-ce qu'un hash ; Une empreinte à sens unique"></textarea>
        <div class="row end"><button class="btn primary" type="submit">Importer</button></div>
      </form>`,
    onMount: root => {
      $("form", root).addEventListener("submit", event => {
        event.preventDefault();
        const text = formData(event.target).list;
        let added = 0;

        for (const line of lines(text)) {
          const parts = line.split(/\s*(?:\t|::|;|\|)\s*/);
          if (parts.length < 2 || !parts[0] || !parts[1]) continue;

          const fields = deck.codeIsAnswer ? { q: parts[0], a: "", code: parts[1], note: parts[2] || "" } : { q: parts[0], a: parts[1], note: parts[2] || "" };
          deck.cards.push(makeCard(fields));
          added++;
        }

        save();
        closeModal();
        toast(`${added} carte(s) importée(s)`);
        refresh();
      });
    }
  });
}


function openDeckForm() {
  openModal({
    title: "Nouveau sujet",
    body: `
      <form class="form">
        <label>Nom du sujet<input name="label" required maxlength="40" placeholder="Ex : Réseaux, Droit du numérique, Espagnol..."></label>
        <label>Stat qui monte<select name="stat">${statOptions("INT")}</select></label>
        <label class="inline"><input type="checkbox" name="reversible"> Vocabulaire (poser aussi dans l'autre sens)</label>
        <div class="row end"><button class="btn primary" type="submit">Créer</button></div>
      </form>`,
    onMount: root => {
      $("form", root).addEventListener("submit", event => {
        event.preventDefault();
        const data = formData(event.target);
        const key = `c-${uid()}`;

        S.learn.decks[key] = { label: data.label.trim(), stat: data.stat, codeIsAnswer: false, reversible: Boolean(data.reversible), custom: true, cards: [] };
        learnDeckSel = key;
        save();
        closeModal();
        Sound.play("click");
        refresh();
        toast("Sujet créé : ajoute tes premières cartes");
      });
    }
  });
}
