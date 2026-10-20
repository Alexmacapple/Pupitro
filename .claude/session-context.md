# Reprise — Pupitro

## Objectif et décisions acquises

Lecteur de MSCZ MuseScore 2 sur navigateur mobile, sans App Store ni édition.
Priorité au rendu natif, au son, au curseur et au métronome. Six instruments
suffisent. Le projet se nomme Pupitro et possède son propre dépôt GitHub.

Le projet réside dans le dossier choisi par l’utilisateur, sous
`projets-heberges/Pupitro`. L’ancien dossier temporaire est conservé en secours.
Ne pas reprendre le développement dans ce secours ni commiter dans le dépôt parent.

## Pour reprendre

1. Lire `AGENTS.md`, `todo.md` et `docs/VALIDATION.md`.
2. Examiner l’état Git et les éventuels serveurs déjà actifs avant relance.
3. Utiliser `bash scripts/check.sh`, puis la recette correspondant au changement.

Les ressources et partitions locales ne sont pas versionnées. Le chemin privé
du Wi‑Fi est dans `.access-token` ; ne pas le recopier dans un document public.
Les ports utilisés pendant la session sont 8765 sur le Mac et 8766 sur son adresse
Wi‑Fi. Aucun démarrage automatique n’a été installé.

## Limites à conserver dans les comptes rendus

Le lecteur s’ouvre sur l’iPhone selon l’utilisateur. Le son sur cet appareil
n’est pas confirmé après le correctif de mode audio. L’iPad et Android restent
à tester. Une largeur de navigateur simulée ne valide pas un appareil physique.
Voir `todo.md` pour la prochaine tranche utile.
