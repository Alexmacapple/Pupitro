---
type: Concept
title: Architecture de Pupitro
description: Conversion native sur Mac et lecteur léger dans le navigateur.
sources:
  - resource: ../serve_reader.py
  - resource: ../convert_score.py
  - resource: ../prepare_reader.py
  - resource: ../reader/app.js
---

# Architecture

```mermaid
flowchart LR
  A[Navigateur mobile] -->|MSCZ sélectionné| B[Serveur Python sur Mac]
  B --> C[MuseScore 2 installé]
  C --> D[PDF, MIDI, MPOS, SPOS]
  D --> E[Préparation des pages et positions]
  E -->|Images, MIDI et manifeste| A
  F[Banque de sons locale] --> A
```

## Répartition

- `serve_reader.py` sert uniquement `reader/`, contrôle le lien réseau local et
  reçoit `POST api/import`. Un verrou limite les imports simultanés par instance.
- `convert_score.py` valide l’archive, conserve une copie, lance MuseScore 2 avec
  un profil isolé et conserve le journal. Il arrête son groupe de processus si
  l’export natif dépasse le délai prévu.
- `prepare_reader.py` rasterise le PDF en PNG à 2,5 pixels par point, ajoute une
  piste de clic au MIDI et produit le manifeste du lecteur.
- `scripts/setup_assets.py` met en place les ressources partagées, avec une archive
  épinglée et vérifiée. Ces ressources ne sont pas recopiées par import.
- `reader/app.js` charge les images et synthétise le MIDI avec FluidSynth/WASM.
  Le tick du MIDI pilote le curseur ; le changement de vitesse ne déplace pas
  la gravure.

## Contrats utiles

Le manifeste contient les pages, canaux, tempos, événements de mesures et
`cursorEvents`. Les coordonnées sont des fractions de page. La conversion
MPOS/SPOS utilise la même résolution 160 que la commande native.

Les URL du manifeste restent relatives au lecteur, y compris sous le chemin
privé du serveur Wi‑Fi. Le nom de fichier n’est pas utilisé comme chemin disque.

## Compromis

- Images : rendu stable, mais pas de redistribution des systèmes selon la largeur
  du téléphone et résolution de zoom finie.
- Synthèse MIDI : instruments réglables, mais rendu sonore non garanti identique
  à l’écoute de MuseScore sur tous les navigateurs.
- Serveur HTTP standard : installation simple, mais pas de comptes ni de
  protection adaptée à une exposition Internet.
- ScriptProcessor : fonctionnement sur HTTP local, coût et comportement mobile
  à mesurer avant toute évolution AudioWorklet/HTTPS.

Le parent `readerDock` mesure sa hauteur réelle, boutons compris. Cette mesure
sert au défilement du curseur et à l’espace réservé en bas de la partition.
