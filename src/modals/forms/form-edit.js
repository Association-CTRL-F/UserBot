export default {
	data: {
		name: 'form-edit',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.fields.getTextInputValue('form-edit-name').trim().replace(/\s+/g, '-')
		const contenu = modal.fields.getTextInputValue('form-edit-content').trim()

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
				content:
					'Une erreur est survenue lors de la vérification du nom du formulaire en base de données 😕',
				ephemeral: true,
			})
		}

		// Vérification si le formulaire existe bien
		if (!form)
			return modal.reply({
				content: `Le formulaire **${nom}** n'existe pas 😕`,
				ephemeral: true,
			})

		// Sinon, mise à jour du formulaire en base de données
		try {
			const sql = 'UPDATE forms SET content = ? WHERE name = ?'
			const data = [contenu, nom]

			await bdd.execute(sql, data)
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la mise à jour du formulaire en base de données 😕',
				ephemeral: true,
			})
		}

		await modal.deferReply()
		await modal.deleteReply()
		return modal.channel.send({
			content: `${modal.user}, le formulaire **${nom}** a bien été modifié 👌`,
		})
	},
}
