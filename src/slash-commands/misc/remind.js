import { SlashCommandBuilder, EmbedBuilder, ButtonStyle, MessageFlags } from 'discord.js'
import { convertDateForDiscord } from '../../util/util.js'
import { Pagination } from 'pagination.djs'
import ms from 'ms'

const MAX_TIMEOUT_MS = 2_147_483_647

const scheduleReminder = ({ client, bdd, reminder, delayMs }) =>
	globalThis.setTimeout(async () => {
		try {
			const sql = 'DELETE FROM reminders WHERE id = ? AND discordID = ?'
			const data = [reminder.id, reminder.discordID]
			const [result] = await bdd.execute(sql, data)

			// Si le rappel a déjà été supprimé / modifié, on n'envoie rien
			if (result.affectedRows !== 1) return

			if (reminder.private) {
				const user = await client.users.fetch(reminder.discordID).catch(() => null)
				if (!user) return

				const embed = new EmbedBuilder()
					.setColor('#C27C0E')
					.setTitle('Rappel')
					.setDescription(reminder.reminder)

				await user.send({ embeds: [embed] }).catch(console.error)
				return
			}

			const channel = await client.channels.fetch(reminder.channel).catch(() => null)
			if (!channel?.isTextBased()) return

			await channel
				.send({
					content: `Rappel pour <@${reminder.discordID}> : ${reminder.reminder}`,
				})
				.catch(console.error)
		} catch (error) {
			console.error(error)
		}
	}, delayMs)

