/* ==========================================================
   CONTENT/CYBER.JS : paquet "Cybersécurité"
   ----------------------------------------------------------
   Deux types de cartes :
   - commandes : q = ce qu'on veut faire, code = la commande à retrouver
   - concepts  : q = la question, a = la réponse
   wrongs = mauvaises réponses pour les QCM (facultatif : le site
   en choisit seul dans les autres cartes si tu n'en mets pas).
   ========================================================== */


const SEED_CYBER = [

  /* ----- Commandes à retrouver ----- */
  { q: "Scanner tous les ports d'une machine avec détection de version et scripts par défaut", a: "nmap : -sV détecte les versions, -sC lance les scripts par défaut, -p- scanne les 65 535 ports.", code: "nmap -sV -sC -p- <ip>", alts: ["Quelle commande nmap scanne tous les ports et identifie les services ?"] },
  { q: "Chercher des dossiers cachés sur un site web", a: "gobuster en mode dir teste les chemins d'une wordlist.", code: "gobuster dir -u http://<ip> -w <wordlist>" },
  { q: "Fuzzer un chemin ou un paramètre web", a: "ffuf remplace le mot FUZZ par chaque ligne de la wordlist.", code: "ffuf -u http://<ip>/FUZZ -w <wordlist>" },
  { q: "Tester une injection SQL automatiquement et lister les bases de données", a: "sqlmap avec l'option --dbs.", code: "sqlmap -u \"http://<ip>/page?id=1\" --dbs" },
  { q: "Contourner une authentification SQL avec le payload classique", a: "Rend la condition toujours vraie et commente la suite de la requête.", code: "' OR 1=1-- -" },
  { q: "Ouvrir un port en écoute avec netcat (pour un reverse shell)", a: "-l écoute, -v verbeux, -n sans DNS, -p le port.", code: "nc -lvnp 4444" },
  { q: "Brute-forcer un mot de passe SSH", a: "hydra avec un login, une liste de mots de passe et le service ciblé.", code: "hydra -l <user> -P <wordlist> ssh://<ip>" },
  { q: "Casser un hash avec la wordlist rockyou", a: "john the ripper avec l'option --wordlist.", code: "john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt" },
  { q: "Trouver les fichiers SUID du système (escalade de privilèges)", a: "find des fichiers avec le bit setuid, erreurs masquées.", code: "find / -perm -4000 2>/dev/null" },
  { q: "Rediriger le port 80 d'une machine distante vers le port 8080 local (SSH)", a: "Port forwarding local avec ssh -L.", code: "ssh -L 8080:localhost:80 <user>@<ip>" },
  { q: "Lancer un serveur de fichiers rapide avec Python", a: "Serveur HTTP sur le port 8000 dans le dossier courant.", code: "python3 -m http.server 8000" },
  { q: "Afficher le type réel d'un fichier", a: "La commande file lit les octets d'en-tête, pas l'extension.", code: "file <fichier>" },
  { q: "Extraire les chaînes lisibles d'un binaire", a: "strings affiche les suites de caractères imprimables.", code: "strings <fichier>" },
  { q: "Découvrir les machines actives d'un réseau sans scanner les ports", a: "nmap -sn fait un simple ping scan.", code: "nmap -sn 192.168.1.0/24" },
  { q: "Capturer le trafic réseau en ligne de commande", a: "tcpdump écoute une interface (ici eth0) et écrit dans un fichier.", code: "tcpdump -i eth0 -w capture.pcap" },
  { q: "Calculer le hash SHA-256 d'un fichier", a: "sha256sum affiche l'empreinte du fichier.", code: "sha256sum <fichier>" },

  /* ----- Concepts ----- */
  { q: "Que signifie CTF ?", a: "Capture The Flag : une compétition où l'on cherche des failles pour récupérer des flags.", wrongs: ["Capture The File", "Cyber Test Framework", "Control The Firewall"] },
  { q: "Qu'est-ce qu'une injection SQL ?", a: "Insérer du code SQL dans une entrée utilisateur pour modifier la requête exécutée par la base de données.", wrongs: ["Envoyer trop de requêtes pour saturer un serveur", "Voler un cookie de session par un script", "Chiffrer une base de données"] },
  { q: "Qu'est-ce qu'une faille XSS ?", a: "Cross-Site Scripting : injecter du JavaScript dans une page vue par d'autres utilisateurs.", wrongs: ["Une injection dans une base de données", "Une attaque par force brute sur un mot de passe", "Une faille dans le système de fichiers"] },
  { q: "Que signifie CSRF ?", a: "Cross-Site Request Forgery : forcer le navigateur d'un utilisateur connecté à envoyer une requête à son insu.", wrongs: ["Cross-Server Remote File", "Client-Side Resource Fetching", "Certificate Signing Request Failure"] },
  { q: "Qu'est-ce qu'une faille IDOR ?", a: "Accéder aux données d'un autre utilisateur en changeant simplement un identifiant dans la requête.", wrongs: ["Exécuter du code à distance", "Casser un chiffrement faible", "Contourner un pare-feu"] },
  { q: "Quelle différence y a-t-il entre un reverse shell et un bind shell ?", a: "Reverse : la victime se connecte vers l'attaquant. Bind : la victime ouvre un port et l'attaquant s'y connecte.", wrongs: ["Aucune, ce sont deux noms du même outil", "Le reverse shell chiffre le trafic, pas le bind shell", "Le bind shell ne fonctionne qu'en local"] },
  { q: "Que signifient les trois lettres de la triade CIA en sécurité ?", a: "Confidentialité, Intégrité, Disponibilité.", wrongs: ["Contrôle, Identification, Authentification", "Chiffrement, Intégrité, Accès", "Confidentialité, Identité, Audit"] },
  { q: "Quelle différence y a-t-il entre hachage et chiffrement ?", a: "Le hachage est à sens unique, le chiffrement est réversible avec la clé.", wrongs: ["Le hachage est réversible, pas le chiffrement", "Aucune, les deux sont réversibles", "Le chiffrement ne s'applique qu'aux fichiers"] },
  { q: "Qu'est-ce qu'une attaque par force brute ?", a: "Essayer systématiquement toutes les combinaisons possibles (ou une liste) jusqu'à trouver la bonne.", wrongs: ["Exploiter une faille dans le code source", "Intercepter le trafic entre deux machines", "Se faire passer pour un administrateur par téléphone"] },
  { q: "Qu'est-ce qu'une injection de prompt ?", a: "Une entrée qui manipule les instructions d'un modèle de langage pour contourner ses règles.", wrongs: ["Un virus qui chiffre les fichiers d'un modèle", "Une attaque réseau contre un serveur d'IA", "Une erreur de syntaxe dans un script Python"] },
  { q: "Que fait le bit SUID sur un exécutable Linux ?", a: "Le programme s'exécute avec les droits de son propriétaire, pas de celui qui le lance.", wrongs: ["Il rend le fichier invisible", "Il interdit toute modification du fichier", "Il lance le programme au démarrage"] },
  { q: "Quelle différence y a-t-il entre TCP et UDP ?", a: "TCP est fiable et orienté connexion, UDP est plus rapide mais sans garantie de livraison.", wrongs: ["UDP est fiable, TCP ne l'est pas", "TCP ne fonctionne que sur le web", "Aucune différence sur le réseau local"] },
  { q: "Qu'est-ce que le fuzzing ?", a: "Envoyer automatiquement de nombreuses entrées inattendues à un programme pour provoquer des erreurs ou des failles.", wrongs: ["Chiffrer le trafic d'une application", "Lire le code source à la recherche de bugs", "Sauvegarder les données d'un serveur"] },
  { q: "À quoi sert une wordlist comme rockyou ?", a: "À tester une grande liste de mots de passe ou de chemins probables lors d'une attaque.", wrongs: ["À traduire des mots entre deux langues", "À compresser des fichiers", "À générer des certificats"] },
  { q: "Qu'est-ce que l'escalade de privilèges ?", a: "Passer d'un compte peu privilégié à un compte avec plus de droits (par exemple root).", wrongs: ["Augmenter la bande passante d'un réseau", "Installer une mise à jour de sécurité", "Créer un nouvel utilisateur légitime"] }
];
