import { SlashCommandBuilder } from 'discord.js'
import { readFileSync } from 'node:fs'

export default {
	data: new SlashCommandBuilder().setName('bans').setDescription('Importe les bans'),
	interaction: async (interaction, client) => {
		await interaction.deferReply()

		// Acquisition de la base de données Moderation
		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration) {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
			})
		}

		// Lecture du JSON
		let banJson = []
		try {
			banJson = JSON.parse(readFileSync('./bansArray.json', 'utf8'))
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content: 'Impossible de lire le fichier bansArray.json 😕',
			})
		}

		if (!Array.isArray(banJson) || banJson.length === 0) {
			return interaction.editReply({
				content: 'Aucun ban à importer 😕',
			})
		}

		let imported = 0

		for (const ban of banJson) {
			try {
				const sql =
					'INSERT INTO bans_logs (discord_id, username, avatar, executor_id, executor_username, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
				const data = [
					ban.userId ?? null,
					ban.username ?? null,
					ban.avatar ?? null,
					null,
					null,
					ban.reason ?? null,
					null,
				]

				await bddModeration.execute(sql, data)
				imported += 1
			} catch (error) {
				console.error(error)
			}
		}

		return interaction.editReply({
			content: `${imported} ban(s) importé(s) 👌`,
		})
	},
}
