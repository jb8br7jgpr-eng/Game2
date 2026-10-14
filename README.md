# ARCHIPEL 🏝️

Petit jeu de plateau de conquête tropicale, conçu pour deux joueurs.

## Prototype 0.1 — jeu local

Le prototype dans index.html fonctionne **sur un même appareil** : les deux joueurs jouent à tour de rôle sur le même iPhone ou ordinateur. Aucun compte ni serveur nécessaire.

### Présent
- Deux factions : **Vélyra** (violet) et **Auréon** (ambre/orange).
- Dix îles à thèmes, disposition et routes renouvelées à chaque partie.
- Production de 1 à 3 bois et de 1 à 3 pierres, réserves plafonnées à 40.
- Dés initiaux : gagnant choisit son île en premier, perdant commence à jouer.
- Une route et une action par tour ; colonisation neutre ; attaque avec deux dés à six faces.
- Navires niveaux 1–3 (+0/+1/+2 attaque) : améliorations à 10 puis 20 bois.
- Îles niveaux 0–2 (+0/+1/+2 défense) : fortifications à 10 puis 20 pierres.
- Retraites, dégâts, défense navale, trésor caché avec trois récompenses.
- Victoire immédiate à 7 îles ou au score après 22 tours chacun.

### Apparence
Les visuels actuels sont des **formes SVG légères et stylisées** — une première approximation jouable du look miniature-jouet approuvé, pas encore des modèles 3D définitifs.

### Prochaines étapes
- Tester la taille du plateau et des éléments sur iPhone.
- Affiner les silhouettes des dix îles et des six navires.
- Perfectionner les animations et ajuster l'équilibrage.
- Ajouter plus tard le **serveur multijoueur indépendant**, isolé d'OPMercato.

## Déploiement
Un workflow GitHub Actions effectue un test de règles et publie via GitHub Pages. Si Pages doit être activé manuellement : Settings → Pages → Build and deployment → GitHub Actions.

**Dépôt indépendant :** jb8br7jgpr-eng/Game2, sans modification ni partage de données avec OPMercato.
