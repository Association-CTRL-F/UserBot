import { db } from '../../util/util.js'

export default {
	data: {
		name: 'rule-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const type = modal.getTextInputValue('rule-create-type').trim().toLowerCase()
		const nom = modal.getTextInputValue('rule-create-name').trim()
		const regex = modal.getTextInputValue('rule-create-regex').trim()
		const reason = modal.getTextInputValue('rule-create-reason').trim()

		// Acquisition de la base de données
		const bdd = await db(client, client.config.dbName)
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

		// Vérification si la règle existe déjà
		if (rule) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: `La règle **${nom}** existe déjà 😕`,
			})
		}

		// Sinon, création de la règle en base de données
		try {
			const sqlInsert =
				'INSERT INTO automodRules (customId, ruleName, regex, type, reason) VALUES (?, ?, ?, ?, ?)'
			const dataInsert = [null, nom, regex, type, reason]

			await bdd.execute(sqlInsert, dataInsert)
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					'Une erreur est survenue lors de la création de la règle en base de données 😕',
			})
		}

		return modal.reply({
			content: `La règle **${nom}** a bien été créée 👌`,
		})
	},
}
