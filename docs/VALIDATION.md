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
| Huit tests Node ciblés | Tempos, MIDI tronqué, SysEx, reprises, coordonnées, sélection au pointeur, capacité ZIP, silences et annulation pendant le calcul SHA-256 |
| Import depuis le bouton | Préparation sur le navigateur, données enregistrées dans IndexedDB |
| Lecture Chrome et WebKit | Compteur et signal audio ; aucune écoute humaine sur ces moteurs de test |
| Six instruments | Sélection de chaque programme avec signal audio |
| Métronome | Signal avec toutes les parties coupées |
| Boucle et vitesse | Retour réel dans la boucle 1–2 à 75 % |
| Commandes | Masquage et réapparition pendant la lecture |
| Hors ligne | Rechargement, puis import d’un second fichier local |
| Redémarrage | Fermeture du navigateur et réouverture avec réseau coupé |
| Fichier invalide | Refus avec partition précédente conservée |
| Ouvertures rapides | Deux sélections avec achèvement IndexedDB retardé ; réglages, URL et dernière partition cohérents |
| Partition de silences | Moteur réel puis import WebKit hors ligne : 1 page, durée de 2 secondes, signal du métronome |
| Barrés v2 | Reproduction rouge avec l’ancienne migration, verte avec la correction ; 65 barrés contrôlés parmi 209 diagrammes après rechargement par le moteur |
| Images de notation | Archive conservée ; 4 images sur la page 5, comme dans le premier export, avec inspection visuelle Chrome et WebKit |
| Départ sur une note | Clic au tick 1 200 et toucher au tick 3 119, curseur déplacé et signal audio ; espace vide sans démarrage |
| Réseau | Aucune requête POST et aucune requête HTTP vers un autre serveur pendant la recette |
| Construction | Liste explicite de ressources applicatives ; aucune partition copiée |

Les recettes complètes Chromium et WebKit ont passé sur la construction
`4569f498f84de8a51da7` : 13 pages, les 2 parties d’origine, clic et toucher,
import hors ligne et redémarrage. Après ajout des contrôles de compte ZIP et
de taille de la copie intermédiaire, les huit tests et la migration réelle ont
repassé sur la construction `b8ab11dc702e9af7a4fc`. Aucun changement audio ajouté.
La construction contient 30 ressources et environ 58 Mo, sans partition personnelle.
La publication HTTPS reste à autoriser et vérifier.

Le test de navigateur consomme `tests/browser.cjs`, avec un MSCZ donné en argument.
Le second fichier est une copie avec commentaire ZIP différent ; la musique est
inchangée, l’empreinte et l’entrée de bibliothèque sont distinctes.

FluidSynth écrit des messages sur ses fonctions de fichiers simulées et certains
événements MIDI ignorés ; ils ont coexisté avec un signal produit. Ils ne valent
pas validation de tous les contenus MIDI. Un stress forçant le décodage simultané
des grandes pages SVG a fermé un onglet Chromium ; le parcours successif a passé.
La mémoire et la consommation restent à mesurer sur les appareils physiques.

Les 13 pages ont aussi été rendues séparément dans Chromium et WebKit, sans page
vide. Le signalement utilisateur concerne le barré du B♭ page 5 : la migration
plaçait la case 1 à la case 3. La correction a été inspectée avec le barré sur les
deux cordes de droite à la case 1 ; sa confirmation par l’utilisateur reste attendue.
La copie intermédiaire recharge maintenant les images de notation avec le MSCZ.

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
