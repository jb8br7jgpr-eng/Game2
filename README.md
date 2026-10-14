# ARCHIPEL — Les royaumes des marées 🏝️

**Prototype 3D interactif 0.5** du jeu de plateau miniature imaginé ensemble.

## Jouer

**https://jb8br7jgpr-eng.github.io/Game2/**

Deux joueurs jouent à tour de rôle sur **le même appareil**. Le jeu fonctionne sur un navigateur moderne compatible WebGL 2, avec connexion nécessaire pour charger Three.js depuis le CDN.

### ARCHIPEL 0.5 — plateau plus vaste et décisions de combat

- **Grande carte organique** : archipel agrandi (jusqu’à environ 35 unités de hauteur), îles séparées d’au moins 5 unités, répartition réellement variable à chaque nouvelle partie. Zoom et déplacement de caméra restent nécessaires pour explorer les zones éloignées.
- **Réseau maritime fiable** : générateur indépendant maintenant chaque île reliée à au moins **2 îles**, généralement **3 ou 4** ; routes renforcées et mise en évidence des connexions disponibles. Vérifié sur 55 générations aléatoires.
- **Panneau tactique avant toute attaque** : navire et bonus d’attaque, niveau exact des fortifications, +1 si navire défensif sur l’île, plages de forces possibles, **probabilité exacte de victoire sur 36 lancers de dés** et conséquences des résultats. Boutons **Annuler** (sans consommer le tour) / **Attaquer !**.
- **Caméra plus basse, perspective de trois quarts**, navigation avec suivi doux de caméra, sillages parallèles et canonnade en trajectoire courbe.
- **Nouveaux détails 3D** : végétation, fleurs, rochers, lagons, reliefs, bâtiments de trois niveaux et silhouettes de navires beaucoup plus distinctes, surtout niveau 3.
- **Dés 3D conservés à l’identique** à la demande de l’utilisateur.

### ARCHIPEL 0.4 — nouveaux modèles, perspective, animation et confort
- **Perspective 3/4 plus basse** sur les reliefs, les remparts et les navires.
- **Îles organiques** sculptées en anneaux de terrain asymétriques, décors renforcés, détails de village/ville/forteresse, palmiers et éléments propres aux 10 îles.
- **Navires miniatures retravaillés** : bastingage, cordages, voiles bombées, accents améthyste/ambre, figures de proue de faction et davantage d'ornements selon les niveaux.
- **Placement aléatoire naturel** sur une carte plus longue, îles séparées d'au moins ~3,35 unités, **environ 20 routes maritimes** et options tactiques plus nombreuses.
- **Navigation améliorée** : trajet courbe, orientation du navire, léger tangage, sillage, particules et arrivée animée.
- **Dés à six faces modélisés en CSS 3D** : chaque face comporte ses vrais points ; lancer tournoyant et révélation du résultat de règles lors des départs et combats.
- **Interface en trois étapes** (Navigation facultative → Action → Fin du tour), couleurs de menu assorties au joueur actif, ressources et informations plus lisibles.
- Conservation de la carte plein écran, navigation tactile, zoom, recentrage, menu rétractable et mode carte seule.

### Refonte visuelle et ergonomique 0.3
- Îles-jouets plus détaillées avec reliefs arrondis, sentiers, végétation, cascades et décors signatures pour chaque territoire.
- Navires 3D enrichis : coques plus élégantes, voiles légèrement bombées, figures de proue lunaires / solaires, ponts et canons visibles.
- Océan à shader dynamique : dégradés turquoise, caustiques, écume des côtes et sillage pendant la navigation.
- Archipel physiquement plus étendu : **faire glisser un doigt pour déplacer la caméra**, **pincer avec deux doigts pour zoomer**, boutons +, − et recentrer.
- Le bouton **« Masquer les actions »** réduit le panneau inférieur ; le bouton en haut à droite active le **mode carte seule**, avec commande de restauration accessible.
- Les gestes sont adaptés aux écrans tactiles (et la roulette fonctionne sur ordinateur).

### Rappel de la refonte visuelle 0.2
- **Carte 3D plein écran**, éclairage, ombres et mer turquoise animée par shader.
- 10 **îles 3D stylisées et simples** avec paysages particuliers, noms et ressources lisibles.
- Villages, villes et fortifications réalisés en géométrie 3D, avec changements visibles selon les améliorations.
- Deux bateaux 3D aux voiles violettes/orangées, évoluant sur trois niveaux.
- Navigation animée, bataille animée, dés, particules, découverte de trésor, animation de retraite.
- Tableau de bord compact en haut et **menu d'actions directement sur la carte en bas**.

Les modèles sont **des géométries 3D procédurales** (Three.js), pas des captures d'illustrations ni des émojis disposés sur la carte. Ils sont volontairement épurés, de type maquettes-jouets. Cette version est à ajuster après tests sur un véritable iPhone.

### Règles présentes
- **Vélyra** (violet) et **Auréon** (orange), mêmes capacités.
- 10 îles disposées aléatoirement, routes assurant la connectivité.
- Un dé par joueur détermine le premier choix d'île ; le deuxième choisit ensuite **et joue en premier**.
- Un navire par faction, déplacement d'une route puis une action par tour.
- Bois et pierre produits de 1 à 3 par île et par tour, réserves plafonnées à 40.
- Amélioration navire avec 10 puis 20 bois ; îles avec 10 puis 20 pierres.
- Attaque : D6 + niveau du bateau -1 ; défense : D6 + niveau de l'île +1 si navire défenseur présent ; égalité favorable au défenseur.
- Défaite de l'attaquant : -1 niveau de navire et retraite au départ. Île conquise : -1 niveau défensif.
- Retraite défensive vers une île alliée au choix, ou île neutre si aucun territoire.
- Trésor caché découvert lors d'une colonisation, trois types de cadeaux.
- Victoire à 7 îles ou points après 22 tours chacun, puis îles, victoires militaires et match nul.

## Technique

Aucune configuration Supabase n'est requise **pour le mode local actuel**. Game2 est entièrement séparé d'OPMercato.

- **`index.html`** : structure du jeu et HUD
- **`styles.css`** : interface tactile plein écran
- **`game.js`** : moteur des règles, indépendant de l'affichage
- **`board3d.js`** : modèles 3D, scène WebGL, navigation et effets
- **`app.js`** : commandes, animations et coordination
- **`tests/smoke.mjs`** : tests du moteur de jeu
- **`tests/browser.mjs`** : test d'interface avec Chromium dans une fenêtre de taille iPhone

À venir : améliorations visuelles après retours utilisateur, animations plus poussées, adaptation finale à l'iPhone et multijoueur en ligne avec serveur indépendant.

Pour lancer en local : `python3 -m http.server 8000`, puis ouvrir http://localhost:8000/ .
