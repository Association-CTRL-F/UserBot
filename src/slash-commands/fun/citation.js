import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder().setName('citation').setDescription('Voir une citation'),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		let citation = {}
		try {
			const sqlSelect = 'SELECT * FROM citations WHERE guildId = ? ORDER BY RAND() LIMIT 1'
			const dataSelect = [interaction.guild.id]
			const [resultCitation] = await bdd.execute(sqlSelect, dataSelect)
			citation = resultCitation[0]
		} catch {
			return interaction.reply({
				content: 'Une erreur est survenue lors de la récupération des citations 😬',
				ephemeral: true,
			})
		}

		if (citation) {
			// Création de l'embed
			const embed = new EmbedBuilder()
				.setColor('#C27C0E')
				.setDescription(`> ${citation.citation}\n- *${citation.author}*`)

			return interaction.reply({
				embeds: [embed],
			})
		}

		return interaction.reply({
			content: "Aucune citation n'a été créée",
			ephemeral: true,
		})
	},
}
