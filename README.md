# UserBot

Bot du serveur Discord d'Entraide Informatique - Capetlevrai

## Configuration

Vous devez tout d'abord inviter le bot sur votre serveur avec le lien suivant : https://lien.ctrl-f.io/InviteUserBot (le mot de passe n'est donné qu'aux modérateurs du serveur de Capet).

La configuration du serveur doit être totalement effectuée afin que le bot puisse fonctionner, celui-ci affiche un message d'erreur vous invitant à la terminer le cas échéant. La timezone est définie sur `Europe/Paris` et n'est pas modifiable.

Cela s'effectue de la façon suivante avec la commande `/setup` :
* `/setup view` : voir la configuration du serveur
* `/setup commands-prefix` : préfixe des commandes personnalisées (`!` par défaut)
* `/setup leave-join-channel` : salon départs-arrivées
* `/setup report-channel` : salon signalements
* `/setup logs-messages-channel` : salon logs messages
* `/setup logs-bans-channel` : salon logs bans
* `/setup join-role` : rôle Pas de blabla
* `/setup timeout-join` : timeout rôle Pas de blabla (`30m` par défaut)
* `/setup muted-role` : rôle Muted
* `/setup tribunal-channel` : salon tribunal
* `/setup config-channel` : salon config
* `/setup upgrade-channel` : salon upgrade
* `/setup blabla-channel` : salon blabla-hs
* `/setup voice-channels` : salons vocaux "créer-ton-vocal"
* `/setup no-logs-channels` : salons no-logs messages
* `/setup no-text-channels` : salons no-text messages
* `/setup threads-channels` : salons threads auto
* `/setup staff-roles` : rôles staff

Lorsqu'il est possible d'y entrer plusieurs IDs, ceux-ci doivent être séparés par des virgules, comme suit : `123456789012345678,123456789012345678,123456789012345678`

Les seules options facultatives sont `no-logs messages`, `no-text-channels` et `threads-channels` où il est possible d'y entrer `NULL` afin de supprimer la configuration existante.
