import { MessageFlags } from 'discord.js'

export default {
	data: {
		name: 'form-edit',
	},
	interaction: async (modal, client) => {
		await modal.deferReply({ flags: MessageFlags.Ephemeral })

		// Acquisition du nom et du contenu
		const nom = modal.fields.getTextInputValue('form-edit-name').trim().toLowerCase()
		const contenu = modal.fields.getTextInputValue('form-edit-content').trim()

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return modal.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Vérification si le formulaire existe
		let form = null
		try {
			const sql = 'SELECT * FROM forms WHERE name = ?'
			const data = [nom]
			const [result] = await bdd.execute(sql, data)
			form = result[0] ?? null
		} catch (error) {
			console.error(error)
			return modal.editReply({
				content:
					'Une erreur est survenue lors de la vérification du nom du formulaire en base de données 😕',
			})
		}

		// Vérification si le formulaire existe bien
		if (!form) {
			return modal.editReply({
				content: `Le formulaire **${nom}** n'existe pas 😕`,
			})
		}

		// Mise à jour du formulaire en base de données
		try {
			const sql = 'UPDATE forms SET content = ? WHERE name = ?'
			const data = [contenu, nom]

			await bdd.execute(sql, data)
		} catch (error) {
			console.error(error)
			return modal.editReply({
				content:
					'Une erreur est survenue lors de la mise à jour du formulaire en base de données 😕',
			})
		}

		return modal.editReply({
			content: `Le formulaire **${nom}** a bien été modifié 👌`,
		})
	},
}
