import {
	SlashCommandBuilder,
	EmbedBuilder,
	ChannelType,
	ButtonStyle,
	Collection,
	MessageFlags,
} from 'discord.js'
import { convertDateForDiscord, convertMsToString, pluralize } from '../../util/util.js'
import { Pagination } from 'pagination.djs'
import ms from 'ms'

const MAX_TIMEOUT_MS = 2_147_483_647

const isValidDelay = (delayMs) =>
	typeof delayMs === 'number' &&
	Number.isFinite(delayMs) &&
	delayMs > 0 &&
	delayMs <= MAX_TIMEOUT_MS

const isValidGiveawayChannel = (channel) =>
	channel &&
	channel.isTextBased() &&
	(channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)

const getGiveawayById = async (bdd, id) => {
	const sql = 'SELECT * FROM giveaways WHERE id = ?'
	const data = [id]
	const [result] = await bdd.execute(sql, data)
	return result[0] ?? null
}

const getReactionUsers = async (message) => {
	const reaction = message.reactions.cache.get('🎉')
	if (!reaction) return new Collection()

	return reaction.users.fetch()
}

const drawWinners = ({ users, winnersCount, excludedIdsString }) => {
	const excludedIds = (excludedIdsString ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)

	const eligibleUsers = users.filter((user) => !user.bot && !excludedIds.includes(user.id))
	const winners = []

	while (winners.length < winnersCount) {
		const winner = eligibleUsers.random()
		if (!winner) break

		winners.push(winner)
		excludedIds.push(winner.id)
		eligibleUsers.delete(winner.id)
	}

	return {
		winners,
		excludedIds: excludedIds.join(','),
	}
}

const buildStartEmbed = (hostedBy, prize, winnersCount, timestampEnd) =>
	new EmbedBuilder()
		.setColor('#BB2528')
		.setTitle('🎁 GIVEAWAY 🎁')
		.setDescription('Réagissez avec 🎉 pour participer !')
		.addFields(
			{
				name: 'Organisateur',
				value: `<@${hostedBy}>`,
			},
			{
				name: 'Prix',
				value: prize,
			},
			{
				name: 'Tirage',
				value: convertDateForDiscord(timestampEnd * 1000, true),
			},
			{
				name: winnersCount > 1 ? 'Nombre de gagnants' : 'Nombre de gagnant',
				value: pluralize('gagnant', winnersCount),
			},
		)

const buildEndEmbed = ({ hostedBy, prize, winners, winnersCount }) => {
	const embed = new EmbedBuilder()
		.setColor('#BB2528')
		.setTitle('🎁 GIVEAWAY 🎁')
		.addFields(
			{
				name: 'Organisateur',
				value: `<@${hostedBy}>`,
			},
			{
				name: 'Prix',
				value: prize,
			},
		)

	if (!winners.length) {
		embed.addFields({
			name: '0 gagnant',
			value: 'Aucun participant',
		})

		return embed
	}

	const winnersString = winners.map((winner) => `${winner}`).join(', ')

	embed.addFields({
		name: pluralize('gagnant', winners.length),
		value: winnersString,
	})

	if (winners.length < winnersCount) {
		embed.setDescription(
			'Le nombre de participants était inférieur au nombre de gagnants défini.',
		)
	}

	return embed
}

const finalizeGiveaway = async ({ bdd, giveaway, message, markEnded = true }) => {
	const usersReactions = await getReactionUsers(message)
	const { winners, excludedIds } = drawWinners({
		users: usersReactions,
		winnersCount: giveaway.winnersCount,
		excludedIdsString: giveaway.excludedIds,
	})

	if (markEnded) {
		const sql = 'UPDATE giveaways SET excludedIds = ?, ended = ? WHERE id = ?'
		const data = [excludedIds, 1, giveaway.id]
		await bdd.execute(sql, data)
	} else {
		const sql = 'UPDATE giveaways SET excludedIds = ? WHERE id = ?'
		const data = [excludedIds, giveaway.id]
		await bdd.execute(sql, data)
	}

	const embed = buildEndEmbed({
		hostedBy: giveaway.hostedBy,
		prize: giveaway.prize,
		winners,
		winnersCount: giveaway.winnersCount,
	})

	await message.edit({ embeds: [embed] })

	if (!winners.length) {
		await message.reply({
			content: '🎉 Giveaway terminé, aucun participant enregistré !',
		})

		return {
			winners,
			winnersString: '',
		}
	}

	const winnersString = winners.map((winner) => `${winner}`).join(', ')

	await message.reply({
		content:
			winners.length > 1
				? `🎉 Félicitations à nos gagnants : ${winnersString} !`
				: `🎉 Félicitations à notre gagnant : ${winnersString} !`,
	})

	return {
		winners,
		winnersString,
	}
}

