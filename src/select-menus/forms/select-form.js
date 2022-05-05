import { Modal, TextInputComponent, showModal } from 'discord-modals'
import { db } from '../../util/util.js'

export default {
	data: {
		name: 'select-form',
	},
	interaction: async (menu, client) => {
		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd)
			return menu.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si le formulaire existe
		const sqlCheckName = 'SELECT * FROM forms WHERE name = ?'
		const dataCheckName = [menu.values[0]]
		const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)

		try {
			// Vérification si le formulaire existe bien
			if (!resultCheckName[0])
				return menu.reply({
					content: `Le formulaire **${menu.values[0]}** n'existe pas 😕`,
					ephemeral: true,
				})

			const modalCreate = new Modal()
				.setCustomId('form-edit')
				.setTitle("Modification d'un formulaire")
				.addComponents(
					new TextInputComponent()
						.setCustomId('form-edit-name')
						.setLabel('Nom du formulaire')
						.setStyle('SHORT')
						.setMinLength(1)
						.setMaxLength(255)
						.setDefaultValue(resultCheckName[0].name)
						.setRequired(true),
				)
				.addComponents(
					new TextInputComponent()
						.setCustomId('form-edit-content')
						.setLabel('Nouveau contenu du formulaire')
						.setStyle('LONG')
						.setMinLength(1)
						.setDefaultValue(resultCheckName[0].content)
						.setRequired(true),
				)

			return showModal(modalCreate, {
				client: client,
				interaction: menu,
			})
		} catch {
			return menu.reply({
				content: 'Une erreur est survenue lors de la mise à jour du formulaire 😬',
				ephemeral: true,
			})
		}
	},
}
