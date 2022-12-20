import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import fetch from 'node-fetch'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder().setName('joke').setDescription('Blague'),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		// Acquisition de la base de données
		const bdd = client.config.db.pools.urlsAPI
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})

		try {
			// Requête
			const res = await fetch('https://www.blagues-api.fr/api/random', {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${client.config.others.jokeToken}`,
				},
			})

			const { joke, answer } = await res.json()

			// S'il y a une erreur en retour
			if (!res.ok)
				return interaction.editReply({
					content: 'Une erreur est survenue 😕',
				})

			// Création de l'embed
			const embed = new EmbedBuilder()
				.setColor('#C27C0E')
				.setTitle(answer)
				.setDescription(joke)

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
