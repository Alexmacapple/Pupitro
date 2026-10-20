---
type: Concept
title: Décisions de conception de Pupitro
description: Raisons des choix qui doivent être préservés lors des évolutions.
sources:
  - resource: ../convert_score.py
  - resource: ../prepare_reader.py
  - resource: ../reader/app.js
  - resource: ../reader/style.css
---

# Décisions de conception

## 1. MuseScore 2 reste le moteur de gravure

Les essais de lecteurs web ont montré des pertes de lignes ou des notes mal
affichées. Le besoin est la fidélité à MuseScore 2, pas une migration vers un
nouveau moteur. Le PDF natif exporté sur Mac est donc la référence visuelle.
Coût accepté : le Mac reste nécessaire et le PDF devient une image à l’affichage.

## 2. Séparer la gravure et la lecture

Les images conservent la partition ; le MIDI fournit tempo, boucles et sons.
Les SPOS natifs fournissent les positions du curseur. Cette séparation évite de
regraver la partition lorsque le son ou la vitesse change.

## 3. Servir sur le réseau local

L’utilisateur veut un navigateur, sans App Store. Le serveur Mac donne accès aux
appareils du même Wi‑Fi. Un chemin imprévisible limite l’accès fortuit ; il ne
remplace pas une authentification pour un service public. Aucun port du routeur
n’est ouvert et aucune partition n’est envoyée à un service tiers.

## 4. Six choix d’instruments, sans promettre six échantillonnages

La banque installée avec MuseScore 2 est réutilisée. Guitare, ukulélé et mandoline
partagent son programme nylon. Flûte, accordéon et percussion ont leurs programmes
propres. Ce comportement est indiqué dans l’interface.

## 5. Un seul propriétaire pour la hauteur des commandes

Le bouton flottant initial recouvrait les notes. Il a été intégré dans un bandeau
centré, au bord supérieur des commandes. `readerDock` mesure toute la zone, y
compris lorsqu’elle est réduite. Le curseur ne réinterprète pas sa hauteur.

## 6. Code public, données et ressources installées séparément

Le dépôt accueille le code et les documents. MSCZ, exports, captures, lien local
et banque de sons sont ignorés. L’archive de synthèse est téléchargée à sa version
épinglée lors de l’installation ; la banque provient du MuseScore 2 de l’utilisateur.
La politique de licence du code propre et une éventuelle distribution publique
de ressources restent à décider avant une publication de paquets.
