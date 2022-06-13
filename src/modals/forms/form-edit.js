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

		// Vérification si le formulaire existe bien
		if (!form)
			return modal.reply({
				content: `Le formulaire **${nom}** n'existe pas 😕`,
				ephemeral: true,
			})

		// Sinon, mise à jour du formulaire en base de données
		try {
			const sqlUpdate = 'UPDATE forms SET content = ? WHERE name = ? AND guildId = ?'
			const dataUpdate = [contenu, nom, modal.guild.id]

			await bdd.execute(sqlUpdate, dataUpdate)
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
