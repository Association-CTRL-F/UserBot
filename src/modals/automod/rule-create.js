export default {
	data: {
		name: 'rule-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du type, du nom, de la regex
		// et de la raison envoyée en message privé
		const type = modal.getTextInputValue('rule-create-type').trim().toLowerCase()
		const customId = modal.getTextInputValue('rule-create-id').trim()
		const regex = modal.getTextInputValue('rule-create-regex').trim()
		const ignoredRoles = modal.getTextInputValue('rule-create-ignored-roles').trim()
		const reason = modal.getTextInputValue('rule-create-reason').trim()

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

		// Vérification si la règle existe déjà
		if (rule) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: `La règle ayant l'id **${customId}** existe déjà 😕`,
			})
		}

		// Sinon, création de la règle en base de données
		try {
			const sqlInsert =
				'INSERT INTO automodRules (customId, regex, type, ignoredRoles, reason) VALUES (?, ?, ?, ?, ?)'
			const dataInsert = [customId, regex, type, ignoredRoles, reason]

			await bdd.execute(sqlInsert, dataInsert)
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					'Une erreur est survenue lors de la création de la règle en base de données 😕',
			})
		}

		await modal.deferReply()
		await modal.deleteReply()
		return modal.channel.send({
			content: `${modal.user}, la règle ayant pour id **${customId}** a bien été créée 👌`,
		})
	},
}
