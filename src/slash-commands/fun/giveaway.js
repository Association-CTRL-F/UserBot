/* eslint-disable no-await-in-loop */
/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
/* eslint-disable no-mixed-operators */
import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed } from 'discord.js'
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
				.setName('end')
				.setDescription('Arrêter un giveaway')
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
				const sqlSelect = 'SELECT * FROM giveaways WHERE id = ? AND guildId = ?'
				const dataSelect = [id, interaction.guild.id]
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
					const sqlSelect = 'SELECT * FROM giveaways WHERE started = 0 AND guildId = ?'
					const dataSelect = [interaction.guild.id]

					const [resultGiveaways] = await bdd.execute(sqlSelect, dataSelect)
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
					idle: 120000,
					ephemeral: false,
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

				if (delayCreate.toString(2).length > 31)
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						ephemeral: true,
					})

				// Insertion du giveaway en base de données
				try {
					const sql =
						'INSERT INTO giveaways (guildId, prize, winnersCount, channel, timestampEnd, hostedBy, excludedIds, messageId, started, ended, timeoutId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
					const data = [
						interaction.guild.id,
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

				if (delayEdit.toString(2).length > 31)
					return interaction.reply({
						content:
							'La durée est trop grande et dépasse la limite autorisée de 32 bits 😬',
						ephemeral: true,
					})

				// Modification du giveaway en base de données
				try {
					const sql =
						'UPDATE giveaways SET prize = ?, winnersCount = ?, channel = ?, timestampEnd = ? WHERE id = ? AND guildId = ?'
					const data = [prize, winners, channel.id, duree, id, interaction.guild.id]
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
					const sqlDelete = 'DELETE FROM giveaways WHERE id = ? AND guildId = ?'
					const dataDelete = [id, interaction.guild.id]
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

				if (delayStart.toString(2).length > 31)
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						ephemeral: true,
					})

				// On diffère la réponse pour avoir plus de 3 secondes
				await interaction.deferReply()

				// Création de l'embed
				const embed = new MessageEmbed()
					.setColor('#BB2528')
					.setTitle('🎁 GIVEAWAY 🎁')
					.setDescription('Réagissez avec 🎉 pour participer !')
					.addFields([
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
					])

				// Envoi du message dans le salon du giveaway
				const channelStart = await interaction.guild.channels
					.fetch(fetchGiveaway.channel)
					.catch(() =>
						interaction.editReply({
							content: "Le salon n'existe pas 😕",
						}),
					)

				const sentMessage = await channelStart.send({ embeds: [embed] })

				await sentMessage.react('🎉')

				const timeout = setTimeout(async () => {
					const sentMessageFetch = await interaction.guild.channels.cache
						.get(fetchGiveaway.channel)
						.messages.fetch(sentMessage.id)
						.catch(() => false)

					if (!sentMessageFetch) {
						try {
							const sql =
								'UPDATE giveaways SET ended = ? WHERE id = ? AND guildId = ?'
							const data = [1, fetchGiveaway.id, interaction.guild.id]
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
								const sql =
									'UPDATE giveaways SET excludedIds = ? WHERE id = ? AND guildId = ?'
								const data = [excludedIds, fetchGiveaway.id, interaction.guild.id]
								await bdd.execute(sql, data)
								// eslint-disable-next-line no-empty
							} catch (error) {}

							i += 1
						}

						winnersTirageString = winnersTirageString.trim().slice(0, -1)
					}

					// Modification de l'embed
					const embedWin = new MessageEmbed()
						.setColor('#BB2528')
						.setTitle('🎁 GIVEAWAY 🎁')
						.addFields([
							{
								name: 'Organisateur',
								value: interaction.user.toString(),
							},
							{
								name: 'Prix',
								value: fetchGiveaway.prize,
							},
						])

					try {
						const sql = 'UPDATE giveaways SET ended = ? WHERE id = ? AND guildId = ?'
						const data = [1, fetchGiveaway.id, interaction.guild.id]
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

				// Lancement du giveaway en base de données
				try {
					const sql =
						'UPDATE giveaways SET timestampEnd = ?, messageId = ?, started = ?, timeoutId = ? WHERE id = ? AND guildId = ?'
					const data = [
						timestampEndStart,
						sentMessage.id,
						1,
						Number(timeout),
						id,
						interaction.guild.id,
					]
					await bdd.execute(sql, data)
				} catch (error) {
					await sentMessage.delete()
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
						timestampEndStart * 1000,
					)}`,
				})

			case 'end':
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

				// Vérification si le tirage est terminé
				if (fetchGiveaway.ended === 1)
					return interaction.reply({
						content: 'Le giveaway est déjà terminé 😕',
						ephemeral: true,
					})

				// On diffère la réponse pour avoir plus de 3 secondes
				await interaction.deferReply()

				const sentMessageFetch = await interaction.guild.channels.cache
					.get(fetchGiveaway.channel)
					.messages.fetch(fetchGiveaway.messageId)
					.catch(() => false)

				if (!sentMessageFetch) {
					try {
						const sql = 'UPDATE giveaways SET ended = ? WHERE id = ? AND guildId = ?'
						const data = [1, fetchGiveaway.id, interaction.guild.id]
						await bdd.execute(sql, data)
						// eslint-disable-next-line no-empty
					} catch (error) {}

					return
				}

				let usersReactionsEnd = {}

				try {
					usersReactionsEnd = await sentMessageFetch.reactions.cache
						.get('🎉')
						.users.fetch()
					// eslint-disable-next-line no-empty
				} catch (error) {}

				const excludedIdsArrayEnd = fetchGiveaway.excludedIds.split(',')
				let excludedIdsEnd = fetchGiveaway.excludedIds
				let winnersTirageStringEnd = ''

				let iEnd = 0
				if (usersReactionsEnd.size > 0) {
					while (iEnd < fetchGiveaway.winnersCount) {
						const winnerTirage = await usersReactionsEnd
							.filter(user => !user.bot && !excludedIdsArrayEnd.includes(user.id))
							.random()

						if (!winnerTirage) break

						winnersTirageStringEnd = winnersTirageStringEnd.concat(
							' ',
							`${winnerTirage},`,
						)
						excludedIdsEnd = excludedIdsEnd.concat(',', winnerTirage.id)
						usersReactionsEnd.sweep(user => user.id === winnerTirage.id)

						try {
							const sql =
								'UPDATE giveaways SET excludedIds = ? WHERE id = ? AND guildId = ?'
							const data = [excludedIdsEnd, fetchGiveaway.id, interaction.guild.id]
							await bdd.execute(sql, data)
							// eslint-disable-next-line no-empty
						} catch (error) {}

						iEnd += 1
					}

					winnersTirageStringEnd = winnersTirageStringEnd.trim().slice(0, -1)
				}

				// Modification de l'embed
				const embedWinEnd = new MessageEmbed()
					.setColor('#BB2528')
					.setTitle('🎁 GIVEAWAY 🎁')
					.addFields([
						{
							name: 'Organisateur',
							value: interaction.user.toString(),
						},
						{
							name: 'Prix',
							value: fetchGiveaway.prize,
						},
					])

				try {
					const sql = 'UPDATE giveaways SET ended = ? WHERE id = ? AND guildId = ?'
					const data = [1, fetchGiveaway.id, interaction.guild.id]
					await bdd.execute(sql, data)
					// eslint-disable-next-line no-empty
				} catch (error) {}

				if (winnersTirageStringEnd === '' || !usersReactionsEnd) {
					embedWinEnd.fields.push({
						name: '0 gagnant',
						value: 'Pas de participants',
					})

					await sentMessageFetch.edit({ embeds: [embedWinEnd] })

					clearTimeout(fetchGiveaway.timeoutId)

					await sentMessageFetch.reply({
						content: `🎉 Giveaway terminé, aucun participant enregistré !`,
					})

					return interaction.editReply({
						content: `Tirage terminé 👌`,
					})
				}

				embedWinEnd.fields.push({
					name: pluralize('gagnant', iEnd),
					value: winnersTirageStringEnd,
				})

				if (iEnd < fetchGiveaway.winnersCount)
					embedWinEnd.description =
						'Le nombre de participants était inférieur au nombre de gagnants défini.'

				await sentMessageFetch.edit({ embeds: [embedWinEnd] })

				clearTimeout(fetchGiveaway.timeoutId)

				if (iEnd > 1)
					await sentMessageFetch.reply({
						content: `🎉 Félicitations à nos gagnants : ${winnersTirageStringEnd} !`,
					})
				else
					await sentMessageFetch.reply({
						content: `🎉 Félicitations à notre gagnant : ${winnersTirageStringEnd} !`,
					})

				return interaction.editReply({
					content: `Tirage terminé 👌`,
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

				// On diffère la réponse pour avoir plus de 3 secondes
				await interaction.deferReply()

				const sentMessageReroll = await interaction.guild.channels.cache
					.get(fetchGiveaway.channel)
					.messages.fetch(fetchGiveaway.messageId)
					.catch(() => false)

				if (!sentMessageReroll) {
					try {
						const sql = 'UPDATE giveaways SET ended = ? WHERE id = ? AND guildId = ?'
						const data = [1, fetchGiveaway.id, interaction.guild.id]
						await bdd.execute(sql, data)
						// eslint-disable-next-line no-empty
					} catch (error) {}

					return interaction.editReply({
						content: "Le message du giveaway n'existe pas 😕",
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
							const sql =
								'UPDATE giveaways SET excludedIds = ? WHERE id = ? AND guildId = ?'
							const data = [excludedIds, fetchGiveaway.id, interaction.guild.id]
							await bdd.execute(sql, data)
							// eslint-disable-next-line no-empty
						} catch (error) {}

						i += 1
					}

					winnersTirageString = winnersTirageString.trim().slice(0, -1)
				}

				// Modification de l'embed
				const embedWinReroll = new MessageEmbed()
					.setColor('#BB2528')
					.setTitle('🎁 GIVEAWAY 🎁')
					.addFields([
						{
							name: 'Organisateur',
							value: interaction.user.toString(),
						},
						{
							name: 'Prix',
							value: fetchGiveaway.prize,
						},
					])

				try {
					const sql = 'UPDATE giveaways SET ended = ? WHERE id = ? AND guildId = ?'
					const data = [1, fetchGiveaway.id, interaction.guild.id]
					await bdd.execute(sql, data)
					// eslint-disable-next-line no-empty
				} catch (error) {}

				if (winnersTirageString === '' || !usersReactions) {
					embedWinReroll.fields.push({
						name: '0 gagnant',
						value: 'Pas de participants',
					})

					await sentMessageReroll.edit({ embeds: [embedWinReroll] })

					await sentMessageReroll.reply({
						content: `🎉 Giveaway terminé, aucun participant enregistré !`,
					})

					return interaction.editReply({
						content: `Tirage relancé 👌`,
					})
				}

				embedWinReroll.fields.push({
					name: pluralize('gagnant', i),
					value: winnersTirageString,
				})

				if (i < fetchGiveaway.winnersCount)
					embedWinReroll.description =
						'Le nombre de participants était inférieur au nombre de gagnants défini.'

				await sentMessageReroll.edit({ embeds: [embedWinReroll] })

				if (i > 1)
					await sentMessageReroll.reply({
						content: `🎉 Félicitations à nos gagnants : ${winnersTirageString} !`,
					})
				else
					await sentMessageReroll.reply({
						content: `🎉 Félicitations à notre gagnant : ${winnersTirageString} !`,
					})

				return interaction.editReply({
					content: `Tirage relancé 👌`,
				})
		}
	},
}
