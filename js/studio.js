/* ==========================================================
   STUDIO.JS : créer des présentations façon Canva / PowerPoint
   ----------------------------------------------------------
   Deux écrans :
   - la liste de tes présentations
   - l'éditeur : miniatures à gauche, diapositive au centre,
     champs à droite, mode "Présenter" en plein écran
   Les mises en page et thèmes sont dans studio-data.js,
   l'export PowerPoint dans studio-export.js.
   ========================================================== */


let studioSel = 0;               // numéro de la diapositive sélectionnée
let studioPresent = null;        // { deckId, i, notes } pendant la présentation


function currentDeck() {
  return S.studio.decks.find(deck => deck.id === S.studio.current);
}


function renderStudio(root) {
  // Premier passage : on charge la présentation d'exemple
  if (!S.studio.seeded) {
    S.studio.seeded = true;
    if (!S.studio.decks.length) S.studio.decks.push(seedProjectsDeck());
    save();
  }

  const deck = currentDeck();

  if (deck) renderEditor(root, deck);
  else renderDeckList(root);
}


/* ==========================================================
   1. Liste des présentations
   ========================================================== */

function renderDeckList(root) {
  const decks = [...S.studio.decks].sort((a, b) => b.updated - a.updated);

  root.innerHTML = `
    <section class="win">
      <span class="win-t">Studio · mes présentations</span>

      <div class="quest-head">
        <p class="muted">Crée des diapositives, présente-les en plein écran ou exporte-les en PowerPoint.</p>
        <button class="btn primary" type="button" data-act="new">+ Nouvelle présentation</button>
      </div>

      <div class="deck-list">
        ${decks.map(deck => `
          <article class="deck-tile">
            <button type="button" class="deck-thumb" data-act="open" data-id="${deck.id}" aria-label="Ouvrir ${esc(deck.title)}">
              ${thumbHTML(deck.slides[0], deck, 0, 300)}
            </button>
            <div class="deck-meta">
              <strong>${esc(deck.title)}</strong>
              <span class="muted">${deck.slides.length} diapo(s) · thème ${esc(themeOf(deck).name)}</span>
            </div>
            <div class="row wrap">
              <button class="btn small primary" type="button" data-act="open" data-id="${deck.id}">Ouvrir</button>
              <button class="btn small" type="button" data-act="play-deck" data-id="${deck.id}">Présenter</button>
              <button class="btn small" type="button" data-act="export-deck" data-id="${deck.id}">.pptx</button>
              <button class="btn small" type="button" data-act="dup-deck" data-id="${deck.id}">Dupliquer</button>
              <button class="icon-btn" type="button" data-act="del-deck" data-id="${deck.id}" aria-label="Supprimer la présentation">×</button>
            </div>
          </article>`).join("") || `<p class="muted">Aucune présentation pour l'instant.</p>`}
      </div>
    </section>`;

  root.oninput = null;
  root.onchange = null;
  root.onclick = event => {
    const target = event.target.closest("[data-act]");
    if (!target) return;

    const deck = S.studio.decks.find(item => item.id === target.dataset.id);
    const act = target.dataset.act;

    if (act === "new") openNewDeckForm();
    if (act === "open") { S.studio.current = deck.id; studioSel = 0; save(); refresh(); }
    if (act === "play-deck") startPresent(deck, 0);
    if (act === "export-deck") exportPptx(deck);

    if (act === "dup-deck") {
      const copy = structuredClone(deck);

      copy.id = uid();
      copy.title = `${deck.title} (copie)`;
      copy.slides.forEach(slide => { slide.id = uid(); });
      copy.updated = Date.now();
      S.studio.decks.push(copy);
      save();
      refresh();
    }

    if (act === "del-deck") {
      askConfirm(`Supprimer « ${deck.title} » ?`, () => {
        S.studio.decks = S.studio.decks.filter(item => item.id !== deck.id);
        save();
        refresh();
      }, "Supprimer");
    }
  };
}


function openNewDeckForm() {
  openModal({
    title: "Nouvelle présentation",
    body: `
      <form class="form">
        <label>Titre<input name="title" required maxlength="60" value="Ma présentation"></label>
        <label>Thème<select name="theme">${Object.entries(THEMES).map(([key, theme]) => `<option value="${key}">${theme.name}</option>`).join("")}</select></label>
        <label>Départ<select name="start">
          <option value="blank">Présentation vide</option>
          <option value="projects">Modèle « mes projets » (fiches projet prêtes)</option>
        </select></label>
        <div class="row end"><button class="btn primary" type="submit">Créer</button></div>
      </form>`,
    onMount: root => {
      $("form", root).addEventListener("submit", event => {
        event.preventDefault();
        const data = formData(event.target);

        const deck = data.start === "projects"
          ? seedProjectsDeck()
          : { id: uid(), slides: [newSlide("title", { title: data.title.trim() }), newSlide("bullets", { title: "Premier sujet" })] };

        deck.id = uid();
        deck.title = data.title.trim();
        deck.theme = data.theme;
        deck.updated = Date.now();

        S.studio.decks.push(deck);
        S.studio.current = deck.id;
        studioSel = 0;
        save();
        closeModal();
        Sound.play("click");
        refresh();
      });
    }
  });
}


/* ==========================================================
   2. Éditeur
   ========================================================== */

function renderEditor(root, deck) {
  studioSel = clamp(studioSel, 0, deck.slides.length - 1);
  const slide = deck.slides[studioSel];

  root.innerHTML = `
    <section class="studio">

      <div class="st-top">
        <button class="btn small" type="button" data-act="back">← Mes présentations</button>
        <input id="stTitle" class="st-title" value="${esc(deck.title)}" maxlength="60" aria-label="Titre de la présentation">
        <select data-theme aria-label="Thème">${Object.entries(THEMES).map(([key, theme]) => `<option value="${key}" ${deck.theme === key ? "selected" : ""}>${theme.name}</option>`).join("")}</select>
        <button class="btn small primary" type="button" data-act="play">▶ Présenter</button>
        <button class="btn small" type="button" data-act="export">⬇ PowerPoint</button>
      </div>

      <div class="st-body">

        <aside class="st-rail" aria-label="Diapositives">
          ${deck.slides.map((item, i) => `
            <div class="rail-item ${i === studioSel ? "sel" : ""}" data-i="${i}" draggable="true">
              <span class="rail-n">${i + 1}</span>
              <button type="button" data-act="sel" data-i="${i}" aria-label="Diapositive ${i + 1}">${thumbHTML(item, deck, i, 150)}</button>
            </div>`).join("")}
          <button class="btn small" type="button" data-act="add">+ Diapositive</button>
        </aside>

        <div class="st-center">
          <div class="st-stage"><div class="scaled fit" id="stCanvas"><div class="scale-in">${slideHTML(slide, deck, studioSel)}</div></div></div>
          <div class="row center wrap st-tools">
            <button class="btn small" type="button" data-act="up" ${studioSel === 0 ? "disabled" : ""}>↑ Monter</button>
            <button class="btn small" type="button" data-act="down" ${studioSel === deck.slides.length - 1 ? "disabled" : ""}>↓ Descendre</button>
            <button class="btn small" type="button" data-act="dup">Dupliquer</button>
            <button class="btn small danger" type="button" data-act="del">Supprimer</button>
          </div>
        </div>

        <aside class="st-panel">
          <label>Mise en page
            <select data-layout>${Object.entries(LAYOUTS).map(([key, layout]) => `<option value="${key}" ${slide.layout === key ? "selected" : ""}>${layout.label}</option>`).join("")}</select>
          </label>
          ${LAYOUTS[slide.layout].fields.map(field => fieldInput(field, slide.fields[field.k])).join("")}
          <label>Notes de l'orateur (visibles en mode présentation avec N)
            <textarea id="stNotes" rows="4">${esc(slide.notes)}</textarea>
          </label>
        </aside>

      </div>
    </section>`;

  fitCanvas();

  root.onclick = event => editorClick(event, deck);
  root.oninput = event => editorInput(event, deck);
  root.onchange = event => editorChange(event, deck);

  bindRailDrag(root, deck);
}


function fieldInput(field, value) {
  const label = esc(field.label);

  if (field.type === "area") return `<label>${label}<textarea data-f="${field.k}" rows="4">${esc(value)}</textarea></label>`;

  if (field.type === "select") {
    return `<label>${label}<select data-f="${field.k}">${field.options.map(([key, name]) => `<option value="${key}" ${value === key ? "selected" : ""}>${name}</option>`).join("")}</select></label>`;
  }

  if (field.type === "image") {
    return `
      <div class="img-field">
        <span class="lbl">${label}</span>
        ${value ? `<img src="${value}" alt="" class="img-prev">` : ""}
        <div class="row wrap">
          <label class="btn small file-btn">${value ? "Changer" : "Choisir une image"}<input type="file" accept="image/*" data-img="${field.k}" hidden></label>
          ${value ? `<button class="btn small" type="button" data-act="rm-img" data-k="${field.k}">Retirer</button>` : ""}
        </div>
      </div>`;
  }

  return `<label>${label}<input data-f="${field.k}" value="${esc(value)}" maxlength="200"></label>`;
}


// Adapte la diapositive à la place disponible
function fitCanvas() {
  const box = $("#stCanvas");
  if (!box) return;

  const holder = box.parentElement;
  const maxWidth = holder.clientWidth || 720;
  const maxHeight = clamp(window.innerHeight - 250, 240, 640);

  fitScaled(box, maxWidth, maxHeight);
}


// Redessine seulement la diapositive et sa miniature (garde le focus dans les champs)
function updateLive(deck) {
  const slide = deck.slides[studioSel];
  const canvas = $("#stCanvas .scale-in");
  const thumb = $(`.rail-item[data-i="${studioSel}"] .scale-in`);

  if (canvas) canvas.innerHTML = slideHTML(slide, deck, studioSel);
  if (thumb) thumb.innerHTML = slideHTML(slide, deck, studioSel);

  deck.updated = Date.now();
  saveSoon();
}


function editorInput(event, deck) {
  const target = event.target;
  const slide = deck.slides[studioSel];

  if (target.id === "stTitle") { deck.title = target.value; deck.updated = Date.now(); saveSoon(); return; }
  if (target.id === "stNotes") { slide.notes = target.value; saveSoon(); return; }

  if (target.dataset.f) {
    slide.fields[target.dataset.f] = target.value;
    updateLive(deck);
  }
}


function editorChange(event, deck) {
  const target = event.target;
  const slide = deck.slides[studioSel];

  if (target.hasAttribute("data-theme")) {
    deck.theme = target.value;
    save();
    refresh();
  }

  if (target.hasAttribute("data-layout")) {
    const old = slide.fields;
    const next = defaultFields(target.value);

    // On garde ce qui a le même nom de champ (titre, texte...)
    for (const key of Object.keys(next)) {
      if (old[key] !== undefined && old[key] !== "") next[key] = old[key];
    }

    slide.layout = target.value;
    slide.fields = next;
    save();
    refresh();
  }

  if (target.dataset.img && target.files && target.files[0]) {
    readImage(target.files[0], url => {
      slide.fields[target.dataset.img] = url;
      save();

      if (JSON.stringify(S).length > 4500000) toast("Attention : beaucoup d'images, le navigateur approche de sa limite");

      refresh();
    });
  }
}


function editorClick(event, deck) {
  const target = event.target.closest("[data-act]");
  if (!target) return;

  const act = target.dataset.act;
  const slides = deck.slides;

  if (act === "back") { S.studio.current = ""; save(); refresh(); return; }
  if (act === "play") { startPresent(deck, studioSel); return; }
  if (act === "export") { exportPptx(deck); return; }
  if (act === "add") { openAddSlide(deck); return; }

  if (act === "sel") { studioSel = Number(target.dataset.i); refresh(); return; }

  if (act === "rm-img") {
    slides[studioSel].fields[target.dataset.k] = "";
    save();
    refresh();
    return;
  }

  if (act === "dup") {
    const copy = structuredClone(slides[studioSel]);
    copy.id = uid();
    slides.splice(studioSel + 1, 0, copy);
    studioSel++;
  }

  if (act === "del") {
    if (slides.length === 1) { toast("Il faut garder au moins une diapositive"); return; }

    slides.splice(studioSel, 1);
    studioSel = Math.min(studioSel, slides.length - 1);
  }

  if (act === "up" && studioSel > 0) {
    [slides[studioSel - 1], slides[studioSel]] = [slides[studioSel], slides[studioSel - 1]];
    studioSel--;
  }

  if (act === "down" && studioSel < slides.length - 1) {
    [slides[studioSel + 1], slides[studioSel]] = [slides[studioSel], slides[studioSel + 1]];
    studioSel++;
  }

  deck.updated = Date.now();
  save();
  refresh();
}


function openAddSlide(deck) {
  openModal({
    title: "Ajouter une diapositive",
    wide: true,
    body: `
      <div class="layout-grid">
        ${Object.entries(LAYOUTS).map(([key, layout]) => {
          const sample = { id: "x", layout: key, fields: defaultFields(key), notes: "" };

          return `
            <button type="button" class="layout-opt" data-layout-pick="${key}">
              ${thumbHTML(sample, deck, 0, 200)}
              <span>${layout.label}</span>
            </button>`;
        }).join("")}
      </div>`,
    onMount: root => {
      root.addEventListener("click", event => {
        const pick = event.target.closest("[data-layout-pick]");
        if (!pick) return;

        deck.slides.splice(studioSel + 1, 0, newSlide(pick.dataset.layoutPick));
        studioSel++;
        deck.updated = Date.now();
        save();
        closeModal();
        Sound.play("click");
        refresh();
      });
    }
  });
}


/* ---------- Glisser-déposer des miniatures ---------- */

function bindRailDrag(root, deck) {
  let from = null;

  $$(".rail-item", root).forEach(item => {
    item.addEventListener("dragstart", event => {
      from = Number(item.dataset.i);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(from));
    });

    item.addEventListener("dragover", event => {
      event.preventDefault();
      item.classList.add("over");
    });

    item.addEventListener("dragleave", () => item.classList.remove("over"));

    item.addEventListener("drop", event => {
      event.preventDefault();
      const to = Number(item.dataset.i);

      if (from === null || from === to) return;

      const [moved] = deck.slides.splice(from, 1);
      deck.slides.splice(to, 0, moved);
      studioSel = to;
      from = null;
      deck.updated = Date.now();
      save();
      refresh();
    });
  });
}


/* ==========================================================
   3. Mode présentation (plein écran)
   ========================================================== */

function startPresent(deck, from = 0) {
  studioPresent = { deckId: deck.id, i: from, notes: false };

  drawPresent();

  try {
    const request = document.documentElement.requestFullscreen;
    if (request) request.call(document.documentElement).catch(() => {});
  } catch (error) { /* plein écran refusé : on reste en fenêtre */ }
}


function stopPresent() {
  studioPresent = null;
  $("#present")?.remove();

  try {
    if (document.fullscreenElement) document.exitFullscreen();
  } catch (error) { /* ignoré */ }
}


function drawPresent() {
  const state = studioPresent;
  const deck = S.studio.decks.find(item => item.id === state.deckId);
  if (!deck) { stopPresent(); return; }

  let layer = $("#present");

  if (!layer) {
    layer = document.createElement("div");
    layer.id = "present";
    document.body.appendChild(layer);

    layer.addEventListener("click", event => {
      if (event.target.closest("[data-close]")) { stopPresent(); return; }
      if (event.target.closest("[data-notes]")) { studioPresent.notes = !studioPresent.notes; drawPresent(); return; }

      stepPresent(event.clientX < window.innerWidth / 3 ? -1 : 1);
    });
  }

  const slide = deck.slides[state.i];

  layer.innerHTML = `
    <div class="pr-stage"><div class="scaled fit" id="prBox"><div class="scale-in">${slideHTML(slide, deck, state.i)}</div></div></div>
    <div class="pr-progress"><i style="width:${((state.i + 1) / deck.slides.length) * 100}%"></i></div>
    <div class="pr-hint">
      <span>${state.i + 1} / ${deck.slides.length}</span>
      <span>← → naviguer · N notes · Échap quitter</span>
      <button type="button" data-notes>Notes</button>
      <button type="button" data-close>Quitter</button>
    </div>
    ${state.notes ? `<div class="pr-notes">${esc(slide.notes) || "<em>Aucune note pour cette diapositive.</em>"}</div>` : ""}`;

  fitScaled($("#prBox", layer), window.innerWidth, window.innerHeight - (state.notes ? 190 : 56));
}


function stepPresent(delta) {
  const deck = S.studio.decks.find(item => item.id === studioPresent.deckId);
  const next = studioPresent.i + delta;

  if (next >= deck.slides.length) { stopPresent(); return; }

  studioPresent.i = clamp(next, 0, deck.slides.length - 1);
  drawPresent();
}


document.addEventListener("keydown", event => {
  if (!studioPresent) return;

  const key = event.key;

  if (key === "Escape") stopPresent();
  else if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(key)) stepPresent(1);
  else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(key)) stepPresent(-1);
  else if (key === "Home") { studioPresent.i = 0; drawPresent(); }
  else if (key === "End") {
    studioPresent.i = S.studio.decks.find(item => item.id === studioPresent.deckId).slides.length - 1;
    drawPresent();
  }
  else if (key === "n" || key === "N") { studioPresent.notes = !studioPresent.notes; drawPresent(); }
  else return;

  event.preventDefault();
});


window.addEventListener("resize", () => {
  if (studioPresent) drawPresent();
  else if (currentView === "studio") fitCanvas();
});
