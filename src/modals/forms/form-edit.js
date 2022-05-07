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
		let form = {}
		try {
			const sqlCheckName = 'SELECT * FROM forms WHERE name = ?'
			const dataCheckName = [nom]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			form = resultCheckName[0]
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la vérification du nom du formulaire 😕',
			})
		}

		// Vérification si le formulaire existe bien
		if (!form) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: `Le formulaire **${nom}** n'existe pas 😕`,
			})
		}

		// Sinon, mise à jour du formulaire en base de données
		try {
			const sqlUpdate = 'UPDATE forms SET content = ? WHERE name = ?'
			const dataUpdate = [contenu, nom]

			await bdd.execute(sqlUpdate, dataUpdate)
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					'Une erreur est survenue lors de la mise à jour du formulaire en base de données 😕',
			})
		}

		await modal.deferReply()
		await modal.deleteReply()
		return modal.channel.send({
			content: `${modal.user}, le formulaire **${nom}** a bien été modifié 👌`,
		})
	},
}
