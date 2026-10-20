---
type: Concept
title: Vérifications et limites connues
description: Preuves de la version autonome et essais physiques encore nécessaires.
sources:
  - resource: ../tests/browser.cjs
  - resource: ../tests/library.cjs
  - resource: ../tests/backup.test.js
  - resource: ../tests/playback.test.js
  - resource: ../reader/import-worker.js
  - resource: ../scripts/build_web.py
---

# Vérifications — version autonome

État documentaire au 21 octobre 2026 ; dernière référence du code testé : `8b617b2`.
Cette page consigne des preuves passées, sans annoncer une validation générale.

Une partition personnelle MuseScore 2 sert d’exemple. Ni elle ni ses captures
ne sont publiées dans le dépôt ou l’artefact applicatif.

## Gestionnaire et sauvegarde complète — 21 octobre 2026

Le changement part de `605d781` : gestionnaire `c7193f6`, corrections `164848d`
et complément de test `8b617b2`. Construction `a211530ec3d09aedecdb` :
31 ressources, 58 157 131 octets, sans partition personnelle.
`bash scripts/check.sh` passe avec 37 tests Node et 11 tests HTTP ; le complément
de test sans commentaire ZIP porte ensuite `npm test` à **38 tests Node réussis**.
Les tests HTTP du serveur historique utilisent toujours un convertisseur simulé.

Les recettes `tests/library.cjs` passent sur Chromium et WebKit Mac avec le moteur
réel, après téléchargement des ressources puis coupure du réseau :

| Parcours | Preuve |
|---|---|
| Existant v1 | Migration du catalogue, réglages et source conservés ; renommage sans modifier le titre gravé |
| Suppression | Annulation, suppression pendant un signal de métronome, lecteur vidé après commit ; erreur injectée et écriture tardive sans perte |
| Ajout | Deux petits MSCZ de musique différente préparés hors ligne ; ouvrir, repréparer ou annuler un doublon explicitement |
| Sauvegarde complète | Export, suppression puis restauration hors ligne ; originaux comparés octet par octet, noms et réglages identiques, lecture après retour |
| Restauration additive | Les noms et réglages des entrées présentes restent prioritaires ; confirmation annulée sans écriture |
| Échecs | Sauvegarde tronquée refusée avant écriture ; quota injecté à l’ajout et après des écritures en restauration : transaction annulée, bibliothèque conservée |
| Annulation tardive | Calcul d’empreinte et achèvement du catalogue retardés aux frontières système ; l’annulation n’ouvre plus d’aperçu ni n’ajoute de partition |
| Bibliothèque fournie | 75 entrées ; zéro lecture du magasin de fichiers pendant la liste ; pas de débordement horizontal mobile |
| Redémarrage | Fermeture complète du contexte, réouverture hors ligne ; 75 entrées, nom actif et réglages conservés |
| Réseau et erreurs | Aucun POST, appel externe ou `pageerror` sur les deux contextes de chaque recette |

Les 73 entrées supplémentaires partagent les petits exports de test et ont des
sources distinguées par leur commentaire ZIP ; ce ne sont pas 75 partitions
musicales indépendantes. Les fautes de stockage sont injectées à la frontière
IndexedDB, sans remplir réellement le disque. Les captures 428 × 926 et 1440 × 1000
ont été inspectées ; une largeur de bouton trop spécifique a été supprimée.

Un passage WebKit a montré deux originaux relus depuis IndexedDB contenant la
sauvegarde entière au lieu de leur tranche MSCZ. L’import matérialise maintenant
un Blob indépendant depuis les octets originaux vérifiés. Le passage final compare
aussi ces octets après rechargement. Les tests de transfert couvrent les archives
avec et sans commentaire ; le pic mémoire physique avec WASM n’est pas mesuré.

