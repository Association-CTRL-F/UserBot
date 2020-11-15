const { readdir } = require('fs').promises
const { Client, Collection } = require('discord.js')

module.exports = {
	client: {
		// Création du client et de ses propriétés
		prepare: () => {
			const client = new Client({
				partials: ['GUILD_MEMBER', 'MESSAGE', 'REACTION'],
				ws: {
					intents: [
						'GUILDS',
						'GUILD_MEMBERS',
						'GUILD_PRESENCES',
						'GUILD_MESSAGES',
						'GUILD_MESSAGE_REACTIONS',
						'DIRECT_MESSAGES',
					],
				},
			})
			client.commands = new Collection()
			client.cooldowns = new Collection()
			client.config = {
				prefix: process.env.PREFIX,
				guildID: process.env.GUILD_ID,
				reportChannelID: process.env.REPORT_CHANNEL,
				leaveJoinChannelID: process.env.LEAVE_JOIN_CHANNEL_ID,
				logsChannelID: process.env.LOGS_CHANNEL,
			}
			client.cache = {
				// Messages supprimés par la bot pour ne pas
				// les log lors de l'event "messageDelete"
				deleteMessagesID: new Set(),
			}
			// Map utilisé pour la commande "roles"
			client.commandsCategories = new Map()

			return client
		},

		// Connecte le client en utilisant le token
		login: client => client.login(process.env.DISCORD_TOKEN),
	},

	// Chargement des commandes
	commands: async client => {
		const commandsDir = await readdir('./src/commands')
		commandsDir.forEach(async commandCategory => {
			const commands = (await readdir(`./src/commands/${commandCategory}`)).filter(file =>
				file.endsWith('.js'),
			)
			client.commandsCategories.set(
				commandCategory,
				commands.map(commandName => {
					const commandArr = commandName.split('.')
					commandArr.pop()
					return commandArr.join('.')
				}),
			)
			commands.forEach(commandFile => {
				const command = require(`../commands/${commandCategory}/${commandFile}`)
				if (command.isEnabled) client.commands.set(command.name, command)
			})
		})
	},

	// Chargement des events
	events: async client => {
		const eventsDir = await readdir('./src/events')
		eventsDir.forEach(async eventCategory => {
			const events = (await readdir(`./src/events/${eventCategory}`)).filter(file =>
				file.endsWith('.js'),
			)
			events.forEach(eventFile => {
				const event = require(`../events/${eventCategory}/${eventFile}`)
				const eventName = eventFile.split('.')[0]
				client.on(eventName, event.bind(null, client))
			})
		})
	},
}
