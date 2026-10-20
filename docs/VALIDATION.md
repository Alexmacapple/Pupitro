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

État documentaire au 20 octobre 2026 ; référence du code testé : `d14dbff`.
Cette page consigne des preuves passées, sans annoncer une validation générale.

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
| Lecture/pause sur une note | Souris en 1440 × 1000 puis toucher en 428 × 926 : démarrage, pause avec tick stable et signal coupé, reprise depuis la note visée |
| Réseau | Aucune requête POST et aucune requête HTTP vers un autre serveur pendant la recette |
| Construction | Liste explicite de ressources applicatives ; aucune partition copiée |
| Mise à jour dans Chrome utilisateur | Nouveau lecteur activé, bibliothèque conservée ; lecture et pause par le bouton contrôlées |

Les recettes complètes Chromium et WebKit ont passé sur la construction
`ef89840b97399c25f4b2` : 13 pages, les 2 parties d’origine, lecture/pause et
reprise par clic et toucher, import hors ligne et redémarrage. Les huit tests
Node et la construction passent aussi. Le test de pause échoue sur la version
précédente : le bouton reste « Pause » et la lecture continue après le clic.
La construction contient 30 ressources et environ 58 Mo, sans partition personnelle.
La publication HTTPS est vérifiée ci-dessous. Les changements documentaires
n’affectent pas cette construction et ne constituent pas une nouvelle recette du code.

L’onglet Chrome de l’utilisateur affichait encore une version antérieure. La
mise à jour y a été activée ; démarrage et pause par le bouton ont été contrôlés.
Ce contrôle reste distinct du test automatisé du clic sur les notes.

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
Une mise à jour du lecteur seule ne remplace pas les anciennes pages dans la
bibliothèque utilisateur ; le fichier d’origine doit être réimporté.

## Publication et installation

Le premier déploiement a été explicitement autorisé par l’utilisateur, puis exécuté
par le [workflow GitHub Actions](https://github.com/Alexmacapple/Pupitro/actions/runs/39497476043)
sur le commit source `1ef5985`. Les étapes de construction et de déploiement ont réussi.
L’API confirme Pages en mode `workflow`, avec HTTPS imposé et l’adresse
[https://alexmacapple.github.io/Pupitro/](https://alexmacapple.github.io/Pupitro/).

| Contrôle du site public sur Chrome Mac | Observation |
|---|---|
| Chemin `/Pupitro/` et ressources | 30 fichiers ; 58 126 848 octets ; toutes les tailles et empreintes SHA-256 identiques à la construction locale `ef89840b97399c25f4b2` |
| Types servis | JavaScript, manifeste et WASM avec les types attendus |
| Fichiers privés | Les routes de la partition de référence, du jeton et des imports renvoient 404 ; aucune partition dans la liste publique |
| Cache et import initial | Indicateur prêt hors ligne ; 13 pages et 2 parties enregistrées après choix du MSCZ local |
| Lecture et pause | Compteur actif, signal audio détecté, puis pause par le bouton |
| Réouverture sans réseau | Mode Offline de DevTools actif pour cet onglet ; partition et ressources retrouvées au rechargement |
| Nouvel import sans réseau | Copie avec commentaire ZIP distinct : moteur servi par le Service Worker, nouvelle empreinte et 13 pages enregistrées |
| Réouverture après le test | Nouvel onglet normal avec partition conservée ; lecture et signal audio contrôlés |

Le contexte de test hors ligne a été fermé après contrôle. Le second fichier
contient la même musique avec une empreinte distincte ; ce n’est pas une seconde
partition musicalement indépendante. La lecture du nouvel import a été contrôlée
après réouverture d’un onglet normal ; aucune nouvelle écoute humaine n’est revendiquée.
L’installation Safari et l’écoute sur les appareils physiques restent non vérifiées.
La procédure est dans [INSTALLATION.md](INSTALLATION.md).

## Appareils physiques

| Appareil | Version autonome |
|---|---|
| iPhone 12 Pro Max présumé | Installation, affichage, son et mode avion non encore confirmés |
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
5. Mac éteint, mode avion et Wi-Fi coupé : fermer, rouvrir, lire puis importer un nouveau fichier local.
6. Vérifier les réglages après redémarrage et le retour après verrouillage.

| Résultat à consigner | iPhone | iPad M4 |
|---|---|---|
| Version système, navigateur et date | À relever | À relever |
| Installation et indicateur prêt hors ligne | À tester | À tester |
| Partition connue, pages et barrés | À tester | À tester |
| Son entendu, instruments, métronome et décompte | À tester | À tester |
| Lecture/pause au toucher, curseur, tempo et boucle | À tester | À tester |
| Réouverture et nouvel import sans réseau ni Mac | À tester | À tester |
| Réglages conservés et retour après verrouillage | À tester | À tester |

Restent aussi non validés : stockage saturé réel, interruption système pendant une
transaction, mise à jour avec plusieurs fenêtres ouvertes et partitions complexes
différentes de l’exemple. Le stockage local n’est pas une sauvegarde ; garder les MSCZ.
