import {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	ActionRowBuilder,
	TextInputStyle,
	MessageFlags,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('commands-admin')
		.setDescription('Gère les commandes personnalisées')
		.addSubcommand((subcommand) =>
			subcommand.setName('create').setDescription('Crée une nouvelle commande'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('edit')
				.setDescription('Modifie une commande')
				.addStringOption((option) =>
					option
						.setName('nom')
						.setDescription('Nom de la commande à modifier')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('del')
				.setDescription('Supprime une commande')
				.addStringOption((option) =>
					option
						.setName('nom')
						.setDescription('Nom de la commande à supprimer')
						.setRequired(true),
				),
		),

	interaction: async (interaction, client) => {
		const subcommand = interaction.options.getSubcommand()
		const nom = interaction.options.getString('nom')?.trim().toLowerCase() ?? null

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		switch (subcommand) {
			case 'create': {
				const modalCreate = new ModalBuilder()
					.setCustomId('command-create')
					.setTitle("Création d'une nouvelle commande")
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('name-command-create')
								.setLabel('Nom de la commande')
								.setStyle(TextInputStyle.Short)
								.setMinLength(1)
								.setMaxLength(255)
								.setRequired(true),
						),
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('aliases-command-create')
								.setLabel('Alias de la commande')
								.setStyle(TextInputStyle.Paragraph)
								.setRequired(false),
						),
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('active-command-create')
								.setLabel('Activation de la commande')
								.setStyle(TextInputStyle.Short)
								.setValue('1')
								.setMinLength(1)
								.setMaxLength(1)
								.setRequired(true),
						),
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('content-command-create')
								.setLabel('Contenu de la commande')
								.setStyle(TextInputStyle.Paragraph)
								.setMinLength(1)
								.setRequired(true),
						),
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('button-command-create')
								.setLabel('Infos du bouton de la commande')
								.setPlaceholder('Texte|||https://exemple.com')
								.setStyle(TextInputStyle.Short)
								.setRequired(false),
						),
					)

				return interaction.showModal(modalCreate)
			}

			case 'edit': {
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

				if (!commandBdd) {
					return interaction.reply({
						content: `La commande **${nom}** n'existe pas 😕`,
						flags: MessageFlags.Ephemeral,
					})
				}

				const modalEdit = new ModalBuilder()
					.setCustomId('command-edit')
					.setTitle("Modification d'une commande")
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('name-command-edit')
								.setLabel('Nom de la commande')
								.setStyle(TextInputStyle.Short)
								.setValue(commandBdd.name)
								.setMinLength(1)
								.setMaxLength(255)
								.setRequired(true),
						),
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('aliases-command-edit')
								.setLabel('Alias de la commande')
								.setStyle(TextInputStyle.Paragraph)
								.setValue(commandBdd.aliases ?? '')
								.setRequired(false),
						),
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('active-command-edit')
								.setLabel('Activation de la commande')
								.setStyle(TextInputStyle.Short)
								.setValue(String(commandBdd.active))
								.setMinLength(1)
								.setMaxLength(1)
								.setRequired(true),
						),
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('content-command-edit')
								.setLabel('Nouveau contenu de la commande')
								.setStyle(TextInputStyle.Paragraph)
								.setValue(commandBdd.content ?? '')
								.setMinLength(1)
								.setRequired(true),
						),
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('button-command-edit')
								.setLabel('Infos du nouveau bouton de la commande')
								.setPlaceholder('Texte|||https://exemple.com')
								.setStyle(TextInputStyle.Short)
								.setValue(
									`${commandBdd.textLinkButton ?? ''}${
										commandBdd.textLinkButton || commandBdd.linkButton
											? '|||'
											: ''
									}${commandBdd.linkButton ?? ''}`,
								)
								.setRequired(false),
						),
					)

				return interaction.showModal(modalEdit)
			}

			case 'del': {
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

				if (!commandBdd) {
					return interaction.reply({
						content: `La commande **${nom}** n'existe pas 😕`,
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sql = 'DELETE FROM commands WHERE name = ?'
					const data = [nom]
					await bdd.execute(sql, data)
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la suppression de la commande en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: `La commande **${nom}** a bien été supprimée 👌`,
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
