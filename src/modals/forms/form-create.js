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
			const sql = 'SELECT * FROM forms WHERE name = ?'
			const data = [nom]
			const [result] = await bdd.execute(sql, data)
			form = result[0]
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
			const sql = 'INSERT INTO forms (name, content) VALUES (?, ?)'
			const data = [nom, contenu]

			await bdd.execute(sql, data)
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
