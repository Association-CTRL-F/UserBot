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

	// Acquisition de la base de données
	const bdd = await db(client, 'userbot')
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition de la guild
	const guild = await client.guilds.fetch(client.config.guildID)
	if (!guild) return console.log("Une erreur est survenue lors de l'acquisition de la guild")

	// Acquisition du rôle muted
	const mutedRole = client.config.mutedRoleID
	if (!mutedRole)
		return console.log("Une erreur est survenue lors de l'acquisition du rôle muted")

	// Boucle mutes //

	// Acquisition des mutes depuis la base de données
	let mutes = []
	try {
		const sqlCheckMute = 'SELECT * FROM mute'
		const [resultsCheckMute] = await bdd.execute(sqlCheckMute)
		mutes = resultsCheckMute
	} catch (error) {
		return console.error(error)
	}

	// Lecture du message d'unmute
	let unmuteDM = ''
	try {
		const sqlSelectUnmute = 'SELECT * FROM forms WHERE name = ?'
		const dataSelectUnmute = ['unmute']
		const [resultSelectUnmute] = await bdd.execute(sqlSelectUnmute, dataSelectUnmute)
		unmuteDM = resultSelectUnmute[0].content
	} catch (error) {
		return console.error(error)
	}

	if (mutes)
		mutes.forEach(async mutedMember => {
			// Acquisition du membre
			const member = guild.members.cache.get(mutedMember.discordID)
			if (!member) return

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
				let deletedMute = {}
				try {
					const sqlDeleteMute = 'DELETE FROM mute WHERE discordID = ?'
					const dataDeleteMute = [member.id]
					const [resultDeleteMute] = await bdd.execute(sqlDeleteMute, dataDeleteMute)
					deletedMute = resultDeleteMute
				} catch (error) {
					return console.error(error)
				}

				// Si pas d'erreur, envoi du message privé
				if (deletedMute.affectedRows === 1)
					return member
						.send({
							embeds: [
								{
									color: '#C27C0E',
									title: 'Mute terminé',
									description: unmuteDM,
									author: {
										name: guild.name,
										icon_url: guild.iconURL({
											dynamic: true,
										}),
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
					let deletedMute = {}
					try {
						const sqlDeleteMute = 'DELETE FROM mute WHERE discordID = ?'
						const dataDeleteMute = [member.id]
						const [resultDeleteMute] = await bdd.execute(sqlDeleteMute, dataDeleteMute)
						deletedMute = resultDeleteMute
					} catch (error) {
						return console.error(error)
					}

					// Si pas d'erreur, envoi du message privé
					if (deletedMute.affectedRows === 1)
						return member
							.send({
								embeds: [
									{
										color: '#C27C0E',
										title: 'Mute terminé',
										description: unmuteDM,
										author: {
											name: guild.name,
											icon_url: guild.iconURL({
												dynamic: true,
											}),
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

	// Boucle rappels //

	// Acquisition des rappels depuis la base de données
	let reminders = []
	try {
		const sqlCheckReminders = 'SELECT * FROM reminders'
		const [resultCheckReminders] = await bdd.execute(sqlCheckReminders)
		reminders = resultCheckReminders
	} catch (error) {
		return console.error(error)
	}

	if (reminders)
		reminders.forEach(async reminder => {
			// Acquisition du membre
			const member = guild.members.cache.get(reminder.discordID)
			if (!member) return

			// Si le rappel est expiré alors on supprime en base de données
			// et on envoi le message privé
			if (reminder.timestampEnd - Math.round(Date.now() / 1000) <= 0) {
				// Suppression du rappel en base de données
				let deletedReminder = {}
				try {
					const sqlDeleteReminder = 'DELETE FROM reminders WHERE discordID = ?'
					const dataDeleteReminder = [member.id]
					const [resultDelete] = await bdd.execute(sqlDeleteReminder, dataDeleteReminder)
					deletedReminder = resultDelete
				} catch (error) {
					return console.error(error)
				}

				// Envoi du rappel en message privé
				if (deletedReminder.affectedRows === 1)
					return member
						.send({
							content: `Rappel : ${reminder.reminder}`,
						})
						.catch(error => {
							console.error(error)
							return error
						})
			}

			// Sinon on réactive le timeout et on supprime en base de données
			// puis on envoi le message privé
			setTimeout(async () => {
				let deletedReminder = {}
				try {
					// Suppression du rappel en base de données
					const sqlDeleteReminder = 'DELETE FROM reminders WHERE discordID = ?'
					const dataDeleteReminder = [member.id]
					const [resultDelete] = await bdd.execute(sqlDeleteReminder, dataDeleteReminder)
					deletedReminder = resultDelete
				} catch (error) {
					return console.error(error)
				}

				// Envoi du rappel en message privé
				if (deletedReminder.affectedRows === 1)
					return member
						.send({
							content: `Rappel : ${reminder.reminder}`,
						})
						.catch(error => {
							console.error(error)
							return error
						})
			}, (reminder.timestampEnd - Math.round(Date.now() / 1000)) * 1000)
		})

	// Boucle @Pas de blabla //

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
