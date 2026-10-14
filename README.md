# ARCHIPEL — Les royaumes des marées 🏝️

**Prototype 3D interactif 0.7** du jeu de plateau miniature imaginé ensemble.

## Atelier graphique V0.8.1 — Hero Island

**Prototype interactif séparé : https://jb8br7jgpr-eng.github.io/Game2/prototype-v08.html**

Cette expérimentation se concentre sur une seule île tropicale, une cabane, un ponton et un petit voilier. Les modèles sont désormais exportés en véritables **fichiers 3D GLB** plutôt que reconstruits au chargement dans JavaScript. Un générateur Python (`scripts/build_hero_assets.py`) préfabrique les géométries sculptées, les textures colorées et les matériaux PBR (dont quelques textures normales) avant le déploiement GitHub Pages. Une vérification (`scripts/check_hero_assets.py`) contrôle les maillages et leurs matériaux. Les GLB sont générés à la compilation du site, puis servis depuis `assets/`.

Ce nouveau pipeline crée des matériaux et modèles plus travaillés mais **n'équivaut pas encore** à des sculptures d'artiste faites sous Blender. Pour atteindre complètement le rendu de l'image de référence, il faudra remplacer progressivement ces assets techniques par des modèles et textures d'artiste, et faire évoluer le shader d'eau et la mise en lumière. La V0.7 du jeu complet reste indépendante.

Fonctions du prototype : rotation et zoom tactiles, lumière du jour / du soir, petit trajet animé du bateau, sillage, interface escamotable et vue centrée adaptée à l'iPhone.

## Jouer

**https://jb8br7jgpr-eng.github.io/Game2/**

Deux joueurs jouent à tour de rôle sur **le même appareil**. Le jeu fonctionne sur un navigateur moderne compatible WebGL 2, avec connexion nécessaire pour charger Three.js depuis le CDN.

### ARCHIPEL 0.7 — expéditions, retraites tactiles, miniatures soignées

- **Retraite interactive** : après la défaite du défenseur, les îles de refuge accessibles sont illuminées en 3D et leurs étiquettes deviennent cliquables ; une confirmation précède le repli animé. Les refuges respectent les règles historiques (îles alliées, ou neutres si aucune possession).
- **Colonisation au dé** : chaque île neutre affiche dès le début une difficulté fixe de **3, 4 ou 5**. Pour la coloniser, le navire lance un dé 3D et ajoute son bonus de niveau (**0, +1 ou +2**). Il faut atteindre ou dépasser la difficulté. Une expédition ratée consomme l'action, mais le bateau reste sur l'île et peut réessayer au prochain tour.
- **Prévisualisation** : difficulté, niveau du bateau, plage de résultats, nombre de faces gagnantes sur six, pourcentage et conséquences de l'échec avant de lancer l'expédition.
- **Nouvelle finition graphique** : détails de plage, végétation, fanions, mobilier du village, gréements de bateaux et reflets supplémentaires sur l'eau, sans superposition des bâtiments principaux.
- **Animations enrichies** : cercle lumineux de l'expédition réussie ou ratée, animation d'amélioration des bateaux et constructions, retraite cartographique et effets maritimes conservés.
- Les **dés 3D existants ne sont pas remplacés**. Aucune mécanique de comptoir commercial, reconnaissance ou port amélioré n'a été introduite dans cette version.

### ARCHIPEL 0.6 — dioramas unifiés, archipels uniques et trésor spectaculaire

- **Bateaux hors des îles** : mouillages calculés côté mer, éloignés des côtes et des îles voisines, adaptés à tous les niveaux de bateau, y compris après une navigation ou un combat.
- **Nouvelle modélisation 3D cohérente** : les anciennes géométries empilées ont été remplacées par **un modèle construit d’un seul tenant** pour chaque île et chaque navire, avec une identité visuelle de chaque thème et de chaque niveau de construction.
- **Cinq formes aléatoires d’archipel** : atoll, croissant, chapelet, constellation et deux baies, avec orientation et emplacements différents, et des espaces maritimes élargis entre chaque île.
- **Routes tactiques conservées** : chaque île garde plusieurs connexions et l’ensemble reste atteignable malgré l’agrandissement.
- **Caméra et interface de départ adaptées** : bouton Vue d’ensemble calculé automatiquement pour la forme actuelle ; menu des dix îles avec leurs ressources et boutons pour observer ou choisir un territoire, même très éloigné de la caméra.
- **Trésor spectaculaire** : animation de coffre 3D avec ouverture du couvercle, particules dorées, zoom, objets-récompenses, puis fiche persistante indiquant exactement les ressources, l'amélioration navire ou les fortifications gagnées.
- **Océan étendu jusqu’aux limites de la caméra** pour éviter les bords visibles pendant les dézooms très importants.
- **Dés 3D et règles du combat inchangés**.

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

### Mode en ligne — deux téléphones

À l'écran d'accueil, choisir **Jouer à deux en ligne**. Le joueur violet (hôte) crée un salon avec son nom de faction et partage le **code à 8 caractères** ou le lien d'invitation. Le joueur orange rejoint le salon avec son nom, puis l'hôte lance la partie. Chaque téléphone affiche le même archipel, les mêmes dés, les mêmes choix, et bloque les actions hors tour. Le navigateur conserve un jeton privé pour reprendre une partie après rechargement.

Infrastructure autonome **Supabase ARCHIPEL** (Paris, projet `lrmgtnbxujdvswaykyxi`), sans dépendance à OPMercato :
- `supabase/functions/archipel-online/index.ts` : serveur de jeu à actions validées côté serveur, dés et résultats calculés sur le serveur, accès par jetons aléatoires hachés ;
- table privée `archipel_rooms`, accès direct depuis les navigateurs interdit par RLS ; écriture concurrente protégée par un numéro de version ;
- `online.js` : API navigateur, sauvegarde locale du jeton de salon, reconnexion et actualisation régulière ;
- `tests/online-api.mjs` et `tests/online-browser.mjs` : test d'autorisation des deux sièges et véritable scénario à deux fenêtres iPhone.
- Lors de changements de règles, redéployer la fonction Edge avec les fichiers `game.js`, `map-v05.js` et `map-v06.js` à jour, car le serveur embarque sa copie du moteur.

Le mode **local** ne nécessite toujours aucune connexion Supabase. Les prototypes graphiques restent indépendants.

À venir : améliorations visuelles après retours utilisateur et animations plus poussées.

Pour lancer en local : `python3 -m http.server 8000`, puis ouvrir http://localhost:8000/ .

### Mise à jour — noms personnalisés sous les dés (14 octobre 2026)

Le nom choisi à l'accueil pour chaque faction apparaît désormais sous son dé (lancer initial, expédition et attaque/défense), en conservant le violet pour le joueur 1 et l'orange pour le joueur 2. La mise en page accepte les noms longs sur iPhone. Le test navigateur vérifie chaque contexte.
