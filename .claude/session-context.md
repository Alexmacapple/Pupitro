# Reprise — Pupitro, session clôturée le 21 octobre 2026

## INVARIANTS

- working directory : `/Users/alex/Claude/projets-heberges/Pupitro` ; dépôt autonome.
- branch : `main` ; remote : `git@github.com:Alexmacapple/Pupitro.git`.
- Dernier commit avant clôture : bfd100e, documentation de publication ; code publié : d538720.
- Précontrôle : arbre propre, aucun fichier non suivi et divergence `0/0` après fetch.
- Lire `AGENTS.md`, `README.md`, `todo.md`, puis `CODEBASE_MAP.md` avant toute reprise.
- Français concis et preuves observées ; les sondes ne prouvent pas une conformité RGAA.
- Préserver originaux, bibliothèques, ressources ignorées, preuves et aperçus utilisateur.
- La demande « yolo » ne désactive pas les permissions système ni les décisions matérielles à clarifier.

## STATE

### completed

- [x] Gestionnaire local : ajout multiple, doublons, renommage, suppression confirmée, sauvegarde et restauration `.pupitro`.
- [x] Correctifs Fable/ShipGuard et accessibilité : commit d538720 ; neuf MD structurants mis à jour, reçus finaux dans bfd100e.
- [x] Gate local : 41 tests Node et 23 Python réussis, dont 12 builder et 11 serveur historique avec conversion simulée.
- [x] Gestionnaire et récupération finaux sur Chromium/WebKit ; lecteur complet WebKit sur la construction finale, Chromium sur f26b29840edc0e48d215.
- [x] AY11 : campagne sur f26b29840edc0e48d215, reprises ciblées sur c9a92abf3377c4793737 puis 7385c59dd8c93f227bbd ; portée et limites dans `docs/VALIDATION.md`.
- [x] Derniers contrôles : 20 labels associés ; contrastes audio 5,53:1 et 4,65:1 ; 13 arrêts clavier visibles en 320 × 256 ; 11 états de lecture/pause par moteur.
- [x] Publication : workflow 39518250725 réussi, source d538720, construction 7385c59dd8c93f227bbd ; 32 ressources, 58 164 444 octets, empreintes HTTPS identiques et trois chemins privés en 404.
- [x] Mise à jour publique depuis a211530ec3d09aedecdb : activation explicite après pause ; catalogue, MSCZ, PDF/MIDI/pages et réglages strictement conservés ; relance complète, nouvel import et signal audio hors ligne.
- [x] Défauts initiaux rejoués sur le site public : titre blanc exportable avec original intact ; champ Nom invisible dans la confirmation de suppression, annulation sans perte.
- [x] Contextes navigateur des recettes fermés ; seul notre serveur temporaire sur 8794 arrêté. Les autres aperçus sont préservés.

### in progress

- [~] Aucun développement en cours ; clôture limitée au présent contexte, à valider puis commiter et pousser seul.

### pending

- [ ] Recette détaillée iPhone et iPad M4 physiques, versions système/navigateur, VoiceOver et écoute humaine pour cette version.
- [ ] Android physique, saturation réelle du stockage, consommation/mémoire et mises à jour multi-fenêtres non vérifiés.
- [ ] Harmonisation éventuelle après échec de fichier : question optionnelle sans réponse, comportement conservé.
- [ ] Trois fermetures Chromium historiques en arrière-plan restent inexpliquées ; les rejeux en premier plan passent.

## DECISIONS

