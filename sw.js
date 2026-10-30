/* ==========================================================
   SW.JS : service worker — permet d'installer le site comme une
   application et de l'ouvrir sans connexion une fois visité.
   ----------------------------------------------------------
   Stratégie simple : à l'installation, on met tout le site en
   cache. Ensuite, chaque page vient du cache en priorité, et se
   met à jour en arrière-plan si une connexion est disponible.
   Pour forcer tout le monde à recharger les nouveaux fichiers
   après une mise à jour, change juste CACHE_NAME ci-dessous.
   ========================================================== */


const CACHE_NAME = "solo-leveling-v12";

const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/base.css",
  "./css/system.css",
  "./css/views.css",
  "./css/learn.css",
  "./css/deck.css",
  "./css/code.css",
  "./css/shell.css",
  "./js/content/culture.js",
  "./js/content/cyber.js",
  "./js/content/kali.js",
  "./js/content/python.js",
  "./js/content/english.js",
  "./js/data.js",
  "./js/utils.js",
  "./js/store.js",
  "./js/sync.js",
  "./js/sound.js",
  "./js/ui.js",
  "./js/xp.js",
  "./js/quests.js",
  "./js/planner.js",
  "./js/alerts.js",
  "./js/projects.js",
  "./js/sport.js",
  "./js/code.js",
  "./js/learn-engine.js",
  "./js/learn.js",
  "./js/studio-data.js",
  "./js/studio-render.js",
  "./js/studio-export.js",
  "./js/studio.js",
  "./js/status.js",
  "./js/settings.js",
  "./js/background.js",
  "./js/main.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];


self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});


self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});


// Cache d'abord, puis réseau en secours (et on met à jour le cache en silence)
// Seulement pour les fichiers du site : les requêtes vers un autre site
// (ex: la synchronisation Firestore) ne doivent jamais être mises en cache,
// sinon on verrait toujours la même ancienne réponse.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fresh = fetch(event.request)
        .then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);

      return cached || fresh;
    })
  );
});
