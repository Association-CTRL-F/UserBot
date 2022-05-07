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
		let command = {}
		try {
			const sqlCheckName = 'SELECT * FROM commands WHERE name = ?'
			const dataCheckName = [nom]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			command = resultCheckName[0]
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la vérification du nom de la commande 😕',
			})
		}

		// Vérification que la commande existe bien
		if (!command) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: `La commande **${nom}** n'existe pas 😕`,
			})
		}

		// Sinon, mise à jour de la commande en base de données
		try {
			const sqlEdit =
				'UPDATE commands SET content = ?, lastModification = ?, lastModificationBy = ? WHERE name = ?'
			const dataEdit = [contenu, Math.round(new Date() / 1000), modal.user.id, nom]

			await bdd.execute(sqlEdit, dataEdit)
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					'Une erreur est survenue lors de la modification de la commande en base de données 😕',
			})
		}

		return modal.reply({
			content: `La commande **${nom}** a bien été modifiée 👌`,
		})
	},
}
