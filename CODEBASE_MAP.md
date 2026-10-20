# Carte du code — Pupitro

| Entrée | Propriétaire et rôle |
|---|---|
| `reader/index.html`, `style.css` | Interface mobile et commandes |
| `reader/app.js` | Transport, bascule lecture/pause au pointeur, présentation, bibliothèque et réglages |
| `reader/import-score.js` | Interprétation ZIP commune au moteur et à la migration, bornes avant extraction, annulation et migration v2 |
| `reader/import-worker.js` | Moteur WASM, gravure et exports |
| `reader/playback.js` | Parseur MIDI partagé, métriques, décompte, boucle, clic, tempos, positions et sélection au pointeur |
| `reader/library.js` | Base v2, catalogue léger, CRUD atomique, réglages, snapshot et URL de Blob temporaires |
| `reader/backup.js` | Sauvegarde binaire locale des originaux/noms/réglages et vérification avant restauration |
| `reader/sw.js` | Cache immuable par version et activation des mises à jour |
| `reader/offline.js` | État hors ligne et demande de mise à jour |
| `reader/manifest.webmanifest`, `icons/` | Installation et identité de l’app |
| `scripts/setup_assets.py` | Ressources et notices épinglées |
| `scripts/build_web.py` | Liste publique explicite et empreintes de version |
| `scripts/serve-web.sh` | Aperçu statique sur localhost |
| `scripts/check.sh`, `tests/*.test.js` | Syntaxe, tests Node de lecture, transport et archives, tests Python et construction |
| `serve_reader.py`, `tests/test_legacy_server.py` | Serveur Mac historique : autorité HTTP, échéance d’envoi et erreurs ; tests avec convertisseur simulé |
| `tests/legacy.cjs`, `tests/browser.cjs` | Migration v2 et recette Chromium/WebKit, dont souris et toucher |
| `tests/library.cjs`, `tests/backup.test.js` | Gestionnaire réel IndexedDB, annulations, erreurs de quota, redémarrage hors ligne et aller-retour de sauvegarde |
| `.github/workflows/pages.yml` | Publication statique manuelle |

## Flux autonome

MSCZ choisi → contrôle ZIP et empreinte → worker webmscore →
adaptation v2 par `import-score.js` si nécessaire → rechargement du MSCZ de travail
avec ses images → SVG/PDF/MIDI/positions → transaction IndexedDB → lecteur local.

Le Service Worker sert les fichiers applicatifs de sa version ; les partitions
ne traversent aucun serveur. La bibliothèque de chaque appareil est indépendante.
La liste lit le catalogue, le renommage conserve les originaux et la suppression
est confirmée. Snapshot local → fichier `.pupitro` dans Fichiers → vérification
complète → préparation des entrées absentes ; aucun écrasement des présentes.

## Carte de la documentation

| Document | Source de vérité |
|---|---|
| [README.md](README.md) | Pourquoi, fonctions et accès aux guides |
| [docs/PRD.md](docs/PRD.md) | Besoin, contraintes acceptées et critères de réussite |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Installation, mises à jour et état de publication |
| [docs/VALIDATION.md](docs/VALIDATION.md) | Essais exécutés, limites et recette physique |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Flux, propriétaires et stockage |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Raisons des choix et point de retour |
| [docs/DEPENDANCES.md](docs/DEPENDANCES.md) | Versions, notices et sources officielles |
| [CHANGELOG.md](CHANGELOG.md), [todo.md](todo.md) | Changements livrés et travail restant |
| [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md) | Contrat local et entrée de compatibilité |
| [.claude/session-context.md](.claude/session-context.md) | État de reprise, à vérifier dans Git |

## Données et historique

`reader/assets/`, `.cache/`, `web-dist/` et les sorties de test sont ignorés par Git.
Le constructeur ne copie jamais les fichiers privés présents dans `reader/assets/`.
Les anciens `imports/`, `reader/scores/`, `.access-token` et références sont préservés.
`serve_reader.py`, `convert_score.py` et `prepare_reader.py` conservent l’ancien
chemin Mac ; la version complète correspondante reste au tag `v0.1.0`.
