/* ==========================================================
   push-alerts.js
   ----------------------------------------------------------
   Tourne dans GitHub Actions (voir ../workflows/push-alerts.yml),
   pas dans le navigateur. Reproduit juste assez de logique de
   js/quests.js pour savoir si des quêtes OBLIGATOIRES sont en
   retard, et envoie une notif OneSignal (qui arrive même si le
   téléphone a le navigateur complètement fermé).

   Secrets nécessaires (Settings -> Secrets and variables -> Actions) :
     GIST_TOKEN        le token GitHub (scope "gist") déjà utilisé pour la sync
     GIST_ID           l'identifiant du Gist de sauvegarde
     ONESIGNAL_APP_ID  App ID OneSignal
     ONESIGNAL_API_KEY REST API Key OneSignal
   ========================================================== */

const fs = require("fs");
const path = require("path");

const GIST_TOKEN = process.env.GIST_TOKEN;
const GIST_ID = process.env.GIST_ID;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

// Mémorise le dernier créneau notifié (date + heure) pour ne jamais envoyer
// deux fois la même alerte, même si le cron de GitHub Actions est en retard
// et que plusieurs exécutions tombent dans la même heure.
const MARKER_FILE = path.join(__dirname, "last-notify.json");

// Heures (Paris) où on vérifie s'il reste des quêtes obligatoires non faites.
// Change cette liste si tu veux d'autres moments.
const CHECK_HOURS = [9, 13, 17, 20];

const SITE_URL = "https://spartagod.github.io/solo-levelingg/#quetes";


function pad(n) {
  return String(n).padStart(2, "0");
}


// Heure/date/jour de la semaine à Paris, sans dépendre du fuseau du serveur
// (les runners GitHub Actions tournent en UTC).
function parisNow() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short"
  });

  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    key: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday]
  };
}


// Mêmes règles que questsForDay() / isQuestDone() / remainingRequired() dans js/quests.js
function remainingRequired(S, key, weekday) {
  const templates = S.quests?.templates || [];
  const todays = templates.filter(q => !q.days || q.days.includes(weekday));

  return todays.filter(quest => {
    if (!quest.required) return false;

    if (quest.special === "gym") {
      return !(S.gym?.log || []).some(entry => entry.day === key);
    }

    return !Boolean(S.quests?.days?.[key]?.done?.[quest.id]);
  });
}


async function fetchState() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      Authorization: `token ${GIST_TOKEN}`,
      "User-Agent": "solo-leveling-push-alerts",
      Accept: "application/vnd.github+json"
    }
  });

  if (!res.ok) throw new Error(`Gist inaccessible (${res.status})`);

  const gist = await res.json();
  const file = Object.values(gist.files)[0];
  if (!file) throw new Error("Aucun fichier dans le Gist");

  const parsed = JSON.parse(file.content);

  // sync.js enveloppe l'état du joueur dans un champ "data" (avec sûrement
  // d'autres métadonnées à côté, genre une date de mise à jour) : c'est ça
  // qu'il faut renvoyer, pas l'enveloppe entière.
  if (!parsed.data || !parsed.data.quests) {
    throw new Error("Format du Gist inattendu : pas de data.quests trouvé");
  }

  return parsed.data;
}


async function sendPush(heading, body) {
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Basic ${ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Total Subscriptions"],
      headings: { en: heading, fr: heading },
      contents: { en: body, fr: body },
      url: SITE_URL
    })
  });

  const result = await res.json();
  console.log("Réponse OneSignal :", JSON.stringify(result));

  if (!res.ok) throw new Error(`Envoi OneSignal échoué (${res.status})`);
}


function readMarker() {
  try {
    return JSON.parse(fs.readFileSync(MARKER_FILE, "utf8"));
  } catch (error) {
    return null;
  }
}


function writeMarker(key, hour) {
  fs.writeFileSync(MARKER_FILE, JSON.stringify({ key, hour }), "utf8");
}


async function main() {
  if (!GIST_TOKEN || !GIST_ID || !ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    throw new Error("Secret(s) manquant(s) : vérifie GIST_TOKEN, GIST_ID, ONESIGNAL_APP_ID, ONESIGNAL_API_KEY");
  }

  const { key, hour, weekday } = parisNow();

  // FORCE_RUN=true (coché sur "Run workflow") ignore le créneau ET le marqueur, pour tester.
  const forced = process.env.FORCE_RUN === "true";

  if (!forced && !CHECK_HOURS.includes(hour)) {
    console.log(`Hors créneau (heure ${hour}h Paris), rien à faire.`);
    return;
  }

  // Le cron de GitHub Actions peut être en retard : on reste actif toute
  // l'heure du créneau (pas juste les 30 premières minutes), mais on ne
  // notifie qu'une fois par créneau grâce à ce marqueur.
  const marker = readMarker();
  if (!forced && marker && marker.key === key && marker.hour === hour) {
    console.log(`Déjà notifié pour le créneau ${hour}h aujourd'hui, rien à refaire.`);
    return;
  }

  const S = await fetchState();
  const remaining = remainingRequired(S, key, weekday);

  if (remaining.length === 0) {
    console.log("Aucune quête obligatoire en retard, pas de notif.");
    return;
  }

  const titles = remaining.map(q => q.title).join(", ");
  const heading = remaining.length === 1
    ? "1 quête obligatoire en retard"
    : `${remaining.length} quêtes obligatoires en retard`;

  await sendPush(heading, `Depuis ce matin : ${titles}`);
  console.log("Notif envoyée :", heading, "-", titles);

  if (!forced) writeMarker(key, hour);
}


main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
