import { Modal, TextInputComponent, MessageActionRow } from 'discord.js'

export default {
	data: {
		name: 'select-rule-create',
	},
	interaction: menu => {
		const modalCreate = new Modal()
			.setCustomId('rule-create')
			.setTitle("Création d'une règle")
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-create-type')
						.setLabel('Type de la règle')
						.setStyle('SHORT')
						.setMinLength(1)
						.setMaxLength(255)
						.setValue(menu.values[0])
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-create-id')
						.setLabel('ID personnalisé de la règle')
						.setStyle('SHORT')
						.setMinLength(1)
						.setMaxLength(255)
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-create-regex')
						.setLabel('Regex de la règle')
						.setStyle('PARAGRAPH')
						.setMinLength(1)
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-create-ignored-roles')
						.setLabel('Rôles à ignorer')
						.setStyle('PARAGRAPH')
						.setMinLength(1)
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-create-reason')
						.setLabel('Raison')
						.setStyle('PARAGRAPH')
						.setMinLength(1)
						.setRequired(true),
				),
			)

		return menu.showModal(modalCreate)
	},
}
