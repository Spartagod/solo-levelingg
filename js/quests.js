/* ==========================================================
   QUESTS.JS : quêtes quotidiennes + zone de pénalité
   ----------------------------------------------------------
   - questsForDay()   les quêtes d'un jour donné
   - completeQuest()  valide une quête et donne l'XP
   - checkAutoQuests() valide seules les quêtes liées aux révisions
   - runPenaltyCheck() pénalité pour les quêtes obligatoires manquées
   ========================================================== */


function questsForDay(key = dayKey()) {
  return S.quests.templates.filter(quest => !quest.days || quest.days.includes(weekdayOf(key)));
}


function isQuestDone(quest, key = dayKey()) {
  if (quest.special === "gym") return S.gym.log.some(entry => entry.day === key);

  return Boolean(S.quests.days[key]?.done?.[quest.id]);
}


// Progression d'une quête automatique : { label, met }
// Quête d'apprentissage : une partie terminée pour chaque sujet obligatoire
function questProgress(quest) {
  if (!quest.auto || !quest.auto.learn) return null;

  const total = requiredDecks().length;
  const done = partsDone();

  return { label: `${done}/${total} parties`, met: total > 0 && done >= total };
}


function completeQuest(id, key = dayKey()) {
  const quest = S.quests.templates.find(item => item.id === id);
  if (!quest || isQuestDone(quest, key)) return;

  if (!S.quests.days[key]) S.quests.days[key] = { done: {} };
  S.quests.days[key].done[id] = true;
  save();

  addXp(quest.xp, quest.stat, quest.title);

  notify({
    title: "QUÊTE ACCOMPLIE",
    lines: [quest.title, `Récompense : +${quest.xp} XP`]
  });

  // Toutes les quêtes obligatoires faites : bonus de Vitalité
  if (key === dayKey() && allRequiredDone(key) && !S.quests.days[key].bonus) {
    S.quests.days[key].bonus = true;
    save();
    addXp(20, "VIT", "Journée complète");
    notify({ title: "JOURNÉE COMPLÈTE", lines: ["Toutes les quêtes obligatoires sont accomplies.", "Bonus : +20 XP (VIT)"] });
  }
}


function allRequiredDone(key = dayKey()) {
  return questsForDay(key).filter(q => q.required).every(q => isQuestDone(q, key));
}


function remainingRequired(key = dayKey()) {
  return questsForDay(key).filter(q => q.required && !isQuestDone(q, key));
}


function checkAutoQuests() {
  const key = dayKey();

  for (const quest of questsForDay(key)) {
    if (!quest.auto || isQuestDone(quest, key)) continue;

    const progress = questProgress(quest, key);
    if (progress && progress.met) completeQuest(quest.id, key);
  }
}


/* ---------- Zone de pénalité ---------- */

function runPenaltyCheck() {
  const today = dayKey();
  const last = S.quests.lastCheck;

  S.quests.lastCheck = today;
  save();

  if (!last || last >= today || !S.settings.penalties) return;

  // On regarde au maximum les 3 derniers jours manqués
  const first = diffDays(today, last) > 3 ? addDays(today, -3) : last;
  let missedCount = 0;

  for (let key = first; key < today; key = addDays(key, 1)) {
    missedCount += questsForDay(key).filter(q => q.required && !isQuestDone(q, key)).length;
  }

  if (missedCount === 0) return;

  const lost = losePenaltyXp(missedCount * CONFIG.penaltyXp);

  notify({
    kind: "warn",
    title: "ZONE DE PÉNALITÉ",
    lines: [`${missedCount} quête(s) obligatoire(s) non accomplie(s).`, lost ? `Pénalité : -${lost} XP` : "Aucune XP perdue : tu es au début de ton niveau."]
  });
}


/* ---------- Série de jours parfaits ---------- */

function perfectStreak() {
  let streak = 0;
  let key = dayKey();

  // Aujourd'hui compte seulement s'il est déjà complet
  if (!allRequiredDone(key)) key = addDays(key, -1);

  while (S.quests.days[key]?.bonus) {
    streak++;
    key = addDays(key, -1);
  }

  return streak;
}


/* ==========================================================
   VUE : page "Quêtes"
   ========================================================== */

