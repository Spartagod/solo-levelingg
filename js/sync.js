/* ==========================================================
   SYNC.JS : synchronisation entre appareils (optionnelle)
   ----------------------------------------------------------
   Utilise un Gist GitHub privé comme stockage (ton compte GitHub,
   pas de service tiers à configurer). Il faut un jeton d'accès
   personnel GitHub (scope "gist" uniquement) dans Réglages ->
   Synchronisation. Le premier appareil crée le Gist, les suivants
   collent juste son identifiant pour pointer vers le même.
   Tant que rien n'est configuré, rien n'est envoyé nulle part.
   ========================================================== */


const SYNC_CFG_KEY = "solo-leveling-sync-cfg";
const SYNC_TS_KEY = "solo-leveling-sync-ts";
const SYNC_FILE_NAME = "solo-leveling-sync.json";

let syncPushTimer = null;
let syncBusy = false;
let syncLastError = "";


function getSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_CFG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}


function setSyncConfig(cfg) {
  try {
    if (cfg) localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(SYNC_CFG_KEY);
  } catch (error) { /* tant pis, pas bloquant */ }
}


function getLocalSyncTs() {
  return Number(localStorage.getItem(SYNC_TS_KEY) || 0);
}


function setLocalSyncTs(ts) {
  try { localStorage.setItem(SYNC_TS_KEY, String(ts)); } catch (error) { /* tant pis */ }
}


function deviceLabel() {
  const ua = navigator.userAgent;

  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iPhone/iPad";
  if (/Windows/.test(ua)) return "Windows";
  if (/Macintosh/.test(ua)) return "Mac";

  return "Appareil";
}


function syncStatusLabel() {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.token) return "Non configurée";
  if (syncLastError) return `Erreur : ${syncLastError}`;

  const ts = getLocalSyncTs();
  return ts ? `Dernière synchro : ${new Date(ts).toLocaleString("fr-FR")}` : "Configurée, pas encore synchronisé";
}


function gistHeaders(cfg) {
  return {
    "Authorization": `token ${cfg.token}`,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json"
  };
}


function gistPayload() {
  return JSON.stringify({ data: S, updatedAt: Date.now(), device: deviceLabel() });
}


// Crée le Gist privé (une seule fois, sur le premier appareil configuré).
async function syncCreateGist(cfg) {
  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: gistHeaders(cfg),
    body: JSON.stringify({
      description: "Solo Leveling — synchronisation entre appareils (ne pas supprimer)",
      public: false,
      files: { [SYNC_FILE_NAME]: { content: gistPayload() } }
    })
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const gist = await response.json();
  return gist.id;
}


async function syncPush() {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.token || !cfg.gistId) return;

  const now = Date.now();

  try {
    const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(cfg.gistId)}`, {
      method: "PATCH",
      headers: gistHeaders(cfg),
      body: JSON.stringify({ files: { [SYNC_FILE_NAME]: { content: JSON.stringify({ data: S, updatedAt: now, device: deviceLabel() }) } } })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    setLocalSyncTs(now);
    syncLastError = "";
  } catch (error) {
    syncLastError = "envoi impossible (vérifie le jeton, l'ID du Gist et ta connexion)";
  }
}


// Appelé à chaque sauvegarde : on attend un peu d'inactivité avant d'envoyer,
// pour ne pas spammer l'API GitHub à chaque frappe.
function syncSchedulePush() {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.token || !cfg.gistId || syncBusy) return;

  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(syncPush, 3000);
}


async function syncPull() {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.token || !cfg.gistId) return null;

  try {
    const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(cfg.gistId)}`, {
      headers: gistHeaders(cfg)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const gist = await response.json();
    const content = gist.files?.[SYNC_FILE_NAME]?.content;

    if (!content) return null;

    const parsed = JSON.parse(content);
    return { data: parsed.data, updatedAt: Number(parsed.updatedAt || 0) };
  } catch (error) {
    syncLastError = "réception impossible (vérifie le jeton, l'ID du Gist et ta connexion)";
    return null;
  }
}


// Première connexion : crée le Gist s'il n'existe pas encore pour cet appareil.
async function syncConnect(cfg) {
  syncLastError = "";

  if (!cfg.gistId) {
    try {
      cfg.gistId = await syncCreateGist(cfg);
      setSyncConfig(cfg);
      setLocalSyncTs(Date.now());
      return { created: true, gistId: cfg.gistId };
    } catch (error) {
      syncLastError = "création du Gist impossible (vérifie le jeton)";
      return { created: false };
    }
  }

  setSyncConfig(cfg);
  await syncInit();
  return { created: false };
}


// Au démarrage (et sur demande) : compare avec le Gist, garde la version la
// plus récente des deux, et renvoie la sienne si elle est plus récente.
async function syncInit() {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.token || !cfg.gistId) return;

  syncBusy = true;
  const remote = await syncPull();
  syncBusy = false;

  if (!remote) return;

  const localTs = getLocalSyncTs();

  if (remote.updatedAt > localTs) {
    S = mergeDefaults(remote.data, defaultState());
    save();
    setLocalSyncTs(remote.updatedAt);
    if (typeof refresh === "function") refresh();
    toast("Données synchronisées depuis un autre appareil");
  } else {
    syncPush();
  }
}


async function syncNow() {
  syncLastError = "";
  await syncInit();
  if (typeof refresh === "function") refresh();
}
