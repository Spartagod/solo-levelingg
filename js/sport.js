/* ==========================================================
   SPORT.JS : validation des séances de salle + suivi
   ========================================================== */


const GYM_TYPES = ["Musculation", "Cardio", "Haut du corps", "Bas du corps", "Autre"];


function gymDoneToday() {
  return S.gym.log.some(entry => entry.day === dayKey());
}


function validateGym(type, note) {
  if (gymDoneToday()) return;

  const quest = S.quests.templates.find(item => item.special === "gym");
  const xp = quest ? quest.xp : 50;

  S.gym.log.push({ day: dayKey(), type, note: note || "" });
  save();

  addXp(xp, "FOR", "Séance de sport");
  notify({ title: "SÉANCE VALIDÉE", lines: [`${type} : +${xp} XP (FOR)`, "Le corps se renforce."] });
}


// Séances de la semaine (lundi à dimanche) contenant la clé donnée
function gymCountInWeek(key) {
  const monday = mondayOf(key);
  const sunday = addDays(monday, 6);

  return S.gym.log.filter(entry => entry.day >= monday && entry.day <= sunday).length;
}


// Nombre de semaines d'affilée où l'objectif est atteint (semaine en cours incluse si atteint)
function gymWeekStreak() {
  let streak = 0;
  let key = dayKey();

  if (gymCountInWeek(key) < S.gym.weeklyGoal) key = addDays(key, -7);

  while (gymCountInWeek(key) >= S.gym.weeklyGoal) {
    streak++;
    key = addDays(key, -7);
  }

  return streak;
}


/* ==========================================================
   VUE : page "Sport"
   ========================================================== */

function renderSport(root) {
  const today = dayKey();
  const done = gymDoneToday();
  const weekCount = gymCountInWeek(today);
  const recent = [...S.gym.log].reverse().slice(0, 8);

  root.innerHTML = `
    <section class="win center-win">
      <span class="win-t">Entraînement</span>

      <p class="muted">${done ? "La séance du jour est validée." : "Séance faite ? Valide-la pour gagner de l'XP de Force."}</p>

      <form class="gym-form">
        <select name="type" ${done ? "disabled" : ""}>${GYM_TYPES.map(t => `<option>${t}</option>`).join("")}</select>
        <input name="note" maxlength="80" placeholder="Note (facultatif)" ${done ? "disabled" : ""}>
        <button class="btn primary big" type="submit" ${done ? "disabled" : ""}>${done ? "SÉANCE VALIDÉE ✓" : "VALIDER LA SÉANCE"}</button>
      </form>
    </section>

    <div class="grid3">
      <section class="win tile"><span class="win-t">Cette semaine</span>
        <b class="big-num">${weekCount}/${S.gym.weeklyGoal}</b><div class="bar"><i style="width:${clamp(weekCount / S.gym.weeklyGoal, 0, 1) * 100}%"></i></div></section>
      <section class="win tile"><span class="win-t">Semaines d'affilée</span>
        <b class="big-num">${gymWeekStreak()}</b><p class="muted">objectif atteint</p></section>
      <section class="win tile"><span class="win-t">Total</span>
        <b class="big-num">${S.gym.log.length}</b><p class="muted">séances</p></section>
    </div>

    <section class="win">
      <span class="win-t">12 dernières semaines</span>
      <div class="heat">${heatmap()}</div>
    </section>

    <section class="win">
      <span class="win-t">Historique</span>
      ${recent.map(entry => `
        <div class="logrow"><span>${esc(fmtLong(entry.day))}</span><span>${esc(entry.type)}${entry.note ? " · " + esc(entry.note) : ""}</span></div>`).join("") || `<p class="muted">Aucune séance pour le moment.</p>`}
    </section>`;

  $(".gym-form", root).addEventListener("submit", event => {
    event.preventDefault();
    const data = formData(event.target);

    Sound.play("click");
    validateGym(data.type, data.note.trim());
    refresh();
  });
}


function heatmap() {
  const start = addDays(mondayOf(dayKey()), -7 * 11);
  const columns = [];

  for (let week = 0; week < 12; week++) {
    let cells = "";

    for (let day = 0; day < 7; day++) {
      const key = addDays(start, week * 7 + day);
      const hit = S.gym.log.some(entry => entry.day === key);
      const future = key > dayKey();

      cells += `<i class="${hit ? "hit" : ""} ${future ? "future" : ""}" title="${esc(fmtLong(key))}"></i>`;
    }

    columns.push(`<div class="hcol">${cells}</div>`);
  }

  return columns.join("");
}
