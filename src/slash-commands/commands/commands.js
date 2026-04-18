import { SlashCommandBuilder, EmbedBuilder, ButtonStyle, MessageFlags } from 'discord.js'
import { convertDateForDiscord } from '../../util/util.js'
import { Pagination } from 'pagination.djs'

export default {
	data: new SlashCommandBuilder()
		.setName('commands')
		.setDescription('Commandes personnalisées')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('view')
				.setDescription('Voir la liste des commandes')
				.addStringOption((option) =>
					option.setName('nom').setDescription('Nom de la commande'),
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
			case 'view': {
				// Acquisition du nom
				const nom = interaction.options.getString('nom')?.trim().toLowerCase() ?? null

				if (nom) {
					// Vérification si la commande existe
					let commandBdd = null
					try {
						const sql = 'SELECT * FROM commands WHERE name = ?'
						const data = [nom]
						const [result] = await bdd.execute(sql, data)
						commandBdd = result[0] ?? null
					} catch (error) {
						console.error(error)
						return interaction.reply({
							content:
								'Une erreur est survenue lors de la récupération de la commande en base de données 😕',
							flags: MessageFlags.Ephemeral,
						})
					}

					// Vérification que la commande existe bien
					if (!commandBdd) {
						return interaction.reply({
							content: `La commande **${nom}** n'existe pas 😕`,
							flags: MessageFlags.Ephemeral,
						})
					}

					const commandAuthor = await interaction.guild.members
						.fetch(commandBdd.author)
						.catch(() => null)

					const commandEditor = commandBdd.lastModificationBy
						? await interaction.guild.members
								.fetch(commandBdd.lastModificationBy)
								.catch(() => null)
						: null

					const creationText = commandAuthor
						? `Créée par ${commandAuthor.user.tag} (${convertDateForDiscord(
								commandBdd.createdAt * 1000,
							)})`
						: `Créée le ${convertDateForDiscord(commandBdd.createdAt * 1000)}`

					const modificationText =
						commandBdd.lastModificationAt !== null
							? commandEditor
								? `Dernière modification par ${commandEditor.user.tag} (${convertDateForDiscord(
										commandBdd.lastModificationAt * 1000,
									)})`
								: `Dernière modification le ${convertDateForDiscord(
										commandBdd.lastModificationAt * 1000,
									)}`
							: null

					const escapedContent = commandBdd.content.replace(/```/g, '\\`\\`\\`')

					const embed = new EmbedBuilder()
						.setColor(0xc27c0e)
						.setTitle(`Commande personnalisée "${commandBdd.name}"`)
						.addFields({
							name: 'Contenu',
							value: `\`\`\`${escapedContent}\`\`\``,
						})

					if (commandBdd.aliases) {
						embed.addFields({
							name: 'Alias',
							value: `\`\`\`${commandBdd.aliases}\`\`\``,
						})
					}

					if (commandBdd.linkButton) {
						embed.addFields({
							name: 'Lien externe',
							value: `\`\`\`${commandBdd.linkButton}\`\`\``,
						})
					}

					embed.addFields(
						{
							name: 'Activation',
							value: commandBdd.active === 0 ? 'Désactivée' : 'Activée',
						},
						{
							name: 'Historique',
							value: `${creationText}${
								modificationText ? `\n${modificationText}` : ''
							}\nUtilisée ${commandBdd.numberOfUses} fois`,
						},
					)

					return interaction.reply({
						embeds: [embed],
						flags: MessageFlags.Ephemeral,
					})
				}

				// Récupération des commandes
				let commands = []
				try {
					const sql = 'SELECT * FROM commands'
					const [result] = await bdd.execute(sql)
					commands = result ?? []
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des commandes 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				const activeCommands = commands.filter((command) => command.active)

				if (activeCommands.length === 0) {
					return interaction.reply({
						content: "Aucune commande active n'a été créée 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				// Boucle d'ajout des champs
				const fieldsEmbedView = activeCommands.map((command) => {
					const commandContent =
						command.content.length < 100
							? command.content.slice(0, 100)
							: `${command.content.slice(0, 100)} [...]`

					return {
						name: command.name,
						value: commandContent,
					}
				})

				// Configuration de la pagination
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

				paginationView.setTitle('Commandes personnalisées')
				paginationView.setDescription(
					`**Total : ${activeCommands.length}\nPréfixe : \`${client.config.guild.COMMANDS_PREFIX}\`**`,
				)
				paginationView.setColor(0xc27c0e)
				paginationView.setFields(fieldsEmbedView)
				paginationView.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
				paginationView.paginateFields(true)

				// Envoi
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
