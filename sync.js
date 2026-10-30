/* ==========================================================
   SYNC.JS : synchronisation entre appareils (optionnelle)
   ----------------------------------------------------------
   Si tu configures un projet Firebase gratuit dans Réglages ->
   Synchronisation (ID de projet, clé API, code de synchro), tes
   données (XP, planning, projets, cartes...) se synchronisent
   automatiquement entre tous les appareils qui utilisent le même
   code, via la base Firestore de ton propre projet Firebase.
   Tant que rien n'est configuré, rien n'est envoyé nulle part.
   ========================================================== */


const SYNC_CFG_KEY = "solo-leveling-sync-cfg";
const SYNC_TS_KEY = "solo-leveling-sync-ts";

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


function syncDocUrl(cfg) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/syncs/${encodeURIComponent(cfg.code)}?key=${encodeURIComponent(cfg.apiKey)}`;
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
  if (!cfg) return "Non configurée";
  if (syncLastError) return `Erreur : ${syncLastError}`;

  const ts = getLocalSyncTs();
  return ts ? `Dernière synchro : ${new Date(ts).toLocaleString("fr-FR")}` : "Configurée, pas encore synchronisé";
}


async function syncPush() {
  const cfg = getSyncConfig();
  if (!cfg) return;

  const now = Date.now();
  const body = {
    fields: {
      data: { stringValue: JSON.stringify(S) },
      updatedAt: { integerValue: String(now) },
      device: { stringValue: deviceLabel() }
    }
  };

  try {
    const response = await fetch(syncDocUrl(cfg), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    setLocalSyncTs(now);
    syncLastError = "";
  } catch (error) {
    syncLastError = "envoi impossible (connexion ou configuration à vérifier)";
  }
}


// Appelé à chaque sauvegarde : on attend un peu d'inactivité avant d'envoyer,
// pour ne pas spammer Firestore à chaque frappe.
function syncSchedulePush() {
  const cfg = getSyncConfig();
  if (!cfg || syncBusy) return;

  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(syncPush, 3000);
}


async function syncPull() {
  const cfg = getSyncConfig();
  if (!cfg) return null;

  try {
    const response = await fetch(syncDocUrl(cfg));

    if (response.status === 404) return null; // rien encore envoyé avec ce code
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const doc = await response.json();
    const raw = doc.fields?.data?.stringValue;
    const updatedAt = Number(doc.fields?.updatedAt?.integerValue || 0);

    if (!raw) return null;

    return { data: JSON.parse(raw), updatedAt };
  } catch (error) {
    syncLastError = "réception impossible (connexion ou configuration à vérifier)";
    return null;
  }
}


// Au démarrage (et sur demande) : compare avec le serveur, garde la version
// la plus récente des deux, et renvoie la sienne si elle est plus récente.
async function syncInit() {
  const cfg = getSyncConfig();
  if (!cfg) return;

  syncBusy = true;
  const remote = await syncPull();
  syncBusy = false;

  if (!remote) { syncPush(); return; }

  const localTs = getLocalSyncTs();

  if (remote.updatedAt > localTs) {
    S = mergeDefaults(remote.data, defaultState());
    save();
    setLocalSyncTs(remote.updatedAt);
    if (typeof refresh === "function") refresh();
    toast("Données synchronisées depuis un autre appareil");
  } else if (remote.updatedAt < Date.now()) {
    syncPush();
  }
}


async function syncNow() {
  syncLastError = "";
  await syncInit();
  if (typeof refresh === "function") refresh();
}
