/* eslint-disable no-await-in-loop */
/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
/* eslint-disable no-mixed-operators */
import { SlashCommandBuilder } from '@discordjs/builders'
import { convertDateForDiscord, convertMsToString, pluralize } from '../../util/util.js'
import { Pagination } from 'pagination.djs'
import ms from 'ms'

export default {
	data: new SlashCommandBuilder()
		.setName('giveaway')
		.setDescription('Gère les giveaways')
		.addSubcommand(subcommand =>
			subcommand.setName('view').setDescription('Voir les giveaways non lancés'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Créer un giveaway')
				.addStringOption(option =>
					option.setName('prix').setDescription('Prix à gagner').setRequired(true),
				)
				.addIntegerOption(option =>
					option
						.setName('gagnants')
						.setDescription('Nombre de gagnants')
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('durée')
						.setDescription(
							"Durée du giveaway (précisez l'unité de temps en minutes / heures / jours : 1m, 2h, 3d)",
						)
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('salon')
						.setDescription('ID du salon du giveaway')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('edit')
				.setDescription('Modifier un giveaway')
				.addStringOption(option =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				)
				.addStringOption(option =>
					option.setName('prix').setDescription('Prix à gagner').setRequired(true),
				)
				.addIntegerOption(option =>
					option
						.setName('gagnants')
						.setDescription('Nombre de gagnants')
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('durée')
						.setDescription(
							"Durée du giveaway (précisez l'unité de temps en minutes / heures / jours : 1m, 2h, 3d)",
						)
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('salon')
						.setDescription('ID du salon du giveaway')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('del')
				.setDescription('Supprimer un giveaway')
				.addStringOption(option =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('start')
				.setDescription('Lancer un giveaway')
				.addStringOption(option =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('reroll')
				.setDescription("Relancer le tirage d'un giveaway")
				.addStringOption(option =>
					option.setName('id').setDescription('ID du giveaway').setRequired(true),
				),
		),
	interaction: async (interaction, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		const id = interaction.options.getString('id')
		const prize = interaction.options.getString('prix')
		const winners = interaction.options.getInteger('gagnants')
		const duree = interaction.options.getString('durée')
		const channelId = interaction.options.getString('salon')
		const channel = await interaction.guild.channels.fetch(channelId).catch(() =>
			interaction.reply({
				content: "Ce salon n'existe pas 😕",
				ephemeral: true,
			}),
		)

		let fetchGiveaway = {}
		if (
			interaction.options.getSubcommand() !== 'view' ||
			interaction.options.getSubcommand() !== 'create'
		)
			// Acquisition de l'id du giveaway
			// Fetch du giveaway
			try {
				const sqlSelect = 'SELECT * FROM giveaways WHERE id = ?'
				const dataSelect = [id]
				const [resultDelete] = await bdd.execute(sqlSelect, dataSelect)
				fetchGiveaway = resultDelete[0]
			} catch {
				return interaction.reply({
					content: "Une erreur est survenue lors de l'acquisition du giveaway 😬",
					ephemeral: true,
				})
			}

		switch (interaction.options.getSubcommand()) {
			case 'view':
				let giveaways = []
				try {
					const sqlSelect = 'SELECT * FROM giveaways WHERE started = 0'
					const [resultGiveaways] = await bdd.execute(sqlSelect)
					giveaways = resultGiveaways
				} catch (error) {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des giveaways 😕',
						ephemeral: true,
					})
				}

				// Boucle d'ajout des champs
				const fieldsEmbedView = []
				giveaways.forEach(giveaway => {
					fieldsEmbedView.push({
						name: `Giveaway #${giveaway.id}`,
						value: `Prix : ${giveaway.prize}\nDurée : ${convertMsToString(
							ms(giveaway.timestampEnd),
						)}\n Salon : <#${giveaway.channel}>`,
					})
				})

				// Configuration de l'embed
				const paginationView = new Pagination(interaction, {
					firstEmoji: '⏮',
					prevEmoji: '◀️',
					nextEmoji: '▶️',
					lastEmoji: '⏭',
					limit: 5,
					idle: 30000,
					ephemeral: true,
					prevDescription: '',
					postDescription: '',
					buttonStyle: 'SECONDARY',
					loop: false,
				})

				paginationView.setTitle('Giveaways')
				paginationView.setDescription(`**Total : ${giveaways.length}**`)
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.footer = { text: 'Page : {pageNumber} / {totalPages}' }
				paginationView.paginateFields(true)

				// Envoi de l'embed
				return paginationView.render()

			case 'create':
				// Vérification si le salon est bien textuel
				if (channel.type !== 'GUILD_TEXT')
					return interaction.reply({
						content: "Le salon fournit n'est pas un salon textuel 😬",
						ephemeral: true,
					})

				if (isNaN(ms(duree)))
					return interaction.reply({
						content: 'La durée est invalide 😬',
						ephemeral: true,
					})

				const timestampStartCreate = Math.round(Date.now() / 1000)
				const timestampEndCreate = timestampStartCreate + ms(duree) / 1000

				const delayCreate = (timestampEndCreate - timestampStartCreate) * 1000

				if (delayCreate.toString(2).length > 32)
					return interaction.reply({
						content:
							'La durée est trop grande et dépasse la limite autorisée de 32 bits 😬',
						ephemeral: true,
					})

				// Insertion du giveaway en base de données
				try {
					const sql =
						'INSERT INTO giveaways (prize, winnersCount, channel, timestampEnd, hostedBy, excludedIds, messageId, started, ended) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
					]
					await bdd.execute(sql, data)
				} catch (error) {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la création du giveaway en base de données 😬',
						ephemeral: true,
					})
				}

				return interaction.reply({
					content: `Giveaway créé 👌\nPrix : ${prize}\nNombre de gagnants : ${winners}\nSalon : ${channel}\nDurée : ${convertMsToString(
						ms(duree),
					)}`,
				})

			case 'edit':
				// Vérification que le giveaway existe bien
				if (!fetchGiveaway)
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						ephemeral: true,
					})

				// Vérification si le giveaway appartient bien au membre
				if (fetchGiveaway.hostedBy !== interaction.user.id)
					return interaction.reply({
						content: "Ce giveaway ne t'appartient pas 😬",
						ephemeral: true,
					})

				// Vérification si le giveaway est déjà lancé
				if (fetchGiveaway.started === 1)
					return interaction.reply({
						content: 'Le giveaway est déjà lancé 😕',
						ephemeral: true,
					})

				// Vérification si le giveaway est terminé
				if (fetchGiveaway.ended === 1)
					return interaction.reply({
						content: 'Le giveaway est terminé 😕',
						ephemeral: true,
					})

				// Vérification si le salon est bien textuel
				if (channel.type !== 'GUILD_TEXT')
					return interaction.reply({
						content: "Le salon fournit n'est pas un salon textuel 😬",
						ephemeral: true,
					})

				if (isNaN(ms(duree)))
					return interaction.reply({
						content: 'La durée est invalide 😬',
						ephemeral: true,
					})

				const timestampStartEdit = Math.round(Date.now() / 1000)
				const timestampEndEdit = timestampStartEdit + ms(duree) / 1000

				const delayEdit = (timestampEndEdit - timestampStartEdit) * 1000

				if (delayEdit.toString(2).length > 32)
					return interaction.reply({
						content:
							'La durée est trop grande et dépasse la limite autorisée de 32 bits 😬',
						ephemeral: true,
					})

				// Modification du giveaway en base de données
				try {
					const sql =
						'UPDATE giveaways SET prize = ?, winnersCount = ?, channel = ?, timestampEnd = ? WHERE id = ?'
					const data = [prize, winners, channel.id, duree, id]
					await bdd.execute(sql, data)
				} catch (error) {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la modification du giveaway en base de données 😬',
						ephemeral: true,
					})
				}

				return interaction.reply({
					content: `Giveaway modifié 👌\nPrix : ${prize}\nNombre de gagnants : ${winners}\nSalon : ${channel}\nDurée : ${convertMsToString(
						ms(duree),
					)}`,
				})

			case 'del':
				// Vérification que le giveaway existe bien
				if (!fetchGiveaway)
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						ephemeral: true,
					})

				// Vérification si le giveaway appartient bien au membre
				if (fetchGiveaway.hostedBy !== interaction.user.id)
					return interaction.reply({
						content: "Ce giveaway ne t'appartient pas 😬",
						ephemeral: true,
					})

				// Suppresion en base de données
				let deletedGiveaway = {}
				try {
					const sqlDelete = 'DELETE FROM giveaways WHERE id = ?'
					const dataDelete = [id]
					const [resultDelete] = await bdd.execute(sqlDelete, dataDelete)
					deletedGiveaway = resultDelete
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la suppression du giveaway 😬',
						ephemeral: true,
					})
				}

				if (deletedGiveaway.affectedRows === 1)
					return interaction.reply({
						content: 'Le giveaway a bien été supprimé 👌',
						ephemeral: true,
					})

				// Sinon, message d'erreur
				return interaction.reply({
					content: "Le giveaway n'existe pas 😬",
					ephemeral: true,
				})

			case 'start':
				// Vérification que le giveaway existe bien
				if (!fetchGiveaway)
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						ephemeral: true,
					})

				// Vérification si le giveaway appartient bien au membre
				if (fetchGiveaway.hostedBy !== interaction.user.id)
					return interaction.reply({
						content: "Ce giveaway ne t'appartient pas 😬",
						ephemeral: true,
					})

				// Vérification si le tirage est déjà lancé
				if (fetchGiveaway.started === 1)
					return interaction.reply({
						content: 'Le giveaway est déjà lancé 😕',
						ephemeral: true,
					})

				// Vérification si le giveaway est terminé
				if (fetchGiveaway.ended === 1)
					return interaction.reply({
						content: 'Le giveaway est terminé 😕',
						ephemeral: true,
					})

				const timestampStartStart = Math.round(Date.now() / 1000)
				const timestampEndStart =
					timestampStartStart + ms(fetchGiveaway.timestampEnd) / 1000

				const delayStart = (timestampEndStart - timestampStartStart) * 1000

				if (delayStart.toString(2).length > 32)
					return interaction.reply({
						content:
							'La durée est trop grande et dépasse la limite autorisée de 32 bits 😬',
						ephemeral: true,
					})

				// Création de l'embed
				const embed = {
					color: '#BB2528',
					title: '🎁 GIVEAWAY 🎁',
					description: 'Réagissez avec 🎉 pour participer !',
					fields: [
						{
							name: 'Organisateur',
							value: interaction.user.toString(),
						},
						{
							name: 'Prix',
							value: fetchGiveaway.prize,
						},
						{
							name: 'Date de fin',
							value: convertDateForDiscord(timestampEndStart * 1000),
						},
						{
							name: 'Nombre de gagnants',
							value: pluralize('gagnant', fetchGiveaway.winnersCount),
						},
					],
				}

				// Envoi du message dans le salon du giveaway
				const channelStart = await interaction.guild.channels
					.fetch(fetchGiveaway.channel)
					.catch(() =>
						interaction.reply({
							content: "Le salon n'existe pas 😕",
							ephemeral: true,
						}),
					)

				const sentMessage = await channelStart.send({ embeds: [embed] })

				await sentMessage.react('🎉')

				// Lancement du giveaway en base de données
				try {
					const sql =
						'UPDATE giveaways SET timestampEnd = ?, messageId = ?, started = ? WHERE id = ?'
					const data = [timestampEndStart, sentMessage.id, 1, id]
					await bdd.execute(sql, data)
				} catch (error) {
					await sentMessage.delete()
					return interaction.reply({
						content:
							'Une erreur est survenue lors du lancement du giveaway en base de données 😬',
						ephemeral: true,
					})
				}

				setTimeout(async () => {
					const sentMessageFetch = await interaction.guild.channels.cache
						.get(fetchGiveaway.channel)
						.messages.fetch(sentMessage.id)
						.catch(() => false)

					if (!sentMessageFetch) {
						try {
							const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
							const data = [1, fetchGiveaway.id]
							await bdd.execute(sql, data)
							// eslint-disable-next-line no-empty
						} catch (error) {}

						return
					}

					let usersReactions = {}

					try {
						usersReactions = await sentMessageFetch.reactions.cache
							.get('🎉')
							.users.fetch()
						// eslint-disable-next-line no-empty
					} catch (error) {}

					const excludedIdsArray = fetchGiveaway.excludedIds.split(',')
					let excludedIds = fetchGiveaway.excludedIds
					let winnersTirageString = ''

					let i = 0
					if (usersReactions.size > 0) {
						while (i < fetchGiveaway.winnersCount) {
							const winnerTirage = await usersReactions
								.filter(user => !user.bot && !excludedIdsArray.includes(user.id))
								.random()

							if (!winnerTirage) break

							winnersTirageString = winnersTirageString.concat(
								' ',
								`${winnerTirage},`,
							)
							excludedIds = excludedIds.concat(',', winnerTirage.id)
							usersReactions.sweep(user => user.id === winnerTirage.id)

							try {
								const sql = 'UPDATE giveaways SET excludedIds = ? WHERE id = ?'
								const data = [excludedIds, fetchGiveaway.id]
								await bdd.execute(sql, data)
								// eslint-disable-next-line no-empty
							} catch (error) {}

							i += 1
						}

						winnersTirageString = winnersTirageString.trim().slice(0, -1)
					}

					// Modification de l'embed
					const embedWin = {
						color: '#BB2528',
						title: '🎁 GIVEAWAY 🎁',
						fields: [
							{
								name: 'Organisateur',
								value: interaction.user.toString(),
							},
							{
								name: 'Prix',
								value: fetchGiveaway.prize,
							},
						],
					}

					try {
						const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
						const data = [1, fetchGiveaway.id]
						await bdd.execute(sql, data)
						// eslint-disable-next-line no-empty
					} catch (error) {}

					if (winnersTirageString === '' || !usersReactions) {
						embedWin.fields.push({
							name: '0 gagnant',
							value: 'Pas de participants',
						})

						await sentMessageFetch.edit({ embeds: [embedWin] })

						return sentMessageFetch.reply({
							content: `🎉 Giveaway terminé, aucun participant enregistré !`,
						})
					}

					embedWin.fields.push({
						name: pluralize('gagnant', i),
						value: winnersTirageString,
					})

					if (i < fetchGiveaway.winnersCount)
						embedWin.description =
							'Le nombre de participants était inférieur au nombre de gagnants défini.'

					await sentMessageFetch.edit({ embeds: [embedWin] })

					return i > 1
						? sentMessageFetch.reply({
								content: `🎉 Félicitations à nos gagnants : ${winnersTirageString} !`,
						  })
						: sentMessageFetch.reply({
								content: `🎉 Félicitations à notre gagnant : ${winnersTirageString} !`,
						  })
				}, (timestampEndStart - Math.round(Date.now() / 1000)) * 1000)

				return interaction.reply({
					content: `Giveaway lancé 👌\nPrix : ${
						fetchGiveaway.prize
					}\nNombre de gagnants : ${
						fetchGiveaway.winnersCount
					}\nSalon : ${channelStart}\nTirage programmé le ${convertDateForDiscord(
						timestampEndStart * 1000,
					)}`,
				})

			case 'reroll':
				// Vérification que le giveaway existe bien
				if (!fetchGiveaway)
					return interaction.reply({
						content: "Le giveaway n'existe pas 😕",
						ephemeral: true,
					})

				// Vérification si le tirage est déjà lancé
				if (fetchGiveaway.started === 0)
					return interaction.reply({
						content: "Le giveaway n'est pas lancé 😕",
						ephemeral: true,
					})

				// Vérification si le giveaway est terminé
				if (fetchGiveaway.ended === 0)
					return interaction.reply({
						content: "Le giveaway n'est pas terminé 😕",
						ephemeral: true,
					})

				const sentMessageReroll = await interaction.guild.channels.cache
					.get(fetchGiveaway.channel)
					.messages.fetch(fetchGiveaway.messageId)
					.catch(() => false)

				if (!sentMessageReroll) {
					try {
						const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
						const data = [1, fetchGiveaway.id]
						await bdd.execute(sql, data)
						// eslint-disable-next-line no-empty
					} catch (error) {}

					return interaction.reply({
						content: "Le message du giveaway n'existe pas 😕",
						ephemeral: true,
					})
				}

				let usersReactions = {}

				try {
					usersReactions = await sentMessageReroll.reactions.cache.get('🎉').users.fetch()
					// eslint-disable-next-line no-empty
				} catch (error) {}

				const excludedIdsArray = fetchGiveaway.excludedIds.split(',')
				let excludedIds = fetchGiveaway.excludedIds
				let winnersTirageString = ''

				let i = 0
				if (usersReactions.size > 0) {
					while (i < fetchGiveaway.winnersCount) {
						const winnerTirage = await usersReactions
							.filter(user => !user.bot && !excludedIdsArray.includes(user.id))
							.random()

						if (!winnerTirage) break

						winnersTirageString = winnersTirageString.concat(' ', `${winnerTirage},`)
						excludedIds = excludedIds.concat(',', winnerTirage.id)
						usersReactions.sweep(user => user.id === winnerTirage.id)

						try {
							const sql = 'UPDATE giveaways SET excludedIds = ? WHERE id = ?'
							const data = [excludedIds, fetchGiveaway.id]
							await bdd.execute(sql, data)
							// eslint-disable-next-line no-empty
						} catch (error) {}

						i += 1
					}

					winnersTirageString = winnersTirageString.trim().slice(0, -1)
				}

				// Modification de l'embed
				const embedWin = {
					color: '#BB2528',
					title: '🎁 GIVEAWAY 🎁',
					fields: [
						{
							name: 'Organisateur',
							value: interaction.user.toString(),
						},
						{
							name: 'Prix',
							value: fetchGiveaway.prize,
						},
					],
				}

				try {
					const sql = 'UPDATE giveaways SET ended = ? WHERE id = ?'
					const data = [1, fetchGiveaway.id]
					await bdd.execute(sql, data)
					// eslint-disable-next-line no-empty
				} catch (error) {}

				if (winnersTirageString === '' || !usersReactions) {
					embedWin.fields.push({
						name: '0 gagnant',
						value: 'Pas de participants',
					})

					await sentMessageReroll.edit({ embeds: [embedWin] })

					await sentMessageReroll.reply({
						content: `🎉 Giveaway terminé, aucun participant enregistré !`,
					})

					return interaction.reply({
						content: `Tirage relancé 👌`,
					})
				}

				embedWin.fields.push({
					name: pluralize('gagnant', i),
					value: winnersTirageString,
				})

				if (i < fetchGiveaway.winnersCount)
					embedWin.description =
						'Le nombre de participants était inférieur au nombre de gagnants défini.'

				await sentMessageReroll.edit({ embeds: [embedWin] })

				if (i > 1)
					await sentMessageReroll.reply({
						content: `🎉 Félicitations à nos gagnants : ${winnersTirageString} !`,
					})
				else
					await sentMessageReroll.reply({
						content: `🎉 Félicitations à notre gagnant : ${winnersTirageString} !`,
					})

				return interaction.reply({
					content: `Tirage relancé 👌`,
				})
		}
	},
}
