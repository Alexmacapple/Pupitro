---
type: Concept
title: Vérifications et limites connues
description: Preuves de la version autonome et essais physiques encore nécessaires.
sources:
  - resource: ../tests/browser.cjs
  - resource: ../tests/keyboard.cjs
  - resource: ../tests/library.cjs
  - resource: ../tests/library-recovery.cjs
  - resource: ../tests/test_build_web.py
  - resource: ../tests/backup.test.js
  - resource: ../tests/playback.test.js
  - resource: ../reader/import-worker.js
  - resource: ../scripts/build_web.py
---

# Vérifications — version autonome

Historique publié au 21 octobre 2026. Le correctif courant, issu de `8bb6a2f`,
est publié depuis `d538720` ; les références de chaque campagne sont distinguées ci-dessous.
Cette page consigne des preuves passées, sans annoncer une validation générale.

Une partition personnelle MuseScore 2 sert d’exemple. Ni elle ni ses captures
ne sont publiées dans le dépôt ou l’artefact applicatif.

## Raccourci Espace — sources du 24 octobre 2026, non déployées

Trace : [issue #1](https://github.com/Alexmacapple/Pupitro/issues/1), étude et revue
préalable dans [l’étude](ETUDE-LECTURE-ESPACE.md). Le déploiement du site reste
une opération distincte, non réalisée ici.
Construction locale : `6a6f747015111dd5e017`, servie uniquement sur localhost.

- `bash scripts/check.sh` : 23 tests Python, 41 tests Node, syntaxe et construction
  réussis. Ressources déjà présentes ; aucune installation de dépendance.
- `PUPITRO_TEST_URL=http://127.0.0.1:8796/ npm run test:keyboard` : Chromium réussi.
- Même commande avec `PUPITRO_ENGINE=webkit` : WebKit réussi.
- Recette sur MSCZ synthétique de 16 mesures : signal audio réel produit, pause
  et reprise sans remise à zéro, annulation de préparation et de décompte,
  répétitions sans défilement, boutons natifs sans double action, champs, cases,
  sélecteurs, curseurs, lien, six dialogues, composition et modificateurs.
- Import ralenti et notification IndexedDB de restauration retardée par injection
  de test : aucun départ par Espace. La restauration est testée avec bouton encore
  actif, dialogue fermé et focus hors contrôle pour exercer la garde `restoring`.
- Commandes masquées : lecture possible hors bouton ; activation native si le
  bouton de masquage possède explicitement le focus. WebKit ne focalise pas
  nécessairement un bouton lors d’un clic souris, hypothèse corrigée dans la recette.
- La mesure initiale de défilement Chromium était perturbée par la mise en page
  après focalisation du réglage ; mesure reprise depuis une position stabilisée.

Recette finale : fin réelle du morceau, bouton **Réécouter**, puis Espace.
Sur Chromium et WebKit, position finale `30720`, position affichée immédiatement après
redémarrage encore `30720`, puis `81` à la prochaine actualisation. `play()`
change le libellé avant que `poll()` actualise le curseur : le dernier échec
venait d’une lecture immédiate du champ, pas d’un départ audio à la mauvaise
position. Le test attend désormais la condition observable, sans délai arbitraire.
La recette vérifie aussi la boucle au clavier et les événements de perte de focus
et de visibilité simulés pendant un appui.

Preuves temporaires initiales : `pupitro-keyboard-pJYeYM` (Chromium),
`pupitro-keyboard-vyC9GG` (WebKit) ; recettes finales :
`pupitro-keyboard-K96afE` (Chromium) et `pupitro-keyboard-pH5VGZ` (WebKit),
dans le répertoire temporaire système.
Chaque recette conserve une capture et le MSCZ synthétique ; profils de test fermés
et retirés par la recette. Les partitions personnelles ne sont pas utilisées.

Retour utilisateur du 24 octobre : « espace fonctionne » sur Mac. Navigateur,
adresse et version non précisés ; ce retour ne prouve pas la publication de cet
ajout ni la recette complète de fin de morceau.

Limites : événements clavier automatisés sur moteurs Mac ; clavier physique
Safari/iPad et VoiceOver non vérifiés directement. Signal mesuré, sans écoute humaine.
Aucun verrou manuel de touche ajouté ; les répétitions utilisent `event.repeat`.
La recette clavier bloque le Service Worker pour contrôler le chargement audio ;
le hors ligne relève de la recette existante `test:browser`, exécutée séparément.

`test:browser` réussi sur Chromium et WebKit avec le même MSCZ synthétique :
clic et toucher sur les notes, six timbres avec signal, boucle, nouvel import
hors ligne, redémarrage hors ligne et ouvertures concurrentes. Aucun POST,
aucune requête externe ni erreur JavaScript inattendue. Dossiers temporaires :
`pupitro-browser-toxRcn` et `pupitro-browser-1hirfE` respectivement.

Auto-vérification PDG et PDV, pas une revue indépendante de l’implémentation :
diff, contrôles HTML et transport inspectés. Le gestionnaire reste dans `app.js`
et appelle `play()` ; aucune nouvelle machine d’état, persistance, abstraction,
dépendance ou modification de `playback.js`. Verdict structurel : **GO local**.
La revue Fable précédente portait uniquement sur le cadrage.

## Correctifs après recettes — publiés le 21 octobre 2026

Construction publiée : `7385c59dd8c93f227bbd`, 32 ressources,
58 164 444 octets. Le [workflow 39518250725](https://github.com/Alexmacapple/Pupitro/actions/runs/39518250725)
a construit, testé et déployé `d538720` avec succès. Les 32 tailles et empreintes
HTTPS correspondent à la construction locale ; les types JavaScript, WASM et
manifeste sont vérifiés. Les trois chemins privés contrôlés renvoient 404.
Reçu local : `public-verification.json` dans le dossier de correction ci-dessous.

Un profil Chromium isolé préparé avant publication reçoit la mise à jour depuis
`a211530ec3d09aedecdb`. L’ancienne version reste active pendant la lecture ;
la tentative de mise à jour est refusée jusqu’à la pause, puis le clic explicite
active la nouvelle version. Catalogue, source, PDF, MIDI, pages et réglages sont
comparés exactement et conservés. Relance complète hors ligne, nouvel import
de MSCZ synthétique et lecture avec signal mesuré passent ; contextes fermés,
aucune erreur de page ni requête externe observée. Ce n’est pas une écoute humaine.
Reçus : `result.json` et `16-offline-audio.json` dans
`/private/tmp/pupitro-public-update-20261021.2je82876/`.

Les deux défauts initiaux sont aussi rejoués sur le site public : un MSCZ dont
`workTitle` contient trois espaces affiche « Visible » et produit une sauvegarde
de 1 249 octets ; nom, SHA-256 et original sont vérifiés indépendamment dans le
fichier téléchargé. En confirmation de suppression, le champ Nom est invisible,
sans dimensions ni textbox exposé ; annuler préserve la partition et ses octets.
Manifeste inchangé, aucune erreur et contexte fermé. Reçu : `public-result.json`
dans `/private/tmp/pupitro-public-original-defects-20261021.gw5wi3/`.

Titres et budget de sauvegarde sont partagés par l’import, le catalogue et le
format `.pupitro`. Les réglages conservés sont vérifiés avant commit, y compris
lors d’une repréparation. Les autres changements portent sur le champ masqué en
suppression, les bilans, la récupération IndexedDB, les téléchargements, les
états occupés et les sorties vérifiables du constructeur.

| Campagne | Résultat observé et portée |
|---|---|
| Gestionnaire renforcé, `f26b29840edc0e48d215` | `tests/library.cjs` passe sur Chromium et WebKit : octets/noms/réglages, restauration mixte, rollback, 75 entrées et liste sans lecture des fichiers |
| Lecteur complet, `f26b29840edc0e48d215` | Recette Chromium passée ; ne remplace pas les essais finaux de la source courante |
| Récupération, `9d3d8af8d718bed53f4f` | Dix cas ciblés Chromium : connexion perdue simulée, commit/annulation, nom excessif, état occupé, faible hauteur, focus et vue corrompue |
| PDV, `c9a92abf3377c4793737` | Deux P2 reproduits : budget sans réglages conservés et Service Worker modifié écrasé ; corrections ensuite apportées aux deux frontières, avec régressions dédiées |
| Gate local, `7385c59dd8c93f227bbd` | `scripts/check.sh` passe : 23 tests Python, dont 12 builder et 11 serveur historique, puis 41 tests Node |
| Navigateurs, `7385c59dd8c93f227bbd` | Gestionnaire et récupération passent sur Chromium et WebKit ; lecteur complet WebKit passé. Gestionnaire WebKit : 75 entrées, aucune lecture des fichiers pendant la liste, aucune erreur de page, aucun POST ni requête externe observée. Le lecteur complet Chromium reste la preuve de `f26b29840edc0e48d215` |
| Récupération WebKit, `7385c59dd8c93f227bbd` | Rejeu passé après correction de la fixture pour réutiliser le buffer initial. Le premier échec d’attente du doublon provenait d’un ZIP régénéré avec des octets et un identifiant différents ; aucun défaut produit conclu de cet échec |
| Bouton lecture/pause, `7385c59dd8c93f227bbd` | 11 états par moteur : Écouter désactivé à vide, Annuler pendant préparation/décompte, Pause en lecture, Écouter après pause, Réécouter à la fin ; clavier/souris et signal mesuré passent |

La restauration conserve l’arrêt au premier échec de préparation, avec fichier,
ajouts terminés et entrées non ajoutées dans le bilan. L’ajout multiple continue
après une erreur ordinaire. Harmoniser ces règles reste un choix utilisateur
en attente, pas un changement appliqué implicitement.

### Triage des 46 entrées de l’audit ShipGuard

Le corpus original comporte 38 entrées actives et huit non vérifiées, pas
46 bogues reproduits. « Corrigé localement » désigne un changement de code ou de
test correspondant, désormais publié ; seuls les parcours exécutés constituent une preuve runtime.
Les identifiants regroupés ci-dessous couvrent les 46 entrées : 43 traitées dans
le code ou les tests, deux non retenues comme changement à imposer et une limite
non vérifiée exhaustivement.

| Identifiants | Traitement et source |
|---|---|
| `r1-z01-002`, `r1-z01-005`, `r1-z01-006` | Corrigés localement : titres, identifiant actif et budget ; `score-metadata.js`, `library.js`, `backup.js`, tests backup/récupération |
| `r1-z01-004`, `r1-z01-007`, `r1-z01-019` | Corrigés localement : connexion, abandon après commit et identité d’une vue en échec ; bibliothèque, lecteur et recette récupération |
| `r1-z01-001`, `r1-z01-008`, `r1-z01-009`, `r1-z01-014`, `r1-z01-015`, `r1-z01-016`, `r1-z01-017`, `r1-z01-021` | Corrigés localement : annulation/bilans, état occupé, temporisation des réglages, persistance, message après commit et sémantique de liste ; `app.js` |
| `r1-z01-010`, `r1-z01-011`, `r1-z01-012`, `r1-z01-013` | Corrigés localement : catalogue léger, ouverture unique, sauvegarde dans l’état occupé et URL sans expiration arbitraire ; `app.js`, `library.js` |
| `r1-z01-020`, `r1-z01-023` | Corrigés localement : rôle du signal audio et réduction des transitions ; HTML/CSS |
| `r1-z01-022` | Non retenu comme défaut : couleurs littérales hors variables ne prouvent pas une erreur ; contraste du champ et du signal vérifié séparément |
| `r1-z01-003` | Non retenu comme changement à imposer : arrêt au premier échec conservé ; nouvelle politique en attente de choix utilisateur |
| `r1-z01-018` | Corrigé localement : démarrage sur la dernière partition disponible quand l’identifiant demandé est absent ; changement relu dans `app.js` |
| `r1-z02-017`, `r1-z02-018`, `r1-z02-019`, `r1-z02-020`, `r1-z02-021`, `r1-z02-022` | Corrigés localement : sorties distinctes, manifeste contrôlé, empreintes, liens symboliques, repère de version et liste publique ; builder/tests Python |
| `r1-z02-001`, `r1-z02-002`, `r1-z02-003`, `r1-z02-004`, `r1-z02-005`, `r1-z02-008`, `r1-z02-009`, `r1-z02-010`, `r1-z02-013` | Tests renforcés : réglages préexistants, restauration mixte, rollback des réglages, identité, annulation, lectures réelles, retards et décodage indépendant |
| `r1-z02-006`, `r1-z02-007`, `r1-z02-011`, `r1-z02-014`, `r1-z02-015`, `r1-z02-016` | Recettes corrigées : port/URL, profils temporaires, nettoyage, erreur finale contrôlée et éléments inutilisés retirés |
| `r1-z02-012` | Limite non vérifiée exhaustivement : l’observation Playwright WebKit ne garantit pas les requêtes des Service Workers ; les totaux décrivent ce que l’outil voit |
| `r1-z02-023` | Corrigé localement : MIDI fictif de repli retiré ; absence de MIDI préparé signalée explicitement |

### Campagne AY11 et reprises ciblées

Sur `f26b29840edc0e48d215`, les agents ont exercé les 18 voies CLI disponibles,
plus le point `candidate-static` sans variante : neuf états du lecteur et la page
des notices. Les 469 appels statiques/projections, 144 projections visuelles et
27 compléments CSS ne sont pas des totaux de critères réussis. Le plan comporte
106 critères/258 tests ; aucune conformité n’en est déduite. Le préaudit natif
fournit 55 preuves et 24 constats candidats. Les plafonds, formulaires fermés,
changements d’état par les sondes et CSS non résolu restent explicitement limités.
Les labels implicites valides et petites cibles avec exception d’espacement ne
sont pas transformés automatiquement en défauts.

Les trois défauts mesurés de focus/message et celui des commandes en faible
hauteur ont reçu une correction. Le rejeu ciblé sur `c9a92abf3377c4793737`
vérifie quatre contrôles par moteur et 13 arrêts clavier à 320 × 256, défilement
et masquage compris, sans erreur de page ni trafic externe observé. Le complément
`7385c59dd8c93f227bbd` vérifie les étiquettes de deux parties, noms/rôles,
références de labels et descriptions des deux pages ; le signal audio donne
des contrastes de 5,53:1 au repos et 4,65:1 actif. Les 20 labels ont un contrôle
associé, sans identifiant dupliqué ; les 13 arrêts clavier restent visibles en
320 × 256. La campagne complète n’a pas été rejouée sur chaque correctif.

Reçus des dernières recettes : `pupitro-library-f3BWuU` (Chromium),
`pupitro-library-3hfZTH` (WebKit), `pupitro-recovery-71vDQH` (Chromium),
`pupitro-recovery-KfoaWq` (WebKit) et `pupitro-browser-Feco4s` (WebKit),
dans le dossier temporaire du système. Les contextes sont fermés ; les nouveaux
profils sont supprimés par défaut après fermeture, les preuves sont conservées.

Artefacts locaux : `/private/tmp/pupitro-corrections-20261021.JvUWTT/`
(`ay11-coverage/COVERAGE-AY11.md`, `ay11-coverage/coverage-summary.json`, `ay11-interactions/`
et `pdv-review.md`), `/private/tmp/pupitro-ay11-ui-20261021.XHbgEc/`
et `/private/tmp/pupitro-ay11-labels-20261021.RXET48/`. Le corpus ShipGuard original
reste dans `/private/tmp/pupitro-recette-20261021.buFM9S/shipguard/visual-tests/_results/`.
Ces fichiers temporaires ne sont pas des ressources publiques.

**Toujours non vérifié :** iPhone/iPad/Android physiques, lecteur d’écran humain,
écoute humaine, saturation réelle et mises à jour multi-fenêtres. L’inventaire
média HTML ne couvre pas exhaustivement la synthèse MIDI WebAudio. Les fenêtres
temporelles sans candidat ne prouvent pas une absence générale de comportement.

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

### Défaut historique publié : titre composé d’espaces

Le candidat ShipGuard `r1-z01-002` est reproduit sur l’adresse publique, construction
`a211530ec3d09aedecdb`, avec Chromium Mac et un MSCZ synthétique valide dont
`workTitle` contient trois espaces. L’import réussit, mais le titre du lecteur
contient ces trois espaces et **Exporter la bibliothèque** échoue avec
« La sauvegarde Pupitro est invalide ou incomplète. » La bibliothèque est conservée.

Contournement vérifié : dans **Bibliothèque**, renommer cette entrée en
**Titre renseigné**, puis relancer l’export. Un fichier `.pupitro` de 1 264 octets
est alors téléchargé. Le produit était resté inchangé pendant cette recette ;
la correction est incluse dans la publication `7385c59dd8c93f227bbd` décrite plus haut.
Preuves locales : `blank-title-result.json` et `check-blank-title.cjs`, dans
`/private/tmp/pupitro-recette-20261021.buFM9S/`.

### Recettes indépendantes — 21 octobre 2026

Périmètre : diff `605d781..daa2529` et site public de construction
`a211530ec3d09aedecdb`. Les changements documentaires de `12bb47f` ne modifient
pas cette construction. Aucun correctif de l’application n’a été appliqué pendant ces recettes.

| Contrôle | Résultat et portée |
|---|---|
| Fable 5.1 | 32 scénarios et un contrôle complémentaire du dock : **33/33 sur Chromium, 33/33 sur WebKit**, avec inspection des captures |
| ShipGuard 2.16.1, parcours | **14/14 scénarios sur chaque moteur** ; CLI **3/3** ; crawl de 2 pages et 13 ressources, aucun lien cassé |
| ShipGuard, code | Deux agents Opus réels ; **38 constats statiques actifs** (0 critique ou haut, 7 moyens, 31 bas), plus 8 affirmations d’absence non vérifiées ; ce ne sont pas 38 bugs reproduits |
| ShipGuard, logique | 48 obligations ; 3 signalements classés « confirmed » : titre blanc mesuré, deux bilans après échec d’ouverture raisonnés ; 10 risques et un conflit de contrat à arbitrer |
| ShipGuard, processus | 26 unités, 79 observations : 15 mesurées et 64 raisonnées |
| ShipGuard, visuel | Total canonique de 6 entrées : 3 manifestes et 2 recettes agrégées passent ; une inspection échoue, car **Nom dans Pupitro** reste visible dans la confirmation de suppression malgré `hidden` (règle CSS `display: grid`) ; la suppression reste fonctionnelle |
| Tableau ShipGuard agrégé | 79 constats : 69 raisonnés et 10 mesurés ; ce compte ne désigne pas des tests |

Toutes les phases ShipGuard de `run.json` portent `ran`. Ce fichier indique
`exit_code: 1` pour constats présents, dont le défaut visuel ; les parcours fonctionnels
réussis ne valent donc pas un verdict global sans défaut. Les deux recettes navigateur
ne détectent aucun POST, appel externe ou `pageerror` dans leurs passages finaux ;
les messages FluidSynth habituels restent présents.

Fable relève aussi trois écarts UX mineurs : **Annuler cet ajout** arrête le lot
entier (comportement documenté, libellé ambigu), une repréparation est comptée
« enregistrée », et un ancien message d’erreur reste après l’aperçu d’une sauvegarde
vide valide. Le lecteur vide après suppression active est attendu : rouvrir une
autre partition depuis **Bibliothèque**. Les données restent conservées dans ces scénarios.
Le conflit de contrat porte sur l’ajout multiple qui continue après une erreur de
fichier, alors que la restauration s’arrête ; la politique attendue reste à décider.

Les premiers scripts Fable ont demandé des corrections de ciblage et d’attente.
Trois lancements Chromium en arrière-plan ont subi des fermetures inexpliquées ;
la recette complète réussit en premier plan. Codex rejoue le même script dans un
profil Chromium distinct en premier plan : **32/32, code 0**. La cause des fermetures
reste inconnue. Le MSCZ 2 synthétique Fable est refusé par le moteur : cette campagne
ne renouvelle pas la preuve de compatibilité MuseScore 2 réelle, conservée séparément
dans les essais historiques de la partition personnelle.

Les essais utilisent les navigateurs Mac et des profils isolés, sans appareil physique
ni écoute humaine. Fable n’exerce ni saturation réelle, ni mise à jour multi-fenêtres,
ni très grande bibliothèque. Rapports et captures restent hors Git sous
`/private/tmp/pupitro-recette-20261021.buFM9S/` : `fable/recette-fable.json`,
`shipguard/visual-tests/_results/` et `foreground-check/out/chromium/`.
Le dossier ShipGuard contient le rapport final `shipguard-report.md` et le tableau `review.html`.

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
Les vérifications documentaires passent ; le signal `modifie` est le verbe présent,
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
