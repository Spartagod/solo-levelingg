/* ==========================================================
   CODE.JS : onglet "Projets" de la page Révisions — importer les
   fichiers d'un projet (Epitech, stage...) pour les relire et
   créer des cartes dessus, afin de bien savoir les expliquer le
   jour d'une défense.
   ----------------------------------------------------------
   - Un "projet" = un dossier importé (ou une page vide), avec
     plusieurs fichiers.
   - Chaque projet a un "sujet" lié (voir js/learn.js) : les cartes
     qu'on crée ici s'y ajoutent et se révisent par répétition
     espacée dans l'onglet "Paquets", comme n'importe quel autre
     sujet. L'assemblage des onglets est dans js/revisions.js.
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
// quizOnly: true -> ce sujet ne pose jamais de réponse libre/texte à trous,
// uniquement des QCM ou du vrai/faux (voir learn-engine.js).
function ensureProjectDeck(project) {
  if (!project.deckKey || !S.learn.decks[project.deckKey]) {
    const key = `c-${uid()}`;
    S.learn.decks[key] = { label: `Code : ${project.name}`, stat: "AGI", codeIsAnswer: false, reversible: false, quizOnly: true, custom: true, cards: [] };
    project.deckKey = key;
  } else if (!S.learn.decks[project.deckKey].quizOnly) {
    // Projet créé avant l'ajout du mode QCM/Vrai-ou-faux : on le bascule aussi.
    S.learn.decks[project.deckKey].quizOnly = true;
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
  revTab = "decks";
  refresh();
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


// Mots qu'on ignore quand on détecte les appels de fonction dans un bloc de
// code (mots-clés du langage + fonctions standard trop courantes pour être utiles)
const CALL_SKIP = new Set([
  ...CODE_KEYWORDS,
  "print", "len", "str", "int", "float", "range", "open", "input", "console",
  "log", "format", "join", "split", "append", "push", "map", "filter", "reduce",
  "forEach", "toString", "parseInt", "parseFloat", "require", "super", "isinstance",
  "enumerate", "zip", "list", "dict", "set", "tuple", "sorted", "min", "max", "sum",
  "ValueError", "TypeError", "Exception", "KeyError", "IndexError", "RuntimeError",
  "StopIteration", "AttributeError", "NameError", "OSError", "IOError"
]);

function detectCalls(body, selfName) {
  const calls = [];
  const re = /\b([A-Za-z_]\w*)\s*\(/g;
  let m;

  while ((m = re.exec(body))) {
    const name = m[1];
    if (name === selfName || CALL_SKIP.has(name) || calls.includes(name)) continue;
    calls.push(name);
    if (calls.length >= 4) break;
  }

  return calls;
}


function detectReturn(body) {
  const m = body.match(/\breturn\s+([^\n;]{1,90})/);
  return m ? m[1].trim().replace(/[;{]+$/, "") : "";
}


// Pas de docstring/commentaire trouvé : on construit quand même une vraie
// réponse en analysant la structure du code (paramètres, appels, boucles,
// gestion d'erreurs, valeur renvoyée) plutôt que de laisser une carte vide.
function buildHeuristicSummary({ name, params, body }) {
  const parts = [];

  if (params) {
    const count = params.split(",").filter(p => p.trim()).length;
    parts.push(`Prend ${count > 1 ? `${count} paramètres` : "un paramètre"} : ${params}.`);
  }

  const calls = detectCalls(body, name);
  if (calls.length) parts.push(`Elle appelle ${calls.join(", ")}.`);

  if (/\b(for|while)\b/.test(body)) parts.push("Elle contient une boucle.");
  if (/\btry\b/.test(body)) parts.push("Elle gère des erreurs (try/except ou try/catch).");

  const ret = detectReturn(body);
  if (ret) parts.push(`Elle renvoie ${ret}.`);

  if (!parts.length) parts.push("Relis le code ci-contre pour comprendre précisément son rôle.");

  return parts.join(" ");
}


function extractFromCodeFile(path, content) {
  const lines = content.split(/\r?\n/);
  const items = [];

  lines.forEach((line, idx) => {
    let m;
    let name = null;
    let kind = null;
    let params = "";
    let explain = "";
    let code = "";

    if ((m = line.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/))) {
      name = m[1]; params = m[2].trim();
      if (name.startsWith("__") && name.endsWith("__") && name !== "__init__") return;
      kind = "fonction";
      explain = pythonDocstring(lines, idx);
      code = extractPythonBlock(lines, idx);
    } else if ((m = line.match(/^\s*class\s+([A-Za-z_]\w*)/))) {
      name = m[1];
      kind = "classe";
      explain = pythonDocstring(lines, idx);
      code = extractPythonBlock(lines, idx) || lines.slice(idx, Math.min(lines.length, idx + 25)).join("\n");
    } else if ((m = line.match(/\bfunction\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/))) {
      name = m[1]; params = m[2].trim();
      kind = "fonction";
      explain = leadingComment(lines, idx);
      code = extractBraceBlock(lines, idx);
    } else if ((m = line.match(/^\s*(?:public|private|protected)\s+(?:static\s+)?[\w<>[\],.]+\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{?\s*$/))) {
      name = m[1]; params = m[2].trim();
      if (["if", "for", "while", "switch", "catch", "return"].includes(name)) return;
      kind = "méthode";
      explain = leadingComment(lines, idx);
      code = extractBraceBlock(lines, idx);
    }

    if (!name) return;

    const hasDoc = explain.length >= 8;
    let answer;

    if (kind === "classe") {
      const methodNames = [...code.matchAll(/\bdef\s+([A-Za-z_]\w*)\s*\(/g)]
        .map(x => x[1]).filter(n => n !== "__init__").slice(0, 6);

      answer = hasDoc ? explain
        : methodNames.length ? `Cette classe définit les méthodes : ${methodNames.join(", ")}.`
        : "Relis le code ci-contre pour comprendre son rôle.";
    } else {
      answer = hasDoc ? explain : buildHeuristicSummary({ name, params, body: code });
    }

    const signature = params ? `\`${name}(${params})\`` : `\`${name}\``;

    items.push({
      q: `Que fait la ${kind} ${signature} dans ${path} ?`,
      a: answer.slice(0, 500),
      code: code.slice(0, 900),
      hasDoc: true,
      path
    });
  });

  return items;
}


/* ==========================================================
   Détection de concepts connus (outils, commandes, fonctions)
   ----------------------------------------------------------
   But : poser des questions « à quoi sert X ? » sur des outils
   (nmap, hydra...) et des fonctions sensibles (os.system, eval...)
   repérés dans le code, avec une vraie réponse de fond (pas juste
   une description mécanique) et des mauvaises réponses toujours
   disponibles (prises dans ce même dictionnaire) -> toujours un
   QCM ou un vrai/faux possible.
   ========================================================== */