function renderQuests(root) {
  const key = dayKey();
  const quests = questsForDay(key);
  const doneCount = quests.filter(q => isQuestDone(q, key)).length;
  const pct = quests.length ? Math.round((doneCount / quests.length) * 100) : 0;

  root.innerHTML = `
    <section class="win">
      <span class="win-t">Quêtes quotidiennes</span>

      <div class="quest-head">
        <div>
          <h2>${esc(fmtLong(key))}</h2>
          <p class="muted">${doneCount}/${quests.length} accomplies · série parfaite : ${perfectStreak()} jour(s)</p>
        </div>
        <button class="btn" type="button" data-act="add">+ Nouvelle quête</button>
      </div>

      <div class="bar"><i style="width:${pct}%"></i></div>

      <div class="quest-list">
        ${quests.map(quest => questRow(quest, key)).join("") || `<p class="muted">Aucune quête aujourd'hui.</p>`}
      </div>

      <p class="note">Les quêtes obligatoires manquées font perdre ${CONFIG.penaltyXp} XP chacune (désactivable dans Réglages).</p>
    </section>

    <section class="win">
      <span class="win-t">7 derniers jours</span>
      <div class="history">${historyDots()}</div>
    </section>`;

  root.onclick = event => {
    const button = event.target.closest("[data-act]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.act;

    if (action === "add") openQuestForm();
    if (action === "done") { Sound.play("click"); completeQuest(id); refresh(); }
    if (action === "gym") go("sport");
    if (action === "study") { revTab = "today"; go("revisions"); }
    if (action === "del") {
      askConfirm("Supprimer cette quête ?", () => {
        S.quests.templates = S.quests.templates.filter(item => item.id !== id);
        save();
        refresh();
      }, "Supprimer");
    }
  };
}


function questRow(quest, key) {
  const done = isQuestDone(quest, key);
  const progress = questProgress(quest, key);

  let action = `<button class="btn small primary" type="button" data-act="done" data-id="${quest.id}">Valider</button>`;

  if (quest.special === "gym") {
    action = `<button class="btn small primary" type="button" data-act="gym">Aller à la séance</button>`;
  } else if (quest.auto) {
    action = `<button class="btn small" type="button" data-act="study">Jouer</button>`;
  }

  return `
    <div class="quest ${done ? "done" : ""}">
      <span class="check">${done ? "✓" : ""}</span>
      <div class="quest-main">
        <strong>${esc(quest.title)}</strong>
        <div class="pills">
          <span class="pill">+${quest.xp} XP · ${quest.stat}</span>
          <span class="pill">${quest.minutes} min</span>
          <span class="pill ${quest.required ? "red" : ""}">${quest.required ? "Obligatoire" : "Bonus"}</span>
          ${progress && !done ? `<span class="pill gold">${esc(progress.label)}</span>` : ""}
        </div>
      </div>
      <div class="quest-side">
        ${done ? `<span class="done-tag">ACCOMPLIE</span>` : action}
        <button class="icon-btn" type="button" data-act="del" data-id="${quest.id}" aria-label="Supprimer la quête">×</button>
      </div>
    </div>`;
}


function historyDots() {
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const key = addDays(dayKey(), -i);
    const list = questsForDay(key);
    const done = list.filter(q => isQuestDone(q, key)).length;
    const state = !list.length || key < S.created ? "" : done === list.length ? "full" : done > 0 ? "part" : "none";

    days.push(`
      <div class="hday ${state}">
        <span>${DAY_SHORT[weekdayOf(key)]}</span>
        <b>${key < S.created ? "–" : `${done}/${list.length}`}</b>
      </div>`);
  }

  return days.join("");
}


function openQuestForm() {
  openModal({
    title: "Nouvelle quête",
    body: `
      <form class="form">
        <label>Titre<input name="title" required maxlength="80" placeholder="Ex : Lire un writeup"></label>
        <div class="row">
          <label>XP<input name="xp" type="number" min="5" max="200" value="30"></label>
          <label>Stat<select name="stat">${statOptions("INT")}</select></label>
          <label>Minutes<input name="minutes" type="number" min="5" max="300" value="30"></label>
        </div>
        <label class="inline"><input type="checkbox" name="required"> Obligatoire (pénalité si manquée)</label>
        <div><span class="lbl">Jours (aucun coché = tous les jours)</span><div class="chips">${dayCheckboxes([])}</div></div>
        <div class="row end"><button class="btn primary" type="submit">Ajouter</button></div>
      </form>`,
    onMount: root => {
      $("form", root).addEventListener("submit", event => {
        event.preventDefault();
        const data = formData(event.target);
        const days = checkedDays(event.target);

        S.quests.templates.push({
          id: uid(),
          title: data.title.trim(),
          xp: clamp(Number(data.xp) || 30, 5, 200),
          stat: data.stat,
          minutes: clamp(Number(data.minutes) || 30, 5, 300),
          required: Boolean(data.required),
          ...(days.length ? { days } : {})
        });

        save();
        closeModal();
        Sound.play("click");
        refresh();
      });
    }
  });
}
