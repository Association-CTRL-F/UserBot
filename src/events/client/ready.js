/* eslint-disable no-await-in-loop */
import { readFile } from 'fs/promises'
import { db } from '../../util/util.js'
import { Constants } from 'discord.js'
import ms from 'ms'

export const once = true

export default async client => {
	console.log('The client is ready to start working')

	// Lecture et en place du système de réactions
	// puis ajout des émojis (peut prendre du temps)
	const reactionRoleConfig = JSON.parse(await readFile('./config/reactionRoleConfig.json'))
	client.reactionRoleMap = new Map()

	// Pour chaque salon
	for (const { channelID, messageArray } of reactionRoleConfig) {
		// Fetch du salon
		const channel = await client.channels.fetch(channelID)
		// Pour chaque message / réaction
		for (const { messageID, emojiRoleMap } of messageArray) {
			// Ajout dans la map pour être utilisé dans les events
			client.reactionRoleMap.set(messageID, emojiRoleMap)
			// Fetch du message
			const message = await channel.messages.fetch(messageID)
			// Ajout des émojis sur le message
			for (const emoji of Object.keys(emojiRoleMap)) await message.react(emoji)
		}
	}

	console.log('Startup finished !')

	if (client.config.richPresenceText && client.config.richPresenceText !== '')
		await client.user.setPresence({
			activities: [
				{
					name: client.config.richPresenceText,
					type: 'PLAYING',
				},
			],
			status: 'online',
		})
	else await client.user.setPresence({ activities: [], status: 'online' })

	// Réactivation ou désactivation des mutes / rappels
	// s'il y en avait en fonction des durées

	const guild = await client.guilds.fetch(client.config.guildID)

	// Acquisition de la base de données
	const bdd = await db(client, 'userbot')
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition du rôle muted
	const mutedRole = client.config.mutedRoleID

	// Acquisition des mutes depuis la base de données
	const sqlCheckMute = 'SELECT * FROM mute'
	const [resultsCheckMute] = await bdd.execute(sqlCheckMute)

	// Lecture du message d'unmute
	const unmuteDM = await readFile('./forms/unmute.md', { encoding: 'utf8' })

	// Boucle mutes
	resultsCheckMute.forEach(async mutedMember => {
		// Acquisition du membre
		const member = guild.members.cache.get(mutedMember.discordID)

		// Si le membre a le rôle muted et que le temps du mute est expiré
		// alors on retire le rôle muted et on supprime en base de données
		if (
			member.roles.cache.has(mutedRole) &&
			mutedMember.timestampEnd - Math.round(Date.now() / 1000) <= 0
		) {
			member.roles.remove(mutedRole).catch(error => {
				console.error(error)
				return error
			})

			// Suppression du mute en base de données
			const sqlDeleteMute = 'DELETE FROM mute WHERE discordID = ?'
			const dataDeleteMute = [member.id]
			const [resultDeleteMute] = await bdd.execute(sqlDeleteMute, dataDeleteMute)

			// Si pas d'erreur, envoi du message privé
			if (resultDeleteMute)
				member
					.send({
						embeds: [
							{
								color: '#C27C0E',
								title: 'Mute terminé',
								description: unmuteDM,
								author: {
									name: guild.name,
									icon_url: guild.iconURL({ dynamic: true }),
									url: guild.vanityURL,
								},
							},
						],
					})
					.catch(error => {
						console.error(error)
						return error
					})
		} else {
			// Sinon on réactive le timeout et on supprime
			// le rôle muted après le temps écoulé
			// puis on envoi le message privé
			const removeRole = async () => {
				member.roles.remove(mutedRole).catch(error => {
					console.error(error)
					return error
				})

				// Suppression du mute en base de données
				const sqlDeleteMute = 'DELETE FROM mute WHERE discordID = ?'
				const dataDeleteMute = [member.id]
				const [resultDeleteMute] = await bdd.execute(sqlDeleteMute, dataDeleteMute)

				// Si pas d'erreur, envoi du message privé
				if (resultDeleteMute)
					member
						.send({
							embeds: [
								{
									color: '#C27C0E',
									title: 'Mute terminé',
									description: unmuteDM,
									author: {
										name: guild.name,
										icon_url: guild.iconURL({ dynamic: true }),
										url: guild.vanityURL,
									},
								},
							],
						})
						.catch(error => {
							console.error(error)
							return error
						})
			}

			// Redéfinition du timeout
			setTimeout(
				removeRole,
				(mutedMember.timestampEnd - Math.round(Date.now() / 1000)) * 1000,
			)
		}
	})

	// Acquisition des rappels depuis la base de données
	const sqlCheckReminders = 'SELECT * FROM reminders'
	const [resultsReminders] = await bdd.execute(sqlCheckReminders)

	// Boucle rappels
	resultsReminders.forEach(async reminder => {
		// Acquisition du membre
		const member = guild.members.cache.get(reminder.discordID)

		// Si le rappel est expiré alors on supprime en base de données
		// et on envoi le message privé
		if (reminder.timestampEnd - Math.round(Date.now() / 1000) <= 0)
			// Suppression du rappel en base de données
			try {
				const sqlDeleteReminder = 'DELETE FROM reminders WHERE discordID = ?'
				const dataDeleteReminder = [member.id]
				const [resultDeleteReminder] = await bdd.execute(
					sqlDeleteReminder,
					dataDeleteReminder,
				)

				// Si erreur
				if (!resultDeleteReminder)
					return console.log(
						'Une erreur est survenue lors de la suppression du rappel dans la base de données',
					)

				// Sinon, envoi du rappel en message privé
				return member
					.send({
						content: `Rappel : ${reminder.reminder}`,
					})
					.catch(error => {
						console.error(error)
						return error
					})
			} catch {
				return console.log(
					'Une erreur est survenue lors de la suppression du rappel dans la base de données',
				)
			}

		// Sinon on réactive le timeout et on supprime en base de données
		// puis on envoi le message privé
		setTimeout(async () => {
			try {
				// Suppression du rappel en base de données
				const sqlDeleteReminder = 'DELETE FROM reminders WHERE discordID = ?'
				const dataDeleteReminder = [member.id]
				const [resultDeleteReminder] = await bdd.execute(
					sqlDeleteReminder,
					dataDeleteReminder,
				)

				// Si erreur
				if (!resultDeleteReminder)
					return console.log(
						'Une erreur est survenue lors de la suppression du rappel dans la base de données',
					)

				// Sinon, envoi du rappel en message privé
				return member
					.send({
						content: `Rappel : ${reminder.reminder}`,
					})
					.catch(error => {
						console.error(error)
						return error
					})
			} catch {
				return console.log(
					'Une erreur est survenue lors de la suppression du rappel dans la base de données',
				)
			}
		}, (reminder.timestampEnd - Math.round(Date.now() / 1000)) * 1000)
	})

	// Boucle @Pas de blabla
	const joinRole = client.config.joinRoleID
	const timeoutJoin = client.config.timeoutJoin

	guild.roles.cache.get(joinRole).members.map(async noblablaMember => {
		const diff = new Date() - noblablaMember.joinedAt
		const minutesPresence = Math.floor((diff / (1000 * 60 * 60 * 24 * 30.4375)) * 43800)
		const msPresence = minutesPresence * 60000

		if (msPresence > ms(timeoutJoin))
			await noblablaMember.roles.remove(joinRole).catch(error => {
				if (error.code !== Constants.APIErrors.UNKNOWN_MEMBER) throw error
			})

		setTimeout(
			() =>
				noblablaMember.roles.remove(joinRole).catch(error => {
					if (error.code !== Constants.APIErrors.UNKNOWN_MEMBER) throw error
				}),
			ms(timeoutJoin),
		)
	})
}
