/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import {
	SlashCommandBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js'

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
				const modal = new ModalBuilder()
					.setCustomId('form-create')
					.setTitle("Création d'un nouveau formulaire")
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('form-create-name')
								.setLabel('Nom')
								.setStyle(TextInputStyle.Short)
								.setMinLength(1)
								.setMaxLength(255)
								.setRequired(true),
						),
					)
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('form-create-content')
								.setLabel('Contenu')
								.setStyle(TextInputStyle.Paragraph)
								.setMinLength(1)
								.setRequired(true),
						),
					)

				return interaction.showModal(modal)

			// Modification d'un formulaire
			case 'edit':
				// Acquisition de la base de données
				const bdd = client.config.db.pools.userbot
				if (!bdd)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la connexion à la base de données 😕',
						ephemeral: true,
					})

				// Récupération des formulaires
				let forms = []
				try {
					const sql = 'SELECT * FROM forms'
					const [result] = await bdd.execute(sql)
					forms = result
				} catch {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des formulaires 😬',
						ephemeral: true,
					})
				}

				if (forms.length === 0)
					return interaction.reply({
						content: "Aucun formulaire n'a été créé 😕",
						ephemeral: true,
					})

				const arrayForms = []
				forms.forEach(form => {
					arrayForms.push({
						label: form.name,
						description: `Modification du formulaire "${form.name}"`,
						value: form.name,
					})
				})

				const menu = new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId('select-edit-form')
						.setPlaceholder('Sélectionnez le formulaire')
						.addOptions(arrayForms[0]),
				)

				return interaction.reply({
					content: 'Choisissez le formulaire à modifier',
					components: [menu],
					ephemeral: true,
				})
		}
	},
}
