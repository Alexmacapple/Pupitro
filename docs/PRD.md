---
type: Concept
title: Besoin et périmètre de Pupitro
description: Contraintes retenues pour le lecteur et critères de réussite.
sources:
  - resource: ../reader/index.html
  - resource: ../reader/app.js
  - resource: ../convert_score.py
---

# Besoin et périmètre

## Pourquoi

Consulter et écouter des partitions déjà préparées dans MuseScore 2 sur un
iPhone et un iPad, sans changer leur mise en page. Le prototype répond au besoin
de lecture et de travail instrumental, sans édition de notation.

## Contraintes exprimées

- Navigateur Safari ou Chrome ; pas d’installation par l’App Store.
- Fichiers `.mscz` issus de MuseScore 2 ; priorité au rendu de cette version.
- Lecture, tempo, métronome, décompte, boucle et choix des instruments.
- Percussion, guitare, ukulélé, mandoline, flûte et accordéon suffisent.
- Commandes escamotables pour laisser davantage de place à la partition.
- Aucun achat ou abonnement sans accord préalable.
- Appareils visés : iPhone 12 Pro Max présumé et iPad M4. Versions système inconnues.

## Critères d’acceptation

| Critère | Preuve attendue |
|---|---|
| Rendu natif | Comparaison des pages avec le PDF exporté par MuseScore 2 |
| Import | MSCZ sélectionné depuis l’interface, sans toucher à l’original |
| Lecture | Audio entendu et curseur aligné sur chaque appareil visé |
| Travail | Tempo, clic et boucle vérifiés avec cette partition |
| Confort | Zoom et commandes ouvertes/masquées utilisables au tactile |
| Confidentialité | Pas de partition ni de lien local dans le dépôt public |

Le premier exemple a passé les comparaisons sur Mac ; la validation complète des
appareils reste ouverte dans [VALIDATION.md](VALIDATION.md).

## Limites actuelles

Le Mac prépare et sert la partition. Pas de conversion autonome sur le téléphone,
de mode hors ligne, d’annotation Pencil ou d’édition. Les MSCZ de versions 3/4 sont
refusés. Android est une compatibilité probable à tester, pas une promesse validée.

Limites du prototype : transfert 50 Mo, archive décompressée 200 Mo, 300 pages,
un import à la fois par instance de serveur, délais de conversion de deux minutes.
Un canal MIDI libre est nécessaire au clic ajouté.
