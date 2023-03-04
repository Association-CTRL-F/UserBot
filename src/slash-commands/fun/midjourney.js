import { SlashCommandBuilder } from 'discord.js'
import midjourney from 'midjourney-client'

export default {
	data: new SlashCommandBuilder()
		.setName('midjourney')
		.setDescription('Générer une image aléatoire en fonction du texte donné')
		.addStringOption(option =>
			option
				.setName('texte')
				.setDescription('Quelle image voulez-vous générer ?')
				.setRequired(true),
		),
	interaction: async interaction => {
		// On retarde la réponse
		await interaction.deferReply()

		// Acquisition du texte
		const texte = interaction.options.getString('texte')
		const image = await midjourney(`mdjrny-v4 ${texte}`)

		return interaction.editReply({
			content: image[0],
		})
	},
}
