export default {
	data: {
		name: 'command-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.fields
			.getTextInputValue('name-command-create')
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
		const contenu = modal.fields.getTextInputValue('content-command-create').trim()

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return modal.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la commande existe
		let command = {}
		try {
			const sqlCheckName = 'SELECT * FROM commands WHERE name = ?'
			const dataCheckName = [nom]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			command = resultCheckName[0]
		} catch (error) {
			return modal.reply({
				content: 'Une erreur est survenue lors de la vérification du nom de la commande 😕',
				ephemeral: true,
			})
		}

		// Vérification si la commande existe déjà
		if (command)
			return modal.reply({
				content: `La commande **${nom}** existe déjà 😕`,
				ephemeral: true,
			})

		// Sinon, création de la nouvelle commande en base de données
		try {
			const sqlInsert =
				'INSERT INTO commands (name, content, author, createdAt, lastModificationBy, lastModificationAt, numberOfUses) VALUES (?, ?, ?, ?, ?, ?, ?)'

			const dataInsert = [
				nom,
				contenu,
				modal.user.id,
				Math.round(new Date() / 1000),
				null,
				null,
				0,
			]

			await bdd.execute(sqlInsert, dataInsert)
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la création de la commande en base de données 😕',
				ephemeral: true,
			})
		}

		return modal.reply({
			content: `La commande **${nom}** a bien été créée 👌`,
		})
	},
}
