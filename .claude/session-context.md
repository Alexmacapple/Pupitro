# Reprise — Pupitro autonome

## Périmètre acquis

Import direct des MSCZ sur iPhone/iPad, installation Safari sans App Store et
lecture hors ligne sans Mac. Rendu web différent accepté si tout s’affiche bien.
Six instruments, métronome, décompte, curseur, boucle et commandes escamotables.
Pas d’édition, d’annotation, de synchronisation ni d’achat autorisé.
Le tag `v0.1.0`, vérifié sur GitHub au commit `a6ef304`, protège la version Mac.
Le tag `v0.2.0` repère le lecteur autonome avec confirmation utilisateur iPhone.

Lire [AGENTS.md](../AGENTS.md), [todo.md](../todo.md), puis
[VALIDATION.md](../docs/VALIDATION.md). Examiner Git avant toute reprise.

## Recettes indépendantes — 21 octobre 2026

Diff examiné : `605d781..daa2529`, build public `a211530ec3d09aedecdb`.
La documentation `12bb47f` ne change pas ce build. Fable 5.1 : 33/33 sur Chromium
et 33/33 sur WebKit ; rejeu du même script par Codex, dans un profil Chromium
distinct en premier plan : 32/32, code 0.
ShipGuard 2.16.1 : toutes phases exécutées, recettes 14/14 sur chaque moteur,
CLI 3/3 ; `run.json` indique des constats présents (`exit_code: 1`).

Aucun correctif de l’application appliqué. Deux défauts mesurés restent ouverts :
un titre composé d’espaces bloque l’export (renommer l’entrée permet l’export),
et le champ de nom reste visible dans la confirmation de suppression, qui fonctionne.
Les 38 constats statiques ne sont pas 38 bugs reproduits ; les deux signalements
sur les bilans après échec d’ouverture sont raisonnés. La politique d’erreur
ajout/restauration reste à arbitrer. Les trois fermetures Chromium en arrière-plan
restent inexpliquées ; les rejeux en premier plan passent.

Le MSCZ 2 synthétique Fable est refusé : les preuves MuseScore 2 réelles restent
historiques et distinctes. Aucun appareil physique ni écoute humaine dans ces recettes.
Rapports, captures et limites : [VALIDATION.md](../docs/VALIDATION.md) ; corrections
et arbitrages à suivre dans [todo.md](../todo.md). Les artefacts restent temporaires,
hors Git ; la session dédiée ShipGuard est fermée.

## Gestionnaire livré — 21 octobre 2026

L’utilisateur a demandé un petit gestionnaire et accepté explicitement la
sauvegarde/restauration complète. Le travail part de `605d781` ;
code `164848d`, complément de test `8b617b2` et documentation `9289f76`.
Ajout multiple, doublons explicites, renommage du catalogue, suppression confirmée,
base IndexedDB v2 et fichier `.pupitro` des originaux/noms/réglages sont implémentés.
La restauration n’ajoute que les absentes et garde les noms/réglages des présentes.
Les fichiers d’origine dans Fichiers restent intacts ; aucun quota de nombre.

