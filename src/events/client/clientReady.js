import mutes from './mutesLoader.js'
import reminders from './remindersLoader.js'
import giveaways from './giveawaysLoader.js'
import voiceChannels from './voiceChannelsLoader.js'
import noSpeak from './noSpeakLoader.js'
import serverLoader from './serverLoader.js'
import { ActivityType } from 'discord.js'

export default async (client) => {
	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd) {
		console.log('Une erreur est survenue lors de la connexion à la base de données')
		return
	}

	// Acquisition de la guild
	let guild = null
	try {
		guild = await client.guilds.fetch(client.config.guild.GUILD_ID)
	} catch (error) {
		console.error(error)
		console.log("Une erreur est survenue lors de l'acquisition de la guild")
		return
	}

	if (!guild) {
		console.log("Une erreur est survenue lors de l'acquisition de la guild")
		return
	}

	// Mise en place du système de réaction / rôle
	// et réactivation ou désactivation des
	// mutes, rappels, giveaways, vocaux
	const loadersResults = await Promise.allSettled([
		mutes(client, bdd, guild),
		reminders(bdd, guild),
		giveaways(bdd, guild),
		voiceChannels(client, bdd, guild),
	])

	for (const result of loadersResults) {
		if (result.status === 'rejected') {
			console.error(result.reason)
		}
	}

	// Mise en place du @Pas de blabla
	await Promise.resolve(noSpeak(client, guild)).catch(console.error)

	// Lancement du serveur
	await Promise.resolve(serverLoader(client)).catch(console.error)

	// Rich presence
	const richPresenceText = client.config.bot.richPresenceText

	if (client.user) {
		if (richPresenceText && richPresenceText.trim() !== '') {
			client.user.setPresence({
				activities: [
					{
						name: richPresenceText,
						type: ActivityType.Playing,
					},
				],
				status: 'online',
			})
		} else {
			client.user.setPresence({
				activities: [],
				status: 'online',
			})
		}
	}
}
