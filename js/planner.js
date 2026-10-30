/* ==========================================================
   PLANNER.JS : emploi du temps + optimiseur de journée
   ----------------------------------------------------------
   Un événement a soit une date précise (date: "2026-10-30"),
   soit des jours de répétition chaque semaine (days: [1, 3, 5]).
   ========================================================== */


const TIMELINE_START = 6;     // heure de début de la grille
const TIMELINE_END = 24;
const HOUR_HEIGHT = 64;       // pixels par heure

let plannerDate = dayKey();


function eventOccursOn(event, key) {
  if (event.date) return event.date === key;

  return Boolean(event.days && event.days.includes(weekdayOf(key)));
}


function eventsOn(key) {
  return S.events
    .filter(event => eventOccursOn(event, key))
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}


/* ---------- Placement des blocs qui se chevauchent ---------- */

function layoutEvents(list) {
  const items = list.map(event => ({ event, start: toMin(event.start), end: toMin(event.end), lane: 0, lanes: 1 }));
  let cluster = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    const lanes = Math.max(1, ...cluster.map(item => item.lane + 1));
    cluster.forEach(item => { item.lanes = lanes; });
    cluster = [];
  };

  for (const item of items) {
    if (cluster.length && item.start >= clusterEnd) closeCluster();

    const used = cluster.filter(other => other.end > item.start).map(other => other.lane);
    while (used.includes(item.lane)) item.lane++;

    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }

  closeCluster();

  return items;
}


/* ==========================================================
   VUE : page "Planning"
   ========================================================== */

function renderPlanner(root) {
  const monday = mondayOf(plannerDate);
  const today = dayKey();

  const strip = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(monday, i);
    const count = eventsOn(key).length;

    return `
      <button type="button" class="dbtn ${key === plannerDate ? "sel" : ""} ${key === today ? "today" : ""}" data-act="pick" data-date="${key}">
        <span>${DAY_SHORT[weekdayOf(key)]}</span>
        <b>${parseKey(key).getDate()}</b>
        <em>${count ? count + " bloc" + (count > 1 ? "s" : "") : "libre"}</em>
      </button>`;
  }).join("");

  root.innerHTML = `
    <section class="win">
      <span class="win-t">Emploi du temps</span>

      <div class="plan-head">
        <div class="row">
          <button class="btn small" type="button" data-act="week" data-dir="-1">‹ Semaine</button>
          <button class="btn small" type="button" data-act="today">Aujourd'hui</button>
          <button class="btn small" type="button" data-act="week" data-dir="1">Semaine ›</button>
        </div>
        <div class="row">
          <button class="btn small" type="button" data-act="optimize">⚡ Optimiser la journée</button>
          <button class="btn small primary" type="button" data-act="add">+ Ajouter</button>
        </div>
      </div>

      <div class="week-strip">${strip}</div>
      <h2 class="plan-day">${esc(fmtLong(plannerDate))}</h2>

      <div class="timeline" style="height:${(TIMELINE_END - TIMELINE_START) * HOUR_HEIGHT}px">
        ${timelineGrid()}
        ${layoutEvents(eventsOn(plannerDate)).map(timelineBlock).join("")}
        ${plannerDate === today ? nowLine() : ""}
      </div>
    </section>`;

  root.onclick = event => {
    const button = event.target.closest("[data-act]");
    const block = event.target.closest(".block");

    if (block && !button) { openEventForm(block.dataset.id); return; }
    if (!button) return;

    const action = button.dataset.act;

    if (action === "pick") { plannerDate = button.dataset.date; renderPlanner(root); }
    if (action === "today") { plannerDate = dayKey(); renderPlanner(root); }
    if (action === "week") { plannerDate = addDays(plannerDate, 7 * Number(button.dataset.dir)); renderPlanner(root); }
    if (action === "add") openEventForm();
    if (action === "optimize") openOptimizer();
  };
}


function timelineGrid() {
  let lines = "";

  for (let hour = TIMELINE_START; hour < TIMELINE_END; hour++) {
    lines += `<div class="hline" style="top:${(hour - TIMELINE_START) * HOUR_HEIGHT}px"><span>${pad(hour)}:00</span></div>`;
  }

  return lines;
}


