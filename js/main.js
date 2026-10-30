/* ==========================================================
   MAIN.JS : démarrage, navigation et rafraîchissement
   ----------------------------------------------------------
   Pour ajouter une page : crée une fonction renderXxx(root),
   ajoute-la dans VIEWS ci-dessous et un lien dans index.html.
   ========================================================== */


const VIEWS = {
  statut:   { render: renderStatus },
  quetes:   { render: renderQuests },
  planning: { render: renderPlanner },
  alertes:  { render: renderAlerts },
  projets:  { render: renderProjects },
  sport:    { render: renderSport },
  code:     { render: renderCode },
  apprendre: { render: renderLearn },
  studio:   { render: renderStudio },
  reglages: { render: renderSettings }
};

// Titre et sous-titre affichés en haut de chaque page
const PAGES = {
  statut:    ["Statut",    "La fenêtre du Joueur"],
  quetes:    ["Quêtes",    "Chaque jour compte"],
  planning:  ["Planning",  "Ton emploi du temps, bloc par bloc"],
  alertes:   ["Alertes",   "Le Système te prévient avant qu'il soit trop tard"],
  projets:   ["Projets",   "Découpe, planifie, termine"],
  sport:     ["Sport",     "La Force se construit en salle"],
  code:      ["Code",      "Importe un projet, relis-le, crée des cartes pour la défense"],
  apprendre: ["Apprendre", "Une partie par sujet chaque jour, jusqu'au sans-faute"],
  studio:    ["Studio",    "Crée tes présentations, présente-les ou exporte-les en PowerPoint"],
  reglages:  ["Réglages",  "Règle le Système à ta façon"]
};

let currentView = "statut";


function currentFromHash() {
  const name = location.hash.replace("#", "");

  return VIEWS[name] ? name : "statut";
}


/* ---------- Barre du haut : niveau, XP, quêtes restantes ---------- */

function renderHeader() {
  const info = levelInfo();
  const rank = rankOf(info.level);
  const left = remainingRequired().length;
  const circumference = 2 * Math.PI * 52;

  $$(".js-level-num").forEach(el => { el.textContent = info.level; });
  $$(".js-level-text").forEach(el => { el.textContent = `NIV. ${info.level} · ${rank.rank}`; });
  $$(".js-name").forEach(el => { el.textContent = S.player.name; });
  $$(".js-rank").forEach(el => { el.textContent = `RANG ${rank.rank} · ${rank.title}`; });
  $$(".js-bar").forEach(el => { el.style.width = `${Math.round(info.pct * 100)}%`; });
  $$(".js-xp").forEach(el => { el.textContent = `${info.into}/${info.need} XP`; });
  $$(".js-ring").forEach(el => { el.setAttribute("stroke-dasharray", `${(circumference * info.pct).toFixed(1)} ${circumference.toFixed(1)}`); });

  $$(".js-bell").forEach(el => {
    el.dataset.count = left || "";
    el.setAttribute("aria-label", `${left} quête(s) obligatoire(s) restante(s)`);
  });

  $$(".js-sound").forEach(el => {
    el.textContent = S.settings.sound ? "♪" : "×";
    el.setAttribute("aria-pressed", String(S.settings.sound));
  });

  $$("#nav a").forEach(link => {
    link.classList.toggle("sel", link.dataset.view === currentView);
  });
}


// Titre de la page, avec l'effet glitch quand on change de page
function renderPageHead(animate) {
  const [title, sub] = PAGES[currentView];
  const heading = $("#pageTitle");

  heading.textContent = title;
  heading.dataset.text = title;
  $("#pageSub").textContent = sub;

  if (animate) {
    heading.classList.remove("go");
    void heading.offsetWidth;
    heading.classList.add("go");
  }
}


// Redessine l'en-tête et la page courante en gardant la position de scroll
function refresh() {
  const scroll = window.scrollY;

  renderHeader();
  VIEWS[currentView].render($("#view"));
  window.scrollTo(0, scroll);
}


// Aller à une page (utilisable depuis n'importe quel fichier)
function go(name) {
  if (location.hash === `#${name}`) {
    currentView = name;
    refresh();
  } else {
    location.hash = name;
  }
}


function onRoute() {
  currentView = currentFromHash();
  renderPageHead(true);
  refresh();

  // Petite animation d'arrivée des fenêtres, seulement quand on change de page
  const view = $("#view");
  view.classList.add("enter");
  setTimeout(() => view.classList.remove("enter"), 900);

  window.scrollTo(0, 0);
}


/* ---------- Démarrage ---------- */

function welcomeFirstTime() {
  if (S.welcomed) return;

  S.welcomed = true;
  save();

  notify({
    title: "VOUS AVEZ ÉTÉ CHOISI",
    lines: ["Le Système vous a sélectionné comme Joueur.", "Accomplissez vos quêtes quotidiennes pour gagner en puissance."]
  });
}


function init() {
  loadState();
  initBackground();

  // Un son seulement quand on avance vers une page
  $("#nav").addEventListener("click", event => {
    if (event.target.closest("a")) Sound.play("click");
  });

  $$(".js-bell").forEach(button => button.addEventListener("click", () => go("quetes")));

  $$(".js-sound").forEach(button => button.addEventListener("click", () => {
    S.settings.sound = !S.settings.sound;
    save();
    if (S.settings.sound) Sound.play("click");
    renderHeader();
  }));

  window.addEventListener("hashchange", onRoute);

  runPenaltyCheck();
  checkAutoQuests();
  onRoute();
  welcomeFirstTime();
  startAlertEngine();
  if (typeof syncInit === "function") syncInit();
  if (typeof startSyncPolling === "function") startSyncPolling();

  // Une minute : on met à jour la ligne "maintenant" du planning et l'en-tête
  // (seulement sur les pages sans saisie, pour ne jamais effacer un texte en cours)
  setInterval(() => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    const passive = currentView === "planning" || currentView === "statut";

    if (passive && !typing && !learnSession && !studioPresent && !$("#modal").innerHTML) refresh();
  }, 60000);

  registerApp();
}


// Service worker : rend le site installable et utilisable hors connexion.
// Pas d'effet (et pas d'erreur) si le site est ouvert en double-clic (file://)
// ou si le navigateur ne le supporte pas.
function registerApp() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

  navigator.serviceWorker.register("sw.js").catch(() => { /* hors connexion au premier essai : pas grave */ });
}


init();
