# Solo Leveling : ton Système personnel

Un site qui transforme ta vie de tous les jours en RPG : niveaux, XP, quêtes
quotidiennes, planning, alertes, projets, sport et révisions.
Il n'a besoin d'aucun serveur ni d'aucune installation.

## Lancer le site

**Raccourci sur le Bureau :** fais glisser `index.html` vers le Bureau en
maintenant **Alt** enfoncé (Windows crée un raccourci automatiquement).
Tu peux ensuite le renommer et lui donner l'icône du jeu (clic droit sur le
raccourci -> Propriétés -> Changer d'icône -> `assets/icons/icon.ico`).
Double-clique dessus pour ouvrir le site. Tu ne fais ça qu'une fois (tant que
tu ne déplaces pas le dossier).

**Sinon**, ouvre simplement `index.html` dans ton navigateur.

Dans le terminal Ubuntu, tu peux aussi faire :

    cd ~/solo-leveling
    python3 -m http.server 8001

Puis ouvre http://localhost:8001 dans le navigateur
(8001 pour ne pas gêner ton portfolio, qui utilise 8000).

Tes données (XP, quêtes, planning...) sont gardées dans le navigateur.
Elles restent sur cet ordinateur, dans ce navigateur. Pour les transférer :
page Réglages -> Générer la sauvegarde -> Copier, puis Restaurer ailleurs.

## Générer des cartes avec une IA locale (Ollama)

Sur la page **Code**, le bouton **🤖 Générer avec l'IA locale** utilise
[Ollama](https://ollama.com) (gratuit, tourne sur ton PC, rien n'est envoyé
sur internet) pour créer de vraies cartes de révision sur un projet importé.

1. Installe Ollama (ollama.com), puis ouvre un terminal et tape :
   `ollama pull llama3.2` (une seule fois).
2. Ollama tourne automatiquement en arrière-plan une fois installé.
3. Autorise ce site à lui parler : crée une variable d'environnement
   Windows `OLLAMA_ORIGINS` avec la valeur `*`
   (Paramètres -> Système -> Informations système -> Paramètres système
   avancés -> Variables d'environnement -> Nouvelle), puis redémarre le PC
   (ou au moins Ollama).
4. Dans la page Code, ouvre "Réglages Ollama" si besoin pour vérifier
   l'adresse (`http://localhost:11434` par défaut) et le modèle
   (`llama3.2` par défaut).

Sans Ollama, ou si tu préfères ne rien installer, le bouton
**⚡ Extraction automatique** reste disponible : il ne devine rien, mais il
est gratuit, instantané, et reprend tes commentaires/docstrings existants.

## Les pages

| Page      | Ce qu'on y fait                                                        |
|-----------|------------------------------------------------------------------------|
| Statut    | Niveau, rang, radar des 5 stats, aperçu du jour, XP des 14 derniers jours |
| Quêtes    | Quêtes du jour, série parfaite, zone de pénalité                       |
| Planning  | Emploi du temps par semaine + bouton "Optimiser la journée"            |
| Alertes   | Alertes à heure fixe, échéances, notifications du navigateur           |
| Projets   | Projets, deadlines, tâches avec durée (rapportent de l'XP)             |
| Sport     | Bouton "Valider la séance", série, carte des 12 dernières semaines     |
| Code      | Importe les fichiers d'un projet (défense Epitech, stage...), relis-les avec coloration, crée des cartes pour savoir bien les expliquer à l'oral |
| Apprendre | Une partie de 15 cartes par sujet et par jour (manches jusqu'au sans-faute), répétition espacée, questions variées : culture générale, cybersécurité, outils Kali, Python, anglais, tes propres sujets |
| Studio    | Présentations façon Canva : 11 mises en page, 6 thèmes, mode présentation, export PowerPoint (.pptx) |
| Réglages  | Nom, sons, pénalités, rappels, sauvegarde, réinitialisation            |

## Comment le Système fonctionne

- Chaque action donne de l'XP et fait monter une stat (FOR, INT, AGI, PER, VIT).
- Niveau suivant : 100 XP + 50 XP par niveau déjà passé (modifiable dans `js/data.js`).
- Rangs : E, D (niv. 10), C (20), B (35), A (50), S (70).
- Les quêtes obligatoires manquées coûtent 10 XP chacune (on ne perd jamais un niveau).
- Le quiz fait revenir les cartes ratées plus vite (boîtes de Leitner).
- Les alertes sonnent tant que la page est ouverte. Pour être prévenu hors de
  l'onglet : page Alertes -> Activer les notifications du navigateur.

## Organisation des fichiers

    solo-leveling/
    ├── index.html          Structure de la page et ordre des scripts
    ├── css/
    │   ├── base.css        Couleurs, polices, barre du haut, mise en page
    │   ├── system.css      Fenêtres bleues, boutons, formulaires, notifications
    │   └── views.css       Mise en page de chaque page
    ├── js/
    │   ├── data.js         RÉGLAGES + données de départ (le plus utile à modifier)
    │   ├── utils.js        Petites fonctions (dates, heures...)
    │   ├── store.js        Sauvegarde dans le navigateur
    │   ├── sound.js        Sons
    │   ├── ui.js           Notifications, fenêtres, messages
    │   ├── xp.js           Niveaux, rangs, gain et perte d'XP
    │   ├── quests.js       Page Quêtes + pénalités
    │   ├── planner.js      Page Planning + optimiseur
    │   ├── alerts.js       Page Alertes + moteur de rappels
    │   ├── projects.js     Page Projets
    │   ├── sport.js        Page Sport
    │   ├── code.js         Page Code (importer un projet, cartes pour les défenses)
    │   ├── learn-engine.js Cerveau de l'apprentissage (SM-2, formats de questions)
│   ├── learn.js        Page Apprendre
│   ├── studio-*.js     Studio : données/thèmes, rendu, export .pptx, éditeur
│   ├── content/        Cartes de départ (culture, cyber, python, anglais)
    │   ├── status.js       Page Statut
    │   ├── settings.js     Page Réglages
    │   ├── background.js   Fond animé
    │   └── main.js         Démarrage et navigation
    └── assets/sounds/      Ton son notification.mp3

## Modifier facilement

- Quêtes de départ, cartes, projets, emploi du temps : `js/data.js`
  (tout se modifie aussi directement dans le site).
- Ton son : mets `notification.mp3` dans `assets/sounds/`.
  Sans fichier, un son synthétique est utilisé.
  Quel son va sur quel bouton : cherche `Sound.play("...")` dans `js/`
  ("notify" et "levelup" = ton mp3, "click" = petit bip).
- Couleurs : variables en haut de `css/base.css` (`--blue`, `--red`, `--gold`...).
- Ajouter une page : écris `renderMaPage(root)`, ajoute-la dans `VIEWS`
  (`js/main.js`), un lien dans `index.html` et le `<script>` correspondant.
- Durée du quiz, XP par niveau, pénalité, fenêtre de l'optimiseur : `CONFIG` dans `js/data.js`.
