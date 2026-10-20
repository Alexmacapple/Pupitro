---
type: Concept
title: Décisions de conception de Pupitro
description: Arbitrages de la version autonome et référence de retour.
sources:
  - resource: ../reader/import-worker.js
  - resource: ../reader/library.js
  - resource: ../reader/sw.js
  - resource: ../scripts/build_web.py
---

# Décisions

## Autonomie et rendu web

L’utilisateur veut maintenant importer les MSCZ sur l’appareil et utiliser Pupitro
sans Mac. Après comparaison, il accepte une mise en page web différente sous réserve
que tous les éléments s’affichent correctement. La version native reste au tag `v0.1.0`.

Le moteur webmscore 1.2.1 produit 12 pages et échoue à exporter les positions de
segments sur le fichier d’essai. La version 0.22.0 produit 13 pages et 916 événements
de curseur exploitables. Elle est retenue et épinglée, sans mise à jour implicite.

## Préserver la musique de MuseScore 2

Le moteur plus récent ajoute par défaut une lecture automatique des symboles
d’accords, absente de l’ancien export. Pour les fichiers de version inférieure à 3,
le MSCX intermédiaire est adapté puis replacé dans une archive MSCZ de travail,
avec ses pièces jointes, pour désactiver cette nouvelle lecture des harmonies.
Le fichier original reste intact. L’exemple conserve ainsi les 3 015 notes de la
partie principale et les deux notes de la partie de percussions.

