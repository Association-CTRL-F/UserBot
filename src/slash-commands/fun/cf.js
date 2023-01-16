import { SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('cf').setDescription('Coinflip! (pile ou face)'),
	interaction: async (interaction, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		let discordIds = []
		try {
			const sqlSelect = 'SELECT * FROM cf WHERE guildId = ?'
			const dataSelect = [interaction.guild.id]
			const [resultDiscordIds] = await bdd.execute(sqlSelect, dataSelect)
			discordIds = resultDiscordIds
		} catch (error) {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la récupération des commandes 😕',
				ephemeral: true,
			})
		}

		const random = Math.round(Math.random() * 100)

		let resultat = ''
		if (random < 50) resultat = 'Pile'
		else if (random > 50) resultat = 'Face'
		else resultat = 'Tranche'

		await interaction.editReply({ content: 'La pièce tourne.' })
		await interaction.editReply({ content: 'La pièce tourne..' })

		let cf = 0
		// eslint-disable-next-line require-await
		discordIds.forEach(async discordId => {
			if (interaction.user.id === discordId.discordId && discordId.active === 1) cf += 1
		})

		if (cf > 0)
			return interaction.editReply({
				content: `La pièce tourne... **Tranche** !`,
			})

		return interaction.editReply({
			content: `La pièce tourne... **${resultat}** !`,
		})
	},
}
