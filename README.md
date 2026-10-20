# Pupitro

**Vos partitions MuseScore 2, sur un pupitre de poche.**

Pupitro permet de consulter et d’écouter ses fichiers `.mscz` dans un navigateur,
avec un curseur de lecture, un métronome et le choix des instruments.
Sans passer par l’App Store ni souscrire un abonnement à l’application.

<!-- CAUSAL:BEGIN -->
## Pourquoi Pupitro ?

<!-- [FA] Besoin exprimé et essais rapportés par l’auteur. -->
Une partition préparée dans MuseScore 2 doit rester lisible sur un téléphone ou
une tablette. Les lecteurs essayés modifiaient son affichage : des lignes de
portée disparaissaient ou les notes se superposaient.

Le besoin est simple : **retrouver la partition telle qu’on l’a préparée et
pouvoir la travailler en l’écoutant**, sans l’éditer sur son téléphone.

## Garder le rendu d’origine

<!-- [IC] convert_score.py, prepare_reader.py, reader/app.js. -->
Pupitro fait préparer la partition par **MuseScore 2 installé sur le Mac**.
Le navigateur affiche les pages de son PDF ; il ne recalcule pas la gravure.
Le MIDI fournit la lecture, et les positions exportées par MuseScore 2 guident
le curseur. Le tempo et les sons peuvent ainsi changer sans déplacer les notes.

Le Mac prépare et sert les fichiers. Le téléphone ou la tablette ouvre le
lecteur sur le même Wi‑Fi. Les partitions restent sur ce Mac ; elles ne sont pas
envoyées vers un service de conversion externe.

## Ce que l’on peut faire

<!-- [IC] reader/index.html et reader/app.js. -->
- Ouvrir un fichier `.mscz` compatible avec MuseScore 2.
- Lire la partition, zoomer et suivre le curseur.
- Écouter, ralentir, avancer et répéter un passage par mesures.
- Activer le métronome et le décompte.
- Régler le volume, couper ou isoler une partie.
- Choisir percussion, guitare, ukulélé, mandoline, flûte ou accordéon.
- Masquer les commandes pour laisser davantage de place à la partition.

L’ukulélé et la mandoline utilisent le son de guitare nylon de cette banque.

## Ce qui reste à confirmer

<!-- [FA] Retour iPhone ; [IC] vérifications décrites dans docs/VALIDATION.md. -->
Pupitro est un **prototype local**. La lecture et l’import ont été vérifiés sur
Mac. L’ouverture sur iPhone est confirmée par un essai utilisateur, mais son
audio reste à confirmer après un ajustement du mode audio iOS. Les essais sur
iPad et Android restent à réaliser.

Le Mac doit rester allumé. Les fichiers MuseScore 3/4, l’édition de partitions,
le mode hors ligne et un hébergement public ne sont pas pris en charge.
<!-- CAUSAL:END -->

## Démarrer et poursuivre

- [Installer et lancer Pupitro](docs/INSTALLATION.md)
- [Comprendre les besoins et les limites](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md) et [décisions](docs/DECISIONS.md)
- [Vérifications et essais sur appareils](docs/VALIDATION.md)
- [Prochaines étapes](todo.md)
- [Reprendre le développement](AGENTS.md) · [Carte du code](CODEBASE_MAP.md)

Les partitions, exports, banques de sons et liens d’accès locaux sont exclus du
dépôt. Les ressources audio sont installées séparément depuis leur source
épinglée : voir [les dépendances](docs/DEPENDANCES.md).
