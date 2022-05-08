import { db } from '../../util/util.js'

export default {
	data: {
		name: 'rule-edit',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const type = modal.getTextInputValue('rule-edit-type').trim().toLowerCase()
		const nom = modal.getTextInputValue('rule-edit-name').trim()
		const regex = modal.getTextInputValue('rule-edit-regex').trim()
		const reason = modal.getTextInputValue('rule-edit-reason').trim()

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Vérification si la règle existe
		let rule = {}
		try {
			const sqlCheckName = 'SELECT * FROM automodRules WHERE ruleName = ?'
			const dataCheckName = [nom]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			rule = resultCheckName[0]
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la vérification du nom de la règle 😕',
			})
		}

		// Vérification si la règle existe bien
		if (!rule) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: `La règle **${nom}** n'existe pas 😕`,
			})
		}

		// Sinon, mise à jour de la règle en base de données
		try {
			const sqlUpdate =
				'UPDATE automodRules SET regex = ?, type = ?, reason = ? WHERE ruleName = ?'
			const dataUpdate = [regex, type, nom, reason]

			await bdd.execute(sqlUpdate, dataUpdate)
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					'Une erreur est survenue lors de la mise à jour de la règle en base de données 😕',
			})
		}

		return modal.reply({
			content: `La règle **${nom}** a bien été modifiée 👌`,
		})
	},
}
