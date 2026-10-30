/* ==========================================================
   REVISIONS.JS : la page "Révisions" — une seule page qui
   regroupe tout ce qui touche à l'apprentissage.
   ----------------------------------------------------------
   Quatre onglets :
   - Aujourd'hui : lancer la séance du jour (js/learn.js)
   - Projets     : importer/relire du code, générer des cartes
                   automatiquement (js/code.js)
   - Paquets     : voir, ajouter, importer des cartes (js/learn.js)
   - Stats       : prévisions, mémorisation, score TOEIC (js/learn.js)
   Pendant une partie en cours, les onglets disparaissent et on
   voit uniquement la question (renderLesson, dans js/learn.js).
   Le "cerveau" de l'apprentissage (quoi poser, quand revoir) est
   dans js/learn-engine.js, et ne change jamais selon l'onglet.
   ========================================================== */


let revTab = "today";

const REV_TABS = [
  ["today", "Aujourd'hui"],
  ["projects", "Projets"],
  ["decks", "Paquets"],
  ["stats", "Stats"]
];


function renderRevisions(root) {
  if (learnSession) {
    renderLesson(root);
    return;
  }

  const tabs = REV_TABS
    .map(([key, label]) => `<button type="button" class="tab ${revTab === key ? "sel" : ""}" data-tab="${key}">${label}</button>`)
    .join("");

  root.innerHTML = `
    <div class="tabs rev-tabs">${tabs}</div>
    <div id="revBody"></div>`;

  root.onclick = event => {
    const tabBtn = event.target.closest("[data-tab]");
    if (!tabBtn) return;

    revTab = tabBtn.dataset.tab;
    Sound.play("click");
    refresh();
  };

  const body = $("#revBody", root);

  if (revTab === "projects") {
    renderCodeTab(body);
    return;
  }

  body.innerHTML = revTab === "decks" ? decksTab() : revTab === "stats" ? statsTab() : todayTab();
  body.onclick = event => learnClick(event, body);
  body.onsubmit = event => learnSubmit(event);

  const search = $("#cardSearch", body);
  if (search) search.addEventListener("input", () => filterCards(body));
}
