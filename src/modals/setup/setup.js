export default {
	data: {
		name: 'setup',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.components[0].components[0].customId
		let contenu = modal.fields.getTextInputValue(nom).trim()

		if (contenu === 'NULL') contenu = null

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return modal.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		try {
			const sqlEdit = `UPDATE config SET ${nom} = ? WHERE GUILD_ID = ?`
			const dataEdit = [contenu, modal.guild.id]

			await bdd.execute(sqlEdit, dataEdit)
		} catch (error) {
			return modal.reply({
				content: `Une erreur est survenue lors de la modification de la configuration de **${nom}** en base de données 😕`,
				ephemeral: true,
			})
		}

		// Vérification si tout est configuré
		let config = {}
		try {
			const sql = `SELECT * FROM config WHERE
						LEAVE_JOIN_CHANNEL_ID IS NULL OR
						REPORT_CHANNEL_ID IS NULL OR
						LOGS_MESSAGES_CHANNEL_ID IS NULL OR
						LOGS_BANS_CHANNEL_ID IS NULL OR
						JOIN_ROLE_ID IS NULL OR
						MUTED_ROLE_ID IS NULL OR
						TRIBUNAL_CHANNEL_ID IS NULL OR
						CONFIG_CHANNEL_ID IS NULL OR
						UPGRADE_CHANNEL_ID IS NULL OR
						BLABLA_CHANNEL_ID IS NULL OR
						STAFF_ROLES_MANAGER_IDS IS NULL`
			const data = [modal.guild.id]
			const [result] = await bdd.execute(sql, data)
			config = result[0]
		} catch (error) {
			return modal.reply({
				content:
					'Une erreur est survenue lors de la vérification de la configuration en base de données 😕',
				ephemeral: true,
			})
		}

		if (config)
			try {
				const sql = 'UPDATE config SET isSetup = ? WHERE GUILD_ID = ?'
				const data = [0, modal.guild.id]
				const [result] = await bdd.execute(sql, data)
				config = result[0]
			} catch (error) {
				return modal.reply({
					content:
						'Une erreur est survenue lors de la vérification de la configuration en base de données 😕',
					ephemeral: true,
				})
			}
		else
			try {
				const sql = 'UPDATE config SET isSetup = ? WHERE GUILD_ID = ?'
				const data = [1, modal.guild.id]
				const [result] = await bdd.execute(sql, data)
				config = result[0]
			} catch (error) {
				return modal.reply({
					content:
						'Une erreur est survenue lors de la vérification de la configuration en base de données 😕',
					ephemeral: true,
				})
			}

		return modal.reply({
			content: `La configuration de **${nom}** a bien été modifiée 👌`,
		})
	},
}
