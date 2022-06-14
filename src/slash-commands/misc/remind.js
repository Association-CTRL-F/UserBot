/* eslint-disable no-mixed-operators */
/* eslint-disable no-case-declarations */
/* eslint-disable default-case */

import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed } from 'discord.js'
import { convertDateForDiscord, isGuildSetup } from '../../util/util.js'
import { Pagination } from 'pagination.djs'
import ms from 'ms'

export default {
	data: new SlashCommandBuilder()
		.setName('remind')
		.setDescription('Gère les rappels')
		.addSubcommand(subcommand =>
			subcommand.setName('view').setDescription('Voir la liste de ses rappels'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Crée un rappel')
				.addStringOption(option =>
					option
						.setName('temps')
						.setDescription(
							"Temps avant le rappel (précisez l'unité de temps en minutes / heures / jours : 1m, 2h, 3d)",
						)
						.setRequired(true),
				)
				.addStringOption(option =>
					option.setName('rappel').setDescription('Rappel').setRequired(true),
				)
				.addBooleanOption(option =>
					option.setName('private').setDescription('En privé ?').setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('edit')
				.setDescription('Modifie un rappel')
				.addStringOption(option =>
					option.setName('id').setDescription('ID du rappel').setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('temps')
						.setDescription(
							"Temps avant le rappel (précisez l'unité de temps en minutes / heures / jours : 1m, 2h, 3d)",
						)
						.setRequired(true),
				)
				.addStringOption(option =>
					option.setName('rappel').setDescription('Rappel').setRequired(true),
				)
				.addBooleanOption(option =>
					option.setName('private').setDescription('En privé ?').setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('del')
				.setDescription('Supprime un rappel')
				.addStringOption(option =>
					option.setName('id').setDescription('ID du rappel').setRequired(true),
				),
		),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		switch (interaction.options.getSubcommand()) {
			// Visualisation des rappels
			case 'view':
				let reminders = []
				try {
					const sqlSelect = 'SELECT * FROM reminders WHERE discordID = ? AND guildId = ?'
					const dataSelect = [interaction.user.id, interaction.guild.id]
					const [resultReminders] = await bdd.execute(sqlSelect, dataSelect)
					reminders = resultReminders
				} catch (error) {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des rappels 😕',
						ephemeral: true,
					})
				}

				// Boucle d'ajout des champs
				const fieldsEmbedView = []
				reminders.forEach(reminder => {
					fieldsEmbedView.push({
						name: `Rappel #${reminder.id}`,
						value: `Message : ${reminder.reminder}\nDate : ${convertDateForDiscord(
							reminder.timestampEnd * 1000,
						)}`,
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

				paginationView.setTitle('Mes rappels')
				paginationView.setDescription(`**Total : ${reminders.length}**`)
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.footer = { text: 'Page : {pageNumber} / {totalPages}' }
				paginationView.paginateFields(true)

				// Envoi de l'embed
				return paginationView.render()

			// Création d'un rappel
			case 'create':
				const temps = interaction.options.getString('temps')
				const rappel = interaction.options.getString('rappel')
				const prive = interaction.options.getBoolean('private')

				if (isNaN(ms(temps)))
					return interaction.reply({
						content: 'Le délai est invalide 😬',
						ephemeral: true,
					})

				// Insertion du rappel en base de données
				const timestampStart = Math.round(Date.now() / 1000)
				const timestampEnd = timestampStart + ms(temps) / 1000

				const delay = (timestampEnd - timestampStart) * 1000

				if (delay.toString(2).length > 31)
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						ephemeral: true,
					})

				const timeout = setTimeout(async () => {
					try {
						const sqlDelete =
							'DELETE FROM reminders WHERE timestampEnd = ? AND guildId = ?'
						const dataDelete = [timestampEnd, interaction.guild.id]
						await bdd.execute(sqlDelete, dataDelete)

						const member = interaction.guild.members.cache.get(interaction.user.id)

						const embed = new MessageEmbed()
							.setColor('#C27C0E')
							.setTitle('Rappel')
							.setDescription(rappel)

						if (prive)
							return member.send({
								embeds: [embed],
							})

						return interaction.channel.send({
							content: `Rappel pour ${interaction.user} : ${rappel}`,
						})
					} catch (error) {
						console.log(error)
					}
				}, delay)

				try {
					const sql =
						'INSERT INTO reminders (guildId, discordID, reminder, timestampEnd, channel, private, timeoutId) VALUES (?, ?, ?, ?, ?, ?, ?)'
					const data = [
						interaction.guild.id,
						interaction.user.id,
						rappel,
						timestampEnd,
						interaction.channel.id,
						prive ? 1 : 0,
						Number(timeout),
					]
					await bdd.execute(sql, data)
				} catch (error) {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la création du rappel en base de données 😬',
						ephemeral: true,
					})
				}

				return interaction.reply({
					content: `Rappel créé 👌\nRappel : ${rappel}\nProgrammé le ${convertDateForDiscord(
						timestampEnd * 1000,
					)}`,
					ephemeral: prive,
				})

			// Modification d'un rappel
			case 'edit':
				const idEdit = interaction.options.getString('id')
				const tempsEdit = interaction.options.getString('temps')
				const rappelEdit = interaction.options.getString('rappel')
				const priveEdit = interaction.options.getBoolean('private')

				// Acquisition de l'id du rappel
				// Fetch du rappel
				let fetchReminderEdit = {}
				try {
					const sqlSelect = 'SELECT * FROM reminders WHERE id = ? AND guildId = ?'
					const dataSelect = [idEdit, interaction.guild.id]
					const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
					fetchReminderEdit = resultSelect[0]
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la modification du rappel 😬',
						ephemeral: true,
					})
				}

				// Vérification si le rappel appartient bien au membre
				if (!fetchReminderEdit)
					return interaction.reply({
						content: "Ce rappel ne n'existe pas 😬",
						ephemeral: true,
					})

				// Vérification si le rappel appartient bien au membre
				if (fetchReminderEdit.discordID !== interaction.user.id)
					return interaction.reply({
						content: "Ce rappel ne t'appartient pas 😬",
						ephemeral: true,
					})

				if (isNaN(ms(tempsEdit)))
					return interaction.reply({
						content: 'Le délai est invalide 😬',
						ephemeral: true,
					})

				// Modification du rappel en base de données
				const timestampStartEdit = Math.round(Date.now() / 1000)
				const timestampEndEdit = timestampStartEdit + ms(tempsEdit) / 1000

				const delayEdit = (timestampEndEdit - timestampStartEdit) * 1000

				if (delayEdit.toString(2).length > 32)
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						ephemeral: true,
					})

				const timeoutEdit = setTimeout(async () => {
					try {
						const sqlDelete = 'DELETE FROM reminders WHERE id = ? AND guildId = ?'
						const dataDelete = [fetchReminderEdit.id, interaction.guild.id]
						await bdd.execute(sqlDelete, dataDelete)

						const member = interaction.guild.members.cache.get(interaction.user.id)

						const embed = new MessageEmbed()
							.setColor('#C27C0E')
							.setTitle('Rappel')
							.setDescription(rappelEdit)

						if (priveEdit)
							return member.send({
								embeds: [embed],
							})

						return interaction.channel.send({
							content: `Rappel pour ${interaction.user} : ${rappelEdit}`,
						})
					} catch (error) {
						console.log(error)
					}
				}, delayEdit)

				try {
					const sql =
						'UPDATE reminders SET reminder = ?, timestampEnd = ?, channel = ?, private = ?, timeoutId = ? WHERE id = ? AND guildId = ?'
					const data = [
						rappelEdit,
						timestampEndEdit,
						interaction.channel.id,
						priveEdit ? 1 : 0,
						Number(timeoutEdit),
						fetchReminderEdit.id,
						interaction.guild.id,
					]
					await bdd.execute(sql, data)
				} catch (error) {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la modification du rappel en base de données 😬',
						ephemeral: true,
					})
				}

				clearTimeout(fetchReminderEdit.timeoutId)

				return interaction.reply({
					content: `Rappel modifié 👌\nRappel : ${rappelEdit}\nProgrammé le ${convertDateForDiscord(
						timestampEndEdit * 1000,
					)}`,
					ephemeral: priveEdit,
				})

			// Suppression d'un rappel
			case 'del':
				// Acquisition de l'id du rappel
				// Fetch du rappel
				let fetchReminder = {}
				try {
					const id = interaction.options.getString('id')
					const sqlSelect = 'SELECT * FROM reminders WHERE id = ? AND guildId = ?'
					const dataSelect = [id, interaction.guild.id]
					const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
					fetchReminder = resultSelect[0]
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la suppression du rappel 😬',
						ephemeral: true,
					})
				}

				// Vérification si le rappel appartient bien au membre
				if (fetchReminder.discordID !== interaction.user.id)
					return interaction.reply({
						content: "Ce rappel ne t'appartient pas 😬",
						ephemeral: true,
					})

				// Suppresion en base de données
				let deletedReminder = {}
				try {
					const id = interaction.options.getString('id')
					const sqlDelete = 'DELETE FROM reminders WHERE id = ? AND guildId = ?'
					const dataDelete = [id, interaction.guild.id]
					const [resultDelete] = await bdd.execute(sqlDelete, dataDelete)
					deletedReminder = resultDelete
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la suppression du rappel 😬',
						ephemeral: true,
					})
				}

				clearTimeout(fetchReminder.timeoutId)

				if (deletedReminder.affectedRows === 1)
					return interaction.reply({
						content: 'Le rappel a bien été supprimé 👌',
						ephemeral: true,
					})

				// Sinon, message d'erreur
				return interaction.reply({
					content: "Le rappel n'existe pas 😬",
					ephemeral: true,
				})
		}
	},
}