const CONCEPT_DB = [
  ["nmap", "scanner les ports ouverts et les services actifs sur une machine ou un réseau."],
  ["hydra", "tester un grand nombre de mots de passe (attaque par force brute) sur un service (SSH, FTP, un formulaire...)."],
  ["john the ripper", "casser des mots de passe hachés en testant une wordlist ou toutes les combinaisons possibles."],
  ["hashcat", "casser des mots de passe hachés en utilisant la puissance de calcul de la carte graphique."],
  ["sqlmap", "détecter et exploiter automatiquement des injections SQL sur un site web."],
  ["metasploit", "lancer des exploits connus contre des failles identifiées sur une machine cible."],
  ["msfconsole", "ouvrir l'interface en ligne de commande de Metasploit pour lancer des exploits."],
  ["wireshark", "capturer et analyser en détail le trafic réseau qui passe sur une interface."],
  ["tcpdump", "capturer le trafic réseau en ligne de commande, souvent pour l'analyser ensuite."],
  ["netcat", "ouvrir des connexions réseau brutes (TCP/UDP), souvent pour un reverse shell ou un bind shell."],
  ["nikto", "scanner un serveur web à la recherche de fichiers ou de failles connues."],
  ["gobuster", "découvrir des fichiers, dossiers ou sous-domaines cachés sur un site web par force brute."],
  ["dirb", "découvrir des fichiers et dossiers cachés sur un serveur web par force brute."],
  ["aircrack-ng", "casser la clé d'un réseau Wi-Fi protégé en WEP/WPA."],
  ["burp suite", "intercepter et modifier les requêtes HTTP entre le navigateur et un site, pour tester ses failles."],
  ["openssl", "créer des certificats, chiffrer des données ou tester une connexion TLS en ligne de commande."],
  ["iptables", "définir les règles du pare-feu Linux (quel trafic réseau est autorisé ou bloqué)."],
  ["fail2ban", "bannir automatiquement une adresse IP après plusieurs tentatives de connexion échouées."],
  ["crontab", "lancer une tâche automatiquement à intervalles réguliers sur un système Linux."],
  ["systemctl", "démarrer, arrêter ou vérifier l'état d'un service sur un système Linux (systemd)."],
  ["chmod", "changer les droits d'accès (lecture/écriture/exécution) d'un fichier sous Linux."],
  ["sudo", "exécuter une commande avec les droits d'administrateur (root) sous Linux."],
  ["gdb", "déboguer un programme compilé pas à pas (points d'arrêt, inspection de la mémoire...)."],
  ["strace", "lister les appels système faits par un programme pendant son exécution."],
  ["valgrind", "détecter les fuites mémoire et les erreurs d'accès mémoire dans un programme C/C++."],
  ["docker", "faire tourner une application dans un conteneur isolé, avec ses propres dépendances."],
  ["venv", "créer un environnement Python isolé pour ne pas mélanger les dépendances d'un projet avec les autres."],
  ["os.system", "exécuter une commande du système d'exploitation directement depuis le code (risque d'injection de commande)."],
  ["subprocess", "lancer un autre programme depuis le code et récupérer ce qu'il affiche ou renvoie."],
  ["socket", "ouvrir une connexion réseau brute (TCP/UDP) entre deux machines."],
  ["requests", "envoyer des requêtes HTTP (GET, POST...) vers un site ou une API depuis du code Python."],
  ["fetch(", "envoyer une requête HTTP depuis du JavaScript, souvent vers une API."],
  ["hashlib", "calculer le hash (empreinte) d'une donnée, par exemple pour stocker un mot de passe."],
  ["bcrypt", "hacher un mot de passe de façon sécurisée, avec un coût de calcul volontairement élevé."],
  ["jwt", "créer ou vérifier un token signé (JSON Web Token) utilisé pour authentifier un utilisateur."],
  ["pickle", "sérialiser des objets Python en octets (charger un pickle qui vient d'ailleurs est dangereux)."],
  ["eval(", "exécuter une chaîne de caractères comme du code (très risqué si elle vient d'un utilisateur)."],
  ["exec(", "exécuter dynamiquement du code à partir d'une chaîne de caractères."],
  ["sqlite3", "stocker des données dans une petite base de données locale, dans un seul fichier."],
  ["child_process", "lancer un autre programme ou une commande système depuis du code Node.js."],
  ["password_hash", "hacher un mot de passe en PHP avant de le stocker en base de données."],
  ["malloc", "réserver un bloc de mémoire de taille donnée en C (à libérer ensuite avec free)."],
  ["fork(", "créer un nouveau processus, copie du processus courant, sous Linux/Unix."],
  ["pthread", "créer et gérer des threads (exécutions parallèles) en C."]
];


