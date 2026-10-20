# Pupitro — consignes du projet

## Mission et invariants

Lire et écouter des partitions MuseScore 2 dans un navigateur mobile, avec leur
mise en page native. Pas d’édition, d’App Store ni d’achat sans accord explicite.
Conserver les six choix d’instruments et le fonctionnement de la lecture pendant
le masquage des commandes.

## Sources de vérité

Lire [README.md](README.md), [todo.md](todo.md) et
[CODEBASE_MAP.md](CODEBASE_MAP.md), puis uniquement le document utile dans `docs/`.
Les décisions sont dans `docs/DECISIONS.md`, les preuves et limites dans
`docs/VALIDATION.md`. Le relais de session est `.claude/session-context.md`.
Les retours utilisateur sont des observations rapportées, distinctes des tests
directs sur appareils.

## Entrées et commandes

- `bash scripts/serve-local.sh` : serveur limité au Mac, port 8765.
- `bash scripts/serve-local.sh --host ADRESSE_IPV4 --port 8766` : réseau local.
- `python3 scripts/setup_assets.py` : dépendances audio partagées.
- `bash scripts/check.sh` : syntaxe et dépendances disponibles.
- Après une modification d’interface, recharger et vérifier dans le navigateur.

## Zones à préserver

- `.access-token`, `imports/`, `reader/scores/`, `reader/assets/` : données locales
  et ressources générées, ignorées par Git. Ne pas les publier ou les effacer.
- Fichiers originaux : conversion sur une copie, sans réenregistrement.
- `MuseScore 2.app` : dépendance déjà installée, pas de remplacement automatique.
- Le dossier possède son propre dépôt Git ; ne pas commiter dans son parent.
- Aucun envoi de partition vers un service externe ; pas d’ouverture Internet
  ou de démarrage automatique du service sans demande adaptée.

## Points techniques déterminants

- `convert_score.py` exporte PDF, MIDI, MPOS et SPOS avec `-r 160`.
- `prepare_reader.py` normalise les positions une seule fois. L’unité est liée
  au facteur `converterDpi * 12` de MuseScore 2 ; modifier les deux côtés ensemble.
- `scripts/setup_assets.py` possède les ressources audio communes ; la conversion
  ne doit pas les recopier pour chaque partition.
- `readerDock` possède la hauteur des commandes, y compris le bouton centré et
  la zone de sécurité iOS. Le curseur utilise cette hauteur mesurée.
- La banque de MuseScore 2 partage le même timbre pour guitare, ukulélé et mandoline.
- Le réglage `navigator.audioSession` traite une cause possible de silence iOS ;
  il ne prouve pas que le son fonctionne sur l’iPhone de l’utilisateur.

## Vérification proportionnée

Un changement visuel demande un contrôle desktop et mobile. Un changement de
conversion demande un import réel et une comparaison avec le PDF natif.
Un changement audio demande un signal produit et, pour valider un appareil,
une écoute humaine sur cet appareil. Ne pas remplacer un essai physique par un
simple changement de largeur dans Chrome.

Le projet ne possède pas encore de suite automatique complète. Préserver les
preuves locales et dire précisément les cas exécutés. Mettre à jour le document
concerné, pas une seconde source de vérité parallèle.
