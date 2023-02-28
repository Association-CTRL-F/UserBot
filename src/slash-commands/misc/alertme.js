/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder, ButtonStyle } from 'discord.js'
import { Pagination } from 'pagination.djs'

export default {
	data: new SlashCommandBuilder()
		.setName('alertme')
		.setDescription('Gère les rappels')
		.addSubcommand(subcommand =>
			subcommand.setName('view').setDescription('Voir la liste de ses alertes'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Crée une alerte')
				.addStringOption(option =>
					option
						.setName('texte')
						.setDescription('Texte sur lequel vous voulez être alerté')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('del')
				.setDescription('Supprime une alerte')
				.addStringOption(option =>
					option.setName('id').setDescription("ID de l'alerte").setRequired(true),
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
				let alerts = []
				try {
					const sql = 'SELECT * FROM alerts WHERE discordID = ?'
					const data = [interaction.user.id]
					const [result] = await bdd.execute(sql, data)
					alerts = result
				} catch (error) {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des alertes 😕',
						ephemeral: true,
					})
				}

				if (alerts.length === 0)
					return interaction.reply({
						content: "Aucune alerte n'a été créée 😕",
						ephemeral: true,
					})

				// Boucle d'ajout des champs
				const fieldsEmbedView = []
				alerts.forEach(alert => {
					let textCut = ''

					if (alert.text.length < 50) textCut = `${alert.text.substr(0, 50)}`
					else textCut = `${alert.text.substr(0, 50)} [...]`

					fieldsEmbedView.push({
						name: `Alerte #${alert.id}`,
						value: `Texte : ${textCut}`,
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
					ephemeral: true,
					prevDescription: '',
					postDescription: '',
					buttonStyle: ButtonStyle.Secondary,
					loop: false,
				})

				paginationView.setTitle('Mes alertes')
				paginationView.setDescription(`**Total : ${alerts.length}**`)
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
				paginationView.paginateFields(true)

				// Envoi de l'embed
				return paginationView.render()

			// Création d'une alerte
			case 'create':
				const text = interaction.options.getString('texte').trim()

				// Insertion de l'alerte en base de données
				try {
					const sql = 'INSERT INTO alerts (discordID, text) VALUES (?, ?)'
					const data = [interaction.user.id, text]
					await bdd.execute(sql, data)
				} catch (error) {
					console.log(error)
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la création de l'alerte en base de données 😬",
						ephemeral: true,
					})
				}

				return interaction.reply({
					content: `Alerte créée 👌\nTexte : ${text}`,
					ephemeral: true,
				})

			// Suppression d'une alerte
			case 'del':
				// Acquisition de l'id du rappel
				// Fetch de l'alerte
				let fetchAlert = {}
				try {
					const id = interaction.options.getString('id')
					const sql = 'SELECT * FROM reminders WHERE id = ?'
					const data = [id]
					const [result] = await bdd.execute(sql, data)
					fetchAlert = result[0]
				} catch {
					return interaction.reply({
						content: "Une erreur est survenue lors de la suppression de l'alerte 😬",
						ephemeral: true,
					})
				}

				// Vérification si l'alerte existe
				if (!fetchAlert)
					return interaction.reply({
						content: "L'alerte n'existe pas 😬",
						ephemeral: true,
					})

				// Vérification si l'alerte appartient bien au membre
				if (fetchAlert.discordID !== interaction.user.id)
					return interaction.reply({
						content: "Cette alerte ne t'appartient pas 😬",
						ephemeral: true,
					})

				// Suppression en base de données
				let deleteAlert = {}
				try {
					const id = interaction.options.getString('id')
					const sql = 'DELETE FROM alerts WHERE id = ?'
					const data = [id]
					const [result] = await bdd.execute(sql, data)
					deleteAlert = result
				} catch {
					return interaction.reply({
						content: "Une erreur est survenue lors de la suppression de l'alerte 😬",
						ephemeral: true,
					})
				}

				if (deleteAlert.affectedRows === 1)
					return interaction.reply({
						content: "L'alerte a bien été supprimée 👌",
						ephemeral: true,
					})
		}
	},
}
