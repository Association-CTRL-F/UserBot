export default {
	data: {
		name: 'rule-edit',
	},
	interaction: async (modal, client) => {
		// Acquisition du type, du nom, de la regex
		// et de la raison envoyée en message privé
		const type = modal.getTextInputValue('rule-edit-type').trim().toLowerCase()
		const customId = modal.getTextInputValue('rule-edit-id').trim()
		const regex = modal.getTextInputValue('rule-edit-regex').trim()
		const ignoredRoles = modal.getTextInputValue('rule-edit-ignored-roles').trim()
		const reason = modal.getTextInputValue('rule-edit-reason').trim()

		// Vérification du type de règle
		if (type !== 'warn' && type !== 'ban') {
			await modal.deferReply({ ephemeral: true })
			return modal.reply({
				content: `Le type **${type}** n'est pas pris en charge 😕`,
				ephemeral: true,
			})
		}

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Vérification si la règle existe
		let rule = {}
		try {
			const sqlCheckName = 'SELECT * FROM automodRules WHERE customId = ?'
			const dataCheckName = [customId]
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
				content: `La règle ayant l'id **${customId}** n'existe pas 😕`,
			})
		}

		// Sinon, mise à jour de la règle en base de données
		try {
			const sqlUpdate =
				'UPDATE automodRules SET regex = ?, type = ?, ignoredRoles = ?, reason = ? WHERE customId = ?'
			const dataUpdate = [regex, type, ignoredRoles, reason, customId]

			await bdd.execute(sqlUpdate, dataUpdate)
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					'Une erreur est survenue lors de la mise à jour de la règle en base de données 😕',
			})
		}

		await modal.deferReply()
		await modal.deleteReply()
		return modal.channel.send({
			content: `${modal.user}, la règle ayant l'id **${customId}** a bien été modifiée 👌`,
		})
	},
}
