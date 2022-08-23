/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('commands-admin')
		.setDescription('Gère les commandes personnalisées')
		.addSubcommand(subcommand =>
			subcommand.setName('create').setDescription('Crée une nouvelle commande'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('edit')
				.setDescription('Modifie une commande')
				.addStringOption(option =>
					option
						.setName('nom')
						.setDescription('Nom de la commande à modifier')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('del')
				.setDescription('Supprime une commande')
				.addStringOption(option =>
					option
						.setName('nom')
						.setDescription('Nom de la commande à supprimer')
						.setRequired(true),
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

		// Acquisition du nom
		const nom = interaction.options.getString('nom')

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la commande existe
		let commandBdd = {}
		try {
			const sqlCheckName = 'SELECT * FROM commands WHERE name = ? AND guildId = ?'
			const dataCheckName = [nom, interaction.guild.id]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			commandBdd = resultCheckName[0]
		} catch (error) {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la récupération de la commande en base de données 😕',
				ephemeral: true,
			})
		}

		switch (interaction.options.getSubcommand()) {
			// Nouvelle commande
			case 'create':
				const modalCreate = new ModalBuilder()
					.setCustomId('command-create')
					.setTitle("Création d'une nouvelle commande")
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('name-command-create')
								.setLabel('Nom de la commande')
								.setStyle('Short')
								.setMinLength(1)
								.setMaxLength(255)
								.setRequired(true),
						),
					)
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('aliases-command-create')
								.setLabel('Alias de la commande')
								.setStyle('Paragraph')
								.setMinLength(1)
								.setRequired(false),
						),
					)
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('content-command-create')
								.setLabel('Contenu de la commande')
								.setStyle('Paragraph')
								.setMinLength(1)
								.setRequired(true),
						),
					)

				return interaction.showModal(modalCreate)

			// Modifie une commande
			case 'edit':
				// Vérification que la commande existe bien
				if (!commandBdd)
					return interaction.reply({
						content: `La commande **${nom}** n'existe pas 😕`,
						ephemeral: true,
					})

				const modalEdit = new ModalBuilder()
					.setCustomId('command-edit')
					.setTitle("Modification d'une commande")
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('name-command-edit')
								.setLabel('Nom de la commande')
								.setStyle('Short')
								.setValue(commandBdd.name)
								.setMinLength(1)
								.setMaxLength(255)
								.setRequired(true),
						),
					)
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('aliases-command-edit')
								.setLabel('Alias de la commande')
								.setStyle('Paragraph')
								.setValue(commandBdd.aliases ? commandBdd.aliases : '')
								.setMinLength(1)
								.setRequired(false),
						),
					)
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('content-command-edit')
								.setLabel('Nouveau contenu de la commande')
								.setStyle('Paragraph')
								.setValue(commandBdd.content)
								.setMinLength(1)
								.setRequired(true),
						),
					)

				return interaction.showModal(modalEdit)

			// Supprime une commande
			case 'del':
				// Vérification que la commande existe bien
				if (!commandBdd)
					return interaction.reply({
						content: `La commande **${nom}** n'existe pas 😕`,
						ephemeral: true,
					})

				// Si oui, alors suppression de la commande en base de données
				try {
					const sqlDelete = 'DELETE FROM commands WHERE name = ? AND guildId = ?'
					const dataDelete = [nom, interaction.guild.id]

					await bdd.execute(sqlDelete, dataDelete)
				} catch {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la suppression de la commande en base de données 😬',
						ephemeral: true,
					})
				}

				return interaction.reply({
					content: `La commande **${nom}** a bien été supprimée 👌`,
				})
		}
	},
}