function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function conceptLabel(key) {
  return key.endsWith("(") ? `${key})` : key;
}


function conceptRegex(key) {
  const callLike = key.endsWith("(");
  const body = callLike ? `${escapeRegex(key.slice(0, -1))}\\(` : escapeRegex(key);
  const after = callLike ? "" : "(?![A-Za-z0-9_-])";

  return new RegExp(`(?<![A-Za-z0-9_.-])${body}${after}`, "i");
}


// Mauvaises réponses d'un concept : les explications d'autres concepts (toujours
// disponibles, de longueur comparable -> QCM/vrai-faux fiables même sans autre carte).
function pickWrongConcepts(excludeKey, count) {
  const others = CONCEPT_DB.filter(([key]) => key !== excludeKey).map(([, explain]) => explain);
  return shuffle(others).slice(0, count);
}


// Repère les outils/commandes/fonctions connus utilisés dans le projet, et crée
// une question « à quoi sert X ? » par concept trouvé (une seule fois par projet).
function detectConcepts(project, limit = 18) {
  const items = [];

  for (const [key, explain] of CONCEPT_DB) {
    if (items.length >= limit) break;

    const re = conceptRegex(key);

    for (const file of project.files) {
      const match = re.exec(file.content);
      if (!match) continue;

      const lineStart = file.content.lastIndexOf("\n", match.index) + 1;
      const lineEnd = file.content.indexOf("\n", match.index);
      const line = file.content.slice(lineStart, lineEnd === -1 ? file.content.length : lineEnd).trim();

      items.push({
        q: `À quoi sert \`${conceptLabel(key)}\` ici ?`,
        a: explain,
        code: line.slice(0, 200),
        hasDoc: true,
        path: file.path,
        wrongs: pickWrongConcepts(key, 3)
      });

      break;
    }
  }

  return items;
}


