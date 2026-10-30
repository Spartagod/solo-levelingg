/* ==========================================================
   CODE.JS : page "Code" — importer les fichiers d'un projet
   (Epitech, stage...) pour les relire et créer des cartes dessus,
   afin de bien savoir les expliquer le jour d'une défense.
   ----------------------------------------------------------
   - Un "projet" = un dossier importé (ou une page vide), avec
     plusieurs fichiers.
   - Chaque projet a un "sujet" lié dans Apprendre (js/learn.js) :
     les cartes qu'on crée ici s'y ajoutent et se révisent par
     répétition espacée, comme n'importe quel autre sujet.
   - highlightCode / renderMarkdown : voir le haut de ce fichier.
   ========================================================== */


const CODE_KEYWORDS = new Set([
  "if", "else", "elif", "for", "while", "do", "return", "function", "def", "class",
  "public", "private", "protected", "static", "void", "int", "float", "double",
  "boolean", "bool", "string", "char", "new", "import", "from", "include", "require",
  "true", "false", "null", "none", "True", "False", "None", "break", "continue",
  "switch", "case", "default", "try", "catch", "except", "finally", "throw", "throws",
  "extends", "implements", "interface", "abstract", "final", "const", "let", "var",
  "echo", "print", "self", "this", "super", "package", "namespace", "use", "as", "in",
  "is", "not", "and", "or", "lambda", "yield", "async", "await", "end", "then", "begin",
  "struct", "enum", "typedef", "using", "global",
  "SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "JOIN", "INTO", "VALUES",
  "CREATE", "TABLE", "ALTER", "DROP", "select", "from", "where", "insert", "update",
  "delete", "join", "into", "values", "create", "table", "alter", "drop"
]);


// Un seul passage sur le code : commentaires, chaînes, nombres, mots-clés.
// Tout le reste est échappé tel quel (sécurité + affichage fidèle).
function highlightCode(code) {
  const TOKEN_RE = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
  const str = String(code ?? "");
  let out = "";
  let last = 0;

  str.replace(TOKEN_RE, (match, comment, string, number, word, offset) => {
    out += esc(str.slice(last, offset));

    if (comment !== undefined) out += `<span class="tok-comment">${esc(comment)}</span>`;
    else if (string !== undefined) out += `<span class="tok-string">${esc(string)}</span>`;
    else if (number !== undefined) out += `<span class="tok-number">${esc(number)}</span>`;
    else if (word !== undefined) out += CODE_KEYWORDS.has(word) ? `<span class="tok-keyword">${esc(word)}</span>` : esc(word);

    last = offset + match.length;
    return match;
  });

  out += esc(str.slice(last));
  return out;
}


// Mise en forme simple à l'intérieur d'une ligne : `code`, **gras**, *italique*
function inlineMd(text) {
  let out = esc(text);

  out = out.replace(/`([^`]+)`/g, (_, code) => `<code class="inline-code">${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");

  return out;
}


