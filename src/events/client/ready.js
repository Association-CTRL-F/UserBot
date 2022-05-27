/* eslint-disable no-await-in-loop */
import { readFile } from 'fs/promises'
import { Constants } from 'discord.js'
import { pluralize } from '../../util/util.js'
import ms from 'ms'

export const once = true

export default async client => {
	console.log('The client is ready to start working')

	// Lecture et en place du système de réactions
	// puis ajout des émojis (peut prendre du temps)
	const reactionRoleConfig = JSON.parse(await readFile('./config/env/reactionRoleConfig.json'))
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

	const richPresenceText = client.config.bot.richPresenceText
	if (richPresenceText && richPresenceText !== '')
		await client.user.setPresence({
			activities: [
				{
					name: richPresenceText,
					type: 'PLAYING',
				},
			],
			status: 'online',
		})
	else await client.user.setPresence({ activities: [], status: 'online' })

	// Réactivation ou désactivation des mutes / rappels
	// s'il y en avait en fonction des durées

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition de la guild
	const guild = await client.guilds.fetch(client.config.guild.guildID)
	if (!guild) return console.log("Une erreur est survenue lors de l'acquisition de la guild")

	// Acquisition du rôle muted
	const mutedRole = client.config.guild.roles.mutedRoleID
	if (!mutedRole) return console.log("Il n'y a pas de rôle muted")

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
				parseInt(mutedMember.timestampEnd) <= Math.round(Date.now() / 1000)
			) {
				member.roles.remove(mutedRole).catch(error => {
					console.error(error)
					return error
				})

				// Suppression du mute en base de données
				let deletedMute = {}
				try {
					const sqlDeleteMute =
						'DELETE FROM mute WHERE discordID = ? AND timestampEnd = ?'
					const dataDeleteMute = [member.id, mutedMember.timestampEnd]
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
						const sqlDeleteMute =
							'DELETE FROM mute WHERE discordID = ? AND timestampEnd = ?'
						const dataDeleteMute = [member.id, mutedMember.timestampEnd]
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
			const member = await guild.members.fetch(reminder.discordID)
			if (!member) return

			if (parseInt(reminder.timestampEnd) <= Math.round(Date.now() / 1000)) {
				// Si le rappel est expiré alors on supprime en base de données
				// et on envoi le message privé
				// Suppression du rappel en base de données
				let deletedReminder = {}
				try {
					const sqlDeleteReminder =
						'DELETE FROM reminders WHERE discordID = ? AND timestampEnd = ?'
					const dataDeleteReminder = [member.user.id, reminder.timestampEnd]
					const [resultDelete] = await bdd.execute(sqlDeleteReminder, dataDeleteReminder)
					deletedReminder = resultDelete
				} catch (error) {
					return console.error(error)
				}

				// Envoi du rappel en message privé
				if (deletedReminder.affectedRows === 1) {
					if (reminder.private) {
						const embed = {
							color: '#C27C0E',
							title: 'Rappel',
							description: reminder.reminder,
						}

						return member
							.send({
								embeds: [embed],
							})
							.catch(error => {
								console.error(error)
								return error
							})
					}

					const channel = member.guild.channels.cache.get(reminder.channel)

					return channel
						.send({
							content: `Rappel pour ${member} : ${reminder.reminder}`,
						})
						.catch(error => {
							console.error(error)
							return error
						})
				}
			}

			// Sinon on réactive le timeout et on supprime en base de données
			// puis on envoi le message privé
			setTimeout(async () => {
				let deletedReminder = {}
				try {
					// Suppression du rappel en base de données
					const sqlDeleteReminder =
						'DELETE FROM reminders WHERE discordID = ? AND timestampEnd = ?'
					const dataDeleteReminder = [member.user.id, reminder.timestampEnd]
					const [resultDelete] = await bdd.execute(sqlDeleteReminder, dataDeleteReminder)
					deletedReminder = resultDelete
				} catch (error) {
					return console.error(error)
				}

				// Envoi du rappel en message privé
				if (deletedReminder.affectedRows === 1) {
					if (reminder.private) {
						const embed = {
							color: '#C27C0E',
							title: 'Rappel',
							description: reminder.reminder,
						}

						return member
							.send({
								embeds: [embed],
							})
							.catch(error => {
								console.error(error)
								return error
							})
					}

					const channel = member.guild.channels.cache.get(reminder.channel)

					return channel
						.send({
							content: `Rappel pour ${member} : ${reminder.reminder}`,
						})
						.catch(error => {
							console.error(error)
							return error
						})
				}
			}, (reminder.timestampEnd - Math.round(Date.now() / 1000)) * 1000)
		})

	// Boucle giveaways //

	// Acquisition des giveaways depuis la base de données
	let giveaways = []
	try {
		const sqlCheckGiveaways = 'SELECT * FROM giveaways'
		const [resultCheckGiveaways] = await bdd.execute(sqlCheckGiveaways)
		giveaways = resultCheckGiveaways
	} catch (error) {
		return console.error(error)
	}

	if (giveaways)
		giveaways.forEach(async giveaway => {
			// Vérification si le tirage est déjà lancé
			if (giveaway.started === 0) return

			const sentMessage = await guild.channels.cache
				.get(giveaway.channel)
				.messages.fetch(giveaway.messageId)

			const organisator = await guild.members.fetch(giveaway.hostedBy)

			setTimeout(async () => {
				const usersReactions = await sentMessage.reactions.cache.get('🎉').users.fetch()
				const excludedIdsArray = giveaway.excludedIds.split(',')
				let excludedIds = giveaway.excludedIds
				let winnersTirageString = ''

				let i = 0
				while (i < giveaway.winnersCount) {
					const winnerTirage = await usersReactions
						.filter(user => !user.bot && !excludedIdsArray.includes(user.id))
						.random()

					if (!winnerTirage) break

					winnersTirageString = winnersTirageString.concat(' ', `${winnerTirage},`)
					excludedIds = excludedIds.concat(',', winnerTirage.id)
					usersReactions.sweep(user => user.id === winnerTirage.id)

					try {
						const sql = 'UPDATE giveaways SET excludedIds = ? WHERE id = ?'
						const data = [excludedIds, giveaway.id]
						await bdd.execute(sql, data)
						// eslint-disable-next-line no-empty
					} catch (error) {}

					i += 1
				}

				winnersTirageString = winnersTirageString.trim().slice(0, -1)

				// Modification de l'embed
				const embedWin = {
					color: '#BB2528',
					title: '🎁 GIVEAWAY 🎁',
					fields: [
						{
							name: 'Organisateur',
							value: organisator.user.toString(),
						},
						{
							name: 'Prix',
							value: giveaway.prize,
						},
					],
				}

				if (winnersTirageString === '') {
					embedWin.fields.push({
						name: '0 gagnant',
						value: 'Pas de participants',
					})

					await sentMessage.edit({ embeds: [embedWin] })

					return sentMessage.reply({
						content: `🎉 Giveaway terminé, aucun participant enregistré !`,
					})
				}

				embedWin.fields.push({
					name: pluralize('gagnant', i),
					value: winnersTirageString,
				})

				if (i < giveaway.winnersCount)
					embedWin.description =
						'Le nombre de participants était inférieur au nombre de gagnants défini.'

				await sentMessage.edit({ embeds: [embedWin] })

				return i > 1
					? sentMessage.reply({
							content: `🎉 Félicitations à nos gagnants : ${winnersTirageString} !`,
					  })
					: sentMessage.reply({
							content: `🎉 Félicitations à notre gagnant : ${winnersTirageString} !`,
					  })
			}, (giveaway.timestampEnd - Math.round(Date.now() / 1000)) * 1000)
		})

	// Boucle @Pas de blabla //

	const joinRole = client.config.guild.roles.joinRoleID
	const timeoutJoin = client.config.guild.timeoutJoin

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
