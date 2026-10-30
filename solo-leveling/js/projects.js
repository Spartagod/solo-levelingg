/* ==========================================================
   PROJECTS.JS : projets, tâches et deadlines (e-todo)
   ----------------------------------------------------------
   Chaque tâche cochée rapporte de l'XP (une seule fois).
   Les durées des tâches servent à l'optimiseur de Planning.
   ========================================================== */


const PRIORITY_LABELS = { 1: "Haute", 2: "Normale", 3: "Basse" };


function taskXp(task) {
  return 10 + Math.round((task.minutes || 30) / 5);
}


function projectProgress(project) {
  if (!project.tasks.length) return 0;

  return project.tasks.filter(task => task.done).length / project.tasks.length;
}


function toggleTask(projectId, taskId) {
  const project = S.projects.find(item => item.id === projectId);
  const task = project.tasks.find(item => item.id === taskId);

  task.done = !task.done;

  // L'XP n'est donnée qu'une fois par tâche
  if (task.done && !task.xpGiven) {
    task.xpGiven = true;
    save();
    addXp(taskXp(task), project.stat, task.text);

    if (project.tasks.every(item => item.done)) {
      addXp(30, "VIT", `Projet terminé : ${project.name}`);
      notify({ title: "PROJET TERMINÉ", lines: [project.name, "Bonus : +30 XP (VIT)"] });
    }
  }

  save();
}


/* ==========================================================
   VUE : page "Projets"
   ========================================================== */

function renderProjects(root) {
  const projects = [...S.projects].sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));

  root.innerHTML = `
    <section class="win">
      <span class="win-t">Projets &amp; tâches</span>
      <div class="quest-head">
        <p class="muted">Ajoute une date limite et une durée par tâche : le Planning s'en sert pour organiser ta journée.</p>
        <button class="btn primary" type="button" data-act="add-project">+ Nouveau projet</button>
      </div>
    </section>

    ${projects.map(projectCard).join("") || `<section class="win"><p class="muted">Aucun projet. Crée le premier.</p></section>`}`;

  root.onclick = event => {
    const target = event.target.closest("[data-act]");
    if (!target) return;

    const action = target.dataset.act;
    const projectId = target.dataset.project;

    if (action === "add-project") openProjectForm();
    if (action === "edit-project") openProjectForm(projectId);
    if (action === "toggle") { toggleTask(projectId, target.dataset.task); refresh(); }
    if (action === "del-task") {
      const project = S.projects.find(item => item.id === projectId);
      project.tasks = project.tasks.filter(task => task.id !== target.dataset.task);
      save();
      refresh();
    }
  };

  root.onsubmit = event => {
    event.preventDefault();
    const form = event.target.closest(".task-form");
    if (!form) return;

    const data = formData(form);
    const project = S.projects.find(item => item.id === form.dataset.project);

    project.tasks.push({ id: uid(), text: data.text.trim(), minutes: clamp(Number(data.minutes) || 30, 5, 480), done: false });
    save();
    Sound.play("click");
    refresh();
  };
}


function projectCard(project) {
  const left = project.deadline ? diffDays(project.deadline, dayKey()) : null;
  const pct = Math.round(projectProgress(project) * 100);
  const urgent = left !== null && left <= 1 && pct < 100;

  return `
    <section class="win project ${urgent ? "urgent" : ""}">
      <span class="win-t">${esc(project.name)}</span>

      <div class="project-head">
        <div class="pills">
          <span class="pill ${project.priority === 1 ? "red" : ""}">Priorité ${PRIORITY_LABELS[project.priority]}</span>
          <span class="pill">${project.stat}</span>
          ${left !== null ? `<span class="pill ${urgent ? "red" : "gold"}">${deadlineLabel(left)} · ${esc(fmtShort(project.deadline))}</span>` : `<span class="pill">Sans échéance</span>`}
          <span class="pill">${pct}%</span>
        </div>
        <button class="btn small" type="button" data-act="edit-project" data-project="${project.id}">Modifier</button>
      </div>

      <div class="bar"><i style="width:${pct}%"></i></div>

      <div class="tasks">
        ${project.tasks.map(task => `
          <div class="task ${task.done ? "done" : ""}">
            <button type="button" class="check" data-act="toggle" data-project="${project.id}" data-task="${task.id}" aria-label="Valider la tâche">${task.done ? "✓" : ""}</button>
            <span class="task-text">${esc(task.text)}</span>
            <span class="pill">${task.minutes} min · +${taskXp(task)} XP</span>
            <button type="button" class="icon-btn" data-act="del-task" data-project="${project.id}" data-task="${task.id}" aria-label="Supprimer la tâche">×</button>
          </div>`).join("")}
      </div>

      <form class="task-form" data-project="${project.id}">
        <input name="text" required maxlength="100" placeholder="Nouvelle tâche">
        <input name="minutes" type="number" min="5" max="480" value="30" aria-label="Durée en minutes">
        <button class="btn small" type="submit">Ajouter</button>
      </form>
    </section>`;
}


function openProjectForm(id) {
  const existing = S.projects.find(project => project.id === id);
  const project = existing || { name: "", deadline: "", priority: 2, stat: "AGI" };

  openModal({
    title: existing ? "Modifier le projet" : "Nouveau projet",
    body: `
      <form class="form">
        <label>Nom<input name="name" required maxlength="60" value="${esc(project.name)}"></label>
        <div class="row">
          <label>Date limite<input name="deadline" type="date" value="${project.deadline}"></label>
          <label>Priorité
            <select name="priority">${[1, 2, 3].map(p => `<option value="${p}" ${p === project.priority ? "selected" : ""}>${PRIORITY_LABELS[p]}</option>`).join("")}</select>
          </label>
          <label>Stat<select name="stat">${statOptions(project.stat)}</select></label>
        </div>
        <div class="row end">
          ${existing ? `<button class="btn danger" type="button" data-del>Supprimer</button>` : ""}
          <button class="btn primary" type="submit">${existing ? "Enregistrer" : "Créer"}</button>
        </div>
      </form>`,
    onMount: root => {
      const form = $("form", root);

      form.addEventListener("submit", event => {
        event.preventDefault();
        const data = formData(form);
        const values = { name: data.name.trim(), deadline: data.deadline, priority: Number(data.priority), stat: data.stat };

        if (existing) {
          Object.assign(existing, values);
        } else {
          S.projects.push({ id: uid(), ...values, tasks: [] });
        }

        save();
        closeModal();
        Sound.play("click");
        refresh();
      });

      const del = $("[data-del]", form);
      if (del) del.addEventListener("click", () => {
        S.projects = S.projects.filter(item => item.id !== existing.id);
        save();
        closeModal();
        refresh();
      });
    }
  });
}
