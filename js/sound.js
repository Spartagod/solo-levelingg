/* ==========================================================
   SOUND.JS : les sons du Système
   ----------------------------------------------------------
   Règle : un son uniquement quand on AVANCE (ouvrir une page,
   recevoir une notification, valider...). Jamais sur un retour
   ou une croix de fermeture.

   - "notify" et "levelup" jouent ton fichier mp3 s'il existe
     (CONFIG.soundFile), sinon un son synthétique.
   - "click" est un petit bip synthétique.
   Pour choisir quel son va sur quel bouton : appelle
   Sound.play("notify") ou Sound.play("click") dans le code.
   ========================================================== */


const Sound = (() => {

  let audioContext = null;
  let fileAudio = null;
  let fileMissing = false;


  function context() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContext = new AudioCtx();
    }

    if (audioContext.state === "suspended") audioContext.resume();

    return audioContext;
  }


  function tone(frequency, duration, delay = 0, volume = 0.07, type = "sine") {
    const ctx = context();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }


  function synth(name) {
    if (name === "click") {
      tone(880, 0.07, 0, 0.05, "square");
      return;
    }

    if (name === "levelup") {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, i * 0.11, 0.07, "triangle"));
      return;
    }

    // "notify" : deux notes claires, façon fenêtre du Système
    tone(988, 0.18, 0, 0.07, "sine");
    tone(1319, 0.34, 0.14, 0.07, "sine");
  }


  function playFile() {
    if (fileMissing) return false;

    if (!fileAudio) {
      fileAudio = new Audio(CONFIG.soundFile);
      fileAudio.addEventListener("error", () => { fileMissing = true; });
    }

    fileAudio.currentTime = 0;
    fileAudio.play().catch(() => synth("notify"));

    return true;
  }


  function play(name) {
    if (!S.settings.sound) return;

    try {
      if ((name === "notify" || name === "levelup") && playFile()) return;
      synth(name);
    } catch (error) {
      // pas de son disponible : on ignore
    }
  }


  return { play };

})();
