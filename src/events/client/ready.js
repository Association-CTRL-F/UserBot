import reactionRole from './reactionRoleLoader.js'
import mutes from './mutesLoader.js'
import reminders from './remindersLoader.js'
import giveaways from './giveawaysLoader.js'
import voiceChannels from './voiceChannelsLoader.js'
import noSpeak from './noSpeakLoader.js'
import gpus from './gpusLoader.js'

export default async client => {
	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition de la guild
	const guild = await client.guilds.fetch(client.config.guild.GUILD_ID)
	if (!guild) return console.log(`Une erreur est survenue lors de l'acquisition de la guild`)

	// Mise en place du système de réaction / rôle
	// et réactivation ou désactivation des
	// mutes, rappels, giveaways, vocaux
	await Promise.all([
		reactionRole(client),
		mutes(client, bdd, guild),
		reminders(bdd, guild),
		giveaways(bdd, guild),
		voiceChannels(client, bdd, guild),
	])

	// Mise en place du @Pas de blabla
	noSpeak(client, guild)

	// Alertes Nvidia
	gpus(guild)

	// Rich presence
	const richPresenceText = client.config.bot.richPresenceText
	if (richPresenceText && richPresenceText !== '')
		await client.user.setPresence({
			activities: [
				{
					name: richPresenceText,
					type: 0,
				},
			],
			status: 'online',
		})
	else await client.user.setPresence({ activities: [], status: 'online' })
}
