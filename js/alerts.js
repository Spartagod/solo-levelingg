/* ==========================================================
   ALERTS.JS : alertes et rappels
   ----------------------------------------------------------
   Le moteur vérifie toutes les 20 secondes (tant que la page
   est ouverte) :
   1. tes alertes personnalisées (heure précise, répétables)
   2. le début des blocs du planning (rappel X min avant)
   3. les échéances de projets (J-3, J-1 et jour J à 09:00)
   4. un rappel du soir (20:00) s'il reste des quêtes obligatoires
   Chaque alerte ne sonne qu'une fois (S.fired).
   ========================================================== */


function alertOccursOn(alert, key) {
  if (!alert.on) return false;
  if (alert.repeat === "daily") return true;
  if (alert.repeat === "weekly") return (alert.days || []).includes(weekdayOf(key));

  return alert.date === key;
}


function fireOnce(token, options) {
  const fullKey = `${dayKey()}|${token}`;

  if (S.fired[fullKey]) return;

  S.fired[fullKey] = 1;
  save();
  notify(options);
}


function pruneFired() {
  const limit = addDays(dayKey(), -7);

  for (const key of Object.keys(S.fired)) {
    if (key.split("|")[0] < limit) delete S.fired[key];
  }
}


function checkAlerts() {
  const today = dayKey();
  const minutes = nowMin();

  // 1. Alertes personnalisées
  for (const alert of S.alerts) {
    if (!alertOccursOn(alert, today)) continue;

    const at = toMin(alert.time);
    if (minutes < at || minutes - at > 720) continue;

    fireOnce(`alert-${alert.id}`, {
      kind: "warn",
      title: alert.title.toUpperCase(),
      lines: [alert.note || "Rappel programmé.", minutes - at > 5 ? `Prévu à ${alert.time} (manqué)` : `Prévu à ${alert.time}`]
    });
  }

  // 2. Rappel avant les blocs du planning
  if (S.settings.remind) {
    for (const event of eventsOn(today)) {
      const start = toMin(event.start);
      if (minutes < start - S.settings.remindMin || minutes >= toMin(event.end)) continue;

      const left = start - minutes;

      fireOnce(`event-${event.id}`, {
        title: event.title.toUpperCase(),
        lines: [left > 0 ? `Début dans ${left} min (${event.start}).` : `En cours depuis ${event.start}.`]
      });
    }
  }

  // 3. Échéances des projets
  if (minutes >= 9 * 60) {
    for (const project of S.projects) {
      if (!project.deadline || !project.tasks.some(task => !task.done)) continue;

      const left = diffDays(project.deadline, today);
      if (left !== 0 && left !== 1 && left !== 3) continue;

      fireOnce(`deadline-${project.id}`, {
        kind: "warn",
        title: "ÉCHÉANCE",
        lines: [project.name, left === 0 ? "À rendre aujourd'hui." : `À rendre dans ${left} jour(s) (${fmtShort(project.deadline)}).`]
      });
    }
  }

  // 4. Rappel du soir
  if (S.settings.evening && minutes >= 20 * 60) {
    const remaining = remainingRequired(today);

    if (remaining.length) {
      fireOnce("evening", {
        kind: "warn",
        title: "QUÊTES EN ATTENTE",
        lines: [`Il reste ${remaining.length} quête(s) obligatoire(s) :`, remaining.map(q => q.title).join(" · ")]
      });
    }
  }
}


function startAlertEngine() {
  pruneFired();
  checkAlerts();
  setInterval(checkAlerts, 20000);
}


/* ---------- Prochaines échéances (pour le statut et les alertes) ---------- */

function upcomingDeadlines() {
  const today = dayKey();

  return S.projects
    .filter(project => project.deadline && project.tasks.some(task => !task.done))
    .map(project => ({ project, left: diffDays(project.deadline, today) }))
    .sort((a, b) => a.left - b.left);
}


function deadlineLabel(left) {
  if (left < 0) return `En retard de ${-left} j`;
  if (left === 0) return "Aujourd'hui";
  if (left === 1) return "Demain";

  return `J-${left}`;
}


/* ==========================================================
   VUE : page "Alertes"
   ========================================================== */

