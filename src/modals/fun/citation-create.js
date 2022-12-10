export default {
	data: {
		name: 'citation-create',
	},
	interaction: async (modal, client) => {
		// Acquisition de l'auteur et du contenu
		const author = modal.fields
			.getTextInputValue('author-citation-create')
			.trim()
			.replace(/\s+/g, '-')

		const citation = modal.fields.getTextInputValue('content-citation-create').trim()

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return modal.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Création de la nouvelle citation en base de données
		try {
			const sqlInsert = 'INSERT INTO citations (guildId, citation, author) VALUES (?, ?, ?)'

			const dataInsert = [modal.guild.id, citation, author]

			await bdd.execute(sqlInsert, dataInsert)
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la création de la citation en base de données 😕',
				ephemeral: true,
			})
		}

		return modal.reply({
			content: 'La citation a bien été ajoutée 👌',
		})
	},
}
