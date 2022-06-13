export default {
	data: {
		name: 'form-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.fields.getTextInputValue('form-create-name').trim().replace(/\s+/g, '-')
		const contenu = modal.fields.getTextInputValue('form-create-content').trim()

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return modal.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si le formulaire existe
		let form = {}
		try {
			const sqlCheckName = 'SELECT * FROM forms WHERE name = ? AND guildId = ?'
			const dataCheckName = [nom, modal.guild.id]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			form = resultCheckName[0]
		} catch (error) {
			return modal.reply({
				content: 'Une erreur est survenue lors de la vérification du nom du formulaire 😕',
				ephemeral: true,
			})
		}

		// Vérification si le formulaire existe déjà
		if (form)
			return modal.reply({
				content: `Le formulaire **${nom}** existe déjà 😕`,
				ephemeral: true,
			})

		// Sinon, création du nouveau formulaire en base de données
		try {
			const sqlInsert = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
			const dataInsert = [modal.guild.id, nom, contenu]

			await bdd.execute(sqlInsert, dataInsert)
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la création du formulaire en base de données 😕',
				ephemeral: true,
			})
		}

		return modal.reply({
			content: `Le formulaire **${nom}** a bien été créé 👌`,
		})
	},
}
