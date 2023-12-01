export default {
	data: {
		name: 'affiliate-multi',
	},
	interaction: async (modal, client) => {
		// Acquisition des liens
		const liens = modal.fields.getTextInputValue('liens-affiliate-multi').split('\n')

		// Acquisition de la base de données
		const bdd = client.config.db.pools.urlsAPI
		if (!bdd)
			return modal.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})

		// Requête de récupération de la clé API de l'utilisateur
		let key = ''
		try {
			const sql = 'SELECT * FROM `keys` WHERE discord_id = ?'
			const data = [modal.user.id]
			const [result] = await bdd.execute(sql, data)
			key = result[0]
		} catch (error) {
			return modal.reply({
				content: 'Une erreur est survenue 😬',
			})
		}

		// Vérification de l'accès
		if (!key)
			return modal.reply({
				content: "Tu n'es pas autorisé à utiliser ce service 😬",
			})

		// Vérification des permissions
		const permissions = JSON.parse(key.permissions)

		if (!permissions.includes('CREATE_URL'))
			return modal.reply({
				content: "Tu n'es pas autorisé à créer des liens 😬",
			})

		let liensResponse = ''
		try {
			const requests = liens.map(async lien => {
				const res = await fetch('https://api.ctrl-f.io/api/urls', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: key.key,
					},
					body: JSON.stringify({
						long_url: lien,
					}),
				})

				const { status_message, data } = await res.json()

				if (!res.ok || !data) throw new Error(status_message)

				liensResponse = liensResponse.concat('\n', `<${data.short_url}>`)
			})

			await Promise.all(requests)
		} catch (error) {
			console.error(error)
			return modal.reply({
				content: "Une erreur est survenue lors de la création d'un lien 😕",
			})
		}

		return modal.reply({
			content: liensResponse,
			ephemeral: true,
		})
	},
}
