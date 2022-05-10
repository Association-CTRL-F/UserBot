export default {
	data: {
		name: 'form-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.getTextInputValue('form-create-name').trim().replace(/\s+/g, '-')
		const contenu = modal.getTextInputValue('form-create-content').trim()

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Vérification si le formulaire existe
		let form = {}
		try {
			const sqlCheckName = 'SELECT * FROM forms WHERE name = ?'
			const dataCheckName = [nom]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			form = resultCheckName[0]
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la vérification du nom du formulaire 😕',
			})
		}

		// Vérification si le formulaire existe déjà
		if (form) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: `Le formulaire **${nom}** existe déjà 😕`,
			})
		}

		// Sinon, création du nouveau formulaire en base de données
		try {
			const sqlInsert = 'INSERT INTO forms (name, content) VALUES (?, ?)'
			const dataInsert = [nom, contenu]

			await bdd.execute(sqlInsert, dataInsert)
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					'Une erreur est survenue lors de la création du formulaire en base de données 😕',
			})
		}

		return modal.reply({
			content: `Le formulaire **${nom}** a bien été créé 👌`,
		})
	},
}
