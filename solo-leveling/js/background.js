/* ==========================================================
   BACKGROUND.JS : fond animé (particules bleues qui montent)
   Discret, désactivé si l'utilisateur réduit les animations.
   ========================================================== */


function initBackground() {
  const canvas = $("#bg");
  const context = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let motes = [];


  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    motes = Array.from({ length: Math.round(width / 22) }, newMote);
  }


  function newMote() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      speed: Math.random() * 0.35 + 0.1,
      drift: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.5 + 0.15
    };
  }


  function draw() {
    context.clearRect(0, 0, width, height);

    for (const mote of motes) {
      mote.y -= mote.speed;
      mote.x += mote.drift;

      if (mote.y < -4) { mote.y = height + 4; mote.x = Math.random() * width; }

      context.beginPath();
      context.fillStyle = `rgba(80, 200, 255, ${mote.alpha})`;
      context.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
      context.fill();
    }

    if (!reduced) requestAnimationFrame(draw);
  }


  window.addEventListener("resize", resize);
  resize();
  draw();
}
