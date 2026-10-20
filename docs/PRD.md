---
type: Concept
title: Besoin et périmètre de Pupitro
description: Import autonome des MSCZ et lecture hors ligne sur iPhone et iPad.
sources:
  - resource: ../reader/index.html
  - resource: ../reader/app.js
  - resource: ../reader/import-score.js
---

# Besoin et périmètre

## Intention

Lire et écouter ses fichiers MuseScore sur iPhone et iPad sans App Store,
sans abonnement et sans dépendre d’un Mac allumé.

## Contraintes acquises

- Importer directement des `.mscz` natifs depuis Fichiers, même hors ligne.
- Conserver les fichiers et la bibliothèque sur l’appareil ; aucun envoi externe.
- Garder tempo, métronome, décompte, boucle, curseur, zoom et commandes escamotables.
- Démarrer depuis une note cliquée ou touchée ; pendant la lecture ou le décompte,
  le même geste met en pause, puis un nouveau clic démarre depuis la note visée.
- Six instruments : percussion, guitare, ukulélé, mandoline, flûte et accordéon.
- Installer l’app depuis Safari ; pas d’achat sans accord explicite.
- iPhone 12 Pro Max présumé et iPad M4 ; versions système encore inconnues.
- Accord utilisateur : un rendu web différent est accepté si tout s’affiche bien.

Cette dernière contrainte remplace l’exigence initiale de rendu strictement identique
à MuseScore 2. L’exemple compte 13 pages dans le moteur retenu, contre 7 auparavant.

## Critères d’acceptation

| Critère | Preuve attendue |
|---|---|
| Import autonome | Nouveau MSCZ préparé avec réseau coupé et Mac éteint |
| Affichage | Notes, portées, tablatures et textes présents sur chaque appareil |
| Lecture | Son entendu, instruments, clic, décompte et boucle utilisables |
| Curseur | Alignement et suivi des pages pendant la lecture |
| Lecture/pause au pointeur | Clic ou toucher sur une note pour lire, clic suivant pour mettre en pause ; espaces vides sans effet |
| Persistance | Bibliothèque et réglages retrouvés après fermeture et redémarrage |
| Installation | Icône Safari ouvrant l’app hors ligne sur chacun des deux appareils |
| Confidentialité | Aucun envoi des partitions ; aucune partition dans l’artefact public |

Les vérifications de navigateur et les essais physiques restent distincts dans
[VALIDATION.md](VALIDATION.md). La procédure et les conditions de publication sont
dans [INSTALLATION.md](INSTALLATION.md). Au 20 octobre 2026, la publication HTTPS
et la recette sur les deux appareils restent à mener.

## Limites

Pas d’édition, d’annotation Pencil ni de synchronisation entre appareils.
La bibliothèque utilise IndexedDB ; les ressources utilisent Cache Storage.
Le terme « local » ne promet pas une sauvegarde permanente : garder les originaux
dans Fichiers. La première installation et les mises à jour nécessitent Internet,
puis import, rendu et lecture doivent fonctionner sans Mac ni réseau.
Le moteur est épinglé : aucun engagement général sur les fichiers MuseScore 4.
Les fichiers trop lourds ou certains éléments de notation peuvent rester incompatibles.

Capacités contrôlées : fichier 50 Mo, archive décompressée 200 Mo, 300 pages,
SVG cumulés 100 Mo, import limité à deux minutes. Un canal MIDI libre est nécessaire
au métronome ; la piste ajoutée est bornée à 500 000 événements sur mobile.
