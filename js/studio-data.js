/* ==========================================================
   STUDIO-DATA.JS : thèmes, mises en page et présentation d'exemple
   ----------------------------------------------------------
   Une diapositive = { id, layout, fields, notes }.
   Chaque mise en page (LAYOUTS) décrit :
   - fields : les champs que tu remplis dans le panneau de droite
   - build  : une fonction qui transforme ces champs en "formes"
              (rectangles, textes, images) sur une scène de 1280 x 720.
   Les MÊMES formes servent à l'affichage ET à l'export PowerPoint,
   donc ce que tu vois est ce que tu obtiens.

   Pour ajouter une mise en page : copie-en une dans LAYOUTS.
   Pour ajouter un thème : copie-en un dans THEMES.
   ========================================================== */


const SLIDE_W = 1280;
const SLIDE_H = 720;


/* ---------- Thèmes ---------- */
const THEMES = {
  systeme: { name: "Système",  bg: "#050d1e", fg: "#d9eeff", muted: "#7f9bb8", accent: "#3fc8ff", accent2: "#1b7dff", panel: "#0b1a35", head: "'Chakra Petch', sans-serif", body: "'Rajdhani', sans-serif", mono: "'JetBrains Mono', monospace" },
  cyber:   { name: "Cyber",    bg: "#07100c", fg: "#e6f4ec", muted: "#8fb3a0", accent: "#38f58a", accent2: "#1fb866", panel: "#0e1d16", head: "'Chakra Petch', sans-serif", body: "'IBM Plex Sans', sans-serif", mono: "'JetBrains Mono', monospace" },
  violet:  { name: "Violet",   bg: "#0d0818", fg: "#f0e8ff", muted: "#a794c8", accent: "#b685ff", accent2: "#7c4dff", panel: "#171027", head: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
  alerte:  { name: "Alerte",   bg: "#120609", fg: "#ffeef0", muted: "#c79aa1", accent: "#ff4256", accent2: "#c81e33", panel: "#1e0d12", head: "'Chakra Petch', sans-serif", body: "'Rajdhani', sans-serif", mono: "'JetBrains Mono', monospace" },
  clair:   { name: "Clair",    bg: "#f6f7fb", fg: "#14182b", muted: "#5b6480", accent: "#2f5bff", accent2: "#1a3fd6", panel: "#e8ebf5", head: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
  papier:  { name: "Papier",   bg: "#f5efe3", fg: "#2a2118", muted: "#7a6a58", accent: "#c8501e", accent2: "#a53c10", panel: "#ebe2d0", head: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" }
};


/* ---------- Petits constructeurs de formes ---------- */

const rect = (x, y, w, h, fill, extra = {}) => ({ t: "rect", x, y, w, h, fill, ...extra });

const text = (x, y, w, h, content, size, color, extra = {}) => ({ t: "text", x, y, w, h, content, size, color, ...extra });

const image = (x, y, w, h, src, extra = {}) => ({ t: "image", x, y, w, h, src, ...extra });


// Estime la taille de police pour que le texte tienne dans la boîte
function fitText(content, w, h, size, minSize = 14, lineHeight = 1.3, charWidth = 0.52) {
  const list = Array.isArray(content) ? content : String(content || "").split("\n");

  for (let current = size; current >= minSize; current -= 1) {
    const perLine = Math.max(4, Math.floor(w / (current * charWidth)));
    const lines = list.reduce((sum, line) => sum + Math.max(1, Math.ceil(String(line).length / perLine)), 0);

    if (lines * current * lineHeight <= h) return current;
  }

  return minSize;
}


function splitLines(value) {
  return String(value || "").split("\n").map(line => line.trim()).filter(Boolean);
}


// Fond commun : bandeau d'accent à gauche et petit repère en bas
function decor(T, number, total) {
  return [
    rect(0, 0, 14, SLIDE_H, T.accent),
    rect(1180, 30, 70, 4, T.accent, { alpha: 0.5 }),
    text(96, 672, 700, 28, "TOM KOULMANN", 14, T.muted, { font: "mono", letter: 4 }),
    number ? text(1084, 672, 100, 28, `${number} / ${total}`, 14, T.muted, { font: "mono", align: "right" }) : null
  ].filter(Boolean);
}


function titleBlock(T, title) {
  return [
    text(96, 64, 1088, 90, title, fitText(title, 1088, 90, 54, 30, 1.15, 0.58), T.fg, { font: "head", bold: true, valign: "middle" }),
    rect(96, 164, 120, 6, T.accent)
  ];
}


/* ---------- Les mises en page ----------
   Types de champ : text (une ligne), area (plusieurs lignes), image, select   */

const LAYOUTS = {

  title: {
    label: "Titre",
    fields: [
      { k: "tag", label: "Petite ligne au-dessus", type: "text", def: "$ whoami" },
      { k: "title", label: "Titre", type: "text", def: "Titre de la présentation" },
      { k: "subtitle", label: "Sous-titre", type: "area", def: "Une phrase pour dire de quoi on parle." }
    ],
    build: (f, T) => [
      rect(0, 0, 14, SLIDE_H, T.accent),
      rect(900, -120, 520, 520, T.accent, { alpha: 0.07, radius: 260 }),
      rect(1000, 380, 420, 420, T.accent2, { alpha: 0.08, radius: 210 }),
      text(96, 190, 900, 40, f.tag, 26, T.accent, { font: "mono", letter: 3 }),
      text(96, 244, 1000, 220, f.title, fitText(f.title, 1000, 220, 104, 44, 1.05, 0.52), T.fg, { font: "head", bold: true, valign: "middle" }),
      rect(96, 482, 140, 6, T.accent),
      text(96, 510, 920, 130, f.subtitle, fitText(f.subtitle, 920, 130, 36, 20), T.muted, { font: "body" })
    ]
  },


  section: {
    label: "Section",
    fields: [
      { k: "num", label: "Numéro", type: "text", def: "01" },
      { k: "title", label: "Titre", type: "text", def: "Nouvelle section" },
      { k: "subtitle", label: "Phrase d'accroche", type: "area", def: "" }
    ],
    build: (f, T) => [
      rect(0, 0, 14, SLIDE_H, T.accent),
      text(96, 100, 600, 260, f.num, 230, T.accent, { font: "head", bold: true, alpha: 0.9 }),
      text(96, 380, 1000, 120, f.title, fitText(f.title, 1000, 120, 88, 40, 1.05, 0.52), T.fg, { font: "head", bold: true, valign: "middle" }),
      rect(96, 516, 120, 6, T.accent),
      text(96, 544, 900, 100, f.subtitle, fitText(f.subtitle, 900, 100, 32, 18), T.muted, { font: "body" })
    ]
  },


  bullets: {
    label: "Liste à puces",
    fields: [
      { k: "title", label: "Titre", type: "text", def: "Titre" },
      { k: "items", label: "Points (un par ligne)", type: "area", def: "Premier point\nDeuxième point\nTroisième point" }
    ],
    build: (f, T, n, total) => {
      const items = splitLines(f.items);
      const size = fitText(items, 1040, 450, 38, 20, 1.55, 0.5);

      return [
        ...decor(T, n, total),
        ...titleBlock(T, f.title),
        text(96, 206, 1088, 440, items, size, T.fg, { font: "body", bullet: true, bulletColor: T.accent, lineHeight: 1.45, gap: size * 0.35 })
      ];
    }
  },


  twocol: {
    label: "Deux colonnes",
    fields: [
      { k: "title", label: "Titre", type: "text", def: "Titre" },
      { k: "leftTitle", label: "Colonne gauche : titre", type: "text", def: "Avant" },
      { k: "left", label: "Colonne gauche : points", type: "area", def: "Point un\nPoint deux" },
      { k: "rightTitle", label: "Colonne droite : titre", type: "text", def: "Après" },
      { k: "right", label: "Colonne droite : points", type: "area", def: "Point un\nPoint deux" }
    ],
    build: (f, T, n, total) => {
      const left = splitLines(f.left);
      const right = splitLines(f.right);
      const size = fitText([...left, ...right], 440, 300, 30, 18, 1.5, 0.5);

      const column = (x, heading, items) => [
        rect(x, 196, 528, 440, T.panel, { radius: 14 }),
        rect(x, 196, 528, 6, T.accent),
        text(x + 32, 224, 464, 50, heading, 32, T.accent, { font: "head", bold: true }),
        text(x + 32, 292, 464, 320, items, size, T.fg, { font: "body", bullet: true, bulletColor: T.accent, lineHeight: 1.4, gap: size * 0.3 })
      ];

      return [...decor(T, n, total), ...titleBlock(T, f.title), ...column(96, f.leftTitle, left), ...column(656, f.rightTitle, right)];
    }
  },


  imagetext: {
    label: "Image et texte",
    fields: [
      { k: "title", label: "Titre", type: "text", def: "Titre" },
      { k: "items", label: "Texte (un point par ligne)", type: "area", def: "Premier point\nDeuxième point" },
      { k: "image", label: "Image", type: "image", def: "" },
      { k: "side", label: "Position de l'image", type: "select", def: "right", options: [["right", "À droite"], ["left", "À gauche"]] }
    ],
    build: (f, T, n, total) => {
      const items = splitLines(f.items);
      const size = fitText(items, 520, 420, 32, 18, 1.5, 0.5);
      const imageX = f.side === "left" ? 96 : 700;
      const textX = f.side === "left" ? 660 : 96;

      return [
        ...decor(T, n, total),
        ...titleBlock(T, f.title),
        f.image
          ? image(imageX, 196, 484, 440, f.image, { radius: 14 })
          : rect(imageX, 196, 484, 440, T.panel, { radius: 14 }),
        f.image ? null : text(imageX, 196, 484, 440, "Ajoute une image", 28, T.muted, { align: "center", valign: "middle", font: "mono" }),
        text(textX, 200, 524, 436, items, size, T.fg, { font: "body", bullet: true, bulletColor: T.accent, lineHeight: 1.4, gap: size * 0.3 })
      ].filter(Boolean);
    }
  },


  fullimage: {
    label: "Grande image",
    fields: [
      { k: "image", label: "Image", type: "image", def: "" },
      { k: "caption", label: "Légende", type: "text", def: "" }
    ],
    build: (f, T) => [
      f.image ? image(0, 0, SLIDE_W, SLIDE_H, f.image) : rect(0, 0, SLIDE_W, SLIDE_H, T.panel),
      f.image ? null : text(0, 0, SLIDE_W, SLIDE_H, "Ajoute une image", 36, T.muted, { align: "center", valign: "middle", font: "mono" }),
      f.caption ? rect(0, 600, SLIDE_W, 120, T.bg, { alpha: 0.8 }) : null,
      f.caption ? text(80, 600, 1120, 120, f.caption, fitText(f.caption, 1120, 100, 38, 20), T.fg, { font: "head", valign: "middle" }) : null
    ].filter(Boolean)
  },


  quote: {
    label: "Citation",
    fields: [
      { k: "quote", label: "Citation", type: "area", def: "Une phrase qui marque." },
      { k: "author", label: "Auteur", type: "text", def: "Quelqu'un" }
    ],
    build: (f, T) => [
      rect(0, 0, 14, SLIDE_H, T.accent),
      text(96, 60, 300, 260, "“", 300, T.accent, { font: "head", bold: true, alpha: 0.5 }),
      text(160, 230, 960, 280, f.quote, fitText(f.quote, 960, 280, 58, 28, 1.25, 0.5), T.fg, { font: "head", valign: "middle" }),
      rect(160, 538, 80, 5, T.accent),
      text(160, 560, 900, 50, f.author, 30, T.accent, { font: "mono" })
    ]
  },


  stats: {
    label: "Chiffres clés",
    fields: [
      { k: "title", label: "Titre", type: "text", def: "En chiffres" },
      { k: "stats", label: "Chiffres (une ligne : valeur | légende)", type: "area", def: "2e | année\n11 | projets\n1 | stage" }
    ],
    build: (f, T, n, total) => {
      const list = splitLines(f.stats).slice(0, 4).map(line => {
        const [value, label] = line.split("|").map(part => part.trim());
        return { value: value || "", label: label || "" };
      });
      const gap = 28;
      const width = (1088 - gap * (list.length - 1)) / Math.max(1, list.length);

      return [
        ...decor(T, n, total),
        ...titleBlock(T, f.title),
        ...list.flatMap((item, i) => {
          const x = 96 + i * (width + gap);

          return [
            rect(x, 220, width, 380, T.panel, { radius: 14 }),
            rect(x, 220, width, 6, T.accent),
            text(x + 20, 270, width - 40, 150, item.value, fitText(item.value, width - 40, 150, 110, 40, 1, 0.58), T.accent, { font: "head", bold: true, align: "center", valign: "middle" }),
            text(x + 20, 440, width - 40, 130, item.label, fitText(item.label, width - 40, 130, 32, 18), T.fg, { font: "body", align: "center" })
          ];
        })
      ];
    }
  },


  project: {
    label: "Fiche projet",
    fields: [
      { k: "kicker", label: "Étiquette", type: "text", def: "TECH 2 · PROJET" },
      { k: "title", label: "Nom du projet", type: "text", def: "Nom du projet" },
      { k: "stack", label: "Technologies (séparées par des virgules)", type: "text", def: "Python, Linux" },
      { k: "text", label: "Description (un point par ligne)", type: "area", def: "Objectif\nMa part\nRésultat" },
      { k: "link", label: "Lien ou dépôt", type: "text", def: "" }
    ],
    build: (f, T, n, total) => {
      const items = splitLines(f.text);
      const size = fitText(items, 420, 380, 30, 18, 1.5, 0.5);
      const stack = String(f.stack || "").split(",").map(s => s.trim()).filter(Boolean).join("  ·  ");

      return [
        ...decor(T, n, total),
        text(96, 100, 500, 32, f.kicker, 22, T.accent, { font: "mono", letter: 3 }),
        text(96, 150, 520, 200, f.title, fitText(f.title, 520, 200, 76, 30, 1.05, 0.66), T.fg, { font: "head", bold: true, valign: "top" }),
        rect(96, 370, 100, 6, T.accent),
        text(96, 396, 520, 120, stack, fitText(stack, 520, 120, 28, 16), T.accent, { font: "mono" }),
        f.link ? text(96, 560, 520, 40, f.link, 22, T.muted, { font: "mono" }) : null,
        rect(660, 100, 524, 520, T.panel, { radius: 14 }),
        rect(660, 100, 524, 6, T.accent),
        text(692, 132, 460, 36, "FICHE_PROJET.TXT", 18, T.muted, { font: "mono", letter: 3 }),
        text(692, 188, 460, 400, items, size, T.fg, { font: "body", bullet: true, bulletColor: T.accent, lineHeight: 1.4, gap: size * 0.35 })
      ].filter(Boolean);
    }
  },


  steps: {
    label: "Étapes",
    fields: [
      { k: "title", label: "Titre", type: "text", def: "Comment ça marche" },
      { k: "steps", label: "Étapes (une ligne : titre | détail)", type: "area", def: "Analyser | Comprendre le besoin\nConstruire | Écrire le code\nTester | Vérifier et corriger" }
    ],
    build: (f, T, n, total) => {
      const list = splitLines(f.steps).slice(0, 5).map(line => {
        const [name, detail] = line.split("|").map(part => part.trim());
        return { name: name || "", detail: detail || "" };
      });
      const gap = 24;
      const width = (1088 - gap * (list.length - 1)) / Math.max(1, list.length);

      return [
        ...decor(T, n, total),
        ...titleBlock(T, f.title),
        rect(96, 262, 1088, 3, T.accent, { alpha: 0.4 }),
        ...list.flatMap((item, i) => {
          const x = 96 + i * (width + gap);

          return [
            rect(x, 240, 46, 46, T.accent, { radius: 23 }),
            text(x, 240, 46, 46, String(i + 1), 24, T.bg, { font: "head", bold: true, align: "center", valign: "middle" }),
            text(x, 316, width, 70, item.name, fitText(item.name, width, 70, 32, 18, 1.2, 0.52), T.fg, { font: "head", bold: true }),
            text(x, 396, width, 220, item.detail, fitText(item.detail, width, 220, 26, 15, 1.4, 0.5), T.muted, { font: "body" })
          ];
        })
      ];
    }
  },


  end: {
    label: "Fin",
    fields: [
      { k: "tag", label: "Petite ligne", type: "text", def: "$ exit 0" },
      { k: "title", label: "Titre", type: "text", def: "Merci" },
      { k: "lines", label: "Coordonnées (une par ligne)", type: "area", def: "email@exemple.com\ngithub.com/pseudo" }
    ],
    build: (f, T) => {
      const list = splitLines(f.lines);

      return [
        rect(0, 0, 14, SLIDE_H, T.accent),
        rect(840, 260, 560, 560, T.accent, { alpha: 0.07, radius: 280 }),
        text(96, 150, 700, 40, f.tag, 26, T.accent, { font: "mono", letter: 3 }),
        text(96, 210, 1000, 230, f.title, fitText(f.title, 1000, 230, 190, 60, 1, 0.55), T.fg, { font: "head", bold: true, valign: "middle" }),
        rect(96, 460, 120, 6, T.accent),
        text(96, 490, 900, 160, list, 30, T.accent, { font: "mono", lineHeight: 1.6 })
      ];
    }
  }
};


/* ---------- Valeurs de départ d'une diapositive ---------- */

function defaultFields(layout) {
  const fields = {};

  for (const field of LAYOUTS[layout].fields) fields[field.k] = field.def;

  return fields;
}


function newSlide(layout, fields = {}, notes = "") {
  return { id: uid(), layout, fields: { ...defaultFields(layout), ...fields }, notes };
}


function themeOf(deck) {
  return THEMES[deck.theme] || THEMES.systeme;
}


/* ---------- Présentation d'exemple : tes projets ---------- */

function seedProjectsDeck() {
  const project = (kicker, title, stack, lines, notes) => newSlide("project", { kicker, title, stack, text: lines.join("\n") }, notes);

  return {
    id: uid(),
    title: "Mes projets Epitech",
    theme: "cyber",
    updated: Date.now(),
    slides: [
      newSlide("title", { tag: "$ whoami", title: "Tom Koulmann", subtitle: "Mes projets Epitech : je construis, je casse, je sécurise." },
        "Bonjour, je m'appelle Tom, étudiant en 2e année à Epitech, spécialisé en cybersécurité."),
      newSlide("stats", { title: "En quelques chiffres", stats: "2e | année à Epitech\n11 | projets en deux ans\n605 | anglais sur 990" },
        "Trois repères pour me situer."),
      newSlide("section", { num: "01", title: "Tech 1", subtitle: "Première année : data, IA, réseau, cybersécurité et un stage au CNRS." }),
      project("TECH 1 · PROJET DE FIN D'ANNÉE", "Job Aggregator", "Cybersécurité, Défense web", ["Projet de fin d'année", "Ma part : la cybersécurité", "Mission : défendre le site"],
        "Précise ici les protections mises en place : c'est le point fort à montrer."),
      project("TECH 1 · PROJET", "Hack and Juice", "CTF, Cybersécurité", ["Format : Capture The Flag", "Trouver des failles", "Récupérer les flags"],
        "Mon premier CTF : c'est ce qui m'a donné envie de me spécialiser en cybersécurité."),
      project("CNRS · STAGE", "Trombinoscope", "Stage, Outil interne", ["Stage au CNRS", "Un trombinoscope interne", "Un annuaire avec les photos des membres"],
        "Ajoute les technologies utilisées, la durée du stage et l'apport pour l'équipe."),
      newSlide("section", { num: "02", title: "Tech 2", subtitle: "Deuxième année, spécialisation cybersécurité : un jeu, une attaque d'IA et des CTF." }),
      project("TECH 2 · PROJET 01", "2D Game", "Java, POO", ["Créer un jeu vidéo en 2D", "Classes et héritages", "Architecture claire"],
        "Ajoute le type de jeu, une difficulté rencontrée et ce que tu as retenu."),
      project("TECH 2 · PROJET 02", "Codename", "IA, Prompt injection, Ollama", ["Faire révéler son secret à un modèle Ollama", "Attaque : 5 fichiers de prompts", "Défense : 1 fichier qui bloque tout"],
        "Montre un exemple de prompt d'attaque et la réponse du modèle."),
      project("TECH 2 · PROJET 03", "Exegol", "CTF, Exegol, Injections, Fuzzing", ["Récupérer un maximum de flags", "Outil : Exegol", "Injections et fuzzing"],
        "Raconte un flag trouvé et comment."),
      newSlide("end", { tag: "$ exit 0", title: "Merci", lines: "ton@email.com\ngithub.com/ton-pseudo\nlinkedin.com/in/ton-profil" },
        "Remplace les coordonnées par les vraies, puis propose de revenir sur le projet de ton choix.")
    ]
  };
}