/* ---------- Vue d'ensemble du projet (point d'entrée, libs, structure) ---------- */

const ENTRY_POINT_NAMES = ["main.py", "app.py", "manage.py", "index.js", "main.js", "server.js", "Main.java", "main.c", "main.cpp"];

function detectEntryPoint(project) {
  for (const file of project.files) {
    if (ENTRY_POINT_NAMES.includes(file.path.split("/").pop())) return file.path;
  }
  return null;
}


function detectImports(project) {
  const found = new Set();

  for (const file of project.files) {
    const content = file.content;
    let m;

    const rePy1 = /^\s*import\s+([A-Za-z_][\w.]*)/gm;
    while ((m = rePy1.exec(content))) found.add(m[1].split(".")[0]);

    const rePy2 = /^\s*from\s+([A-Za-z_][\w.]*)\s+import/gm;
    while ((m = rePy2.exec(content))) found.add(m[1].split(".")[0]);

    const reRequire = /\brequire\(\s*["']([^"'.][^"']*)["']\s*\)/g;
    while ((m = reRequire.exec(content))) found.add(m[1].split("/")[0]);

    const reEsImport = /\bimport\s+(?:[\w*{}\s,]+from\s+)?["']([^"'.][^"']*)["']/g;
    while ((m = reEsImport.exec(content))) found.add(m[1].split("/")[0]);

    const reJava = /^\s*import\s+([\w.]+)\s*;/gm;
    while ((m = reJava.exec(content))) found.add(m[1]);
  }

  return [...found].slice(0, 15);
}


function extractProjectOverview(project) {
  const items = [];

  const entry = detectEntryPoint(project);
  if (entry) {
    items.push({
      q: "Quel est le point d'entrée de ce projet ?",
      a: `Le programme démarre dans \`${entry}\`.`,
      code: "", hasDoc: true, path: entry
    });
  }

  const libs = detectImports(project);
  if (libs.length) {
    items.push({
      q: "Quelles bibliothèques/technologies sont utilisées dans ce projet ?",
      a: `Ce projet importe : ${libs.join(", ")}.`,
      code: "", hasDoc: true, path: "(vue d'ensemble)"
    });
  }

  if (project.files.length > 1) {
    const list = project.files.map(f => f.path).slice(0, 25).join(", ");
    items.push({
      q: "Quelle est la structure (les fichiers) de ce projet ?",
      a: `Fichiers principaux : ${list}${project.files.length > 25 ? ", ..." : ""}.`,
      code: "", hasDoc: true, path: "(vue d'ensemble)"
    });
  }

  return items;
}


function generateCardsForProject(project) {
  const deckKey = ensureProjectDeck(project);
  const deck = S.learn.decks[deckKey];
  const existingQs = new Set(deck.cards.map(card => card.q));

  const picked = [...extractProjectOverview(project), ...detectConcepts(project)];

  for (const file of project.files) {
    const items = /\.md$/i.test(file.path) ? extractFromMarkdown(file.path, file.content)
      : /\.sql$/i.test(file.path) ? extractFromSql(file.path, file.content)
      : extractFromCodeFile(file.path, file.content);

    picked.push(...items);
  }

  let added = 0;
  let skipped = 0;

  for (const item of picked.slice(0, 80)) {
    if (existingQs.has(item.q)) { skipped++; continue; }

    deck.cards.push(makeCard({ q: item.q, a: item.a, code: item.code, tag: item.path, note: "Extrait automatiquement du projet.", wrongs: item.wrongs || [] }));
    existingQs.add(item.q);
    added++;
  }

  save();

  if (!added && !skipped) toast("Rien à extraire (pas assez de contenu détecté dans ce projet)");
  else toast(`${added} carte(s) générée(s) automatiquement${skipped ? `, ${skipped} déjà présente(s)` : ""}`);

  refresh();
}


/* ==========================================================
   VUE : onglet "Projets" de la page Révisions (voir js/revisions.js)
   ========================================================== */

function renderCodeTab(root) {
  const projects = S.code.projects;

  if (!S.code.activeProjectId && projects.length) S.code.activeProjectId = projects[0].id;

  const project = activeProject();
  const file = activeFile(project);

  root.innerHTML = `
    <section class="win code-wrap">
      <span class="win-t">Mon code</span>
      <p class="muted">Importe les fichiers d'un projet (Epitech, stage, perso) pour les relire, et crée des cartes pour savoir bien les expliquer à l'oral.</p>

      ${projects.length ? `<p class="muted" style="font-size:13px;margin-bottom:6px">Tes projets (${projects.length}) — chacun a ses propres fichiers et ses propres cartes de révision :</p>` : ""}
      <div class="code-projects">
        ${projects.map(p => `
          <button type="button" class="pill-btn ${p.id === project?.id ? "sel" : ""}" data-act="sel-project" data-id="${p.id}">${esc(p.name)}</button>`).join("")}
        <button class="btn small" type="button" data-act="new-project">+ Importer un dossier</button>
        <button class="btn small" type="button" data-act="blank-project">+ Page vide</button>
      </div>

      ${project ? `
        <div class="row wrap" style="margin-bottom:10px">
          <button class="btn primary small" type="button" data-act="auto-cards">⚡ Générer les cartes de ce projet</button>
        </div>
        <p class="muted" style="font-size:13px;margin-bottom:10px">Lit tous les fichiers du projet (point d'entrée, bibliothèques, fonctions, classes, sections des .md, tables SQL, outils/commandes repérés comme <code class="inline-code">nmap</code> ou <code class="inline-code">os.system</code>...) et crée des cartes dessus. En Apprendre, les cartes de ce projet ne posent que des QCM ou du vrai/faux : pas de réponse à taper, juste comprendre le rôle de chaque chose.</p>` : ""}

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

    if (action === "sel-file") selectFile(project, target.dataset.id);
    if (action === "del-file") askConfirm("Supprimer ce fichier ?", () => deleteFile(project, target.dataset.id));
    if (action === "add-file") addBlankFile(project);
    if (action === "import-more") importMoreInput.click();
    if (action === "make-card") makeCardForProject(project);
    if (action === "go-deck") goToProjectDeck(project);
  };

  root.oninput = event => {
    const field = event.target.dataset.field;
    if (!field || !file) return;

    file[field] = event.target.value;
    saveSoon();
  };
}
