import { Modal, TextInputComponent, MessageActionRow } from 'discord.js'

export default {
	data: {
		name: 'select-rule-edit',
	},
	interaction: async (menu, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return menu.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la règle existe
		let rule = {}
		try {
			const sqlCheckName = 'SELECT * FROM automodRules WHERE customId = ?'
			const dataCheckName = [menu.values[0]]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			rule = resultCheckName[0]
		} catch (error) {
			return menu.reply({
				content:
					'Une erreur est survenue lors de la récupération da la règle en base de données 😕',
				ephemeral: true,
			})
		}

		// Vérification si la règle existe bien
		if (!rule)
			return menu.reply({
				content: `La règle **${menu.values[0]}** n'existe pas 😕`,
				ephemeral: true,
			})

		const modalCreate = new Modal()
			.setCustomId('rule-edit')
			.setTitle("Modification d'une règle")
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-edit-type')
						.setLabel('Type de la règle')
						.setStyle('SHORT')
						.setMinLength(1)
						.setMaxLength(255)
						.setValue(rule.type)
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-edit-id')
						.setLabel('ID de la règle')
						.setStyle('SHORT')
						.setMinLength(1)
						.setMaxLength(255)
						.setValue(rule.customId)
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-edit-regex')
						.setLabel('Regex de la règle')
						.setStyle('PARAGRAPH')
						.setMinLength(1)
						.setValue(rule.regex)
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-edit-ignored-roles')
						.setLabel('Rôles à ignorer')
						.setStyle('PARAGRAPH')
						.setMinLength(1)
						.setValue(rule.ignoredRoles)
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('rule-edit-reason')
						.setLabel('Raison')
						.setStyle('PARAGRAPH')
						.setMinLength(1)
						.setValue(rule.reason)
						.setRequired(true),
				),
			)

		return menu.showModal(modalCreate)
	},
}