export default {
	data: new SlashCommandBuilder()
		.setName('giveaway')
		.setDescription('Gère les giveaways')
		.addSubcommand((subcommand) =>
			subcommand.setName('view').setDescription('Voir les giveaways non lancés'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Créer un giveaway')
				.addStringOption((option) =>
					option.setName('prix').setDescription('Prix à gagner').setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('gagnants')
						.setDescription('Nombre de gagnants')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('durée')
						.setDescription(
							"Durée du giveaway (précisez l'unité de temps en minutes / heures / jours : 1m, 2h, 3d)",
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('salon')
						.setDescription('ID du salon du giveaway')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('edit')
				.setDescription('Modifier un giveaway')
				.addStringOption((option) =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				)
				.addStringOption((option) =>
					option.setName('prix').setDescription('Prix à gagner').setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('gagnants')
						.setDescription('Nombre de gagnants')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('durée')
						.setDescription(
							"Durée du giveaway (précisez l'unité de temps en minutes / heures / jours : 1m, 2h, 3d)",
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('salon')
						.setDescription('ID du salon du giveaway')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('del')
				.setDescription('Supprimer un giveaway')
				.addStringOption((option) =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('start')
				.setDescription('Lancer un giveaway')
				.addStringOption((option) =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('end')
				.setDescription('Arrêter un giveaway')
				.addStringOption((option) =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('reroll')
				.setDescription("Relancer le tirage d'un giveaway")
				.addStringOption((option) =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				),
		),

	interaction: async (interaction, client) => {
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		const subcommand = interaction.options.getSubcommand()
		const id = interaction.options.getString('id')
		const prize = interaction.options.getString('prix')
		const winners = interaction.options.getInteger('gagnants')
		const duree = interaction.options.getString('durée')
		const channelId = interaction.options.getString('salon')

		let fetchGiveaway = null
		if (!['view', 'create'].includes(subcommand)) {
			try {
				fetchGiveaway = await getGiveawayById(bdd, id)
			} catch (error) {
				console.error(error)
				return interaction.reply({
					content: "Une erreur est survenue lors de l'acquisition du giveaway 😬",
					flags: MessageFlags.Ephemeral,
				})
			}
		}

		switch (subcommand) {
			case 'view': {
				let giveaways = []
				try {
					const sql = 'SELECT * FROM giveaways WHERE started = 0'
					const [result] = await bdd.execute(sql)
					giveaways = result ?? []
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des giveaways 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!giveaways.length) {
					return interaction.reply({
						content: "Aucun giveaway n'a été créé 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				const fieldsEmbedView = giveaways.map((giveaway) => ({
					name: `Giveaway #${giveaway.id}`,
					value: `Prix : ${giveaway.prize}\nDurée : ${convertMsToString(
						ms(giveaway.timestampEnd),
					)}\nSalon : <#${giveaway.channel}>`,
				}))

				const paginationView = new Pagination(interaction, {
					firstEmoji: '⏮',
					prevEmoji: '◀️',
					nextEmoji: '▶️',
					lastEmoji: '⏭',
					limit: 5,
					idle: 120000,
					ephemeral: false,
					prevDescription: '',
					postDescription: '',
					buttonStyle: ButtonStyle.Secondary,
					loop: false,
				})

				paginationView.setTitle('Giveaways')
				paginationView.setDescription(`**Total : ${giveaways.length}**`)
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
				paginationView.paginateFields(true)

				return paginationView.render()
			}

			case 'create': {
				const channel = await interaction.guild.channels.fetch(channelId).catch(() => null)
				if (!channel) {
					return interaction.reply({
						content: "Ce salon n'existe pas 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!isValidGiveawayChannel(channel)) {
					return interaction.reply({
						content: "Le salon fourni n'est pas un salon textuel valide 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				const durationMs = ms(duree)
				if (!Number.isFinite(durationMs)) {
					return interaction.reply({
						content: 'La durée est invalide 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!isValidDelay(durationMs)) {
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sql =
						'INSERT INTO giveaways (prize, winnersCount, channel, timestampEnd, hostedBy, excludedIds, messageId, started, ended, timeoutId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
					const data = [
						prize,
						winners,
						channel.id,
						duree,
						interaction.user.id,
						interaction.user.id,
						null,
						0,
						0,
						null,
					]

					await bdd.execute(sql, data)
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la création du giveaway en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: `Giveaway créé 👌\nPrix : ${prize}\nNombre de gagnants : ${winners}\nSalon : ${channel}\nDurée : ${convertMsToString(
						durationMs,
					)}`,
				})
			}

			case 'edit': {
				if (!fetchGiveaway) {
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.hostedBy !== interaction.user.id) {
					return interaction.reply({
						content: "Ce giveaway ne t'appartient pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.started === 1) {
					return interaction.reply({
						content: 'Le giveaway est déjà lancé 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.ended === 1) {
					return interaction.reply({
						content: 'Le giveaway est terminé 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				const channel = await interaction.guild.channels.fetch(channelId).catch(() => null)
				if (!channel) {
					return interaction.reply({
						content: "Ce salon n'existe pas 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!isValidGiveawayChannel(channel)) {
					return interaction.reply({
						content: "Le salon fourni n'est pas un salon textuel valide 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				const durationMs = ms(duree)
				if (!Number.isFinite(durationMs)) {
					return interaction.reply({
						content: 'La durée est invalide 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!isValidDelay(durationMs)) {
					return interaction.reply({
						content: 'La durée est trop grande et dépasse la limite autorisée 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sql =
						'UPDATE giveaways SET prize = ?, winnersCount = ?, channel = ?, timestampEnd = ? WHERE id = ?'
					const data = [prize, winners, channel.id, duree, id]
					await bdd.execute(sql, data)
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la modification du giveaway en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: `Giveaway modifié 👌\nPrix : ${prize}\nNombre de gagnants : ${winners}\nSalon : ${channel}\nDurée : ${convertMsToString(
						durationMs,
					)}`,
				})
			}

			case 'del': {
				if (!fetchGiveaway) {
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.hostedBy !== interaction.user.id) {
					return interaction.reply({
						content: "Ce giveaway ne t'appartient pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.started === 1) {
					return interaction.reply({
						content: 'Ce giveaway est déjà lancé 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sql = 'DELETE FROM giveaways WHERE id = ?'
					const data = [id]
					const [result] = await bdd.execute(sql, data)

					if (result.affectedRows === 1) {
						return interaction.reply({
							content: 'Le giveaway a bien été supprimé 👌',
						})
					}
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content: 'Une erreur est survenue lors de la suppression du giveaway 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: "Le giveaway n'existe pas 😬",
					flags: MessageFlags.Ephemeral,
				})
			}

			case 'start': {
				if (!fetchGiveaway) {
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.hostedBy !== interaction.user.id) {
					return interaction.reply({
						content: "Ce giveaway ne t'appartient pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.started === 1) {
					return interaction.reply({
						content: 'Le giveaway est déjà lancé 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.ended === 1) {
					return interaction.reply({
						content: 'Le giveaway est terminé 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				const durationMs = ms(fetchGiveaway.timestampEnd)
				if (!Number.isFinite(durationMs) || !isValidDelay(durationMs)) {
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				await interaction.deferReply()

				const channelStart = await interaction.guild.channels
					.fetch(fetchGiveaway.channel)
					.catch(() => null)

				if (!channelStart || !isValidGiveawayChannel(channelStart)) {
					return interaction.editReply({
						content: "Le salon n'existe pas 😕",
					})
				}

				const timestampStart = Math.round(Date.now() / 1000)
				const timestampEnd = timestampStart + durationMs / 1000

				const embed = buildStartEmbed(
					fetchGiveaway.hostedBy,
					fetchGiveaway.prize,
					fetchGiveaway.winnersCount,
					timestampEnd,
				)

				const sentMessage = await channelStart.send({ embeds: [embed] })
				await sentMessage.react('🎉')

				const timeout = globalThis.setTimeout(async () => {
					const sentMessageFetch = await channelStart.messages
						.fetch(sentMessage.id)
						.catch(() => null)

					if (!sentMessageFetch) {
						try {
							const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
							const data = [1, fetchGiveaway.id]
							await bdd.execute(sql, data)
						} catch (error) {
							console.error(error)
						}
						return
					}

					try {
						await finalizeGiveaway({
							bdd,
							giveaway: {
								...fetchGiveaway,
								timestampEnd,
							},
							message: sentMessageFetch,
							markEnded: true,
						})
					} catch (error) {
						console.error(error)
					}
				}, durationMs)

				try {
					const sql =
						'UPDATE giveaways SET timestampEnd = ?, messageId = ?, started = ?, timeoutId = ? WHERE id = ?'
					const data = [timestampEnd, sentMessage.id, 1, Number(timeout), id]
					await bdd.execute(sql, data)
				} catch (error) {
					console.error(error)
					await sentMessage.delete().catch(() => null)
					return interaction.editReply({
						content:
							'Une erreur est survenue lors du lancement du giveaway en base de données 😬',
					})
				}

				return interaction.editReply({
					content: `Giveaway lancé 👌\nPrix : ${
						fetchGiveaway.prize
					}\nNombre de gagnants : ${
						fetchGiveaway.winnersCount
					}\nSalon : ${channelStart}\nTirage programmé le ${convertDateForDiscord(
						timestampEnd * 1000,
					)}`,
				})
			}

			case 'end': {
				if (!fetchGiveaway) {
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.started === 0) {
					return interaction.reply({
						content: "Le giveaway n'est pas lancé 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.ended === 1) {
					return interaction.reply({
						content: 'Le giveaway est déjà terminé 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				await interaction.deferReply()

				const channel = await interaction.guild.channels
					.fetch(fetchGiveaway.channel)
					.catch(() => null)
				if (!channel || !isValidGiveawayChannel(channel)) {
					try {
						const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
						const data = [1, fetchGiveaway.id]
						await bdd.execute(sql, data)
					} catch (error) {
						console.error(error)
					}

					return interaction.editReply({
						content: "Le salon du giveaway n'existe pas 😕",
					})
				}

				const sentMessageFetch = await channel.messages
					.fetch(fetchGiveaway.messageId)
					.catch(() => null)
				if (!sentMessageFetch) {
					try {
						const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
						const data = [1, fetchGiveaway.id]
						await bdd.execute(sql, data)
					} catch (error) {
						console.error(error)
					}

					return interaction.editReply({
						content: "Le message du giveaway n'existe pas 😕",
					})
				}

				try {
					await finalizeGiveaway({
						bdd,
						giveaway: fetchGiveaway,
						message: sentMessageFetch,
						markEnded: true,
					})

					if (fetchGiveaway.timeoutId !== null) {
						clearTimeout(Number(fetchGiveaway.timeoutId))
					}
				} catch (error) {
					console.error(error)
					return interaction.editReply({
						content: 'Une erreur est survenue lors de la fin du giveaway 😬',
					})
				}

				return interaction.editReply({
					content: 'Tirage terminé 👌',
				})
			}

			case 'reroll': {
				if (!fetchGiveaway) {
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.started === 0) {
					return interaction.reply({
						content: "Le giveaway n'est pas lancé 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchGiveaway.ended === 0) {
					return interaction.reply({
						content: "Le giveaway n'est pas terminé 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				await interaction.deferReply()

				const channel = await interaction.guild.channels
					.fetch(fetchGiveaway.channel)
					.catch(() => null)
				if (!channel || !isValidGiveawayChannel(channel)) {
					return interaction.editReply({
						content: "Le salon du giveaway n'existe pas 😕",
					})
				}

				const sentMessageReroll = await channel.messages
					.fetch(fetchGiveaway.messageId)
					.catch(() => null)
				if (!sentMessageReroll) {
					return interaction.editReply({
						content: "Le message du giveaway n'existe pas 😕",
					})
				}

				try {
					await finalizeGiveaway({
						bdd,
						giveaway: fetchGiveaway,
						message: sentMessageReroll,
						markEnded: false,
					})
				} catch (error) {
					console.error(error)
					return interaction.editReply({
						content: 'Une erreur est survenue lors du reroll du giveaway 😬',
					})
				}

				return interaction.editReply({
					content: 'Tirage relancé 👌',
				})
			}

			default:
				return interaction.reply({
					content: 'Sous-commande inconnue 😕',
					flags: MessageFlags.Ephemeral,
				})
		}
	},
}
