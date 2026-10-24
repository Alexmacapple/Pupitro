# Lecture avec la barre d’espace

Étude initiale du 24 octobre 2026, avant implémentation. Les conclusions ci-dessous
décrivent ce cadrage historique ; la mise en œuvre locale autorisée ensuite est
suivie dans `docs/VALIDATION.md`. Le déploiement du site n’est pas inclus.

## Conclusion

Ajout local possible, sans dépendance ni changement du stockage ou du moteur audio.
Proposition à valider : Espace bascule entre lecture et pause à la position courante.
Pendant la préparation ou le décompte, Espace annule le départ comme le bouton actuel.

## Preuves et pourquoi

| Affirmation | Source lue | Verdict | Conséquence |
|---|---|---|---|
| Une commande commune possède déjà lecture, pause et annulation | `reader/app.js:64-66`, liaison du bouton vers `play()` | Confirmé | Réutiliser `play()`, sans second moteur |
| Aucun raccourci clavier applicatif n’existe | Recherche `keydown`, `keyup`, `keypress` dans les JS du lecteur hors ressources tierces | Confirmé | Ajouter un gestionnaire ciblé |
| Les opérations de fichiers désactivent le transport | `reader/app.js`, `fileOperationUi()` | Confirmé | Respecter le bouton désactivé et les états occupés |
| Les champs, cases et dialogues doivent garder leur usage | `reader/index.html` | Contrôles présents | Exclure ces cibles du raccourci global |
| Le geste au pointeur et la boucle ont un contrat existant | `docs/DECISIONS.md`, section « Séparer gravure et lecture » ; `docs/PRD.md` | Confirmé | Ne pas modifier le clic, le toucher ou la boucle |

Ces décisions existantes apportent le pourquoi : préserver la lecture autonome et
les réglages, et ajouter seulement un autre moyen de commander le transport.

## Comportement recommandé

- Écouter Espace sans modificateur dans le document actif, avec partition prête.
- Hors contrôle interactif, empêcher le défilement par Espace lorsque le transport
  est disponible, puis déclencher une seule bascule par appui ; les répétitions
  doivent aussi empêcher le défilement sans répéter la bascule.
- Ignorer les événements déjà traités, la composition de texte et les combinaisons
  avec Maj, Ctrl, Alt ou Commande.
- Laisser les champs, zones éditables, sélecteurs, cases, curseurs, liens et boutons
  garder leur comportement. Sur le bouton Écouter lui-même, conserver l’activation
  clavier native : ne pas déclencher une seconde bascule globale.
- Ne pas intercepter Espace lorsqu’un dialogue est ouvert, sans partition ou pendant
  import/restauration. Ne pas déplacer le focus pour rendre le raccourci disponible.
- Garder le raccourci disponible sur la partition même avec commandes masquées.
- Ajouter une indication discrète « Espace : lecture / pause » à proximité du lecteur.

Espace active normalement un bouton focalisé selon le
[W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/button/).
Les propriétés [repeat](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat)
et [isComposing](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing)
sont documentées par MDN ; leur disponibilité sur les appareils ciblés reste à vérifier.

## Intervention et vérification proposées

Étendre `reader/app.js` et `reader/index.html`, puis la recette `tests/browser.cjs`
existante. Ne pas modifier `playback.js`, les données ou les gestes au pointeur.
La documentation utilisateur devra mentionner le raccourci après implémentation.

Recette Chromium et WebKit : départ avec signal audio, pause, reprise sans remise
à zéro, annulation du décompte, touche maintenue, absence de défilement, commandes
masquées, champs et cases inchangés, boutons sans double action, dialogue ouvert,
partition absente et import en cours. Conserver les essais clic/toucher et boucle.

Un clavier physique sur Mac, puis sur iPad si utilisé, reste nécessaire pour
confirmer le comportement réel. Les interceptions par un lecteur d’écran restent
non vérifiées. Aucune prise de contrôle globale du clavier système n’est prévue.

Auto-vérification PDG, pas une revue indépendante : proposition confrontée au
transport, aux états occupés, au focus et aux dialogues existants. Aucune preuve
d’exécution du raccourci à ce stade. Aucun déploiement autorisé par cette étude.

## Analyse connu-inconnu avant implémentation

Reformulation : ajouter une commande clavier au transport existant. L’étude et
la revue préparent une issue ; elles ne prouvent pas un raccourci fonctionnel.

### Ancrage — connus connus

- `play()` possède déjà départ, pause, annulation du départ et retour au début
  après la fin du morceau. Les états `playing`, `starting`, `importing` et
  `restoring` sont présents dans `reader/app.js`.
- Les boutons sont natifs, les dialogues utilisent `showModal()` et le formulaire
  de renommage contient un champ texte (`reader/index.html`).