38 tests Node et 11 HTTP passent. Les recettes du gestionnaire, la revue code-review
et le reçu PDV sont consignés dans [VALIDATION.md](../docs/VALIDATION.md).
Un défaut WebKit de source restaurée a conduit à matérialiser un Blob indépendant
depuis les octets vérifiés, au lieu de persister une File issue d’une tranche
de sauvegarde. Les tags historiques ne rétrogradent pas la base v2.
Cette nouvelle fonctionnalité n’est pas encore vérifiée sur les appareils physiques.
Le [workflow 39508075359](https://github.com/Alexmacapple/Pupitro/actions/runs/39508075359)
a déployé `9289f76`, construction `a211530ec3d09aedecdb` (31 ressources,
58 157 131 octets). Les empreintes publiques et les chemins privés en 404 sont
contrôlés. Mise à jour du profil Chromium existant : deux partitions et réglages
conservés, catalogue v2, lecture puis export/vérification de sauvegarde hors ligne.
Les recettes complètes du gestionnaire et du lecteur passent sur Chromium et WebKit.
Les tests et profils temporaires restent hors Git ; seul le serveur de recette
créé sur 8789 a été arrêté. Les anciens aperçus et données locales sont préservés.
Le workflow reste manuel ; vérifier Git pour la parité locale/distante à la reprise.

## Référence précédente — 20 octobre 2026

Après le tag `v0.2.0`, les corrections ShipGuard sont intégrées au code `68176e5` :
12 constats de code, dont un défaut de journalisation lié découvert pendant les
corrections, plus le faux lien PDF du crawl. Construction `baefded0afd663fc5988`,
30 ressources, 58 132 331 octets. `bash scripts/check.sh` passe : 30 tests Node,
11 tests HTTP et syntaxe. Les recettes complètes Chromium et WebKit passent
avec import local, PDF, lecture, instruments, boucle, hors ligne et redémarrage ;
aucun POST, appel externe ou erreur JavaScript dans les deux contextes.
Le CLI ShipGuard termine avec un code 0 : trois parcours mécaniques réussis,
deux pages et 13 ressources parcourues, aucun lien cassé.
Le serveur historique est testé avec un convertisseur simulé, sans nouvel essai
MuseScore natif. Les preuves et limites sont dans [VALIDATION.md](../docs/VALIDATION.md).
Les deux tags de retour restent inchangés. La confirmation physique iPhone porte
sur `v0.2.0`, avant ces correctifs ; l’iPad et les correctifs restent à tester physiquement.

### Références antérieures

La référence fonctionnelle de `v0.2.0` est `d14dbff` ; le commit publié `1ef5985` ajoute la
documentation sans changer le lecteur. Vérifier la parité locale et distante dans Git.
La construction testée porte `ef89840b97399c25f4b2` : 30 ressources, environ 58 Mo,
sans partition privée. Le moteur retenu est webmscore 0.22.0 ; 1.2.1 a échoué à
exporter les positions de l’exemple. L’exemple donne 13 pages au lieu de 7,
131 mesures, 916 événements de curseur et les deux parties d’origine.

Huit tests Node et les recettes complètes Chromium/WebKit sur Mac ont passé :
import, signal audio, six choix d’instruments, clic, boucle, souris/toucher,
réouverture et nouvel import hors ligne. Annulation après empreinte, ouvertures
concurrentes et partitions de silences sont couverts. La source de preuve détaillée
reste [VALIDATION.md](../docs/VALIDATION.md).

Le barré B♭ page 5 reprend la case 1 et les cordes du XML source ; 65 barrés ont
été contrôlés. Le MSCZ de travail complet préserve les images. À l’arrêt, un clic
sur une note démarre à cet endroit ; en lecture ou décompte, il met en pause sans
déplacement ; le clic suivant démarre depuis la note visée. Tests souris et toucher
passés, confirmation utilisateur de ces deux changements encore attendue.

L’aperçu Mac utilise `http://127.0.0.1:8770/`. L’onglet Chrome utilisateur a reçu
la mise à jour avec bibliothèque conservée ; les boutons lecture/pause y ont été
contrôlés, sans essai direct du clic sur note dans cet onglet. D’autres onglets
peuvent encore garder l’ancienne version. Réimporter le MSCZ après mise à jour
pour recalculer les pages et bénéficier de la correction du barré.

## Publication précédente ; fonctionnement iPhone confirmé

Le
[workflow 39503298679](https://github.com/Alexmacapple/Pupitro/actions/runs/39503298679)
a déployé `114e2e9` ; CI et déploiement réussis. Les 30 ressources HTTPS correspondent
à `baefded0afd663fc5988`, avec chemins privés en 404. Mise à jour du profil Chromium
de test par le bouton : deux entrées, sources, MIDI et manifestes conservés,
métriques récupérées sans réimport, lecture et réouverture hors ligne réussies.
Les corrections restent à vérifier physiquement sur iPhone et iPad.

### Première publication

L’utilisateur a explicitement autorisé l’activation et la publication GitHub Pages.
Le [workflow 39497476043](https://github.com/Alexmacapple/Pupitro/actions/runs/39497476043)
a déployé le commit `1ef5985` avec succès. L’adresse publique est
[https://alexmacapple.github.io/Pupitro/](https://alexmacapple.github.io/Pupitro/),
avec HTTPS imposé. Les 30 ressources correspondent aux empreintes de la construction
testée. Import, lecture, pause, rechargement et nouvel import sans réseau ont été
contrôlés sur Chrome Mac. Le contexte hors ligne a été fermé et le lecteur rouvert
normalement, avec la bibliothèque conservée. Les détails sont dans
[VALIDATION.md](../docs/VALIDATION.md).

Le workflow reste manuel : un push ne met pas l’app en ligne à jour. Après un
nouveau déploiement, ouvrir l’app avec Internet puis utiliser **Mettre à jour**
à l’arrêt. Les corrections de gravure demandent ensuite de réimporter le MSCZ.
[INSTALLATION.md](../docs/INSTALLATION.md) possède la procédure Safari et explique
la différence entre installation de l’app et import d’une partition, sans clonage.

L’utilisateur confirme que la version autonome fonctionne sur iPhone. Ce retour
général ne détaille pas les scénarios, notamment le mode avion et le nouvel import
hors ligne ; les versions système restent inconnues. La vérification iPad M4 reste
ouverte. Le précédent retour sur le son concernait `v0.1.0`. Android et les mises
à jour avec plusieurs fenêtres restent non testés.
Préserver partitions, preuves, anciens imports, lien privé et outils natifs du Mac.
Ne pas exposer le serveur Mac sur Internet ni publier de partition personnelle.
