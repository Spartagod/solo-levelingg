/* ==========================================================
   CONTENT/PYTHON.JS : paquet "Python"
   ----------------------------------------------------------
   q     = la question           a    = l'explication (réponse)
   code  = exemple de code (affiché après la réponse)
   alts  = autres façons de poser la même question (facultatif)
   ========================================================== */


const SEED_PYTHON = [
    { q: "len(x) : que fait-elle ?", a: "Renvoie le nombre d'éléments (ou de caractères) de x.", code: "len([4, 5, 6])   # 3" },
    { q: "range(start, stop, step) : que renvoie-t-elle ?", a: "Une suite d'entiers de start (inclus) à stop (exclu), par pas de step.", code: "list(range(0, 10, 3))   # [0, 3, 6, 9]" },
    { q: "enumerate(iterable, start=0) : à quoi ça sert ?", a: "Donne des couples (index, valeur) pendant une boucle.", code: "for i, v in enumerate(['a', 'b']):\n    print(i, v)   # 0 a / 1 b" },
    { q: "zip(a, b) : que fait-elle ?", a: "Associe les éléments de même position, s'arrête au plus court.", code: "list(zip([1, 2], ['a', 'b']))   # [(1, 'a'), (2, 'b')]" },
    { q: "map(fonction, iterable) : que fait-elle ?", a: "Applique la fonction à chaque élément (renvoie un itérateur).", code: "list(map(str.upper, ['a', 'b']))   # ['A', 'B']" },
    { q: "filter(fonction, iterable) : que fait-elle ?", a: "Garde les éléments pour lesquels la fonction renvoie True.", code: "list(filter(lambda n: n % 2 == 0, range(6)))   # [0, 2, 4]" },
    { q: "sorted(iterable, key=None, reverse=False) : particularité ?", a: "Renvoie une NOUVELLE liste triée (list.sort() trie sur place et renvoie None).", code: "sorted(['bb', 'a'], key=len)   # ['a', 'bb']" },
    { q: "sum, min, max : comment s'utilisent-elles ?", a: "Somme, plus petit et plus grand élément d'un itérable.", code: "sum([1, 2, 3]), min([3, 1]), max([3, 1])   # 6, 1, 3" },
    { q: "any(it) et all(it) : différence ?", a: "any : au moins un élément vrai. all : tous les éléments vrais.", code: "any([0, 1])   # True\nall([0, 1])   # False" },
    { q: "str.split(sep) et str.join(liste) : que font-elles ?", a: "split découpe une chaîne en liste, join recolle une liste en chaîne.", code: "'a,b'.split(',')   # ['a', 'b']\n'-'.join(['a', 'b'])   # 'a-b'" },
    { q: "str.strip() : que fait-elle ?", a: "Retire les espaces (ou les caractères donnés) au début et à la fin.", code: "'  hello '.strip()   # 'hello'" },
    { q: "f-string : comment insérer une variable dans du texte ?", a: "Préfixe f et accolades. On peut mettre une expression et un format.", code: "nom = 'Tom'\nf'Salut {nom}, {3.14159:.2f}'" },
    { q: "list.append, extend, insert, pop : différences ?", a: "append ajoute un élément à la fin, extend ajoute plusieurs éléments, insert ajoute à un index, pop retire (dernier par défaut) et le renvoie.", code: "l = [1]; l.append(2); l.extend([3, 4]); l.insert(0, 0); l.pop()" },
    { q: "dict.get(clé, défaut) : intérêt ?", a: "Lit une clé sans lever KeyError : renvoie défaut si elle n'existe pas.", code: "{'a': 1}.get('b', 0)   # 0" },
    { q: "dict.items() : que renvoie-t-elle ?", a: "Les couples (clé, valeur), pratiques pour boucler.", code: "for k, v in {'a': 1}.items():\n    print(k, v)" },
    { q: "Opérations sur les ensembles (set)", a: "| union, & intersection, - différence, ^ différence symétrique.", code: "{1, 2} | {2, 3}   # {1, 2, 3}\n{1, 2} & {2, 3}   # {2}" },
    { q: "Compréhension de liste : syntaxe ?", a: "[expression for x in iterable if condition]", code: "[n * n for n in range(5) if n % 2 == 0]   # [0, 4, 16]" },
    { q: "Slicing : liste[a:b:c] ?", a: "De l'index a (inclus) à b (exclu), par pas de c. [::-1] inverse la liste.", code: "[0, 1, 2, 3, 4][1:4]   # [1, 2, 3]\n'abc'[::-1]   # 'cba'" },
    { q: "Ouvrir et lire un fichier proprement", a: "with ferme le fichier automatiquement, même en cas d'erreur.", code: "with open('fichier.txt') as f:\n    texte = f.read()" },
    { q: "try / except / else / finally : rôle de chaque bloc ?", a: "try : code risqué. except : si erreur. else : si aucune erreur. finally : toujours exécuté.", code: "try:\n    int('x')\nexcept ValueError:\n    print('erreur')\nfinally:\n    print('fin')" },
    { q: "lambda : à quoi ça sert ?", a: "Fonction anonyme d'une seule expression, souvent utilisée comme key.", code: "sorted(['bb', 'a'], key=lambda s: len(s))" },
    { q: "isinstance(x, type) : que vérifie-t-elle ?", a: "Si x est une instance de ce type (ou d'une classe fille).", code: "isinstance(3, int)   # True" },
    { q: "Différence entre == et is", a: "== compare les valeurs, is compare l'identité (même objet en mémoire).", code: "[1] == [1]   # True\n[1] is [1]   # False" },
    { q: "*args et **kwargs : que représentent-ils ?", a: "*args : arguments positionnels en trop (tuple). **kwargs : arguments nommés en trop (dict).", code: "def f(*args, **kwargs):\n    print(args, kwargs)" },
    { q: "Quelle fonction affiche du texte dans la console ?", a: "print() affiche ses arguments séparés par un espace, puis passe à la ligne.", code: "print('a', 'b')   # a b", alts: ["Comment afficher une valeur à l'écran en Python ?"] },
    { q: "Comment convertir la chaîne '42' en entier ?", a: "int('42') renvoie l'entier 42 (ValueError si la chaîne n'est pas un nombre).", code: "int('42') + 1   # 43", alts: ["Quelle fonction transforme un texte en nombre entier ?"] },
    { q: "Comment lire une saisie au clavier ?", a: "input(message) lit une ligne et la renvoie toujours sous forme de chaîne.", code: "nom = input('Nom ? ')" },
    { q: "Que renvoie type(x) ?", a: "La classe de l'objet x.", code: "type(3.5)   # <class 'float'>" },
    { q: "Quelle est la différence entre une liste et un tuple ?", a: "La liste est modifiable (mutable), le tuple ne l'est pas (immuable).", code: "t = (1, 2)\nt[0] = 5   # TypeError" },
    { q: "Comment parcourir les clés d'un dictionnaire ?", a: "for cle in dico: parcourt les clés. dico.values() donne les valeurs.", code: "for k in {'a': 1}:\n    print(k)   # a" },
    { q: "Que fait self dans une méthode de classe ?", a: "Il désigne l'instance courante sur laquelle la méthode est appelée.", code: "class A:\n    def __init__(self, x):\n        self.x = x" },
    { q: "Comment importer uniquement la fonction sqrt du module math ?", a: "from module import nom permet d'utiliser le nom directement.", code: "from math import sqrt\nsqrt(16)   # 4.0" },
    { q: "À quoi sert if __name__ == '__main__': ?", a: "Exécuter du code seulement quand le fichier est lancé directement, pas quand il est importé.", code: "if __name__ == '__main__':\n    main()" },
    { q: "Que renvoie 7 // 2 et 7 % 2 ?", a: "// est la division entière (3), % est le reste (1).", code: "7 // 2, 7 % 2   # (3, 1)" },
    { q: "Comment inverser une liste sur place ?", a: "liste.reverse() modifie la liste. reversed(liste) renvoie un itérateur.", code: "l = [1, 2, 3]\nl.reverse()   # [3, 2, 1]" },
    { q: "Comment supprimer les doublons d'une liste ?", a: "En la convertissant en set (l'ordre n'est pas garanti).", code: "list(set([1, 1, 2]))   # [1, 2]" },
    { q: "Que fait with open(...) as f: quand on écrit dans un fichier ?", a: "Le mode 'w' crée ou écrase le fichier, 'a' ajoute à la fin, 'r' lit.", code: "with open('x.txt', 'a') as f:\n    f.write('ligne\\n')" },
    { q: "Que fait la méthode str.replace(a, b) ?", a: "Renvoie une nouvelle chaîne où a est remplacé par b (la chaîne d'origine ne change pas).", code: "'chat'.replace('c', 'b')   # 'bhat'" },
    { q: "Que fait la méthode list.sort() par rapport à sorted() ?", a: "sort() trie la liste sur place et renvoie None, sorted() renvoie une nouvelle liste.", code: "l = [3, 1]\nl.sort()   # l vaut [1, 3]" }
];
