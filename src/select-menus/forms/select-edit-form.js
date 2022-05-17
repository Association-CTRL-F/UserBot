import { Modal, TextInputComponent, MessageActionRow } from 'discord.js'

export default {
	data: {
		name: 'select-edit-form',
	},
	interaction: async (menu, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return menu.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si le formulaire existe
		let form = {}
		try {
			const sqlCheckName = 'SELECT * FROM forms WHERE name = ?'
			const dataCheckName = [menu.values[0]]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			form = resultCheckName[0]
		} catch (error) {
			return menu.reply({
				content:
					'Une erreur est survenue lors de la récupération du formulaire en base de données 😕',
				ephemeral: true,
			})
		}

		// Vérification si le formulaire existe bien
		if (!form)
			return menu.reply({
				content: `Le formulaire **${menu.values[0]}** n'existe pas 😕`,
				ephemeral: true,
			})

		const modalEdit = new Modal()
			.setCustomId('form-edit')
			.setTitle("Modification d'un formulaire")
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('form-edit-name')
						.setLabel('Nom du formulaire')
						.setStyle('SHORT')
						.setMinLength(1)
						.setMaxLength(255)
						.setValue(form.name)
						.setRequired(true),
				),
			)
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId('form-edit-content')
						.setLabel('Nouveau contenu du formulaire')
						.setStyle('PARAGRAPH')
						.setMinLength(1)
						.setValue(form.content)
						.setRequired(true),
				),
			)

		return menu.showModal(modalEdit)
	},
}
