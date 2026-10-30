/* ==========================================================
   CONTENT/KALI.JS : paquet "Outils Kali"
   ----------------------------------------------------------
   Une carte par outil : à quoi il sert, en une phrase.
   tag = catégorie (sert à regrouper et à varier les QCM).
   wrongs = mauvaises réponses pour les QCM (facultatif : le site
   en choisit seul dans les autres cartes si tu n'en mets pas).
   Pour ajouter un outil : ajoute une ligne dans SEED_KALI.
   ========================================================== */


const SEED_KALI = [

  /* ----- Reconnaissance ----- */
  ["Reconnaissance", "À quoi sert nmap ?", "Scanner les ports ouverts et les services d'une machine."],
  ["Reconnaissance", "À quoi sert masscan ?", "Scanner de très grandes plages d'adresses IP à grande vitesse."],
  ["Reconnaissance", "À quoi sert netdiscover ?", "Découvrir les machines actives d'un réseau local avec des requêtes ARP."],
  ["Reconnaissance", "À quoi sert whois ?", "Afficher les informations d'enregistrement d'un nom de domaine."],
  ["Reconnaissance", "À quoi sert dig ?", "Interroger un serveur DNS et lire ses enregistrements."],
  ["Reconnaissance", "À quoi sert dnsenum ?", "Énumérer les enregistrements et les sous-domaines d'un nom de domaine."],
  ["Reconnaissance", "À quoi sert theHarvester ?", "Collecter des e-mails et des sous-domaines publics (OSINT)."],
  ["Reconnaissance", "À quoi sert amass ?", "Cartographier en détail les sous-domaines d'une organisation."],
  ["Reconnaissance", "À quoi sert Sublist3r ?", "Lister rapidement les sous-domaines connus d'un domaine."],
  ["Reconnaissance", "À quoi sert Maltego ?", "Représenter sous forme de graphe les liens entre personnes, domaines et infrastructures."],
  ["Reconnaissance", "À quoi sert WhatWeb ?", "Identifier les technologies utilisées par un site (CMS, serveur, frameworks)."],
  ["Reconnaissance", "À quoi sert WAFW00F ?", "Détecter si un site est protégé par un pare-feu applicatif (WAF)."],
  ["Reconnaissance", "À quoi sert Shodan (le moteur, utilisable en CLI) ?", "Chercher des appareils et services exposés publiquement sur Internet."],
  ["Reconnaissance", "Quelle commande fait un simple ping scan pour trouver les machines actives ?", "nmap -sn trouve les hôtes actifs sans scanner leurs ports."],

  /* ----- Web ----- */
  ["Web", "À quoi sert Nikto ?", "Scanner un serveur web à la recherche de mauvaises configurations connues."],
  ["Web", "À quoi sert Gobuster ?", "Chercher par force brute des répertoires et fichiers cachés sur un site."],
  ["Web", "À quoi sert ffuf ?", "Fuzzer un site web très rapidement : chemins, paramètres, sous-domaines."],
  ["Web", "À quoi sert dirb ?", "Chercher des répertoires web avec un dictionnaire, en ligne de commande."],
  ["Web", "À quoi sert wfuzz ?", "Fuzzer librement n'importe quelle partie d'une requête HTTP."],
  ["Web", "À quoi sert sqlmap ?", "Détecter et exploiter automatiquement les injections SQL d'un site."],
  ["Web", "À quoi sert Burp Suite ?", "Intercepter, lire et modifier le trafic HTTP d'une application web."],
  ["Web", "À quoi sert OWASP ZAP ?", "Alternative libre à Burp Suite : proxy d'interception et scanner de vulnérabilités web."],
  ["Web", "À quoi sert WPScan ?", "Auditer un site WordPress : version, plugins et utilisateurs vulnérables."],
  ["Web", "À quoi sert XSStrike ?", "Détecter les failles XSS d'un site web."],
  ["Web", "Que fait la commande curl ?", "Envoyer des requêtes HTTP depuis le terminal et lire les réponses."],

  /* ----- Mots de passe ----- */
  ["Mots de passe", "À quoi sert John the Ripper ?", "Casser des hachages de mots de passe hors ligne, par dictionnaire ou force brute."],
  ["Mots de passe", "À quoi sert Hashcat ?", "Casser des hachages très rapidement en utilisant la carte graphique."],
  ["Mots de passe", "À quoi sert Hydra ?", "Tester des identifiants sur un service en ligne (SSH, FTP, HTTP...)."],
  ["Mots de passe", "À quoi sert Medusa ?", "Alternative à Hydra pour tester des identifiants sur des services en ligne."],
  ["Mots de passe", "À quoi sert Crunch ?", "Générer une liste de mots de passe selon un motif donné."],
  ["Mots de passe", "À quoi sert CeWL ?", "Construire une liste de mots à partir du contenu d'un site web."],
  ["Mots de passe", "Quel fichier de wordlist est fourni par défaut dans Kali pour les mots de passe courants ?", "rockyou.txt, une liste de mots de passe ayant fuité."],

  /* ----- Réseau ----- */
  ["Réseau", "À quoi sert Wireshark ?", "Capturer et analyser le trafic réseau en détail, avec une interface graphique."],
  ["Réseau", "À quoi sert tcpdump ?", "Capturer le trafic réseau en ligne de commande."],
  ["Réseau", "À quoi sert Netcat ?", "Ouvrir des connexions réseau brutes : écoute, connexion, transfert de fichiers."],
  ["Réseau", "À quoi sert Ettercap ?", "Réaliser des attaques de type « homme du milieu » sur un réseau local."],
  ["Réseau", "À quoi sert Responder ?", "Répondre aux requêtes de résolution de noms d'un réseau Windows pour capturer des identifiants."],
  ["Réseau", "À quoi sert aircrack-ng ?", "Analyser et auditer la sécurité des réseaux Wi-Fi."],
  ["Réseau", "À quoi sert enum4linux ?", "Énumérer les informations exposées par un partage Windows/Samba (utilisateurs, partages...)."],

  /* ----- Exploitation ----- */
  ["Exploitation", "À quoi sert Metasploit ?", "Framework qui regroupe des modules d'exploitation de vulnérabilités connues."],
  ["Exploitation", "À quoi sert msfvenom ?", "Générer des charges utiles (payloads) pour Metasploit."],
  ["Exploitation", "À quoi sert searchsploit ?", "Chercher des exploits publics connus dans une base locale (Exploit-DB)."],
  ["Exploitation", "À quoi sert BeEF ?", "Cibler des navigateurs web pour tester leur résistance aux attaques côté client."],

  /* ----- Post-exploitation et forensique ----- */
  ["Post-exploitation", "À quoi sert LinPEAS ?", "Chercher automatiquement des pistes d'escalade de privilèges sur Linux."],
  ["Post-exploitation", "À quoi sert WinPEAS ?", "Chercher automatiquement des pistes d'escalade de privilèges sur Windows."],
  ["Post-exploitation", "À quoi sert Mimikatz ?", "Extraire des identifiants et des secrets de la mémoire d'un système Windows."],
  ["Post-exploitation", "Que fait la commande find / -perm -4000 ?", "Chercher les fichiers avec le bit SUID, une piste classique d'escalade de privilèges."],
  ["Forensique", "À quoi sert Autopsy ?", "Analyser un disque ou une image mémoire lors d'une investigation numérique."],
  ["Forensique", "À quoi sert Volatility ?", "Analyser un dump de mémoire vive (RAM) pour une investigation numérique."],
  ["Forensique", "À quoi sert Binwalk ?", "Chercher des fichiers et données cachés à l'intérieur d'un autre fichier."],
  ["Forensique", "À quoi sert Exiftool ?", "Lire et modifier les métadonnées d'un fichier (image, document...)."],
  ["Forensique", "Que fait la commande file sur un fichier ?", "Afficher le vrai type d'un fichier en lisant son en-tête, pas son extension."],
  ["Forensique", "Que fait la commande strings sur un binaire ?", "Afficher les suites de caractères lisibles contenues dans un fichier."],

  /* ----- Reverse engineering ----- */
  ["Reverse", "À quoi sert Ghidra ?", "Désassembler et décompiler un programme pour en comprendre le fonctionnement."],
  ["Reverse", "À quoi sert GDB ?", "Déboguer un programme : l'exécuter pas à pas et inspecter sa mémoire."],
  ["Reverse", "À quoi sert radare2 ?", "Analyser, désassembler et déboguer des binaires en ligne de commande."],

  /* ----- Environnement de travail ----- */
  ["Environnement", "À quoi sert Exegol ?", "Un environnement de pentest prêt à l'emploi, basé sur des conteneurs Docker."],
  ["Environnement", "À quoi sert un environnement Kali Linux ?", "Regrouper dans une seule distribution les outils les plus utilisés en cybersécurité offensive."],
  ["Environnement", "À quoi sert Hack The Box ?", "Une plateforme de machines et de challenges pour s'entraîner légalement à la cybersécurité."]
];
