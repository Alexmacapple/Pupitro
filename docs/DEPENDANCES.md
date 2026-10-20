---
type: Concept
title: Dépendances et ressources locales
description: Versions utilisées, installation et limites de redistribution.
sources:
  - resource: ../requirements.txt
  - resource: ../scripts/setup_assets.py
  - resource: ../reader/app.js
---

# Dépendances

| Ressource | Version ou provenance | Usage |
|---|---|---|
| MuseScore 2 | 2.3.2 installé sur le Mac initial | Export PDF, MIDI, MPOS et SPOS |
| Python | 3.14 sur le Mac initial | Serveur et préparation |
| PyMuPDF | 1.28.0, épinglé | Rasterisation du PDF |
| js-synthesizer | 1.13.0, archive npm épinglée | Interface JavaScript de synthèse |
| FluidSynth/WASM | Bundle 2.4.6 avec libsndfile de cette archive | Lecture de la banque SF3 |
| MuseScore_General.sf3 | Installation locale MuseScore 2 | Timbres |

La commande `scripts/setup_assets.py` vérifie le SHA-256 de l’archive avant
d’extraire uniquement les ressources attendues. Les fichiers de licence de
js-synthesizer et FluidSynth sont conservés avec les ressources locales.

La banque de sons, les binaires de MuseScore et les partitions ne sont pas
distribués dans le dépôt. Installer MuseScore reste à la charge de l’utilisateur.
La licence du code propre à Pupitro reste à choisir ; aucune licence tierce ne
lui est attribuée automatiquement. Avant un paquet public, vérifier également
les obligations de toutes les dépendances et ressources redistribuées.

Sources techniques : [js-synthesizer](https://github.com/jet2jet/js-synthesizer),
[export des positions MuseScore 2](https://github.com/musescore/MuseScore/blob/v2.3.2/mscore/savePositions.cpp),
[mode audio WebKit sur iPhone](https://bugs.webkit.org/show_bug.cgi?id=237322#c6).
