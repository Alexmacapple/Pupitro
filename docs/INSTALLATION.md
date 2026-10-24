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

## État de publication au 21 octobre 2026

**Adresse d’installation : [https://alexmacapple.github.io/Pupitro/](https://alexmacapple.github.io/Pupitro/).**
GitHub Pages est activé avec HTTPS. Le premier déploiement a été explicitement
autorisé et a réussi ; les ressources, l’import et la réouverture sans réseau ont
été contrôlés sur Chrome Mac. L’utilisateur confirme que la version autonome
fonctionne sur iPhone ; la recette détaillée et la vérification iPad restent ouvertes.

Le gestionnaire et ses correctifs sont publiés depuis `d538720`, construction
`7385c59dd8c93f227bbd`, par le
[workflow 39518250725](https://github.com/Alexmacapple/Pupitro/actions/runs/39518250725).
Les 32 ressources HTTPS correspondent à la construction testée. La mise à jour
depuis `a211530ec3d09aedecdb` conserve exactement la partition, ses fichiers préparés
et ses réglages dans un profil Chromium isolé. Réouverture complète, nouvel import
et lecture avec signal passent hors ligne. Utiliser la procédure ci-dessous sur chaque appareil.
La confirmation physique iPhone concerne la première version `v0.2.0` ;
ce gestionnaire reste à vérifier physiquement sur iPhone et iPad.
Les preuves détaillées restent dans [VALIDATION.md](VALIDATION.md).

Pour recevoir les correctifs, ouvrir l’app avec Internet puis utiliser
**Mettre à jour** à l’arrêt. La mise à jour ne s’active pas pendant la lecture.
L’application contient 58 164 444 octets de ressources ; les partitions restent
séparées dans le stockage local. Les preuves et réserves figurent dans
[VALIDATION.md](VALIDATION.md).

Installer consiste à ouvrir cette adresse dans Safari et à ajouter Pupitro à
l’écran d’accueil. L’application télécharge ses ressources et les conserve localement.
Il n’y a aucun dépôt à cloner. Importer consiste ensuite à choisir un fichier
de partition `.mscz` dans Fichiers ; son traitement s’effectue sur l’appareil.

L’adresse `http://127.0.0.1:8770/` sert uniquement à l’aperçu sur le Mac.
L’ancienne adresse HTTP du Mac sur le Wi-Fi ne permet pas cette installation
hors ligne. Après préparation complète en HTTPS, le Mac et le même Wi-Fi ne sont
plus nécessaires pour importer, consulter ou écouter.

## Installer depuis Safari sur chaque appareil

Le fonctionnement sur iPhone est confirmé par l’utilisateur, sans détail des
scénarios ni version système. L’iPad M4 reste à vérifier. Relever les versions
iOS/iPadOS dans Réglages → Général → Informations pour compléter la recette.

1. Avec Internet, ouvrir l’adresse HTTPS vérifiée dans **Safari**.
2. Sur iPhone, ouvrir **Partager**, directement ou via le menu **Plus** selon
   la disposition de Safari. Sur iPad, ouvrir **Partager**, puis **En voir plus** si nécessaire.
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

## Gérer et sauvegarder la bibliothèque

Ouvrir **Bibliothèque**, puis **Ajouter des MSCZ** pour sélectionner un ou plusieurs
fichiers. Ils sont préparés l’un après l’autre sur l’appareil. Un fichier identique
est reconnu par son contenu : ouvrir la partition déjà enregistrée, la repréparer
explicitement ou annuler l’ajout. La repréparation conserve son nom et ses réglages.
Annuler un lot arrête la suite ; les partitions déjà ajoutées restent enregistrées.

**Renommer** change seulement le nom dans Pupitro. **Supprimer** demande une
confirmation et enlève cette partition et ses réglages de cet appareil ; si elle
est ouverte, la lecture s’arrête et le lecteur se vide. Le MSCZ dans Fichiers
reste intact. Le nombre de partitions n’est pas plafonné par Pupitro ; les limites
par fichier et l’espace disponible restent applicables. Un stockage insuffisant
arrête l’opération avec un message et conserve les partitions déjà enregistrées.

**Exporter la bibliothèque** prépare un fichier `.pupitro` à enregistrer dans
Fichiers. Il contient tous les MSCZ d’origine, leurs noms personnalisés, les réglages
par partition et la référence de la dernière partition ouverte. Les pages préparées
ne sont pas incluses : elles seront recréées par le moteur local lors de la restauration.
Conserver cette sauvegarde en dehors des données du site.

Un titre composé d’espaces reçoit désormais un nom de repli visible, sans modifier
le MSCZ d’origine. Le nom, le fichier et les réglages sont vérifiés ensemble avant
une écriture susceptible de dépasser la capacité de métadonnées de sauvegarde.

**Restaurer une sauvegarde** permet de choisir ce fichier, vérifier son contenu
puis confirmer les ajouts. Les partitions identiques déjà présentes gardent leurs
noms et leurs réglages ; seules les absentes sont ajoutées. Une annulation depuis
l’aperçu n’écrit rien. Pendant la restauration, annuler ou manquer d’espace conserve
les ajouts déjà terminés et la bibliothèque précédente ; le bilan donne leur nombre.

Ces opérations fonctionnent sans réseau une fois **Application prête hors ligne**
affiché, avec les fichiers disponibles localement. Pour transférer une bibliothèque
vers l’autre appareil, y rendre le fichier `.pupitro` disponible dans Fichiers,
puis le restaurer dans Pupitro. Ce transfert reste manuel.

## Lecture et pause sur la partition

Cliquer ou toucher près d’une note dans la portée démarre la lecture au segment
musical le plus proche. Pendant la lecture ou le décompte, ce geste met en pause
sans déplacer le curseur. Un nouveau clic reprend depuis la note visée.
Les espaces hors portée restent sans effet. Au démarrage depuis une note située
hors de la boucle active, cette boucle est désactivée ; une pause seule la conserve.

### Avec un clavier — sources mises à jour, site non déployé

**Espace** lance, met en pause ou reprend à la position courante. Pendant la
préparation ou le décompte, cette touche annule le départ. Le raccourci fonctionne
aussi avec les commandes masquées, lorsque le focus est hors d’un contrôle.

Les champs, boutons et dialogues gardent leur fonctionnement habituel : Espace
sur **Masquer les commandes** active ce bouton, et sur **Écouter** active la lecture
une seule fois. Aucun raccourci global pendant un import ou une restauration.
L’utilisateur confirme Espace sur Mac, sans précision de navigateur ni de version.
L’usage avec clavier physique Safari/iPad et VoiceOver reste à vérifier directement.

## Vérifier l’autonomie sur les deux appareils

1. Télécharger dans Fichiers une partition connue et un second MSCZ à importer.
2. Dans l’app installée, contrôler les pages de la première partition, dont les
   accords et barrés, puis écouter les instruments et le métronome.
3. Tester lecture/pause au toucher, décompte, tempo, curseur, boucle et commandes masquées.
4. Éteindre le Mac, activer le mode avion et vérifier que le Wi-Fi est coupé.
5. Fermer puis rouvrir Pupitro depuis son icône : retrouver la partition et l’écouter.
6. Importer le second MSCZ depuis Fichiers sans rétablir le réseau, puis le lire.
7. Dans Bibliothèque, renommer, annuler puis confirmer une suppression ; vérifier
   que le MSCZ d’origine est toujours dans Fichiers.
8. Exporter la bibliothèque, puis restaurer le fichier sur une bibliothèque vide
   ou sur l’autre appareil et comparer noms, réglages, pages et lecture.

Consigner le résultat pour chaque appareil dans [VALIDATION.md](VALIDATION.md).
L’absence de son ou d’une page laisse la recette ouverte ; les tests Mac ne la remplacent pas.

## Mettre à jour sans perdre la bibliothèque

Après publication d’une nouvelle version, avec Internet, fermer complètement puis
rouvrir Pupitro pour chercher une mise à jour. Sur un navigateur classique, recharger
l’onglet convient aussi. Attendre le téléchargement, arrêter la lecture, puis toucher
**Mettre à jour** si le bouton apparaît. Répéter sur chaque appareil. La bibliothèque
IndexedDB est conservée. Une autre fenêtre déjà ouverte peut garder l’ancien
lecteur jusqu’à son propre rechargement.

Cette version ajoute un catalogue dans la base IndexedDB (version 2). Fermer les
autres fenêtres Pupitro si la migration est bloquée. Les anciens tags restent des
références de code ; ils ne rétrogradent pas automatiquement cette base locale.

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

Recette du gestionnaire avec ses petites partitions de test, sur l’aperçu servi
par défaut en 8770 :

```sh
PUPITRO_TEST_URL=http://127.0.0.1:8770/ npm run test:library
PUPITRO_TEST_URL=http://127.0.0.1:8770/ PUPITRO_ENGINE=webkit npm run test:library
```

## Publication

Le workflow `Publier Pupitro` est manuel. Il construit et déploie uniquement
`web-dist/` sur GitHub Pages ; pousser un commit ne le déclenche pas. Pages est
déjà activé avec GitHub Actions. Pour publier une nouvelle version, exécuter ce
workflow sur `main`, attendre le succès, puis contrôler l’URL HTTPS, les ressources
sous `/Pupitro/`, le cache et un import local sans réseau. Les partitions et anciens
imports sont exclus. La mise à jour des appareils intervient après cette publication.

Le dépôt public peut utiliser GitHub Pages avec l’offre gratuite, selon la
[documentation officielle](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
Aucun achat ni abonnement n’est nécessaire dans cette configuration.

## Si le son manque

Toucher **Écouter**, vérifier le volume et la destination Bluetooth. Le mode audio
`playback` est demandé quand Safari le permet. La confirmation générale iPhone ne
détaille pas les essais audio ; les résultats précis sont dans [VALIDATION.md](VALIDATION.md).
L’ancienne version Mac reste accessible au tag `v0.1.0`.
