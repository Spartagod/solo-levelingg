/* ==========================================================
   UI.JS : fenêtres du Système (notifications, modales, toasts)
   ----------------------------------------------------------
   notify({ title, lines, kind, sound })  -> fenêtre NOTIFICATION
   openModal({ title, body, onMount })    -> fenêtre de formulaire
   askConfirm(message, onYes)             -> fenêtre de confirmation
   toast(text)                            -> petit message en bas
   ========================================================== */


/* ---------- Notification façon Solo Leveling ----------
   kind : "info" (bleu), "warn" (rouge), "levelup" (doré)     */

function notify({ title, lines = [], kind = "info", sound = "notify", ttl = 0 }) {
  const box = document.createElement("div");

  box.className = `notif ${kind}`;
  box.setAttribute("role", "alert");
  box.innerHTML = `
    <div class="notif-tag">${kind === "warn" ? "ALERTE" : "NOTIFICATION"}</div>
    <div class="notif-title">${esc(title)}</div>
    ${lines.map(line => `<p>${esc(line)}</p>`).join("")}
    <button class="btn small notif-ok" type="button">OK</button>`;

  // Fermer ne joue aucun son
  $(".notif-ok", box).addEventListener("click", () => box.remove());

  $("#notifs").appendChild(box);

  if (sound) Sound.play(sound);
  if (ttl) setTimeout(() => box.remove(), ttl);

  // Notification du navigateur en plus, si autorisée
  if (S.settings.browserNotif && "Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body: lines.join("\n") }); } catch (error) { /* ignoré */ }
  }

  return box;
}


function toast(text) {
  const item = document.createElement("div");

  item.className = "toast";
  item.textContent = text;
  $("#toasts").appendChild(item);

  setTimeout(() => item.remove(), 2200);
}


/* ---------- Fenêtre modale (formulaires) ---------- */

function closeModal() {
  $("#modal").innerHTML = "";
}


function openModal({ title, body, onMount, wide = false }) {
  const modal = $("#modal");

  modal.innerHTML = `
    <div class="overlay">
      <div class="win modal-win ${wide ? "wide" : ""}">
        <span class="win-t">${esc(title)}</span>
        <button class="close" type="button" aria-label="Fermer">×</button>
        <div class="modal-body">${body}</div>
      </div>
    </div>`;

  // La croix et le fond ferment sans son
  $(".close", modal).addEventListener("click", closeModal);
  $(".overlay", modal).addEventListener("mousedown", event => {
    if (event.target.classList.contains("overlay")) closeModal();
  });

  if (onMount) onMount($(".modal-body", modal));
}


// Lit un formulaire dans un objet { nom: valeur }
function formData(form) {
  const data = {};

  for (const [key, value] of new FormData(form).entries()) {
    data[key] = value;
  }

  return data;
}


function askConfirm(message, onYes, yesLabel = "Confirmer") {
  openModal({
    title: "Confirmation",
    body: `
      <p class="confirm-text">${esc(message)}</p>
      <div class="row end">
        <button class="btn" type="button" data-no>Annuler</button>
        <button class="btn danger" type="button" data-yes>${esc(yesLabel)}</button>
      </div>`,
    onMount: root => {
      $("[data-no]", root).addEventListener("click", closeModal);
      $("[data-yes]", root).addEventListener("click", () => { closeModal(); onYes(); });
    }
  });
}


/* ---------- Petits morceaux de HTML réutilisables ---------- */

function statOptions(selected = "INT") {
  return Object.keys(STATS)
    .map(key => `<option value="${key}" ${key === selected ? "selected" : ""}>${key} · ${STATS[key].label}</option>`)
    .join("");
}


function dayCheckboxes(selected = []) {
  // Ordre d'affichage : lundi à dimanche
  return [1, 2, 3, 4, 5, 6, 0]
    .map(day => `
      <label class="chip-check">
        <input type="checkbox" name="days" value="${day}" ${selected.includes(day) ? "checked" : ""}>
        <span>${DAY_SHORT[day]}</span>
      </label>`)
    .join("");
}


// Récupère les jours cochés d'un formulaire (0 = dimanche)
function checkedDays(form) {
  return $$("input[name=days]:checked", form).map(input => Number(input.value));
}