Artefacts locaux du gestionnaire : `pupitro-library-a4XmWC` (Chromium) et
`pupitro-library-eAcTwf` (WebKit), dans le dossier temporaire du système.
Ils ne sont pas publiés. Le lecteur musical complet passe sur Chromium et WebKit avec la
partition personnelle de 13 pages, deux parties, clic/toucher, PDF, six instruments,
boucle et redémarrage hors ligne (`pupitro-browser-PmwDxc` et
`pupitro-browser-Dal5JZ`). Aucun POST, appel externe ou `pageerror` ; les messages
de fonctions de fichiers simulées de FluidSynth restent présents.

### Publication et migration sur l’adresse HTTPS

Le [workflow 39508075359](https://github.com/Alexmacapple/Pupitro/actions/runs/39508075359)
déploie `9289f76` avec construction/tests CI et déploiement réussis.
Les 31 tailles et empreintes publiques correspondent à `a211530ec3d09aedecdb` ;
les types MIME JavaScript, WASM et manifeste sont corrects. Les trois chemins
privés contrôlés (référence, jeton et imports) renvoient 404.

Le profil Chromium isolé contenant deux partitions de 13 pages a reçu la mise
à jour par le bouton, depuis `baefded0afd663fc5988`. La base passe en version 2,
avec catalogue. Sources, MIDI, manifestes, titres et réglages sont identiques
immédiatement après migration. Lecture avec signal, réouverture hors ligne,
export puis vérification complète de cette sauvegarde hors ligne réussissent.
L’aperçu annonce zéro ajout et deux entrées conservées ; son annulation n’écrit
rien. Aucun POST, appel externe ou `pageerror`. Artefact local :
`pupitro-library-update-9Fs4OH` ; contrôle des empreintes dans
`/private/tmp/pupitro-library-public-verification.json`. Aucune partition publiée.
Les commits documentaires suivants ne changent pas les ressources applicatives.

### Standards

Revue indépendante du diff `605d781...c7193f6` : aucune violation documentaire dure.
Un jugement P3 sur l’annulation tardive est corrigé et son contre-exemple devient vert.
Aucun smell Fowler suffisamment étayé retenu.

### Spec

Revue indépendante de la demande approuvée : un P2 (anciennes bornes de boucle
vides ou fractionnaires bloquant l’export) et un P3 (même annulation tardive).
Les deux ont une correction et une régression vérifiée. Aucun élargissement
matériel du périmètre retenu ; sauvegarde/restauration explicitement acceptées.

### Reçu PDV

Diff et consommateurs directs inspectés, simplification recherchée : **GO**.
Le catalogue, les transactions et le snapshot appartiennent à `library.js`, le
format à `backup.js`, les opérations UI à `app.js`. La frontière d’import possède
les octets source indépendants ; le format reste compatible. Aucun module
n’approche 1 000 lignes. Cette revue structurelle est distincte des tests navigateur.
Les vérifications documentaires passent ; le signal « modifie » est le verbe présent,
pas un accent manquant. Les tags `v0.1.0` et `v0.2.0` restent inchangés.

**Portée physique :** ce nouveau gestionnaire et sa sauvegarde ne sont pas encore
vérifiés sur l’iPhone ni l’iPad. La confirmation générale iPhone antérieure reste
distincte ; l’écoute humaine, les versions système, le stockage presque plein,
les très grandes bibliothèques et les mises à jour multi-fenêtres restent ouverts.

## Corrections issues de ShipGuard après v0.2.0

Revue rapide en trois zones sur `a48de0e`, puis corrections demandées par
l’utilisateur : 11 constats initiaux, un défaut de journalisation lié découvert
pendant la correction et le faux lien PDF trouvé par le crawl. Les 12 constats
de code ont une correction et une preuve ; le lien PDF est contrôlé dans la recette.
Cette revue ciblée ne démontre pas l’absence de tout autre défaut.

| Point corrigé | Vérification |
|---|---|
| Boucle avant import et bornes invalides | Bouton désactivé dans le navigateur ; tests sans partition, fin excessive, fractions, reprises et dernière mesure |
| Décompte après changement de métrique | MIDI synthétique 4/4 puis 6/8 : six impulsions espacées de 0,25 seconde à tempo normal ; ancien enregistrement enrichi depuis son MIDI, sans réimport ni seconde piste de clic |
| Réduction des animations | Le suivi conserve le curseur et choisit un défilement immédiat pour `prefers-reduced-motion` |
| Archives et allocation | Fixtures stockées/déflatées, tailles locales et centrales, chevauchements, chemins ambigus, images et déclaration de capacité ; petits fichiers de test sans allocation de 200 Mo |
| Fin d’archive dans un commentaire | Faux EOCD simple ou avec bornes plausibles : le même parseur retient le vrai répertoire ; copie de travail bornée, source et empreinte originales préservées |
| Surveillance après redémarrage | Collecte attachée à chaque contexte et page ; erreur et POST synthétiques du second contexte font échouer l’assertion |
| PDF | Absence de faux lien initial ; après import, lien visible vers un Blob PDF local non vide |
| Ancien serveur Mac | 11 tests HTTP : écoute wildcard, autorité locale, refus des origines étrangères, en-têtes absents/dupliqués, jeton, corps partiel ou au compte-gouttes, échéance et réutilisation du verrou, réponses 404/408/409/413/422/500 et diagnostic expurgé |
| Construction | Import inutilisé retiré ; CI installant les ressources avant les tests, sans double lancement Node |

`bash scripts/check.sh` passe : syntaxe, **30 tests Node, 11 tests Python HTTP**
et construction de 30 ressources, 58 132 331 octets, version
`baefded0afd663fc5988`. Les tests HTTP utilisent un convertisseur simulé :
ils ne valident pas une nouvelle conversion par MuseScore 2 installé.

Les recettes complètes `tests/browser.cjs` passent sur Chromium et WebKit Mac,
avec le MSCZ personnel choisi localement : 13 pages, 2 parties, PDF, six
programmes avec signal audio, métronome, boucle 1–2 à 75 %, commandes masquées,
lecture/pause/reprise à la souris et au toucher, nouvel import hors ligne,
fichier invalide sans perte, redémarrage hors ligne et ouvertures concurrentes.
Aucun POST, appel HTTP externe ou `pageerror` n’est détecté dans les deux contextes.
Les messages de fonctions de fichiers simulées de FluidSynth restent présents.
La seconde entrée conserve la même musique avec un commentaire ZIP différent.

Le CLI ShipGuard 2.16.1 termine avec un code 0 : crawl de deux pages et de
13 ressources, aucun lien cassé, trois parcours mécaniques sur trois réussis
(accueil hors ligne, bibliothèque vide et installation, commandes masquées).
L’assertion de bibliothèque attend désormais la fin du chargement IndexedDB ;
le premier passage vérifiait son texte trop tôt. Aucun jugement visuel par modèle
n’est revendiqué pour ces parcours. La revue de code ci-dessus a été menée séparément.

Revue structurelle PDV du diff et des consommateurs directs : **GO**, aucun
bloqueur structurel relevé. Le parseur ZIP possède la frontière de validation ;
le parseur MIDI est partagé entre import et compatibilité des anciens manifestes.
Aucun fichier modifié n’approche 1 000 lignes. Ce verdict ne remplace ni les
tests ni une écoute humaine. Les tags `v0.1.0` et `v0.2.0` sont préservés.

La confirmation physique iPhone ci-dessous concerne `v0.2.0`, avant ces correctifs.
Les correctifs n’ont pas encore reçu de validation physique iPhone ou iPad.

Les correctifs ont été publiés par le
[workflow 39503298679](https://github.com/Alexmacapple/Pupitro/actions/runs/39503298679)
depuis `114e2e9`. Construction, tests CI et déploiement réussissent. Sur l’adresse
HTTPS `/Pupitro/`, les 30 tailles et empreintes correspondent à la construction
`baefded0afd663fc5988` ; les chemins privés de référence, jeton et imports renvoient 404.

Le profil Chromium isolé de la recette publique `v0.2.0` a ensuite été réutilisé.
Le bouton **Mettre à jour** bascule de `ef89840b97399c25f4b2` vers
`baefded0afd663fc5988`. Les deux entrées, octets MSCZ d’origine, MIDI et manifestes
enregistrés restent identiques ; l’ouverture récupère les sept métriques du MIDI
de l’exemple sans réimport. Lecture avec signal audio puis rechargement hors ligne
passent, sans POST, appel externe ou erreur JavaScript. Ce contrôle de mise à jour
concerne Chromium Mac ; les mises à jour physiques et à plusieurs fenêtres restent ouvertes.

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
Le retour utilisateur iPhone figure ci-dessous ; la recette détaillée et l’iPad
restent à vérifier.
La procédure est dans [INSTALLATION.md](INSTALLATION.md).

## Appareils physiques

| Appareil | Version autonome |
|---|---|
| iPhone 12 Pro Max présumé | Fonctionnement général de `v0.2.0` confirmé par l’utilisateur ; gestionnaire et sauvegarde non vérifiés physiquement |
| iPad M4 | Installation, affichage, son et mode avion non encore confirmés |
| Android | Non testé physiquement |

Le 20 octobre 2026, après publication et explication de l’installation, l’utilisateur
confirme que Pupitro fonctionne sur iPhone. Ce retour concerne la version autonome
repérée par `v0.2.0`, distincte du précédent retour sur le son de `v0.1.0`.
Il ne détaille pas chaque scénario : installation depuis l’icône, instruments,
mode avion, nouvel import hors ligne et persistance restent à renseigner séparément.
Les versions iOS/iPadOS et du navigateur restent inconnues. WebKit de test sur Mac
ne remplace pas Safari sur iPhone ; aucun résultat iPad n’a encore été rapporté.

## Recette à mener sur chaque appareil

1. Installer depuis Safari, ouvrir l’icône et attendre la préparation hors ligne.
2. Importer un MSCZ et contrôler notes, portées, tablatures, textes et accords.
3. Écouter les six instruments, volume, coupure, solo, métronome et décompte.
4. Tester curseur, vitesse, boucle, zoom et commandes masquées.
5. Mac éteint, mode avion et Wi-Fi coupé : fermer, rouvrir, lire puis importer un nouveau fichier local.
6. Vérifier les réglages après redémarrage et le retour après verrouillage.
7. Ajouter plusieurs MSCZ, traiter un doublon, renommer, puis annuler et confirmer
   la suppression de la partition ouverte ; retrouver les autres partitions.
8. Exporter une sauvegarde `.pupitro` hors des données du site, la restaurer
   et comparer les noms, réglages et originaux. Vérifier que les entrées déjà
   présentes gardent leur nom et leurs réglages.

| Résultat à consigner | iPhone | iPad M4 |
|---|---|---|
| Version système, navigateur et date | À relever | À relever |
| Fonctionnement général rapporté | Confirmé pour `v0.2.0` | À tester |
| Installation et indicateur prêt hors ligne | Non détaillé | À tester |
| Partition connue, pages et barrés | Non détaillé | À tester |
| Son entendu, instruments, métronome et décompte | Non détaillé | À tester |
| Lecture/pause au toucher, curseur, tempo et boucle | Non détaillé | À tester |
| Réouverture et nouvel import sans réseau ni Mac | Non détaillé | À tester |
| Réglages conservés et retour après verrouillage | Non détaillé | À tester |
| Ajout multiple, doublon, renommage et suppression active | À tester | À tester |
| Sauvegarde complète et restauration additive | À tester | À tester |

Restent aussi non validés : stockage saturé réel, interruption système pendant une
transaction, mise à jour avec plusieurs fenêtres ouvertes et partitions complexes
différentes de l’exemple. Le stockage local n’est pas une sauvegarde ; garder les MSCZ.
