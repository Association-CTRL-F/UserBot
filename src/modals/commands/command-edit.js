import { db } from '../../util/util.js'

export default {
	data: {
		name: 'command-edit',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom, du contenu et du mot clé de recherche
		const nom = modal.getTextInputValue('name-command-edit').trim().replace(/\s+/g, '-')
		const contenu = modal.getTextInputValue('content-command-edit').trim()

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Vérification si la commande existe
		const sqlCheckName = 'SELECT * FROM commands WHERE name = ?'
		const dataCheckName = [nom]
		const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)

		try {
			// Vérification que la commande existe bien
			if (!resultCheckName[0]) {
				await modal.deferReply({ ephemeral: true })
				return modal.followUp({
					content: `La commande **${nom}** n'existe pas 😕`,
				})
			}

			// Sinon, mise à jour de la commande en base de données
			const sqlEdit =
				'UPDATE commands SET content = ?, lastModification = ?, lastModificationBy = ? WHERE name = ?'
			const dataEdit = [contenu, Math.round(new Date() / 1000), modal.user.id, nom]

			const [resultEdit] = await bdd.execute(sqlEdit, dataEdit)

			if (resultEdit.changedRows)
				return modal.reply({
					content: `La commande **${nom}** a bien été modifiée 👌`,
				})

			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la modification de la commande 😬',
			})
		} catch {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la modification de la commande 😬',
			})
		}
	},
}
