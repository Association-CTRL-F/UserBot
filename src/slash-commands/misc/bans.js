import { SlashCommandBuilder } from 'discord.js'
import { readFileSync } from 'fs'
// const banJson = JSON.parse(readFileSync('./bansArray.json'))

export default {
	data: new SlashCommandBuilder().setName('bans').setDescription('bans'),
	interaction: (interaction, client) => {
		// Acquisition de la base de données Moderation
		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
				ephemeral: true,
			})

		// Boucle
		banJson.forEach(ban => {
			// Insertion du nouveau ban en base de données
			try {
				const sql =
					'INSERT INTO bans_logs (discord_id, username, avatar, executor_id, executor_username, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
				const data = [ban.userId, ban.username, ban.avatar, null, null, ban.reason, null]

				bddModeration.execute(sql, data)
			} catch (error) {
				console.error(error)
			}
		})
	},
}
