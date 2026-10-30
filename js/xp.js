/* ==========================================================
   XP.JS : niveaux, rangs, caractéristiques, gain et perte d'XP
   ========================================================== */


function xpForLevel(level) {
  return CONFIG.levelBase + CONFIG.levelStep * (level - 1);
}


// À partir de l'XP totale : niveau, XP dans le niveau, XP requise, pourcentage
function levelInfo(totalXp = S.xp) {
  let level = 1;
  let rest = totalXp;

  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }

  const need = xpForLevel(level);

  return { level, into: rest, need, pct: rest / need };
}


function rankOf(level) {
  let current = RANKS[0];

  for (const rank of RANKS) {
    if (level >= rank.min) current = rank;
  }

  return current;
}


function statValue(key) {
  return 10 + Math.floor(S.statXp[key] / 20);
}


/* ---------- Gagner de l'XP ---------- */

function addXp(amount, stat, reason, quiet = false) {
  if (amount <= 0) return;

  const before = levelInfo().level;

  S.xp += amount;
  if (stat && S.statXp[stat] !== undefined) S.statXp[stat] += amount;

  S.xpLog.push({ day: dayKey(), amount, stat: stat || "", reason: reason || "" });
  if (S.xpLog.length > 800) S.xpLog.splice(0, S.xpLog.length - 800);

  save();
  if (!quiet) toast(`+${amount} XP${stat ? " · " + stat : ""}`);

  const after = levelInfo().level;
  if (after > before) showLevelUp(after);
}


/* ---------- Perdre de l'XP (pénalité) ----------
   On ne redescend jamais sous le début du niveau actuel :
   un niveau gagné est acquis.                                  */

function losePenaltyXp(amount) {
  const lost = Math.min(amount, levelInfo().into);

  S.xp -= lost;
  S.xpLog.push({ day: dayKey(), amount: -lost, stat: "", reason: "Pénalité" });
  save();

  return lost;
}


function showLevelUp(level) {
  const rank = rankOf(level);

  notify({
    kind: "levelup",
    title: "NIVEAU SUPÉRIEUR",
    lines: [`Vous êtes maintenant niveau ${level}.`, `Rang actuel : ${rank.rank}`],
    sound: "levelup"
  });
}
