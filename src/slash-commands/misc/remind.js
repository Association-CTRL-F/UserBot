/* eslint-disable no-case-declarations */
/* eslint-disable default-case */

import { SlashCommandBuilder } from '@discordjs/builders'
import { convertDateForDiscord } from '../../util/util.js'
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
				.setName('del')
				.setDescription('Supprime un rappel')
				.addStringOption(option =>
					option.setName('id').setDescription('ID du rappel').setRequired(true),
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

		switch (interaction.options.getSubcommand()) {
			// Visualisation des rappels
			case 'view':
				let reminders = []
				try {
					const sqlSelect = 'SELECT * FROM reminders WHERE discordID = ?'
					const dataSelect = [interaction.user.id]
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
					idle: 30000,
					ephemeral: true,
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
				const timestampStart = Math.round(Date.now() / 1000) * 1000
				const timestampEnd = new Date().setMilliseconds(ms(temps))

				const delay = timestampEnd - timestampStart

				if (delay.toString(2).length > 32)
					return interaction.reply({
						content:
							'Le délai est trop grand et dépasse la limite autorisée de 32 bits 😬',
						ephemeral: true,
					})

				try {
					const sql =
						'INSERT INTO reminders (discordID, reminder, timestampEnd, channel, private) VALUES (?, ?, ?, ?, ?)'
					const data = [
						interaction.user.id,
						rappel,
						timestampEnd,
						interaction.channel.id,
						prive ? 1 : 0,
					]
					await bdd.execute(sql, data)
				} catch (error) {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la création du rappel en base de données 😬',
						ephemeral: true,
					})
				}

				setTimeout(async () => {
					try {
						const sqlDelete = 'DELETE FROM reminders WHERE timestampEnd = ?'
						const dataDelete = [timestampEnd]
						await bdd.execute(sqlDelete, dataDelete)

						const member = interaction.guild.members.cache.get(interaction.user.id)

						const embed = {
							color: '#C27C0E',
							title: 'Rappel',
							description: rappel,
						}

						if (prive)
							return member.send({
								embeds: [embed],
							})

						return interaction.channel.send({
							content: `Rappel pour ${interaction.user} : ${rappel}`,
						})
					} catch {
						return interaction.reply({
							content:
								'Une erreur est survenue lors de la suppression du rappel en base de données 😬',
							ephemeral: true,
						})
					}
				}, delay)

				return interaction.reply({
					content: `Rappel créé 👌\nRappel : ${rappel}\nProgrammé le ${convertDateForDiscord(
						timestampEnd,
					)}`,
					ephemeral: prive,
				})

			// Suppression d'un rappel
			case 'del':
				// Acquisition de l'id du rappel
				// Fetch du rappel
				let fetchReminder = {}
				try {
					const id = interaction.options.getString('id')
					const sqlSelect = 'SELECT * FROM reminders WHERE id = ?'
					const dataSelect = [id]
					const [resultDelete] = await bdd.execute(sqlSelect, dataSelect)
					fetchReminder = resultDelete[0]
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
					const sqlDelete = 'DELETE FROM reminders WHERE id = ?'
					const dataDelete = [id]
					const [resultDelete] = await bdd.execute(sqlDelete, dataDelete)
					deletedReminder = resultDelete
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la suppression du rappel 😬',
						ephemeral: true,
					})
				}

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
