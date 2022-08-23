import { ModalBuilder, TextInputBuilder, ActionRowBuilder } from 'discord.js'

export default {
	data: {
		name: 'select-rule-create',
	},
	interaction: menu => {
		const modalCreate = new ModalBuilder()
			.setCustomId('rule-create')
			.setTitle("Création d'une règle")
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('rule-create-type')
						.setLabel('Type de la règle')
						.setStyle('Short')
						.setMinLength(1)
						.setMaxLength(255)
						.setValue(menu.values[0])
						.setRequired(true),
				),
			)
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('rule-create-id')
						.setLabel('ID personnalisé de la règle')
						.setStyle('Short')
						.setMinLength(1)
						.setMaxLength(255)
						.setRequired(true),
				),
			)
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('rule-create-regex')
						.setLabel('Regex de la règle')
						.setStyle('Paragraph')
						.setMinLength(1)
						.setRequired(true),
				),
			)
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('rule-create-ignored-roles')
						.setLabel('Rôles à ignorer')
						.setStyle('Paragraph')
						.setMinLength(1)
						.setRequired(true),
				),
			)
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('rule-create-reason')
						.setLabel('Raison')
						.setStyle('Paragraph')
						.setMinLength(1)
						.setRequired(true),
				),
			)

		return menu.showModal(modalCreate)
	},
}
