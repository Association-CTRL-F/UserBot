# UserBot

Bot du serveur Discord d'Entraide Informatique - Capetlevrai

[![Release](https://img.shields.io/github/v/release/Association-CTRL-F/UserBot?include_prereleases)](https://github.com/Association-CTRL-F/UserBot/releases)

## Table des matières

- [Table des matières](#table-des-matières)
- [Mise en place du bot](#mise-en-place-du-bot)
	- [Création du bot](#création-du-bot)
	- [Invitation du bot](#invitation-du-bot)
	- [Configuration du bot](#configuration-du-bot)
- [Setup en production](#setup-en-production)
	- [Setup avec Node.js](#setup-avec-nodejs)
	- [Setup dans un container avec Docker et Docker Compose](#setup-dans-un-container-avec-docker-et-docker-compose)

## Mise en place du bot

### Création du bot

[Cliquez ici](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot) pour accéder à un tutoriel (en anglais) tiré du [guide officiel de Discord.js](https://discordjs.guide/) pour créer votre bot.

Une fois le bot créé, dans la section "Bot", il faudra activer l'intent privilégié "PRESENCE INTENT", "SERVER MEMBERS INTENT" et "MESSAGE CONTENT INTENT". Si votre bot n'est pas vérifié, il faut simplement activer le bouton. Sinon, voici quelques ressources pour activer les intents : [Discords FAQ](https://dis.gd/gwupdate), [Discord Support](https://dis.gd/contact).

Une fois votre application et bot créés, vous devez récupérer le token du bot ("TOKEN") ainsi que l'ID de l'application ("APPLICATION ID").

### Invitation du bot

Pour inviter le bot sur un serveur, il faut créer un lien d'invitation. Il est nécessaire d'avoir l'ID du client. Voici le lien type utilisé pour ce bot : `https://discord.com/oauth2/authorize?client_id=INSERT_CLIENT_ID_HERE&permissions=8&scope=bot%20applications.commands`.

> Remplacez `INSERT_CLIENT_ID_HERE` par l'ID de votre application.

> `permissions=8` correspond aux permissions d'invitation du bot. Vous pouvez modifier le code des permissions avec un [calculateur de permissions](https://discordapi.com/permissions.html). `8` accorde au bot la permission administrateur. Veuillez noter qu'il est nécessaire d'avoir [l'authentification à deux facteurs](https://support.discord.com/hc/fr/articles/219576828-Mise-en-place-de-l-authentification-%C3%A0-deux-facteurs) activée sur le compte du propriétaire du bot pour utiliser les permissions suivantes : Manage Channels, Manage Roles, Manage Messages.

### Configuration du bot

La configuration du serveur doit être totalement effectuée afin que le bot puisse fonctionner correctement.

Cela s'effectue de la façon suivante avec la commande `/setup` :
* `/setup view` : voir la configuration du serveur
* `/setup rich-presence-text` : texte de présence du bot (facultatif)
* `/setup timeout-join` : temps du @Pas de blabla (`30m` par défaut)
* `/setup commands-prefix` : préfixe des commandes personnalisées (`!` par défaut)
* `/setup leave-join-channel` : salon départs-arrivées
* `/setup report-channel` : salon signalements
* `/setup logs-messages-channel` : salon logs messages
* `/setup logs-bans-channel` : salon logs bans
* `/setup logs-roles-channel` : salon logs rôles
* `/setup mediation-channel` : salon médiation
* `/setup config-channel` : salon config
* `/setup upgrade-channel` : salon upgrade
* `/setup blabla-channel` : salon blabla-hs
* `/setup access-channel` : salon acces-aux-canaux
* `/setup member-role` : rôle @Membres
* `/setup join-role` : rôle @Pas de blabla
* `/setup no-entraide-role` : rôle @Pas d'entraide
* `/setup muted-role` : rôle @Muted
* `/setup staff-editeurs-role` : rôle @STAFF éditeurs
* `/setup modo-role` : rôle @Modos
* `/setup certif-role` : rôle @Certifiés
* `/setup voice-channels` : salons vocaux ("créer-ton-vocal")
* `/setup no-logs-channels` : salons no-logs messages (facultatif)
* `/setup no-text-channels` : salons no-text messages (facultatif)
* `/setup threads-channels` : salons threads auto (facultatif)
* `/setup feur-channels` : salons avec réaction :feur: autorisée (facultatif)

Lorsqu'il est possible d'y entrer plusieurs IDs, ceux-ci doivent être séparés par des virgules, comme suit : `123456789012345678,123456789012345678,123456789012345678`

## Setup en production

L'application est capable de tourner sous plusieurs environnements :

- n'importe quel environnement avec Node.js d'installé
- dans un container Docker avec Docker Compose

### Setup avec Node.js

#### Prérequis

1. Il est nécessaire d'avoir [Node.js](https://nodejs.org/fr) v18.7.0 ou plus récent d'installé sur votre machine.

	> Utilisez la commande `node -v` pour vous assurez que Node est bien installé et que sa version est suffisante.

2. Téléchargez le code de l'application sur votre machine. _cf. [Télécharger le code de l'application sur votre machine](#download)_

3. Il faut au préalable installer les dépendances de l'application avant de lancer celle-ci en utilisant la commande `npm i`.

	> Toutes les dépendances vont être installées, y compris celles prévues pour les développeurs, car le package [dotenv](https://www.npmjs.com/package/dotenv) est nécessaire. Ci toutefois vous avez appliqué les variables d'environnement à l'application par vos propres moyens, seule la commande `npm i --production` est nécessaire.

4. Renommez le fichier `bot.example.env` en `bot.env`, puis modifiez les variables d'environnement pour que l'application fonctionne correctement. _cf. [Variables d'environnement](#environnement)_

5. Renommez le fichier `config.example.json` en `config.json`, puis modifiez les variables d'environnement pour que l'application fonctionne correctement. _cf. [Variables d'environnement](#environnement)_

6. Renommez le fichier `reactionRoleConfig.example.json` en `reactionRoleConfig.json`, puis modifiez son contenu pour que le système fonctionne correctement. _cf. [Variables d'environnement](#environnement)_

7. Renommez le fichier `banEmotesAtJoin.example.json` en `banEmotesAtJoin.json`, puis modifiez son contenu pour que le système fonctionne correctement. _cf. [Variables d'environnement](#environnement)_

#### Lancement et arrêt de l'application

-   Vous pouvez utiliser `npm start` pour lancer l'application.

-   Vous pouvez utiliser la combinaison de touches `Ctrl + C` ou fermer la fenêtre de commandes pour tuer l'application.

> Vous pouvez utiliser un gestionnaire d'application comme [PM2](https://pm2.keymetrics.io) pour faciliter la gestion de l'application. _cf. [Managing your bot process with PM2](https://discordjs.guide/improving-dev-environment/pm2.html)_


### Setup dans un container avec Docker et Docker Compose

#### Prérequis

1. Il est nécessaire d'avoir [Docker](https://docs.docker.com/get-docker) ainsi que [Docker Compose](https://docs.docker.com/compose/install) d'installé.
	> Utilisez les commandes `docker -v` et `docker-compose -v` pour vérifier que les deux applications soient bien installées.

2. Créez les fichiers `bot.env`, `config.json`, `reactionRoleConfig.json` et `banEmotesAtJoin.json` dans le dossier `config` ainsi que le fichier `docker-compose.yml` dans le dossier `docker` :
	```bash
	mdkir config
	cd config
	touch bot.env config.json reactionRoleConfig.json banEmotesAtJoin.json
	cd ..
	mkdir docker
	touch docker-compose.yml
	```

   - Configurez le fichier `bot.env` en ajoutant les variables d'environnement pour que l'application fonctionne correctement. _cf. [Variables d'environnement](#environnement)_

   - Configurez le fichier `config.json` en ajoutant les variables d'environnement pour que l'application fonctionne correctement. _cf. [Variables d'environnement](#environnement)_

   - Configurez le fichier `reactionRoleConfig.json`, puis modifiez le fichier pour que le système fonctionne correctement. _cf. [Configuration du sytème de réactions / rôles](#reaction)_

   - Configurez le fichier `banEmotesAtJoin.json`, puis modifiez le fichier pour que le système fonctionne correctement. _cf. [Configuration du sytème de réactions / rôles](#reaction)_

   - Copiez le contenu du fichier [docker/docker-compose.yml](docker/docker-compose.yml) dans le fichier du même emplacement sur votre machine. Il correspond au fichier de configuration pour `docker-compose`.

> La structure des dossiers et fichiers devrait ressembler à ça :
> ```
> .
> ├── config
> │   ├── bot.env
> │   ├── config.json
> │   ├── reactionRoleConfig.json
> │   └── banEmotesAtJoin.json
> └── docker
> 	  └── docker-compose.yml
> ```

#### Lancement de l'application

-   Vous pouvez utiliser les commandes `docker pull ctrlfdocker/userbot:latest` puis `docker-compose -f ./docker/docker-compose.yml up -d` pour lancer l'application.

> docker pull va télécharger ou mettre à jour si besoin l'image de l'application hébergée sur [Docker Hub](https://hub.docker.com/repository/docker/ctrlfdocker/userbot). Le tag ici est `latest` ce qui correspond, de fait, au code présent sur la branche [master](https://github.com/Association-CTRL-F/UserBot/tree/master). Vous pouvez spécifier une version spécifique comme par exemple `8.0.0`. _cf. [liste des tags disponibles](https://hub.docker.com/repository/registry-1.docker.io/ctrlfdocker/userbot/tags?page=1) ainsi que leur [version correspondante](https://github.com/Association-CTRL-F/UserBot/releases)_

> docker-compose va lancer le container avec les règles définies dans `docker-compose.yml`.

> Pour plus d'infos sur les technologies liées à Docker utilisées ici, vous pouvez consulter leur [documentation](https://docs.docker.com/reference) ou leur [manuel](https://docs.docker.com/engine).

#### Arrêt de l'application

-   Vous pouvez utiliser la commande `docker-compose -f ./docker/docker-compose.yml stop` pour stopper le container. Pour le supprimer, utilisez la commande `docker-compose -f ./docker/docker-compose.yml down`.

## Ressources

</details>

<details id='download'>
<summary><b>Télécharger le code de l'application sur votre machine</b></summary>

Vous pouvez télécharger le code de l'application sur votre machine

-   en [clonant le repository](https://docs.github.com/en/free-pro-team@latest/github/creating-cloning-and-archiving-repositories/cloning-a-repository)
-   ou en téléchargeant le code source

</details>

<details id='environnement'>
<summary><b>Variables d'environnement</b></summary>

Le bot repose sur les variables d'environnement pour pouvoir fonctionner.

#### Fichier bot.env

> Exemple disponible [ici](config/env/bot.example.env) :
> ```env
> DISCORD_TOKEN=""
> DB_HOST=""
> DB_USER=""
> DB_PASS=""
> DB_NAME_URLS_API=""
> DB_NAME_USERBOT=""
> JOKE_TOKEN=""
> OPEN_AI_KEY=""
> ```

| Variable           | Description                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| DISCORD_TOKEN      | [Token secret du bot Discord](https://discordjs.guide/preparations/setting-up-a-bot-application.html#your-token) |
| DB_HOST            | Serveur MySQL                                                                                                    |
| DB_USER            | Nom d'utilisateur MySQL                                                                                          |
| DB_PASS            | Mot de passe MySQL                                                                                               |
| DB_NAME_URLS_API   | Base de données des URLs courtes                                                                                 |
| DB_NAME_USERBOT    | Base de données du bot                                                                                           |
| JOKE_TOKEN         | Token de l'API blagues-api                                                                                       |
| OPEN_AI_KEY        | Clé API de l'API ChatGPT                                                                                         |

> Pour pouvoir récupérer les identifiants (ID) sur Discord, il faut [activer le mode développeur](https://support.discord.com/hc/fr/articles/206346498-O%C3%B9-trouver-l-ID-de-mon-compte-utilisateur-serveur-message).

</details>

</details>

<details id='reaction'>
<summary><b>Configuration du sytème de réactions / rôles</b></summary>

#### Fichier reactionRoleConfig.json

> Exemple disponible [ici](config/env/reactionRoleConfig.example.json) :
> ```js
> [
> 	{
> 		// Salon n°1
> 		"channelID": "123456789123456789",
> 		"messageArray": [
> 			// Message n°1
> 			{
> 				// ID du message
> 				"messageID": "123456789123456789",
> 				// Émoji unicode en clé, objet avec "id" en valeur
> 				"emojiRoleMap": {
> 					"💸": { "id": "123456789123456789" },
> 					"🔧": { "id": "123456789123456789" }
> 				}
> 			},
> 			// Message n°2
> 			{
> 				// ID du message
> 				"messageID": "123456789123456789",
> 				// Émoji unicode en clé, objet avec "id" et giveJoinRole en valeur
> 				"emojiRoleMap": {
> 					"🥵": { "id": "123456789123456789" },
> 					"✅": { "id": "123456789123456789", "giveJoinRole": true }
> 				}
> 			}
> 		]
> 	},
> 	{
> 		"channelID": "123456789123456789",
> 		"messageArray": [
> 			{
> 				"messageID": "123456789123456789",
> 				"emojiRoleMap": {
> 					"123456789123456789": { "id": "123456789123456789" },
> 					"987654321987654321": { "id": "123456789123456789" }
> 				}
> 			},
> 			{
> 				"messageID": "123456789123456789",
> 				"emojiRoleMap": {
> 					"123456789123456789": { "id": "123456789123456789" },
> 					"987654321987654321": { "id": "123456789123456789", "giveJoinRole": true }
> 				}
> 			}
> 		]
> 	}
> ]
> ```

> Pour pouvoir récupérer les identifiants (ID) sur Discord, il faut [activer le mode développeur](https://support.discord.com/hc/fr/articles/206346498-O%C3%B9-trouver-l-ID-de-mon-compte-utilisateur-serveur-message).

> Pour désactiver le système, le fichier doit être composé d'un tableau (array) **vide** :
> ```js
> []
> ```

#### Fichier banEmotesAtJoin.json

> Exemple disponible [ici](config/env/banEmotesAtJoin.example.json) :
> ```js
> [
> 	// Réaction sous forme d'émoji unicode ou son ID, texte de raison
> 	["🔨", "Reason 1"],
> 	["🧹", "Reason 2"],
> 	["123456789123456789", "Reason 3"],
> 	["123456789123456789", "Reason 4"]
> ]
> ```

-  Pour récupérer les émojis :
   - unicode : mettre un `\` avant l'émoji. Exemple : pour `:white_check_mark:`, l'émoji unicode est `✅`.
   - personnalisés : mettre un `\` avant l'émoji et récupérer l'ID. Exemple : pour `\<:lul:719519281682972703>`, l'ID est `719519281682972703`.

</details>