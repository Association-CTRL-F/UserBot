import { EmbedBuilder, Collection } from 'discord.js'
import { pluralize } from '../../util/util.js'

export default async (bdd, guild) => {
	// Acquisition des giveaways depuis la base de données
	let giveaways = []

	try {
		const sql = 'SELECT * FROM giveaways'
		const [result] = await bdd.execute(sql)
		giveaways = result ?? []
	} catch (error) {
		console.error(error)
		return
	}

	if (!giveaways.length) return

	for (const giveaway of giveaways) {
		// Vérification si le tirage est déjà lancé
		if (giveaway.started === 0 || giveaway.ended === 1) continue

		const giveawayChannel = guild.channels.cache.get(giveaway.channel)
		if (!giveawayChannel || !giveawayChannel.isTextBased()) {
			try {
				const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
				const data = [1, giveaway.id]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
			}
			continue
		}

		const sentMessage = await giveawayChannel.messages
			.fetch(giveaway.messageId)
			.catch(() => null)

		if (!sentMessage) {
			try {
				const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
				const data = [1, giveaway.id]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
			}
			continue
		}

		const organisator = await guild.members.fetch(giveaway.hostedBy).catch(() => null)

		const delayMs = Math.max(0, (giveaway.timestampEnd - Math.round(Date.now() / 1000)) * 1000)

		const timeout = globalThis.setTimeout(async () => {
			let excludedIds = giveaway.excludedIds ?? ''
			let winnersTirageString = ''

			const excludedIdsArray = excludedIds
				.split(',')
				.map((id) => id.trim())
				.filter(Boolean)

			const reaction = sentMessage.reactions.cache.get('🎉')

			let usersReactions = new Collection()
			if (reaction) {
				usersReactions = await reaction.users.fetch().catch((error) => {
					console.error(error)
					return new Collection()
				})
			}

			const eligibleUsers = usersReactions.filter(
				(user) => !user.bot && !excludedIdsArray.includes(user.id),
			)

			const winners = []
			let winnersCount = 0

			while (winnersCount < giveaway.winnersCount) {
				const winnerTirage = eligibleUsers.random()
				if (!winnerTirage) break

				winners.push(winnerTirage)
				excludedIdsArray.push(winnerTirage.id)
				eligibleUsers.delete(winnerTirage.id)
				winnersCount += 1
			}

			excludedIds = excludedIdsArray.join(',')
			winnersTirageString = winners.map((winner) => `${winner}`).join(', ')

			try {
				const sql = 'UPDATE giveaways SET excludedIds = ?, ended = ? WHERE id = ?'
				const data = [excludedIds, 1, giveaway.id]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
				return
			}

			// Modification de l'embed
			const embedWin = new EmbedBuilder()
				.setColor(0xbb2528)
				.setTitle('🎁 GIVEAWAY 🎁')
				.addFields(
					{
						name: 'Organisateur',
						value: organisator
							? organisator.user.toString()
							: `<@${giveaway.hostedBy}>`,
					},
					{
						name: 'Prix',
						value: giveaway.prize,
					},
				)

			if (!winners.length) {
				embedWin.addFields({
					name: '0 gagnant',
					value: 'Pas de participants',
				})

				await sentMessage.edit({ embeds: [embedWin] }).catch(console.error)

				await sentMessage
					.reply({
						content: '🎉 Giveaway terminé, aucun participant enregistré !',
					})
					.catch(console.error)

				return
			}

			embedWin.addFields({
				name: pluralize('gagnant', winnersCount),
				value: winnersTirageString,
			})

			if (winnersCount < giveaway.winnersCount) {
				embedWin.setDescription(
					'Le nombre de participants était inférieur au nombre de gagnants défini.',
				)
			}

			await sentMessage.edit({ embeds: [embedWin] }).catch(console.error)

			if (winnersCount > 1) {
				await sentMessage
					.reply({
						content: `🎉 Félicitations à nos gagnants : ${winnersTirageString} !`,
					})
					.catch(console.error)
			} else {
				await sentMessage
					.reply({
						content: `🎉 Félicitations à notre gagnant : ${winnersTirageString} !`,
					})
					.catch(console.error)
			}
		}, delayMs)

		try {
			const sql = 'UPDATE giveaways SET timeoutId = ? WHERE id = ?'
			const data = [Number(timeout), giveaway.id]
			await bdd.execute(sql, data)
		} catch (error) {
			console.error(error)
		}
	}
}
