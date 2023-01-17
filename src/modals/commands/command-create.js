export default {
	data: {
		name: 'command-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom, des alias et du contenu
		const nom = modal.fields
			.getTextInputValue('name-command-create')
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')

		const aliases = modal.fields
			.getTextInputValue('aliases-command-create')
			.trim()
			.toLowerCase()
			.replace(/\s+/g, ',')

		const active = modal.fields.getTextInputValue('active-command-create').trim().toLowerCase()

		const contenu = modal.fields.getTextInputValue('content-command-create').trim()

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return modal.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		const regexCommand = /^([a-zA-Z0-9]+)$/
		const validCommand = nom.match(regexCommand)
		if (!validCommand)
			return modal.reply({
				content: "Le nom de commande n'est pas valide (alphanumérique) 😕",
				ephemeral: true,
			})

		if (active !== '0' && active !== '1')
			return modal.reply({
				content: 'Le champ activation doit être défini sur 0 ou 1 😕',
				ephemeral: true,
			})

		// Vérification si la commande existe
		let command = {}
		try {
			const sql = 'SELECT * FROM commands WHERE name = ?'
			const data = [nom]
			const [result] = await bdd.execute(sql, data)
			command = result[0]
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
			const sql =
				'INSERT INTO commands (name, aliases, active, content, author, createdAt, lastModificationBy, lastModificationAt, numberOfUses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'

			const data = [
				nom,
				aliases ? aliases : null,
				active,
				contenu,
				modal.user.id,
				Math.round(new Date() / 1000),
				null,
				null,
				0,
			]

			await bdd.execute(sql, data)
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la création de la commande en base de données 😕',
				ephemeral: true,
			})
		}

		if (active === '0')
			return modal.reply({
				content: `La commande **${nom}** a bien été créée et est **désactivée** 👌\n${
					aliases ? `\n__Alias :__\n\`\`\`${aliases}\`\`\`` : ''
				}\n__Prévisualisation :__\n\n${contenu}`,
			})

		return modal.reply({
			content: `La commande **${nom}** a bien été créée et est **activée** 👌\n${
				aliases ? `\n__Alias :__\n\`\`\`${aliases}\`\`\`` : ''
			}\n__Prévisualisation :__\n\n${contenu}`,
		})
	},
}
