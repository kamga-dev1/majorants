# Groupe Les Majorants — gestion scolaire hors ligne

Application React/Chakra UI et Java/Spring Boot pour gérer les élèves, les présences, les paiements et les comptes utilisateurs. Le backend utilise une base MySQL séparée nommée `majorants` et ne se connecte pas au schéma `subman`.

## Fonctionnement

- Un ordinateur de l’établissement héberge l’application et le serveur MySQL.
- Les téléphones et ordinateurs se connectent au même Wi‑Fi local. Ce réseau n’a pas besoin d’avoir accès à Internet.
- Les saisies hors ligne sont gardées dans le navigateur puis envoyées au serveur au retour du Wi‑Fi. Sur téléphone, le navigateur exige HTTPS pour installer le cache hors ligne et relancer l’application après fermeture ; en HTTP, gardez la page ouverte pendant une coupure temporaire.
- Les données sont partagées immédiatement lorsque les appareils peuvent joindre l’ordinateur serveur.

## Prérequis pour construire l’application

- Java 17 ou supérieur et Maven
- Node.js et npm
- MySQL Server démarré sur l’ordinateur serveur. Workbench sert à gérer la base et les tables ; l’application se connecte au serveur MySQL.
- Internet uniquement lors du premier téléchargement des dépendances. Après cette préparation, l’application fonctionne sur le réseau local sans Internet.

## Connexion à MySQL Workbench

Dans MySQL Workbench, créez une nouvelle base de données nommée `majorants`, distincte de `subman`. Vous pouvez exécuter :

```sql
CREATE DATABASE IF NOT EXISTS majorants
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

L’application crée automatiquement ses tables au premier démarrage dans `majorants`. Elle ne modifie pas `subman`. Dans PowerShell, définissez le compte MySQL avant de démarrer le backend :

```powershell
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "votre_mot_de_passe_mysql"
```

Si MySQL utilise un autre serveur, port, compte ou schéma, configurez également `DB_HOST`, `DB_PORT` et `DB_NAME`. Ces variables ne sont valables que dans la fenêtre PowerShell courante. Ne mettez pas votre mot de passe dans les fichiers du projet.

## Démarrage en développement

Dans le dossier du projet :

```powershell
npm install
npm run build
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "votre_mot_de_passe_mysql"
mvn -f backend\pom.xml spring-boot:run
```

Ouvrir `http://localhost:8080`. Le serveur écoute sur le réseau local au port 8080. Sur un téléphone connecté au même Wi‑Fi, ouvrir `http://ADRESSE-IP-DE-L-ORDINATEUR:8080`. En HTTP, l’application est utilisable tant que la page reste ouverte, mais son lancement complet hors ligne après fermeture nécessite de configurer HTTPS.

Au premier démarrage, le terminal affiche le mot de passe temporaire du compte `promoteur`. Conservez-le et créez les autres comptes depuis l’onglet « Comptes ». Les mots de passe sont stockés sous forme hachée.

## Rôles initiaux

- Promoteur et directeur : gestion des comptes et consultation des données.
- Secrétaire : élèves, présences et paiements.
- Enseignant : consultation des élèves de sa classe et saisie des présences.
- Parent et élève : consultation des données de l’élève associé au compte.

Les données sont conservées dans le serveur MySQL, dans le schéma `majorants`. Sauvegardez régulièrement ce schéma depuis MySQL Workbench.

## Sécurité réseau

Le serveur est destiné à un réseau Wi‑Fi privé de l’établissement. Le prototype utilise HTTP ; ne l’exposez pas sur Internet ou sur un réseau public. Les informations hors ligne sont conservées dans le stockage local du navigateur. Prévoir HTTPS, protéger les téléphones par code et mettre en place une politique de sauvegarde avant une mise en production avec des données réelles.