export default {
	data: new SlashCommandBuilder()
		.setName('remind')
		.setDescription('Gère les rappels')
		.addSubcommand((subcommand) =>
			subcommand.setName('view').setDescription('Voir la liste de ses rappels'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Crée un rappel')
				.addStringOption((option) =>
					option
						.setName('temps')
						.setDescription(
							"Temps avant le rappel (précisez l'unité de temps en minutes / heures / jours : 1m, 2h, 3d)",
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option.setName('rappel').setDescription('Rappel').setRequired(true),
				)
				.addBooleanOption((option) =>
					option.setName('private').setDescription('En privé ?').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('edit')
				.setDescription('Modifie un rappel')
				.addStringOption((option) =>
					option.setName('id').setDescription('ID du rappel').setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('temps')
						.setDescription(
							"Temps avant le rappel (précisez l'unité de temps en minutes / heures / jours : 1m, 2h, 3d)",
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option.setName('rappel').setDescription('Rappel').setRequired(true),
				)
				.addBooleanOption((option) =>
					option.setName('private').setDescription('En privé ?').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('del')
				.setDescription('Supprime un rappel')
				.addStringOption((option) =>
					option.setName('id').setDescription('ID du rappel').setRequired(true),
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

		switch (interaction.options.getSubcommand()) {
			case 'view': {
				let reminders = []

				try {
					const sql =
						'SELECT * FROM reminders WHERE discordID = ? ORDER BY timestampEnd ASC'
					const data = [interaction.user.id]
					const [result] = await bdd.execute(sql, data)
					reminders = result ?? []
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des rappels en base de données 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!reminders.length) {
					return interaction.reply({
						content: "Aucun rappel n'a été créé 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				const fieldsEmbedView = reminders.map((reminder) => ({
					name: `Rappel #${reminder.id}`,
					value: `Message : ${reminder.reminder}\nDate : ${convertDateForDiscord(
						reminder.timestampEnd * 1000,
					)}`,
				}))

				const paginationView = new Pagination(interaction, {
					firstEmoji: '⏮',
					prevEmoji: '◀️',
					nextEmoji: '▶️',
					lastEmoji: '⏭',
					limit: 5,
					idle: 120000,
					ephemeral: true,
					prevDescription: '',
					postDescription: '',
					buttonStyle: ButtonStyle.Secondary,
					loop: false,
				})

				paginationView.setTitle('Mes rappels')
				paginationView.setDescription(`**Total : ${reminders.length}**`)
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
				paginationView.paginateFields(true)

				return paginationView.render()
			}

			case 'create': {
				const temps = interaction.options.getString('temps')
				const rappel = interaction.options.getString('rappel').trim()
				const prive = interaction.options.getBoolean('private')

				const durationMs = ms(temps)
				if (!Number.isFinite(durationMs) || durationMs <= 0) {
					return interaction.reply({
						content: 'Le délai est invalide 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (durationMs > MAX_TIMEOUT_MS) {
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				const timestampEnd = Math.round((Date.now() + durationMs) / 1000)

				let insertId = null
				try {
					const sql =
						'INSERT INTO reminders (discordID, reminder, timestampEnd, channel, private, timeoutId) VALUES (?, ?, ?, ?, ?, ?)'
					const data = [
						interaction.user.id,
						rappel,
						timestampEnd,
						interaction.channel.id,
						prive ? 1 : 0,
						null,
					]
					const [result] = await bdd.execute(sql, data)
					insertId = result.insertId
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la création du rappel en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				const timeout = scheduleReminder({
					client,
					bdd,
					reminder: {
						id: insertId,
						discordID: interaction.user.id,
						reminder: rappel,
						timestampEnd,
						channel: interaction.channel.id,
						private: prive ? 1 : 0,
					},
					delayMs: durationMs,
				})

				try {
					const sql = 'UPDATE reminders SET timeoutId = ? WHERE id = ?'
					const data = [Number(timeout), insertId]
					await bdd.execute(sql, data)
				} catch (error) {
					console.error(error)
				}

				return interaction.reply({
					content: `Rappel créé 👌\nRappel : ${rappel}\nProgrammé le ${convertDateForDiscord(
						timestampEnd * 1000,
					)}`,
					ephemeral: prive,
				})
			}

			case 'edit': {
				const id = interaction.options.getString('id')
				const temps = interaction.options.getString('temps')
				const rappel = interaction.options.getString('rappel').trim()
				const prive = interaction.options.getBoolean('private')

				let fetchReminder = null
				try {
					const sql = 'SELECT * FROM reminders WHERE id = ?'
					const data = [id]
					const [result] = await bdd.execute(sql, data)
					fetchReminder = result[0] ?? null
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la modification du rappel en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!fetchReminder) {
					return interaction.reply({
						content: "Ce rappel n'existe pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchReminder.discordID !== interaction.user.id) {
					return interaction.reply({
						content: "Ce rappel ne t'appartient pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				const durationMs = ms(temps)
				if (!Number.isFinite(durationMs) || durationMs <= 0) {
					return interaction.reply({
						content: 'Le délai est invalide 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (durationMs > MAX_TIMEOUT_MS) {
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchReminder.timeoutId !== null) {
					clearTimeout(Number(fetchReminder.timeoutId))
				}

				const timestampEnd = Math.round((Date.now() + durationMs) / 1000)

				try {
					const sql =
						'UPDATE reminders SET reminder = ?, timestampEnd = ?, channel = ?, private = ?, timeoutId = ? WHERE id = ?'
					const data = [
						rappel,
						timestampEnd,
						interaction.channel.id,
						prive ? 1 : 0,
						null,
						fetchReminder.id,
					]
					await bdd.execute(sql, data)
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la modification du rappel en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				const timeout = scheduleReminder({
					client,
					bdd,
					reminder: {
						id: fetchReminder.id,
						discordID: interaction.user.id,
						reminder: rappel,
						timestampEnd,
						channel: interaction.channel.id,
						private: prive ? 1 : 0,
					},
					delayMs: durationMs,
				})

				try {
					const sql = 'UPDATE reminders SET timeoutId = ? WHERE id = ?'
					const data = [Number(timeout), fetchReminder.id]
					await bdd.execute(sql, data)
				} catch (error) {
					console.error(error)
				}

				return interaction.reply({
					content: `Rappel modifié 👌\nRappel : ${rappel}\nProgrammé le ${convertDateForDiscord(
						timestampEnd * 1000,
					)}`,
					ephemeral: prive,
				})
			}

			case 'del': {
				const id = interaction.options.getString('id')

				let fetchReminder = null
				try {
					const sql = 'SELECT * FROM reminders WHERE id = ?'
					const data = [id]
					const [result] = await bdd.execute(sql, data)
					fetchReminder = result[0] ?? null
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la suppression du rappel en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!fetchReminder) {
					return interaction.reply({
						content: "Le rappel n'existe pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchReminder.discordID !== interaction.user.id) {
					return interaction.reply({
						content: "Ce rappel ne t'appartient pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sql = 'DELETE FROM reminders WHERE id = ? AND discordID = ?'
					const data = [id, interaction.user.id]
					const [result] = await bdd.execute(sql, data)

					if (fetchReminder.timeoutId !== null) {
						clearTimeout(Number(fetchReminder.timeoutId))
					}

					if (result.affectedRows === 1) {
						return interaction.reply({
							content: 'Le rappel a bien été supprimé 👌',
							flags: MessageFlags.Ephemeral,
						})
					}
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la suppression du rappel en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: "Le rappel n'existe pas 😬",
					flags: MessageFlags.Ephemeral,
				})
			}
		}
	},
}