function timelineBlock({ event, start, end, lane, lanes }) {
  const top = ((start - TIMELINE_START * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(22, ((end - start) / 60) * HOUR_HEIGHT - 2);
  const width = 100 / lanes;

  return `
    <button type="button" class="block cat-${event.cat} ${height < 42 ? "short" : ""}" data-id="${event.id}"
            style="top:${top}px;height:${height}px;left:calc(54px + (100% - 58px) * ${lane / lanes});width:calc((100% - 58px) * ${width / 100} - 4px)">
      <b>${esc(event.title)}</b>
      <small>${event.start} – ${event.end} · ${EVENT_CATS[event.cat] || ""}</small>
    </button>`;
}


function nowLine() {
  const top = ((nowMin() - TIMELINE_START * 60) / 60) * HOUR_HEIGHT;

  if (top < 0 || top > (TIMELINE_END - TIMELINE_START) * HOUR_HEIGHT) return "";

  return `<div class="nowline" style="top:${top}px"></div>`;
}


/* ---------- Ajouter / modifier un événement ---------- */

function openEventForm(id) {
  const existing = S.events.find(event => event.id === id);
  const event = existing || { title: "", cat: "etude", start: "18:00", end: "19:00", date: plannerDate, days: [], note: "" };
  const repeating = Boolean(event.days && event.days.length && !event.date);

  openModal({
    title: existing ? "Modifier le bloc" : "Nouveau bloc",
    body: `
      <form class="form">
        <label>Titre<input name="title" required maxlength="80" value="${esc(event.title)}"></label>
        <div class="row">
          <label>Catégorie<select name="cat">${Object.entries(EVENT_CATS).map(([k, v]) => `<option value="${k}" ${k === event.cat ? "selected" : ""}>${v}</option>`).join("")}</select></label>
          <label>Début<input name="start" type="time" required value="${event.start}"></label>
          <label>Fin<input name="end" type="time" required value="${event.end}"></label>
        </div>
        <label class="inline"><input type="checkbox" name="repeat" ${repeating ? "checked" : ""}> Répéter chaque semaine</label>
        <label data-when="date">Date<input name="date" type="date" value="${event.date || plannerDate}"></label>
        <div data-when="days"><span class="lbl">Jours de répétition</span><div class="chips">${dayCheckboxes(event.days || [])}</div></div>
        <label>Note<input name="note" maxlength="120" value="${esc(event.note || "")}"></label>
        <div class="row end">
          ${existing ? `<button class="btn danger" type="button" data-del>Supprimer</button>` : ""}
          <button class="btn primary" type="submit">${existing ? "Enregistrer" : "Ajouter"}</button>
        </div>
      </form>`,
    onMount: root => {
      const form = $("form", root);
      const repeat = $("[name=repeat]", form);

      const sync = () => {
        $("[data-when=date]", form).hidden = repeat.checked;
        $("[data-when=days]", form).hidden = !repeat.checked;
      };

      repeat.addEventListener("change", sync);
      sync();

      form.addEventListener("submit", submitEvent => {
        submitEvent.preventDefault();
        const data = formData(form);
        const days = checkedDays(form);

        if (toMin(data.end) <= toMin(data.start)) { toast("La fin doit être après le début"); return; }
        if (repeat.checked && !days.length) { toast("Choisis au moins un jour"); return; }

        const saved = {
          id: existing ? existing.id : uid(),
          title: data.title.trim(), cat: data.cat, start: data.start, end: data.end, note: data.note.trim(),
          ...(repeat.checked ? { days } : { date: data.date })
        };

        if (existing) {
          S.events[S.events.indexOf(existing)] = saved;
        } else {
          S.events.push(saved);
        }

        save();
        closeModal();
        Sound.play("click");
        refresh();
      });

      const del = $("[data-del]", form);
      if (del) del.addEventListener("click", () => {
        S.events = S.events.filter(item => item.id !== existing.id);
        save();
        closeModal();
        refresh();
      });
    }
  });
}


/* ==========================================================
   OPTIMISEUR : répartit les tâches dans les trous de la journée
   ----------------------------------------------------------
   Ordre de priorité :
   1. les tâches de projets avec échéance (la plus proche d'abord)
   2. les quêtes du jour pas encore faites
   3. les tâches de projets sans échéance
   ========================================================== */

function candidateTasks(key) {
  const today = dayKey();
  const scheduledIds = S.events.filter(e => e.taskRef && e.date >= today).map(e => e.taskRef);
  const tasks = [];

  for (const project of S.projects) {
    for (const task of project.tasks) {
      if (task.done || scheduledIds.includes(task.id)) continue;

      tasks.push({
        ref: task.id, title: `${project.name} : ${task.text}`, minutes: task.minutes || 30,
        rank: project.deadline ? 0 : 2, deadline: project.deadline || "9999", priority: project.priority
      });
    }
  }

  for (const quest of questsForDay(key)) {
    if (quest.special === "gym" || isQuestDone(quest, key)) continue;
    if (S.events.some(e => eventOccursOn(e, key) && e.title.toLowerCase() === quest.title.toLowerCase())) continue;

    tasks.push({ ref: "", title: quest.title, minutes: quest.minutes, rank: 1, deadline: "9999", priority: 2, quest: true });
  }

  return tasks.sort((a, b) => a.rank - b.rank || a.deadline.localeCompare(b.deadline) || a.priority - b.priority);
}


// Calcule les créneaux proposés pour une journée (ne modifie rien)
function planDay(key) {
  const windowStart = toMin(CONFIG.dayStart);
  const windowEnd = toMin(CONFIG.dayEnd);
  const BREAK = 10;

  let cursor = windowStart;
  if (key === dayKey()) cursor = Math.max(cursor, Math.ceil((nowMin() + 5) / 5) * 5);

  const busy = eventsOn(key).map(e => [toMin(e.start), toMin(e.end)]);
  const placed = [];
  const skipped = [];

  for (const task of candidateTasks(key)) {
    let start = cursor;
    let found = false;

    while (start + task.minutes <= windowEnd) {
      const clash = busy.find(([from, to]) => start < to + BREAK && start + task.minutes + BREAK > from);

      if (!clash) { found = true; break; }
      start = Math.ceil((clash[1] + BREAK) / 5) * 5;
    }

    if (!found) { skipped.push(task); continue; }

    busy.push([start, start + task.minutes]);
    placed.push({ ...task, start, end: start + task.minutes });
  }

  return { placed: placed.sort((a, b) => a.start - b.start), skipped };
}


function emptyPlanMessage(plan) {
  if (plannerDate === dayKey() && nowMin() + 5 >= toMin(CONFIG.dayEnd)) {
    return "La journée est terminée. Choisis un autre jour dans la semaine pour l'optimiser.";
  }

  return plan.skipped.length ? "Plus assez de place dans la journée." : "Aucune tâche en attente. Ajoute des tâches dans Projets.";
}


function openOptimizer() {
  const plan = planDay(plannerDate);

  openModal({
    title: "Optimiser la journée",
    wide: true,
    body: `
      <p class="muted">${esc(fmtLong(plannerDate))} · fenêtre ${CONFIG.dayStart} – ${CONFIG.dayEnd}. Les blocs existants ne bougent pas.</p>
      ${plan.placed.map(item => `
        <div class="logrow"><span>${fromMin(item.start)} – ${fromMin(item.end)}</span><span>${esc(item.title)}</span></div>`).join("") || `<p>${emptyPlanMessage(plan)}</p>`}
      ${plan.skipped.length ? `<p class="note">${plan.skipped.length} tâche(s) ne rentrent pas aujourd'hui.</p>` : ""}
      <div class="row end"><button class="btn primary" type="button" data-apply ${plan.placed.length ? "" : "disabled"}>Ajouter au planning</button></div>`,
    onMount: root => {
      $("[data-apply]", root).addEventListener("click", () => {
        for (const item of plan.placed) {
          S.events.push({
            id: uid(), title: item.title, cat: item.quest ? "etude" : "tache",
            start: fromMin(item.start), end: fromMin(item.end), date: plannerDate,
            taskRef: item.ref, note: "Placé par l'optimiseur"
          });
        }

        save();
        closeModal();
        Sound.play("click");
        notify({ title: "PLANNING MIS À JOUR", lines: [`${plan.placed.length} bloc(s) ajouté(s) au ${fmtLong(plannerDate)}.`] });
        refresh();
      });
    }
  });
}
