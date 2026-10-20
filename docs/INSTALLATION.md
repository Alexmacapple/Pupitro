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

## Sur iPhone et iPad

L’adresse HTTPS publique sera fournie après autorisation et vérification de la
publication. L’ancienne adresse HTTP du Mac ne permet pas de préparer ce mode hors ligne.

1. Ouvrir l’adresse HTTPS dans Safari, avec une connexion Internet.
2. Partager → **Sur l’écran d’accueil**. Activer **Ouvrir comme app web** si proposé.
3. Ouvrir Pupitro depuis sa nouvelle icône et attendre **Application prête hors ligne**.
4. Toucher **Ouvrir un fichier .mscz**, puis choisir un fichier disponible dans Fichiers.
5. Attendre **partition enregistrée sur cet appareil**, puis toucher **Écouter**.
6. Activer le mode avion, fermer puis rouvrir l’app, et essayer aussi un nouvel import.

Les ressources applicatives représentent environ 58 Mo, hors partitions. Un fichier
uniquement présent dans iCloud doit avoir été téléchargé dans Fichiers avant de
couper le réseau. Les bibliothèques des deux appareils sont indépendantes.
Importer les fichiers depuis l’app installée pour les retrouver dans cette app.

Le bouton **Enregistrer le MSCZ dans Fichiers** conserve une copie de l’original.
L’effacement des données du site ou de l’app peut effacer sa bibliothèque.

Cliquer ou toucher une note démarre la lecture à cet endroit. En cours de lecture,
le clic met en pause ; un nouveau clic reprend depuis la note visée. Une sélection
hors de la boucle active la désactive au redémarrage. Les espaces hors portée
restent sans effet.

Après une correction du rendu, recharger l’app puis utiliser **Mettre à jour**
si le bouton apparaît. Réimporter ensuite le MSCZ pour recalculer ses pages ;
les partitions déjà enregistrées ne sont pas reconverties automatiquement.

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
de tester les Service Workers. `scripts/build_web.py` produit seulement `web-dist/`.
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
`web-dist/` sur GitHub Pages. L’activation et le premier déploiement restent à
autoriser ; aucun serveur Mac n’est exposé sur Internet.

## Si le son manque

Toucher **Écouter**, vérifier le volume et la destination Bluetooth. Le mode audio
`playback` est demandé quand Safari le permet. L’écoute physique est encore à valider
pour cette nouvelle version. L’ancienne version Mac reste accessible au tag `v0.1.0`.
