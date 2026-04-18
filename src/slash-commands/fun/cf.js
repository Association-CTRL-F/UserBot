import { SlashCommandBuilder, MessageFlags } from 'discord.js'

const wait = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms))

export default {
	data: new SlashCommandBuilder().setName('cf').setDescription('Coinflip! (pile ou face)'),
	interaction: async (interaction, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		// On diffère la réponse
		await interaction.deferReply()

		// Vérification si l'utilisateur a le "trucage" actif
		let hasForcedEdge = false
		try {
			const sql = 'SELECT COUNT(*) AS total FROM cf WHERE discordID = ? AND active = 1'
			const data = [interaction.user.id]
			const [result] = await bdd.execute(sql, data)

			hasForcedEdge = (result?.[0]?.total ?? 0) > 0
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la récupération des données 😕',
			})
		}

		// Animation
		await interaction.editReply({ content: 'La pièce tourne.' })
		await wait(500)
		await interaction.editReply({ content: 'La pièce tourne..' })
		await wait(500)

		// Résultat
		let resultat = ''
		if (hasForcedEdge) {
			resultat = 'Tranche'
		} else {
			const random = Math.floor(Math.random() * 100)

			if (random < 49) resultat = 'Pile'
			else if (random < 98) resultat = 'Face'
			else resultat = 'Tranche'
		}

		return interaction.editReply({
			content: `La pièce tourne... **${resultat}** !`,
		})
	},
}
