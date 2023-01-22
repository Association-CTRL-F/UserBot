export default {
	data: {
		name: 'automod-regex-edit',
	},
	interaction: async (modal, client) => {
		// Acquisition du contenu
		const contenu = modal.fields.getTextInputValue('content-regex-edit').trim()

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return modal.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Mise à jour de la regex en base de données
		try {
			const sql = 'UPDATE automod_regex SET regex = ? WHERE id = ?'
			const data = [contenu, 1]

			await bdd.execute(sql, data)
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la mise à jour da la regex en base de données 😕',
				ephemeral: true,
			})
		}

		await modal.deferReply()
		await modal.deleteReply()
		return modal.channel.send({
			content: 'La regex a bien été modifiée 👌',
		})
	},
}
