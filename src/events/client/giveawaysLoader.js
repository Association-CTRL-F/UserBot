/* eslint-disable no-await-in-loop */
import { EmbedBuilder } from 'discord.js'
import { pluralize } from '../../util/util.js'

export default async (bdd, guild) => {
	// Acquisition des giveaways depuis la base de données
	let giveaways = []
	try {
		const sql = 'SELECT * FROM giveaways'
		const [result] = await bdd.execute(sql)
		giveaways = result
	} catch (error) {
		return console.error(error)
	}

	if (giveaways)
		giveaways.forEach(async giveaway => {
			// Vérification si le tirage est déjà lancé
			if (giveaway.started === 0 || giveaway.ended === 1) return

			const sentMessage = await guild.channels.cache
				.get(giveaway.channel)
				.messages.fetch(giveaway.messageId)
				.catch(() => false)

			if (!sentMessage) {
				try {
					const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
					const data = [1, giveaway.id]
					await bdd.execute(sql, data)
				} catch (error) {
					return console.log(error)
				}

				return
			}

			const organisator = await guild.members.fetch(giveaway.hostedBy)

			const timeout = setTimeout(async () => {
				let excludedIds = giveaway.excludedIds
				let winnersTirageString = ''
				let usersReactions = {}

				try {
					usersReactions = await sentMessage.reactions.cache.get('🎉').users.fetch()
				} catch (error) {
					return console.log(error)
				}

				const excludedIdsArray = giveaway.excludedIds.split(',')

				let i = 0
				if (usersReactions.size > 0) {
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
						} catch (error) {
							return console.log(error)
						}

						i += 1
					}

					winnersTirageString = winnersTirageString.trim().slice(0, -1)
				}

				// Modification de l'embed
				const embedWin = new EmbedBuilder()
					.setColor('#BB2528')
					.setTitle('🎁 GIVEAWAY 🎁')
					.addFields([
						{
							name: 'Organisateur',
							value: organisator.user.toString(),
						},
						{
							name: 'Prix',
							value: giveaway.prize,
						},
					])

				try {
					const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
					const data = [1, giveaway.id]
					await bdd.execute(sql, data)
				} catch (error) {
					return console.log(error)
				}

				if (winnersTirageString === '' || !usersReactions) {
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

			try {
				const sql = 'UPDATE giveaways SET timeoutId = ? WHERE id = ?'
				const data = [Number(timeout), giveaway.id]
				await bdd.execute(sql, data)
			} catch (error) {
				return console.log(error)
			}
		})
}
