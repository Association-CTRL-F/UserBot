/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder } from '@discordjs/builders'
import { db } from '../../util/util.js'
import { Modal, TextInputComponent, showModal } from 'discord-modals'

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
				.setName('delete')
				.setDescription('Supprime une commande')
				.addStringOption(option =>
					option.setName('nom').setDescription('Nom de la commande').setRequired(true),
				),
		),
	interaction: async (interaction, client) => {
		// Acquisition du nom
		const nom = interaction.options.getString('nom')

		// Acquisition de la base de données
		const bdd = await db(client, client.config.dbName)
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la commande existe
		let commandBdd = {}
		try {
			const sqlCheckName = 'SELECT * FROM commands WHERE name = ?'
			const dataCheckName = [nom]
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
				const modalCreate = new Modal()
					.setCustomId('command-create')
					.setTitle("Création d'une nouvelle commande")
					.addComponents(
						new TextInputComponent()
							.setCustomId('name-command-create')
							.setLabel('Nom de la commande')
							.setStyle('SHORT')
							.setMinLength(1)
							.setMaxLength(255)
							.setRequired(true),
					)
					.addComponents(
						new TextInputComponent()
							.setCustomId('content-command-create')
							.setLabel('Contenu de la commande')
							.setStyle('LONG')
							.setMinLength(1)
							.setRequired(true),
					)

				return showModal(modalCreate, {
					client: client,
					interaction: interaction,
				})

			// Modifie une commande
			case 'edit':
				// Vérification que la commande existe bien
				if (!commandBdd)
					return interaction.reply({
						content: `La commande **${nom}** n'existe pas 😕`,
						ephemeral: true,
					})

				const modalEdit = new Modal()
					.setCustomId('command-edit')
					.setTitle("Modification d'une commande")
					.addComponents(
						new TextInputComponent()
							.setCustomId('name-command-edit')
							.setLabel('Nom de la commande')
							.setStyle('SHORT')
							.setDefaultValue(commandBdd.name)
							.setMinLength(1)
							.setMaxLength(255)
							.setRequired(true),
					)
					.addComponents(
						new TextInputComponent()
							.setCustomId('content-command-edit')
							.setLabel('Nouveau contenu de la commande')
							.setStyle('LONG')
							.setDefaultValue(commandBdd.content)
							.setMinLength(1)
							.setRequired(true),
					)

				return showModal(modalEdit, {
					client: client,
					interaction: interaction,
				})

			// Supprime une commande
			case 'delete':
				// Vérification que la commande existe bien
				if (!commandBdd)
					return interaction.reply({
						content: `La commande **${nom}** n'existe pas 😕`,
						ephemeral: true,
					})

				// Si oui, alors suppression de la commande en base de données
				try {
					const sqlDelete = 'DELETE FROM commands WHERE name = ?'
					const dataDelete = [nom]

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
