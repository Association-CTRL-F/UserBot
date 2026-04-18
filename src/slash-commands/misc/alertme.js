import { SlashCommandBuilder, ButtonStyle, MessageFlags } from 'discord.js'
import { Pagination } from 'pagination.djs'

export default {
	data: new SlashCommandBuilder()
		.setName('alertme')
		.setDescription('Gère les alertes')
		.addSubcommand((subcommand) =>
			subcommand.setName('view').setDescription('Voir la liste de ses alertes'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Crée une alerte')
				.addStringOption((option) =>
					option
						.setName('texte')
						.setDescription('Texte sur lequel vous voulez être alerté')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('del')
				.setDescription('Supprime une alerte')
				.addStringOption((option) =>
					option.setName('id').setDescription("ID de l'alerte").setRequired(true),
				),
		),

	interaction: async (interaction, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		switch (interaction.options.getSubcommand()) {
			// Visualisation des alertes
			case 'view': {
				let alerts = []

				try {
					const sql = 'SELECT * FROM alerts WHERE discordID = ? ORDER BY id ASC'
					const data = [interaction.user.id]
					const [result] = await bdd.execute(sql, data)
					alerts = result ?? []
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des alertes en base de données 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!alerts.length) {
					return interaction.reply({
						content: "Aucune alerte n'a été créée 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				const fieldsEmbedView = alerts.map((alert) => {
					const textCut =
						alert.text.length < 50
							? alert.text.slice(0, 50)
							: `${alert.text.slice(0, 50)} [...]`

					return {
						name: `Alerte #${alert.id}`,
						value: `Texte : ${textCut}`,
					}
				})

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

				return paginationView.render()
			}

			// Création d'une alerte
			case 'create': {
				const text = interaction.options.getString('texte').trim().toLowerCase()

				if (!text) {
					return interaction.reply({
						content: "Le texte de l'alerte est vide 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sql = 'INSERT INTO alerts (discordID, text) VALUES (?, ?)'
					const data = [interaction.user.id, text]
					await bdd.execute(sql, data)
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la création de l'alerte en base de données 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: `Alerte créée 👌\nTexte : ${text}`,
					flags: MessageFlags.Ephemeral,
				})
			}

			// Suppression d'une alerte
			case 'del': {
				const id = interaction.options.getString('id')

				let fetchAlert = null
				try {
					const sql = 'SELECT * FROM alerts WHERE id = ?'
					const data = [id]
					const [result] = await bdd.execute(sql, data)
					fetchAlert = result[0] ?? null
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la récupération de l'alerte en base de données 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!fetchAlert) {
					return interaction.reply({
						content: "L'alerte n'existe pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (fetchAlert.discordID !== interaction.user.id) {
					return interaction.reply({
						content: "Cette alerte ne t'appartient pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sql = 'DELETE FROM alerts WHERE id = ? AND discordID = ?'
					const data = [id, interaction.user.id]
					const [result] = await bdd.execute(sql, data)

					if (result.affectedRows === 1) {
						return interaction.reply({
							content: "L'alerte a bien été supprimée 👌",
							flags: MessageFlags.Ephemeral,
						})
					}
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la suppression de l'alerte en base de données 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: "L'alerte n'existe pas 😬",
					flags: MessageFlags.Ephemeral,
				})
			}
		}
	},
}