MuseScore 2 stocke la case du barré comme un entier. Le lecteur de compatibilité
de MuseScore 3 le réduit à un booléen et choisit le premier point : le B♭ signalé
page 5 passe ainsi de la case 1 à la case 3. La migration reprend cette case et
la première corde portant ce point depuis le XML source, après vérification de
l’identité du diagramme. Elle recharge une archive complète pour préserver les images.
Le test ciblé échoue avec l’ancienne conversion et passe avec la correction.
Références : [MuseScore 2](https://github.com/musescore/MuseScore/blob/v2.3.2/libmscore/fret.cpp),
[MuseScore 3](https://github.com/musescore/MuseScore/blob/v3.6.2/libmscore/fret.cpp).

## Séparer gravure et lecture

Les SVG conservent la gravure web ; MIDI, tempos et positions guident la lecture.
Changer de vitesse ou d’instrument ne regrave pas la partition. Les glyphes de
l’exemple sont des tracés, pour éviter une dépendance aux polices musicales iOS.

Un clic ou un toucher dans la portée démarre au segment musical le plus proche.
Les coordonnées viennent du moteur ; aucun élément SVG n’est interprété comme une
note. Pendant la lecture ou le décompte, le clic met en pause sans déplacer le
curseur ; le clic suivant reprend depuis la note visée. Hors de la portée, le clic
reste sans effet. Un départ depuis une note extérieure à la boucle active la
désactive pour permettre la lecture à l’endroit choisi ; une pause seule la conserve.

## Stockage local explicite

IndexedDB conserve partitions et réglages. Cache Storage conserve l’application,
son moteur et les sons. Chaque appareil possède sa bibliothèque. Aucune
synchronisation ni conversion distante n’est introduite. Une copie du MSCZ peut
être réenregistrée dans Fichiers ; le stockage du navigateur n’est pas une sauvegarde.
Le besoin exprimé comme « local storage » est donc satisfait par un stockage local
de fichiers dans IndexedDB, plutôt que par l’API textuelle `localStorage`.

## Gestionnaire et sauvegarde complète — 21 octobre 2026

L’utilisateur demande ajout, renommage et suppression ciblée, puis accepte aussi
la sauvegarde et la restauration complète. Le catalogue séparé évite de recopier
pages et MIDI pour afficher la liste ou renommer une entrée. Son nom affiché est
indépendant du titre gravé et du fichier source. La migration de base est atomique ;
aucune limite de nombre de partitions n’est ajoutée.

Un doublon est défini par l’empreinte du MSCZ original, pas par son nom. Le choix
d’ouvrir ou de repréparer est explicite. La suppression exige confirmation, attend
le commit de stockage puis arrête le lecteur si nécessaire. Les transactions
communes évitent les scores orphelins et les réglages ressuscités après suppression.

La sauvegarde locale transporte les originaux, noms et réglages, puis recrée les
exports au retour. Un format binaire encadré évite l’expansion Base64 et une nouvelle
dépendance ZIP. La taille des métadonnées décodées est bornée ; les originaux sont
vérifiés par le même propriétaire que l’import. Les bornes de boucle saisies mais
encore vides ou fractionnaires sont conservées : la validité de lecture appartient
à `loopBounds`, et ne doit pas empêcher une sauvegarde d’anciens réglages.

La restauration est additive : même contenu déjà présent signifie conservation
du nom et des réglages locaux. Chaque nouvelle entrée est atomique ; un lot
interrompu garde les ajouts terminés, avec un bilan explicite. La vérification
du fichier entier précède toute écriture. Les fichiers `.pupitro` peuvent être
transférés manuellement ; aucun compte ni synchronisation n’est introduit.

Le correctif conserve l’arrêt de restauration au premier échec de préparation,
avec fichier et bilan explicites. L’ajout multiple continue après une erreur
ordinaire de fichier. Harmoniser ces politiques reste une option à décider ;
la question posée n’autorise pas un changement sans réponse.

Titres et budget de sauvegarde ont un propriétaire commun : un titre blanc
reçoit un nom de repli ; le nom, le fichier et les réglages réellement conservés
doivent tenir ensemble dans le cadre de 1 Mio avant validation de l’écriture.

La version 2 de la base n’est pas rétrogradée par un retour Git au code d’un ancien
tag. Les tags historiques restent inchangés ; une sauvegarde externe est le moyen
de retrouver les originaux et leurs réglages après effacement des données du site.

## Installation et mises à jour

Une adresse HTTPS permet la première installation et la mise en cache complète.
Le Service Worker est lié à sa version, avec empreintes des ressources. Une mise
à jour n’interrompt pas automatiquement un morceau. Aucun nettoyage de cache
applicatif ne doit supprimer les données IndexedDB.
Cette séparation préserve la bibliothèque lors d’une mise à jour du lecteur.
Les pages déjà gravées ne sont pas recalculées automatiquement : après une correction
de gravure, l’utilisateur réimporte l’original. La réception de fichiers passe par
le sélecteur Fichiers ; la procédure iOS ne dépend pas de l’API Web Share Target.

## Six choix d’instruments

Guitare, ukulélé et mandoline partagent le programme nylon. Les sons proviennent
maintenant de la banque distribuable MuseScore General Lite épinglée, sans lecture
de l’installation MuseScore du Mac. Leur rendu sonore peut différer de `v0.1.0`.

## Distribution

Le dépôt source exclut les ressources téléchargées et les partitions personnelles.
L’artefact statique est construit depuis une liste explicite et inclut les notices
tierces. Il ne publie ni les imports ni le lien privé de l’ancien serveur Mac.
La liste autorisée ne prouve pas à elle seule la propriété d’un fichier existant.
Le constructeur vérifie donc aussi les sorties générées via un reçu d’empreintes
et conserve une sortie modifiée ou non vérifiable en refusant sa réutilisation.
GitHub Pages est la cible HTTPS préparée, avec un workflow déclenché manuellement.
L’activation et le premier déploiement ont été explicitement autorisés, puis réalisés
le 20 octobre 2026. Le code poussé ne déclenche pas automatiquement un déploiement
et la publication ne prouve pas l’installation. La procédure et l’état courant sont tenus dans
[INSTALLATION.md](INSTALLATION.md).
La licence du code propre reste à décider avant distribution de paquets.
