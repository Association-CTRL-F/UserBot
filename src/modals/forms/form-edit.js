import { db } from '../../util/util.js'

export default {
	data: {
		name: 'form-edit',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.getTextInputValue('form-edit-name').trim().replace(/\s+/g, '-')
		const contenu = modal.getTextInputValue('form-edit-content').trim()

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Vérification si le formulaire existe
		const sqlCheckName = 'SELECT * FROM forms WHERE name = ?'
		const dataCheckName = [nom]
		const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)

		try {
			// Vérification si le formulaire existe bien
			if (!resultCheckName[0]) {
				await modal.deferReply({ ephemeral: true })
				return modal.followUp({
					content: `Le formulaire **${nom}** n'existe pas 😕`,
				})
			}

			// Sinon, mise à jour du formulaire en base de données
			const sqlUpdate = 'UPDATE forms SET content = ? WHERE name = ?'
			const dataUpdate = [contenu, nom]

			const [resultUpdate] = await bdd.execute(sqlUpdate, dataUpdate)

			if (resultUpdate.affectedRows)
				return modal.reply({
					content: `Le formulaire **${nom}** a bien été modifié 👌`,
				})

			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la mise à jour du formulaire 😬',
			})
		} catch {
			await modal.deferReply({ ephemeral: true })
			return modal.reply({
				content: 'Une erreur est survenue lors de la mise à jour du formulaire 😬',
			})
		}
	},
}
