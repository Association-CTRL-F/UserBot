export default {
	data: {
		name: 'rule-edit',
	},
	interaction: async (modal, client) => {
		// Acquisition du type, du nom, de la regex
		// et de la raison envoyée en message privé
		const type = modal.fields.getTextInputValue('rule-edit-type').trim().toLowerCase()
		const customId = modal.fields.getTextInputValue('rule-edit-id').trim().replace(/\s+/g, '-')
		const regex = modal.fields.getTextInputValue('rule-edit-regex').trim()
		const ignoredRoles = modal.fields.getTextInputValue('rule-edit-ignored-roles').trim()
		const reason = modal.fields.getTextInputValue('rule-edit-reason').trim()

		// Vérification du type de règle
		if (type !== 'warn' && type !== 'ban')
			return modal.reply({
				content: `Le type **${type}** n'est pas pris en charge 😕`,
				ephemeral: true,
			})

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return modal.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la règle existe
		let rule = {}
		try {
			const sqlCheckName = 'SELECT * FROM automodRules WHERE customId = ?'
			const dataCheckName = [customId]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			rule = resultCheckName[0]
		} catch (error) {
			return modal.reply({
				content: 'Une erreur est survenue lors de la vérification du nom de la règle 😕',
				ephemeral: true,
			})
		}

		// Vérification si la règle existe bien
		if (!rule)
			return modal.reply({
				content: `La règle ayant l'id **${customId}** n'existe pas 😕`,
				ephemeral: true,
			})

		// Sinon, mise à jour de la règle en base de données
		try {
			const sqlUpdate =
				'UPDATE automodRules SET regex = ?, type = ?, ignoredRoles = ?, reason = ? WHERE customId = ?'
			const dataUpdate = [regex, type, ignoredRoles, reason, customId]

			await bdd.execute(sqlUpdate, dataUpdate)
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la mise à jour de la règle en base de données 😕',
				ephemeral: true,
			})
		}

		await modal.deferReply()
		await modal.deleteReply()
		return modal.channel.send({
			content: `${modal.user}, la règle ayant l'id **${customId}** a bien été modifiée 👌`,
		})
	},
}
