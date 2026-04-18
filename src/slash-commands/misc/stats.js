import { SlashCommandBuilder, ButtonStyle, MessageFlags } from 'discord.js'
import { Pagination } from 'pagination.djs'

export default {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Affiche les stats')
		.addSubcommand((subcommand) =>
			subcommand.setName('commands').setDescription('Affiche les stats des commandes'),
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
			case 'commands': {
				let commands = []

				try {
					const sql = 'SELECT * FROM commands ORDER BY numberOfUses DESC'
					const [result] = await bdd.execute(sql)
					commands = result ?? []
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des commandes en base de données 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				const activeCommands = commands.filter((command) => command.active === 1)

				if (!activeCommands.length) {
					return interaction.reply({
						content: "Aucune commande active n'a été créée 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				// Boucle d'ajout des champs
				const fieldsEmbedView = activeCommands.map((command, index) => ({
					name: `${index + 1}. ${command.name}`,
					value: `Utilisée ${command.numberOfUses} fois`,
				}))

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
					buttonStyle: ButtonStyle.Secondary,
					loop: false,
				})

				paginationView.setTitle('Classement des commandes')
				paginationView.setDescription(`**Total : ${activeCommands.length}**`)
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
				paginationView.paginateFields(true)

				return paginationView.render()
			}

			default:
				return interaction.reply({
					content: 'Sous-commande inconnue 😕',
					flags: MessageFlags.Ephemeral,
				})
		}
	},
}
