import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, MessageFlags } from 'discord.js'

export default {
	data: {
		name: 'select-edit-form',
	},
	interaction: async (menu, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return menu.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		const formName = menu.values?.[0]?.trim()
		if (!formName) {
			return menu.reply({
				content: 'Aucun formulaire sélectionné 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		// Vérification si le formulaire existe
		let form = null
		try {
			const sql = 'SELECT * FROM forms WHERE name = ?'
			const data = [formName]
			const [result] = await bdd.execute(sql, data)
			form = result[0] ?? null
		} catch (error) {
			console.error(error)
			return menu.reply({
				content:
					'Une erreur est survenue lors de la récupération du formulaire en base de données 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		// Vérification si le formulaire existe bien
		if (!form) {
			return menu.reply({
				content: `Le formulaire **${formName}** n'existe pas 😕`,
				flags: MessageFlags.Ephemeral,
			})
		}

		const modal = new ModalBuilder()
			.setCustomId('form-edit')
			.setTitle("Modification d'un formulaire")
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('form-edit-name')
						.setLabel('Nom du formulaire')
						.setStyle(TextInputStyle.Short)
						.setMinLength(1)
						.setMaxLength(255)
						.setValue(form.name)
						.setRequired(true),
				),
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('form-edit-content')
						.setLabel('Nouveau contenu du formulaire')
						.setStyle(TextInputStyle.Paragraph)
						.setMinLength(1)
						.setValue(form.content ?? '')
						.setRequired(true),
				),
			)

		return menu.showModal(modal)
	},
}
