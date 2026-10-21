# Historique

## Correctifs après recettes — 2026-10-21

- Titres blancs remplacés par un nom de repli ; budget de sauvegarde vérifié
  avant renommage, réglages et repréparation, sans changer les MSCZ d’origine.
- Champ de nom masqué pendant une suppression ; bilans d’ajout, de repréparation
  et d’échec d’ouverture distincts ; état occupé et récupération IndexedDB renforcés.
- Retours de focus et messages accessibles corrigés après renommage, suppression
  et annulation de doublon ; commandes défilantes en petite hauteur et bordure
  du champ de nom contrastée. Étiquettes, rôles et description de page complétés.
- Sauvegarde annulable, téléchargement sans expiration arbitraire de l’URL et
  dernier identifiant exporté seulement s’il appartient au snapshot.
- Constructeur protégé contre l’écrasement de sorties modifiées, avec reçu
  d’empreintes des fichiers générés ; tests de sauvegarde et bibliothèque renforcés.

Les preuves par construction, les limites AY11 et le triage ShipGuard figurent
dans [VALIDATION.md](docs/VALIDATION.md). Publiés depuis `d538720` par le
[workflow 39518250725](https://github.com/Alexmacapple/Pupitro/actions/runs/39518250725),
construction `7385c59dd8c93f227bbd`, avec 32 ressources HTTPS vérifiées.
[INSTALLATION.md](docs/INSTALLATION.md) possède la procédure de mise à jour.

## Gestionnaire de bibliothèque — 2026-10-21

- Ajout multiple de MSCZ, choix explicite sur les doublons, renommage et suppression
  confirmée, y compris pendant la lecture de la partition supprimée.
- Catalogue IndexedDB léger, migration de l’existant sans réimport, aucune limite
  artificielle de nombre ; originaux et réglages conservés lors d’un échec.
- Export local `.pupitro` et restauration additive des originaux, noms et réglages.
  Vérification complète avant écriture, annulation et messages de stockage insuffisant.
- Anciens champs de boucle vides ou fractionnaires sauvegardés ; annulation tardive
  de vérification respectée ; noms de bibliothèque lisibles sur grand écran.
- Originaux restaurés matérialisés en Blobs indépendants pour préserver leurs
  seuls octets MSCZ dans IndexedDB sous WebKit.
- 38 tests Node et 11 tests HTTP passent. Les recettes Mac et les limites physiques
  sont consignées dans [VALIDATION.md](docs/VALIDATION.md). Tags antérieurs inchangés.

Publié le 21 octobre 2026 par le
[workflow 39508075359](https://github.com/Alexmacapple/Pupitro/actions/runs/39508075359),
construction `a211530ec3d09aedecdb`. La mise à jour Chromium conserve deux partitions
existantes ; export et vérification de sauvegarde hors ligne réussissent.
La validation physique de ce gestionnaire sur iPhone et iPad reste ouverte.

## Correctifs après v0.2.0 — 2026-10-20

- Revue ShipGuard : 12 constats corrigés, dont un défaut de journalisation découvert
  pendant la correction, plus le faux lien PDF signalé par le crawl.
- Commande de boucle désactivée avant import ; bornes entières et valides exigées.
- Décompte conforme à la métrique courante, y compris pour les partitions déjà
  enregistrées ; suivi du curseur respectant la réduction des animations.
- Validation commune des répertoires ZIP et des en-têtes locaux : tailles,
  chevauchements, chemins et commentaires contrôlés avant extraction.
  Le MSCZ source et son empreinte restent intacts.
- PDF accessible depuis la partition locale ; aucun lien vers un PDF fictif.
- Serveur Mac historique : origines liées au socket local, échéance absolue
  d’envoi de 30 secondes, verrou libéré et diagnostic local expurgé du jeton.
- 30 tests Node et 11 tests HTTP passent ; recettes complètes Chromium et WebKit
  sur la construction `baefded0afd663fc5988`. Voir [VALIDATION.md](docs/VALIDATION.md).

Le tag `v0.2.0` reste inchangé comme point de retour.

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
