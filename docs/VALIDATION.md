---
type: Concept
title: Vérifications et limites connues
description: Résultats observés, retours utilisateur et essais encore nécessaires.
sources:
  - resource: ../reader/app.js
  - resource: ../prepare_reader.py
  - resource: ../scripts/check.sh
---

# Vérifications — 20 octobre 2026

## Preuves de l’essai initial

Une partition personnelle a servi d’exemple ; elle et ses captures ne sont pas
publiées dans ce dépôt.

| Contrôle | Résultat et portée |
|---|---|
| Export CLI et PDF de l’interface MuseScore 2 | Sept pages identiques après rendu à 72 dpi |
| Import depuis le bouton, Mac et URL Wi‑Fi | Sept pages, deux parties, 916 positions de curseur |
| Images après import | Sept PNG identiques octet pour octet à la référence |
| Source MSCZ | Empreinte inchangée après les exports et imports testés |
| Chrome Mac | Lecture et signal audio détecté ; pause et reprise |
| Métronome Chrome Mac | Signal détecté avec les deux parties coupées |
| Boucle et vitesse | Boucle 1–2 à 75 %, puis curseur dans une boucle à 200 % |
| Curseur | Déplacement, pause, saut mesure 17/page 2 et zoom 150 % |
| Safari Mac | Chargement des pages et signal audio détecté |
| Affichage mobile simulé | Largeur 428 px, boutons espacés de 12 px |
| Bandeau des commandes | Centré et contenu dans le bandeau, ouvert/masqué, desktop et mobile simulé |
| Masquage pendant lecture | Compteur et curseur continuent ; réapparition des commandes |

La capture Safari Mac étant tronquée, son contrôle visuel reste incomplet.
Un signal détecté dans le graphe audio ne prouve pas qu’un téléphone émet du son.

## État des appareils physiques

| Appareil | État |
|---|---|
| iPhone | Ouverture du lecteur et son entendu confirmés par l’utilisateur le 20 octobre 2026 |
| iPad M4 | Essai physique non confirmé |
| Android | Non testé ; compatibilité supposée depuis les API utilisées |

Versions iOS, iPadOS et navigateur mobile : inconnues. Ne pas convertir cette
matrice en promesse de compatibilité tant que l’essai correspondant manque.

Le retour iPhone confirme le son entendu ; il ne valide pas encore l’ensemble
des commandes, des instruments et des scénarios de reprise ci-dessous.

## Recette à réaliser sur chaque appareil

1. Ouvrir un MSCZ depuis Fichiers et comparer notes et portées au PDF natif.
2. Toucher Écouter ; confirmer le son entendu et l’alignement du curseur.
3. Tester pause/reprise, vitesse, métronome, décompte et boucle.
4. Changer d’instrument et tester volume, coupure et solo.
5. Zoomer et masquer/réafficher les commandes pendant la lecture.
6. Noter les versions et le résultat après verrouillage ou changement d’onglet.

## Contrôles de développement

Migration vers le dossier définitif : serveur local et serveur Wi‑Fi relancés
depuis Pupitro, avec conservation du chemin d’accès local. Une installation
isolée, sans partition ni ressources préexistantes, a été exécutée : création de
l’environnement Python, installation de PyMuPDF épinglé, téléchargement et
vérification de l’archive audio, premier import via l’interface, sept pages,
puis lecture avec signal audio détecté. Ce scénario s’est déroulé sur ce Mac.

`bash scripts/check.sh` contrôle syntaxe et dépendances. Il ne remplace pas cette
recette ni une comparaison visuelle après un changement de conversion.
Les cas déjà refusés : archive invalide et fichier de version 3 ; message visible
prévu. Les chemins d’échec, temps limites et cas complexes de MIDI ne sont pas
couverts par une suite de régression automatique complète.
