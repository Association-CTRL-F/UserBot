import { SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription("Donne le ping de l'API ainsi que du bot"),
	interaction: async (interaction, client) => {
		await interaction.reply({ content: '🏓 Pong ?' })
		const start = new Date()
		await interaction.editReply({ content: '🏓 Pong ?' })
		const editLatency = Math.round(new Date() - start)
		return interaction.editReply({
			content: `Modification d'un message : **${editLatency} ms**\nRéponse API : **${client.ws.ping} ms**`,
		})
	},
}
