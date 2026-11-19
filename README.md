# Maison Famille

# PROJET : FAMILY OS – APPLICATION INTELLIGENTE DE GESTION FAMILIALE

## 1. OBJECTIF DU PROJET

Je souhaite créer une application web familiale privée, moderne, complète et évolutive permettant à un papa qui élève seul ses cinq enfants de gérer toute l'organisation de sa famille depuis une seule plateforme.

Le papa est l'administrateur principal. Il possède tous les droits de gestion et crée personnellement les comptes de chaque membre.

L'application doit être intuitive, esthétique, facile à utiliser sur ordinateur, tablette et téléphone.

Nom provisoire : FAMILY OS.

Langue principale : français.
Format des dates : JJ/MM/AAAA.
Fuseau horaire : Europe/Paris.
Devise : EUR (€).

Créer une véritable application fonctionnelle avec base de données, authentification, gestion des droits, stockage des données et interfaces dynamiques.

## 2. STRUCTURE INITIALE DE LA FAMILLE

Créer automatiquement les profils suivants :

ADMINISTRATEUR :
- Prénom : Saïd
- Date de naissance : 14/06/1983
- Sexe : Homme
- Rôle : Papa / Administrateur principal

ENFANT 1 :
- Prénom : Maya
- Date de naissance : 04/02/2013
- Sexe : Fille
- Rôle : Enfant
- Interface : Adolescente

ENFANT 2 :
- Prénom : Lina-Saja
- Date de naissance : 01/05/2017
- Sexe : Fille
- Rôle : Enfant
- Interface : Enfant

ENFANT 3 :
- Prénom : Naël
- Date de naissance : 04/12/2018
- Sexe : Garçon
- Rôle : Enfant
- Interface : Enfant

ENFANT 4 :
- Prénom : Yara
- Date de naissance : 24/03/2022
- Sexe : Fille
- Rôle : Enfant
- Interface : Petite enfant

ENFANT 5 :
- Prénom : Eden
- Date de naissance : 01/06/2023
- Sexe : Garçon
- Rôle : Enfant
- Interface : Tout-petit

Les âges doivent être calculés automatiquement à partir des dates de naissance.

Prévoir la possibilité d'ajouter un nombre illimité de nouveaux membres.

## 3. AUTHENTIFICATION ET GESTION DES COMPTES

Créer un système de connexion sécurisé.

Seul Saïd peut :
- Créer un compte.
- Ajouter un membre.
- Générer un identifiant.
- Définir un mot de passe provisoire.
- Modifier un identifiant.
- Réinitialiser un mot de passe.
- Désactiver un compte.
- Supprimer un compte.
- Attribuer un rôle.
- Modifier les autorisations.

Chaque membre possède son propre identifiant et son propre mot de passe.

Ne jamais afficher les mots de passe en clair dans la base de données. Utiliser une authentification sécurisée avec stockage des mots de passe sous forme de hash.

Prévoir une option de changement du mot de passe provisoire à la première connexion.

Les enfants ne doivent jamais pouvoir accéder aux comptes de leurs frères et sœurs.

Créer les rôles suivants :
1. Administrateur principal.
2. Adulte autorisé.
3. Adolescent.
4. Enfant.
5. Petit enfant avec gestion parentale.

Les comptes des tout-petits peuvent être pilotés par le papa sans connexion autonome.

## 4. TABLEAU DE BORD DU PAPA

Créer un dashboard administrateur premium avec :
- Vue générale de la famille.
- Nombre de membres.
- Profil de chaque enfant.
- Âge de chaque enfant.
- Calendrier familial.
- Rendez-vous du jour.
- Événements à venir.
- Tâches à valider.
- Devoirs à surveiller.
- Routines quotidiennes.
- Notifications.
- Dépenses familiales.
- Planning des repas.
- Activités des enfants.
- Progression des objectifs.
- Anniversaires à venir.

Créer une carte individuelle pour chaque enfant avec :
- Photo ou avatar.
- Prénom.
- Âge.
- Prochaine activité.
- Tâches en attente.
- Progression des routines.
- Points et récompenses.
- Bouton permettant d'ouvrir son profil.

Créer une vue quotidienne, hebdomadaire et mensuelle.

## 5. GESTION DES PROFILS ENFANTS

Créer un espace personnel totalement différent selon l'âge de chaque enfant.

Pour Maya : interface adolescente moderne et personnalisable.
Pour Lina-Saja : interface ludique, colorée et adaptée à un enfant de 9 ans.
Pour Naël : interface aventure et défis adaptée à un enfant de 7 ans.
Pour Yara : interface visuelle avec grandes illustrations et routines imagées.
Pour Eden : interface extrêmement simple avec grandes images et activités accompagnées par le papa.