// Texte markdown complet -> HTML : blocs de code d'abord, puis le reste.
function renderMarkdown(src) {
  const text = String(src ?? "");
  if (!text.trim()) return `<p class="muted">Rien à afficher pour l'instant.</p>`;

  const blocks = [];
  const withPlaceholders = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const clean = code.replace(/\n$/, "");
    blocks.push(`<pre class="code-block"><code class="lang-${esc(lang || "txt")}">${highlightCode(clean)}</code></pre>`);
    return `\u0000BLOCK${blocks.length - 1}\u0000`;
  });

  const lines = withPlaceholders.split(/\r?\n/);
  const out = [];
  let listOpen = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inlineMd(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listOpen) { out.push(`</${listOpen}>`); listOpen = null; }
  };

  for (const line of lines) {
    if (/^\u0000BLOCK\d+\u0000$/.test(line.trim())) {
      flushParagraph();
      closeList();
      out.push(line.trim());
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(heading[1].length + 2, 6);
      out.push(`<h${level} class="md-h">${inlineMd(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/);

    if (bullet) {
      flushParagraph();
      if (listOpen !== "ul") { closeList(); out.push('<ul class="md-list">'); listOpen = "ul"; }
      out.push(`<li>${inlineMd(bullet[1])}</li>`);
      continue;
    }

    if (numbered) {
      flushParagraph();
      if (listOpen !== "ol") { closeList(); out.push('<ol class="md-list">'); listOpen = "ol"; }
      out.push(`<li>${inlineMd(numbered[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();

  return out.join("\n").replace(/\u0000BLOCK(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}


// Un fichier .md s'affiche en markdown. Les autres : code brut coloré, tel quel.
function renderFilePreview(file) {
  if (/\.md$/i.test(file.path)) return renderMarkdown(file.content);

  return `<pre class="code-block"><code>${highlightCode(file.content)}</code></pre>`;
}


/* ---------- Import de fichiers ---------- */

const CODE_MAX_FILES = 150;              // nombre de fichiers max par import
const CODE_MAX_FILE_BYTES = 250000;      // 250 Ko : un fichier plus gros est ignoré
const CODE_MAX_TOTAL_BYTES = 1500000;    // 1,5 Mo au total par import (pour ne pas saturer le navigateur)

const CODE_SKIP_DIR_RE = /(^|\/)(node_modules|\.git|vendor|dist|build|out|target|__pycache__|\.venv|venv|\.next|\.cache)(\/|$)/i;
const CODE_SKIP_EXT_RE = /\.(png|jpe?g|gif|bmp|ico|webp|svgz|pdf|zip|rar|7z|tar|gz|exe|dll|so|bin|class|jar|ttf|woff2?|eot|mp3|mp4|mov|avi|wav|ogg|sqlite3?|db|pyc|o|obj|lock|ds_store)$/i;


function shouldSkipPath(path) {
  return CODE_SKIP_DIR_RE.test(path) || CODE_SKIP_EXT_RE.test(path);
}


function readFileAsText(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve({ path: file.webkitRelativePath || file.name, content: String(reader.result ?? "") });
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}


async function handleImportFiles(fileList, { asNewProject, projectId } = {}) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const accepted = [];
  let skipped = 0;
  let totalBytes = 0;

  for (const file of files) {
    const path = file.webkitRelativePath || file.name;

    if (shouldSkipPath(path) || file.size > CODE_MAX_FILE_BYTES
      || accepted.length >= CODE_MAX_FILES || totalBytes + file.size > CODE_MAX_TOTAL_BYTES) {
      skipped++;
      continue;
    }

    totalBytes += file.size;
    accepted.push(file);
  }

  const results = (await Promise.all(accepted.map(readFileAsText))).filter(Boolean);

  // Filet de sécurité : un octet nul trahit presque toujours un fichier binaire mal détecté
  const clean = results
    .filter(item => !item.content.includes("\u0000"))
    .map(item => ({ id: uid(), path: item.path, content: item.content }));

  if (!clean.length) {
    toast(skipped ? "Aucun fichier texte exploitable dans ce dossier" : "Aucun fichier sélectionné");
    return;
  }

  if (asNewProject) {
    const firstPath = files[0].webkitRelativePath;
    const project = {
      id: uid(),
      name: firstPath ? firstPath.split("/")[0] : "Projet importé",
      files: clean,
      activeFileId: clean[0].id,
      deckKey: ""
    };

    S.code.projects.unshift(project);
    S.code.activeProjectId = project.id;
  } else {
    const project = S.code.projects.find(item => item.id === projectId);
    if (!project) return;

    project.files.push(...clean);
    project.activeFileId = clean[0].id;
  }

  S.code.mode = "edit";
  save();
  toast(`${clean.length} fichier(s) importé(s)${skipped ? `, ${skipped} ignoré(s)` : ""}`);
  refresh();
}


/* ---------- Gestion des projets et fichiers ---------- */

function activeProject() {
  return S.code.projects.find(project => project.id === S.code.activeProjectId) || null;
}


function activeFile(project) {
  if (!project) return null;
  return project.files.find(file => file.id === project.activeFileId) || project.files[0] || null;
}


// Crée (si besoin) le sujet de révision lié à ce projet, dans Apprendre.
function ensureProjectDeck(project) {
  if (!project.deckKey || !S.learn.decks[project.deckKey]) {
    const key = `c-${uid()}`;
    S.learn.decks[key] = { label: `Code : ${project.name}`, stat: "AGI", codeIsAnswer: false, reversible: false, custom: true, cards: [] };
    project.deckKey = key;
  }

  return project.deckKey;
}


function newBlankProject() {
  const file = { id: uid(), path: "note.md", content: "" };
  const project = { id: uid(), name: "Nouvelle page", files: [file], activeFileId: file.id, deckKey: "" };

  S.code.projects.unshift(project);
  S.code.activeProjectId = project.id;
  S.code.mode = "edit";
  save();
  refresh();
}


function selectProject(id) {
  S.code.activeProjectId = id;
  S.code.mode = "edit";
  save();
  refresh();
}


function deleteProject(id) {
  S.code.projects = S.code.projects.filter(project => project.id !== id);
  if (S.code.activeProjectId === id) S.code.activeProjectId = S.code.projects[0]?.id || "";

  save();
  refresh();
}


function selectFile(project, id) {
  project.activeFileId = id;
  S.code.mode = "edit";
  save();
  refresh();
}


function deleteFile(project, id) {
  project.files = project.files.filter(file => file.id !== id);
  if (project.activeFileId === id) project.activeFileId = project.files[0]?.id || "";

  save();
  refresh();
}


function addBlankFile(project) {
  openModal({
    title: "Nouvelle page",
    body: `
      <form class="form">
        <label>Nom du fichier<input name="path" required maxlength="80" value="note.md"></label>
        <div class="row end"><button class="btn primary" type="submit">Créer</button></div>
      </form>`,
    onMount: root => {
      $("form", root).addEventListener("submit", event => {
        event.preventDefault();
        const data = formData(event.target);
        const file = { id: uid(), path: data.path.trim() || "note.md", content: "" };

        project.files.push(file);
        project.activeFileId = file.id;
        save();
        closeModal();
        refresh();
      });
    }
  });
}


function makeCardForProject(project) {
  const deckKey = ensureProjectDeck(project);

  save();
  learnDeckSel = deckKey;
  openCardForm();
}


function goToProjectDeck(project) {
  const deckKey = ensureProjectDeck(project);

  save();
  learnDeckSel = deckKey;
  learnTab = "decks";
  go("apprendre");
}


/* ==========================================================
   Génération automatique de cartes
   ----------------------------------------------------------
   Pas de vraie IA ici (le site tourne hors ligne) : on lit la
   structure du projet et on en tire des cartes.
   - Fichiers .md : une carte par section (## titre), avec le
     texte que tu as déjà écrit comme réponse -> directement utile.
   - Fichiers .sql : une carte par CREATE TABLE.
   - Fonctions/classes/méthodes : si elles ont un docstring ou un
     commentaire juste au-dessus, il devient la réponse. Sinon, la
     carte est créée "à compléter" (le code est là, mais c'est à
     toi d'écrire l'explication en la modifiant).
   ========================================================== */

function pythonDocstring(lines, defIdx) {
  let i = defIdx + 1;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return "";

  const line = lines[i];
  const oneLine = line.match(/^\s*(?:"""|''')([\s\S]*?)(?:"""|''')\s*$/);
  if (oneLine) return oneLine[1].trim();

  const open = line.match(/^\s*("""|''')(.*)$/);
  if (open) {
    const quote = open[1];
    let text = open[2];

    for (let j = i + 1; j < lines.length; j++) {
      const closeIdx = lines[j].indexOf(quote);
      if (closeIdx !== -1) { text += "\n" + lines[j].slice(0, closeIdx); break; }
      text += "\n" + lines[j];
    }

    return text.trim();
  }

  return "";
}


function leadingComment(lines, idx) {
  const collected = [];
  let i = idx - 1;

  while (i >= 0 && collected.length < 6) {
    const raw = lines[i].trim();
    if (raw === "") break;

    if (raw.startsWith("//")) { collected.unshift(raw.replace(/^\/\/\s?/, "")); i--; continue; }
    if (raw.startsWith("#")) { collected.unshift(raw.replace(/^#\s?/, "")); i--; continue; }
    if (raw.startsWith("*") || raw.startsWith("/*") || raw.endsWith("*/")) {
      collected.unshift(raw.replace(/^\/\*+\s?|\*+\/\s*$|^\*\s?/g, ""));
      i--;
      continue;
    }

    break;
  }

  return collected.join(" ").replace(/\s+/g, " ").trim();
}


function extractPythonBlock(lines, startIdx) {
  const header = lines[startIdx];
  const indent = (header.match(/^(\s*)/) || ["", ""])[1].length;
  const body = [header];
  let i = startIdx + 1;

  while (i < lines.length && body.length < 40) {
    const line = lines[i];

    if (line.trim() === "") { body.push(line); i++; continue; }

    const lineIndent = (line.match(/^(\s*)/) || ["", ""])[1].length;
    if (lineIndent <= indent) break;

    body.push(line);
    i++;
  }

  return body.join("\n").replace(/\s+$/, "");
}


function extractBraceBlock(lines, startIdx) {
  let depth = 0;
  let started = false;
  const body = [];

  for (let i = startIdx; i < lines.length && body.length < 45; i++) {
    const line = lines[i];
    body.push(line);

    for (const ch of line) {
      if (ch === "{") { depth++; started = true; }
      if (ch === "}") depth--;
    }

    if (started && depth <= 0) break;
  }

  return body.join("\n");
}


function extractFromMarkdown(path, content) {
  const items = [];
  const matches = [...content.matchAll(/^(#{1,3})\s+(.*)$/gm)];

  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][2].trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const body = content.slice(start, end).trim();

    if (body.length < 15) continue;

    items.push({
      q: `Explique la partie « ${heading} » (${path})`,
      a: body.slice(0, 600),
      code: "",
      hasDoc: true,
      path
    });
  }

  return items;
}


function extractFromSql(path, content) {
  const items = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z_]\w*)`?/gi;
  let m;

  while ((m = re.exec(content))) {
    const start = m.index;
    const end = content.indexOf(");", start);
    const snippet = end > -1 ? content.slice(start, end + 2) : content.slice(start, start + 600);

    items.push({
      q: `Décris la table \`${m[1]}\` (${path})`,
      a: "Décris les colonnes et leur rôle, et pourquoi cette table existe dans le projet.",
      code: snippet.slice(0, 800),
      hasDoc: true,
      path
    });
  }

  return items;
}


function extractFromCodeFile(path, content) {
  const lines = content.split(/\r?\n/);
  const items = [];

  lines.forEach((line, idx) => {
    let m;
    let name = null;
    let kind = null;
    let explain = "";
    let code = "";

    if ((m = line.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(/))) {
      name = m[1];
      if (name.startsWith("__") && name.endsWith("__") && name !== "__init__") return;
      kind = "fonction";
      explain = pythonDocstring(lines, idx);
      code = extractPythonBlock(lines, idx);
    } else if ((m = line.match(/^\s*class\s+([A-Za-z_]\w*)/))) {
      name = m[1];
      kind = "classe";
      explain = pythonDocstring(lines, idx);
      code = lines.slice(idx, Math.min(lines.length, idx + 20)).join("\n");
    } else if ((m = line.match(/\bfunction\s+([A-Za-z_]\w*)\s*\(/))) {
      name = m[1];
      kind = "fonction";
      explain = leadingComment(lines, idx);
      code = extractBraceBlock(lines, idx);
    } else if ((m = line.match(/^\s*(?:public|private|protected)\s+(?:static\s+)?[\w<>[\],.]+\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{?\s*$/))) {
      name = m[1];
      if (["if", "for", "while", "switch", "catch", "return"].includes(name)) return;
      kind = "méthode";
      explain = leadingComment(lines, idx);
      code = extractBraceBlock(lines, idx);
    }

    if (!name) return;

    const hasDoc = explain.length >= 8;

    items.push({
      q: hasDoc ? `Que fait la ${kind} \`${name}\` dans ${path} ?` : `Que fait la ${kind} \`${name}\` dans ${path} ? (à compléter)`,
      a: hasDoc ? explain.slice(0, 500) : "(à compléter : relis le code, puis modifie cette carte avec ta réponse)",
      code: code.slice(0, 900),
      hasDoc,
      path
    });
  });

  return items;
}


function generateCardsForProject(project) {
  const deckKey = ensureProjectDeck(project);
  const deck = S.learn.decks[deckKey];
  const existingQs = new Set(deck.cards.map(card => card.q));

  const good = [];
  const stubs = [];

  for (const file of project.files) {
    const items = /\.md$/i.test(file.path) ? extractFromMarkdown(file.path, file.content)
      : /\.sql$/i.test(file.path) ? extractFromSql(file.path, file.content)
      : extractFromCodeFile(file.path, file.content);

    for (const item of items) (item.hasDoc ? good : stubs).push(item);
  }

  const picked = [...good.slice(0, 30), ...stubs.slice(0, 15)];
  let added = 0;
  let skipped = 0;

  for (const item of picked) {
    if (existingQs.has(item.q)) { skipped++; continue; }

    deck.cards.push(makeCard({
      q: item.q, a: item.a, code: item.code, tag: item.path,
      note: item.hasDoc ? "Extrait automatiquement du projet." : "Carte générée automatiquement : relis le code puis complète-la avec ta propre explication."
    }));

    existingQs.add(item.q);
    added++;
  }

  save();

  if (!added && !skipped) toast("Rien à extraire (pas assez de fonctions, classes ou sections détectées dans ce projet)");
  else toast(`${added} carte(s) générée(s) automatiquement${skipped ? `, ${skipped} déjà présente(s)` : ""}`);

  refresh();
}


/* ==========================================================
   Génération par IA locale (Ollama)
   ----------------------------------------------------------
   Ollama fait tourner un modèle d'IA directement sur ton PC
   (gratuit, rien n'est envoyé sur internet). Il faut l'avoir
   installé et lancé, et renseigner son adresse + le nom du
   modèle dans les réglages ci-dessous.
   ========================================================== */

async function generateCardsWithOllama(project) {
  const cfg = S.code.ollama;

  if (!cfg.url || !cfg.model) {
    toast("Renseigne l'adresse et le modèle Ollama dans les réglages");
    return;
  }

  const filesText = project.files
    .slice(0, 20)
    .map(file => `--- ${file.path} ---\n${file.content.slice(0, 4000)}`)
    .join("\n\n")
    .slice(0, 12000);

  if (!filesText.trim()) {
    toast("Ce projet n'a aucun contenu à envoyer à l'IA");
    return;
  }

  const prompt = `Tu aides un étudiant à préparer l'oral de défense d'un projet informatique (Epitech).
Voici des fichiers de son projet :

${filesText}

Identifie les éléments les plus importants à savoir expliquer à l'oral : objectif du projet, fonctionnement général, fonctions ou classes clés, choix techniques, architecture.
Réponds UNIQUEMENT avec un tableau JSON, sans aucun texte autour ni balise markdown, de cette forme exacte :
[{"question": "...", "answer": "..."}]
Entre 8 et 15 questions-réponses, en français, claires et précises.`;

  toast("Génération en cours avec Ollama...");

  let data;

  try {
    const response = await fetch(`${cfg.url.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model, prompt, stream: false, format: "json" })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    notify({
      title: "OLLAMA INJOIGNABLE",
      kind: "warn",
      lines: [
        "Vérifie qu'Ollama est lancé sur ton PC (icône dans la barre des tâches),",
        `que l'adresse est correcte (${cfg.url}),`,
        "et que la variable OLLAMA_ORIGINS autorise ce site."
      ]
    });
    return;
  }

  let items;

  try {
    items = JSON.parse(data.response);
    if (!Array.isArray(items)) throw new Error("format inattendu");
  } catch (error) {
    notify({ title: "RÉPONSE ILLISIBLE", kind: "warn", lines: ["Le modèle n'a pas renvoyé un JSON valide. Réessaie, ou change de modèle (ex : llama3.2)."] });
    return;
  }

  const deckKey = ensureProjectDeck(project);
  const deck = S.learn.decks[deckKey];
  const existingQs = new Set(deck.cards.map(card => card.q));
  let added = 0;
  let skipped = 0;

  for (const item of items.slice(0, 20)) {
    const q = String(item?.question || "").trim();
    const a = String(item?.answer || "").trim();

    if (!q || !a) continue;
    if (existingQs.has(q)) { skipped++; continue; }

    deck.cards.push(makeCard({ q, a: a.slice(0, 600), tag: project.name, note: "Généré par IA locale (Ollama)." }));
    existingQs.add(q);
    added++;
  }

  save();
  toast(added ? `${added} carte(s) générée(s) par l'IA${skipped ? `, ${skipped} déjà présente(s)` : ""}` : "Aucune carte valide générée, réessaie");
  refresh();
}


/* ==========================================================
   VUE : page "Code"
   ========================================================== */

function renderCode(root) {
  const projects = S.code.projects;

  if (!S.code.activeProjectId && projects.length) S.code.activeProjectId = projects[0].id;

  const project = activeProject();
  const file = activeFile(project);

  root.innerHTML = `
    <section class="win code-wrap">
      <span class="win-t">Mon code</span>
      <p class="muted">Importe les fichiers d'un projet (Epitech, stage, perso) pour les relire, et crée des cartes pour savoir bien les expliquer à l'oral.</p>

      <div class="code-projects">
        ${projects.map(p => `
          <button type="button" class="pill-btn ${p.id === project?.id ? "sel" : ""}" data-act="sel-project" data-id="${p.id}">${esc(p.name)}</button>`).join("")}
        <button class="btn small" type="button" data-act="new-project">+ Importer un dossier</button>
        <button class="btn small" type="button" data-act="blank-project">+ Page vide</button>
      </div>

      ${project ? `
        <div class="row wrap" style="margin-bottom:10px">
          <button class="btn primary small" type="button" data-act="auto-cards">⚡ Extraction automatique (gratuite)</button>
          <button class="btn primary small" type="button" data-act="ai-cards">🤖 Générer avec l'IA locale (Ollama)</button>
        </div>
        <p class="muted" style="font-size:13px;margin-bottom:10px">Extraction : vraie réponse quand un commentaire/docstring existe, sinon une carte « à compléter ». IA locale : demande à un modèle tournant sur ton PC via Ollama (rien n'est envoyé sur internet).</p>

        <details class="ollama-settings">
          <summary>Réglages Ollama</summary>
          <form class="row wrap" data-form="ollama">
            <label>Adresse<input name="url" value="${esc(S.code.ollama.url)}"></label>
            <label>Modèle<input name="model" value="${esc(S.code.ollama.model)}" placeholder="llama3.2"></label>
            <button class="btn small" type="submit">Enregistrer</button>
          </form>
        </details>` : ""}

      ${project ? `
        <div class="code-layout">
          <aside class="code-files">
            <div class="code-files-head">
              <strong>${esc(project.name)}</strong>
              <button class="icon-btn" type="button" data-act="del-project" data-id="${project.id}" aria-label="Supprimer ce projet">×</button>
            </div>

            <ul class="notes-ul">
              ${project.files.map(f => `
                <li class="notes-item ${f.id === file?.id ? "sel" : ""}" data-act="sel-file" data-id="${f.id}">
                  <span class="notes-item-title mono">${esc(f.path)}</span>
                  <button class="icon-btn" type="button" data-act="del-file" data-id="${f.id}" aria-label="Supprimer ce fichier">×</button>
                </li>`).join("") || `<li class="muted notes-empty">Aucun fichier.</li>`}
            </ul>

            <div class="row wrap">
              <button class="btn small" type="button" data-act="add-file">+ Page</button>
              <button class="btn small" type="button" data-act="import-more">+ Importer des fichiers</button>
            </div>
          </aside>

          <div class="notes-main">
            ${file ? `
              <div class="notes-toolbar">
                <span class="file-path mono">${esc(file.path)}</span>
                <div class="notes-tabs">
                  <button class="btn small ${S.code.mode !== "preview" ? "primary" : ""}" type="button" data-mode="edit">Écrire</button>
                  <button class="btn small ${S.code.mode === "preview" ? "primary" : ""}" type="button" data-mode="preview">Aperçu</button>
                </div>
              </div>

              ${S.code.mode === "preview"
                ? `<div class="notes-preview">${renderFilePreview(file)}</div>`
                : `<textarea class="notes-editor mono" data-field="content">${esc(file.content)}</textarea>`}

              <div class="row wrap">
                <button class="btn primary small" type="button" data-act="make-card">+ Créer une carte sur ce code</button>
                <button class="btn small" type="button" data-act="go-deck">Voir les cartes de ce projet</button>
              </div>
            ` : `<p class="muted">Ajoute un fichier pour commencer.</p>`}
          </div>
        </div>
      ` : `<p class="muted">Importe un dossier de projet, ou crée une page vide pour coller du code.</p>`}
    </section>

    <input type="file" id="codeImportInput" multiple webkitdirectory hidden>
    <input type="file" id="codeImportMoreInput" multiple hidden>`;

  const importInput = $("#codeImportInput", root);
  const importMoreInput = $("#codeImportMoreInput", root);

  if (importInput) importInput.onchange = event => handleImportFiles(event.target.files, { asNewProject: true });
  if (importMoreInput) importMoreInput.onchange = event => handleImportFiles(event.target.files, { asNewProject: false, projectId: project?.id });

  root.onclick = event => {
    if (event.target.closest("[data-mode]")) {
      S.code.mode = event.target.closest("[data-mode]").dataset.mode;
      save();
      refresh();
      return;
    }

    const target = event.target.closest("[data-act]");
    if (!target) return;

    const action = target.dataset.act;

    if (action === "new-project") importInput.click();
    if (action === "blank-project") { Sound.play("click"); newBlankProject(); }
    if (action === "sel-project") selectProject(target.dataset.id);
    if (action === "del-project") {
      askConfirm("Supprimer ce projet ? Les cartes déjà créées restent dans Apprendre.", () => deleteProject(target.dataset.id));
    }

    if (!project) return;

    if (action === "auto-cards") { Sound.play("click"); generateCardsForProject(project); }
    if (action === "ai-cards") { Sound.play("click"); generateCardsWithOllama(project); }

    if (action === "sel-file") selectFile(project, target.dataset.id);
    if (action === "del-file") askConfirm("Supprimer ce fichier ?", () => deleteFile(project, target.dataset.id));
    if (action === "add-file") addBlankFile(project);
    if (action === "import-more") importMoreInput.click();
    if (action === "make-card") makeCardForProject(project);
    if (action === "go-deck") goToProjectDeck(project);
  };

  root.onsubmit = event => {
    const form = event.target.closest('form[data-form="ollama"]');
    if (!form) return;

    event.preventDefault();
    const data = formData(form);

    S.code.ollama.url = data.url.trim() || "http://localhost:11434";
    S.code.ollama.model = data.model.trim() || "llama3.2";
    save();
    toast("Réglages enregistrés");
  };

  root.oninput = event => {
    const field = event.target.dataset.field;
    if (!field || !file) return;

    file[field] = event.target.value;
    saveSoon();
  };
}
