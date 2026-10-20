# Carte du code — Pupitro

Carte factuelle du prototype, rédigée depuis les sources le 20 octobre 2026.

| Entrée | Rôle |
|---|---|
| `serve_reader.py` | Serveur HTTP, lien local, import et réponses d’erreur |
| `convert_score.py` | Validation MSCZ, copie locale, processus MuseScore 2 |
| `prepare_reader.py` | Pages PNG, MIDI avec clic, positions et manifeste |
| `reader/index.html` | Structure du lecteur et boutons |
| `reader/style.css` | Présentation, affichage mobile et bandeau inférieur |
| `reader/app.js` | Synthèse, transport, curseur, parties et import |
| `scripts/setup_assets.py` | Archive audio épinglée et banque locale |
| `scripts/serve-local.sh` | Lancement depuis n’importe quel répertoire |
| `scripts/check.sh` | Contrôle de syntaxe et disponibilité des dépendances |

## Flux principal

`Ouvrir un fichier .mscz` → `POST api/import` → `convert()` → MuseScore 2 →
`prepare_reader.py` → `reader/scores/<id>/score.json` → navigateur.

L’audio utilise le MIDI préparé et `reader/assets/sounds.sf3`. Le curseur utilise
`cursorEvents`, normalisés par le préparateur, et le tick du lecteur MIDI.

## Données locales

- `imports/<id>/` : copie du MSCZ, tâche d’export, journaux et exports natifs.
- `reader/scores/<id>/` : pages, PDF, MIDI et manifeste servis au navigateur.
- `reader/assets/` : synthèse partagée et éventuelle partition de démarrage.
- `.access-token` : chemin d’accès réseau local, à garder privé.
- `.pdd/` : inventaire documentaire local, non publié.
- `reference*`, `apercu-*` : preuves de l’essai initial, non publiées.

## Pour intervenir

- Mise en page : `index.html` et `style.css`, puis contrôle navigateur.
- Lecture ou curseur : `app.js`, puis scénario de `docs/VALIDATION.md`.
- Import ou export : `convert_score.py`, `prepare_reader.py`, puis import réel.
- Installation : `requirements.txt` et `scripts/setup_assets.py`.
- Reprise : `.claude/session-context.md`, `todo.md`, puis sources concernées.

`bash scripts/check.sh` ne prouve pas l’écoute sur un téléphone ni la fidélité
de tous les MSCZ. Aucun moteur de rendu MuseScore n’est embarqué dans le navigateur.