L'âge doit déterminer automatiquement les fonctionnalités autorisées.
Le thème graphique, les couleurs et les avatars doivent rester personnalisables, sans imposer de stéréotypes liés au sexe.

## 6. CALENDRIER FAMILIAL

Créer un calendrier intelligent avec :
- Vue jour.
- Vue semaine.
- Vue mois (avec pastilles/avatars des membres sur chaque date comme dans la maquette).
- Couleurs personnalisées par membre.
- Rendez-vous.
- École.
- Activités sportives.
- Sorties.
- Vacances.
- Anniversaires.
- Rendez-vous médicaux.
- Rappels automatiques.
- Événements récurrents.

Le papa peut créer un événement pour un enfant, plusieurs enfants ou toute la famille.

## 7. GESTION SCOLAIRE

Créer un module scolaire individuel pour chaque enfant.
Fonctionnalités :
- Établissement scolaire.
- Classe.
- Emploi du temps.
- Devoirs.
- Contrôles.
- Évaluations.
- Notes.
- Documents scolaires.
- Fournitures.
- Absences.
- Retards.
- Vacances scolaires.
- Rendez-vous avec les enseignants.
- Notifications des échéances.

## 8. TÂCHES ET RESPONSABILITÉS

Créer un système complet de gestion des tâches (comme sur les maquettes Chore Chart with Rewards et Checklist à étoiles avec mascotte).
Le papa peut :
- Créer une tâche.
- L'attribuer à un enfant.
- Définir une échéance.
- Ajouter une description.
- Définir une fréquence.
- Ajouter une récompense en points.
- Valider ou refuser une tâche.
- Ajouter un commentaire.

Prévoir les statuts :
- À faire.
- En cours.
- Terminée.
- En attente de validation.
- Validée.

Modèles de tâches :
- Ranger sa chambre.
- Ranger ses jouets.
- Faire son lit.
- Préparer son sac.
- Mettre la table.
- Débarrasser la table.
- Ranger ses vêtements.
- Aider à la maison.

Adapter automatiquement les tâches à l'âge de chaque enfant.

## 9. SYSTÈME DE RÉCOMPENSES

Créer un système ludique avec :
- Points.
- Étoiles.
- Badges.
- Défis.
- Objectifs.
- Récompenses (ex: 1h de jeu, livre, sortie, glace, film au choix).
- Progression.
- Historique.

Le papa peut définir le nombre de points pour chaque mission, créer des récompenses personnalisées et valider leur obtention.
Ne pas comparer publiquement les enfants entre eux.

## 10. ROUTINES QUOTIDIENNES

Créer un module de routines personnalisées (matin et soir).
Ajouter des images pour les petits enfants, des cases à cocher pour les plus grands et une progression visuelle.

## 11. REPAS ET COURSES

Planning alimentaire familial :
- Menu hebdomadaire (petit-déjeuner, déjeuner, goûter, dîner).
- Recettes et ingrédients.
- Liste de courses automatique catégorisée.
- Préférences et allergies renseignées par le papa.

## 12. BUDGET FAMILIAL

Tableau de gestion financière accessible uniquement au papa et aux adultes autorisés :
- Budget mensuel, revenus, dépenses catégorisées (courses, vêtements, école, santé, loisirs).
- Dépenses par enfant, factures, graphiques et suivi.

## 13. SANTÉ

Fiche médicale privée pour chaque enfant :
- Médecins, rendez-vous, allergies, vaccinations, traitements, contacts d'urgence.

## 14. MESSAGERIE ET SOUVENIRS

- Messagerie privée familiale.
- Bibliothèque et coffre-fort de documents et souvenirs (photos, vidéos, dessins) inspiré des maquettes jointes.

## 15. DESIGN ET ARCHITECTURE

- Style visuel premium, minimaliste, cartes arrondies, couleurs douces et chaleureuses (bleu pastel, touches rose/corail, jaune doux pour les étoiles).
- Navigation latérale sur ordinateur et barre de navigation inférieure sur mobile.
- Base de données complète et RLS.
- Données initiales créées pour Saïd et les 5 enfants (Maya, Lina-Saja, Naël, Yara, Eden).

IMPORTANT : commencer par créer une version complète et fonctionnelle du socle de l'application, avec les comptes, les profils, le dashboard papa, les espaces enfants adaptés, le calendrier et les tâches/récompenses.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6aa8ca4f-1313-49f9-a169-98e365a9e114).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
