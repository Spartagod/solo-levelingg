/* ==========================================================
   SETTINGS.JS : réglages, sauvegarde et remise à zéro
   ========================================================== */


function renderSettings(root) {
  const s = S.settings;
  const syncCfg = getSyncConfig();

  root.innerHTML = `
    <section class="win">
      <span class="win-t">Joueur</span>
      <form class="form" id="playerForm">
        <div class="row">
          <label>Nom<input name="name" maxlength="40" value="${esc(S.player.name)}"></label>
          <label>Titre<input name="title" maxlength="60" value="${esc(S.player.title)}"></label>
          <label>Objectif sport (séances / semaine)<input name="goal" type="number" min="1" max="14" value="${S.gym.weeklyGoal}"></label>
        </div>
        <div class="row end"><button class="btn primary" type="submit">Enregistrer</button></div>
      </form>
    </section>

    <section class="win">
      <span class="win-t">Système</span>
      <div class="switches">
        ${toggle("sound", "Sons (uniquement quand on avance)", s.sound)}
        ${toggle("penalties", "Zone de pénalité (XP perdue si quête obligatoire manquée)", s.penalties)}
        ${toggle("remind", "Rappel avant chaque bloc du planning", s.remind)}
        ${toggle("evening", "Rappel du soir à 20:00 s'il reste des quêtes", s.evening)}
      </div>
      <label class="inline-num">Rappel avant un bloc (minutes)<input id="remindMin" type="number" min="1" max="120" value="${s.remindMin}"></label>
      <div class="row"><button class="btn" type="button" data-act="sound-test">Tester le son</button></div>
    </section>

    <section class="win">
      <span class="win-t">Planning</span>
      <p class="muted">Ton planning de départ est dans le fichier <code class="inline-code">js/data.js</code> (variable <code class="inline-code">DEFAULT_EVENTS</code>) : ouvre-le avec n'importe quel éditeur de texte pour voir et modifier tes créneaux (titre, catégorie, heure de début/fin, jours), puis reviens ici et recharge.</p>
      <button class="btn" type="button" data-act="reload-planning">Recharger le planning depuis data.js</button>
    </section>

    <section class="win">
      <span class="win-t">Synchronisation entre appareils</span>
      <p class="muted">Optionnel : avec ton compte GitHub (pas de nouveau service à créer), tes données se synchronisent automatiquement entre tous les appareils connectés au même Gist. Statut : ${esc(syncStatusLabel())}</p>
      <p class="muted">Sur le <strong>premier</strong> appareil : colle juste ton jeton GitHub, laisse "ID du Gist" vide, Enregistrer — un Gist privé est créé et son ID s'affiche. Sur les appareils <strong>suivants</strong> : colle le même jeton (ou un autre, même compte) ET cet ID.</p>
      <form class="form" id="syncForm">
        <div class="row">
          <label>Jeton d'accès GitHub (scope "gist")<input name="token" value="${esc(syncCfg?.token || "")}" placeholder="ghp_..."></label>
          <label>ID du Gist (vide la 1ère fois)<input name="gistId" value="${esc(syncCfg?.gistId || "")}" placeholder="laisser vide pour le créer"></label>
        </div>
        <div class="row end">
          ${syncCfg ? `<button class="btn danger" type="button" data-act="sync-off">Désactiver</button>` : ""}
          <button class="btn" type="button" data-act="sync-now" ${syncCfg?.gistId ? "" : "disabled"}>Synchroniser maintenant</button>
          <button class="btn primary" type="submit">Enregistrer${syncCfg?.gistId ? "" : " et créer"}</button>
        </div>
      </form>
    </section>

    <section class="win">
      <span class="win-t">Sauvegarde</span>
      <p class="muted">Tes données sont gardées dans ce navigateur. Copie la sauvegarde pour la garder ou la transférer sur un autre ordinateur.</p>
      <textarea id="backup" rows="5" class="mono" aria-label="Sauvegarde JSON"></textarea>
      <div class="row">
        <button class="btn" type="button" data-act="export">Générer la sauvegarde</button>
        <button class="btn" type="button" data-act="copy">Copier</button>
        <button class="btn" type="button" data-act="import">Restaurer depuis le texte</button>
      </div>
    </section>

    <section class="win danger-zone">
      <span class="win-t">Zone dangereuse</span>
      <p class="muted">Remet le niveau, l'XP, le planning, les projets et les cartes à leur état de départ.</p>
      <button class="btn danger" type="button" data-act="reset">Tout réinitialiser</button>
    </section>`;

  root.onclick = event => {
    const target = event.target.closest("[data-act]");
    if (!target) return;

    const action = target.dataset.act;
    const area = $("#backup", root);

    if (action === "toggle") {
      const key = target.dataset.key;
      S.settings[key] = !S.settings[key];
      save();
      renderSettings(root);
    }
    if (action === "sound-test") Sound.play("notify");
    if (action === "reload-planning") {
      askConfirm("Remplacer ton planning actuel par celui de js/data.js ?", () => {
        S.events = structuredClone(DEFAULT_EVENTS);
        save();
        refresh();
        toast(`${S.events.length} créneau(x) rechargé(s) depuis data.js`);
      }, "Recharger");
    }
    if (action === "sync-off") {
      askConfirm("Désactiver la synchronisation sur cet appareil ? Tes données restent ici, elles ne s'enverront simplement plus.", () => {
        setSyncConfig(null);
        toast("Synchronisation désactivée");
        refresh();
      }, "Désactiver");
    }
    if (action === "sync-now") {
      toast("Synchronisation en cours...");
      syncNow().then(() => { refresh(); });
    }
    if (action === "export") area.value = exportState();
    if (action === "copy") copyText(area.value || exportState(), area);
    if (action === "import") {
      try {
        importState(area.value);
        notify({ title: "SAUVEGARDE RESTAURÉE", lines: ["Tes données ont été chargées."] });
        refresh();
      } catch (error) {
        toast("Texte de sauvegarde invalide");
      }
    }
    if (action === "reset") {
      askConfirm("Tout effacer et repartir niveau 1 ?", () => {
        resetState();
        refresh();
        notify({ title: "SYSTÈME RÉINITIALISÉ", lines: ["Nouveau départ."] });
      }, "Tout effacer");
    }
  };

  root.onsubmit = event => {
    event.preventDefault();

    if (event.target.id === "playerForm") {
      const data = formData(event.target);

      S.player.name = data.name.trim() || S.player.name;
      S.player.title = data.title.trim();
      S.gym.weeklyGoal = clamp(Number(data.goal) || 3, 1, 14);
      save();
      toast("Enregistré");
      refresh();
      return;
    }

    if (event.target.id === "syncForm") {
      const data = formData(event.target);
      const token = data.token.trim();
      const gistId = data.gistId.trim();

      if (!token) {
        toast("Colle ton jeton GitHub pour activer la synchronisation");
        return;
      }

      toast(gistId ? "Connexion en cours..." : "Création du Gist en cours...");

      syncConnect({ token, gistId }).then(result => {
        if (result.created) {
          notify({ title: "GIST CRÉÉ", lines: [`ID à copier sur tes autres appareils :`, result.gistId] });
        }
        refresh();
      });
    }
  };

  $("#remindMin", root).addEventListener("change", event => {
    S.settings.remindMin = clamp(Number(event.target.value) || 10, 1, 120);
    save();
  });
}


function toggle(key, label, on) {
  return `
    <button type="button" class="switch ${on ? "on" : ""}" data-act="toggle" data-key="${key}" role="switch" aria-checked="${on}">
      <span class="knob"></span><span>${esc(label)}</span>
    </button>`;
}


function copyText(text, area) {
  const fallback = () => { area.value = text; area.select(); toast("Sélectionné : fais Ctrl+C"); };

  if (!navigator.clipboard) { fallback(); return; }

  navigator.clipboard.writeText(text).then(() => toast("Copié"), fallback);
}
