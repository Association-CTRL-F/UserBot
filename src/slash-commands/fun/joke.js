import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import BlaguesAPI from 'blagues-api'

export default {
	data: new SlashCommandBuilder().setName('joke').setDescription('Blague'),
	interaction: async (interaction, client) => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		try {
			const blagues = new BlaguesAPI(client.config.others.jokeToken)

			const blague = await blagues.random({
				disallow: [
					blagues.categories.DARK,
					blagues.categories.LIMIT,
					blagues.categories.BLONDES,
					blagues.categories.BEAUF,
				],
			})

			// Création de l'embed
			const embed = new EmbedBuilder()
				.setColor('#C27C0E')
				.setTitle(blague.joke)
				.setDescription(blague.answer)

			return interaction.editReply({
				embeds: [embed],
			})
		} catch (error) {
			return interaction.editReply({
				content: 'Une erreur est survenue 😕',
			})
		}
	},
}
