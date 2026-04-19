export default {
	data: {
		name: 'affiliate-multi',
	},
	interaction: async (modal, client) => {
		// On diffère la réponse pour éviter le timeout des interactions
		await modal.deferReply()

		// Acquisition des liens
		const liens = modal.fields
			.getTextInputValue('liens-affiliate-multi')
			.split('\n')
			.map((lien) => lien.trim())
			.filter(Boolean)

		if (!liens.length) {
			return modal.editReply({
				content: 'Aucun lien valide fourni 😕',
			})
		}

		// Acquisition de la base de données
		const bdd = client.config.db.pools.urlsAPI
		if (!bdd) {
			return modal.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Requête de récupération de la clé API de l'utilisateur
		let key = null
		try {
			const sql = 'SELECT * FROM `keys` WHERE discord_id = ?'
			const data = [modal.user.id]
			const [result] = await bdd.execute(sql, data)
			key = result[0] ?? null
		} catch (error) {
			console.error(error)
			return modal.editReply({
				content: 'Une erreur est survenue 😬',
			})
		}

		// Vérification de l'accès
		if (!key) {
			return modal.editReply({
				content: "Tu n'es pas autorisé à utiliser ce service 😬",
			})
		}

		// Vérification des permissions
		let permissions = []
		try {
			permissions = JSON.parse(key.permissions ?? '[]')
		} catch (error) {
			console.error(error)
			return modal.editReply({
				content: 'Les permissions du compte sont invalides 😕',
			})
		}

		if (!permissions.includes('CREATE_URL')) {
			return modal.editReply({
				content: "Tu n'es pas autorisé à créer des liens 😬",
			})
		}

		try {
			const shortUrls = await Promise.all(
				liens.map(async (lien) => {
					const res = await fetch('https://api.ctrl-f.info/api/urls', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: key.key,
						},
						body: JSON.stringify({
							long_url: lien,
						}),
					})

					let payload = null
					try {
						payload = await res.json()
					} catch {
						throw new Error("Réponse invalide de l'API")
					}

					const { status_message, data } = payload ?? {}

					if (!res.ok || !data?.short_url) {
						throw new Error(status_message || "Erreur lors de la création d'un lien")
					}

					return `<${data.short_url}>`
				}),
			)

			return modal.editReply({
				content: shortUrls.join('\n'),
			})
		} catch (error) {
			console.error(error)
			return modal.editReply({
				content: "Une erreur est survenue lors de la création d'un lien 😕",
			})
		}
	},
}
