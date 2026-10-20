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

## Code et preuves au 20 octobre 2026

La référence fonctionnelle reste `d14dbff` ; le commit publié `1ef5985` ajoute la
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

## Publication réalisée ; fonctionnement iPhone confirmé

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
