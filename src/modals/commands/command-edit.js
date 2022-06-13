export default {
	data: {
		name: 'command-edit',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.fields.getTextInputValue('name-command-edit').trim().replace(/\s+/g, '-')
		const contenu = modal.fields.getTextInputValue('content-command-edit').trim()

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
			const sqlCheckName = 'SELECT * FROM commands WHERE name = ? AND guildId = ?'
			const dataCheckName = [nom, modal.guild.id]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			command = resultCheckName[0]
		} catch (error) {
			return modal.reply({
				content: 'Une erreur est survenue lors de la vérification du nom de la commande 😕',
				ephemeral: true,
			})
		}

		// Vérification que la commande existe bien
		if (!command)
			return modal.reply({
				content: `La commande **${nom}** n'existe pas 😕`,
				ephemeral: true,
			})

		// Sinon, mise à jour de la commande en base de données
		try {
			const sqlEdit =
				'UPDATE commands SET content = ?, lastModificationBy = ?, lastModificationAt = ? WHERE name = ? AND guildId = ?'
			const dataEdit = [
				contenu,
				modal.user.id,
				Math.round(new Date() / 1000),
				nom,
				modal.guild.id,
			]

			await bdd.execute(sqlEdit, dataEdit)
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la modification de la commande en base de données 😕',
				ephemeral: true,
			})
		}

		return modal.reply({
			content: `La commande **${nom}** a bien été modifiée 👌`,
		})
	},
}
