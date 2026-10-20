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
une copie MSCX intermédiaire désactive cette nouvelle lecture des harmonies.
Le fichier original reste intact. L’exemple conserve ainsi les 3 015 notes de la
partie principale et les deux notes de la partie de percussions.

## Séparer gravure et lecture

Les SVG conservent la gravure web ; MIDI, tempos et positions guident la lecture.
Changer de vitesse ou d’instrument ne regrave pas la partition. Les glyphes de
l’exemple sont des tracés, pour éviter une dépendance aux polices musicales iOS.

## Stockage local explicite

IndexedDB conserve partitions et réglages. Cache Storage conserve l’application,
son moteur et les sons. Chaque appareil possède sa bibliothèque. Aucune
synchronisation ni conversion distante n’est introduite. Une copie du MSCZ peut
être réenregistrée dans Fichiers ; le stockage du navigateur n’est pas une sauvegarde.

## Installation et mises à jour

Une adresse HTTPS permet la première installation et la mise en cache complète.
Le Service Worker est lié à sa version, avec empreintes des ressources. Une mise
à jour n’interrompt pas automatiquement un morceau. Aucun nettoyage de cache
applicatif ne doit supprimer les données IndexedDB.

## Six choix d’instruments

Guitare, ukulélé et mandoline partagent le programme nylon. Les sons proviennent
maintenant de la banque distribuable MuseScore General Lite épinglée, sans lecture
de l’installation MuseScore du Mac. Leur rendu sonore peut différer de `v0.1.0`.

## Distribution

Le dépôt source exclut les ressources téléchargées et les partitions personnelles.
L’artefact statique est construit depuis une liste explicite et inclut les notices
tierces. Il ne publie ni les imports ni le lien privé de l’ancien serveur Mac.
La licence du code propre reste à décider avant distribution de paquets.