function renderAlerts(root) {
  const supported = "Notification" in window;
  const granted = supported && Notification.permission === "granted";

  root.innerHTML = `
    <section class="win">
      <span class="win-t">Alertes programmées</span>

      <div class="quest-head">
        <p class="muted">Elles sonnent à l'heure choisie tant que la page est ouverte.</p>
        <button class="btn primary" type="button" data-act="add">+ Nouvelle alerte</button>
      </div>

      ${S.alerts.map(alertRow).join("") || `<p class="muted">Aucune alerte. Crée-en une pour un rendez-vous, un médicament, une deadline...</p>`}
    </section>

    <section class="win">
      <span class="win-t">Échéances de projets</span>
      ${upcomingDeadlines().map(({ project, left }) => `
        <div class="logrow"><span>${esc(project.name)}</span><span class="${left <= 1 ? "red-text" : ""}">${deadlineLabel(left)} · ${esc(fmtShort(project.deadline))}</span></div>`).join("") || `<p class="muted">Aucune échéance. Ajoute une date limite à un projet.</p>`}
      <p class="note">Alerte automatique à J-3, J-1 et le jour J à 09:00.</p>
    </section>

    <section class="win">
      <span class="win-t">Notifications du navigateur</span>
      <p class="muted">${supported ? (granted ? "Activées : tu seras prévenu même si l'onglet est en arrière-plan." : "Désactivées. Active-les pour être prévenu hors de l'onglet.") : "Non disponibles dans ce navigateur."}</p>
      <div class="row">
        <button class="btn" type="button" data-act="perm" ${!supported || granted ? "disabled" : ""}>Activer</button>
        <button class="btn" type="button" data-act="test">Tester une alerte</button>
      </div>
    </section>`;

  root.onclick = event => {
    const button = event.target.closest("[data-act]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.act;

    if (action === "add") openAlertForm();
    if (action === "edit") openAlertForm(id);
    if (action === "toggle") {
      const alert = S.alerts.find(item => item.id === id);
      alert.on = !alert.on;
      save();
      renderAlerts(root);
    }
    if (action === "test") notify({ kind: "warn", title: "TEST D'ALERTE", lines: ["Le Système fonctionne."] });
    if (action === "perm") requestBrowserNotifications(root);
  };
}


function alertRow(alert) {
  const when = alert.repeat === "daily" ? "Chaque jour"
    : alert.repeat === "weekly" ? (alert.days || []).map(d => DAY_SHORT[d]).join(" ")
    : fmtLong(alert.date);

  return `
    <div class="quest ${alert.on ? "" : "off"}">
      <span class="check">${alert.on ? "●" : "○"}</span>
      <div class="quest-main">
        <strong>${esc(alert.title)}</strong>
        <div class="pills"><span class="pill">${alert.time}</span><span class="pill">${esc(when)}</span>${alert.note ? `<span class="pill">${esc(alert.note)}</span>` : ""}</div>
      </div>
      <div class="quest-side">
        <button class="btn small" type="button" data-act="toggle" data-id="${alert.id}">${alert.on ? "Désactiver" : "Activer"}</button>
        <button class="btn small" type="button" data-act="edit" data-id="${alert.id}">Modifier</button>
      </div>
    </div>`;
}


async function requestBrowserNotifications(root) {
  try {
    const result = await Notification.requestPermission();
    S.settings.browserNotif = result === "granted";
    save();
  } catch (error) {
    toast("Autorisation impossible ici");
  }

  renderAlerts(root);
}


function openAlertForm(id) {
  const existing = S.alerts.find(alert => alert.id === id);
  const alert = existing || { title: "", time: "09:00", repeat: "none", date: dayKey(), days: [], note: "", on: true };

  openModal({
    title: existing ? "Modifier l'alerte" : "Nouvelle alerte",
    body: `
      <form class="form">
        <label>Titre<input name="title" required maxlength="60" value="${esc(alert.title)}" placeholder="Ex : Rendez-vous médecin"></label>
        <div class="row">
          <label>Heure<input name="time" type="time" required value="${alert.time}"></label>
          <label>Répétition
            <select name="repeat">
              <option value="none" ${alert.repeat === "none" ? "selected" : ""}>Une seule fois</option>
              <option value="daily" ${alert.repeat === "daily" ? "selected" : ""}>Chaque jour</option>
              <option value="weekly" ${alert.repeat === "weekly" ? "selected" : ""}>Chaque semaine</option>
            </select>
          </label>
        </div>
        <label data-when="date">Date<input name="date" type="date" value="${alert.date || dayKey()}"></label>
        <div data-when="days"><span class="lbl">Jours</span><div class="chips">${dayCheckboxes(alert.days || [])}</div></div>
        <label>Note<input name="note" maxlength="100" value="${esc(alert.note || "")}"></label>
        <div class="row end">
          ${existing ? `<button class="btn danger" type="button" data-del>Supprimer</button>` : ""}
          <button class="btn primary" type="submit">${existing ? "Enregistrer" : "Créer"}</button>
        </div>
      </form>`,
    onMount: root => {
      const form = $("form", root);
      const repeat = $("[name=repeat]", form);

      const sync = () => {
        $("[data-when=date]", form).hidden = repeat.value !== "none";
        $("[data-when=days]", form).hidden = repeat.value !== "weekly";
      };

      repeat.addEventListener("change", sync);
      sync();

      form.addEventListener("submit", submitEvent => {
        submitEvent.preventDefault();
        const data = formData(form);
        const days = checkedDays(form);

        if (data.repeat === "weekly" && !days.length) { toast("Choisis au moins un jour"); return; }

        const saved = {
          id: existing ? existing.id : uid(), on: existing ? existing.on : true,
          title: data.title.trim(), time: data.time, repeat: data.repeat,
          date: data.date, days, note: data.note.trim()
        };

        if (existing) {
          S.alerts[S.alerts.indexOf(existing)] = saved;
        } else {
          S.alerts.push(saved);
        }

        save();
        closeModal();
        Sound.play("click");
        checkAlerts();
        refresh();
      });

      const del = $("[data-del]", form);
      if (del) del.addEventListener("click", () => {
        S.alerts = S.alerts.filter(item => item.id !== existing.id);
        save();
        closeModal();
        refresh();
      });
    }
  });
}
