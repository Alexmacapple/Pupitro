# Reprise — Pupitro autonome

## Accord utilisateur

Import direct des MSCZ sur iPhone/iPad, installation sans App Store et usage
entièrement local hors ligne. L’utilisateur accepte explicitement un rendu web
différent si tous les éléments s’affichent correctement. Aucun achat autorisé.
Le tag GitHub `v0.1.0` est le point de retour, vérifié au commit `a6ef304`.

## Travail courant

Les sources de la PWA utilisent webmscore 0.22.0 dans un worker, IndexedDB pour
les partitions et un cache applicatif versionné. Le moteur récent 1.2.1 a été
écarté après échec des positions et changement de pagination. L’exemple retenu
compte 13 pages, 131 mesures et 916 événements de curseur.
La migration des harmonies v2 préserve les deux parties de l’ancien export.

Lire `AGENTS.md`, `todo.md`, `docs/VALIDATION.md`, puis examiner Git avant reprise.
Construire avec `python3 scripts/setup_assets.py --standalone` et
`bash scripts/check.sh`. L’aperçu statique se lance avec `bash scripts/serve-web.sh`.

## Limites et protection

Les parcours Chrome et WebKit Mac ont passé import, signal audio et redémarrage
hors ligne. La revue a conduit à corriger l’annulation pendant le calcul SHA-256,
les ouvertures concurrentes et l’import des partitions de silences. Huit tests
Node passent ; un cas réel de silences affiche une page et produit le métronome
dans WebKit hors ligne. La construction finale porte `b8ab11dc702e9af7a4fc`.
L’installation réelle, l’écoute et le mode avion sur
l’iPhone et l’iPad restent à vérifier pour cette nouvelle version. La confirmation
antérieure du son iPhone concernait la version Mac `v0.1.0`.

L’utilisateur consulte l’aperçu local sur `http://127.0.0.1:8770/`. Le barré B♭
de la page 5 est corrigé depuis son numéro et ses cordes d’origine ; 65 barrés
ont été contrôlés dans le moteur. La copie intermédiaire reste une archive MSCZ
complète pour conserver les images. Le clic ou le toucher d’une note démarre
la lecture à cet endroit, ou la déplace si elle était en cours. Tests Chrome et
WebKit passés, retour utilisateur encore attendu. Après mise à jour de l’app,
réimporter le MSCZ pour remplacer les anciennes pages déjà stockées.

La publication statique HTTPS est préparée mais n’est pas encore autorisée ni
validée. Ne pas annoncer l’adresse comme disponible avant son contrôle.
Ne pas publier les partitions, preuves, anciens imports ou lien privé du Mac.
Les outils natifs et données locales historiques restent préservés ; aucun
serveur Mac ne doit être exposé sur Internet.
