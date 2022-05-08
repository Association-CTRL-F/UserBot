import { Modal, TextInputComponent, showModal } from 'discord-modals'
import { db } from '../../util/util.js'

export default {
	data: {
		name: 'select-rules',
	},
	interaction: async (menu, client) => {
		// Acquisition de la base de données
		const bdd = await db(client, client.config.dbName)
		if (!bdd)
			return menu.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la règle existe
		let rule = {}
		try {
			const sqlCheckName = 'SELECT * FROM automodRules WHERE ruleName = ?'
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
				new TextInputComponent()
					.setCustomId('rule-edit-type')
					.setLabel('Type de la règle')
					.setStyle('SHORT')
					.setMinLength(1)
					.setMaxLength(255)
					.setDefaultValue(rule.type)
					.setRequired(true),
			)
			.addComponents(
				new TextInputComponent()
					.setCustomId('rule-edit-name')
					.setLabel('Nom de la règle')
					.setStyle('SHORT')
					.setMinLength(1)
					.setMaxLength(255)
					.setDefaultValue(rule.ruleName)
					.setRequired(true),
			)
			.addComponents(
				new TextInputComponent()
					.setCustomId('rule-edit-regex')
					.setLabel('Regex de la règle')
					.setStyle('LONG')
					.setMinLength(1)
					.setDefaultValue(rule.regex)
					.setRequired(true),
			)
			.addComponents(
				new TextInputComponent()
					.setCustomId('rule-edit-reason')
					.setLabel('Raison')
					.setStyle('LONG')
					.setMinLength(1)
					.setDefaultValue(rule.reason)
					.setRequired(true),
			)

		return showModal(modalCreate, {
			client: client,
			interaction: menu,
		})
	},
}
