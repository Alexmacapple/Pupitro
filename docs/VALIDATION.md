---
type: Concept
title: Vérifications et limites connues
description: Preuves de la version autonome et essais physiques encore nécessaires.
sources:
  - resource: ../tests/browser.cjs
  - resource: ../tests/playback.test.js
  - resource: ../reader/import-worker.js
  - resource: ../scripts/build_web.py
---

# Vérifications — version autonome

Une partition personnelle MuseScore 2 sert d’exemple. Ni elle ni ses captures
ne sont publiées dans le dépôt ou l’artefact applicatif.

## Moteur retenu

| Contrôle | Observation |
|---|---|
| webmscore 1.2.1 | 12 pages ; export des segments en échec sur l’exemple |
| webmscore 0.22.0 | 13 pages, 131 mesures, 916 événements de curseur |
| Ancienne version native | 7 pages ; différence de pagination acceptée par l’utilisateur |
| Lecture originale | 3 015 notes dans la partie principale, 2 notes dans les percussions |
| Harmonies | Désactivation de la nouvelle synthèse des accords pour une source v2 |

Le changement de moteur entraîne un espacement différent. La présence des notes et portées
sur la première page a été inspectée ; le chargement des 13 pages a été contrôlé
successivement dans les navigateurs. Une inspection musicale exhaustive de tous
les symboles et de toutes les partitions n’a pas été réalisée.

## Essais exécutés sur ce Mac

| Scénario | Portée de la preuve |
|---|---|
| Tests Node ciblés | Tempos, MIDI tronqué, SysEx, reprises, coordonnées et capacité ZIP |
| Import depuis le bouton | Préparation sur le navigateur, données enregistrées dans IndexedDB |
| Lecture Chrome et WebKit | Compteur et signal audio ; aucune écoute humaine sur ces moteurs de test |
| Six instruments | Sélection de chaque programme avec signal audio |
| Métronome | Signal avec toutes les parties coupées |
| Boucle et vitesse | Retour réel dans la boucle 1–2 à 75 % |
| Commandes | Masquage et réapparition pendant la lecture |
| Hors ligne | Rechargement, puis import d’un second fichier local |
| Redémarrage | Fermeture du navigateur et réouverture avec réseau coupé |
| Fichier invalide | Refus avec partition précédente conservée |
| Réseau | Aucune requête POST et aucune requête HTTP vers un autre serveur pendant la recette |
| Construction | Liste explicite de ressources applicatives ; aucune partition copiée |

La recette finale doit confirmer ces résultats après les dernières modifications.
Le dépôt et la publication doivent encore être vérifiés séparément.

Le test de navigateur consomme `tests/browser.cjs`, avec un MSCZ donné en argument.
Le second fichier est une copie avec commentaire ZIP différent ; la musique est
inchangée, l’empreinte et l’entrée de bibliothèque sont distinctes.

FluidSynth écrit des messages sur ses fonctions de fichiers simulées et certains
événements MIDI ignorés ; ils ont coexisté avec un signal produit. Ils ne valent
pas validation de tous les contenus MIDI. Un stress forçant le décodage simultané
des grandes pages SVG a fermé un onglet Chromium ; le parcours successif a passé.
La mémoire et la consommation restent à mesurer sur les appareils physiques.

## Appareils physiques

| Appareil | Version autonome |
|---|---|
| iPhone | Installation, affichage, son et mode avion non encore confirmés |
| iPad M4 | Installation, affichage, son et mode avion non encore confirmés |
| Android | Non testé physiquement |

Les versions iOS/iPadOS et du navigateur restent inconnues. Le retour utilisateur
confirmant le son iPhone concernait `v0.1.0`, avec serveur Mac ; il ne valide pas
cette nouvelle version. WebKit de test sur Mac ne remplace pas Safari sur iPhone.

## Recette à mener sur chaque appareil

1. Installer depuis Safari, ouvrir l’icône et attendre la préparation hors ligne.
2. Importer un MSCZ et contrôler notes, portées, tablatures, textes et accords.
3. Écouter les six instruments, volume, coupure, solo, métronome et décompte.
4. Tester curseur, vitesse, boucle, zoom et commandes masquées.
5. Mode avion : fermer, rouvrir, lire puis importer un nouveau fichier local.
6. Vérifier les réglages après redémarrage et le retour après verrouillage.

Restent aussi non validés : stockage saturé réel, interruption système pendant une
transaction, mise à jour avec plusieurs fenêtres ouvertes et partitions complexes
différentes de l’exemple. Le stockage local n’est pas une sauvegarde ; garder les MSCZ.
