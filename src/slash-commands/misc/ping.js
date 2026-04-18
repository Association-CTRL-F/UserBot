import { SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription("Donne le ping de l'API ainsi que du bot"),
	interaction: async (interaction, client) => {
		const replyStart = Date.now()
		await interaction.reply({ content: '🏓 Pong ?' })
		const replyLatency = Date.now() - replyStart

		const editStart = Date.now()
		await interaction.editReply({ content: '🏓 Pong ?' })
		const editLatency = Date.now() - editStart

		return interaction.editReply({
			content: `Temps de réponse : **${replyLatency} ms**\nModification d'un message : **${editLatency} ms**\nRéponse API : **${client.ws.ping} ms**`,
		})
	},
}
