# Carte du code — Pupitro

| Entrée | Propriétaire et rôle |
|---|---|
| `reader/index.html`, `style.css` | Interface mobile et commandes |
| `reader/app.js` | Transport, présentation, bibliothèque et réglages |
| `reader/import-score.js` | Validation ZIP, annulation, délai et adaptation XML v2 |
| `reader/import-worker.js` | Moteur WASM, gravure et exports |
| `reader/playback.js` | MIDI, clic, tempos et normalisation des positions |
| `reader/library.js` | Transactions IndexedDB et URL de Blob temporaires |
| `reader/sw.js` | Cache immuable par version et activation des mises à jour |
| `reader/offline.js` | État hors ligne et demande de mise à jour |
| `reader/manifest.webmanifest`, `icons/` | Installation et identité de l’app |
| `scripts/setup_assets.py` | Ressources et notices épinglées |
| `scripts/build_web.py` | Liste publique explicite et empreintes de version |
| `scripts/serve-web.sh` | Aperçu statique sur localhost |
| `scripts/check.sh`, `tests/` | Contrôles et recettes de navigateur |
| `.github/workflows/pages.yml` | Publication statique manuelle |

## Flux autonome

MSCZ choisi → contrôle ZIP → worker webmscore → SVG/PDF/MIDI/positions →
transaction IndexedDB → affichage et synthèse locale.

Le Service Worker sert les fichiers applicatifs de sa version ; les partitions
ne traversent aucun serveur. La bibliothèque de chaque appareil est indépendante.

## Données et historique

`reader/assets/`, `.cache/`, `web-dist/` et les sorties de test sont ignorés par Git.
Le constructeur ne copie jamais les fichiers privés présents dans `reader/assets/`.
Les anciens `imports/`, `reader/scores/`, `.access-token` et références sont préservés.
`serve_reader.py`, `convert_score.py` et `prepare_reader.py` conservent l’ancien
chemin Mac ; la version complète correspondante reste au tag `v0.1.0`.
