# Historique

## v0.2.0 — 2026-10-20 — lecteur autonome, fonctionnement iPhone confirmé

- Import MSCZ traité sur l’appareil par webmscore 0.22.0, sans serveur de conversion.
- Rendu web différent accepté par l’utilisateur ; exemple de 13 pages contre 7.
- Conservation des parties MuseScore 2 sans ajout automatique des harmonies.
- Bibliothèque et réglages dans IndexedDB ; export du MSCZ d’origine.
- Installation PWA, ressources en cache, import et lecture hors ligne.
- Conservation des instruments, du curseur, du métronome et des commandes de lecture.
- Construction statique par liste explicite et publication HTTPS manuelle préparée.
- Essais Chrome et WebKit Mac ; fonctionnement iPhone confirmé par l’utilisateur.
- Annulation contrôlée après le calcul d’empreinte ; ouvertures de partitions sérialisées.
- Partitions de silences consultables, avec durée du métronome issue du moteur.
- Barrés MuseScore 2 : numéro de case et cordes conservés ; images incluses dans la copie MSCZ.
- Lecture/pause par clic ou toucher sur une note : en lecture ou décompte, pause
  sans déplacement ; au clic suivant, départ depuis la note visée.
- Guide Safari pour les deux appareils, distinction entre mise à jour de l’app
  et réimport nécessaire après une correction de gravure.

Première publication HTTPS autorisée et réalisée le 20 octobre 2026 sur
[Pupitro](https://alexmacapple.github.io/Pupitro/). Les 30 ressources publiques
correspondent à la construction testée ; réouverture et nouvel import sans réseau
contrôlés sur Chrome Mac. Le tag `v0.2.0` repère cette version autonome.
L’utilisateur confirme son fonctionnement sur iPhone ; les scénarios détaillés,
dont le mode avion, ne sont pas précisés. La vérification iPad reste ouverte.

## v0.1.0 — 2026-10-20 — premier prototype

- Lecture de MSCZ MuseScore 2 avec préparation native sur Mac.
- Rendu PDF, MIDI, curseur, métronome, décompte et boucle.
- Six choix d’instruments, volumes, coupure, solo et commandes escamotables.
- Ouverture et son sur iPhone confirmés par l’utilisateur.
- Installation locale durable, documentation et dépôt GitHub dédié.
- Tag conservé comme point de retour avant la version autonome.
