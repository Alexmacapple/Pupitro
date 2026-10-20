---
type: Concept
title: Installer Pupitro autonome
description: Installation depuis Safari et construction de l’application statique.
sources:
  - resource: ../reader/manifest.webmanifest
  - resource: ../reader/offline.js
  - resource: ../scripts/setup_assets.py
  - resource: ../scripts/build_web.py
---

# Installer Pupitro

## État de publication au 20 octobre 2026

Les sources sont sur `main`, mais GitHub Pages n’est pas activé et le premier
déploiement public n’est pas encore autorisé. L’adresse prévue est
`https://alexmacapple.github.io/Pupitro/` ; elle ne doit pas encore être présentée
comme disponible. La publication doit être contrôlée avant l’installation.

L’adresse `http://127.0.0.1:8770/` sert uniquement à l’aperçu sur le Mac.
L’ancienne adresse HTTP du Mac sur le Wi-Fi ne permet pas cette installation
hors ligne. Après préparation complète en HTTPS, le Mac et le même Wi-Fi ne sont
plus nécessaires pour importer, consulter ou écouter.

## Installer depuis Safari sur chaque appareil

Cette procédure sera utilisable après la publication. L’iPhone 12 Pro Max présumé
et l’iPad M4 n’ont pas encore été testés avec la version autonome ; relever leurs
versions iOS/iPadOS dans Réglages → Général → Informations avant la recette.

1. Avec Internet, ouvrir l’adresse HTTPS vérifiée dans **Safari**.
2. Sur iPhone, ouvrir **Partager**, directement ou via le menu **Plus** selon
   la disposition de Safari. Sur iPad, ouvrir **Partager**, puis **Plus** si nécessaire.
3. Choisir **Sur l’écran d’accueil**, activer **Ouvrir comme app web** si proposé,
   puis **Ajouter**. Si l’action manque, vérifier **Modifier les actions**.
4. Ouvrir **Pupitro depuis sa nouvelle icône**, puis attendre
   **Application prête hors ligne** avant de couper le réseau.
5. Toucher **Ouvrir un fichier .mscz** et choisir un MSCZ disponible dans **Fichiers**.
6. Attendre **partition enregistrée sur cet appareil**, puis toucher **Écouter**.

La disposition des menus dépend du système installé. Procédures officielles :
[Safari sur iPhone](https://support.apple.com/fr-fr/guide/iphone/iphea86e5236/ios),
[Safari sur iPad](https://support.apple.com/fr-fr/guide/ipad/ipad8f1f7a29/ipados).

Les ressources applicatives représentent environ **58 Mo**, hors partitions
(**56 Mo** affichés par l’indicateur, qui calcule en Mio). Un fichier uniquement
présent dans iCloud doit avoir été téléchargé dans Fichiers avant de couper le réseau.
L’icône et la bibliothèque sont propres à chaque appareil : répéter l’installation
et les imports sur l’iPhone et l’iPad. Importer depuis l’app installée pour retrouver
les partitions dans cette app ; aucun compte MuseScore n’est nécessaire.

Le bouton **Enregistrer le MSCZ dans Fichiers** conserve une copie de l’original.
L’effacement des données du site ou de l’app peut effacer sa bibliothèque.

## Lecture et pause sur la partition

Cliquer ou toucher près d’une note dans la portée démarre la lecture au segment
musical le plus proche. Pendant la lecture ou le décompte, ce geste met en pause
sans déplacer le curseur. Un nouveau clic reprend depuis la note visée.
Les espaces hors portée restent sans effet. Au démarrage depuis une note située
hors de la boucle active, cette boucle est désactivée ; une pause seule la conserve.

## Vérifier l’autonomie sur les deux appareils

1. Télécharger dans Fichiers une partition connue et un second MSCZ à importer.
2. Dans l’app installée, contrôler les pages de la première partition, dont les
   accords et barrés, puis écouter les instruments et le métronome.
3. Tester lecture/pause au toucher, décompte, tempo, curseur, boucle et commandes masquées.
4. Éteindre le Mac, activer le mode avion et vérifier que le Wi-Fi est coupé.
5. Fermer puis rouvrir Pupitro depuis son icône : retrouver la partition et l’écouter.
6. Importer le second MSCZ depuis Fichiers sans rétablir le réseau, puis le lire.

Consigner le résultat pour chaque appareil dans [VALIDATION.md](VALIDATION.md).
L’absence de son ou d’une page laisse la recette ouverte ; les tests Mac ne la remplacent pas.

## Mettre à jour sans perdre la bibliothèque

Avec le réseau rétabli, recharger l’app pour chercher une version, arrêter la
lecture, puis toucher **Mettre à jour** si le bouton apparaît. La bibliothèque
IndexedDB est conservée. Une autre fenêtre déjà ouverte peut garder l’ancien
lecteur jusqu’à son propre rechargement.

Une correction des commandes ne demande pas de réimport. Une correction du rendu
(par exemple le barré B♭) demande de **réimporter le MSCZ d’origine après la mise
à jour** pour recalculer les pages. Les pages déjà stockées ne sont pas reconverties
automatiquement. Ne pas effacer les données du site pour forcer une mise à jour.

## Android

Installation proposée par le menu Chrome. Le fonctionnement sur un appareil Android
physique reste à vérifier ; les essais desktop ne constituent pas cette validation.

## Construire et vérifier depuis les sources

Prérequis de développement : Python 3.12 recommandé, Node.js 22 ou supérieur.
Aucune installation de MuseScore ni dépendance Python tierce n’est requise pour
construire l’application autonome. Aucun de ces outils n’est requis sur le téléphone.

```sh
npm ci --ignore-scripts
python3 scripts/setup_assets.py --standalone
bash scripts/check.sh
bash scripts/serve-web.sh
```

Ouvrir <http://127.0.0.1:8770/> sur le poste de développement. `localhost` permet
de tester les Service Workers ; cette exception ne s’étend pas au HTTP du réseau local.
`scripts/build_web.py` produit seulement `web-dist/`.
La première commande d’installation des ressources les télécharge à leurs versions
épinglées et vérifie leurs empreintes ; aucun fichier utilisateur n’est transmis.

Recette avec une partition privée :

```sh
npx playwright install chromium webkit
npm run test:browser -- /chemin/exemple.mscz
PUPITRO_ENGINE=webkit npm run test:browser -- /chemin/exemple.mscz
```

## Publication

Le workflow `Publier Pupitro` est manuel. Il construit et déploie uniquement
`web-dist/` sur GitHub Pages ; pousser un commit ne le déclenche pas. Après accord
sur la première publication, activer Pages avec GitHub Actions puis exécuter ce
workflow. Contrôler l’URL finale en HTTPS, les ressources sous `/Pupitro/`, le cache
et un import local sans réseau. Les partitions et anciens imports sont exclus.

Le dépôt public peut utiliser GitHub Pages avec l’offre gratuite, selon la
[documentation officielle](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
Aucun achat ni abonnement n’est nécessaire dans cette configuration.

## Si le son manque

Toucher **Écouter**, vérifier le volume et la destination Bluetooth. Le mode audio
`playback` est demandé quand Safari le permet. L’écoute physique est encore à valider
pour cette nouvelle version. L’ancienne version Mac reste accessible au tag `v0.1.0`.
