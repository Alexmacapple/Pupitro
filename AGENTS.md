# Pupitro — consignes du projet

## Mission et invariants

Lire et écouter des MSCZ sur iPhone et iPad avec import local et usage hors ligne.
L’utilisateur accepte désormais un rendu web différent de MuseScore 2, à condition
que les éléments s’affichent correctement. Préserver lecture, six instruments,
curseur, métronome, décompte, boucle et commandes escamotables.
Pas d’édition, d’App Store ni d’achat sans accord explicite.

Lire `README.md`, `todo.md`, `CODEBASE_MAP.md`, puis le document utile dans `docs/`.
Les preuves sont dans `docs/VALIDATION.md` et les arbitrages dans `docs/DECISIONS.md`.
Un retour utilisateur reste distinct d’un essai direct ou d’un navigateur simulé.

## Commandes

- `python3 scripts/setup_assets.py --standalone` : ressources épinglées et notices.
- `bash scripts/check.sh` : syntaxe, tests ciblés et construction statique.
- `bash scripts/serve-web.sh` : aperçu local sur le port 8770.
- `npm ci --ignore-scripts` puis `npm test` : dépendances de test et tests ciblés.
- `npm run test:browser -- /chemin/exemple.mscz` : recette avec une partition privée.

Le navigateur reçoit uniquement `web-dist/`, construit depuis une liste explicite.
Ne pas servir ou publier la racine du dépôt.

## Propriété des données et contrats

- Bibliothèque et réglages : `reader/library.js`, IndexedDB ; jamais effacés par
  le nettoyage des caches applicatifs.
- Gravure : worker dédié, libéré ou interrompu après chaque import.
- Temps MIDI, clic et coordonnées : normalisés une fois dans `reader/playback.js`.
- Anciens accords MuseScore 2 : désactiver la nouvelle synthèse automatique des
  harmonies et préserver le numéro de case et les cordes du barré depuis le XML
  d’origine. Vérifier l’identité des diagrammes avant de les rapprocher.
  Recharger une archive MSCZ complète pour conserver les images ; ne pas modifier
  le fichier source ni remplacer le numéro du barré par une heuristique sur les points.
- Clic et toucher : sélectionner un événement depuis les coordonnées normalisées
  du moteur, avec les reprises ; une zone hors portée ne démarre pas la lecture.
  Pendant la lecture ou le décompte, le clic met en pause sans déplacer le curseur.
- Cache : un Service Worker appartient à une version complète ; aucune bascule
  automatique pendant une lecture. Les mises à jour attendent l’action utilisateur.
- Ressources : l’installateur possède les versions, noms attendus et empreintes.
- La hauteur réelle de `readerDock` possède l’espace des commandes et du curseur.

## Zones à préserver

`.access-token`, `imports/`, `reader/scores/`, `reader/assets/`, caches et preuves
locales ne doivent pas être ajoutés au dépôt source ni effacés implicitement.
Les anciens outils Python de conversion et MuseScore 2 restent disponibles ;
le tag `v0.1.0` protège la version Mac. Aucun remplacement de MuseScore installé.
Ce projet possède son propre dépôt : ne pas commiter dans son parent.
Pas de démarrage automatique ni d’exposition du serveur Mac sur Internet.

## Vérification

Un changement de rendu demande une inspection des notes et portées sur Chrome
et WebKit. Un changement audio demande un signal produit ; seule une écoute
humaine valide le son sur un appareil physique. Tester un import neuf hors ligne,
la réouverture après fermeture, et les échecs sans perte de bibliothèque.
Dire précisément ce qui reste non vérifié, notamment les appareils physiques.
