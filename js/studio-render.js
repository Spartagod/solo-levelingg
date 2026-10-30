/* ==========================================================
   STUDIO-RENDER.JS : dessiner une diapositive en HTML
   ----------------------------------------------------------
   Transforme les "formes" d'une mise en page (rect / text / image)
   en éléments positionnés sur une scène de 1280 x 720, puis la
   réduit avec un zoom pour l'adapter à l'écran.
   ========================================================== */


function shapesOf(slide, deck, index) {
  const T = themeOf(deck);
  const layout = LAYOUTS[slide.layout] || LAYOUTS.bullets;

  return layout.build(slide.fields, T, index + 1, deck.slides.length);
}


function fontFamily(T, name) {
  return T[name || "body"] || T.body;
}


function shapeHTML(shape, T) {
  const box = `left:${shape.x}px;top:${shape.y}px;width:${shape.w}px;height:${shape.h}px;`;
  const alpha = shape.alpha !== undefined ? `opacity:${shape.alpha};` : "";

  if (shape.t === "rect") {
    return `<div class="sh" style="${box}background:${shape.fill};${alpha}${shape.radius ? `border-radius:${shape.radius}px;` : ""}"></div>`;
  }

  if (shape.t === "image") {
    return `<div class="sh" style="${box}background:url('${shape.src}') center/cover no-repeat;${shape.radius ? `border-radius:${shape.radius}px;` : ""}"></div>`;
  }

  // Texte
  const lineHeight = shape.lineHeight || 1.2;
  const justify = shape.align === "center" ? "center" : shape.align === "right" ? "flex-end" : "flex-start";

  const style = [
    box, alpha,
    `font-family:${fontFamily(T, shape.font)};`,
    `font-size:${shape.size}px;`,
    `color:${shape.color};`,
    `font-weight:${shape.bold ? 700 : 500};`,
    `text-align:${shape.align || "left"};`,
    `line-height:${lineHeight};`,
    shape.letter ? `letter-spacing:${shape.letter}px;` : "",
    `align-items:${shape.valign === "middle" ? "center" : "flex-start"};`,
    `justify-content:${justify};`
  ].join("");

  let inner;

  if (shape.bullet) {
    inner = `<div class="bl-wrap">${shape.content.map(line => `
      <p class="bl" style="margin-bottom:${shape.gap || 0}px;padding-left:${Math.round(shape.size * 0.9)}px"><i style="background:${shape.bulletColor};width:${Math.round(shape.size * 0.28)}px;height:${Math.round(shape.size * 0.28)}px;top:${Math.round(shape.size * lineHeight * 0.5 - shape.size * 0.14)}px"></i>${esc(line)}</p>`).join("")}</div>`;
  } else {
    const content = Array.isArray(shape.content) ? shape.content.join("\n") : String(shape.content ?? "");
    inner = `<div class="tx-in">${esc(content)}</div>`;
  }

  return `<div class="sh tx" style="${style}">${inner}</div>`;
}


// Le HTML d'une diapositive à l'échelle 1280 x 720
function slideHTML(slide, deck, index) {
  const T = themeOf(deck);
  const shapes = shapesOf(slide, deck, index);

  return `
    <div class="sl" style="background:${T.bg};color:${T.fg}">
      ${shapes.map(shape => shapeHTML(shape, T)).join("")}
    </div>`;
}


// Une diapositive réduite à une largeur donnée (miniatures)
function thumbHTML(slide, deck, index, width) {
  const k = width / SLIDE_W;

  return `
    <div class="scaled" style="width:${width}px;height:${Math.round(SLIDE_H * k)}px">
      <div class="scale-in" style="transform:scale(${k})">${slideHTML(slide, deck, index)}</div>
    </div>`;
}


// Adapte un conteneur ".scaled-fit" à l'espace disponible
function fitScaled(box, maxWidth, maxHeight) {
  const k = Math.min(maxWidth / SLIDE_W, maxHeight / SLIDE_H);

  box.style.width = `${Math.floor(SLIDE_W * k)}px`;
  box.style.height = `${Math.floor(SLIDE_H * k)}px`;
  $(".scale-in", box).style.transform = `scale(${k})`;
}


/* ---------- Image envoyée par l'utilisateur : réduite pour tenir dans le navigateur ---------- */

function readImage(file, onDone) {
  const reader = new FileReader();

  reader.onload = () => {
    const picture = new Image();

    picture.onload = () => {
      const ratio = Math.min(1, 1100 / Math.max(picture.width, picture.height));
      const canvas = document.createElement("canvas");

      canvas.width = Math.round(picture.width * ratio);
      canvas.height = Math.round(picture.height * ratio);
      canvas.getContext("2d").drawImage(picture, 0, 0, canvas.width, canvas.height);

      onDone(canvas.toDataURL("image/jpeg", 0.78));
    };

    picture.onerror = () => toast("Image illisible");
    picture.src = reader.result;
  };

  reader.readAsDataURL(file);
}
