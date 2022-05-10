export default {
	data: {
		name: 'select-rule-del',
	},
	interaction: async (menu, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return menu.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la règle existe
		let rule = {}
		try {
			const sqlCheckName = 'SELECT * FROM automodRules WHERE customId = ?'
			const dataCheckName = [menu.values[0]]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			rule = resultCheckName[0]
		} catch (error) {
			return menu.reply({
				content:
					'Une erreur est survenue lors de la récupération de la règle en base de données 😕',
				ephemeral: true,
			})
		}

		// Vérification si la règle existe bien
		if (!rule)
			return menu.reply({
				content: `La règle **${menu.values[0]}** n'existe pas 😕`,
				ephemeral: true,
			})

		// Si oui, alors suppression en base de données
		try {
			const sqlDelete = 'DELETE FROM automodRules WHERE customId = ?'
			const dataDelete = [rule.customId]

			await bdd.execute(sqlDelete, dataDelete)
		} catch {
			return menu.reply({
				content:
					'Une erreur est survenue lors de la suppression de la règle en base de données 😬',
				ephemeral: true,
			})
		}

		await menu.deferReply()
		await menu.deleteReply()
		return menu.channel.send({
			content: `${menu.user}, la règle ayant pour id **${rule.customId}** a bien été supprimée 👌`,
		})
	},
}
