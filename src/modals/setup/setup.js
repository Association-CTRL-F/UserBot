/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
export default {
	data: {
		name: 'setup',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.components[0].components[0].customId
		let contenu = modal.fields.getTextInputValue(nom).trim()
		const regexId = /\d+/g
		const regexIds = /[\d\s,]+/g

		switch (nom) {
			case 'LEAVE_JOIN_CHANNEL_ID':
				const matches_LEAVE_JOIN_CHANNEL_ID = contenu.match(regexId)
				if (!matches_LEAVE_JOIN_CHANNEL_ID || matches_LEAVE_JOIN_CHANNEL_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'REPORT_CHANNEL_ID':
				const matches_REPORT_CHANNEL_ID = contenu.match(regexId)
				if (!matches_REPORT_CHANNEL_ID || matches_REPORT_CHANNEL_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'LOGS_MESSAGES_CHANNEL_ID':
				const matches_LOGS_MESSAGES_CHANNEL_ID = contenu.match(regexId)
				if (
					!matches_LOGS_MESSAGES_CHANNEL_ID ||
					matches_LOGS_MESSAGES_CHANNEL_ID.length > 1
				)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'LOGS_BANS_CHANNEL_ID':
				const matches_LOGS_BANS_CHANNEL_ID = contenu.match(regexId)
				if (!matches_LOGS_BANS_CHANNEL_ID || matches_LOGS_BANS_CHANNEL_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'JOIN_ROLE_ID':
				const matches_JOIN_ROLE_ID = contenu.match(regexId)
				if (!matches_JOIN_ROLE_ID || matches_JOIN_ROLE_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'NO_ENTRAIDE_ROLE_ID':
				const matches_NO_ENTRAIDE_ROLE_ID = contenu.match(regexId)
				if (!matches_NO_ENTRAIDE_ROLE_ID || matches_NO_ENTRAIDE_ROLE_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'MUTED_ROLE_ID':
				const matches_MUTED_ROLE_ID = contenu.match(regexId)
				if (!matches_MUTED_ROLE_ID || matches_MUTED_ROLE_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'TRIBUNAL_CHANNEL_ID':
				const matches_TRIBUNAL_CHANNEL_ID = contenu.match(regexId)
				if (!matches_TRIBUNAL_CHANNEL_ID || matches_TRIBUNAL_CHANNEL_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'CONFIG_CHANNEL_ID':
				const matches_CONFIG_CHANNEL_ID = contenu.match(regexId)
				if (!matches_CONFIG_CHANNEL_ID || matches_CONFIG_CHANNEL_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'UPGRADE_CHANNEL_ID':
				const matches_UPGRADE_CHANNEL_ID = contenu.match(regexId)
				if (!matches_UPGRADE_CHANNEL_ID || matches_UPGRADE_CHANNEL_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'BLABLA_CHANNEL_ID':
				const matches_BLABLA_CHANNEL_ID = contenu.match(regexId)
				if (!matches_BLABLA_CHANNEL_ID || matches_BLABLA_CHANNEL_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'ACCESS_CHANNEL_ID':
				const matches_ACCESS_CHANNEL_ID = contenu.match(regexId)
				if (!matches_ACCESS_CHANNEL_ID || matches_ACCESS_CHANNEL_ID.length > 1)
					return modal.reply({
						content: "Tu n'as pas donné un ID valide 😕",
						ephemeral: true,
					})
				break

			case 'VOICE_MANAGER_CHANNELS_IDS':
				const matches_VOICE_MANAGER_CHANNELS_IDS = contenu.match(regexIds)
				if (!matches_VOICE_MANAGER_CHANNELS_IDS)
					return modal.reply({
						content: "Tu n'as pas donné un / des ID(s) valide(s) 😕",
						ephemeral: true,
					})
				break

			case 'NOLOGS_MANAGER_CHANNELS_IDS':
				const matches_NOLOGS_MANAGER_CHANNELS_IDS = contenu.match(regexIds)
				if (!matches_NOLOGS_MANAGER_CHANNELS_IDS)
					return modal.reply({
						content: "Tu n'as pas donné un / des ID(s) valide(s) 😕",
						ephemeral: true,
					})
				break

			case 'NOTEXT_MANAGER_CHANNELS_IDS':
				const matches_NOTEXT_MANAGER_CHANNELS_IDS = contenu.match(regexIds)
				if (!matches_NOTEXT_MANAGER_CHANNELS_IDS)
					return modal.reply({
						content: "Tu n'as pas donné un / des ID(s) valide(s) 😕",
						ephemeral: true,
					})
				break

			case 'THREADS_MANAGER_CHANNELS_IDS':
				const matches_THREADS_MANAGER_CHANNELS_IDS = contenu.match(regexIds)
				if (!matches_THREADS_MANAGER_CHANNELS_IDS)
					return modal.reply({
						content: "Tu n'as pas donné un / des ID(s) valide(s) 😕",
						ephemeral: true,
					})
				break

			case 'STAFF_ROLES_MANAGER_IDS':
				const matches_STAFF_ROLES_MANAGER_IDS = contenu.match(regexIds)
				if (!matches_STAFF_ROLES_MANAGER_IDS)
					return modal.reply({
						content: "Tu n'as pas donné un / des ID(s) valide(s) 😕",
						ephemeral: true,
					})
				break
		}

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
						NO_ENTRAIDE_ROLE_ID IS NULL OR
						MUTED_ROLE_ID IS NULL OR
						TRIBUNAL_CHANNEL_ID IS NULL OR
						CONFIG_CHANNEL_ID IS NULL OR
						UPGRADE_CHANNEL_ID IS NULL OR
						BLABLA_CHANNEL_ID IS NULL OR
						ACCESS_CHANNEL_ID IS NULL OR
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
