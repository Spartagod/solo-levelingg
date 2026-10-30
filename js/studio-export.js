/* ==========================================================
   STUDIO-EXPORT.JS : exporter une présentation en PowerPoint (.pptx)
   ----------------------------------------------------------
   Utilise la bibliothèque PptxGenJS, chargée seulement au moment de
   l'export (il faut une connexion internet). Les formes de chaque
   mise en page sont converties une par une : texte, rectangles, images.
   Le fichier s'ouvre dans PowerPoint, Keynote et Google Slides.
   ========================================================== */


const PPTX_URL = "https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js";

const PX = 13.333 / SLIDE_W;        // 1 pixel de la scène = tant de pouces

const PPT_FONTS = { head: "Arial", body: "Arial", mono: "Consolas" };


function loadPptx() {
  return new Promise((resolve, reject) => {
    if (window.PptxGenJS) { resolve(); return; }

    const script = document.createElement("script");

    script.src = PPTX_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Impossible de charger la bibliothèque PowerPoint (connexion internet ?)"));
    document.head.appendChild(script);
  });
}


function hex(color) {
  return color.replace("#", "").toUpperCase();
}


function imageRatio(src) {
  return new Promise(resolve => {
    const picture = new Image();

    picture.onload = () => resolve(picture.height / picture.width);
    picture.onerror = () => resolve(0.5625);
    picture.src = src;
  });
}


async function addShape(page, shape) {
  const x = shape.x * PX;
  const y = shape.y * PX;
  const w = shape.w * PX;
  const h = shape.h * PX;

  if (shape.t === "rect") {
    const round = shape.radius || 0;
    const circle = round >= Math.min(shape.w, shape.h) / 2 - 1;

    page.addShape(circle ? "ellipse" : round ? "roundRect" : "rect", {
      x, y, w, h,
      fill: { color: hex(shape.fill), transparency: shape.alpha !== undefined ? Math.round((1 - shape.alpha) * 100) : 0 },
      line: { type: "none" },
      ...(round && !circle ? { rectRadius: round * PX } : {})
    });
    return;
  }

  if (shape.t === "image") {
    // "cover" : l'image garde ses proportions et remplit la boîte, le surplus est rogné
    const ratio = await imageRatio(shape.src);

    page.addImage({
      data: shape.src, x, y, w, h: w * ratio,
      sizing: { type: "cover", w, h }
    });
    return;
  }

  // Texte
  const base = {
    x, y, w, h,
    fontFace: PPT_FONTS[shape.font || "body"],
    fontSize: Math.max(8, Math.round(shape.size * 0.75)),
    color: hex(shape.color),
    bold: Boolean(shape.bold),
    align: shape.align || "left",
    valign: shape.valign === "middle" ? "middle" : "top",
    margin: 0,
    lineSpacingMultiple: shape.lineHeight ? Math.min(1.6, shape.lineHeight) : 1.1,
    ...(shape.letter ? { charSpacing: Math.round(shape.letter * 0.75) } : {}),
    ...(shape.alpha !== undefined ? { transparency: Math.round((1 - shape.alpha) * 100) } : {})
  };

  if (shape.bullet) {
    const runs = shape.content.map(line => ({
      text: line,
      options: { bullet: { characterCode: "25A0", indent: Math.round(shape.size * 0.75 * 1.1) }, breakLine: true, paraSpaceAfter: Math.round((shape.gap || 0) * 0.75) }
    }));

    page.addText(runs, base);
    return;
  }

  const content = Array.isArray(shape.content) ? shape.content.join("\n") : String(shape.content ?? "");
  if (content) page.addText(content, base);
}


async function exportPptx(deck) {
  toast("Création du fichier PowerPoint...");

  try {
    await loadPptx();

    const pptx = new window.PptxGenJS();
    const T = themeOf(deck);

    pptx.layout = "LAYOUT_WIDE";
    pptx.title = deck.title;
    pptx.author = S.player.name;

    for (let i = 0; i < deck.slides.length; i++) {
      const slide = deck.slides[i];
      const page = pptx.addSlide();

      page.background = { color: hex(T.bg) };

      for (const shape of shapesOf(slide, deck, i)) await addShape(page, shape);

      if (slide.notes) page.addNotes(slide.notes);
    }

    const name = (deck.title || "presentation").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "presentation";

    await pptx.writeFile({ fileName: `${name}.pptx` });
    toast("Fichier .pptx prêt");
  } catch (error) {
    notify({ kind: "warn", title: "EXPORT IMPOSSIBLE", lines: [error.message || "Erreur pendant la création du fichier."] });
  }
}
