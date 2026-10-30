/* ==========================================================
   UTILS.JS : petites fonctions utilisées partout
   ========================================================== */


const $ = (selector, root = document) => root.querySelector(selector);

const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];


// Protège le texte saisi avant de l'afficher dans le HTML
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}


function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}


function pad(number) {
  return String(number).padStart(2, "0");
}


function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}


function shuffle(list) {
  const copy = [...list];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}


/* ---------- Dates : on manipule des "clés" AAAA-MM-JJ ---------- */

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAY_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];


function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}


function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}


function addDays(key, count) {
  const date = parseKey(key);
  date.setDate(date.getDate() + count);
  return dayKey(date);
}


// Nombre de jours entre a et b (a - b)
function diffDays(a, b) {
  return Math.round((parseKey(a) - parseKey(b)) / 86400000);
}


function mondayOf(key) {
  const date = parseKey(key);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dayKey(date);
}


function weekdayOf(key) {
  return parseKey(key).getDay();
}


function fmtLong(key) {
  const date = parseKey(key);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}


function fmtShort(key) {
  const date = parseKey(key);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}


/* ---------- Heures : "HH:MM" <-> minutes depuis minuit ---------- */

function toMin(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}


function fromMin(total) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}


function nowMin() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