### Brouillard — connus inconnus

- [~] Usage réel sur Mac ou iPad avec clavier et versions système : relever la
  cible lors de la recette physique ; ne pas annoncer un appareil testé avant cela.
- [~] Pause/reprise ou démarrage seul : proposition de bascule, cohérente avec
  le bouton actuel, à rendre explicite dans l’issue avant implémentation.
- [^] Livraison des événements sous VoiceOver : réserver le verdict sur ce mode
  à une recette dédiée ; ne pas contourner les commandes du lecteur d’écran.
- [^] Déblocage de `AudioContext` par Espace sur Safari/iPad : vérifier un premier
  départ au clavier physique, sans clic préalable. Aucun support physique acquis.

### Déni — inconnus connus

- [^] « Disponible avec commandes masquées » ne signifie pas « quel que soit le
  focus ». Après le bouton de masquage, le focus peut rester dessus : Espace doit
  le réactiver. Ne pas promettre un raccourci universel ni déplacer le focus.
- [^] « Réutiliser le bouton » ne suffit pas : appeler directement `play()`
  contourne le contrôle natif `disabled`. Vérifier aussi `importing` et `restoring`,
  notamment pendant `restoreRecord()`, qui restaure les réglages de façon asynchrone.

### Abîme — inconnus inconnus

- [~] Un appui maintenu peut traverser la fermeture d’un dialogue ou un changement
  de focus et commencer à produire des événements sur la partition. Signe à tester :
  lecture inattendue avant relâchement. Aucun événement répété ne doit la déclencher.
- [~] Après bascule d’application pendant un appui, la page peut ne pas recevoir
  le relâchement. Si un verrou manuel de touche est ajouté, vérifier sa remise à
  zéro au retour pour éviter un raccourci définitivement bloqué.

Risques prioritaires : double action native/globale, démarrage pendant une
opération occupée, comportement surprenant après changement de focus.
Question de cadrage : aucune bloquante pour créer l’issue ; la bascule lecture/pause
reste une proposition à expliciter, pas une extension autorisée à implémenter.
Verdict : **Prêt sous conditions pour l’issue**, avec exclusions de focus et recette
clavier intégrées. Le verdict de fonctionnement attend une implémentation testée.

## Revue indépendante Fable

Avis obtenu le 24 octobre 2026 : **GO sous conditions pour ouvrir l’issue,
pas pour livrer**. Modèle attesté par `modelUsage` : `claude-fable-5-1` ; sortie
JSON `is_error=false`, durée 75 003 ms. Revue statique sur étude, HTML et extraits
du transport, chargement et restauration ; aucun test ni accès en écriture.

Constats retenus : vérifier les états occupés et le bouton désactivé cumulativement,
éviter la double action native/globale, filtrer les répétitions, expliciter le focus
résiduel et vérifier le déblocage audio par clavier physique sur WebKit.
Le scénario d’erreur concurrente décrit par Fable est plausible, non reproduit.
Précision après lecture : `load()` désactive aussi le bouton en fin de fonction ;
la fenêtre à couvrir commence avant, dans `restoreRecord()` et `getSettings()`.

Deux propositions restent ajustées par le responsable de l’étude :

- Le verrou manuel keydown/keyup proposé par Fable est une option de compatibilité,
  pas une exigence sans preuve d’insuffisance de `event.repeat`. S’il est nécessaire,
  couvrir perte de focus et visibilité pour éviter une touche bloquée.
- Ne pas masquer l’aide par une heuristique « écran tactile = sans clavier » :
  un iPad peut avoir les deux. Préférer « Avec un clavier : Espace, lecture/pause ».

Incident : premier appel avec environnement habituel expiré à 300 s, sorties
standard et erreur vides. Second appel isolé : hooks, connecteurs et outils désactivés
uniquement pour cet appel, sans modification de configuration. Cause non établie.

Preuve brute locale temporaire : dossier `pupitro-fable-isole-9rimq2nu` dans le
répertoire temporaire système ; ne pas considérer ce dossier comme archive durable.
Empreinte SHA-256 du JSON :
`284300a7183e362b42f563b937a36e5b82bc7b3b14a92cec9042bcc34858c347`.
Empreinte SHA-256 de la consigne et des sources transmises :
`9f05083df8f247263f7d98164829e18604662d4b590ce4310fb13d0ec05a0c5a`.
Le présent résumé conserve verdict, conditions, ajustements et limites pour la trace.

Trace GitHub créée après revue :
[issue #1 — Ajouter Espace pour lecture/pause](https://github.com/Alexmacapple/Pupitro/issues/1).
Le connecteur a refusé l’écriture (403) ; la création a réussi via `gh issue create`.
L’implémentation a ensuite été autorisée explicitement ; ses preuves sont séparées
dans `docs/VALIDATION.md`.
