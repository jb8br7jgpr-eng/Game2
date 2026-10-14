# ARCHIPEL — Les royaumes des marées 🏝️

**Prototype 3D interactif 0.2** du jeu de plateau miniature imaginé ensemble.

## Jouer

**https://jb8br7jgpr-eng.github.io/Game2/**

Deux joueurs jouent à tour de rôle sur **le même appareil**. Le jeu fonctionne sur un navigateur moderne compatible WebGL 2, avec connexion nécessaire pour charger Three.js depuis le CDN.

### Refonte visuelle 0.2
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