1. Application installable depuis Safari, sans App Store ni Mac à l’usage ; import MSCZ et traitement sur l’appareil. Aucun achat, édition, annotation Pencil ou envoi de partition vers un service externe.
2. Rendu web différent de MuseScore 2 accepté si les éléments s’affichent correctement. Moteur épinglé webmscore 0.22.0 ; l’exemple réel donne 13 pages au lieu de 7. Six choix d’instruments ; ukulélé et mandoline partagent la guitare nylon.
3. IndexedDB v2 possède partitions/réglages ; Service Worker possède seulement le cache applicatif. Chaque appareil a sa bibliothèque, sans synchronisation automatique.
4. Sauvegarde des originaux, noms et réglages ; restauration additive, sans écraser les présentes. Arrêt au premier échec de préparation conservé avec bilan explicite ; l’ajout multiple continue après une erreur ordinaire. Aucun nouveau choix imposé.
5. Pas de plafond de nombre ; capacité réelle et protections par fichier restent applicables. Métadonnées finales validées avec les réglages conservés avant écriture ; MSCZ original inchangé.
6. Tags v0.1.0 (version Mac) et v0.2.0 (première autonome) inchangés. Revenir à un tag ne rétrograde pas IndexedDB v2.
7. Workflow Pages manuel : push seul sans déploiement. Mise à jour à la demande, à l’arrêt ; réimport nécessaire si une correction de gravure doit remplacer les pages conservées.

## ARTIFACTS

- `/Users/alex/Claude/projets-heberges/Pupitro/docs/VALIDATION.md` : preuves, triage des 46 entrées ShipGuard, campagne AY11, références historiques et limites physiques.
- `/Users/alex/Claude/projets-heberges/Pupitro/docs/INSTALLATION.md` : installation Safari, bibliothèque, sauvegarde et mise à jour.
- `/Users/alex/Claude/projets-heberges/Pupitro/reader/score-metadata.js` : propriétaire commun du titre de repli et du budget de métadonnées.
- `/Users/alex/Claude/projets-heberges/Pupitro/tests/library-recovery.cjs` : récupération, budget, état occupé, focus et vue en échec ; `tests/test_build_web.py` protège les sorties du builder.
- `/private/tmp/pupitro-corrections-20261021.JvUWTT/` : copie de travail terminée, rapports AY11/PDV et `public-verification.json` ; artefacts temporaires non publiés.
- `/private/tmp/pupitro-public-update-20261021.2je82876/receipt.json` : migration publique et lecture hors ligne ; `/private/tmp/pupitro-public-original-defects-20261021.gw5wi3/public-result.json` : deux défauts initiaux corrigés.
- `/private/tmp/pupitro-ay11-labels-20261021.RXET48/rapport.md` : labels, AX et contrastes finaux.
- À la clôture, seul `.claude/session-context.md` doit être modifié/indexé ; aucun fichier produit, ressource ignorée ou partition à inclure.

## ERRORS FIXED

1. Titre composé d’espaces : accepté par l’import mais refusé par la sauvegarde. Normalisation partagée à la frontière ; nom de fichier utilisé en repli, original conservé.
2. Champ Nom visible en suppression : `display:grid` dominait `hidden`. Règle ciblée `[hidden]` ; invisibilité visuelle et AX vérifiée sur le site public.
3. Focus perdu et succès annoncés hors modale active : retour vers une commande visible et message dans le dialogue ; dock défilant en faible hauteur.
4. Deux P2 de la revue PDV : budget sans réglages conservés et sortie générée modifiée écrasée. Validation dans la transaction avec réglages effectifs ; reçu `.pupitro-build.json` avant réécriture, régressions dédiées vertes. Ne pas transformer l’ancien verdict PDV en nouveau GO indépendant.
5. Faux échec de recette WebKit : régénérer un ZIP changeait son horodatage et son identifiant. Réutiliser exactement le buffer initial pour éprouver un doublon.
6. Labels imbriqués valides qualifiés à tort d’orphelins par un outil : associations explicites ajoutées et noms AX vérifiés. Bouton lecture : nom d’action changeant, aucun défaut d’état confirmé sur les 11 états par moteur.

## NEXT

1. À la reprise, vérifier racine, remote, état, fetch et divergence ; préserver tout changement concurrent. Aucun nouveau chantier automatique après cette clôture.
2. Sur demande, suivre la recette physique de `docs/VALIDATION.md` sur chaque appareil et distinguer retour utilisateur, moteur Mac et essai physique. Le retour iPhone acquis porte sur v0.2.0, avant ce gestionnaire.
3. Si l’utilisateur demande une nouvelle politique de restauration, clarifier poursuite/arrêt avant de la changer ; aucune réponse reçue à la question précédente.
4. Garder les originaux et sauvegardes externes. Pas de nouvel audit global, déploiement ou modification produit nécessaire pour ce seul commit de clôture.
