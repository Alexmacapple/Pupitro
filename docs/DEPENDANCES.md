---
type: Concept
title: Dépendances et ressources
description: Versions épinglées de la version autonome et notices conservées.
sources:
  - resource: ../scripts/setup_assets.py
  - resource: ../package-lock.json
  - resource: ../reader/credits.html
---

# Dépendances

| Ressource | Version | Usage |
|---|---|---|
| webmscore | 0.22.0 | Gravure, PDF, MIDI et positions dans un worker |
| js-synthesizer | 1.13.0 | Interface JavaScript de synthèse |
| FluidSynth/WASM | 2.4.6 du paquet ci-dessus | Lecture du MIDI avec banque SF3 |
| @librescore/sf3 | 0.8.0, MuseScore General Lite | Six choix d’instruments |
| fflate | 0.8.2 | Copie locale du MSCZ avec barrés corrigés et images conservées |
| Playwright | 1.64.1, développement seulement | Recettes Chromium et WebKit |
| Python | 3.12 recommandé, développement seulement | Installation et construction statique |

`setup_assets.py --standalone` vérifie le SHA-256 de chaque archive, banque et
notice avant copie. Le fichier mémoire du moteur est exposé sous le nom attendu
par son entrée Emscripten brute, sans modification de ses octets. Aucune dépendance
n’est téléchargée pendant un import de partition après préparation hors ligne.

Les notices sont incluses dans l’artefact et accessibles par **Ressources et licences** :
GPL du moteur, notice de js-synthesizer, LGPL de FluidSynth, MIT de fflate et attributions de la
banque. La licence du code propre à Pupitro reste à choisir avant distribution de
paquets ; les notices tierces ne lui attribuent pas automatiquement une licence.

Sources : [webmscore](https://github.com/LibreScore/webmscore),
[js-synthesizer](https://github.com/jet2jet/js-synthesizer),
[banque et attributions](https://github.com/LibreScore/sf3),
[stockage WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/),
[installation Safari](https://support.apple.com/fr-fr/guide/iphone/iphea86e5236/ios).

Les anciens scripts de conversion native utilisent toujours MuseScore 2.3.2 et
PyMuPDF 1.28.0. Ils ne sont pas des dépendances du lecteur autonome.
