# Prochaines étapes

## Gestionnaire de bibliothèque

- [x] Ajouter plusieurs MSCZ, renommer et supprimer après confirmation, sans plafond de nombre.
- [x] Migrer le catalogue sans modifier les partitions existantes ; garder une liste légère.
- [x] Traiter explicitement les doublons et la suppression de la partition ouverte.
- [x] Exporter/restaurer toute la bibliothèque, noms et réglages compris, sans écraser l’existant.
- [x] Couvrir les annulations, les sauvegardes invalides et les échecs de stockage sans perte.
- [x] Tester sur Chromium/WebKit, publier et vérifier la mise à jour HTTPS avec bibliothèque existante conservée.
- [ ] Vérifier ce gestionnaire et son aller-retour de sauvegarde sur iPhone et iPad physiques.

## Suites des recettes indépendantes — 21 octobre 2026

Correctifs locaux, publication en attente. Preuves et limites par construction
dans [VALIDATION.md](docs/VALIDATION.md).

- [x] Aligner titres et budget de métadonnées à l’import, au stockage et à l’export.
- [x] Masquer le champ **Nom dans Pupitro** dans la confirmation de suppression
  en respectant `hidden` malgré la règle CSS `display: grid`.
- [x] Clarifier l’annulation du lot et le bilan de repréparation ; retirer l’ancien
  message d’erreur après l’aperçu d’une sauvegarde vide valide.
- [x] Séparer les bilans d’écriture et d’ouverture ; récupérer une connexion
  IndexedDB perdue et préserver un commit achevé après une annulation tardive.
- [x] Corriger retours de focus, messages du dialogue, rôles, étiquettes,
  contraste du champ de nom et commandes dans les fenêtres de faible hauteur.
- [x] Protéger aussi les fichiers générés lors d’une reconstruction locale.
- [ ] Terminer les gates finaux puis publier les correctifs et vérifier HTTPS,
  empreintes et mise à jour avec bibliothèque conservée.
- [ ] Si l’utilisateur veut harmoniser les erreurs, décider explicitement la
  nouvelle politique : aujourd’hui l’ajout continue et la restauration s’arrête
  au premier échec. La question optionnelle reste sans réponse.
- [ ] Élucider les trois fermetures Chromium en arrière-plan ; les rejeux en premier
  plan passent, sans cause établie pour les fermetures.

## Livrer la version autonome

- [x] Vérifier le tag de retour `v0.1.0` sur GitHub.
- [x] Tester les moteurs web : retenir 0.22.0, curseur fonctionnel.
- [x] Obtenir l’accord sur le rendu web différent, sous réserve d’affichage correct.
- [x] Préparer les MSCZ localement et conserver la bibliothèque dans IndexedDB.
- [x] Mettre les ressources applicatives en cache pour les imports hors ligne.
- [x] Vérifier import, lecture et redémarrage hors ligne sur Chrome et WebKit Mac.
- [x] Terminer la revue ; corriger annulation, ouvertures concurrentes et silences.
- [x] Corriger le barré B♭ de la page 5 et préserver les images de notation.
- [x] Démarrer, mettre en pause et relancer par clic ou toucher sur une note.
- [x] Activer la mise à jour dans l’onglet Chrome utilisateur avec bibliothèque conservée.
- [x] Mettre à jour les 13 documents structurants, dont le guide Safari.
- [ ] Faire confirmer le barré B♭ et les clics sur les notes par l’utilisateur ;
  réimporter le MSCZ pour remplacer les anciennes pages conservées.
- [x] Obtenir l’accord pour activer GitHub Pages et publier l’application statique.
- [x] Déployer puis contrôler HTTPS, le chemin `/Pupitro/`, les ressources et le hors ligne sur Chrome Mac.
- [x] Recueillir la confirmation du fonctionnement général sur iPhone.
- [ ] Compléter la recette détaillée iPhone et installer puis vérifier sur l’iPad M4.
- [ ] Recueillir les versions du système et du navigateur de ces appareils.
- [ ] Vérifier Android avant de l’annoncer comme testé.

## Recette physique

À exécuter séparément sur l’iPhone et l’iPad, selon
[le guide d’installation](docs/INSTALLATION.md). Consigner les résultats dans
[VALIDATION.md](docs/VALIDATION.md). Le fonctionnement général iPhone est confirmé
par l’utilisateur ; les scénarios ci-dessous ne sont pas encore détaillés.

- [ ] Comparer tous les éléments affichés d’une partition connue.
- [ ] Écouter les instruments, le métronome et le décompte.
- [ ] Tester lecture/pause au toucher, vitesse, curseur, boucle, zoom et commandes masquées.
- [ ] Mac éteint, mode avion et Wi-Fi coupé : fermer, rouvrir puis importer un nouveau MSCZ local.
- [ ] Vérifier les réglages et le retour après verrouillage/changement d’app.
- [ ] Ajouter plusieurs MSCZ, renommer, supprimer une entrée active puis retrouver les autres.
- [ ] Exporter et restaurer une sauvegarde, comparer noms et réglages sur chaque appareil.

## Fiabiliser à partir de cas réels

- [x] Corriger les constats ShipGuard du 20 octobre et le faux lien PDF, avec 30 tests Node,
  11 tests HTTP et les recettes Chromium/WebKit sur la construction corrigée.
- [ ] Tester d’autres partitions : reprises, changements de tempo/métrique,
  plusieurs portées, percussions, silences et erreurs d’import.
- [ ] Mesurer mémoire, consommation et durée du premier chargement sur téléphone.
- [ ] Valider les mises à jour sur appareils physiques et avec plusieurs fenêtres ouvertes.
- [ ] Choisir la licence du code propre avant distribution de paquets.

Aucun achat ni envoi de partition vers un service externe n’est autorisé.
