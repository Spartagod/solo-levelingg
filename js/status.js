/* ==========================================================
   STATUS.JS : la fenêtre de statut (page d'accueil)
   ----------------------------------------------------------
   Niveau, rang, XP, caractéristiques en radar, aperçu du jour
   et XP des 14 derniers jours.
   ========================================================== */


function renderStatus(root) {
  const info = levelInfo();
  const rank = rankOf(info.level);
  const today = dayKey();
  const quests = questsForDay(today);
  const done = quests.filter(q => isQuestDone(q, today)).length;
  const nextEvents = eventsOn(today).filter(e => toMin(e.end) > nowMin()).slice(0, 3);
  const deadlines = upcomingDeadlines().slice(0, 3);

  root.innerHTML = `
    <div class="status-grid">

      <section class="win status-card">
        <span class="win-t">Statut</span>

        <div class="id-row">
          <div class="level-badge"><small>NIVEAU</small><b>${info.level}</b></div>
          <div>
            <h2>${esc(S.player.name)}</h2>
            <p class="muted">${esc(S.player.title)}</p>
            <div class="pills"><span class="pill gold">RANG ${rank.rank}</span><span class="pill">${esc(rank.title)}</span></div>
          </div>
        </div>

        <div class="xp-row">
          <span>XP</span>
          <div class="bar"><i style="width:${Math.round(info.pct * 100)}%"></i></div>
          <b>${info.into}/${info.need}</b>
        </div>

        <div class="stat-body">
          ${radar()}
          <div class="stat-list">
            ${Object.keys(STATS).map(key => `
              <div class="stat"><span title="${esc(STATS[key].hint)}">${key}</span><i></i><b>${statValue(key)}</b></div>`).join("")}
          </div>
        </div>
      </section>

      <div class="status-side">

        <section class="win">
          <span class="win-t">Aujourd'hui</span>
          <p><b>${done}/${quests.length}</b> quêtes accomplies · série parfaite <b>${perfectStreak()}</b></p>
          <div class="bar"><i style="width:${quests.length ? (done / quests.length) * 100 : 0}%"></i></div>
          ${remainingRequired().map(q => `<div class="logrow"><span>${esc(q.title)}</span><span class="red-text">à faire</span></div>`).join("") || `<p class="muted">Toutes les quêtes obligatoires sont faites.</p>`}
        </section>

        <section class="win">
          <span class="win-t">Prochains blocs</span>
          ${nextEvents.map(e => `<div class="logrow"><span>${e.start} – ${e.end}</span><span>${esc(e.title)}</span></div>`).join("") || `<p class="muted">Rien de prévu pour le reste de la journée.</p>`}
        </section>

        <section class="win">
          <span class="win-t">Échéances</span>
          ${deadlines.map(({ project, left }) => `<div class="logrow"><span>${esc(project.name)}</span><span class="${left <= 1 ? "red-text" : ""}">${deadlineLabel(left)}</span></div>`).join("") || `<p class="muted">Aucune échéance en vue.</p>`}
        </section>

      </div>
    </div>

    <section class="win">
      <span class="win-t">XP des 14 derniers jours</span>
      ${xpChart()}
    </section>`;

  root.onclick = null;
  root.onsubmit = null;
}


/* ---------- Radar des 5 caractéristiques (SVG) ---------- */

function radar() {
  const keys = Object.keys(STATS);
  const values = keys.map(statValue);
  const max = Math.max(40, Math.ceil((Math.max(...values) + 5) / 10) * 10);
  const size = 220;
  const center = size / 2;
  const radius = 78;

  const point = (index, ratio) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / keys.length;
    return [center + Math.cos(angle) * radius * ratio, center + Math.sin(angle) * radius * ratio];
  };

  const ring = ratio => keys.map((_, i) => point(i, ratio).join(",")).join(" ");
  const shape = values.map((value, i) => point(i, value / max).join(",")).join(" ");

  return `
    <svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="Radar des caractéristiques">
      ${[0.25, 0.5, 0.75, 1].map(r => `<polygon points="${ring(r)}" class="ring"/>`).join("")}
      ${keys.map((_, i) => { const [x, y] = point(i, 1); return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="ring"/>`; }).join("")}
      <polygon points="${shape}" class="shape"/>
      ${keys.map((key, i) => { const [x, y] = point(i, 1.22); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${key}</text>`; }).join("")}
    </svg>`;
}


/* ---------- Histogramme d'XP ---------- */

function xpChart() {
  const today = dayKey();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));

  const totals = days.map(key => S.xpLog
    .filter(entry => entry.day === key && entry.amount > 0)
    .reduce((sum, entry) => sum + entry.amount, 0));

  const peak = Math.max(50, ...totals);

  return `
    <div class="xpchart">
      ${totals.map((value, i) => `
        <div class="col" title="${esc(fmtShort(days[i]))} : ${value} XP">
          <b>${value || ""}</b>
          <i style="height:${Math.max(3, (value / peak) * 100)}%"></i>
          <span>${DAY_SHORT[weekdayOf(days[i])].slice(0, 1)}</span>
        </div>`).join("")}
    </div>`;
}
