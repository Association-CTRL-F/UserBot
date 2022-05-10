import { Modal, TextInputComponent, showModal } from 'discord-modals'

export default {
	data: {
		name: 'select-rule-create',
	},
	interaction: (menu, client) => {
		const modalCreate = new Modal()
			.setCustomId('rule-create')
			.setTitle("Création d'une règle")
			.addComponents(
				new TextInputComponent()
					.setCustomId('rule-create-type')
					.setLabel('Type de la règle')
					.setStyle('SHORT')
					.setMinLength(1)
					.setMaxLength(255)
					.setDefaultValue(menu.values[0])
					.setRequired(true),
			)
			.addComponents(
				new TextInputComponent()
					.setCustomId('rule-create-id')
					.setLabel('ID personnalisé de la règle')
					.setStyle('SHORT')
					.setMinLength(1)
					.setMaxLength(255)
					.setRequired(true),
			)
			.addComponents(
				new TextInputComponent()
					.setCustomId('rule-create-regex')
					.setLabel('Regex de la règle')
					.setStyle('LONG')
					.setMinLength(1)
					.setRequired(true),
			)
			.addComponents(
				new TextInputComponent()
					.setCustomId('rule-create-ignored-roles')
					.setLabel('Rôles à ignorer')
					.setStyle('LONG')
					.setMinLength(1)
					.setRequired(true),
			)
			.addComponents(
				new TextInputComponent()
					.setCustomId('rule-create-reason')
					.setLabel('Raison')
					.setStyle('LONG')
					.setMinLength(1)
					.setRequired(true),
			)

		return showModal(modalCreate, {
			client: client,
			interaction: menu,
		})
	},
}
