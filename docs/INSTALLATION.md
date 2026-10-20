---
type: Concept
title: Installer et lancer Pupitro
description: Démarrage sur Mac et accès depuis un navigateur mobile.
sources:
  - resource: ../requirements.txt
  - resource: ../scripts/setup_assets.py
  - resource: ../scripts/serve-local.sh
  - resource: ../serve_reader.py
---

# Installer et lancer

## Prérequis

- Un Mac avec MuseScore **2.3.2** installé dans `/Applications/MuseScore 2.app`.
- Python 3 ; l’environnement initial utilise Python 3.14 et PyMuPDF 1.28.0.
- Un navigateur et des fichiers compatibles avec MuseScore 2.
- Node.js uniquement pour le contrôle de syntaxe JavaScript de `scripts/check.sh`.

MuseScore 2 n’est ni téléchargé ni remplacé par Pupitro.

## Depuis un nouveau clone

```sh
git clone git@github.com:Alexmacapple/Pupitro.git
cd Pupitro
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/setup_assets.py
bash scripts/check.sh
bash scripts/serve-local.sh
```

Ouvrir <http://127.0.0.1:8765/> sur le Mac, puis **Ouvrir un fichier .mscz**.
L’installation audio télécharge une archive npm épinglée et copie la banque de
sons de MuseScore 2 déjà installée. Elle n’envoie aucune partition.

## Sur le réseau Wi‑Fi

Les appareils doivent pouvoir communiquer sur le même réseau local.

```sh
ipconfig getifaddr en0
bash scripts/serve-local.sh --host ADRESSE_IPV4_DU_MAC --port 8766
```

Remplacer l’adresse par celle affichée par la première commande. Le serveur
imprime un lien à ouvrir dans Safari ou Chrome sur les appareils. Ce lien donne
accès aux partitions préparées à toute personne du réseau qui le possède.
Le garder privé. Le serveur est HTTP local et n’est pas conçu pour Internet.

Le Mac et ce terminal doivent rester actifs. Arrêter avec **Ctrl+C**.
L’adresse peut changer avec le réseau ; `.access-token` conserve le chemin privé.

## Utilisation

1. Choisir un `.mscz` avec le bouton du haut ; sur mobile, utiliser Fichiers.
2. Attendre sa préparation par le Mac, puis toucher **Écouter**.
3. Régler vitesse, boucle, métronome et instruments selon le besoin.
4. Masquer les commandes pour agrandir la zone de lecture.

Le fichier original n’est pas réenregistré. Une copie et les exports sont
conservés dans `imports/` et `reader/scores/` ; aucun nettoyage automatique.

## Si le son manque sur iPhone

Recharger la page et toucher **Écouter**. Vérifier le volume et la destination
Bluetooth. Tester le mode sonnerie avec l’interrupteur latéral sans orange.
Le mode audio `playback` est demandé quand le navigateur le permet ; l’essai
physique reste nécessaire. Voir [la validation](VALIDATION.md).
