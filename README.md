# Pupitro

**Vos partitions MuseScore, à lire et à écouter sur votre appareil, même hors ligne.**

<!-- CAUSAL:START -->
## Pourquoi Pupitro ?

<!-- [FA] Besoin utilisateur et accord sur le rendu web dans docs/PRD.md. -->
Travailler une partition sur iPhone ou iPad ne devrait pas imposer un ordinateur
allumé, un abonnement ou une installation par l’App Store. Pupitro prépare les
fichiers `.mscz` dans le navigateur et les conserve sur l’appareil.

<!-- [IC] reader/import-worker.js, reader/library.js et reader/sw.js. -->
Une fois l’application installée et ses ressources téléchargées, vous pouvez
ouvrir un MSCZ depuis Fichiers, lire et écouter la partition sans réseau ni Mac.
Les fichiers ne sont envoyés à aucun serveur. Chaque appareil possède sa propre
bibliothèque ; il n’y a pas de synchronisation automatique.

## Pour travailler la musique

- Lecture, pause, vitesse, déplacement et boucle par mesures.
- Lecture et pause par clic ou toucher sur une note ; reprise depuis la note visée.
- Métronome, décompte et curseur qui suit la partition.
- Volume, coupure et solo par partie.
- Percussion, guitare, ukulélé, mandoline, flûte et accordéon.
- Zoom et commandes escamotables pour libérer l’affichage.
- Bibliothèque locale : ajout multiple de MSCZ, renommage et suppression confirmée.
- Sauvegarde et restauration de toute la bibliothèque, noms et réglages compris.
- Réglages conservés et export du MSCZ d’origine.

L’ukulélé et la mandoline partagent ici le timbre de guitare nylon.

## Le rendu et les limites

<!-- [FA] Accord explicite sur un rendu web différent, sous réserve d’affichage correct. -->
Le moteur web peut changer l’espacement et la pagination de MuseScore 2.
La partition d’essai compte ainsi **13 pages au lieu de 7**. Ce compromis permet
l’import autonome ; le rendu strictement identique n’est plus promis.

<!-- [IC] Preuves et portée dans docs/VALIDATION.md. -->
Le fonctionnement de la version autonome sur iPhone est confirmé par l’utilisateur.
La recette détaillée, notamment le mode avion, et la vérification sur iPad restent
ouvertes. Les essais Chrome et WebKit sur Mac ont leur propre portée de preuve.
Le nouveau gestionnaire et l’aller-retour de sauvegarde sont testés sur ces moteurs ;
leur vérification physique sur iPhone et iPad reste à faire.

Gardez vos MSCZ d’origine dans Fichiers : effacer les données du site peut
effacer la bibliothèque. Exportez aussi une sauvegarde `.pupitro` dans Fichiers ;
sa restauration ajoute les partitions absentes et préserve celles déjà présentes.
Le nombre de partitions n’a pas de plafond applicatif ; la capacité réelle de
l’appareil et les protections par fichier restent applicables.
Une adresse HTTPS et une première connexion sont
nécessaires à l’installation. Pas d’édition, d’annotation Pencil ni d’abonnement.
<!-- CAUSAL:END -->

## Installer ou développer

**Ouvrir Pupitro : [alexmacapple.github.io/Pupitro](https://alexmacapple.github.io/Pupitro/).**
La version autonome est publiée en HTTPS depuis le 20 octobre 2026. Installation
depuis Safari, puis import des MSCZ dans l’app : aucun clonage du dépôt n’est requis.
Les contrôles sur le site publié ont passé sur Chrome Mac. La version autonome est
repérée dans sa première version par le tag [v0.2.0](https://github.com/Alexmacapple/Pupitro/tree/v0.2.0) ;
le fonctionnement iPhone est confirmé, celui de l’iPad reste à confirmer.
Les correctifs ultérieurs et leurs preuves figurent dans
[l’historique](CHANGELOG.md) et [la validation](docs/VALIDATION.md).

- [Installation sur iPhone et iPad](docs/INSTALLATION.md)
- [Vérifications et limites](docs/VALIDATION.md)
- [Besoin et critères de réussite](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md) et [décisions](docs/DECISIONS.md)
- [Dépendances et notices](docs/DEPENDANCES.md)
- [Prochaines étapes](todo.md), [consignes](AGENTS.md) et [carte du code](CODEBASE_MAP.md)

Le code est versionné ici ; les partitions et ressources installées restent
exclues du dépôt source. La publication statique utilise une liste explicite
de fichiers applicatifs et ne contient aucune partition.

La version avec conversion sur Mac reste disponible au tag
[v0.1.0](https://github.com/Alexmacapple/Pupitro/tree/v0.1.0).
