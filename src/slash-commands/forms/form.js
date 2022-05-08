/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { MessageActionRow, MessageSelectMenu } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { Modal, TextInputComponent, showModal } from 'discord-modals'
import { db } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('form')
		.setDescription('Gère les formulaires')
		.addSubcommand(subcommand =>
			subcommand.setName('create').setDescription('Crée un nouveau formulaire'),
		)
		.addSubcommand(subcommand =>
			subcommand.setName('edit').setDescription('Modifie un formulaire'),
		),
	interaction: async (interaction, client) => {
		switch (interaction.options.getSubcommand()) {
			// Nouveau formulaire
			case 'create':
				const modalConfig = new Modal()
					.setCustomId('form-create')
					.setTitle("Création d'un nouveau formulaire")
					.addComponents(
						new TextInputComponent()
							.setCustomId('name-form')
							.setLabel('Nom')
							.setStyle('SHORT')
							.setMinLength(1)
							.setMaxLength(255)
							.setRequired(true),
					)
					.addComponents(
						new TextInputComponent()
							.setCustomId('content-form')
							.setLabel('Contenu')
							.setStyle('LONG')
							.setMinLength(1)
							.setRequired(true),
					)

				return showModal(modalConfig, {
					client: client,
					interaction: interaction,
				})

			// Modification d'un formulaire
			case 'edit':
				// Acquisition de la base de données
				const bdd = await db(client, client.config.dbName)
				if (!bdd)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la connexion à la base de données 😕',
						ephemeral: true,
					})

				// Récupération des formulaires
				let forms = []
				try {
					const sqlSelect = 'SELECT * FROM forms'
					const [resultSelect] = await bdd.execute(sqlSelect)
					forms = resultSelect
				} catch {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des formulaires 😬',
						ephemeral: true,
					})
				}

				const arrayForms = []
				forms.forEach(form => {
					arrayForms.push({
						label: form.name,
						description: `Modification du formulaire "${form.name}"`,
						value: form.name,
					})
				})

				const menu = new MessageActionRow().addComponents(
					new MessageSelectMenu()
						.setCustomId('select-form')
						.setPlaceholder('Sélectionnez le formulaire')
						.addOptions(arrayForms),
				)

				return interaction.reply({
					content: 'Choisissez le formulaire à modifier',
					components: [menu],
					ephemeral: true,
				})
		}
	},
}
